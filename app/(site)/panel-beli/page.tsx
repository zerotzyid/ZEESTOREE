'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Server, Cpu, HardDrive, Database, Layers, Box } from 'lucide-react';
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

interface CategoryInfo {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  count: number;
}

const CATEGORY_CONFIG: Record<string, Omit<CategoryInfo, 'count'>> = {
  pterodactyl: {
    key: 'pterodactyl',
    label: 'Panel Pterodactyl',
    description: 'Panel server game dengan provisioning otomatis ke Pterodactyl. Pilih spesifikasi RAM, lalu pilih jenis game (egg).',
    icon: <Server aria-hidden size={32} className="text-accent" />,
  },
  custom: {
    key: 'custom',
    label: 'Panel Custom',
    description: 'Panel dengan konfigurasi manual atau panel lain non-Pterodactyl.',
    icon: <Box aria-hidden size={32} className="text-purple-400" />,
  },
};

export default function PanelBeliPage() {
  const { settings } = useSettings();

  const panelTypes = settings?.panelTypes?.filter((p) => p.active) ?? [];

  // Group panel types by category
  const categories: CategoryInfo[] = Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
    const count = panelTypes.filter((p) => p.category === key).length;
    return { ...config, count };
  }).filter((c) => c.count > 0);

  const emptyState = (
    <div className="col-span-full text-center py-12">
      <Server aria-hidden size={48} className="mx-auto mb-4 text-content-muted/30" />
      <h3 className="text-lg font-semibold text-content">Belum ada panel yang tersedia</h3>
      <p className="mt-2 text-sm text-content-muted">
        Admin belum mengonfigurasi jenis panel. Silakan hubungi admin.
      </p>
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/#katalog"
        className="mb-6 inline-flex min-h-[40px] items-center gap-2 rounded-full border border-line px-4 text-sm text-content-muted transition-colors hover:text-content"
      >
        <ArrowLeft aria-hidden size={15} />
        Kembali ke katalog
      </Link>

      <div>
        <div className="flex flex-col gap-1">
          <p className="label-mono">Panel Server</p>
          <h1 className="text-3xl font-semibold text-content sm:text-4xl">Pilih Kategori Panel</h1>
          <p className="mt-2 max-w-2xl text-sm text-content-muted">
            Pilih kategori panel sesuai kebutuhan Anda. Setiap kategori memiliki tipe panel dengan spesifikasi berbeda.
          </p>
        </div>
      </div>

      <div>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {categories.length === 0 ? (
            emptyState
          ) : (
            categories.map((category) => (
              <Link
                key={category.key}
                href={`/panel-beli/${category.key}`}
                className="relative flex flex-col h-full overflow-hidden rounded-3xl border border-line/60 bg-content/5 hover:border-accent/50 hover:bg-content/10 hover:shadow-lg hover:shadow-accent/10 transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
                <div className="relative p-6 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-2xl bg-accent/10">
                      {category.icon}
                    </div>
                    <span className="text-xs font-medium text-content-faint">
                      {category.count} tipe panel
                    </span>
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-content">{category.label}</h3>
                      <p className="mt-2 text-sm text-content-muted line-clamp-3">{category.description}</p>
                    </div>
                    <div className="mt-4 pt-4 border-t border-line/40 flex items-center justify-between">
                      <span className="text-sm font-medium text-accent">Pilih spesifikasi</span>
                      <span className="text-xs text-content-muted">Lihat opsi →</span>
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