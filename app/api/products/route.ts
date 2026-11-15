import { get } from '@/lib/rtdb';

export const dynamic = 'force-dynamic';

type ProductDoc = Record<string, unknown>;

export async function GET(): Promise<Response> {
  try {
    const products = await get<Record<string, ProductDoc>>('products');
    if (!products) {
      return Response.json({ products: [] }, { headers: { 'Cache-Control': 'no-store' } });
    }
    const list = Object.entries(products)
      .filter(([, doc]) => doc && typeof doc === 'object' && doc.active !== false)
      .map(([id, doc]) => ({ id, ...doc }));
    return Response.json({ products: list }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memuat produk.';
    return Response.json({ error: message }, { status: 500 });
  }
}
