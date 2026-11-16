import { get } from '@/lib/rtdb';
import { requireUser } from '@/lib/authz';

export const dynamic = 'force-dynamic';

type OrderDoc = Record<string, unknown>;

export async function GET(): Promise<Response> {
  const session = await requireUser();
  if (!session) {
    return Response.json({ error: 'Silakan masuk terlebih dahulu.' }, { status: 401 });
  }

  try {
    const orders = await get<Record<string, OrderDoc>>('orders');
    const list: Array<{ id: string } & OrderDoc> = Object.entries(orders ?? {})
      .filter(([, doc]) => doc && doc.userId === session.username)
      .map(([id, doc]): { id: string } & OrderDoc => ({ ...doc, id }))
      .sort((a, b) => Number(b.createdAt ?? 0) - Number(a.createdAt ?? 0));

    return Response.json({ orders: list }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memuat pesanan.';
    return Response.json({ error: message }, { status: 500 });
  }
}
