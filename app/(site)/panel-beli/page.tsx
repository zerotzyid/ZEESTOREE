'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Server, MemoryStick, Cpu, HardDrive, ShieldCheck, ChevronDown } from 'lucide-react';
import { useSettings } from '@/components/settings-provider';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

interface PanelSalesTier {
  id: string;
  panelId: string;
  name: string;
  description: string;
  active: boolean;
  sortOrder: number;
  priceMultiplier: number;
  maxPurchasePerUser: number;
}

interface PanelDoc {
  id: string;
  name: string;
  baseUrl: string;
  active: boolean;
  hasKey: boolean;
}

interface PanelSalesConfig {
  tiers: PanelSalesTier[];
  ramOptions: number[];
  cpuOptions: number[];
  diskOptions: number[];
}

export default function PanelBeliPage() {
  const { settings } = useSettings();
  const [existingPanels, setExistingPanels] = useState<{id: string; name: string; baseUrl: string}[]>([]);
  
  const panelSales = settings?.panelSales || { tiers: [], ramOptions: [], cpuOptions: [], diskOptions: [] };
  const tiers = panelSales.tiers?.filter((t: PanelSalesTier) => t.active) || [];

  useEffect(() => {
    fetch('/api/admin/panels', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (data.panels) {
          setExistingPanels(data.panels
            .filter((p: any) => p.active && p.hasKey)
            .map((p: any) => ({ id: p.id, name: p.name, baseUrl: p.baseUrl }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const emptyState = (
    <div className="col-span-full text-center py-12">
      <Server aria-hidden size={48} className="mx-auto mb-4 text-content-muted/30" />
      <h3 className="text-lg font-semibold text-content">Belum ada panel tier yang tersedia</h3>
      <p className="mt-2 text-sm text-content-muted">
        Admin belum mengonfigurasi panel tier di Panel Sales Settings.
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
          <h1 className="text-3xl font-semibold text-content sm:text-4xl">Pilih Panel Tier</h1>
          <p className="mt-2 max-w-2xl text-sm text-content-muted">
            Pilih panel tier (lokasi/server Pterodactyl) yang ingin Anda gunakan. Setiap tier memiliki harga dan spesifikasi sendiri.
          </p>
        </div>
      </div>

      <div>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tiers.length === 0 ? (
            emptyState
          ) : (
            tiers.map((tier) => (
              <Link
                key={tier.id}
                href={`/panel-beli/${tier.id}/configure`}
                className="relative flex flex-col h-full overflow-hidden rounded-3xl border border-line/60 bg-content/5 hover:border-accent/50 hover:bg-content/10 hover:shadow-lg hover:shadow-accent/10 transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
                <div className="relative p-6 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-2xl bg-accent/10">
                      <Server aria-hidden size={32} className="text-accent" />
                    </div>
                    <span className="text-xs font-medium text-content-faint">
                      {tier.priceMultiplier}x harga dasar
                    </span>
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-content">{tier.name}</h3>
                      <p className="mt-2 text-sm text-content-muted line-clamp-3">{tier.description}</p>
                    </div>
                    <div className="mt-4 pt-4 border-t border-line/40 flex items-center justify-between">
                      <span className="text-sm font-medium text-accent">Pilih Spesifikasi →</span>
                      <span className="text-xs text-content-muted">Multiplier: {tier.priceMultiplier}x</span>
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