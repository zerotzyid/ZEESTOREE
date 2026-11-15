'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, RefreshCw } from 'lucide-react';
import { useSettings } from '@/components/settings-provider';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDateTimeWIB, formatRupiah } from '@/lib/format';

type Transaction = {
  id: string;
  type?: string;
  amount?: number;
  balanceAfter?: number;
  note?: string;
  createdAt?: number;
};

const TYPE_LABEL: Record<string, string> = {
  deposit: 'Deposit',
  payment: 'Pembayaran',
  refund: 'Refund',
  adjustment: 'Penyesuaian',
};

const TYPE_VARIANT: Record<string, 'success' | 'danger' | 'warning' | 'neutral'> = {
  deposit: 'success',
  refund: 'success',
  payment: 'danger',
  adjustment: 'warning',
};

export default function TransactionsPage() {
  const { settings } = useSettings();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    setState('loading');
    try {
      const res = await fetch('/api/user/transactions', { cache: 'no-store' });
      if (res.status === 401) {
        window.location.href = '/login?next=/dashboard/transactions';
        return;
      }
      if (!res.ok) throw new Error('Gagal memuat transaksi.');
      const data = (await res.json()) as { transactions?: Transaction[] };
      setTransactions(data.transactions ?? []);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const types = useMemo(() => {
    const set = new Set<string>();
    for (const tx of transactions) {
      if (tx.type) set.add(tx.type);
    }
    return [...set].sort();
  }, [transactions]);

  const filtered = useMemo(
    () => (filter === 'all' ? transactions : transactions.filter((t) => t.type === filter)),
    [transactions, filter]
  );

  const emptyMessage = settings?.systemTexts.messages.emptyTransactions ?? 'Belum ada transaksi.';

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
          title="Gagal memuat transaksi"
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
          {settings?.systemTexts.menu.transactions ?? 'Riwayat transaksi'}
        </h1>
      </div>

      {transactions.length > 0 && types.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="tx-filter" className="sr-only">
            Filter jenis
          </label>
          <select
            id="tx-filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="min-h-[44px] rounded-xl border border-line bg-transparent px-4 text-sm text-content"
          >
            <option value="all">Semua jenis</option>
            {types.map((type) => (
              <option key={type} value={type}>
                {TYPE_LABEL[type] ?? type}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title={transactions.length === 0 ? emptyMessage : 'Tidak ada transaksi dengan filter ini'}
          description={
            transactions.length === 0
              ? 'Mutasi saldo Anda akan tampil di sini.'
              : 'Ubah filter untuk melihat transaksi lain.'
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((tx) => (
            <li
              key={tx.id}
              className="glass flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4"
            >
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-content">
                  {tx.note || (tx.type ? (TYPE_LABEL[tx.type] ?? tx.type) : 'Transaksi')}
                </p>
                <p className="font-mono text-xs text-content-faint">
                  {tx.createdAt ? formatDateTimeWIB(tx.createdAt) : ''}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {typeof tx.balanceAfter === 'number' ? (
                  <span className="hidden font-mono text-xs text-content-faint sm:inline">
                    Saldo: {formatRupiah(tx.balanceAfter)}
                  </span>
                ) : null}
                {typeof tx.amount === 'number' ? (
                  <span
                    className={
                      tx.amount >= 0 ? 'text-sm font-semibold text-emerald-500' : 'text-sm font-semibold text-red-500'
                    }
                  >
                    {tx.amount >= 0 ? '+' : ''}
                    {formatRupiah(tx.amount)}
                  </span>
                ) : null}
                {tx.type ? (
                  <Badge variant={TYPE_VARIANT[tx.type] ?? 'neutral'}>
                    {TYPE_LABEL[tx.type] ?? tx.type}
                  </Badge>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
