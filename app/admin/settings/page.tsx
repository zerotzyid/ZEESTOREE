import { getSettings } from '@/lib/settings';
import { SettingsClient } from '@/components/admin/settings-client';
import { DEFAULT_SETTINGS } from '@/lib/settings-defaults';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const settings = await getSettings().catch(() => structuredClone(DEFAULT_SETTINGS));
  return <SettingsClient initial={settings} />;
}
