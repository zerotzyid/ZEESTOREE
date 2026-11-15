/** Kompresi & konversi gambar di browser sebelum dikirim ke server. */

export type CompressOptions = {
  maxSide: number;
  maxBytes: number;
};

const ALLOWED_INPUT = new Set(['image/png', 'image/jpeg', 'image/webp']);

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Gambar tidak dapat dibaca.'));
    };
    img.src = url;
  });
}

function dataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(',');
  if (comma < 0) return 0;
  const base64 = dataUrl.slice(comma + 1);
  return Math.floor((base64.length * 3) / 4);
}

/**
 * Mengonversi file gambar (PNG/JPG/WEBP; SVG ditolak) menjadi data URL WEBP
 * yang sudah dikecilkan agar muat di maxBytes dan sisi terpanjang <= maxSide.
 * Melempar Error berbahasa Indonesia bila gagal atau masih terlalu besar.
 */
export async function fileToCompressedDataUrl(file: File, options: CompressOptions): Promise<string> {
  if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
    throw new Error('SVG ditolak karena risiko keamanan. Gunakan PNG, JPG, atau WEBP.');
  }
  if (!ALLOWED_INPUT.has(file.type)) {
    throw new Error('Format yang diizinkan hanya PNG, JPG, dan WEBP.');
  }

  const img = await loadImage(file);
  const scale = Math.min(1, options.maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Browser tidak mendukung kompresi gambar.');
  ctx.drawImage(img, 0, 0, width, height);

  let quality = 0.92;
  let dataUrl = canvas.toDataURL('image/webp', quality);
  // Bila browser tidak mendukung encoding WEBP, toDataURL mengembalikan PNG — tetap diterima (format diizinkan).
  while (dataUrlBytes(dataUrl) > options.maxBytes && quality > 0.5) {
    quality -= 0.08;
    dataUrl = canvas.toDataURL('image/webp', quality);
  }

  const bytes = dataUrlBytes(dataUrl);
  if (bytes > options.maxBytes) {
    throw new Error(
      `Hasil kompresi masih ${Math.ceil(bytes / 1024)} KB (batas ${Math.ceil(options.maxBytes / 1024)} KB). Gunakan gambar yang lebih kecil.`
    );
  }
  return dataUrl;
}
