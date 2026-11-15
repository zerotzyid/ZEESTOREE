import { z } from 'zod';
import { get, push, remove, set, update } from '@/lib/rtdb';
import { requireAdmin } from '@/lib/authz';
import { writeLog } from '@/lib/log';
import type { VoucherDoc, VoucherValidationResult } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

function generateVoucherCode(length = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

const createSchema = z.object({
  type: z.enum(['balance', 'discount', 'product']),
  value: z.number().positive(),
  productId: z.string().optional(),
  discountPercent: z.number().int().min(1).max(100).optional(),
  maxUses: z.number().int().positive().max(10000),
  maxPerUser: z.number().int().positive().max(100).default(1),
  minPurchase: z.number().int().min(0).optional(),
  expiresAt: z.number().int().positive().optional(),
  active: z.boolean().default(true),
  description: z.string().max(200).optional(),
  customCode: z.string().trim().min(4).max(20).optional(),
});

const patchSchema = z.object({
  maxUses: z.number().int().positive().max(10000).optional(),
  maxPerUser: z.number().int().positive().max(100).optional(),
  minPurchase: z.number().int().min(0).optional(),
  expiresAt: z.number().int().positive().nullable().optional(),
  active: z.boolean().optional(),
  description: z.string().max(200).optional(),
}).refine((v) => Object.keys(v).length > 0, { message: 'Tidak ada perubahan.' });

function fail(error: string, status = 400) {
  return Response.json({ error }, { status });
}

/** GET: daftar voucher */
export async function GET(): Promise<Response> {
  const session = await requireAdmin();
  if (!session) return fail('Hanya admin.', 403);

  try {
    const vouchers = await get<Record<string, VoucherDoc>>('vouchers');
    const list = vouchers
      ? Object.entries(vouchers)
          .map(([code, doc]) => ({ ...doc, code }))
          .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
      : [];
    return Response.json({ vouchers: list }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Gagal memuat voucher.', 500);
  }
}

/** POST: buat voucher baru */
export async function POST(request: Request): Promise<Response> {
  const session = await requireAdmin();
  if (!session) return fail('Hanya admin.', 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail('Permintaan tidak valid.', 400);
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.errors[0]?.message ?? 'Input tidak valid.', 400);
  }

  const data = parsed.data;

  // Validasi tipe
  if (data.type === 'product' && !data.productId) {
    return fail('Produk wajib dipilih untuk voucher tipe produk.', 400);
  }
  if (data.type === 'discount' && (!data.discountPercent || data.discountPercent < 1 || data.discountPercent > 100)) {
    return fail('Persen diskon wajib 1-100 untuk voucher tipe diskon.', 400);
  }

  // Validasi produk jika tipe product
  if (data.type === 'product' && data.productId) {
    const product = await get<{ active?: boolean; name?: string }>(`products/${data.productId}`);
    if (!product || product.active === false) {
      return fail('Produk tidak ditemukan atau tidak aktif.', 400);
    }
  }

  // Generate atau validasi kode custom
  let code = data.customCode?.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!code) {
    code = generateVoucherCode(8);
  }
  // Cek duplikat
  const existing = await get(`vouchers/${code}`);
  if (existing) {
    // Coba generate baru sampai 5 kali
    for (let i = 0; i < 5; i++) {
      code = generateVoucherCode(8);
      const ex = await get(`vouchers/${code}`);
      if (!ex) break;
    }
    const ex2 = await get(`vouchers/${code}`);
    if (ex2) return fail('Gagal generate kode unik. Coba lagi.', 500);
  }

  try {
    const now = Date.now();
    const voucher: VoucherDoc = {
      code,
      type: data.type,
      value: data.value,
      productId: data.productId,
      discountPercent: data.discountPercent,
      maxUses: data.maxUses,
      usedCount: 0,
      maxPerUser: data.maxPerUser,
      minPurchase: data.minPurchase,
      expiresAt: data.expiresAt,
      active: data.active,
      createdAt: now,
      createdBy: session.username,
      description: data.description,
    };

    await set(`vouchers/${code}`, voucher as any);
    await writeLog({
      actor: session.username,
      action: 'voucher.create',
      detail: `${code} · ${data.type} · ${data.value}`,
    });

    return Response.json({ ok: true, code, voucher }, { status: 201 });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Gagal membuat voucher.', 500);
  }
}