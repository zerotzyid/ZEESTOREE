import { z } from 'zod';
import { get, update } from '@/lib/rtdb';
import { requireUser } from '@/lib/authz';
import type { VoucherDoc, VoucherValidationResult } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

const validateSchema = z.object({
  code: z.string().trim().min(3).max(20),
  productId: z.string().optional(),
  amount: z.number().int().positive().optional(),
});

function fail(error: string, status = 400) {
  return Response.json({ error }, { status });
}

/** POST: validasi & apply voucher */
export async function POST(request: Request): Promise<Response> {
  const session = await requireUser();
  if (!session) return fail('Silakan masuk terlebih dahulu.', 401);

  const userKey = session.username.toLowerCase();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail('Permintaan tidak valid.', 400);
  }

  const parsed = validateSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.errors[0]?.message ?? 'Input tidak valid.', 400);
  }

  const { code, productId, amount } = parsed.data;
  const upperCode = code.toUpperCase();

  try {
    const voucher = await get<VoucherDoc>(`vouchers/${upperCode}`);
    if (!voucher) {
      return Response.json({ valid: false, error: 'Kode voucher tidak valid.' } as VoucherValidationResult);
    }

    // Cek aktif
    if (!voucher.active) {
      return Response.json({ valid: false, error: 'Voucher tidak aktif.' } as VoucherValidationResult);
    }

    // Cek expired
    if (voucher.expiresAt && Date.now() > voucher.expiresAt) {
      return Response.json({ valid: false, error: 'Voucher sudah kedaluwarsa.' } as VoucherValidationResult);
    }

    // Cek max uses
    if (voucher.usedCount >= voucher.maxUses) {
      return Response.json({ valid: false, error: 'Voucher sudah habis dipakai.' } as VoucherValidationResult);
    }

    // Cek max per user
    const userVoucherUsage = await get<Record<string, number>>(`voucher_usage/${upperCode}`);
    const userUsed = userVoucherUsage?.[userKey] ?? 0;
    if (userUsed >= voucher.maxPerUser) {
      return Response.json({ valid: false, error: `Anda sudah menggunakan voucher ini ${voucher.maxPerUser}x.` } as VoucherValidationResult);
    }

    // Cek min purchase
    if (voucher.minPurchase && amount && amount < voucher.minPurchase) {
      return Response.json({ valid: false, error: `Minimal belanja ${amount.toLocaleString('id-ID')} untuk voucher ini.` } as VoucherValidationResult);
    }

    // Validasi tipe voucher
    let discountAmount = 0;
    let finalPrice = amount ?? 0;
    let freeProduct = false;

    if (voucher.type === 'balance') {
      // Voucher saldo: tidak langsung potong harga, tapi nambah saldo
      // Validasi di sini hanya untuk cek validitas, actual apply di deposit/checkout
      return Response.json({
        valid: true,
        voucher: { ...voucher, code: upperCode },
        discountAmount: 0,
        finalPrice: amount ?? 0,
      } as VoucherValidationResult);
    }

    if (voucher.type === 'discount') {
      if (!amount) {
        return fail('Nominal belanja wajib diisi untuk voucher diskon.', 400);
      }
      if (!voucher.discountPercent) {
        return fail('Voucher diskon tidak memiliki persentase.', 400);
      }
      discountAmount = Math.floor((amount * voucher.discountPercent) / 100);
      // Cap discount at amount
      if (discountAmount > amount) discountAmount = amount;
      finalPrice = amount - discountAmount;
    }

    if (voucher.type === 'product') {
      if (!voucher.productId) {
        return fail('Voucher produk tidak dikonfigurasi.', 400);
      }
      if (productId && productId !== voucher.productId) {
        return Response.json({ valid: false, error: 'Voucher ini hanya berlaku untuk produk tertentu.' } as VoucherValidationResult);
      }
      freeProduct = true;
      finalPrice = 0;
    }

    return Response.json({
      valid: true,
      voucher: { ...voucher, code: upperCode },
      discountAmount,
      finalPrice,
      freeProduct,
    } as VoucherValidationResult);
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Gagal memvalidasi voucher.', 500);
  }
}

/** POST: redeem voucher (untuk tipe balance) */
export async function PUT(request: Request): Promise<Response> {
  const session = await requireUser();
  if (!session) return fail('Silakan masuk terlebih dahulu.', 401);

  const userKey = session.username.toLowerCase();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail('Permintaan tidak valid.', 400);
  }

  const parsed = z.object({
    code: z.string().trim().min(3).max(20),
  }).safeParse(body);

  if (!parsed.success) {
    return fail('Kode voucher wajib diisi.', 400);
  }

  const upperCode = parsed.data.code.toUpperCase();

  try {
    const voucher = await get<VoucherDoc>(`vouchers/${upperCode}`);
    if (!voucher) return fail('Kode voucher tidak valid.', 404);
    if (!voucher.active) return fail('Voucher tidak aktif.', 400);
    if (voucher.expiresAt && Date.now() > voucher.expiresAt) return fail('Voucher sudah kedaluwarsa.', 400);
    if (voucher.usedCount >= voucher.maxUses) return fail('Voucher sudah habis dipakai.', 400);
    if (voucher.type !== 'balance') return fail('Voucher ini bukan tipe saldo.', 400);

    const userVoucherUsage = await get<Record<string, number>>(`voucher_usage/${upperCode}`);
    const userUsed = userVoucherUsage?.[userKey] ?? 0;
    if (userUsed >= voucher.maxPerUser) {
      return fail(`Anda sudah menggunakan voucher ini ${voucher.maxPerUser}x.`, 400);
    }

    // Atomic update: increment usedCount, add user usage, add saldo
    const { adjustSaldo } = await import('@/lib/balance');
    const newSaldo = await adjustSaldo(userKey, voucher.value);
    if (newSaldo === null) {
      return fail('Gagal menambah saldo.', 500);
    }

    // Update voucher usage
    await update('/', {
      [`vouchers/${upperCode}/usedCount`]: voucher.usedCount + 1,
      [`voucher_usage/${upperCode}/${userKey}`]: userUsed + 1,
      [`transactions/voucher_${upperCode}_${Date.now()}`]: {
        userId: userKey,
        type: 'voucher',
        amount: voucher.value,
        balanceAfter: newSaldo,
        note: `Voucher ${upperCode}`,
        voucherCode: upperCode,
        createdAt: Date.now(),
      },
    } as Record<string, any>);

    await import('@/lib/log').then(({ writeLog }) => writeLog({
      actor: userKey,
      action: 'voucher.redeem',
      detail: `${upperCode} · +${voucher.value}`,
    }));

    return Response.json({
      ok: true,
      message: `Voucher berhasil diredeem! Saldo bertambah ${voucher.value.toLocaleString('id-ID')}.`,
      newSaldo,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Gagal redeem voucher.', 500);
  }
}