import { get, push } from '@/lib/rtdb';
import { requireAdmin } from '@/lib/authz';
import { productCreateSchema } from '@/lib/validators';
import { writeLog } from '@/lib/log';
import type { ProductDoc } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

/** GET: seluruh produk (aktif & nonaktif) untuk tabel admin. */
export async function GET(): Promise<Response> {
  const session = await requireAdmin();
  if (!session) {
    return Response.json({ error: 'Hanya admin.' }, { status: 403 });
  }

  try {
    const products = await get<Record<string, ProductDoc>>('products');
    const list = products
      ? Object.entries(products)
          .filter(([, doc]) => doc && typeof doc === 'object')
          .map(([id, doc]) => ({ id, ...doc }))
          .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
      : [];
    return Response.json({ products: list }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memuat produk.';
    return Response.json({ error: message }, { status: 500 });
  }
}

/** POST: buat produk baru. Gambar diunggah terpisah setelah id diketahui. */
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

  const parsed = productCreateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.errors[0]?.message ?? 'Input tidak valid.' },
      { status: 400 }
    );
  }

  try {
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

    const now = Date.now();
    const id = await push('products', {
      name: parsed.data.name,
      description: parsed.data.description,
      price: parsed.data.price,
      categoryId: parsed.data.categoryId || null,
      image: null,
      kind: parsed.data.kind,
      active: parsed.data.active,
      provision: parsed.data.provision ?? null,
      reseller: parsed.data.reseller ?? null,
      nokos: parsed.data.nokos ?? null,
      createdAt: now,
      updatedAt: now,
    });
    await writeLog({
      actor: session.username,
      action: 'product.create',
      detail: `${id} · ${parsed.data.name} · Rp${parsed.data.price}`,
    });
    return Response.json({ ok: true, id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal membuat produk.';
    return Response.json({ error: message }, { status: 500 });
  }
}
