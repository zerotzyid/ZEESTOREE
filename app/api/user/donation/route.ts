import { z } from 'zod';
import { requireUser } from '@/lib/authz';
import { createDepositInvoice } from '@/lib/invoice-processing';
import { getPublicPaymentConfig } from '@/lib/payment-config';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

const donationSchema = z.object({
  amount: z.number().int().positive('Nominal harus bilangan bulat positif.'),
});

export async function POST(request: Request): Promise<Response> {
  const session = await requireUser();
  if (!session) {
    return Response.json({ error: 'Silakan masuk terlebih dahulu.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Permintaan tidak valid.' }, { status: 400 });
  }

  const parsed = donationSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.errors[0]?.message ?? 'Input tidak valid.' },
      { status: 400 }
    );
  }

  try {
    // Validasi nominal terhadap konfigurasi donasi di settings
    const settings = await getSettings();
    const donationConfig = settings.donation;
    if (donationConfig?.minAmount > 0 && parsed.data.amount < donationConfig.minAmount) {
      return Response.json(
        { error: `Minimal donasi Rp ${donationConfig.minAmount.toLocaleString('id-ID')}.` },
        { status: 400 }
      );
    }
    if (donationConfig?.maxAmount > 0 && parsed.data.amount > donationConfig.maxAmount) {
      return Response.json(
        { error: `Maksimal donasi Rp ${donationConfig.maxAmount.toLocaleString('id-ID')}.` },
        { status: 400 }
      );
    }

    // Buat invoice dengan purpose 'donation'
    const invoice = await createDepositInvoice(session.username, parsed.data.amount, 'donation');

    return Response.json({
      ok: true,
      invoiceId: invoice.invoiceId,
      qrisImage: invoice.qrisImage,
      qrImageUrl: invoice.qrisImage,
      qrString: invoice.qrisImage,
      invoiceUrl: invoice.paymentLink,
      total: invoice.total,
      expiredAt: invoice.expiredAt,
      status: 'pending',
      message: 'Silakan bayar via QRIS. Status akan update otomatis setelah pembayaran.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal membuat invoice donasi.';
    return Response.json({ error: message }, { status: 500 });
  }
}