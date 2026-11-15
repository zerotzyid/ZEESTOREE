'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Copy, ExternalLink, RefreshCw, Server, Monitor, Cpu, HardDrive, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { FadeIn } from '@/components/anim';

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
  panelServerUuid?: string | null;
  expiresAt?: number | null;
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

function fmtDate(t: number | null | undefined): string {
  if (!t) return '—';
  return new Date(t).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
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
          Semua server panel yang sudah aktif. Klik card untuk kelola server.
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orders.map((order, index) => (
            <FadeIn key={order.id} delay={index * 0.05}>
              <Link
                href={`/dashboard/panels/${order.id}`}
                className="glass flex flex-col gap-3 rounded-2xl p-4 hover:border-accent/50 transition-all duration-200 group"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                      <Server aria-hidden size={18} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-content truncate">{order.productName ?? order.id}</p>
                      <p className="font-mono text-[11px] text-content-faint">
                        {order.panelServerId ? `Server #${order.panelServerId}` : order.id}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={order.status === 'completed' ? 'success' : 'default'} className="text-xs">
                      {order.status === 'completed' ? 'Selesai' : 'Aktif'}
                    </Badge>
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-content/5 text-content-muted group-hover:bg-accent/10 group-hover:text-accent transition-colors">
                      <ChevronRight aria-hidden size={16} />
                    </span>
                  </div>
                </div>

                {/* Quick Stats Preview */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-line/50">
                  <div className="text-center">
                    <Monitor aria-hidden size={14} className="mx-auto text-content-muted" />
                    <p className="font-mono text-xs text-content">—</p>
                    <p className="text-[10px] text-content-faint">Status</p>
                  </div>
                  <div className="text-center">
                    <Cpu aria-hidden size={14} className="mx-auto text-yellow-400" />
                    <p className="font-mono text-xs text-content">—</p>
                    <p className="text-[10px] text-content-faint">CPU</p>
                  </div>
                  <div className="text-center">
                    <HardDrive aria-hidden size={14} className="mx-auto text-blue-400" />
                    <p className="font-mono text-xs text-content">—</p>
                    <p className="text-[10px] text-content-faint">RAM</p>
                  </div>
                </div>

                {/* Footer Info */}
                <div className="flex flex-col gap-2 rounded-xl border border-line p-3 bg-content/3">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <a
                      href={order.panelUrl ?? '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-accent hover:underline truncate flex-1"
                    >
                      {order.panelUrl}
                      <ExternalLink aria-hidden size={12} />
                    </a>
                    <CopyBtn value={order.panelUrl ?? ''} label="Salin URL" />
                  </div>
                  {order.panelUsername && (
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="rounded-lg bg-content/5 px-2.5 py-1.5 font-mono text-sm text-content flex-1 truncate">
                        {order.panelUsername}
                      </code>
                      <CopyBtn value={order.panelUsername} label="Salin user" />
                    </div>
                  )}
                  {order.panelPassword && (
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="rounded-lg bg-content/5 px-2.5 py-1.5 font-mono text-sm text-content flex-1 truncate">
                        {order.panelPassword}
                      </code>
                      <CopyBtn value={order.panelPassword} label="Salin pass" />
                    </div>
                  )}
                  {!order.panelUsername && !order.panelPassword && (
                    <p className="text-xs text-content-faint">
                      Login memakai email akun situs Anda (password mengikuti panel).
                    </p>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-line/50">
                    <span className="text-xs text-content-faint">
                      {order.expiresAt ? `Aktif sampai ${fmtDate(order.expiresAt)}` : 'Tanpa masa aktif'}
                    </span>
                    <span className="text-xs font-medium text-accent">Kelola server →</span>
                  </div>
                </div>
              </Link>
            </FadeIn>
          ))}
        </div>
      )}
    </div>
  );
}