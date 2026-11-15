import { requireAdmin } from '@/lib/authz';
import { getProfile } from '@/lib/pixpayz';
import { writeLog } from '@/lib/log';

export const dynamic = 'force-dynamic';

/** Tes koneksi ke Pixpayz lewat GET /api/profile (dokumentasi resmi). */
export async function POST(): Promise<Response> {
  const session = await requireAdmin();
  if (!session) {
    return Response.json({ error: 'Hanya admin.' }, { status: 403 });
  }

  try {
    const profile = await getProfile();
    await writeLog({ actor: session.username, action: 'payment_config.test' });
    return Response.json({ ok: true, profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Koneksi gagal.';
    return Response.json({ error: message }, { status: 502 });
  }
}
