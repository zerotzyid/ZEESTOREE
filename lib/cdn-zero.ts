/**
 * Klien CDNZero — https://api-cdnzero.vercel.app
 * Digunakan untuk unggah gambar ke CDN publik agar nama file bebas
 * (tidak terbatas pada branding/ atau products/).
 */
const BASE_URL = 'https://api-cdnzero.vercel.app';

export type CdnUploadResult = {
  success: boolean;
  url?: string;
  file_name?: string;
  size?: number;
  message?: string;
};

/**
 * Mengunggah data URL gambar (base64 WEBP/PNG/JPG) ke CDNZero.
 * Mengembalikan URL publik yang dapat langsung diakses.
 */
export async function uploadImage(dataUrl: string): Promise<CdnUploadResult> {
  // Ekstrak base64 dari data URL
  const comma = dataUrl.indexOf(',');
  if (comma < 0) {
    return { success: false, message: 'Data URL gambar tidak valid.' };
  }
  const base64 = dataUrl.slice(comma + 1);

  // Konversi base64 ke Buffer lalu ke File untuk multipart upload
  const bytes = Buffer.from(base64, 'base64');
  const buffer = new Uint8Array(bytes);

  // Buat File dari buffer (nama acak karena CDNZero akan generate sendiri)
  const file = new File([buffer], `upload-${Date.now()}.webp`, { type: 'image/webp' });

  // Coba beberapa nama field yang umum digunakan API upload gambar
  const fieldNames = ['image', 'file', 'upload', 'files'];
  let lastError = '';

  for (const fieldName of fieldNames) {
    const formData = new FormData();
    formData.append(fieldName, file);

    try {
      const res = await fetch(`${BASE_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = (await res.json().catch(() => ({}))) as CdnUploadResult & { error?: string };

      if (res.ok && data.success && data.url) {
        return {
          success: true,
          url: data.url,
          file_name: data.file_name,
          size: data.size,
        };
      }

      lastError = data.error ?? data.message ?? `HTTP ${res.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Request gagal.';
    }
  }

  return {
    success: false,
    message: lastError ?? 'Gagal unggah ke CDNZero.',
  };
}
