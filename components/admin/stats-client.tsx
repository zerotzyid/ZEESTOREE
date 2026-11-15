'use client';

import { useCallback, useEffect, useState } from 'react';
import { BarChart3, Coins, ShoppingBag, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { FadeIn } from '@/components/anim';
import { cn } from '@/lib/cn';
import { formatNumber, formatRupiah } from '@/lib/format';

type Stats = {
  users: { total: number; new7d: number; new30d: number };
  orders: { total: number; byStatus: Record<string, number> };
  revenue: { total: number; d7: number; d30: number };
  daily: Array<{ date: string; orders: number; revenue: number; users: number }>;
  monthly: Array<{ month: string; orders: number; revenue: number; users: number }>;
};

type Range = 'har' | 'bulan';

export function StatsClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [range, setRange] = useState<Range>('har');
  const [metric, setMetric] = useState<'revenue' | 'orders'>('revenue');

  const load = useCallback(async () => {
    setState('loading');
    try {
      const res = await fetch('/api/admin/stats', { cache: 'no-store' });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? 'Gagal memuat statistik.');
      }
      setStats((await res.json()) as Stats);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (state === 'loading') {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (state === 'error' || !stats) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Gagal memuat statistik"
        description="Periksa koneksi lalu coba lagi."
        action={
          <Button variant="outline" onClick={() => void load()}>
            Coba lagi
          </Button>
        }
      />
    );
  }

  const cards = [
    { label: 'Omzet total', value: formatRupiah(stats.revenue.total), sub: `7 hari: ${formatRupiah(stats.revenue.d7)}`, icon: Coins },
    { label: 'Order', value: formatNumber(stats.orders.total), sub: `Selesai: ${stats.orders.byStatus.completed ?? 0}`, icon: ShoppingBag },
    { label: 'Pengguna', value: formatNumber(stats.users.total), sub: `30 hari baru: ${stats.users.new30d}`, icon: Users },
    { label: 'Pengguna baru 7 hari', value: formatNumber(stats.users.new7d), sub: `Omzet 30 hari: ${formatRupiah(stats.revenue.d30)}`, icon: BarChart3 },
  ];

  type ChartPoint = { key: string; orders: number; revenue: number };
  const points: ChartPoint[] =
    range === 'har'
      ? stats.daily.map((d) => ({ key: d.date, orders: d.orders, revenue: d.revenue }))
      : stats.monthly.map((m) => ({ key: m.month, orders: m.orders, revenue: m.revenue }));
  const values = points.map((point) => (metric === 'revenue' ? point.revenue : point.orders));
  const maxValue = Math.max(1, ...values);
  const labels = points.map((point) => point.key.slice(5));
  const labelEvery = range === 'har' ? 2 : 1;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, index) => (
          <FadeIn key={card.label} delay={index * 0.05}>
            <div className="glass flex h-full flex-col gap-2 rounded-2xl p-5">
              <span className="inline-flex items-center gap-2 text-xs text-content-faint">
                <card.icon aria-hidden size={15} className="text-accent" />
                {card.label}
              </span>
              <span className="break-words text-xl font-semibold text-content sm:text-2xl">
                {card.value}
              </span>
              <span className="text-xs text-content-faint">{card.sub}</span>
            </div>
          </FadeIn>
        ))}
      </div>

      <FadeIn delay={0.15}>
        <div className="glass rounded-2xl p-5">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-content">
                {metric === 'revenue' ? 'Omzet' : 'Jumlah order'} · {range === 'har' ? '14 hari terakhir' : '6 bulan terakhir'}
              </h2>
              <p className="text-xs text-content-faint">Nilai mengikuti status order yang masih menghasilkan omzet.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex rounded-full border border-line p-0.5">
                {(['revenue', 'orders'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMetric(m)}
                    className={cn(
                      'min-h-[32px] rounded-full px-3 text-xs transition-colors',
                      metric === m ? 'bg-accent-soft font-medium text-accent' : 'text-content-muted'
                    )}
                  >
                    {m === 'revenue' ? 'Omzet' : 'Order'}
                  </button>
                ))}
              </div>
              <div className="flex rounded-full border border-line p-0.5">
                {(['har', 'bulan'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRange(r)}
                    className={cn(
                      'min-h-[32px] rounded-full px-3 text-xs transition-colors',
                      range === r ? 'bg-accent-soft font-medium text-accent' : 'text-content-muted'
                    )}
                  >
                    {r === 'har' ? 'Harian' : 'Bulanan'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Grafik batang SVG sederhana */}
          <div className="flex h-56 items-end gap-1.5 sm:gap-2" role="img" aria-label="Grafik batang">
            {points.map((point, index) => {
              const value = values[index];
              const height = Math.max(value > 0 ? 3 : 1, Math.round((value / maxValue) * 100));
              const display = metric === 'revenue' ? formatRupiah(value) : `${value} order`;
              return (
                <div key={point.key} className="group flex h-full min-w-0 flex-1 flex-col justify-end gap-1">
                  <span className="pointer-events-none invisible truncate text-center text-[9px] text-content-muted group-hover:visible">
                    {display}
                  </span>
                  <div
                    className={cn(
                      'w-full rounded-t-md transition-colors',
                      value > 0 ? 'bg-accent/70 group-hover:bg-accent' : 'bg-content/10'
                    )}
                    style={{ height: `${height}%` }}
                    title={`${labels[index]} · ${display}`}
                  />
                  <span className="truncate text-center font-mono text-[9px] text-content-faint">
                    {index % labelEvery === 0 ? labels[index] : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.2}>
        <div className="glass rounded-2xl p-5">
          <h2 className="mb-3 text-sm font-semibold text-content">Rincian status order</h2>
          {Object.keys(stats.orders.byStatus).length === 0 ? (
            <p className="text-sm text-content-muted">Belum ada order.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.orders.byStatus).map(([status, count]) => (
                <span
                  key={status}
                  className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs text-content-muted"
                >
                  <span className="font-mono uppercase text-content">{status}</span>
                  <span className="text-content-faint">{count}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </FadeIn>
    </div>
  );
}
