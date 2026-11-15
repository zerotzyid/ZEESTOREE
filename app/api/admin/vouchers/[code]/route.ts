import { z } from 'zod';
import { get, remove, set, update } from '@/lib/rtdb';
import { requireAdmin } from '@/lib/authz';
import { writeLog } from '@/lib/log';
import type { VoucherDoc } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

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

/** GET: detail voucher */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
): Promise<Response> {
  const session = await requireAdmin();
  if (!session) return fail('Hanya admin.', 403);

  const { code } = await params;
  const upperCode = code.toUpperCase();

  try {
    const voucher = await get<VoucherDoc>(`vouchers/${upperCode}`);
    if (!voucher) return fail('Voucher tidak ditemukan.', 404);
    return Response.json({ voucher: { ...voucher, code: upperCode } }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Gagal memuat voucher.', 500);
  }
}

/** PATCH: update voucher */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
): Promise<Response> {
  const session = await requireAdmin();
  if (!session) return fail('Hanya admin.', 403);

  const { code } = await params;
  const upperCode = code.toUpperCase();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail('Permintaan tidak valid.', 400);
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.errors[0]?.message ?? 'Input tidak valid.', 400);
  }

  try {
    const existing = await get<VoucherDoc>(`vouchers/${upperCode}`);
    if (!existing) return fail('Voucher tidak ditemukan.', 404);

    // Validasi maxUses tidak boleh kurang dari usedCount
    if (parsed.data.maxUses !== undefined && parsed.data.maxUses < existing.usedCount) {
      return fail(`Max uses tidak boleh kurang dari usedCount (${existing.usedCount}).`, 400);
    }

    const updates: Record<string, unknown> = { ...parsed.data, updatedAt: Date.now() };
    if (updates.expiresAt === null) delete updates.expiresAt;

    for (const [field, value] of Object.entries(updates)) {
      await set(`vouchers/${upperCode}/${field}`, value as any);
    }

    await writeLog({ actor: session.username, action: 'voucher.update', detail: `${upperCode} · ${Object.keys(parsed.data).join(', ')}` });
    return Response.json({ ok: true });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Gagal mengubah voucher.', 500);
  }
}

/** DELETE: hapus voucher */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
): Promise<Response> {
  const session = await requireAdmin();
  if (!session) return fail('Hanya admin.', 403);

  const { code } = await params;
  const upperCode = code.toUpperCase();

  try {
    const existing = await get<VoucherDoc>(`vouchers/${upperCode}`);
    if (!existing) return fail('Voucher tidak ditemukan.', 404);

    await remove(`vouchers/${upperCode}`);
    await writeLog({ actor: session.username, action: 'voucher.delete', detail: upperCode });
    return Response.json({ ok: true });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Gagal menghapus voucher.', 500);
  }
}