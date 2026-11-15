import { get } from '@/lib/rtdb';
import { requireAdmin } from '@/lib/authz';
import { decryptSecret } from '@/lib/crypto';
import { listNestsAndEggs } from '@/lib/pterodactyl';
import type { PanelDoc } from '@/app/api/admin/panels/route';

export const dynamic = 'force-dynamic';

/**
 * GET: daftar nest & egg dari panel (untuk dropdown konfigurasi produk).
 * VERIFIKASI: endpoint nests/eggs berlaku di Pterodactyl v1 (hilang di v2 —
 * bila 404, admin dapat mengisi eggId secara manual).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const session = await requireAdmin();
  if (!session) {
    return Response.json({ error: 'Hanya admin.' }, { status: 403 });
  }

  const { id } = await params;
  try {
    const doc = await get<PanelDoc>(`panels/${id}`);
    if (!doc) {
      return Response.json({ error: 'Panel tidak ditemukan.' }, { status: 404 });
    }
    const nests = await listNestsAndEggs({
      baseUrl: doc.baseUrl,
      apiKey: decryptSecret(doc.apiKeyEnc),
    });
    return Response.json({ nests }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memuat nest/egg panel.';
    return Response.json({ error: message }, { status: 502 });
  }
}
