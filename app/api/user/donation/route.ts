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
    const invoice = await createDepositInvoice(session.username, parsed.data.amount);
    
    // Update purpose menjadi 'donation'
    const { set } = await import('@/lib/rtdb');
    await set(`invoices/${invoice.invoiceId}/purpose`, 'donation');
    await set(`invoices/${invoice.invoiceId}/amount`, parsed.data.amount);
    await set(`invoices/${invoice.invoiceId}/total`, invoice.total);
    await set(`invoices/${invoice.invoiceId}/fee`, invoice.fee);

    return Response.json({
      ok: true,
      redirectToPay: `/pay/${invoice.invoiceId}`,
      invoiceId: invoice.invoiceId,
      message: 'Invoice donasi QRIS dibuat. Lanjutkan ke halaman pembayaran.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal membuat invoice donasi.';
    return Response.json({ error: message }, { status: 500 });
  }
}