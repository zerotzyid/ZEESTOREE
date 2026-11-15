'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  ReceiptText,
  RotateCcw,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { FadeIn } from '@/components/anim';
import { cn } from '@/lib/cn';
import { formatDateTimeWIB, formatRupiah } from '@/lib/format';
import type { OrderStatus } from '@/lib/orders';

const PAGE_SIZE = 10;

type AdminOrder = {
  id: string;
  userId: string;
  productId: string;
  productName: string;
  price: number;
  kind: string;
  status: OrderStatus;
  createdAt: number;
  failReason?: string | null;
  panelServerId?: number | null;
  refundedAt?: number | null;
};

type AdminUser = { key: string; username: string; email: string };

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'neutral' | 'default'> = {
  completed: 'success',
  active: 'default',
  paid: 'warning',
  pending: 'warning',
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

const ALL_STATUSES: OrderStatus[] = [
  'pending',
  'paid',
  'active',
  'completed',
  'failed',
  'refunded',
  'cancelled',
];

const REFUNDABLE: OrderStatus[] = ['pending', 'paid', 'active', 'completed'];

async function readError(res: Response): Promise<string> {
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  return data?.error ?? `Permintaan gagal (${res.status}).`;
}

export function OrdersClient() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [oRes, uRes] = await Promise.all([
        fetch('/api/admin/orders', { cache: 'no-store' }),
        fetch('/api/admin/users', { cache: 'no-store' }),
      ]);
      if (!oRes.ok) throw new Error(await readError(oRes));
      const oData = (await oRes.json()) as { orders?: AdminOrder[] };
      setOrders(oData.orders ?? []);
      if (uRes.ok) {
        const uData = (await uRes.json()) as { users?: AdminUser[] };
        setUsers(uData.users ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat order.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const userLabel = useCallback(
    (key: string) => {
      const u = users.find((x) => x.key === key || x.username.toLowerCase() === key);
      return u ? u.username : key;
    },
    [users]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (!q) return true;
      return (
        o.productName.toLowerCase().includes(q) ||
        o.userId.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q)
      );
    });
  }, [orders, search, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const changeStatus = async (order: AdminOrder, status: OrderStatus) => {
    if (status === order.status) return;
    const isRefund = status === 'refunded' || status === 'cancelled';
    if (
      isRefund &&
      !window.confirm(
        `Refund order "${order.productName}" senilai ${formatRupiah(order.price)} ke saldo ${userLabel(order.userId)}?`
      )
    ) {
      return;
    }
    setBusyId(order.id);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        refunded?: boolean;
      } | null;
      if (!res.ok) throw new Error(data?.error ?? await readError(res));
      toast.success(
        data?.refunded ? 'Status diubah dan saldo dikembalikan.' : 'Status order diperbarui.'
      );
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengubah status.');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex gap-3">
          <Skeleton className="h-11 flex-1" />
          <Skeleton className="h-11 w-40" />
        </div>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={ReceiptText}
        title="Gagal memuat order"
        description={error}
        action={
          <Button variant="outline" onClick={() => void load()}>
            Coba lagi
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            aria-hidden
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-content-faint"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari produk, pengguna, atau id order…"
            className="pl-10"
            aria-label="Cari order"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter status"
          className="min-h-[44px] rounded-xl border border-line bg-transparent px-4 text-sm text-content focus:border-accent focus:outline-none"
        >
          <option value="all" className="bg-surface-raised">
            Semua status
          </option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s} className="bg-surface-raised">
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title={orders.length === 0 ? 'Belum ada order' : 'Tidak ada yang cocok'}
          description={
            orders.length === 0
              ? 'Order dari checkout pelanggan akan tampil di sini.'
              : 'Ubah kata kunci atau filter status.'
          }
        />
      ) : (
        <>
          {/* Tabel desktop */}
          <div className="glass hidden overflow-hidden rounded-2xl md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line/60 text-left text-xs uppercase tracking-wider text-content-faint">
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Pengguna</th>
                  <th className="px-4 py-3 font-medium">Harga</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Ubah status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/50">
                {paged.map((order) => (
                  <tr key={order.id} className="align-top transition-colors hover:bg-content/[0.03]">
                    <td className="px-4 py-3">
                      <p className="font-medium text-content">{order.productName}</p>
                      <p className="font-mono text-[11px] text-content-faint">
                        {order.id} · {order.kind}
                      </p>
                      <p className="text-[11px] text-content-faint">
                        {formatDateTimeWIB(order.createdAt)}
                      </p>
                      {order.failReason ? (
                        <p className="mt-1 max-w-[280px] text-[11px] text-red-400">
                          {order.failReason}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-content-muted">
                      {userLabel(order.userId)}
                      {order.panelServerId ? (
                        <p className="font-mono text-[11px] text-content-faint">
                          srv#{order.panelServerId}
                        </p>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-content">
                      {formatRupiah(order.price)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[order.status] ?? 'neutral'}>
                        {STATUS_LABEL[order.status] ?? order.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <select
                          value={order.status}
                          onChange={(e) => void changeStatus(order, e.target.value as OrderStatus)}
                          disabled={busyId === order.id}
                          aria-label={`Ubah status ${order.id}`}
                          className="min-h-[36px] rounded-lg border border-line bg-transparent px-2 text-xs text-content focus:border-accent focus:outline-none disabled:opacity-50"
                        >
                          {ALL_STATUSES.map((s) => (
                            <option key={s} value={s} className="bg-surface-raised">
                              {STATUS_LABEL[s]}
                            </option>
                          ))}
                        </select>
                        {busyId === order.id ? (
                          <Loader2 aria-hidden size={15} className="animate-spin text-accent" />
                        ) : REFUNDABLE.includes(order.status) && !order.refundedAt ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void changeStatus(order, 'refunded')}
                          >
                            <RotateCcw aria-hidden size={13} />
                            Refund
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Kartu mobile */}
          <div className="flex flex-col gap-3 md:hidden">
            {paged.map((order) => (
              <FadeIn key={order.id} y={8}>
                <div className="glass flex flex-col gap-3 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-content">{order.productName}</p>
                      <p className="text-xs text-content-faint">
                        {userLabel(order.userId)} · {formatRupiah(order.price)}
                      </p>
                      <p className="font-mono text-[11px] text-content-faint">
                        {formatDateTimeWIB(order.createdAt)}
                      </p>
                    </div>
                    <Badge variant={STATUS_VARIANT[order.status] ?? 'neutral'}>
                      {STATUS_LABEL[order.status] ?? order.status}
                    </Badge>
                  </div>
                  {order.failReason ? (
                    <p className="text-xs text-red-400">{order.failReason}</p>
                  ) : null}
                  <div className="flex flex-wrap justify-end gap-2 border-t border-line/50 pt-2">
                    <select
                      value={order.status}
                      onChange={(e) => void changeStatus(order, e.target.value as OrderStatus)}
                      disabled={busyId === order.id}
                      aria-label={`Ubah status ${order.id}`}
                      className="min-h-[36px] rounded-lg border border-line bg-transparent px-2 text-xs text-content focus:border-accent focus:outline-none disabled:opacity-50"
                    >
                      {ALL_STATUSES.map((s) => (
                        <option key={s} value={s} className="bg-surface-raised">
                          {STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>
                    {REFUNDABLE.includes(order.status) && !order.refundedAt ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void changeStatus(order, 'refunded')}
                      >
                        <RotateCcw aria-hidden size={13} />
                        Refund
                      </Button>
                    ) : null}
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>

          {filtered.length > PAGE_SIZE ? (
            <div className="flex items-center justify-between">
              <p className="text-xs text-content-faint">
                {filtered.length} order · halaman {safePage} dari {pageCount}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft aria-hidden size={14} />
                  Sebelumnya
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={safePage >= pageCount}
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                >
                  Berikutnya
                  <ChevronRight aria-hidden size={14} />
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
