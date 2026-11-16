import { z } from 'zod';
import { requireUser } from '@/lib/authz';
import { createDepositInvoice } from '@/lib/invoice-processing';
import { getPublicPaymentConfig } from '@/lib/payment-config';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

const createPaymentSchema = z.object({
  purpose: z.enum(['deposit', 'donation', 'direct_purchase']).default('deposit'),
  amount: z.number().int().positive('Nominal harus bilangan bulat positif.'),
  orderId: z.string().optional(),
  productId: z.string().optional(),
  productName: z.string().optional(),
});

export async function POST(request: Request): Promise<Response> {
  const session = await requireUser();
  if (!session) {
    return Response.json({ error: 'Silakan masuk terlebih dahulu.' }, { status: 401 });
  }

  const config = await getPublicPaymentConfig();
  if (!config.configured) {
    return Response.json({ error: 'Pembayaran belum dikonfigurasi admin.' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Permintaan tidak valid.' }, { status: 400 });
  }

  const parsed = createPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.errors[0]?.message ?? 'Input tidak valid.' },
      { status: 400 }
    );
  }

  const { purpose, amount, orderId, productId, productName } = parsed.data;

  try {
    const settings = await getSettings();

    // Validasi nominal untuk donasi
    if (purpose === 'donation') {
      const donationConfig = settings.donation;
      if (donationConfig?.minAmount > 0 && amount < donationConfig.minAmount) {
        return Response.json(
          { error: `Minimal donasi Rp ${donationConfig.minAmount.toLocaleString('id-ID')}.` },
          { status: 400 }
        );
      }
      if (donationConfig?.maxAmount > 0 && amount > donationConfig.maxAmount) {
        return Response.json(
          { error: `Maksimal donasi Rp ${donationConfig.maxAmount.toLocaleString('id-ID')}.` },
          { status: 400 }
        );
      }
    }

    // Buat invoice
    const invoice = await createDepositInvoice(session.username, amount, purpose, {
      orderId,
      productId,
      productName,
    });

    return Response.json({
      ok: true,
      redirectToPay: `/pay/${invoice.invoiceId}`,
      invoiceId: invoice.invoiceId,
      status: invoice.status,
      amount: invoice.amount,
      fee: invoice.fee,
      total: invoice.total,
      qrisImage: invoice.qrisImage,
      paymentLink: invoice.paymentLink,
      expiredAt: invoice.expiredAt,
      purpose,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal membuat pembayaran.';
    return Response.json({ error: message }, { status: 500 });
  }
}
