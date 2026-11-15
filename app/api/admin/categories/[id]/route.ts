import { get, remove, update } from '@/lib/rtdb';
import { requireAdmin } from '@/lib/authz';
import { categoryPatchSchema } from '@/lib/validators';
import { writeLog } from '@/lib/log';
import type { CategoryDoc } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

/** PATCH: ubah nama/urutan/status kategori. */
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
    return Response.json({ error: 'Id kategori tidak valid.' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Permintaan tidak valid.' }, { status: 400 });
  }

  const parsed = categoryPatchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.errors[0]?.message ?? 'Input tidak valid.' },
      { status: 400 }
    );
  }

  try {
    const existing = await get<CategoryDoc>(`categories/${id}`);
    if (!existing) {
      return Response.json({ error: 'Kategori tidak ditemukan.' }, { status: 404 });
    }
    await update('', Object.fromEntries(Object.entries(parsed.data).map(([k, v]) => [`categories/${id}/${k}`, v])));
    await writeLog({
      actor: session.username,
      action: 'category.update',
      detail: `${id} · ${Object.keys(parsed.data).join(', ')}`,
    });
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal mengubah kategori.';
    return Response.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE: hapus kategori. Referensi produk ke kategori ini di-null-kan
 * dalam satu multi-path PATCH agar tidak ada relasi menggantung.
 */
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
    return Response.json({ error: 'Id kategori tidak valid.' }, { status: 400 });
  }

  try {
    const existing = await get<CategoryDoc>(`categories/${id}`);
    if (!existing) {
      return Response.json({ error: 'Kategori tidak ditemukan.' }, { status: 404 });
    }

    const products = await get<Record<string, { categoryId?: string | null }>>('products');
    const multi: Record<string, null> = { [`categories/${id}`]: null };
    if (products) {
      for (const [productId, doc] of Object.entries(products)) {
        if (doc && doc.categoryId === id) {
          multi[`products/${productId}/categoryId`] = null;
        }
      }
    }
    await update('', multi);

    await writeLog({
      actor: session.username,
      action: 'category.delete',
      detail: `${id} · ${existing.name}`,
    });
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal menghapus kategori.';
    return Response.json({ error: message }, { status: 500 });
  }
}
