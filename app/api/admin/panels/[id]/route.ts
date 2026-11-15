import { z } from 'zod';
import { get, remove, set } from '@/lib/rtdb';
import { requireAdmin } from '@/lib/authz';
import { encryptSecret } from '@/lib/crypto';
import { writeLog } from '@/lib/log';
import type { PanelDoc } from '@/app/api/admin/panels/route';

export const dynamic = 'force-dynamic';

const patchSchema = z
  .object({
    name: z.string().trim().min(1).max(60).optional(),
    baseUrl: z
      .string()
      .trim()
      .min(8)
      .max(200)
      .refine((v) => /^https?:\/\/\S+$/i.test(v), { message: 'URL panel harus diawali http(s)://.' })
      .optional(),
    apiKey: z.string().trim().min(8).max(300).optional(),
    capiKey: z.string().trim().min(8).max(300).optional(),
    active: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Tidak ada perubahan.' });

/** PATCH: ubah panel (API key baru dienkripsi ulang; key lama dipertahankan bila kosong). */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const session = await requireAdmin();
  if (!session) {
    return Response.json({ error: 'Hanya admin.' }, { status: 403 });
  }

  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{1,60}$/.test(id)) {
    return Response.json({ error: 'Id panel tidak valid.' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Permintaan tidak valid.' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.errors[0]?.message ?? 'Input tidak valid.' },
      { status: 400 }
    );
  }

  try {
    const existing = await get<PanelDoc>(`panels/${id}`);
    if (!existing) {
      return Response.json({ error: 'Panel tidak ditemukan.' }, { status: 404 });
    }

    const fields: Record<string, unknown> = { ...parsed.data, updatedAt: Date.now() };
    if ('baseUrl' in fields && typeof fields.baseUrl === 'string') {
      fields.baseUrl = fields.baseUrl.replace(/\/+$/, '');
    }
    if (fields.apiKey) {
      fields.apiKeyEnc = encryptSecret(String(fields.apiKey));
    }
    delete fields.apiKey;
    if (fields.capiKey) {
      fields.capiKeyEnc = encryptSecret(String(fields.capiKey));
    }
    delete fields.capiKey;

    for (const [field, value] of Object.entries(fields)) {
      await set(`panels/${id}/${field}`, value as never);
    }
    await writeLog({
      actor: session.username,
      action: 'panel.update',
      detail: `${id} · ${Object.keys(parsed.data).join(', ')}`,
    });
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal mengubah panel.';
    return Response.json({ error: message }, { status: 500 });
  }
}

/** DELETE: hapus panel. Produk yang menunjuk panel ini otomatis jadi tanpa panel (provision null). */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const session = await requireAdmin();
  if (!session) {
    return Response.json({ error: 'Hanya admin.' }, { status: 403 });
  }

  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{1,60}$/.test(id)) {
    return Response.json({ error: 'Id panel tidak valid.' }, { status: 400 });
  }

  try {
    const existing = await get<PanelDoc>(`panels/${id}`);
    if (!existing) {
      return Response.json({ error: 'Panel tidak ditemukan.' }, { status: 404 });
    }

    const products = await get<Record<string, { provision?: { panelId?: string } | null }>>('products');
    const multi: Record<string, null> = { [`panels/${id}`]: null };
    if (products) {
      for (const [productId, doc] of Object.entries(products)) {
        if (doc?.provision?.panelId === id) {
          multi[`products/${productId}/provision`] = null;
        }
      }
    }
    const { update } = await import('@/lib/rtdb');
    await update('', multi);

    await writeLog({ actor: session.username, action: 'panel.delete', detail: `${id} · ${existing.name}` });
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal menghapus panel.';
    return Response.json({ error: message }, { status: 500 });
  }
}
