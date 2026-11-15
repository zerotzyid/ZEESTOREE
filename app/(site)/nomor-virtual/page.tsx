import { Clock } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default async function NomorVirtualPage() {
  let message = 'Segera hadir.';
  try {
    const settings = await getSettings();
    message = settings.systemTexts.messages.comingSoonNokos || message;
  } catch {
    /* pakai pesan fallback bila RTDB belum terkonfigurasi */
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <EmptyState
        icon={Clock}
        title="Nomor Virtual"
        description={message}
        action={
          <a
            href="/"
            className="btn-accent inline-flex min-h-[44px] items-center rounded-full px-6 text-sm font-medium"
          >
            Kembali ke beranda
          </a>
        }
      />
    </div>
  );
}
