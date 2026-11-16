import { get } from '@/lib/rtdb';

export const dynamic = 'force-dynamic';

const NAME_RE = /^[a-zA-Z0-9_.\-/]{1,120}$/;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ nama: string[] }> }
): Promise<Response> {
  const { nama } = await params;
  const name = nama.join('/');
  if (!NAME_RE.test(name)) {
    return new Response('Nama aset tidak valid.', { status: 400 });
  }

  try {
    const dataUrl = await get<string>(`assets/${name}`);
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
      return new Response('Aset tidak ditemukan.', { status: 404 });
    }
    const comma = dataUrl.indexOf(',');
    const header = dataUrl.slice(0, comma);
    const base64 = dataUrl.slice(comma + 1);
    const mime = header.slice('data:'.length).split(';')[0] ?? 'image/png';
    const buffer = Buffer.from(base64, 'base64');
    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': mime,
        'Content-Length': String(buffer.byteLength),
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memuat aset.';
    return new Response(message, { status: 500 });
  }
}
