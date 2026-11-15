import { PanelsClient } from '@/components/admin/panels-client';
import { FadeIn } from '@/components/anim';

export const dynamic = 'force-dynamic';

export default function AdminPanelsPage() {
  return (
    <div className="flex flex-col gap-6">
      <FadeIn y={8}>
        <div className="flex flex-col gap-1">
          <p className="label-mono">Integrasi</p>
          <h1 className="text-2xl font-semibold text-content">Multi Panel</h1>
          <p className="text-sm text-content-muted">
            Kelola koneksi Pterodactyl (Application API) untuk pembuatan server otomatis saat
            checkout produk panel.
          </p>
        </div>
      </FadeIn>
      <PanelsClient />
    </div>
  );
}
