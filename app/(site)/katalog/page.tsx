'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Folder, PackageOpen, RefreshCw } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useSettings } from '@/components/settings-provider';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ProductImage } from '@/components/product-image';
import { cn } from '@/lib/cn';
import { formatRupiah } from '@/lib/format';

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

export default function KatalogPage() {
  const { settings } = useSettings();
  const reduceMotion = useReducedMotion();
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const load = async () => {
    setState('loading');
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        fetch('/api/products', { cache: 'no-store' }),
        fetch('/api/categories', { cache: 'no-store' }),
      ]);
      if (!productsRes.ok) throw new Error('Gagal memuat produk.');
      const productsData = (await productsRes.json()) as { products?: ProductListItem[] };
      const categoriesData = categoriesRes.ok
        ? ((await categoriesRes.json()) as { categories?: CategoryItem[] })
        : { categories: [] };
      setProducts(Array.isArray(productsData.products) ? productsData.products : []);
      setCategories(Array.isArray(categoriesData.categories) ? categoriesData.categories : []);
      setState('ready');
    } catch {
      setState('error');
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    if (!selectedCategory) return [];
    return products.filter((product) => product.categoryId === selectedCategory);
  }, [products, selectedCategory]);

  const category = categories.find((c) => c.id === selectedCategory);

  if (state === 'loading') {
    return (
      <div className="flex flex-col gap-5" aria-busy>
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-56 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <EmptyState
          icon={RefreshCw}
          title="Gagal memuat katalog"
          description="Periksa koneksi lalu coba lagi."
          action={
            <Button variant="outline" size="sm" onClick={() => void load()}>
              Coba lagi
            </Button>
          }
        />
      </div>
    );
  }

  // Category selection view
  if (!selectedCategory) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <FadeInWrapper>
          <p className="label-mono">Kategori Produk</p>
          <h1 className="mt-2 text-3xl font-semibold text-content">Pilih Kategori</h1>
          <p className="mt-2 max-w-2xl text-sm text-content-muted">
            Pilih kategori untuk melihat produk yang tersedia.
          </p>
        </FadeInWrapper>

        {categories.length === 0 ? (
          <EmptyState
            icon={Folder}
            title="Belum ada kategori"
            description="Kategori produk akan tersedia setelah ditambahkan admin."
          />
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat, index) => {
              const catProducts = products.filter((p) => p.categoryId === cat.id);
              return (
                <motion.div
                  key={cat.id}
                  initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-30px' }}
                  transition={{ duration: 0.35, delay: Math.min(index * 0.06, 0.3), ease: 'easeOut' }}
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
                        <span className="absolute left-3 top-3 rounded-full bg-accent px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-accent">
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
    );
  }

  // Product list view for selected category
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
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
          <h1 className="mt-0 text-2xl font-semibold text-content">{filtered.length} Produk</h1>
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
                transition={{ duration: 0.35, delay: Math.min(index * 0.06, 0.3), ease: 'easeOut' }}
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
  );
}

function FadeInWrapper({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  const animation = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.24 },
      };
  return <motion.div {...animation}>{children}</motion.div>;
}
