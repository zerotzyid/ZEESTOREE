'use client';

import Link from 'next/link';
import { Server, HardDrive, Cpu, Database, ShieldCheck, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type PanelCardProps = {
  panel: any;
  selected: boolean;
  onSelect: (id: string) => void;
  loading: boolean;
};

export function PanelCard({
  panel,
  selected,
  onSelect,
  loading,
}: PanelCardProps) {
  return (
    <div className={`relative overflow-hidden rounded-3xl border border-line/60 bg-content/5 hover:border-accent/50 hover:bg-content/10 transition-all duration-300 ${selected ? 'ring-2 ring-accent border-accent/50' : ''}`}>
      <a href={`/produk/panel-${panel.id}`} className="relative flex flex-col h-full overflow-hidden rounded-3xl border border-line/60 bg-content/5 hover:border-accent/50 hover:bg-content/10 transition-all duration-300">
        <div className="relative aspect-[16/9] overflow-hidden rounded-t-3xl bg-content/10">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50" />
          {panel.provision ? (
            <div className="absolute left-3 top-3 right-3 top-3 flex flex-wrap gap-1.5">
              <span className="rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">{panel.provision.memoryMb}MB RAM</span>
              <span className="rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">{panel.provision.diskMb}MB SSD</span>
              <span className="rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">{panel.provision.cpuPercent}% CPU</span>
            </div>
          ) : null}
          <div className="absolute left-3 top-3"><span className="rounded-full bg-accent px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-white">Rp{panel.price ? formatRupiah(panel.price) : '0'}/bulan</span></div>
        </div>
        <div className="p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2"><Server aria-hidden size={16} className="text-accent" /><h3 className="text-lg font-semibold text-content">{panel.name}</h3></div>
          <p className="text-sm text-content-muted line-clamp-2">{panel.description}</p>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            {panel.provision && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-content-muted">
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-content/10"><HardDrive aria-hidden size={12} />{panel.provision.memoryMb}MB SSD</span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-content/10"><Cpu aria-hidden size={12} />{panel.provision.cpuPercent}% CPU</span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-content/10"><Database aria-hidden size={12} />{panel.provision.databases} DB</span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-content/10"><ShieldCheck aria-hidden size={12} />{panel.provision.backups} Backup</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm"><span className="font-semibold text-accent">Rp{formatRupiah(panel.price)}/{panel.durationDays} hari</span></div>
            <div className="pt-2 border-t border-line/40"><Button className="w-full" variant={selected ? 'default' : 'outline'} disabled={loading} onClick={() => window.location.href = `/produk/panel-${panel.id}`}>{selected ? (<><Loader2 aria-hidden size={14} className="animate-spin" /> Dipilih</>) : ('Pilih Panel Ini')}</Button>
            </div>
          </div>
        </div>
      </a>
    </div>
  );
}

export function formatRupiah(value: number): string {
  return new Intl.NumberFormat('id-ID').format(value);
}