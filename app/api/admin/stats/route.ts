import { get } from '@/lib/rtdb';
import { requireAdmin } from '@/lib/authz';
import type { OrderDoc } from '@/lib/orders';

export const dynamic = 'force-dynamic';

type UserRow = { createdAt?: number; role?: string };

function wibDate(ts: number): string {
  return new Date(ts + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

function wibMonth(ts: number): string {
  return new Date(ts + 7 * 3600 * 1000).toISOString().slice(0, 7);
}

const REVENUE_STATUSES = new Set(['paid', 'active', 'completed']);

/** GET: agregat statistik admin — omzet, order, pengguna baru, seri harian & bulanan. */
export async function GET(): Promise<Response> {
  const session = await requireAdmin();
  if (!session) {
    return Response.json({ error: 'Hanya admin.' }, { status: 403 });
  }

  try {
    const [usersMap, ordersMap] = await Promise.all([
      get<Record<string, UserRow>>('users'),
      get<Record<string, OrderDoc>>('orders'),
    ]);

    const now = Date.now();
    const dayMs = 24 * 3600 * 1000;
    const users = usersMap ? Object.values(usersMap) : [];
    const orders = ordersMap
      ? Object.entries(ordersMap)
          .filter(([, o]) => o && typeof o === 'object')
          .map(([id, o]) => ({ id, ...o }))
      : [];

    const usersTotal = users.length;
    const usersNew7 = users.filter((u) => (u.createdAt ?? 0) >= now - 7 * dayMs).length;
    const usersNew30 = users.filter((u) => (u.createdAt ?? 0) >= now - 30 * dayMs).length;

    const byStatus: Record<string, number> = {};
    let revenueTotal = 0;
    let revenue7 = 0;
    let revenue30 = 0;
    for (const o of orders) {
      byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
      if (REVENUE_STATUSES.has(o.status)) {
        const price = typeof o.price === 'number' ? o.price : 0;
        revenueTotal += price;
        if (o.createdAt >= now - 7 * dayMs) revenue7 += price;
        if (o.createdAt >= now - 30 * dayMs) revenue30 += price;
      }
    }

    // Seri harian 14 hari (WIB)
    const daily: Array<{ date: string; orders: number; revenue: number; users: number }> = [];
    for (let i = 13; i >= 0; i--) {
      daily.push({ date: wibDate(now - i * dayMs), orders: 0, revenue: 0, users: 0 });
    }
    const dailyMap = new Map(daily.map((d) => [d.date, d]));
    for (const o of orders) {
      const key = dailyMap.get(wibDate(o.createdAt));
      if (key) {
        key.orders += 1;
        if (REVENUE_STATUSES.has(o.status)) key.revenue += typeof o.price === 'number' ? o.price : 0;
      }
    }
    for (const u of users) {
      const key = dailyMap.get(wibDate(u.createdAt ?? 0));
      if (key) key.users += 1;
    }

    // Seri bulanan 6 bulan (WIB)
    const monthlyMap = new Map<string, { month: string; orders: number; revenue: number; users: number }>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now + 7 * 3600 * 1000);
      d.setUTCMonth(d.getUTCMonth() - i, 1);
      const month = d.toISOString().slice(0, 7);
      monthlyMap.set(month, { month, orders: 0, revenue: 0, users: 0 });
    }
    for (const o of orders) {
      const row = monthlyMap.get(wibMonth(o.createdAt));
      if (row) {
        row.orders += 1;
        if (REVENUE_STATUSES.has(o.status)) row.revenue += typeof o.price === 'number' ? o.price : 0;
      }
    }
    for (const u of users) {
      const row = monthlyMap.get(wibMonth(u.createdAt ?? 0));
      if (row) row.users += 1;
    }

    return Response.json(
      {
        users: { total: usersTotal, new7d: usersNew7, new30d: usersNew30 },
        orders: { total: orders.length, byStatus },
        revenue: { total: revenueTotal, d7: revenue7, d30: revenue30 },
        daily,
        monthly: [...monthlyMap.values()],
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memuat statistik.';
    return Response.json({ error: message }, { status: 500 });
  }
}
