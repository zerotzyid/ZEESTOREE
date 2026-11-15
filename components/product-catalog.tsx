'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, PackageOpen, RefreshCw } from 'lucide-react';
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

export function ProductCatalog() {
  const { settings } = useSettings();
  const reduceMotion = useReducedMotion();
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [selected, setSelected] = useState<string>('all');

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
    if (selected === 'all') return products;
    return products.filter((product) => product.categoryId === selected);
  }, [products, selected]);

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
      <EmptyState
        icon={RefreshCw}
        title="Gagal memuat produk"
        description="Periksa koneksi lalu coba lagi."
        action={
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Coba lagi
          </Button>
        }
      />
    );
  }

  if (products.length === 0) {
    return (
      <EmptyState
        icon={PackageOpen}
        title={settings?.systemTexts.messages.emptyProducts ?? 'Belum ada produk.'}
      />
    );
  }

  const showChips = categories.length > 0;

  return (
    <div className="flex flex-col gap-5">
      {showChips ? (
        <div
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
          role="tablist"
          aria-label="Filter kategori"
        >
          <button
            type="button"
            role="tab"
            aria-selected={selected === 'all'}
            onClick={() => setSelected('all')}
            className={cn(
              'min-h-[36px] shrink-0 rounded-full border px-4 text-xs font-medium transition-colors',
              selected === 'all'
                ? 'border-transparent bg-accent text-white'
                : 'border-line text-content-muted hover:text-content'
            )}
          >
            Semua
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              role="tab"
              aria-selected={selected === category.id}
              onClick={() => setSelected(category.id)}
              className={cn(
                'min-h-[36px] shrink-0 rounded-full border px-4 text-xs font-medium transition-colors',
                selected === category.id
                  ? 'border-transparent bg-accent text-white'
                  : 'border-line text-content-muted hover:text-content'
              )}
            >
              {category.name}
            </button>
          ))}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title="Tidak ada produk pada kategori ini"
          description="Pilih kategori lain."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((product, index) => {
            const category = product.categoryId
              ? categories.find((c) => c.id === product.categoryId)
              : undefined;
            const description = productDescription(product);
            const card = (
              <article className="glass group flex h-full flex-col overflow-hidden rounded-2xl transition-all duration-200 hover:-translate-y-1 hover:shadow-soft">
                <div className="relative aspect-[16/10] overflow-hidden">
                  <ProductImage
                    src={productImage(product)}
                    alt={productName(product)}
                    className="h-full w-full transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                  {category ? (
                    <span className="absolute left-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-white backdrop-blur-sm">
                      {category.name}
                    </span>
                  ) : null}
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
                  href={`/produk/${product.id}` as Route}
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
