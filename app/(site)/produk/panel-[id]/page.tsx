import Link from 'next/link';
import type { Route } from 'next';
import { notFound } from 'next/navigation';
import { ArrowLeft, Clock3, LogIn, UserPlus, Mail, Server, HardDrive, Cpu, Database, ShieldCheck, PackageOpen, ExternalLink, Tag } from 'lucide-react';
import { get } from '@/lib/rtdb';
import { getSettings } from '@/lib/settings';
import { getSession } from '@/lib/session';
import { formatRupiah } from '@/lib/format';
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

type PanelType = {
  id: string;
  name: string;
  description: string;
  price: number;
  durationDays: number;
  provision: {
    panelId: string;
    eggId: number;
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
  } | null;
  active: boolean;
  sortOrder: number;
  kind?: string;
  image?: string;
};

function contactHref(value: string): string | null {
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

async function loadPanelType(panelId: string): Promise<PanelType | null> {
  try {
    const settings = await getSettings().catch(() => null);
    if (!settings) return null;
    const panelTypes = settings.panelTypes?.filter((p) => p.active) ?? [];
    return panelTypes.find((p) => p.id === panelId) ?? null;
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
  const panel = await loadPanelType(panelId);
  const name = panel?.name ?? 'Panel Server';
  return { title: `${name} - Panel Server` };
}

function provisionValue(panel: PanelType, key: string, fallback = '—'): string {
  if (!panel.provision) return fallback;
  const val = (panel.provision as Record<string, unknown>)[key];
  return val == null || val === '' ? fallback : String(val);
}

export default async function PanelProductPage({ params }: { params: Promise<{ panelId: string }> }) {
  const { panelId } = await params;
  const panel = await loadPanelType(panelId);
  if (!panel) notFound();

  const settings = await getSettings().catch(() => null);
  const session = await getSession().catch(() => null);

  const isPanel = panel.kind === 'panel';
  const isReseller = typeof panel.kind === 'string' && panel.kind === 'reseller';
  const isNokos = typeof panel.kind === 'string' && panel.kind === 'nokos';

  const name = typeof panel.name === 'string' && panel.name ? panel.name : panelId;
  const description = typeof panel.description === 'string' && panel.description.trim() ? panel.description : null;
  const price = typeof panel.price === 'number' ? panel.price : null;
  const imageUrl = typeof panel.image === 'string' && panel.image ? `/api/asset/${panel.image}` : null;

  const durationDays = panel.durationDays ?? 30;
  const expiresText = durationDays > 0 ? `Aktif selama ${durationDays} hari` : 'Aktif permanen';

  const helpHref = settings
    ? contactHref(settings.contact.whatsapp) ??
      contactHref(settings.contact.telegram) ??
      contactHref(settings.contact.email)
    : null;

  const featureItems = panel.provision ? [
    { icon: Server, label: 'Akses Panel Pterodactyl', desc: 'Kelola server Anda sendiri melalui panel kontrol profesional.' },
    { icon: HardDrive, label: 'Penyimpanan', desc: `${provisionValue(panel, 'diskMb')} MB penyimpanan SSD.` },
    { icon: Cpu, label: 'Prosesor', desc: `${provisionValue(panel, 'cpuPercent')}% alokasi CPU dedicated.` },
    { icon: Database, label: 'Database & Backup', desc: `${provisionValue(panel, 'databases')} database dan ${provisionValue(panel, 'backups')} backup otomatis.` },
    { icon: ShieldCheck, label: 'Lindung Otomatis', desc: `Server akan dihapus otomatis setelah ${expiresText.toLowerCase()} jika tidak diperpanjang.` },
  ] : [];

  return (
    <div className="mx-auto px-4 py-8 sm:px-6 sm:py-12">
      <Link href="/panel-beli" className="mb-6 inline-flex min-h-[40px] items-center gap-2 rounded-full border border-line px-4 text-sm text-content-muted transition-colors hover:text-content">
        <ArrowLeft aria-hidden size={15} />
        Kembali ke pilihan panel
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <FadeIn>
          <div className="relative lg:sticky lg:top-24">
            <div className="overflow-hidden rounded-3xl border border-line/60 bg-content/5 aspect-[4/3] md:aspect-[3/4]">
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/10 to-accent/5">
                <Server aria-hidden size={80} className="text-accent/30" />
              </div>
              {imageUrl ? (
                <ProductImage src={imageUrl} alt={name} iconSize={48} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <PackageOpen aria-hidden size={64} className="text-content-muted/30" />
                </div>
              )}
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.08} className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-[11px] text-content-muted">
              <Clock3 aria-hidden size={12} />
              Aktif dipesan
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold leading-tight text-content sm:text-3xl">{name}</h1>
            {price !== null ? (
              price === 0 ? (
                <p className="text-3xl font-semibold text-emerald-500">Gratis</p>
              ) : (
                <p className="text-3xl font-semibold text-accent">{formatRupiah(price)}</p>
              )
            ) : (
              <p className="text-sm text-content-muted">Hubungi kami untuk harga.</p>
            )}
          </div>

          {description && (
            <div className="whitespace-pre-line rounded-2xl border border-line/60 bg-content/5 p-4 text-sm leading-relaxed text-content-muted">
              {description}
            </div>
          )}

          {panel.provision && (
            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-line p-4">
              <div className="flex items-center gap-2">
                <Server aria-hidden size={16} className="text-accent" />
                <p className="label-mono">Spesifikasi Panel</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {featureItems.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-xl border border-line/40 bg-content/5">
                    <f.icon aria-hidden size={16} className="text-accent" />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-content">{f.label}</p>
                      <p className="text-xs text-content-faint">{f.desc}</p>
                    </div>
                  </div>
                ))}
                <div className="col-span-2 flex items-center gap-2 p-2 rounded-xl border border-line/40 bg-emerald-500/10 text-emerald-500/90 text-sm">
                  <ShieldCheck aria-hidden size={16} />
                  <span className="font-medium">{expiresText}</span>
                </div>
              </div>
            </div>
          )}
          {isPanel && (
            <div className="mt-4 rounded-2xl border border-line/60 bg-content/5 p-4">
              <p className="text-xs text-content-muted">
                {isReseller
                  ? 'Pesanan ini dibayar via QRIS penyedia — bukan dari saldo situs.'
                  : isNokos
                    ? 'Saldo terpotong otomatis; nomor & OTP muncul di riwayat pesanan. Bila gagal, saldo kembali.'
                    : 'Saldo akan terpotong otomatis. Bila pembuatan server panel gagal, uang dikembalikan ke saldo Anda.'}
              </p>
            </div>
          )}

          {!session ? (
            <>
              <p className="text-sm text-content-muted">Masuk atau buat akun untuk membeli produk ini.</p>
              <div className="flex flex-wrap gap-3">
                <Link href={`/login?next=/produk/${panelId}`} className="btn-accent inline-flex min-h-[46px] items-center gap-2 rounded-full px-6 text-sm font-medium">
                  <LogIn aria-hidden size={16} />
                  Masuk untuk membeli
                </Link>
                <Link href="/register" className="inline-flex min-h-[46px] items-center gap-2 rounded-full border border-line px-6 text-sm font-medium text-content transition-colors hover:bg-content/5">
                  <UserPlus aria-hidden size={16} />
                  Daftar
                </Link>
              </div>
            </>
          ) : (
            <>
              <CheckoutButton productId={`panel-${panelId}`} kind="panel" />
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
            </>
          )}
        </FadeIn>
      </div>
    </div>
  );
}