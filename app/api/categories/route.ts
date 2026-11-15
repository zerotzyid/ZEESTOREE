import { get } from '@/lib/rtdb';

export const dynamic = 'force-dynamic';

type CategoryDoc = {
  name?: unknown;
  order?: unknown;
  active?: unknown;
};

export async function GET(): Promise<Response> {
  try {
    const categories = await get<Record<string, CategoryDoc>>('categories');
    if (!categories) {
      return Response.json({ categories: [] }, { headers: { 'Cache-Control': 'no-store' } });
    }
    const list = Object.entries(categories)
      .filter(([, doc]) => doc && typeof doc === 'object' && doc.active !== false)
      .map(([id, doc]) => ({
        id,
        name: typeof doc.name === 'string' ? doc.name : id,
        order: typeof doc.order === 'number' ? doc.order : 0,
      }))
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'id'));
    return Response.json({ categories: list }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memuat kategori.';
    return Response.json({ error: message }, { status: 500 });
  }
}
