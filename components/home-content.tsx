'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { Headset, X, ArrowRight, ArrowLeft, Folder, PackageOpen, RefreshCw } from 'lucide-react';
import { useSettings } from '@/components/settings-provider';
import { StatusBoard } from '@/components/status-board';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ProductImage } from '@/components/product-image';
import { cn } from '@/lib/cn';
import { formatRupiah } from '@/lib/format';

const CHIP_LINKS = ['/dashboard/deposit', '/dashboard/orders', '/dashboard'] as const;

type Stats = { activePanels: number; completedOrders: number; activeProducts: number };

type ProductListItem = {
  id: string;
  name?: unknown;
  description?: unknown;
  price?: unknown;
  categoryId?: unknown;
  image?: unknown;
  [key: string]: unknown;
};

type CategoryItem = { id: string; name: string; order: number };

function contactHref(value: string): string | null {
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

const STEPS = [
  {
    title: 'Buat akun',
    text: 'Daftar gratis dengan username dan email aktif.',
    href: '/register',
    cta: 'Daftar sekarang',
  },
  {
    title: 'Isi saldo',
    text: 'Bayar lewat QRIS, saldo masuk otomatis ke akun.',
    href: '/dashboard/deposit',
    cta: 'Ke deposit',
  },
  {
    title: 'Pesan produk',
    text: 'Pilih produk lalu checkout langsung dari dashboard.',
    href: '/#katalog',
    cta: 'Lihat katalog',
  },
] as const;

function usePublicStats(): Stats | null {
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
        /* biarkan null */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return stats;
}

function Ticker({
  items,
  duration,
}: {
  items: string[];
  duration: string;
}) {
  if (items.length === 0) return null;
  return (
    <div
      aria-hidden
      className="marquee-band overflow-hidden border-y border-line/70 bg-content/[0.03] py-2.5"
    >
      <div
        className="marquee-track flex w-max"
        style={{ '--marquee-duration': duration } as CSSProperties}
      >
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0 items-center gap-6 pr-6">
            {items.map((text, index) => (
              <span
                key={index}
                className="flex items-center gap-6 font-mono text-[11px] uppercase tracking-[0.18em] text-content-faint"
              >
                <span>{text}</span>
                <span className="text-accent" aria-hidden>
                  ✦
                </span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex items-baseline gap-3 text-sm">
      <span className="text-content-muted">{label}</span>
      <span aria-hidden className="h-0 flex-1 -translate-y-1 border-b border-dotted border-line" />
      <span className="font-mono font-semibold text-content">
        {value === null ? <span className="text-content-faint">—</span> : value}
      </span>
    </div>
  );
}

function StatusTicket({
  storeName,
  stats,
  helpHref,
  helpChip,
}: {
  storeName: string;
  stats: Stats | null;
  helpHref: string | null;
  helpChip: string;
}) {
  return (
    <div className="relative rounded-2xl border border-line/70 bg-surface-raised p-5 shadow-soft lg:-rotate-[1.2deg] lg:transition-transform lg:duration-300 lg:hover:rotate-0">
      <div className="flex items-center justify-between">
        <span className="label-mono">Status toko</span>
        <span className="flex items-center gap-1.5 font-mono text-[11px] text-emerald-500">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" aria-hidden />
          ONLINE
        </span>
      </div>

      <p className="mt-3 truncate text-lg font-semibold text-content">
        {storeName || 'Toko ini'}
      </p>

      <div className="mt-4 flex flex-col gap-3">
        <StatRow label="Produk aktif" value={stats?.activeProducts ?? null} />
        <StatRow label="Order selesai" value={stats?.completedOrders ?? null} />
        <StatRow label="Panel aktif" value={stats?.activePanels ?? null} />
      </div>

      {helpHref ? (
        <a
          href={helpHref}
          target="_blank"
          rel="noopener noreferrer"
          className="group mt-5 flex items-center justify-between gap-3 rounded-xl border border-line/70 bg-content/[0.03] px-3.5 py-3 text-xs font-medium text-content transition-colors hover:border-accent hover:text-accent"
        >
          {helpChip}
          <ArrowRight
            aria-hidden
            size={14}
            className="text-content-faint transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
          />
        </a>
      ) : null}
    </div>
  );
}

function SectionHead({ num, title, desc }: { num: string; title: string; desc?: string }) {
  return (
    <div className="mb-8 flex items-end gap-4 border-b border-line/70 pb-5">
      <span
        aria-hidden
        className="font-mono text-5xl font-bold leading-[0.8] text-transparent sm:text-6xl"
        style={{ WebkitTextStroke: '1.5px var(--accent)' }}
      >
        {num}
      </span>
      <div className="min-w-0">
        <h2 className="text-2xl font-semibold leading-tight text-content sm:text-3xl">{title}</h2>
        {desc ? <p className="mt-1 max-w-xl text-sm text-content-muted">{desc}</p> : null}
      </div>
    </div>
  );
}

export function HomeContent() {
  const { settings, assets } = useSettings();
  const reduceMotion = useReducedMotion();
  const stats = usePublicStats();
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [bubbleOpen, setBubbleOpen] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [catalogState, setCatalogState] = useState<'loading' | 'ready' | 'error'>('loading');

  const loadCatalog = async () => {
    setCatalogState('loading');
    try {
      const [pRes, cRes] = await Promise.all([
        fetch('/api/products', { cache: 'no-store' }),
        fetch('/api/categories', { cache: 'no-store' }),
      ]);
      const pData = (await pRes.json()) as { products?: ProductListItem[] };
      const cData = (await cRes.json()) as { categories?: CategoryItem[] };
      setProducts(Array.isArray(pData.products) ? pData.products : []);
      setCategories(Array.isArray(cData.categories) ? cData.categories : []);
      setCatalogState('ready');
    } catch {
      setCatalogState('error');
    }
  };

  useEffect(() => {
    void loadCatalog();
  }, []);

  const filtered = useMemo(() => {
    if (!selectedCategory) return [];
    return products.filter((p) => p.categoryId === selectedCategory);
  }, [products, selectedCategory]);

  const category = categories.find((c) => c.id === selectedCategory);

  if (!settings) return null;
  const { home, faq, contact, identity, systemTexts } = settings;

  const helpHref =
    contactHref(contact.whatsapp) ?? contactHref(contact.telegram) ?? contactHref(contact.email);

  const chips = [
    { text: home.chip1, href: CHIP_LINKS[0] },
    { text: home.chip2, href: CHIP_LINKS[1] },
    { text: home.chip3, href: CHIP_LINKS[2] },
  ].filter((chip) => chip.text.trim());

  const tickerItems = [
    identity.storeName.trim(),
    ...(stats
      ? [
          `Produk aktif ${stats.activeProducts}`,
          `Order selesai ${stats.completedOrders}`,
          `Panel aktif ${stats.activePanels}`,
        ]
      : []),
    identity.tagline.trim(),
  ].filter(Boolean);

  const closeBubble = () => {
    setBubbleOpen(false);
    try {
      sessionStorage.setItem('help-bubble-closed', '1');
    } catch {
      /* abaikan */
    }
  };

  const rise = (delay = 0) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.45, delay, ease: 'easeOut' as const },
        };

  function productName(product: ProductListItem): string {
    return typeof product.name === 'string' && product.name ? product.name : product.id;
  }

  function productDescription(product: ProductListItem): string | null {
    return typeof product.description === 'string' && product.description.trim()
      ? product.description
      : null;
  }

  function productImage(product: ProductListItem): string | null {
    return typeof product.image === 'string' && product.image
      ? `/api/asset/${product.image}`
      : null;
  }

  return (
    <>
      {/* HERO — asimetris, kiri tipografi besar, kanan tiket status */}
      <section>
        <div className="mx-auto max-w-6xl px-4 pb-12 pt-12 sm:px-6 sm:pt-16">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start lg:gap-14">
            <div className="lg:col-span-7">
              <motion.p {...rise(0)} className="label-mono flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                {home.eyebrow}
              </motion.p>

              <motion.h1
                {...rise(0.06)}
                className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight text-content sm:text-5xl xl:text-6xl"
              >
                {home.headline1}
                <span
                  className="ml-3 mt-2 inline-block -rotate-[0.8deg] rounded-[7px] bg-accent px-2.5 pb-1 pt-0.5"
                  style={{ color: 'var(--accent-contrast)' }}
                >
                  {home.headline2}
                </span>
              </motion.h1>

              {home.subtext ? (
                <motion.p
                  {...rise(0.12)}
                  className="mt-6 max-w-xl text-base leading-relaxed text-content-muted sm:text-lg"
                >
                  {home.subtext}
                </motion.p>
              ) : null}

              <motion.div {...rise(0.18)} className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
                {selectedCategory ? (
                  <Link
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setSelectedCategory(null);
                    }}
                    className="btn-accent inline-flex min-h-[50px] items-center gap-2 rounded-full px-7 text-sm font-medium"
                  >
                    <ArrowLeft aria-hidden size={16} />
                    Kembali ke kategori
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/#katalog"
                      className="btn-accent inline-flex min-h-[50px] items-center gap-2 rounded-full px-7 text-sm font-medium"
                    >
                      {home.ctaPrimary}
                      <ArrowRight aria-hidden size={16} />
                    </Link>
                    <Link
                      href="/register"
                      className="group inline-flex min-h-[44px] items-center gap-1.5 border-b-2 border-line px-1 text-sm font-medium text-content transition-colors hover:border-accent"
                    >
                      {home.ctaSecondary}
                      <ArrowRight
                        aria-hidden
                        size={15}
                        className="text-content-faint transition-all group-hover:translate-x-0.5 group-hover:text-accent"
                      />
                    </Link>
                  </>
                )}

                {chips.length > 0 ? (
                  <motion.ul
                    {...rise(0.24)}
                    className="mt-8 flex flex-wrap gap-2"
                    aria-label="Pintasan"
                  >
                    {chips.map((chip) => (
                      <li key={chip.text}>
                        <Link
                          href={chip.href}
                          className="inline-flex min-h-[38px] items-center gap-2 rounded-md border border-line/70 bg-content/[0.02] px-3.5 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-content-muted transition-colors hover:border-accent hover:text-content"
                        >
                          <span className="text-accent" aria-hidden>
                            //
                          </span>
                          {chip.text}
                        </Link>
                      </li>
                    ))}
                  </motion.ul>
                ) : null}
              </motion.div>

              {assets.banner ? (
                <motion.div {...rise(0.3)} className="mt-10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/api/asset/branding/banner"
                    alt="Banner"
                    className="w-full rounded-2xl border border-line object-cover"
                  />
                </motion.div>
              ) : null}
            </div>

            <motion.div {...rise(0.2)} className="lg:col-span-5">
              <StatusTicket
                storeName={identity.storeName}
                stats={stats}
                helpHref={helpHref}
                helpChip={home.helpChip}
              />
            </motion.div>
          </div>

          {assets.banner ? (
            <motion.div {...rise(0.3)} className="mt-10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/api/asset/branding/banner"
                alt="Banner"
                className="w-full rounded-2xl border border-line object-cover"
              />
            </motion.div>
          ) : null}
        </div>

        <Ticker items={tickerItems} duration="42s" />
      </section>

      {/* KATALOG — Kategori dulu, baru produk */}
      <section id="katalog" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14 sm:px-6">
        <SectionHead
          num="01"
          title={systemTexts.menu.products}
          desc="Pilih kategori untuk melihat produk yang tersedia."
        />

        {catalogState === 'loading' ? (
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-9 w-24 rounded-full" />
            ))}
          </div>
        ) : catalogState === 'error' ? (
          <EmptyState
            icon={RefreshCw}
            title="Gagal memuat katalog"
            description="Periksa koneksi lalu coba lagi."
            action={
              <Button variant="outline" size="sm" onClick={() => void loadCatalog()}>
                Coba lagi
              </Button>
            }
          />
        ) : !selectedCategory ? (
          <div className="mt-8">
            {categories.length === 0 ? (
              <EmptyState
                icon={Folder}
                title="Belum ada kategori"
                description="Kategori produk akan tersedia setelah ditambahkan admin."
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {categories.map((cat, index) => {
                  const catProducts = products.filter((p) => p.categoryId === cat.id);
                  return (
                    <motion.div
                      key={cat.id}
                      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-30px' }}
                      transition={{
                        duration: 0.35,
                        delay: Math.min(index * 0.06, 0.3),
                        ease: 'easeOut',
                      }}
                      className="h-full"
                    >
                      <Link
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setSelectedCategory(cat.id);
                        }}
                        className="block h-full"
                      >
                        <article className="group relative h-full flex flex-col overflow-hidden rounded-3xl border border-line/60 bg-content/5 hover:border-accent/50 hover:bg-content/10 transition-all duration-300">
                          <div className="relative aspect-[16/9] overflow-hidden rounded-t-3xl bg-content/10">
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Folder aria-hidden size={48} className="text-content-muted/50 group-hover:text-accent transition-colors" />
                            </div>
                            <span className="absolute left-3 top-3 rounded-full bg-accent px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-white">
                              {catProducts.length} produk
                            </span>
                          </div>
                          <div className="p-5">
                            <h3 className="text-lg font-semibold text-content">{cat.name}</h3>
                            <p className="mt-1 text-sm text-content-muted">
                              {catProducts.length} produk tersedia di kategori ini
                            </p>
                            <div className="mt-auto flex items-center gap-2 text-xs">
                              <ArrowRight aria-hidden size={14} className="text-accent group-hover:translate-x-1 transition-transform" />
                              <span className="font-medium text-content">Lihat produk</span>
                            </div>
                          </div>
                        </article>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-8">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCategory(null)}
                >
                  <ArrowLeft aria-hidden size={14} />
                  Kembali ke kategori
                </Button>
              </div>
              <div className="flex flex-col gap-1">
                <p className="label-mono">Kategori: {category?.name ?? 'Produk'}</p>
                <h1 className="mt-0 text-2xl font-semibold text-content">
                  {filtered.length} Produk
                </h1>
              </div>
            </div>

            {filtered.length === 0 ? (
              <EmptyState
                icon={PackageOpen}
                title="Tidak ada produk pada kategori ini"
                description="Coba pilih kategori lain."
                action={
                  <Button variant="outline" size="sm" onClick={() => setSelectedCategory(null)}>
                    Kembali ke kategori
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((product, index) => {
                  const description = productDescription(product);
                  const card = (
                    <article className="glass group flex h-full flex-col overflow-hidden rounded-2xl transition-all duration-200 hover:-translate-y-1 hover:shadow-soft">
                      <div className="relative aspect-[16/10] overflow-hidden">
                        <ProductImage
                          src={productImage(product)}
                          alt={productName(product)}
                          className="h-full w-full transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                        <span className="absolute left-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-white backdrop-blur-sm">
                          Kategori
                        </span>
                      </div>
                      <div className="flex flex-1 flex-col gap-2 p-4">
                        <h3 className="text-sm font-semibold text-content">{productName(product)}</h3>
                        {description ? (
                          <p className="line-clamp-2 text-xs leading-relaxed text-content-muted">
                            {description}
                          </p>
                        ) : null}
                        <div className="mt-auto flex items-center justify-between gap-3 pt-2">
                          {typeof product.price === 'number' ? (
                            <span className="text-base font-semibold text-accent">
                              {formatRupiah(product.price)}
                            </span>
                          ) : (
                            <span className="text-xs text-content-faint">Hubungi untuk harga</span>
                          )}
                          <span className="inline-flex items-center gap-1 text-xs text-content-muted transition-colors group-hover:text-accent">
                            Lihat detail
                            <ArrowRight
                              aria-hidden
                              size={13}
                              className="transition-transform duration-200 group-hover:translate-x-0.5"
                            />
                          </span>
                        </div>
                      </div>
                    </article>
                  );

                  return (
                    <motion.div
                      key={product.id}
                      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-30px' }}
                      transition={{
                        duration: 0.35,
                        delay: Math.min(index * 0.06, 0.3),
                        ease: 'easeOut',
                      }}
                      className="h-full"
                    >
                      <Link
                        href={`/produk/${product.id}`}
                        className="block h-full"
                        aria-label={`Lihat detail ${productName(product)}`}
                      >
                        {card}
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {/* CARA PESAN — struk kasir */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <SectionHead
          num="02"
          title="Cara pesan"
          desc="Tiga langkah singkat dari daftar sampai produk aktif."
        />

        <div className="mx-auto max-w-xl">
          <div
            className="receipt px-6 py-8 sm:px-8"
            style={reduceMotion ? undefined : { transform: 'rotate(-0.6deg)' }}
          >
            <div className="text-center">
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.32em] text-content">
                Cara pesan
              </p>
              <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-content-faint">
                Checkout langsung dari dashboard
              </p>
            </div>

            <div className="my-6 border-t border-dashed border-line" />

            <ol className="flex flex-col gap-6">
              {STEPS.map((step, index) => (
                <motion.li
                  key={step.title}
                  {...(reduceMotion
                    ? {}
                    : {
                        initial: { opacity: 0, y: 10 },
                        whileInView: { opacity: 1, y: 0 },
                        viewport: { once: true, margin: '-40px' },
                        transition: {
                          duration: 0.35,
                          delay: index * 0.1,
                          ease: 'easeOut' as const,
                        },
                      })}
                >
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-xs font-semibold text-accent">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="text-sm font-semibold text-content">{step.title}</span>
                    <span
                      aria-hidden
                      className="h-0 flex-1 -translate-y-1 border-b border-dotted border-line"
                    />
                    <ArrowRight aria-hidden size={13} className="shrink-0 text-content-faint" />
                  </div>
                  <p className="mt-1.5 pl-7 text-sm leading-relaxed text-content-muted">
                    {step.text}
                  </p>
                  <Link
                    href={step.href}
                    className="ml-7 mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent transition-opacity hover:opacity-75"
                  >
                    {step.cta}
                    <ArrowRight aria-hidden size={12} />
                  </Link>
                </motion.li>
              ))}
            </ol>

            <div className="my-6 border-t border-dashed border-line" />

            <div className="flex items-baseline justify-between font-mono text-xs">
              <span className="uppercase tracking-[0.2em] text-content-faint">Total langkah</span>
              <span className="text-sm font-semibold text-content">03</span>
            </div>
            <p className="mt-5 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-content-faint">
              {identity.storeName.trim() || 'Terima kasih'}
            </p>
          </div>
        </div>
      </section>

      {/* STATUS LAYANAN */}
      <section id="status" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14 sm:px-6">
        <SectionHead
          num="03"
          title="Status layanan"
          desc="Pemeriksaan langsung ke Firebase, situs ini, dan setiap panel — diperbarui otomatis, bisa dilihat siapa saja."
        />
        <StatusBoard />
      </section>

      {/* FAQ */}
      {faq.length > 0 ? (
        <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-14 sm:px-6">
          <SectionHead
            num="04"
            title={systemTexts.menu.faq}
            desc="Pertanyaan yang sering diajukan pelanggan."
          />
          <div className="border-t border-line/70">
            {faq.map((item, index) => {
              const open = faqOpen === index;
              return (
                <div key={item.id} className="border-b border-line/70">
                  <button
                    type="button"
                    onClick={() => setFaqOpen(open ? null : index)}
                    aria-expanded={open}
                    className="group flex min-h-[56px] w-full items-center justify-between gap-4 px-1 py-4 text-left transition-colors hover:bg-content/[0.025]"
                  >
                    <span className="flex items-baseline gap-4">
                      <span className="font-mono text-xs text-content-faint">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="text-sm font-medium text-content transition-colors group-hover:text-accent">
                        {item.q}
                      </span>
                    </span>
                    <span
                      aria-hidden
                      className="font-mono text-lg leading-none text-content-faint transition-colors group-hover:text-accent"
                    >
                      {open ? '−' : '+'}
                    </span>
                  </button>
                  {open ? (
                    <p className="whitespace-pre-line px-1 pb-5 pl-9 pr-8 text-sm leading-relaxed text-content-muted">
                      {item.a}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {helpHref && bubbleOpen ? (
        <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
          <div className="glass-strong relative max-w-[240px] rounded-2xl px-4 py-3 text-sm text-content shadow-lift">
            {home.helpBubble}
            <button
              type="button"
              onClick={closeBubble}
              aria-label="Tutup pesan bantuan"
              className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full text-content-faint transition-colors hover:bg-content/10 hover:text-content"
            >
              <X aria-hidden size={14} />
            </button>
          </div>
          <a
            href={helpHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={home.helpChip}
            title={home.helpChip}
            className="btn-accent flex h-14 w-14 items-center justify-center rounded-full shadow-lift"
          >
            <Headset aria-hidden size={22} />
          </a>
        </div>
      ) : helpHref ? (
        <a
          href={helpHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={home.helpChip}
          title={home.helpChip}
          className="btn-accent fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lift"
        >
          <Headset aria-hidden size={22} />
        </a>
      ) : null}
    </>
  );
}
