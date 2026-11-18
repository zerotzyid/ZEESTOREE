'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Server, Cpu, HardDrive, Database, ShieldCheck, ChevronRight } from 'lucide-react';
import { useSettings } from '@/components/settings-provider';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

interface PanelType {
  id: string;
  name: string;
  description: string;
  price: number;
  durationDays: number;
  category: 'pterodactyl' | 'custom';
  provision: {
    memoryMb: number;
    swapMb: number;
    diskMb: number;
    cpuPercent: number;
    ioWeight: number;
    dockerImage: string | null;
    startup: string | null;
    environment: Record<string, string>;
    allocationMode: 'auto' | 'default';
    allocationId: number | null;
    databases: number;
    allocations: number;
    backups: number;
    durationDays: number;
  } | null;
  active: boolean;
  sortOrder: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  pterodactyl: 'Panel Pterodactyl',
  custom: 'Panel Custom',
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  pterodactyl: <Server aria-hidden size={20} className="text-accent" />,
  custom: <Box aria-hidden size={20} className="text-purple-400" />,
};

function Box({ size = 20, ...props }: React.SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={size} height={size} {...props}>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

export default function PanelCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { settings } = useSettings();

  const panelTypes = settings?.panelTypes?.filter((p) => p.active) ?? [];

  // Use dynamic params
  const categoryKey = 'pterodactyl'; // Will be replaced by params in actual render
  const [category, setCategory] = useState<string>('');

  // We'll use a client-side approach since params is Promise
  // The actual category will be determined from the URL

  const categoryLabel = CATEGORY_LABELS[category] || category;
  const categoryIcon = CATEGORY_ICONS[category] || CATEGORY_ICONS.pterodactyl;

  const filteredPanels = panelTypes.filter((p) => p.category === category).sort((a, b) => a.sortOrder - b.sortOrder);

  const emptyState = (
    <div className="col-span-full text-center py-12">
      <Server aria-hidden size={48} className="mx-auto mb-4 text-content-muted/30" />
      <h3 className="text-lg font-semibold text-content">Tidak ada panel di kategori ini</h3>
      <p className="mt-2 text-sm text-content-muted">
        Admin belum mengonfigurasi panel untuk kategori <strong>{categoryLabel}</strong>.
      </p>
    </div>
  );

  // Since we can't use async params directly in client component easily,
  // we'll read from URL pathname
  if (typeof window !== 'undefined' && !category) {
    const path = window.location.pathname;
    const match = path.match(/\/panel-beli\/([^/]+)/);
    if (match) {
      setCategory(match[1]);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/panel-beli"
        className="mb-6 inline-flex min-h-[40px] items-center gap-2 rounded-full border border-line px-4 text-sm text-content-muted transition-colors hover:text-content"
      >
        <ArrowLeft aria-hidden size={15} />
        Kembali ke kategori
      </Link>

      <div>
        <div className="flex flex-col gap-1">
          <p className="label-mono">Panel Server / {categoryLabel}</p>
          <h1 className="text-3xl font-semibold text-content sm:text-4xl flex items-center gap-2">
            {categoryIcon}
            Pilih Spesifikasi RAM
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-content-muted">
            Pilih tier spesifikasi yang sesuai kebutuhan server Anda. Setelah memilih, Anda akan memilih jenis game (egg) di langkah selanjutnya.
          </p>
        </div>
      </div>

      <div>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPanels.length === 0 ? (
            emptyState
          ) : (
            filteredPanels.map((panel) => (
              <Link
                key={panel.id}
                href={`/panel-beli/${category}/${panel.id}/configure`}
                className="relative flex flex-col h-full overflow-hidden rounded-3xl border border-line/60 bg-content/5 hover:border-accent/50 hover:bg-content/10 hover:shadow-lg hover:shadow-accent/10 transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
                <div className="relative p-6 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-2xl bg-accent/10">
                      <Server aria-hidden size={24} className="text-accent" />
                    </div>
                    <span className="text-xs font-medium text-content-faint">
                      {panel.durationDays} hari
                    </span>
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-content">{panel.name}</h3>
                      <p className="mt-2 text-sm text-content-muted line-clamp-2">{panel.description}</p>
                    </div>
                    <div className="mt-4 space-y-3">
                      <div className="rounded-xl border border-line/40 bg-content/5 p-4">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-content/10">
                            <HardDrive aria-hidden size={14} className="text-accent" />
                            <div>
                              <p className="text-xs text-content-muted">RAM</p>
                              <p className="font-semibold text-content">{panel.provision?.memoryMb} MB</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-content/10">
                            <Database aria-hidden size={14} className="text-accent" />
                            <div>
                              <p className="text-xs text-content-muted">Disk</p>
                              <p className="font-semibold text-content">{panel.provision?.diskMb} MB</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-content/10">
                            <Cpu aria-hidden size={14} className="text-accent" />
                            <div>
                              <p className="text-xs text-content-muted">CPU</p>
                              <p className="font-semibold text-content">{panel.provision?.cpuPercent}%</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-content/10">
                            <ShieldCheck aria-hidden size={14} className="text-accent" />
                            <div>
                              <p className="text-xs text-content-muted">DB / Backup</p>
                              <p className="font-semibold text-content">{panel.provision?.databases} / {panel.provision?.backups}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t border-line/40">
                        <span className="text-2xl font-bold text-accent">Rp{formatRupiah(panel.price)}<span className="text-sm font-normal text-content-muted">/bln</span></span>
                        <div className="flex items-center gap-2 text-accent font-medium">
                          Pilih & Konfigurasi
                          <ChevronRight aria-hidden size={16} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function formatRupiah(value: number): string {
  return new Intl.NumberFormat('id-ID').format(value);
}