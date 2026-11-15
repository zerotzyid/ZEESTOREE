import { getApiKey } from './payment-config';

/**
 * Klien API Pixpayz — HANYA endpoint yang tertulis di https://pixpayz.com/docs:
 *   GET /api/profile?apikey=
 *   GET /api/createinvoice?apikey=&amount=
 *   GET /api/checkinvoice?apikey=&id=
 * Base URL diambil dari env PIXPAYZ_BASE_URL (dokumen hanya menulis "BASE_URL").
 */

function baseUrl(): string {
  const url = process.env.PIXPAYZ_BASE_URL;
  if (!url) throw new Error('PIXPAYZ_BASE_URL belum diatur.');
  return url.replace(/\/+$/, '');
}

async function pixpayzGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error('Pembayaran belum dikonfigurasi admin.');
  const query = new URLSearchParams({ apikey: apiKey, ...params });
  const res = await fetch(`${baseUrl()}${path}?${query.toString()}`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Pixpayz ${path} gagal (${res.status}). ${detail.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

export type PixpayzProfile = {
  username: string;
  email: string;
  balance: number;
  pending_balance: number;
};

export type PixpayzCreateInvoice = {
  success?: boolean;
  invoice_id: string;
  amount: number;
  fee: number;
  total: number;
  qris_image: string;
  payment_link: string;
  /** Format dari Pixpayz: "YYYY-MM-DD HH:MM:SS" */
  expired_at: string;
};

export type PixpayzCheckInvoice = {
  invoice_id: string;
  amount: number;
  fee: number;
  total: number;
  status: string;
  qris_image?: string;
  payment_link?: string;
  expired_at?: string;
  created_at?: string;
  completed_at?: string;
  balance_after?: number;
};

export function getProfile(): Promise<PixpayzProfile> {
  return pixpayzGet<PixpayzProfile>('/api/profile', {});
}

export function createInvoice(amount: number): Promise<PixpayzCreateInvoice> {
  return pixpayzGet<PixpayzCreateInvoice>('/api/createinvoice', { amount: String(amount) });
}

export function checkInvoice(invoiceId: string): Promise<PixpayzCheckInvoice> {
  return pixpayzGet<PixpayzCheckInvoice>('/api/checkinvoice', { id: invoiceId });
}

/**
 * Parse "YYYY-MM-DD HH:MM:SS" dari Pixpayz sebagai waktu WIB (UTC+7).
 * Zona waktu tidak disebut dokumentasi — lihat asumsi di laporan modul.
 */
export function parsePixpayzDate(value: string | undefined | null): number | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [, y, mo, d, h, mi, s] = match;
  const epoch = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h) - 7, Number(mi), Number(s));
  return Number.isFinite(epoch) ? epoch : null;
}
