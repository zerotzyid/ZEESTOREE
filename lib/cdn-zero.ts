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

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      body: formData,
      // Jangan set Content-Type manually — biar fetch set boundary untuk multipart
    });

    const data = (await res.json()) as CdnUploadResult & { error?: string };

    if (!res.ok || !data.success || !data.url) {
      return {
        success: false,
        message: data.error ?? data.message ?? `Gagal unggah ke CDN (HTTP ${res.status}).`,
      };
    }

    return {
      success: true,
      url: data.url,
      file_name: data.file_name,
      size: data.size,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Gagal terhubung ke CDN.',
    };
  }
}
