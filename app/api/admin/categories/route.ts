import { get, push } from '@/lib/rtdb';
import { requireAdmin } from '@/lib/authz';
import { categoryCreateSchema } from '@/lib/validators';
import { writeLog } from '@/lib/log';
import type { CategoryDoc } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

/** GET: seluruh kategori (untuk filter katalog & form admin). */
export async function GET(): Promise<Response> {
  try {
    const categories = await get<Record<string, CategoryDoc>>('categories');
    const list = categories
      ? Object.entries(categories)
          .filter(([, doc]) => doc && typeof doc === 'object')
          .map(([id, doc]) => ({ id, ...doc }))
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      : [];
    return Response.json({ categories: list }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memuat kategori.';
    return Response.json({ error: message }, { status: 500 });
  }
}

/** POST: buat kategori baru. */
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

  const parsed = categoryCreateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.errors[0]?.message ?? 'Input tidak valid.' },
      { status: 400 }
    );
  }

  try {
    const id = await push('categories', {
      name: parsed.data.name,
      order: parsed.data.order,
      active: parsed.data.active,
      createdAt: Date.now(),
    });
    await writeLog({
      actor: session.username,
      action: 'category.create',
      detail: `${id} · ${parsed.data.name}`,
    });
    return Response.json({ ok: true, id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal membuat kategori.';
    return Response.json({ error: message }, { status: 500 });
  }
}
