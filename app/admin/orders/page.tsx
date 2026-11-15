import { OrdersClient } from '@/components/admin/orders-client';
import { FadeIn } from '@/components/anim';

export const dynamic = 'force-dynamic';

export default function AdminOrdersPage() {
  return (
    <div className="flex flex-col gap-6">
      <FadeIn y={8}>
        <div className="flex flex-col gap-1">
          <p className="label-mono">Transaksi</p>
          <h1 className="text-2xl font-semibold text-content">Manajemen Order</h1>
          <p className="text-sm text-content-muted">
            Ubah status pesanan pelanggan atau kembalikan dana (refund) ke saldo mereka.
          </p>
        </div>
      </FadeIn>
      <OrdersClient />
    </div>
  );
}
