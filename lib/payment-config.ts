import { get } from './rtdb';
import { decryptSecret } from './crypto';

/**
 * Konfigurasi pembayaran Pixpayz.
 * Disimpan di node `payment_config` (TIDAK di `settings` yang terbaca publik).
 * API key disimpan terenkripsi AES-256-GCM.
 */
export type PaymentConfig = {
  apiKeyEnc: string;
  minAmount: number;
  maxAmount: number;
  webhookToken: string;
};

export type PublicPaymentConfig = {
  configured: boolean;
  minAmount: number;
  maxAmount: number;
  webhookToken: string;
};

export async function getPaymentConfig(): Promise<PaymentConfig | null> {
  const config = await get<Partial<PaymentConfig>>('payment_config');
  if (!config || typeof config.apiKeyEnc !== 'string' || !config.apiKeyEnc) {
    return null;
  }
  return {
    apiKeyEnc: config.apiKeyEnc,
    minAmount: typeof config.minAmount === 'number' ? config.minAmount : 0,
    maxAmount: typeof config.maxAmount === 'number' ? config.maxAmount : 0,
    webhookToken: typeof config.webhookToken === 'string' ? config.webhookToken : '',
  };
}

export async function getApiKey(): Promise<string | null> {
  const config = await getPaymentConfig();
  if (!config) return null;
  return decryptSecret(config.apiKeyEnc);
}

export async function getPublicPaymentConfig(): Promise<PublicPaymentConfig> {
  const config = await getPaymentConfig();
  return {
    configured: config !== null,
    minAmount: config?.minAmount ?? 0,
    maxAmount: config?.maxAmount ?? 0,
    webhookToken: config?.webhookToken ?? '',
  };
}
