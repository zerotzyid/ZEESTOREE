import Link from 'next/link';
import type { Route } from 'next';
import { notFound } from 'next/navigation';
import { ArrowLeft, Clock3, LogIn, UserPlus, Mail, Server, HardDrive, Cpu, Database, ShieldCheck, PackageOpen, ExternalLink, Tag, ChevronRight } from 'lucide-react';
import { get } from '@/lib/rtdb';
import { getSettings } from '@/lib/settings';
import { getSession } from '@/lib/session';
import { ProductImage } from '@/components/product-image';
import { CheckoutButton } from '@/components/checkout-button';
import { FadeIn } from '@/components/anim';

export const dynamic = 'force-dynamic';

type ProductDoc = {
  name?: unknown;
  description?: unknown;
  price?: unknown;
  categoryId?: unknown;
  image?: unknown;
  active?: unknown;
  kind?: unknown;
  provision?: unknown;
  createdAt?: unknown;
  durationDays?: unknown;
};

type CategoryDoc = { name?: unknown };

type PanelSalesTier = {
  id: string;
  panelId: string;
  name: string;
  description: string;
  active: boolean;
  sortOrder: number;
  priceMultiplier: number;
  maxPurchasePerUser: number;
};

type PanelSalesConfig = {
  tiers: PanelSalesTier[];
  ramOptions: number[];
  cpuOptions: number[];
  diskOptions: number[];
};

function contactHref(value: string): string | null {
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

async function loadPanelTier(tierId: string): Promise<PanelSalesTier | null> {
  try {
    const settings = await getSettings().catch(() => null);
    if (!settings) return null;
    const panelSales = settings.panelSales || { tiers: [], ramOptions: [], cpuOptions: [], diskOptions: [] };
    const tier = panelSales.tiers.find((t) => t.id === tierId && t.active);
    if (!tier) return null;
    return tier;
  } catch {
    return null;
  }
}

async function loadProduct(id: string): Promise<{
  product: ProductDoc;
  categoryName: string | null;
} | null> {
  try {
    const product = await get<ProductDoc>(`products/${id}`);
    if (!product || product.active === false) return null;
    let categoryName: string | null = null;
    if (typeof product.categoryId === 'string' && product.categoryId) {
      const category = await get<CategoryDoc>(`categories/${product.categoryId}`);
      if (category && typeof category.name === 'string') categoryName = category.name;
    }
    return { product, categoryName };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ panelId: string }> }) {
  const { panelId } = await params;
  const tier = await loadPanelTier(panelId);
  const name = tier?.name ?? 'Panel Server';
  return { title: `${name} - Panel Server` };
}

function formatRupiah(value: number): string {
  return new Intl.NumberFormat('id-ID').format(value);
}

export default async function PanelProductPage({ params }: { params: Promise<{ panelId: string }> }) {
  const { panelId } = await params;
  const tier = await loadPanelTier(panelId);
  if (!tier) notFound();

  const settings = await getSettings().catch(() => null);
  const session = await getSession().catch(() => null);

  const tierName = tier.name;
  const tierDescription = tier.description;
  const tierPriceMultiplier = tier.priceMultiplier;

  const helpHref = settings
    ? contactHref(settings.contact.whatsapp) ??
      contactHref(settings.contact.telegram) ??
      contactHref(settings.contact.email)
    : null;

  return (
    <div className="mx-auto px-4 py-8 sm:px-6 sm:py-12">
      <Link href="/panel-beli" className="mb-6 inline-flex min-h-[40px] items-center gap-2 rounded-full border border-line px-4 text-sm text-content-muted transition-colors hover:text-content">
        <ArrowLeft aria-hidden size={15} />
        Kembali ke pilihan panel
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Tier Image/Info */}
        <FadeIn>
          <div className="relative lg:sticky lg:top-24">
            <div className="overflow-hidden rounded-3xl border border-line/60 bg-content/5 aspect-[4/3] md:aspect-[3/4]">
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/10 to-accent/5">
                <Server aria-hidden size={80} className="text-accent/30" />
              </div>
              <span className="absolute left-3 top-3 rounded-full bg-accent px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-white">
                Mulai Rp{formatRupiah(10000)}<span className="text-sm font-normal text-white">/bln</span>
              </span>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.08} className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-accent-soft px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-accent">
              Panel Server
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-[11px] text-content-muted">
              <Tag aria-hidden size={12} className="mr-1" />
              Aktif dipesan
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold leading-tight text-content sm:text-3xl lg:text-4xl">{tier.name}</h1>
            <p className="text-3xl font-semibold text-accent">
              Mulai dari Rp{formatRupiah(10000)}<span className="text-sm font-normal text-content-muted">/bln</span>
            </p>
          </div>

          {tier.description && (
            <div className="whitespace-pre-line rounded-2xl border border-line/60 bg-content/5 p-4 text-sm leading-relaxed text-content-muted">
              {tier.description}
            </div>
          )}

          <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-line p-4">
            <div className="flex items-center gap-2">
              <Server aria-hidden size={16} className="text-accent" />
              <p className="label-mono">Pilih Spesifikasi</p>
            </div>
            <p className="text-sm text-content-muted">
              Pilih spesifikasi RAM, CPU, dan Disk di halaman konfigurasi.
            </p>
            <Link
              href={`/panel-beli/${tier.id}/configure`}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-accent/50 bg-accent/10 px-4 py-2 text-sm font-medium text-accent hover:bg-accent/20 transition-colors"
            >
              <ChevronRight aria-hidden size={16} />
              Pilih Spesifikasi & Egg
            </Link>
          </div>

          <div className="mt-4 pt-4 border-t border-line/40">
            <CheckoutButton
              productId={`panel-${tier.id}`}
              kind="panel"
              tierId={tier.id}
            />
            <p className="mt-3 text-xs text-content-faint">
              Butuh bantuan?{' '}
              {helpHref ? (
                <a href={helpHref} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                  Hubungi kami
                </a>
              ) : (
                'gunakan menu bantuan di situs.'
              )}
            </p>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}

