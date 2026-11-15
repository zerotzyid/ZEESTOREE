'use client';

import { useEffect, useState } from 'react';
import { RotateCw } from 'lucide-react';
import type { StatusPayload } from '@/lib/status';

function Jam({ ms }: { ms: number | null }) {
  if (ms === null) return <span className="font-mono text-xs text-content-faint">—</span>;
  return <span className="font-mono text-xs text-content-muted">{ms} ms</span>;
}

/** Papan status layanan (publik): dipakai di beranda & ringkasan admin. */
export function StatusBoard() {
  const [data, setData] = useState<StatusPayload | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch('/api/status', { cache: 'no-store' });
        if (!res.ok) throw new Error();
        const json = (await res.json()) as StatusPayload;
        if (alive) {
          setData(json);
          setFailed(false);
        }
      } catch {
        if (alive) setFailed(true);
      }
    };
    void load();
    const timer = setInterval(() => void load(), 60_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="rounded-2xl border border-line/70 bg-surface-raised p-5">
      <div className="flex items-center justify-between">
        <span className="label-mono">Pemeriksaan langsung</span>
        <span className="flex items-center gap-1.5 font-mono text-[11px] text-content-faint">
          <RotateCw aria-hidden size={11} />
          {data ? new Date(data.checkedAt).toLocaleTimeString('id-ID') : 'memuat…'}
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {failed ? (
          <p className="text-sm text-content-muted">Gagal memuat status. Coba lagi nanti.</p>
        ) : !data ? (
          [0, 1, 2].map((i) => (
            <div key={i} className="h-5 animate-pulse rounded bg-content/5" aria-hidden />
          ))
        ) : (
          data.services.map((service) => (
            <div key={service.id} className="flex items-center gap-3 text-sm">
              <span
                aria-hidden
                className={
                  service.ok
                    ? 'h-2 w-2 shrink-0 rounded-full bg-emerald-500'
                    : 'h-2 w-2 shrink-0 rounded-full bg-red-500'
                }
              />
              <span className="truncate text-content">{service.name}</span>
              <span
                aria-hidden
                className="h-0 min-w-6 flex-1 -translate-y-1 border-b border-dotted border-line"
              />
              <span className={service.ok ? 'text-xs text-emerald-500' : 'text-xs text-red-500'}>
                {service.ok ? 'normal' : 'gangguan'}
              </span>
              <span className="w-16 text-right font-mono text-xs text-content-muted">
                {service.uptimePct === null ? '—' : `${service.uptimePct}%`}
              </span>
              <Jam ms={service.latencyMs} />
            </div>
          ))
        )}
      </div>

      <p className="mt-4 text-[11px] text-content-faint">
        Uptime dihitung dari {data ? data.services.length : 0} layanan · riwayat 200 pemeriksaan
        terakhir per layanan · diperbarui tiap 60 detik.
      </p>
    </div>
  );
}
