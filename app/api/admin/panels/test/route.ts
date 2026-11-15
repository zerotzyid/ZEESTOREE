import { z } from 'zod';
import { get } from '@/lib/rtdb';
import { requireAdmin } from '@/lib/authz';
import { decryptSecret } from '@/lib/crypto';
import { testPanelConnection, type PteroPanel } from '@/lib/pterodactyl';
import type { PanelDoc } from '@/app/api/admin/panels/route';

export const dynamic = 'force-dynamic';

const bodySchema = z
  .object({ id: z.string().min(1).max(60).optional() })
  .refine((v) => Boolean(v.id), { message: 'Pilih panel yang diuji.' });

/**
 * POST: uji koneksi Application API ke panel.
 * Bila id dikirim, uji panel tersimpan; bila baseUrl/apiKey dikirim (tanpa id),
 * uji kredensial baru sebelum disimpan.
 */
export async function POST(request: Request): Promise<Response> {
  const session = await requireAdmin();
  if (!session) {
    return Response.json({ error: 'Hanya admin.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Permintaan tidak valid.' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.errors[0]?.message ?? 'Input tidak valid.' },
      { status: 400 }
    );
  }

  try {
    let panel: PteroPanel;
    if (parsed.data.id) {
      const doc = await get<PanelDoc>(`panels/${parsed.data.id}`);
      if (!doc) {
        return Response.json({ error: 'Panel tidak ditemukan.' }, { status: 404 });
      }
      panel = { baseUrl: doc.baseUrl, apiKey: decryptSecret(doc.apiKeyEnc) };
    } else {
      return Response.json({ error: 'id panel wajib diisi.' }, { status: 400 });
    }

    const result = await testPanelConnection(panel);
    if (result.ok) {
      return Response.json({ ok: true, users: result.users });
    }
    return Response.json({ ok: false, error: result.error }, { status: 502 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Uji koneksi gagal.';
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
