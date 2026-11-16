/**
 * Klien CDNZero — https://api-cdnzero.vercel.app
 * Digunakan untuk unggah gambar ke CDN publik agar nama file bebas
 * (tidak terbatas pada branding/ atau products/).
 *
 * Endpoint: POST /api/upload
 * Content-Type: multipart/form-data
 * Field: file (required)
 * Response: { success, data: { url, fileName, fileSize, uploadedAt } }
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

  // Buat File dari buffer
  const file = new File([buffer], `upload-${Date.now()}.webp`, { type: 'image/webp' });

  // CDNZero API expects field name 'file' (singular)
  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      body: formData,
    });

    let data: any = {};
    try {
      data = await res.json();
    } catch {
      data = { text: await res.text().catch(() => '') };
    }

    if (res.ok && data.success && data.data?.url) {
      return {
        success: true,
        url: data.data.url,
        file_name: data.data.fileName,
        size: data.data.fileSize,
      };
    }

    return {
      success: false,
      message: data.message ?? data.error ?? data.text ?? `Gagal unggah ke CDNZero (HTTP ${res.status}).`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Gagal terhubung ke CDNZero.',
    };
  }
}
