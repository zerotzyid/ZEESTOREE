import { ProductCatalog } from '@/components/product-catalog';
import { FadeIn } from '@/components/anim';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Katalog' };

export default function KatalogPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <FadeIn>
        <p className="label-mono">Katalog lengkap</p>
        <h1 className="mt-2 text-3xl font-semibold text-content">Semua produk</h1>
        <p className="mt-2 max-w-2xl text-sm text-content-muted">
          Harga, gambar, dan status produk diperbarui langsung dari dashboard admin.
        </p>
      </FadeIn>
      <div className="mt-8">
        <ProductCatalog />
      </div>
    </div>
  );
}
