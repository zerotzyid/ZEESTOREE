'use client';

import { useEffect, useState } from 'react';

type Stats = { activePanels: number; completedOrders: number; activeProducts: number };

const ROWS: { key: keyof Stats; label: string }[] = [
  { key: 'activePanels', label: 'PANEL_AKTIF' },
  { key: 'completedOrders', label: 'ORDER_SELESAI' },
  { key: 'activeProducts', label: 'PRODUK_AKTIF' },
];

/**
 * Kartu hero bergaya baris status monospace.
 * Hanya menampilkan angka nyata dari database; bila tidak ada,
 * tampil versi non-numerik tanpa klaim apa pun.
 */
export function HeroStatusCard({ helpChip }: { helpChip: string }) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/public/stats', { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as Stats;
        if (!cancelled) setStats(data);
      } catch {
        /* biarkan null — kartu tampil non-numerik */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = stats ? ROWS.filter((row) => stats[row.key] > 0) : [];

  return (
    <div className="relative" aria-label="Status sistem">
      <div className="glass-strong w-full max-w-sm rotate-[-2deg] rounded-3xl p-5 shadow-lift transition-transform duration-300 hover:rotate-0 sm:max-w-md">
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="label-mono">STATUS</span>
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-content-faint">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
            ONLINE
          </span>
        </div>

        <div className="flex flex-col gap-2.5 font-mono text-xs">
          {rows.length > 0 ? (
            rows.map((row) => (
              <div key={row.key} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2 text-content-muted">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
                  {row.label}
                </span>
                <span className="text-content">{stats ? stats[row.key] : 0}</span>
              </div>
            ))
          ) : (
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2 text-content-muted">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-content-faint" aria-hidden />
                STATUS_LAYANAN
              </span>
              <span className="text-content-faint">—</span>
            </div>
          )}
        </div>
      </div>

      {helpChip ? (
        <span className="glass-strong absolute -right-2 -top-3 rounded-full px-3.5 py-1.5 font-mono text-[11px] text-content shadow-soft sm:-right-4">
          {helpChip}
        </span>
      ) : null}
    </div>
  );
}
