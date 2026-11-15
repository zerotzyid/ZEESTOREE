import { get, remove, set } from '@/lib/rtdb';
import { requireAdmin } from '@/lib/authz';
import { productPatchSchema } from '@/lib/validators';
import { writeLog } from '@/lib/log';
import type { ProductDoc } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

/** PATCH: ubah sebagian/all field produk. */
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
    return Response.json({ error: 'Id produk tidak valid.' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Permintaan tidak valid.' }, { status: 400 });
  }

  const parsed = productPatchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.errors[0]?.message ?? 'Input tidak valid.' },
      { status: 400 }
    );
  }

  try {
    const existing = await get<ProductDoc>(`products/${id}`);
    if (!existing) {
      return Response.json({ error: 'Produk tidak ditemukan.' }, { status: 404 });
    }

    if (parsed.data.categoryId) {
      const category = await get<unknown>(`categories/${parsed.data.categoryId}`);
      if (!category) {
        return Response.json({ error: 'Kategori tidak ditemukan.' }, { status: 400 });
      }
    }
    if (parsed.data.provision) {
      const panel = await get<unknown>(`panels/${parsed.data.provision.panelId}`);
      if (!panel) {
        return Response.json({ error: 'Panel pada konfigurasi provisioning tidak ditemukan.' }, { status: 400 });
      }
    }

    const patch = { ...parsed.data, updatedAt: Date.now() } as Record<string, unknown>;
    if ('categoryId' in patch) {
      patch.categoryId = patch.categoryId || null;
    }
    for (const [field, value] of Object.entries(patch)) {
      await set(`products/${id}/${field}`, value as never);
    }
    await writeLog({
      actor: session.username,
      action: 'product.update',
      detail: `${id} · ${Object.keys(parsed.data).join(', ')}`,
    });
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal mengubah produk.';
    return Response.json({ error: message }, { status: 500 });
  }
}

/** DELETE: hapus produk beserta gambarnya (aset products/<id>). */
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
    return Response.json({ error: 'Id produk tidak valid.' }, { status: 400 });
  }

  try {
    const existing = await get<ProductDoc>(`products/${id}`);
    if (!existing) {
      return Response.json({ error: 'Produk tidak ditemukan.' }, { status: 404 });
    }

    await remove(`products/${id}`);
    await remove(`assets/products/${id}`);
    await writeLog({ actor: session.username, action: 'product.delete', detail: `${id} · ${existing.name}` });
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal menghapus produk.';
    return Response.json({ error: message }, { status: 500 });
  }
}
