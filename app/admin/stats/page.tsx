import { StatsClient } from '@/components/admin/stats-client';
import { FadeIn } from '@/components/anim';

export const dynamic = 'force-dynamic';

export default function AdminStatsPage() {
  return (
    <div className="flex flex-col gap-6">
      <FadeIn y={8}>
        <div className="flex flex-col gap-1">
          <p className="label-mono">Analitik</p>
          <h1 className="text-2xl font-semibold text-content">Statistik</h1>
          <p className="text-sm text-content-muted">
            Omzet, jumlah order, pengguna baru, dan grafik harian/bulanan dari data nyata.
          </p>
        </div>
      </FadeIn>
      <StatsClient />
    </div>
  );
}
