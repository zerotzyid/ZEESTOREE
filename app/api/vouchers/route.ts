import { z } from 'zod';
import { get } from '@/lib/rtdb';
import { requireUser } from '@/lib/authz';
import type { VoucherDoc, VoucherValidationResult } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

const validateSchema = z.object({
  code: z.string().trim().min(3).max(20),
  productId: z.string().optional(),
  amount: z.number().int().positive().optional(),
});

export async function POST(request: Request): Promise<Response> {
  const session = await requireUser();
  if (!session) return Response.json({ error: 'Silakan masuk terlebih dahulu.' }, { status: 401 });

  const userKey = session.username.toLowerCase();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Permintaan tidak valid.' }, { status: 400 });
  }

  const parsed = validateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.errors[0]?.message ?? 'Input tidak valid.' },
      { status: 400 }
    );
  }

  const { code, productId, amount } = parsed.data;
  const upperCode = code.toUpperCase();

  try {
    const voucher = await get<VoucherDoc>(`vouchers/${upperCode}`);
    if (!voucher) {
      return Response.json({ valid: false, error: 'Kode voucher tidak valid.' } as VoucherValidationResult);
    }

    if (!voucher.active) {
      return Response.json({ valid: false, error: 'Voucher tidak aktif.' } as VoucherValidationResult);
    }

    if (voucher.expiresAt && Date.now() > voucher.expiresAt) {
      return Response.json({ valid: false, error: 'Voucher sudah kedaluwarsa.' } as VoucherValidationResult);
    }

    if (voucher.usedCount >= voucher.maxUses) {
      return Response.json({ valid: false, error: 'Voucher sudah habis dipakai.' } as VoucherValidationResult);
    }

    const userVoucherUsage = await get<Record<string, number>>(`voucher_usage/${upperCode}`);
    const userUsed = userVoucherUsage?.[userKey] ?? 0;
    if (userUsed >= voucher.maxPerUser) {
      return Response.json({ valid: false, error: `Anda sudah menggunakan voucher ini ${voucher.maxPerUser}x.` } as VoucherValidationResult);
    }

    if (voucher.minPurchase && amount && amount < voucher.minPurchase) {
      return Response.json({ valid: false, error: `Minimal belanja ${amount.toLocaleString('id-ID')} untuk voucher ini.` } as VoucherValidationResult);
    }

    let discountAmount = 0;
    let finalPrice = amount ?? 0;
    let freeProduct = false;

    if (voucher.type === 'balance') {
      return Response.json({
        valid: true,
        voucher: { ...voucher, code: upperCode },
        discountAmount: 0,
        finalPrice: amount ?? 0,
      } as VoucherValidationResult);
    }

    if (voucher.type === 'discount') {
      if (!amount) {
        return Response.json({ error: 'Nominal belanja wajib diisi untuk voucher diskon.' }, { status: 400 });
      }
      if (!voucher.discountPercent) {
        return Response.json({ error: 'Voucher diskon tidak memiliki persentase.' }, { status: 400 });
      }
      discountAmount = Math.floor((amount * voucher.discountPercent) / 100);
      if (discountAmount > amount) discountAmount = amount;
      finalPrice = amount - discountAmount;
    }

    if (voucher.type === 'product') {
      if (!voucher.productId) {
        return Response.json({ error: 'Voucher produk tidak dikonfigurasi.' }, { status: 400 });
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
    const message = error instanceof Error ? error.message : 'Gagal memvalidasi voucher.';
    return Response.json({ error: message }, { status: 500 });
  }
}
