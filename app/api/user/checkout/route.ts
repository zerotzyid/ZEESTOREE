import { z } from 'zod';
import { get, getWithEtag, push, remove, set, setIfMatch, update, type Json } from '@/lib/rtdb';
import { requireUser } from '@/lib/authz';
import { adjustSaldo } from '@/lib/balance';
import { decryptSecret } from '@/lib/crypto';
import { writeLog } from '@/lib/log';
import { getSettings } from '@/lib/settings';
import {
  buildServerArgs,
  createPanelServer,
  createPanelUser,
  findPanelUser,
  generatePanelPassword,
  type PteroPanel,
} from '@/lib/pterodactyl';
import type { ProvisionConfig, ProductDoc } from '@/lib/catalog';
import type { PanelDoc } from '@/app/api/admin/panels/route';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const checkoutSchema = z.object({
  productId: z.string().trim().min(1).max(60),
  customerName: z.string().trim().min(2).max(60).optional(),
  customerPhone: z.string().trim().min(8).max(20).optional(),
});

type Buyer = {
  key: string;
  username: string;
  email: string;
  saldo: number;
  banned?: boolean;
};

/**
 * POST: checkout produk.
 * Alur: buat order pending → potong saldo (ETag) → tandai paid →
 * bila kind='panel': buat akun + server di Pterodactyl.
 * SETIAP kegagalan mengembalikan saldo (refund otomatis) sehingga
 * gagal-bayar/gagal-buat-akun tidak membuat saldo hilang (kriteria penerimaan).
 */
export async function POST(request: Request): Promise<Response> {
  const session = await requireUser();
  if (!session) {
    return Response.json({ error: 'Silakan masuk terlebih dahulu.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Permintaan tidak valid.' }, { status: 400 });
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Produk tidak valid.' }, { status: 400 });
  }

  const userKey = session.username.toLowerCase();

  try {
    const userDoc = await get<Record<string, unknown>>(`users/${userKey}`);
    if (!userDoc) {
      return Response.json({ error: 'Akun tidak ditemukan.' }, { status: 404 });
    }
    if (userDoc.banned === true) {
      return Response.json({ error: 'Akun Anda diblokir.' }, { status: 403 });
    }
    const buyer: Buyer = {
      key: userKey,
      username: String(userDoc.username ?? session.username),
      email: String(userDoc.email ?? ''),
      saldo: typeof userDoc.saldo === 'number' ? userDoc.saldo : 0,
    };

    const product = await get<ProductDoc>(`products/${parsed.data.productId}`);
    if (!product || product.active === false) {
      return Response.json({ error: 'Produk tidak tersedia.' }, { status: 404 });
    }
    const price = typeof product.price === 'number' ? product.price : 0;

    // Produk reseller: TIDAK memakai saldo — QRIS dibayar langsung ke reseller.
    if (product.kind === 'reseller') {
      return await createResellerOrder({
        username: buyer.username,
        productId: parsed.data.productId,
        product,
        input: parsed.data,
      });
    }

    // 1. Order pending (belum memotong saldo apa pun).
    const now = Date.now();
    const orderId = await push('orders', {
      userId: userKey,
      productId: parsed.data.productId,
      productName: product.name,
      price,
      kind: product.kind,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      failReason: null,
      refundedAt: null,
      paidAt: null,
      completedAt: null,
    } as unknown as Json);

    // 2. Potong saldo dengan ETag retry.
    let newSaldo: number | null = null;
    let insufficient = false;
    for (let attempt = 0; attempt < 5 && newSaldo === null; attempt++) {
      const read = await getWithEtag<{ saldo?: number }>(`users/${userKey}`);
      const current = typeof read.value?.saldo === 'number' ? read.value.saldo : 0;
      if (current < price) {
        insufficient = true;
        break;
      }
      const put = await setIfMatch(
        `users/${userKey}`,
        { ...(read.value as Record<string, unknown>), saldo: current - price },
        read.etag
      );
      if (put.ok) newSaldo = current - price;
    }
    if (newSaldo === null) {
      await remove(`orders/${orderId}`);
      if (insufficient) {
        return Response.json({ error: 'Saldo tidak cukup. Silakan deposit dulu.' }, { status: 400 });
      }
      return Response.json({ error: 'Gagal mengunci saldo. Coba lagi.' }, { status: 500 });
    }

    // 3. Tandai paid + catat transaksi (satu PATCH atomik).
    await update('/', {
      [`orders/${orderId}/status`]: 'paid',
      [`orders/${orderId}/paidAt`]: Date.now(),
      [`orders/${orderId}/updatedAt`]: Date.now(),
      [`transactions/checkout_${orderId}`]: {
        userId: userKey,
        type: 'checkout',
        amount: -price,
        balanceAfter: newSaldo,
        note: `Checkout ${product.name}`,
        orderId,
        createdAt: Date.now(),
      },
    } as Record<string, Json>);

    // 4. Produk panel → provisioning Pterodactyl; gagal = refund otomatis.
    if (product.kind === 'panel') {
      return await provisionPanelOrder({ orderId, buyer, product, price });
    }

    // 4b. NOKOS → order di Axmisu (potong saldo situs dulu); gagal = refund otomatis.
    if (product.kind === 'nokos') {
      return await createNokosOrder({ orderId, buyer, product, price });
    }

    return Response.json({
      ok: true,
      orderId,
      status: 'paid',
      message: 'Pesanan dibuat dan saldo terpotong. Menunggu pemenuhan oleh admin.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Checkout gagal.';
    await writeLog({ actor: userKey, action: 'checkout.error', detail: message.slice(0, 200) });
    return Response.json({ error: message }, { status: 500 });
  }
}

async function failAndRefund(args: {
  orderId: string;
  buyer: Buyer;
  price: number;
  reason: string;
}): Promise<Response> {
  const { orderId, buyer, price, reason } = args;
  const refundedSaldo = price > 0 ? await adjustSaldo(buyer.key, price) : 0;
  const refunded = refundedSaldo !== null || price === 0;

  if (refunded) {
    await update('/', {
      [`orders/${orderId}/status`]: 'failed',
      [`orders/${orderId}/failReason`]: reason,
      [`orders/${orderId}/updatedAt`]: Date.now(),
      [`transactions/refund_${orderId}`]: {
        userId: buyer.key,
        type: 'refund',
        amount: price,
        balanceAfter: refundedSaldo,
        note: `Refund otomatis checkout ${orderId}`,
        orderId,
        createdAt: Date.now(),
      },
    } as Record<string, Json>);
    await writeLog({ actor: buyer.key, action: 'checkout.refund', detail: `${orderId} · ${reason.slice(0, 150)}` });
    return Response.json({
      ok: false,
      orderId,
      status: 'failed',
      refunded: true,
      message: `Pesanan gagal diproses — saldo Rp${price} sudah dikembalikan. ${reason}`,
    });
  }

  // Refund manual gagal (kunci saldo berebut) — catat supaya admin bisa tindak lanjut.
  await update('/', {
    [`orders/${orderId}/status`]: 'failed',
    [`orders/${orderId}/failReason`]: `${reason} (pengembalian saldo otomatis gagal — hubungi admin)`,
    [`orders/${orderId}/updatedAt`]: Date.now(),
  } as Record<string, Json>);
  await writeLog({ actor: 'system', action: 'checkout.refund_failed', detail: `${orderId} · ${reason.slice(0, 150)}` });
  return Response.json({
    ok: false,
    orderId,
    status: 'failed',
    refunded: false,
    message: `Pesanan gagal dan refund otomatis tidak berhasil. Hubungi admin (order ${orderId}). ${reason}`,
  });
}

/**
 * Produk reseller (FallZx): buat order di penyedia, tampilkan QRIS mereka.
 * Tidak memotong saldo sama sekali (kriteria: beli via QRIS reseller, bukan Pixpayz).
 */
async function createResellerOrder(args: {
  username: string;
  productId: string;
  product: ProductDoc;
  input: { customerName?: string; customerPhone?: string };
}): Promise<Response> {
  const { username, productId, product, input } = args;
  const cfg = product.reseller;
  const resellerProductId = typeof cfg === 'object' && cfg ? cfg.productId : null;
  const variantId = typeof cfg === 'object' && cfg ? cfg.variantId : null;
  const customerName = (input.customerName ?? '').trim();
  const customerPhone = (input.customerPhone ?? '').trim();

  if (!resellerProductId) {
    return Response.json({ error: 'Produk reseller belum dikonfigurasi (isi ID produk reseller di admin).' }, { status: 400 });
  }
  if (!customerName || !customerPhone) {
    return Response.json({ error: 'Nama dan nomor HP wajib diisi untuk pesanan ini.' }, { status: 400 });
  }

  const settings = await getSettings();
  const { resellerBaseUrl, resellerApiKey } = settings.integrations;
  if (!resellerApiKey) {
    return Response.json({ error: 'Integrasi reseller belum diatur (admin → Pengaturan → Integrasi).' }, { status: 500 });
  }

  const now = Date.now();
  const orderId = await push('orders', {
    userId: username.toLowerCase(),
    productId,
    productName: product.name,
    price: typeof product.price === 'number' ? product.price : 0,
    kind: 'reseller',
    status: 'pending',
    customerName,
    customerPhone,
    external: null,
    createdAt: now,
    updatedAt: now,
    failReason: null,
    refundedAt: null,
    paidAt: null,
    completedAt: null,
  } as unknown as Json);

  try {
    const res = await fetch(`${resellerBaseUrl.replace(/\/+$/, '')}/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resellerApiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `wst-${orderId}`,
      },
      body: JSON.stringify({
        product_id: resellerProductId,
        ...(variantId ? { variant_id: variantId } : {}),
        quantity: 1,
        customer_name: customerName,
        customer_phone: customerPhone,
        payment_method: 'QRIS',
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(20_000),
    });
    const text = await res.text().catch(() => '');
    const body = (text ? JSON.parse(text) : null) as
      | {
          success?: boolean;
          error?: { message?: string };
          data?: {
            order_id?: string;
            invoice_url?: string;
            amount?: number;
            status?: string;
            payment?: { qr_string?: string; qr_image_url?: string; expired_at?: string };
          };
        }
      | null;

    if (!res.ok || !body?.success || !body.data?.order_id) {
      const message = body?.error?.message ?? `Penyedia menolak pesanan (HTTP ${res.status}).`;
      await update('/', {
        [`orders/${orderId}/status`]: 'failed',
        [`orders/${orderId}/failReason`]: message.slice(0, 200),
        [`orders/${orderId}/updatedAt`]: Date.now(),
      } as Record<string, Json>);
      await writeLog({ actor: username.toLowerCase(), action: 'checkout.reseller_failed', detail: `${orderId} · ${message.slice(0, 150)}` });
      return Response.json({ ok: false, orderId, status: 'failed', message }, { status: 502 });
    }

    const d = body.data;
    await update('/', {
      [`orders/${orderId}/external`]: {
        provider: 'fallzx',
        orderId: d.order_id,
        qrString: d.payment?.qr_string ?? null,
        qrImageUrl: d.payment?.qr_image_url ?? null,
        invoiceUrl: d.invoice_url ?? null,
        expiresAt: d.payment?.expired_at ?? null,
        amount: typeof d.amount === 'number' ? d.amount : null,
      },
      [`orders/${orderId}/updatedAt`]: Date.now(),
    } as Record<string, Json>);
    await writeLog({ actor: username.toLowerCase(), action: 'checkout.reseller_created', detail: `${orderId} · ${d.order_id}` });

    return Response.json({
      ok: true,
      orderId,
      status: 'pending',
      qrString: d.payment?.qr_string ?? null,
      qrImageUrl: d.payment?.qr_image_url ?? null,
      invoiceUrl: d.invoice_url ?? null,
      message: 'Pesanan dibuat. Bayar lewat QRIS (tanpa saldo) — status otomatis tersinkron saat halaman pesanan dibuka.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal menghubungi penyedia reseller.';
    await update('/', {
      [`orders/${orderId}/status`]: 'failed',
      [`orders/${orderId}/failReason`]: message.slice(0, 200),
      [`orders/${orderId}/updatedAt`]: Date.now(),
    } as Record<string, Json>);
    return Response.json({ ok: false, orderId, status: 'failed', message }, { status: 502 });
  }
}

/** NOKOS via Axmisu: saldo situs sudah terpotong, order dibuat di Axmisu. */
async function createNokosOrder(args: {
  orderId: string;
  buyer: Buyer;
  product: ProductDoc;
  price: number;
}): Promise<Response> {
  const { orderId, buyer, product, price } = args;
  const reason = (r: string) => failAndRefund({ orderId, buyer, price, reason: r });

  const cfg = product.nokos;
  if (!cfg || !cfg.produk) {
    return reason('Produk NOKOS belum dikonfigurasi (isi service/negara di admin).');
  }
  const settings = await getSettings();
  const { axmisuBaseUrl, axmisuApiKey } = settings.integrations;
  if (!axmisuApiKey) {
    return reason('Integrasi Axmisu belum diatur (admin → Pengaturan → Integrasi).');
  }

  try {
    const res = await fetch(`${axmisuBaseUrl.replace(/\/+$/, '')}/order`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${axmisuApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'nokos',
        country: cfg.country || '6',
        produk: cfg.produk,
        operator: cfg.operator || 'any',
        ...(cfg.productId ? { productId: cfg.productId } : {}),
        ...(!cfg.productId && cfg.maxPrice ? { max_price: cfg.maxPrice } : {}),
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(25_000),
    });
    const text = await res.text().catch(() => '');
    const body = (text ? JSON.parse(text) : null) as
      | {
          success?: boolean;
          message?: string;
          error?: { code?: string };
          order?: { order_id?: string; phone_number?: string; price?: number; expired_at?: number };
        }
      | null;

    if (!res.ok || !body?.success || !body.order?.order_id) {
      const code = body?.error?.code ?? `HTTP ${res.status}`;
      const map: Record<string, string> = {
        INSUFFICIENT_BALANCE: 'Saldo Axmisu tidak cukup — hubungi admin.',
        NOT_FOUND: 'Layanan NOKOS tidak ditemukan — periksa konfigurasi produk.',
        PROVIDER_ERROR: 'Penyedia NOKOS gagal memproses.',
        MAINTENANCE: 'Layanan Axmisu sedang pemeliharaan.',
      };
      return reason(map[code] ?? body?.message ?? `Axmisu menolak order (${code}).`);
    }

    const order = body.order;
    await update('/', {
      [`orders/${orderId}/status`]: 'active',
      [`orders/${orderId}/external`]: {
        provider: 'axmisu',
        orderId: order.order_id,
        phone: order.phone_number ?? null,
        expiredAt: order.expired_at ?? null,
        axmisuPrice: order.price ?? null,
        otp: null,
      },
      [`orders/${orderId}/failReason`]: null,
      [`orders/${orderId}/updatedAt`]: Date.now(),
    } as Record<string, Json>);
    await writeLog({ actor: buyer.key, action: 'checkout.nokos_created', detail: `${orderId} · ${order.order_id}` });

    return Response.json({
      ok: true,
      orderId,
      status: 'active',
      phone: order.phone_number ?? null,
      message: order.phone_number
        ? `Nomor ${order.phone_number} dipesan. Pantau OTP di riwayat pesanan.`
        : 'Pesanan NOKOS dibuat. Pantau di riwayat pesanan.',
    });
  } catch (error) {
    return reason(error instanceof Error ? error.message : 'Gagal menghubungi Axmisu.');
  }
}

async function provisionPanelOrder(args: {
  orderId: string;
  buyer: Buyer;
  product: ProductDoc;
  price: number;
}): Promise<Response> {
  const { orderId, buyer, product, price } = args;
  const reason = (r: string) => failAndRefund({ orderId, buyer, price, reason: r });

  const provision = product.provision as ProvisionConfig | null | undefined;
  if (!provision || !provision.panelId) {
    return reason('Produk panel belum dikonfigurasi (pilih panel & egg di admin).');
  }

  const panelDoc = await get<PanelDoc>(`panels/${provision.panelId}`);
  if (!panelDoc || panelDoc.active === false || !panelDoc.apiKeyEnc) {
    return reason('Panel tujuan tidak aktif atau API key belum diatur.');
  }
  if (!buyer.email) {
    return reason('Akun tidak memiliki email untuk dibuatkan akun panel.');
  }

  const panel: PteroPanel = {
    baseUrl: panelDoc.baseUrl,
    apiKey: decryptSecret(panelDoc.apiKeyEnc),
  };

  try {
    // Cari akun panel berdasarkan email pembeli; buat bila belum ada.
    let pUser = await findPanelUser(panel, buyer.email);
    let temporaryPassword: string | null = null;
    if (!pUser) {
      temporaryPassword = generatePanelPassword();
      pUser = await createPanelUser(panel, {
        email: buyer.email,
        username: buyer.username.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24) || `user${Date.now()}`,
        password: temporaryPassword,
      });
    }

    // Env egg dibaca dinamis (?include=variables) → tidak lagi 422
    // "variable field is required" / "docker image field is required" saat egg berganti.
    const eggArgs = await buildServerArgs(panel, provision);
    console.error('CHECKOUT_EGG_ARGS:', JSON.stringify({ eggId: provision.eggId, dockerImage: eggArgs.dockerImage, startup: eggArgs.startup, environment: eggArgs.environment }, null, 2));
    if (!eggArgs.dockerImage) {
      return reason('Egg tidak menyediakan docker_image dan produk belum mengisinya — isi Docker Image di admin produk.');
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
        : { deploy: { find_available: true as const, dedicated_ip: false, locations: [], port_range: [] } }),
    };

    let server: Awaited<ReturnType<typeof createPanelServer>>;
    try {
      server = await createPanelServer(panel, payload);
    } catch (allocError) {
      // Allocation tetap tidak valid (sudah terpakai / salah ID) → fallback auto-deploy.
      const msg = allocError instanceof Error ? allocError.message : '';
      const base = payload as Record<string, unknown>;
      if ('allocation' in base && /allocation/i.test(msg)) {
        delete base.allocation;
        base.deploy = { find_available: true as const, dedicated_ip: false, locations: [], port_range: [] };
        server = await createPanelServer(
          panel,
          base as Parameters<typeof createPanelServer>[1]
        );
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
      [`orders/${orderId}/panelPassword`]: temporaryPassword,
      [`orders/${orderId}/failReason`]: null,
      [`orders/${orderId}/updatedAt`]: Date.now(),
    } as Record<string, Json>);

    await writeLog({
      actor: buyer.key,
      action: 'checkout.panel_created',
      detail: `${orderId} · server ${server.id} · ${panelDoc.name}`,
    });

    return Response.json({
      ok: true,
      orderId,
      status: 'active',
      panelUrl: panelDoc.baseUrl,
      panelPassword: temporaryPassword,
      message: temporaryPassword
        ? 'Akun panel dibuat. Simpan password panel — hanya ditampilkan sekali.'
        : 'Server aktif di panel (akun panel memakai email Anda).',
    });
  } catch (error) {
    const raw = error instanceof Error ? error.message : 'Provisioning panel gagal.';
    console.error('CHECKOUT_PROVISION_ERROR:', raw);
    let failReason: string;
    if (/variable field is required/i.test(raw)) {
      failReason = `Environment variable wajib dari Egg belum diisi di produk (${raw}). Admin: isi field Environment di konfigurasi produk panel, atau ubah egg.`;
    } else if (/allocation/i.test(raw)) {
      failReason = `Konfigurasi alokasi produk tidak valid (${raw}). Admin: ganti ke mode "Auto" atau periksa Allocation ID.`;
    } else {
      failReason = raw;
    }
    return reason(failReason);
  }
}
