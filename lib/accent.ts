/** Util warna aksen untuk CSS variable (dipakai server & client). */

function clamp(value: number): number {
  return Math.min(255, Math.max(0, value));
}

function hexToRgb(hex: string): [number, number, number] | null {
  const match = /^#([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!match) return null;
  const int = parseInt(match[1]!, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => clamp(Math.round(v)).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function mixWithWhite(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return rgbToHex(
    rgb[0] + (255 - rgb[0]) * amount,
    rgb[1] + (255 - rgb[1]) * amount,
    rgb[2] + (255 - rgb[2]) * amount
  );
}

function luminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export type AccentVars = {
  accent: string;
  accent2: string;
  soft: string;
  contrast: string;
};

/** Hitung nilai CSS variable dari warna aksen admin. Bila tidak valid, pakai #e5334b. */
export function computeAccentVars(accent: string): AccentVars {
  const valid = hexToRgb(accent) ? accent.trim().toLowerCase() : '#e5334b';
  return {
    accent: valid,
    accent2: mixWithWhite(valid, 0.28),
    soft: `${valid}33`,
    contrast: luminance(valid) > 0.45 ? '#14171d' : '#ffffff',
  };
}

/** Blok CSS untuk di-inject di <head> (server). */
export function accentStyleRule(accent: string): string {
  const vars = computeAccentVars(accent);
  return `:root{--accent:${vars.accent};--accent-2:${vars.accent2};--accent-soft:${vars.soft};--accent-contrast:${vars.contrast};}`;
}

/** Terapkan warna aksen ke CSS variable dokumen (client). */
export function applyAccent(accent: string): void {
  if (typeof document === 'undefined') return;
  const vars = computeAccentVars(accent);
  const root = document.documentElement;
  root.style.setProperty('--accent', vars.accent);
  root.style.setProperty('--accent-2', vars.accent2);
  root.style.setProperty('--accent-soft', vars.soft);
  root.style.setProperty('--accent-contrast', vars.contrast);
}
