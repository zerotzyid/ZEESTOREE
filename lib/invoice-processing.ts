import { get, getWithEtag, set, setIfMatch, update, type Json } from './rtdb';
import { checkInvoice, createInvoice, parsePixpayzDate } from './pixpayz';
import { getPaymentConfig } from './payment-config';
import { writeLog } from './log';

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
  productId?: string;
  productName?: string;
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
  purpose: InvoicePurpose = 'deposit'
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
  };

  await set(`invoices/${doc.invoiceId}`, doc as unknown as Json);
  await writeLog({
    actor: userId,
    action: 'invoice.create',
    detail: `${doc.invoiceId} purpose=${purpose} amount=${doc.amount}`,
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
      productId: inv.productId,
      createdAt: Date.now(),
    };
    // Trigger provisioning untuk produk panel/vps_trial/digital
    if (inv.productId) {
      // Provisioning akan ditangani oleh cron atau manual check
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