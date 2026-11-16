/** Validasi server untuk gambar base64 yang diterima dari admin. */

const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);
const LIMITS = {
  logo: 200 * 1024,
  favicon: 200 * 1024,
  banner: 500 * 1024,
  product: 500 * 1024,
  default: 1024 * 1024, // 1 MB untuk aset lain
} as const;

export type AssetKind = keyof typeof LIMITS;

export type ImageValidation =
  | { ok: true; mime: string; bytes: number }
  | { ok: false; error: string };

export function validateImageDataUrl(dataUrl: string, kind: AssetKind): ImageValidation {
  const comma = dataUrl.indexOf(',');
  if (comma < 0 || !dataUrl.startsWith('data:image/')) {
    return { ok: false, error: 'Bukan data URL gambar yang valid.' };
  }
  const header = dataUrl.slice(0, comma);
  const mime = header.slice('data:'.length).split(';')[0] ?? '';
  if (!ALLOWED_MIME.has(mime)) {
    return { ok: false, error: 'Format yang diizinkan hanya PNG, JPG, dan WEBP.' };
  }
  const base64 = dataUrl.slice(comma + 1);
  if (base64.length === 0 || base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    return { ok: false, error: 'Payload base64 tidak valid.' };
  }
  const bytes = Buffer.from(base64, 'base64');
  if (bytes.length === 0) {
    return { ok: false, error: 'Gambar kosong.' };
  }
  const limit = LIMITS[kind];
  if (bytes.length > limit) {
    return {
      ok: false,
      error: `Ukuran gambar ${Math.ceil(bytes.length / 1024)} KB melebihi batas ${Math.ceil(limit / 1024)} KB. Kompres ulang sebelum mengunggah.`,
    };
  }
  return { ok: true, mime, bytes: bytes.length };
}

export function assetKindFromName(name: string): AssetKind {
  if (name === 'branding/logo') return 'logo';
  if (name === 'branding/favicon') return 'favicon';
  if (name === 'branding/banner') return 'banner';
  if (/^products\/[a-z0-9-]{1,60}$/.test(name)) return 'product';
  return 'default';
}
