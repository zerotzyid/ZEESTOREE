'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Boxes, History, QrCode, RefreshCw, Server, Settings, ShoppingBag } from 'lucide-react';
import { useSettings } from '@/components/settings-provider';
import { FadeIn } from '@/components/anim';
import { StatusBoard } from '@/components/status-board';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTimeWIB } from '@/lib/format';

type Stats = { activePanels: number; completedOrders: number; activeProducts: number };
type LogItem = {
  id: string;
  actor: string;
  action: string;
  detail: string | null;
  at: number;
};

export function AdminOverview() {
  const { settings } = useSettings();
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  const load = useCallback(async () => {
    setState('loading');
    try {
      const [statsRes, logsRes] = await Promise.all([
        fetch('/api/public/stats', { cache: 'no-store' }),
        fetch('/api/admin/logs?limit=8', { cache: 'no-store' }),
      ]);
      if (!statsRes.ok) throw new Error('Gagal memuat statistik.');
      setStats((await statsRes.json()) as Stats);
      if (logsRes.ok) {
        const data = (await logsRes.json()) as { logs?: LogItem[] };
        setLogs(data.logs ?? []);
      }
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (state === 'error') {
    return (
      <EmptyState
        icon={RefreshCw}
        title="Gagal memuat ringkasan"
        description="Periksa koneksi lalu coba lagi."
        action={
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-line px-4 text-sm text-content transition-colors hover:bg-content/5"
          >
            Coba lagi
          </button>
        }
      />
    );
  }

  const statCards = [
    { label: 'Produk aktif', value: stats?.activeProducts ?? 0, icon: Boxes },
    { label: 'Order selesai', value: stats?.completedOrders ?? 0, icon: ShoppingBag },
    { label: 'Panel aktif', value: stats?.activePanels ?? 0, icon: Server },
  ];

  const actions = [
    {
      href: '/admin/settings',
      icon: Settings,
      title: 'Pengaturan Situs',
      description: 'Identitas, tampilan, kontak, FAQ, dan mode pemeliharaan.',
    },
    {
      href: '/admin/pixpayz',
      icon: QrCode,
      title: 'Pembayaran',
      description: 'API key Pixpayz, batas deposit, dan URL webhook.',
    },
  ] as const;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {statCards.map((card, index) => (
          <FadeIn key={card.label} delay={index * 0.06}>
            <div className="glass flex h-full flex-col gap-2 rounded-2xl p-5">
              <span className="inline-flex items-center gap-2 text-xs text-content-faint">
                <card.icon aria-hidden size={15} className="text-accent" />
                {card.label}
              </span>
              <span className="text-3xl font-semibold text-content">{card.value}</span>
            </div>
          </FadeIn>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {actions.map((action, index) => (
          <FadeIn key={action.href} delay={0.1 + index * 0.06}>
            <Link
              href={action.href}
              className="glass group flex h-full flex-col gap-2 rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent transition-colors group-hover:bg-accent group-hover:text-white">
                <action.icon aria-hidden size={18} />
              </span>
              <span className="text-sm font-semibold text-content">{action.title}</span>
              <span className="text-sm text-content-muted">{action.description}</span>
            </Link>
          </FadeIn>
        ))}
      </div>

      <FadeIn delay={0.18}>
        <StatusBoard />
      </FadeIn>

      <FadeIn delay={0.2}>
        <div className="glass rounded-2xl p-5">
          <div className="mb-3 flex items-center gap-2">
            <History aria-hidden size={16} className="text-accent" />
            <h2 className="text-sm font-semibold text-content">Aktivitas terbaru</h2>
          </div>
          {logs.length === 0 ? (
            <p className="text-sm text-content-muted">Belum ada aktivitas tercatat.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line/50">
              {logs.map((log) => (
                <li key={log.id} className="flex items-baseline gap-3 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-content">
                      <span className="font-medium">{log.actor}</span>
                      <span className="text-content-muted"> · </span>
                      {log.action}
                    </span>
                    {log.detail ? (
                      <span className="block truncate font-mono text-[11px] text-content-faint">
                        {log.detail}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] text-content-faint">
                    {log.at ? formatDateTimeWIB(log.at) : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </FadeIn>
    </div>
  );
}
