import { getSettings, getBrandingAssetNames } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  try {
    const [settings, assets] = await Promise.all([getSettings(), getBrandingAssetNames()]);
    return Response.json(
      { ...settings, assets },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memuat pengaturan.';
    return Response.json({ error: message }, { status: 500 });
  }
}
