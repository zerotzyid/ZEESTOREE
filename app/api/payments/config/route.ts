import { getPublicPaymentConfig } from '@/lib/payment-config';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  try {
    const [config, settings] = await Promise.all([
      getPublicPaymentConfig(),
      getSettings(),
    ]);

    return Response.json({
      configured: config.configured,
      minAmount: config.minAmount,
      maxAmount: config.maxAmount,
      webhookToken: config.webhookToken,
      donation: {
        enabled: settings.donation?.enabled ?? false,
        title: settings.donation?.title ?? '',
        description: settings.donation?.description ?? '',
        suggestedAmounts: settings.donation?.suggestedAmounts ?? [],
        showCustomAmount: settings.donation?.showCustomAmount ?? true,
        minAmount: settings.donation?.minAmount ?? 0,
        maxAmount: settings.donation?.maxAmount ?? 0,
      },
      branding: {
        donationQrLogo: settings.branding?.donationQrLogo ?? '',
      },
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memuat konfigurasi pembayaran.';
    return Response.json({ error: message }, { status: 500 });
  }
}
