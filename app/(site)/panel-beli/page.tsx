'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Server, Cpu, HardDrive, Database, Layers, Box, ShieldCheck } from 'lucide-react';
import { useSettings } from '@/components/settings-provider';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

interface PanelCategory {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  active: boolean;
  sortOrder: number;
  pterodactylPanelId?: string;
}

interface PanelRamTier {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  durationDays: number;
  sortOrder: number;
  active: boolean;
  maxPurchasePerUser: number;
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
  };
}

interface CategoryInfo {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  count: number;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Server: <Server aria-hidden size={32} className="text-accent" />,
  Box: <Box aria-hidden size={32} className="text-purple-400" />,
  HardDrive: <HardDrive aria-hidden size={32} className="text-blue-400" />,
  Cpu: <Cpu aria-hidden size={32} className="text-orange-400" />,
  Database: <Database aria-hidden size={32} className="text-green-400" />,
  ShieldCheck: <ShieldCheck aria-hidden size={32} className="text-emerald-400" />,
};

export default function PanelBeliPage() {
  const { settings } = useSettings();

  const panelCategories = settings?.panelCategories?.filter((p) => p.active) ?? [];
  const panelRamTiers = settings?.panelRamTiers?.filter((p) => p.active) ?? [];

  // Group tiers by category
  const categories: CategoryInfo[] = panelCategories.map((cat) => {
    const tiers = panelRamTiers.filter((t) => t.categoryId === cat.id);
    return {
      key: cat.key,
      label: cat.name,
      description: cat.description,
      icon: ICON_MAP[cat.icon] || <Server aria-hidden size={32} className="text-accent" />,
      count: tiers.length,
    };
  }).filter((c) => c.count > 0);

  const emptyState = (
    <div className="col-span-full text-center py-12">
      <Server aria-hidden size={48} className="mx-auto mb-4 text-content-muted/30" />
      <h3 className="text-lg font-semibold text-content">Belum ada panel yang tersedia</h3>
      <p className="mt-2 text-sm text-content-muted">
        Admin belum mengonfigurasi kategori panel atau tier RAM. Silakan hubungi admin.
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
            Pilih kategori panel sesuai kebutuhan Anda. Setiap kategori memiliki tier RAM dengan spesifikasi berbeda.
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
                      {category.count} tier RAM
                    </span>
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-content">{category.label}</h3>
                      <p className="mt-2 text-sm text-content-muted line-clamp-3">{category.description}</p>
                    </div>
                    <div className="mt-4 pt-4 border-t border-line/40 flex items-center justify-between">
                      <span className="text-sm font-medium text-accent">Pilih spesifikasi RAM</span>
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