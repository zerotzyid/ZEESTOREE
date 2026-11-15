import { getStatusPayload } from '@/lib/status';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/** Status uptime publik: Firebase, situs, dan semua panel. Tanpa cron (on-demand + cache 90 dtk). */
export async function GET(request: Request): Promise<Response> {
  try {
    const origin = new URL(request.url).origin;
    const payload = await getStatusPayload(origin);
    return Response.json(payload, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memeriksa status.';
    return Response.json({ error: message }, { status: 500 });
  }
}
