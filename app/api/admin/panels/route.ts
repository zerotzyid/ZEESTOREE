import { z } from 'zod';
import { get, push, remove, set } from '@/lib/rtdb';
import { requireAdmin } from '@/lib/authz';
import { encryptSecret } from '@/lib/crypto';
import { writeLog } from '@/lib/log';

export const dynamic = 'force-dynamic';

export type PanelDoc = {
  name: string;
  baseUrl: string;
  apiKeyEnc: string;
  active: boolean;
  createdAt: number;
  updatedAt: number;
};

const createSchema = z.object({
  name: z.string().trim().min(1, 'Nama panel wajib diisi.').max(60),
  baseUrl: z
    .string()
    .trim()
    .min(8, 'URL panel tidak valid.')
    .max(200)
    .refine((v) => /^https?:\/\/\S+$/i.test(v), { message: 'URL panel harus diawali http(s)://.' }),
  apiKey: z.string().trim().min(8, 'API key terlalu pendek.').max(300).optional(),
  active: z.boolean(),
});

const patchSchema = createSchema.partial().refine((v) => Object.keys(v).length > 0, {
  message: 'Tidak ada perubahan.',
});

function stripKey(doc: PanelDoc): Record<string, unknown> {
  const { apiKeyEnc: _omit, ...rest } = doc;
  return { ...rest, hasKey: Boolean(doc.apiKeyEnc) };
}

/** GET: daftar panel (API key tidak pernah dikirim keluar — hanya penanda hasKey). */
export async function GET(): Promise<Response> {
  const session = await requireAdmin();
  if (!session) {
    return Response.json({ error: 'Hanya admin.' }, { status: 403 });
  }

  try {
    const panels = await get<Record<string, PanelDoc>>('panels');
    const list = panels
      ? Object.entries(panels)
          .filter(([, doc]) => doc && typeof doc === 'object')
          .sort((a, b) => (a[1]?.createdAt ?? 0) - (b[1]?.createdAt ?? 0))
          .map(([id, doc]) => ({ id, ...stripKey(doc) }))
      : [];
    return Response.json({ panels: list }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memuat panel.';
    return Response.json({ error: message }, { status: 500 });
  }
}

/** POST: tambah panel Pterodactyl (API key dienkripsi). */
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

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.errors[0]?.message ?? 'Input tidak valid.' },
      { status: 400 }
    );
  }
  if (!parsed.data.apiKey) {
    return Response.json({ error: 'API key wajib diisi saat menambah panel.' }, { status: 400 });
  }

  try {
    const now = Date.now();
    const id = await push('panels', {
      name: parsed.data.name,
      baseUrl: parsed.data.baseUrl.replace(/\/+$/, ''),
      apiKeyEnc: encryptSecret(parsed.data.apiKey),
      active: parsed.data.active,
      createdAt: now,
      updatedAt: now,
    });
    await writeLog({
      actor: session.username,
      action: 'panel.create',
      detail: `${id} · ${parsed.data.name} · ${parsed.data.baseUrl}`,
    });
    return Response.json({ ok: true, id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal menyimpan panel.';
    return Response.json({ error: message }, { status: 500 });
  }
}
