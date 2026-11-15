import { z } from 'zod';
import { get, set, update } from '@/lib/rtdb';
import { requireAdmin } from '@/lib/authz';
import { adjustSaldo } from '@/lib/balance';
import { writeLog } from '@/lib/log';
import { isOrderStatus, REFUNDABLE_STATUSES, type OrderDoc } from '@/lib/orders';

export const dynamic = 'force-dynamic';

const patchSchema = z.object({ status: z.string().min(1).max(20) });

/**
 * PATCH: ubah status order admin.
 * Saat beralih ke refunded/cancelled dari status yang masih "terpotong",
 * saldo harga order dikembalikan idempoten (penanda refundedAt + status lama).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const session = await requireAdmin();
  if (!session) {
    return Response.json({ error: 'Hanya admin.' }, { status: 403 });
  }

  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{1,60}$/.test(id)) {
    return Response.json({ error: 'Id order tidak valid.' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Permintaan tidak valid.' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Status tidak valid.' }, { status: 400 });
  }
  if (!isOrderStatus(parsed.data.status)) {
    return Response.json({ error: 'Status tidak dikenal.' }, { status: 400 });
  }
  const next = parsed.data.status;

  try {
    const order = await get<OrderDoc>(`orders/${id}`);
    if (!order) {
      return Response.json({ error: 'Order tidak ditemukan.' }, { status: 404 });
    }

    const wantsRefund = next === 'refunded' || next === 'cancelled';
    const canRefund =
      REFUNDABLE_STATUSES.includes(order.status) &&
      !order.refundedAt &&
      order.status !== next;

    let refunded = false;
    let refundError: string | null = null;

    if (wantsRefund && canRefund) {
      const userKey = order.userId.toLowerCase();
      const newSaldo = await adjustSaldo(userKey, order.price);
      if (newSaldo === null) {
        refundError = 'Gagal mengunci saldo pengguna — refund dibatalkan. Coba lagi.';
      } else {
        refunded = true;
        await set(`transactions/refund_${id}`, {
          userId: userKey,
          type: 'refund',
          amount: order.price,
          balanceAfter: newSaldo,
          note: `Refund order ${id} (${order.productName})`,
          orderId: id,
          createdAt: Date.now(),
        });
      }
    }

    if (wantsRefund && canRefund && !refunded) {
      return Response.json({ error: refundError ?? 'Refund gagal.' }, { status: 500 });
    }

    const patch: Record<string, unknown> = { status: next, updatedAt: Date.now() };
    if (refunded) {
      patch.refundedAt = Date.now();
    }
    if (next === 'completed') patch.completedAt = Date.now();
    if (next === 'paid') patch.paidAt = Date.now();
    if (next === 'pending' || next === 'active') patch.failReason = null;

    for (const [field, value] of Object.entries(patch)) {
      await set(`orders/${id}/${field}`, value as never);
    }

    await writeLog({
      actor: session.username,
      action: refunded ? 'order.refund' : 'order.status',
      detail: `${id} · ${order.status} → ${next}${refunded ? ` · Rp${order.price}` : ''}`,
    });
    return Response.json({ ok: true, refunded });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal mengubah status order.';
    return Response.json({ error: message }, { status: 500 });
  }
}
