import { get, set, type Json } from './rtdb';
import { DEFAULT_SETTINGS, type Settings } from './settings-defaults';

export type { FaqItem, Settings } from './settings-defaults';
export { DEFAULT_SETTINGS } from './settings-defaults';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Mengisi hanya key yang hilang; tidak pernah menimpa nilai yang sudah ada. */
function fillMissing<T extends Record<string, unknown>>(base: T, stored: unknown): T {
  if (!isPlainObject(stored)) return { ...base };
  const out: Record<string, unknown> = { ...base };
  for (const key of Object.keys(base)) {
    const baseVal = base[key];
    const storedVal = stored[key];
    if (isPlainObject(baseVal) && isPlainObject(storedVal)) {
      out[key] = fillMissing(baseVal, storedVal);
    } else if (storedVal !== undefined && storedVal !== null) {
      out[key] = storedVal;
    }
  }
  return out as T;
}

/**
 * Membaca settings dari RTDB.
 * Bila node `settings` belum ada sama sekali, menulis DEFAULT_SETTINGS
 * sebagai data awal (setup pertama), lalu mengembalikannya.
 */
export async function getSettings(): Promise<Settings> {
  const stored = await get<Partial<Settings>>('settings');
  if (!stored || !isPlainObject(stored) || stored.identity === undefined) {
    await set('settings', DEFAULT_SETTINGS as unknown as Json);
    return structuredClone(DEFAULT_SETTINGS);
  }
  const merged = fillMissing(DEFAULT_SETTINGS as unknown as Record<string, unknown>, stored);
  const result = merged as unknown as Settings;
  if (!Array.isArray(result.faq)) result.faq = [];
  return result;
}

/** Daftar nama aset branding yang sudah terunggah (tanpa membaca base64-nya). */
export async function getBrandingAssetNames(): Promise<{ logo: boolean; favicon: boolean; banner: boolean; donationQrLogo: boolean }> {
  const branding = await get<Record<string, unknown>>('assets/branding', { shallow: true });
  return {
    logo: branding?.logo !== undefined && branding.logo !== null,
    favicon: branding?.favicon !== undefined && branding.favicon !== null,
    banner: branding?.banner !== undefined && branding.banner !== null,
    donationQrLogo: branding?.donationQrLogo !== undefined && branding.donationQrLogo !== null,
  };
}
