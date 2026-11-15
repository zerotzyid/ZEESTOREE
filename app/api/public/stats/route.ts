import { get } from '@/lib/rtdb';

export const dynamic = 'force-dynamic';

type Doc = Record<string, unknown>;

/** Statistik nyata untuk visual hero. Hanya angka dari RTDB; tidak ada data karangan. */
export async function GET(): Promise<Response> {
  try {
    const [panels, orders, products] = await Promise.all([
      get<Record<string, Doc>>('panels'),
      get<Record<string, Doc>>('orders'),
      get<Record<string, Doc>>('products'),
    ]);

    const activePanels = panels
      ? Object.values(panels).filter((p) => p && p.active === true).length
      : 0;
    const completedOrders = orders
      ? Object.values(orders).filter((o) => o && o.status === 'completed').length
      : 0;
    const activeProducts = products
      ? Object.values(products).filter((p) => p && p.active !== false).length
      : 0;

    return Response.json(
      { activePanels, completedOrders, activeProducts },
      { headers: { 'Cache-Control': 'public, max-age=15' } }
    );
  } catch {
    return Response.json(
      { activePanels: 0, completedOrders: 0, activeProducts: 0 },
      { headers: { 'Cache-Control': 'public, max-age=15' } }
    );
  }
}
