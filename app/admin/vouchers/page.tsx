import { VouchersClient } from '@/components/admin/vouchers-client';
import { FadeIn } from '@/components/anim';

export const dynamic = 'force-dynamic';

export default function AdminVouchersPage() {
  return (
    <div className="flex flex-col gap-6">
      <FadeIn y={8}>
        <div className="flex flex-col gap-1">
          <p className="label-mono">Voucher</p>
          <h1 className="text-2xl font-semibold text-content">Manajemen Voucher</h1>
          <p className="text-sm text-content-muted">
            Buat dan atur voucher saldo, diskon, atau produk gratis untuk pelanggan.
          </p>
        </div>
      </FadeIn>
      <VouchersClient />
    </div>
  );
}
