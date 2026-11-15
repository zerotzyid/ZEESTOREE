import { ProductsClient } from '@/components/admin/products-client';
import { FadeIn } from '@/components/anim';

export const dynamic = 'force-dynamic';

export default function AdminProductsPage() {
  return (
    <div className="flex flex-col gap-6">
      <FadeIn y={8}>
        <div className="flex flex-col gap-1">
          <p className="label-mono">Katalog</p>
          <h1 className="text-2xl font-semibold text-content">Produk & Kategori</h1>
          <p className="text-sm text-content-muted">
            Kelola produk yang tampil di katalog publik beserta jenis, harga, dan gambarnya.
          </p>
        </div>
      </FadeIn>
      <ProductsClient />
    </div>
  );
}
