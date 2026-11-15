'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Layers,
  RefreshCw,
  Wallet,
} from 'lucide-react';
import { useSettings } from '@/components/settings-provider';
import { FadeIn } from '@/components/anim';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTimeWIB, formatRupiah } from '@/lib/format';

type Profile = { username: string; email: string; saldo: number };
type Order = { id: string; status?: string; productName?: string; createdAt?: number };
type Transaction = {
  id: string;
  type?: string;
  amount?: number;
  note?: string;
  createdAt?: number;
};

const ACTIVE_STATUSES = new Set(['pending', 'paid', 'processing', 'active']);

export default function DashboardPage() {
  const { settings } = useSettings();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeOrders, setActiveOrders] = useState(0);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  const load = useCallback(async () => {
    setState('loading');
    try {
      const [profileRes, txRes, ordersRes] = await Promise.all([
        fetch('/api/user/profile', { cache: 'no-store' }),
        fetch('/api/user/transactions', { cache: 'no-store' }),
        fetch('/api/user/orders', { cache: 'no-store' }),
      ]);
      if (profileRes.status === 401) {
        window.location.href = '/login?next=/dashboard';
        return;
      }
      if (!profileRes.ok) throw new Error('Gagal memuat data.');
      const profileData = (await profileRes.json()) as Profile;
      const txData = txRes.ok
        ? ((await txRes.json()) as { transactions?: Transaction[] })
        : { transactions: [] };
      const ordersData = ordersRes.ok
        ? ((await ordersRes.json()) as { orders?: Order[] })
        : { orders: [] };
      setProfile(profileData);
      setTransactions(txData.transactions ?? []);
      setActiveOrders(
        (ordersData.orders ?? []).filter((order) =>
          order.status ? ACTIVE_STATUSES.has(order.status) : false
        ).length
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
        <Skeleton className="h-40 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="mx-auto max-w-4xl">
        <EmptyState
          icon={RefreshCw}
          title="Gagal memuat data dashboard"
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

  const recentTx = transactions.slice(0, 5);
  const emptyTxMessage = settings?.systemTexts.messages.emptyTransactions ?? 'Belum ada transaksi.';
  const menu = settings?.systemTexts.menu;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <FadeIn y={8}>
        <div className="flex flex-col gap-1">
          <p className="label-mono">{menu?.dashboard ?? 'Dashboard'}</p>
          <h1 className="text-2xl font-semibold text-content">Halo, {profile?.username}</h1>
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Kartu saldo utama */}
        <FadeIn delay={0.05} className="lg:col-span-2">
          <Card className="glass-strong relative overflow-hidden">
            <CardContent className="flex flex-col gap-4 p-6">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-sm text-content-muted">
                  <Wallet aria-hidden size={16} className="text-accent" />
                  Saldo Anda
                </span>
                <span className="rounded-full bg-accent-soft px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-accent">
                  Aktif
                </span>
              </div>
              <p className="text-3xl font-semibold tracking-tight text-content sm:text-4xl">
                {profile ? formatRupiah(profile.saldo) : '—'}
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/dashboard/deposit"
                  className="btn-accent inline-flex min-h-[44px] items-center gap-2 rounded-full px-5 text-sm font-medium"
                >
                  <ArrowDownLeft aria-hidden size={16} />
                  Deposit saldo
                </Link>
                <Link
                  href="/dashboard/transactions"
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-line px-5 text-sm font-medium text-content transition-colors hover:bg-content/5"
                >
                  Lihat transaksi
                  <ArrowUpRight aria-hidden size={15} />
                </Link>
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        {/* Ringkasan pesanan */}
        <FadeIn delay={0.1}>
          <Card className="h-full">
            <CardContent className="flex h-full flex-col justify-between gap-3 p-6">
              <span className="inline-flex items-center gap-2 text-sm text-content-muted">
                <Layers aria-hidden size={16} className="text-accent" />
                Pesanan aktif
              </span>
              <p className="text-3xl font-semibold text-content">{activeOrders}</p>
              <Link
                href="/dashboard/orders"
                className="inline-flex min-h-[40px] items-center gap-1.5 text-sm text-accent hover:underline"
              >
                {menu?.orders ?? 'Riwayat pesanan'}
                <ArrowUpRight aria-hidden size={14} />
              </Link>
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      {/* Transaksi terakhir */}
      <FadeIn delay={0.15}>
        <Card>
          <CardHeader>
            <CardTitle>{menu?.transactions ?? 'Riwayat transaksi'}</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTx.length === 0 ? (
              <p className="text-sm text-content-muted">{emptyTxMessage}</p>
            ) : (
              <ul className="flex flex-col divide-y divide-line/50">
                {recentTx.map((tx) => {
                  const isDeposit = tx.type === 'deposit';
                  return (
                    <li key={tx.id} className="flex items-center gap-3 py-3">
                      <span
                        className={
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full ' +
                          (isDeposit ? 'bg-emerald-500/15 text-emerald-500' : 'bg-content/10 text-content-muted')
                        }
                      >
                        {isDeposit ? (
                          <ArrowDownLeft aria-hidden size={16} />
                        ) : (
                          <ArrowUpRight aria-hidden size={16} />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-content">
                          {tx.note || tx.type || 'Transaksi'}
                        </span>
                        <span className="block text-xs text-content-faint">
                          {tx.createdAt ? formatDateTimeWIB(tx.createdAt) : ''}
                        </span>
                      </span>
                      {typeof tx.amount === 'number' ? (
                        <span
                          className={
                            'shrink-0 font-mono text-sm ' +
                            (isDeposit ? 'text-emerald-500' : 'text-content-muted')
                          }
                        >
                          {isDeposit ? '+' : ''}
                          {formatRupiah(tx.amount)}
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
            <Link
              href="/dashboard/transactions"
              className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 text-sm text-accent hover:underline"
            >
              Lihat semua
              <ArrowUpRight aria-hidden size={15} />
            </Link>
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
