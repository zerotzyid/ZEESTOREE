import { get, remove, set } from '@/lib/rtdb';
import { requireAdmin } from '@/lib/authz';
import { assetUploadSchema } from '@/lib/validators';
import { validateImageDataUrl } from '@/lib/image';
import { uploadImage } from '@/lib/cdn-zero';
import { writeLog } from '@/lib/log';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  const session = await requireAdmin();
  if (!session) {
    return Response.json({ error: 'Hanya admin yang dapat mengunggah aset.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Permintaan tidak valid.' }, { status: 400 });
  }

  const parsed = assetUploadSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.errors[0]?.message ?? 'Input tidak valid.' },
      { status: 400 }
    );
  }

  // Validasi format dan ukuran data URL (gunakan kind 'default' untuk bebas nama)
  const validation = validateImageDataUrl(parsed.data.dataUrl, 'default');
  if (!validation.ok) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  try {
    // Unggah ke CDNZero
    const cdnResult = await uploadImage(parsed.data.dataUrl);
    if (!cdnResult.success || !cdnResult.url) {
      return Response.json({ error: cdnResult.message ?? 'Gagal unggah ke CDN.' }, { status: 500 });
    }

    // Simpan mapping nama -> URL CDN di RTDB untuk pelacakan
    await set(`assets/${parsed.data.name}`, {
      url: cdnResult.url,
      file_name: cdnResult.file_name,
      size: cdnResult.size,
      uploadedAt: Date.now(),
      uploadedBy: session.username,
    } as never);
    await writeLog({
      actor: session.username,
      action: 'asset.upload',
      detail: `${parsed.data.name} -> ${cdnResult.url} (${validation.bytes} byte)`,
    });
    return Response.json({ ok: true, url: cdnResult.url, name: parsed.data.name });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal menyimpan gambar.';
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request): Promise<Response> {
  const session = await requireAdmin();
  if (!session) {
    return Response.json({ error: 'Hanya admin yang dapat menghapus aset.' }, { status: 403 });
  }

  const name = new URL(request.url).searchParams.get('name') ?? '';
  if (!/^[a-zA-Z0-9_.\-/]{1,120}$/.test(name)) {
    return Response.json({ error: 'Nama aset tidak valid.' }, { status: 400 });
  }

  try {
    await remove(`assets/${name}`);
    await writeLog({ actor: session.username, action: 'asset.delete', detail: name });
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal menghapus gambar.';
    return Response.json({ error: message }, { status: 500 });
  }
}
