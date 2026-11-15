import { LogsClient } from '@/components/admin/logs-client';
import { FadeIn } from '@/components/anim';

export const dynamic = 'force-dynamic';

export default function AdminLogsPage() {
  return (
    <div className="flex flex-col gap-6">
      <FadeIn y={8}>
        <div className="flex flex-col gap-1">
          <p className="label-mono">Riwayat</p>
          <h1 className="text-2xl font-semibold text-content">Log Aktivitas</h1>
          <p className="text-sm text-content-muted">
            Jejak aksi admin, pengguna, dan sistem (login, checkout, refund, perubahan data).
          </p>
        </div>
      </FadeIn>
      <LogsClient />
    </div>
  );
}
