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

async function tryMultipart(fieldName: string, file: File): Promise<{ ok: boolean; data?: any; status?: number }> {
  const formData = new FormData();
  formData.append(fieldName, file);

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

    return {
      ok: res.ok && data.success && !!data.url,
      data,
      status: res.status,
    };
  } catch (error) {
    return {
      ok: false,
      data: { error: error instanceof Error ? error.message : 'Request gagal.' },
      status: 0,
    };
  }
}

async function tryJson(fieldName: string, base64: string): Promise<{ ok: boolean; data?: any; status?: number }> {
  try {
    const res = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [fieldName]: base64 }),
    });

    let data: any = {};
    try {
      data = await res.json();
    } catch {
      data = { text: await res.text().catch(() => '') };
    }

    return {
      ok: res.ok && data.success && !!data.url,
      data,
      status: res.status,
    };
  } catch (error) {
    return {
      ok: false,
      data: { error: error instanceof Error ? error.message : 'Request gagal.' },
      status: 0,
    };
  }
}

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

  // Nama field yang umum digunakan oleh API upload (Multer/Express)
  const fieldNames = ['file', 'image', 'upload', 'files', 'image[]', 'file[]'];

  let lastError = '';
  let lastStatus = 0;

  // Coba multipart dengan berbagai nama field
  for (const fieldName of fieldNames) {
    const result = await tryMultipart(fieldName, file);

    if (result.ok && result.data?.url) {
      return {
        success: true,
        url: result.data.url,
        file_name: result.data.file_name,
        size: result.data.size,
      };
    }

    lastError = result.data?.error ?? result.data?.message ?? result.data?.text ?? `HTTP ${result.status}`;
    lastStatus = result.status ?? 0;
  }

  // Coba JSON body dengan berbagai nama field
  for (const fieldName of fieldNames) {
    const result = await tryJson(fieldName, base64);

    if (result.ok && result.data?.url) {
      return {
        success: true,
        url: result.data.url,
        file_name: result.data.file_name,
        size: result.data.size,
      };
    }

    lastError = result.data?.error ?? result.data?.message ?? result.data?.text ?? `HTTP ${result.status}`;
    lastStatus = result.status ?? 0;
  }

  // Coba endpoint upload-multiple dengan multipart
  for (const fieldName of fieldNames) {
    const formData = new FormData();
    formData.append(fieldName, file);

    try {
      const res = await fetch(`${BASE_URL}/api/upload-multiple`, {
        method: 'POST',
        body: formData,
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        data = { text: await res.text().catch(() => '') };
      }

      if (res.ok && data.success && data.url) {
        return {
          success: true,
          url: data.url,
          file_name: data.file_name,
          size: data.size,
        };
      }

      lastError = data.error ?? data.message ?? data.text ?? `HTTP ${res.status}`;
      lastStatus = res.status;
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Request gagal.';
    }
  }

  return {
    success: false,
    message: lastError ?? `Gagal unggah ke CDNZero (HTTP ${lastStatus}). Coba lagi nanti.`,
  };
}
