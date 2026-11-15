import { getSettings } from '@/lib/settings';
import { getPublicPaymentConfig } from '@/lib/payment-config';
import { DonationClient } from '@/components/donation-client';

export const dynamic = 'force-dynamic';

export default async function DonasiPage() {
  const [settings, paymentConfig] = await Promise.all([
    getSettings(),
    getPublicPaymentConfig(),
  ]);

  const storeName = settings.identity?.storeName ?? 'Zeestore';
  const donation = settings.donation;
  const branding = settings.branding ?? { logo: '', favicon: '', banner: '', donationQrLogo: '' };
  const contact = settings.contact ?? { whatsapp: null, telegram: null, email: null };

  if (!donation?.enabled) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="rounded-2xl border border-line p-6 text-center">
          <p className="label-mono">Donasi</p>
          <h1 className="mt-2 text-2xl font-semibold text-content">Donasi Belum Diaktifkan</h1>
          <p className="mt-4 text-sm text-content-muted">
            Admin belum mengaktifkan fitur donasi. Silakan coba lagi nanti.
          </p>
        </div>
      </div>
    );
  }

  return (
    <DonationClient
      storeName={storeName}
      donation={donation}
      branding={branding}
      paymentConfig={paymentConfig}
      contact={contact}
    />
  );
}