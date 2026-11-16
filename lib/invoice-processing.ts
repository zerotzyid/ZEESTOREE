import { get, getWithEtag, set, setIfMatch, update, type Json } from './rtdb';
import { checkInvoice, createInvoice, parsePixpayzDate } from './pixpayz';
import { getPaymentConfig } from './payment-config';
import { writeLog } from './log';
import { decryptSecret } from './crypto';
import { deleteApplicationServer, findPanelUser, createPanelUser, generatePanelPassword, buildServerArgs, createPanelServer, type PteroPanel } from './pterodactyl';
import type { PanelDoc } from '@/app/api/admin/panels/route';
import type { ProductDoc, ProvisionConfig } from './catalog';

export type InvoicePurpose = 'deposit' | 'donation' | 'direct_purchase';

export type InvoiceDoc = {
  invoiceId: string;
  userId: string;
  purpose: InvoicePurpose;
  amount: number;
  fee: number;
  total: number;
  status: 'pending' | 'processing' | 'paid' | 'expired' | 'failed';
  qrisImage: string;
  paymentLink: string;
  createdAt: number;
  expiredAt: number;
  lockedAt?: number;
  lastCheckedAt?: number;
  processedAt?: number;
  paidAt?: string | null;
  error?: string | null;
  // Untuk direct_purchase
  productId?: string | null;
  productName?: string | null;
  orderId?: string | null;
};

type UserDoc = {
  username: string;
  saldo: number;
  lastCreditInvoiceId?: string;
  [key: string]: unknown;
};

export type ProcessResult = {
  found: boolean;
  paid: boolean;
  busy?: boolean;
  error?: string;
};

const LOCK_FRESH_MS = 120_000;
const STALE_LOCK_MS = 5 * 60_000;
const CHECK_THROTTLE_MS = 8_000;

/** Membuat invoice di Pixpayz dan menyimpannya ke `invoices`. */
export async function createDepositInvoice(
  userId: string,
  amount: number,
  purpose: InvoicePurpose = 'deposit',
  options?: { orderId?: string; productId?: string; productName?: string }
): Promise<InvoiceDoc> {
  const config = await getPaymentConfig();
  if (!config) {
    throw new Error('Pembayaran belum dikonfigurasi admin.');
  }
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error('Nominal tidak valid.');
  }
  if (config.minAmount > 0 && amount < config.minAmount) {
    throw new Error(`Minimal Rp ${config.minAmount.toLocaleString('id-ID')}.`);
  }
  if (config.maxAmount > 0 && amount > config.maxAmount) {
    throw new Error(`Maksimal Rp ${config.maxAmount.toLocaleString('id-ID')}.`);
  }

  const created = await createInvoice(amount);
  if (!created.invoice_id) {
    throw new Error('Pixpayz tidak mengembalikan invoice_id.');
  }

  const doc: InvoiceDoc = {
    invoiceId: created.invoice_id,
    userId,
    purpose,
    amount: Number(created.amount ?? amount),
    fee: Number(created.fee ?? 0),
    total: Number(created.total ?? amount),
    status: 'pending',
    qrisImage: String(created.qris_image ?? ''),
    paymentLink: String(created.payment_link ?? ''),
    createdAt: Date.now(),
    expiredAt: parsePixpayzDate(created.expired_at) ?? 0,
    paidAt: null,
    error: null,
    // Untuk direct_purchase
    orderId: options?.orderId ?? null,
    productId: options?.productId ?? null,
    productName: options?.productName ?? null,
  };

  await set(`invoices/${doc.invoiceId}`, doc as unknown as Json);
  await writeLog({
    actor: userId,
    action: 'invoice.create',
    detail: `${doc.invoiceId} purpose=${purpose} amount=${doc.amount} orderId=${options?.orderId ?? '-'}`,
  });
  return doc;
}

/**
 * Proses invoice sampai lunas — idempoten dan aman dari pemrosesan ganda:
 *  1. baca invoice + ETag; status paid/expired langsung selesai;
 *  2. verifikasi ke Pixpayz lewat checkinvoice (payload webhook tidak dipercaya);
 *  3. kunci invoice (pending -> processing) dengan If-Match;
 *  4. JIKA purpose='deposit': tambah saldo user dengan If-Match + penanda lastCreditInvoiceId
 *     JIKA purpose='donation' atau 'direct_purchase': TIDAK tambah saldo user
 *  5. tulis transaksi + status paid dalam SATU PATCH multi-path (atomik).
 */
export async function processInvoice(
  invoiceId: string,
  options: { force?: boolean } = {}
): Promise<ProcessResult> {
  const { force = false } = options;

  const first = await getWithEtag<InvoiceDoc>(`invoices/${invoiceId}`);
  let inv = first.value;
  let etag = first.etag;
  if (!inv) return { found: false, paid: false };
  if (inv.status === 'paid') return { found: true, paid: true };
  if (inv.status === 'expired' || inv.status === 'failed') {
    return { found: true, paid: false };
  }
  if (
    inv.status === 'processing' &&
    inv.lockedAt &&
    Date.now() - inv.lockedAt < LOCK_FRESH_MS
  ) {
    return { found: true, paid: false, busy: true };
  }
  if (
    !force &&
    inv.lastCheckedAt &&
    Date.now() - inv.lastCheckedAt < CHECK_THROTTLE_MS
  ) {
    return { found: true, paid: false };
  }

  let check;
  try {
    check = await checkInvoice(invoiceId);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'checkinvoice gagal';
    await set(`invoices/${invoiceId}/lastCheckedAt`, Date.now());
    return { found: true, paid: false, error: message };
  }

  // CATATAN: semua tulis bersyarat (If-Match) harus terjadi SEBELUM tulis anak
  // lastCheckedAt, karena tulis anak mengubah ETag dan membuat If-Match gagal 412.
  if (check.status !== 'paid') {
    if (inv.status === 'pending' && inv.expiredAt > 0 && Date.now() > inv.expiredAt) {
      const expired = await setIfMatch(
        `invoices/${invoiceId}`,
        { ...inv, status: 'expired' },
        etag
      );
      if (expired.ok) {
        await writeLog({ actor: 'system', action: 'invoice.expire', detail: invoiceId });
      }
    }
    await set(`invoices/${invoiceId}/lastCheckedAt`, Date.now());
    return { found: true, paid: false };
  }

  // Kunci invoice (If-Match) — hanya satu pemenang.
  const locked = await setIfMatch(
    `invoices/${invoiceId}`,
    { ...inv, status: 'processing', lockedAt: Date.now(), lastCheckedAt: Date.now() },
    etag
  );
  if (!locked.ok) {
    return { found: true, paid: false, busy: true };
  }
  inv = { ...inv, status: 'processing', lockedAt: Date.now() };

  // Untuk deposit: tambah saldo user
  // Untuk donation/direct_purchase: TIDAK tambah saldo (uang ke admin)
  let balanceAfter: number | null = null;
  let credited = false;

  if (inv.purpose === 'deposit') {
    for (let attempt = 0; attempt < 5 && !credited; attempt++) {
      const userRead = await getWithEtag<UserDoc>(`users/${inv.userId}`);
      const user = userRead.value;
      if (!user) {
        await setIfMatch(
          `invoices/${invoiceId}`,
          { ...inv, status: 'failed', error: 'Pengguna tidak ditemukan.' },
          locked.etag
        );
        await writeLog({ actor: inv.userId, action: 'invoice.credit_failed', detail: invoiceId });
        return { found: true, paid: false, error: 'Pengguna tidak ditemukan.' };
      }
      if (user.lastCreditInvoiceId === invoiceId) {
        balanceAfter = typeof user.saldo === 'number' ? user.saldo : null;
        credited = true;
        break;
      }
      const newSaldo = (typeof user.saldo === 'number' ? user.saldo : 0) + inv.amount;
      const put = await setIfMatch(
        `users/${inv.userId}`,
        { ...user, saldo: newSaldo, lastCreditInvoiceId: invoiceId },
        userRead.etag
      );
      if (put.ok) {
        balanceAfter = newSaldo;
        credited = true;
        break;
      }
    }

    if (!credited) {
      await writeLog({ actor: inv.userId, action: 'invoice.credit_retry_exhausted', detail: invoiceId });
      return { found: true, paid: false, busy: true, error: 'Gagal mengunci saldo, akan diulang.' };
    }
  } else {
    // Donation atau direct_purchase: tidak kredit saldo user
    credited = true;
    balanceAfter = null;
  }

  // Commit atomik: transaksi + status paid dalam satu PATCH multi-path.
  const txKey = `${inv.purpose}_${invoiceId}`;
  const updates: Record<string, Json> = {
    [`invoices/${invoiceId}/status`]: 'paid',
    [`invoices/${invoiceId}/processedAt`]: Date.now(),
    [`invoices/${invoiceId}/paidAt`]: check.completed_at ?? null,
    [`invoices/${invoiceId}/lockedAt`]: null,
    [`invoices/${invoiceId}/error`]: null,
    // Update qrisImage dan paymentLink dari Pixpayz checkInvoice (bisa berubah)
    [`invoices/${invoiceId}/qrisImage`]: check.qris_image ?? inv.qrisImage,
    [`invoices/${invoiceId}/paymentLink`]: check.payment_link ?? inv.paymentLink,
    // Update amount/fee/total dari Pixpayz check (bisa berubah)
    [`invoices/${invoiceId}/amount`]: check.amount ?? inv.amount,
    [`invoices/${invoiceId}/fee`]: check.fee ?? inv.fee,
    [`invoices/${invoiceId}/total`]: check.total ?? inv.total,
    [`invoices/${invoiceId}/expiredAt`]: parsePixpayzDate(check.expired_at) ?? inv.expiredAt,
  };

  if (inv.purpose === 'deposit') {
    updates[`transactions/${txKey}`] = {
      userId: inv.userId,
      type: 'deposit',
      amount: inv.amount,
      balanceAfter: balanceAfter,
      note: `Deposit ${invoiceId}`,
      invoiceId,
      createdAt: Date.now(),
    };
  } else if (inv.purpose === 'donation') {
    updates[`transactions/${txKey}`] = {
      userId: inv.userId,
      type: 'donation',
      amount: inv.amount,
      balanceAfter: null,
      note: `Donasi ${invoiceId}`,
      invoiceId,
      createdAt: Date.now(),
    };
  } else if (inv.purpose === 'direct_purchase') {
    updates[`transactions/${txKey}`] = {
      userId: inv.userId,
      type: 'direct_purchase',
      amount: inv.amount,
      balanceAfter: null,
      note: `Beli langsung: ${inv.productName ?? inv.productId ?? invoiceId}`,
      invoiceId,
      productId: inv.productId ?? null,
      createdAt: Date.now(),
    };

    // Tandai order terkait sebagai paid
    if (inv.orderId) {
      await update('/', {
        [`orders/${inv.orderId}/status`]: 'paid',
        [`orders/${inv.orderId}/paidAt`]: Date.now(),
        [`orders/${inv.orderId}/updatedAt`]: Date.now(),
      } as Record<string, Json>);

      // Provisioning untuk produk panel
      const orderDoc = await get<{ productId?: string; kind?: string; productName?: string }>(
        `orders/${inv.orderId}`
      );
      if (orderDoc?.kind === 'panel' && orderDoc.productId) {
        const product = await get<ProductDoc>(`products/${orderDoc.productId}`);
        if (product?.kind === 'panel' && product.provision) {
          await provisionPanelOrder({
            orderId: inv.orderId,
            product,
            price: inv.amount,
            userId: inv.userId,
          });
        }
      }
    }

    // Trigger provisioning untuk produk panel/vps_trial/digital
    if (inv.productId) {
      await writeLog({
        actor: inv.userId,
        action: 'direct_purchase.paid',
        detail: `${invoiceId} product=${inv.productId}`,
      });
    }
  }

  await update('/', updates);

  await writeLog({
    actor: inv.userId,
    action: 'invoice.paid',
    detail: `${invoiceId} purpose=${inv.purpose} amount=${inv.amount}`,
  });
  return { found: true, paid: true };
}

/** Menandai invoice pending yang sudah lewat masa berlaku sebagai expired. */
export async function expireInvoiceIfDue(invoice: InvoiceDoc): Promise<boolean> {
  if (invoice.status !== 'pending') return false;
  if (invoice.expiredAt <= 0 || Date.now() <= invoice.expiredAt) return false;
  const { value, etag } = await getWithEtag<InvoiceDoc>(`invoices/${invoice.invoiceId}`);
  if (!value || value.status !== 'pending') return false;
  const result = await setIfMatch(`invoices/${invoice.invoiceId}`, { ...value, status: 'expired' }, etag);
  if (result.ok) {
    await writeLog({ actor: 'system', action: 'invoice.expire', detail: invoice.invoiceId });
    return true;
  }
  return false;
}

/** Ambil invoice pending terbaru milik pengguna (untuk melanjutkan halaman bayar). */
export async function getLatestPendingInvoice(
  userId: string,
  purpose?: InvoicePurpose
): Promise<InvoiceDoc | null> {
  const invoices = await get<Record<string, InvoiceDoc>>('invoices');
  if (!invoices) return null;
  const mine = Object.values(invoices)
    .filter(
      (inv) =>
        inv &&
        inv.userId === userId &&
        (inv.status === 'pending' || inv.status === 'processing') &&
        (!purpose || inv.purpose === purpose)
    )
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  return mine[0] ?? null;
}

/**
 * Provisioning produk panel saat pembelian langsung (direct_purchase) dibayar.
 * Dipanggil dari processInvoice setelah invoice lunas.
 */
async function provisionPanelOrder(args: {
  orderId: string;
  product: ProductDoc;
  price: number;
  userId: string;
}): Promise<void> {
  const { orderId, product, price, userId } = args;
  const provision = product.provision as ProvisionConfig | null | undefined;
  if (!provision || !provision.panelId) {
    await writeLog({ actor: userId, action: 'direct_purchase.no_provision', detail: orderId });
    return;
  }

  const panelDoc = await get<PanelDoc>(`panels/${provision.panelId}`);
  if (!panelDoc || panelDoc.active === false || !panelDoc.apiKeyEnc) {
    await writeLog({ actor: userId, action: 'direct_purchase.panel_inactive', detail: orderId });
    return;
  }

  const userDoc = await get<{ username: string; email: string }>(`users/${userId}`);
  if (!userDoc?.email) {
    await writeLog({ actor: userId, action: 'direct_purchase.no_email', detail: orderId });
    return;
  }

  const panel: PteroPanel = {
    baseUrl: panelDoc.baseUrl,
    apiKey: decryptSecret(panelDoc.apiKeyEnc),
  };

  // Cari atau buat akun panel berdasarkan email pengguna
  let pUser = await findPanelUser(panel, userDoc.email);
  let temporaryPassword: string | null = null;
  if (!pUser) {
    temporaryPassword = generatePanelPassword();
    pUser = await createPanelUser(panel, {
      email: userDoc.email,
      username: userDoc.username.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24) || `user${Date.now()}`,
      password: temporaryPassword,
    });
  }

  // Build argumen server dari egg
  const eggArgs = await buildServerArgs(panel, provision);
  if (!eggArgs.dockerImage) {
    await writeLog({ actor: userId, action: 'direct_purchase.no_docker_image', detail: orderId });
    return;
  }

  const payload = {
    name: `${product.name} ${orderId}`.slice(0, 191),
    user: pUser.id,
    egg: provision.eggId,
    environment: eggArgs.environment,
    docker_image: eggArgs.dockerImage as string,
    startup: eggArgs.startup ?? 'npm start',
    limits: {
      memory: provision.memoryMb,
      swap: provision.swapMb,
      disk: provision.diskMb,
      io: provision.ioWeight,
      cpu: provision.cpuPercent,
    },
    feature_limits: {
      databases: provision.databases,
      allocations: provision.allocations,
      backups: provision.backups,
    },
    ...(provision.allocationMode === 'default' && provision.allocationId
      ? { allocation: { default: provision.allocationId } }
      : { deploy: { find_available: true as const } }),
  };

  let server: Awaited<ReturnType<typeof createPanelServer>>;
  try {
    server = await createPanelServer(panel, payload);
  } catch (allocError) {
    const msg = allocError instanceof Error ? allocError.message : '';
    const base = payload as Record<string, unknown>;
    if ('allocation' in base && /allocation/i.test(msg)) {
      delete base.allocation;
      base.deploy = { find_available: true };
      server = await createPanelServer(panel, base as Parameters<typeof createPanelServer>[1]);
    } else {
      throw allocError;
    }
  }

  await update('/', {
    [`orders/${orderId}/status`]: 'active',
    [`orders/${orderId}/panelId`]: provision.panelId,
    [`orders/${orderId}/panelServerId`]: server.id,
    [`orders/${orderId}/panelServerUuid`]: server.uuid ?? null,
    [`orders/${orderId}/panelUrl`]: panelDoc.baseUrl,
    [`orders/${orderId}/expiresAt`]: Date.now() + ((product as { durationDays?: number }).durationDays || 30) * 86_400_000,
    [`orders/${orderId}/panelPassword`]: temporaryPassword,
    [`orders/${orderId}/failReason`]: null,
    [`orders/${orderId}/updatedAt`]: Date.now(),
  } as Record<string, Json>);

  await writeLog({
    actor: userId,
    action: 'direct_purchase.panel_created',
    detail: `${orderId} · server ${server.id} · ${panelDoc.name}`,
  });
}