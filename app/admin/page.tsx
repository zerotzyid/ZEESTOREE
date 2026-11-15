import { getSettings } from '@/lib/settings';
import { AdminOverview } from '@/components/admin/overview';
import { FadeIn } from '@/components/anim';

export const dynamic = 'force-dynamic';

export default async function AdminHomePage() {
  let storeName = '';
  try {
    const settings = await getSettings();
    storeName = settings.identity.storeName;
  } catch {
    storeName = '';
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <FadeIn y={8}>
        <div className="flex flex-col gap-1">
          <p className="label-mono">Admin</p>
          <h1 className="text-2xl font-semibold text-content">Ringkasan</h1>
          {storeName ? <p className="text-sm text-content-muted">{storeName}</p> : null}
        </div>
      </FadeIn>
      <AdminOverview />
    </div>
  );
}
