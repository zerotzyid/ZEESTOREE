import Link from 'next/link';
import type { Route } from 'next';
import { notFound } from 'next/navigation';
import { ArrowLeft, Clock3, LogIn, UserPlus } from 'lucide-react';
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
};

type CategoryDoc = { name?: unknown };

function contactHref(value: string): string | null {
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
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

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await loadProduct(id);
  const name =
    data && typeof data.product.name === 'string' && data.product.name
      ? data.product.name
      : 'Produk';
  return { title: name };
}

export default async function ProdukDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await loadProduct(id);
  if (!data) notFound();

  const { product, categoryName } = data;
  const settings = await getSettings().catch(() => null);
  const session = await getSession().catch(() => null);

  const name = typeof product.name === 'string' && product.name ? product.name : id;
  const description =
    typeof product.description === 'string' && product.description.trim()
      ? product.description
      : null;
  const price = typeof product.price === 'number' ? product.price : null;
  const imageUrl =
    typeof product.image === 'string' && product.image ? `/api/asset/${product.image}` : null;

  const helpHref = settings
    ? contactHref(settings.contact.whatsapp) ??
      contactHref(settings.contact.telegram) ??
      contactHref(settings.contact.email)
    : null;
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/#katalog"
        className="mb-6 inline-flex min-h-[40px] items-center gap-2 rounded-full border border-line px-4 text-sm text-content-muted transition-colors hover:text-content"
      >
        <ArrowLeft aria-hidden size={15} />
        Kembali ke katalog
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <FadeIn>
          <div className="overflow-hidden rounded-3xl border border-line/60">
            <ProductImage
              src={imageUrl}
              alt={name}
              iconSize={48}
              className="aspect-[4/3] w-full"
            />
          </div>
        </FadeIn>

        <FadeIn delay={0.08} className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {categoryName ? (
              <span className="rounded-full bg-accent-soft px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-accent">
                {categoryName}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-[11px] text-content-muted">
              <Clock3 aria-hidden size={12} />
              Aktif dipesan
            </span>
          </div>

          <h1 className="text-2xl font-semibold leading-tight text-content sm:text-3xl">{name}</h1>

          {price !== null ? (
            <p className="text-3xl font-semibold text-accent">{formatRupiah(price)}</p>
          ) : (
            <p className="text-sm text-content-muted">Hubungi kami untuk harga.</p>
          )}

          {description ? (
            <div className="whitespace-pre-line rounded-2xl border border-line/60 bg-content/5 p-4 text-sm leading-relaxed text-content-muted">
              {description}
            </div>
          ) : null}

          {typeof product.kind === 'string' && product.kind === 'panel' ? (
            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-line p-4">
              <p className="label-mono">Spesifikasi panel</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div className="flex flex-col gap-0.5">
                  <span className="text-content-faint">RAM</span>
                  <span className="font-mono text-content">
                    {String(
                      typeof product.provision === 'object' && product.provision
                        ? (product.provision as Record<string, unknown>).memoryMb
                        : null
                    ) === 'null' ? '—' : `${(product.provision as Record<string, unknown>).memoryMb} MB`}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-content-faint">Disk</span>
                  <span className="font-mono text-content">
                    {String(
                      typeof product.provision === 'object' && product.provision
                        ? (product.provision as Record<string, unknown>).diskMb
                        : null
                    ) === 'null' ? '—' : `${(product.provision as Record<string, unknown>).diskMb} MB`}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-content-faint">Swap</span>
                  <span className="font-mono text-content">
                    {String(
                      typeof product.provision === 'object' && product.provision
                        ? (product.provision as Record<string, unknown>).swapMb
                        : null
                    ) === 'null' ? '—' : `${(product.provision as Record<string, unknown>).swapMb} MB`}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-content-faint">CPU</span>
                  <span className="font-mono text-content">
                    {String(
                      typeof product.provision === 'object' && product.provision
                        ? (product.provision as Record<string, unknown>).cpuPercent
                        : null
                    ) === 'null' ? '—' : `${(product.provision as Record<string, unknown>).cpuPercent} %`}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 sm:col-span-2">
                  <span className="text-content-faint">Database / Alokasi / Backup</span>
                  <span className="font-mono text-content">
                    {String(
                      typeof product.provision === 'object' && product.provision
                        ? (product.provision as Record<string, unknown>).databases
                        : null
                    ) === 'null' ? '—' : String((product.provision as Record<string, unknown>).databases)}
                    /{' '}
                    {String(
                      typeof product.provision === 'object' && product.provision
                        ? (product.provision as Record<string, unknown>).allocations
                        : null
                    ) === 'null' ? '—' : String((product.provision as Record<string, unknown>).allocations)}
                    /{' '}
                    {String(
                      typeof product.provision === 'object' && product.provision
                        ? (product.provision as Record<string, unknown>).backups
                        : null
                    ) === 'null' ? '—' : String((product.provision as Record<string, unknown>).backups)}
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-2 flex flex-col gap-3 rounded-2xl border border-line/60 p-4">
            {!session ? (
              <>
                <p className="text-sm text-content-muted">
                  Masuk atau buat akun untuk membeli produk ini.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/login?next=/produk/${id}` as Route}
                    className="btn-accent inline-flex min-h-[46px] items-center gap-2 rounded-full px-6 text-sm font-medium"
                  >
                    <LogIn aria-hidden size={16} />
                    Masuk untuk membeli
                  </Link>
                  <Link
                    href="/register"
                    className="inline-flex min-h-[46px] items-center gap-2 rounded-full border border-line px-6 text-sm font-medium text-content transition-colors hover:bg-content/5"
                  >
                    <UserPlus aria-hidden size={16} />
                    Daftar
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-content-muted">
                  {typeof product.kind === 'string' && product.kind === 'reseller'
                    ? 'Pesanan ini dibayar via QRIS penyedia — bukan dari saldo situs.'
                    : typeof product.kind === 'string' && product.kind === 'nokos'
                      ? 'Saldo terpotong otomatis; nomor & OTP muncul di riwayat pesanan. Bila gagal, saldo kembali.'
                      : 'Saldo akan terpotong otomatis. Bila pembuatan server panel gagal, uang dikembalikan ke saldo Anda.'}
                </p>
                <CheckoutButton
                  productId={id}
                  kind={typeof product.kind === 'string' ? product.kind : 'lainnya'}
                />
                <p className="text-xs text-content-faint">
                  Butuh bantuan?{' '}
                  {helpHref ? (
                    <a
                      href={helpHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline"
                    >
                      Hubungi kami
                    </a>
                  ) : (
                    'gunakan menu bantuan di situs.'
                  )}
                </p>
              </>
            )}
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
