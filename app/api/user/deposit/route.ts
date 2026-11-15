import { z } from 'zod';
import { requireUser } from '@/lib/authz';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { createDepositInvoice } from '@/lib/invoice-processing';
import { getPublicPaymentConfig } from '@/lib/payment-config';

export const dynamic = 'force-dynamic';

const depositSchema = z.object({
  amount: z.number().int().positive('Nominal harus bilangan bulat positif.'),
});

export async function GET(): Promise<Response> {
  const session = await requireUser();
  if (!session) {
    return Response.json({ error: 'Silakan masuk terlebih dahulu.' }, { status: 401 });
  }
  try {
    const config = await getPublicPaymentConfig();
    return Response.json(config, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memuat konfigurasi.';
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<Response> {
  const session = await requireUser();
  if (!session) {
    return Response.json({ error: 'Silakan masuk terlebih dahulu.' }, { status: 401 });
  }

  const ip = clientIp(request);
  const limit = rateLimit(`deposit:${session.username}:${ip}`, 5, 10 * 60 * 1000);
  if (!limit.ok) {
    return Response.json(
      { error: `Terlalu banyak permintaan. Coba lagi dalam ${limit.retryAfterSec} detik.` },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Permintaan tidak valid.' }, { status: 400 });
  }

  const parsed = depositSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.errors[0]?.message ?? 'Input tidak valid.' },
      { status: 400 }
    );
  }

  try {
    const invoice = await createDepositInvoice(session.username, parsed.data.amount);
    return Response.json({
      invoiceId: invoice.invoiceId,
      status: invoice.status,
      amount: invoice.amount,
      fee: invoice.fee,
      total: invoice.total,
      qrisImage: invoice.qrisImage,
      paymentLink: invoice.paymentLink,
      expiredAt: invoice.expiredAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal membuat invoice.';
    return Response.json({ error: message }, { status: 500 });
  }
}
