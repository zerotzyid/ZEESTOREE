import { get } from '@/lib/rtdb';
import { requireAdmin } from '@/lib/authz';
import type { OrderDoc } from '@/lib/orders';

export const dynamic = 'force-dynamic';

/** GET: seluruh order (lintas pengguna) untuk tabel admin. */
export async function GET(): Promise<Response> {
  const session = await requireAdmin();
  if (!session) {
    return Response.json({ error: 'Hanya admin.' }, { status: 403 });
  }

  try {
    const orders = await get<Record<string, OrderDoc>>('orders');
    const list = orders
      ? Object.entries(orders)
          .filter(([, doc]) => doc && typeof doc === 'object')
          .map(([id, doc]) => ({ id, ...doc }))
          .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
      : [];
    return Response.json({ orders: list }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memuat order.';
    return Response.json({ error: message }, { status: 500 });
  }
}
