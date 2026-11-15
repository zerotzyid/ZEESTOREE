'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Copy, ExternalLink, ReceiptText, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useSettings } from '@/components/settings-provider';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDateTimeWIB, formatRupiah } from '@/lib/format';

type ExternalDoc = {
  provider?: string;
  orderId?: string;
  qrString?: string | null;
  qrImageUrl?: string | null;
  invoiceUrl?: string | null;
  phone?: string | null;
  otp?: string | null;
  expiredAt?: number | null;
  resendWaiting?: boolean;
};

type Order = {
  id: string;
  productName?: string;
  name?: string;
  amount?: number;
  price?: number;
  status?: string;
  createdAt?: number;
  failReason?: string | null;
  panelUrl?: string | null;
  panelUsername?: string | null;
  panelPassword?: string | null;
  panelServerId?: number | null;
  external?: ExternalDoc | null;
};

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'neutral' | 'default'> = {
  completed: 'success',
  active: 'default',
  paid: 'warning',
  pending: 'warning',
  processing: 'warning',
  failed: 'danger',
  cancelled: 'danger',
  refunded: 'neutral',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Menunggu',
  paid: 'Dibayar',
  active: 'Aktif',
  completed: 'Selesai',
  failed: 'Gagal',
  refunded: 'Dikembalikan',
  cancelled: 'Dibatalkan',
};

export default function OrdersPage() {
  const { settings } = useSettings();
  const [orders, setOrders] = useState<Order[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    setState('loading');
    try {
      const res = await fetch('/api/user/orders', { cache: 'no-store' });
      if (res.status === 401) {
        window.location.href = '/login?next=/dashboard/orders';
        return;
      }
      if (!res.ok) throw new Error('Gagal memuat pesanan.');
      const data = (await res.json()) as { orders?: Order[] };
      setOrders(data.orders ?? []);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Sinkronkan pesanan eksternal (QRIS reseller / NOKOS) ke penyedia.
  const ordersRef = useRef<Order[]>(orders);
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  useEffect(() => {
    if (state !== 'ready') return;
    let alive = true;
    const pendingExternal = () =>
      ordersRef.current.filter(
        (o) => o.external?.provider && (o.status === 'pending' || o.status === 'active')
      );
    const syncOne = async (id: string) => {
      try {
        const res = await fetch(`/api/user/orders/${id}/sync`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as { order?: Order };
        if (alive && data.order) {
          const updated = data.order;
          setOrders((prev) => prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)));
        }
      } catch {
        /* biarkan percobaan berikutnya */
      }
    };
    const tick = () => {
      for (const order of pendingExternal()) void syncOne(order.id);
    };
    tick();
    const timer = setInterval(tick, 15_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [state]);

  const statuses = useMemo(() => {
    const set = new Set<string>();
    for (const order of orders) {
      if (order.status) set.add(order.status);
    }
    return [...set].sort();
  }, [orders]);

  const filtered = useMemo(
    () => (filter === 'all' ? orders : orders.filter((o) => o.status === filter)),
    [orders, filter]
  );

  const emptyMessage = settings?.systemTexts.messages.emptyOrders ?? 'Belum ada pesanan.';

  if (state === 'loading') {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="mx-auto max-w-4xl">
        <EmptyState
          icon={RefreshCw}
          title="Gagal memuat pesanan"
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
        <p className="label-mono">{settings?.systemTexts.menu.dashboard ?? 'Dashboard'}</p>
        <h1 className="text-2xl font-semibold text-content">
          {settings?.systemTexts.menu.orders ?? 'Riwayat pesanan'}
        </h1>
      </div>

      {orders.length > 0 && statuses.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="order-filter" className="sr-only">
            Filter status
          </label>
          <select
            id="order-filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="min-h-[44px] rounded-xl border border-line bg-transparent px-4 text-sm text-content"
          >
            <option value="all">Semua status</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title={orders.length === 0 ? emptyMessage : 'Tidak ada pesanan dengan filter ini'}
          description={
            orders.length === 0
              ? 'Pesanan Anda akan tampil di sini.'
              : 'Ubah filter untuk melihat pesanan lain.'
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((order) => (
            <li key={order.id} className="glass flex flex-col gap-3 rounded-2xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-content">
                    {order.productName || order.name || order.id}
                  </p>
                  <p className="font-mono text-xs text-content-faint">
                    {order.createdAt ? formatDateTimeWIB(order.createdAt) : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {typeof order.amount === 'number' || typeof order.price === 'number' ? (
                    <span className="text-sm font-semibold text-content">
                      {formatRupiah(order.amount ?? order.price ?? 0)}
                    </span>
                  ) : null}
                  {order.status ? (
                    <Badge variant={STATUS_VARIANT[order.status] ?? 'neutral'}>
                      {STATUS_LABEL[order.status] ?? order.status}
                    </Badge>
                  ) : null}
                </div>
              </div>

              {order.status === 'failed' && order.failReason ? (
                <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                  {order.failReason}
                </p>
              ) : null}

              {order.external?.provider === 'fallzx' && order.status === 'pending' ? (
                <div className="flex flex-col gap-3 rounded-xl border border-line p-3">
                  <p className="label-mono">Bayar QRIS (bukan saldo)</p>
                  <div className="flex flex-wrap items-start gap-4">
                    {order.external.qrImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={order.external.qrImageUrl}
                        alt="QRIS pembayaran"
                        className="h-36 w-36 rounded-xl border border-line bg-white object-contain p-1"
                      />
                    ) : null}
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      {order.external.invoiceUrl ? (
                        <a
                          href={order.external.invoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex w-fit items-center gap-1.5 text-sm text-accent hover:underline"
                        >
                          Buka halaman invoice
                          <ExternalLink aria-hidden size={13} />
                        </a>
                      ) : null}
                      {order.external.qrString ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-fit"
                          onClick={() => {
                            void navigator.clipboard
                              .writeText(order.external?.qrString ?? '')
                              .then(() => toast.success('String QRIS disalin.'));
                          }}
                        >
                          <Copy aria-hidden size={13} />
                          Salin string QRIS
                        </Button>
                      ) : null}
                      <p className="text-xs text-content-faint">
                        Pesanan menyinkronkan status otomatis tiap 15 detik selama halaman terbuka.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {order.external?.provider === 'axmisu' ? (
                <div className="flex flex-col gap-2 rounded-xl border border-line p-3">
                  <p className="label-mono">Nomor virtual</p>
                  {order.external.phone ? (
                    <p className="font-mono text-sm text-content">{order.external.phone}</p>
                  ) : null}
                  {order.external.otp ? (
                    <div className="flex items-center gap-3">
                      <code className="rounded-lg bg-content/5 px-3 py-1.5 font-mono text-lg font-semibold tracking-[0.2em] text-content">
                        {order.external.otp}
                      </code>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          void navigator.clipboard
                            .writeText(order.external?.otp ?? '')
                            .then(() => toast.success('OTP disalin.'));
                        }}
                      >
                        <Copy aria-hidden size={13} />
                        Salin OTP
                      </Button>
                    </div>
                  ) : order.status === 'active' ? (
                    <p className="text-xs text-content-muted">
                      Menunggu SMS masuk… halaman ini menyinkronkan OTP otomatis tiap 15 detik.
                    </p>
                  ) : null}
                  {order.external.expiredAt ? (
                    <p className="font-mono text-[11px] text-content-faint">
                      Berlaku s/d {formatDateTimeWIB(order.external.expiredAt)}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {order.panelUrl && (order.status === 'active' || order.status === 'completed') ? (
                <div className="flex flex-col gap-2 rounded-xl border border-line p-3">
                  <p className="label-mono">Akses panel</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={order.panelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
                    >
                      {order.panelUrl}
                      <ExternalLink aria-hidden size={13} />
                    </a>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        void navigator.clipboard
                          .writeText(order.panelUrl ?? '')
                          .then(() => toast.success('URL panel disalin.'));
                      }}
                    >
                      <Copy aria-hidden size={13} />
                      Salin URL
                    </Button>
                  </div>
                  {order.panelPassword ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="rounded-lg bg-content/5 px-2.5 py-1.5 font-mono text-sm text-content">
                        {order.panelPassword}
                      </code>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          void navigator.clipboard
                            .writeText(order.panelPassword ?? '')
                            .then(() => toast.success('Password panel disalin.'));
                        }}
                      >
                        <Copy aria-hidden size={13} />
                        Salin password
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-content-faint">
                      Masuk ke panel memakai email akun Anda (password mengikuti panel).
                    </p>
                  )}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
