'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, ScrollText, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { FadeIn } from '@/components/anim';
import { formatDateTimeWIB } from '@/lib/format';

const PAGE_SIZE = 20;

type LogItem = {
  id: string;
  actor: string;
  action: string;
  detail: string | null;
  at: number;
};

export function LogsClient() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/logs?limit=200', { cache: 'no-store' });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? 'Gagal memuat log.');
      }
      const data = (await res.json()) as { logs?: LogItem[] };
      setLogs(data.logs ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat log.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter(
      (l) =>
        l.action.toLowerCase().includes(q) ||
        l.actor.toLowerCase().includes(q) ||
        (l.detail ?? '').toLowerCase().includes(q)
    );
  }, [logs, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search]);

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-11 w-full" />
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={ScrollText}
        title="Gagal memuat log"
        description={error}
        action={
          <Button variant="outline" onClick={() => void load()}>
            <RefreshCw aria-hidden size={14} />
            Coba lagi
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search
          aria-hidden
          size={16}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-content-faint"
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari aksi, aktor, atau detail…"
          className="pl-10"
          aria-label="Cari log"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title={logs.length === 0 ? 'Belum ada aktivitas' : 'Tidak ada yang cocok'}
          description={
            logs.length === 0
              ? 'Aksi admin dan sistem akan tercatat di sini.'
              : 'Ubah kata kunci pencarian.'
          }
        />
      ) : (
        <>
          <div className="glass overflow-hidden rounded-2xl">
            <ul className="divide-y divide-line/50">
              {paged.map((log) => (
                <li key={log.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3">
                  <span className="font-mono text-[11px] text-content-faint">
                    {log.at ? formatDateTimeWIB(log.at) : '—'}
                  </span>
                  <span className="text-sm font-medium text-content">{log.actor}</span>
                  <span className="font-mono text-xs text-accent">{log.action}</span>
                  {log.detail ? (
                    <span className="w-full break-all font-mono text-[11px] text-content-faint">
                      {log.detail}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>

          {filtered.length > PAGE_SIZE ? (
            <div className="flex items-center justify-between">
              <p className="text-xs text-content-faint">
                {filtered.length} entri · halaman {safePage} dari {pageCount}
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

      <FadeIn y={6}>
        <p className="text-xs text-content-faint">
          Menampilkan hingga 200 entri terbaru. Entri lama tetap tersimpan di database.
        </p>
      </FadeIn>
    </div>
  );
}
