'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Copy, ExternalLink, RefreshCw, Server } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type Order = {
  id: string;
  productName?: string;
  status?: string;
  kind?: string;
  createdAt?: number;
  panelUrl?: string | null;
  panelUsername?: string | null;
  panelPassword?: string | null;
  panelServerId?: number | null;
};

function CopyBtn({ value, label }: { value: string; label: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => {
        void navigator.clipboard.writeText(value).then(() => toast.success(`${label} disalin.`));
      }}
    >
      <Copy aria-hidden size={13} />
      {label}
    </Button>
  );
}

export default function MyPanelsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  const load = useCallback(async () => {
    setState('loading');
    try {
      const res = await fetch('/api/user/orders', { cache: 'no-store' });
      if (res.status === 401) {
        window.location.href = '/login?next=/dashboard/panels';
        return;
      }
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { orders?: Order[] };
      setOrders(
        (data.orders ?? []).filter(
          (o) => o.panelUrl && (o.status === 'active' || o.status === 'completed')
        )
      );
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
      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-36 w-full" />
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="mx-auto max-w-4xl">
        <EmptyState
          icon={RefreshCw}
          title="Gagal memuat panel"
          description="Periksa koneksi lalu coba lagi."
          action={
            <Button variant="outline" size="sm" onClick={() => void load()}>
              Coba lagi
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="label-mono">Kelola akses</p>
        <h1 className="text-2xl font-semibold text-content">Panel Saya</h1>
        <p className="text-sm text-content-muted">
          Semua server panel yang sudah aktif beserta kredensialnya.
        </p>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={Server}
          title="Belum ada panel aktif"
          description="Beli produk panel di katalog untuk mulai menggunakan server."
          action={
            <Link
              href="/katalog"
              className="inline-flex min-h-[40px] items-center rounded-full border border-line px-4 text-sm text-content transition-colors hover:bg-content/5"
            >
              Buka katalog
            </Link>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((order) => (
            <li key={order.id} className="glass flex flex-col gap-3 rounded-2xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent">
                    <Server aria-hidden size={16} />
                  </span>
                  <div className="flex flex-col">
                    <p className="text-sm font-medium text-content">{order.productName ?? order.id}</p>
                    <p className="font-mono text-[11px] text-content-faint">
                      {order.panelServerId ? `server #${order.panelServerId}` : order.id}
                    </p>
                  </div>
                </div>
                <Badge variant={order.status === 'completed' ? 'success' : 'default'}>
                  {order.status === 'completed' ? 'Selesai' : 'Aktif'}
                </Badge>
              </div>

              <div className="flex flex-col gap-2 rounded-xl border border-line p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={order.panelUrl ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
                  >
                    {order.panelUrl}
                    <ExternalLink aria-hidden size={13} />
                  </a>
                  <CopyBtn value={order.panelUrl ?? ''} label="Salin URL" />
                </div>
                {order.panelUsername ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="rounded-lg bg-content/5 px-2.5 py-1.5 font-mono text-sm text-content">
                      {order.panelUsername}
                    </code>
                    <CopyBtn value={order.panelUsername} label="Salin username" />
                  </div>
                ) : null}
                {order.panelPassword ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="rounded-lg bg-content/5 px-2.5 py-1.5 font-mono text-sm text-content">
                      {order.panelPassword}
                    </code>
                    <CopyBtn value={order.panelPassword} label="Salin password" />
                  </div>
                ) : (
                  <p className="text-xs text-content-faint">
                    Login memakai email akun situs Anda (password mengikuti panel).
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
