import { get } from '@/lib/rtdb';

export const dynamic = 'force-dynamic';

const NAME_RE = /^[a-zA-Z0-9_.\-/]{1,120}$/;

type AssetRecord = {
  url?: string;
  file_name?: string;
  size?: number;
  uploadedAt?: number;
  uploadedBy?: string;
};

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
    const record = await get<AssetRecord>(`assets/${name}`);
    if (!record || !record.url) {
      return new Response('Aset tidak ditemukan.', { status: 404 });
    }

    // Redirect ke URL CDNZero publik
    return Response.redirect(record.url, 302);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memuat aset.';
    return new Response(message, { status: 500 });
  }
}
