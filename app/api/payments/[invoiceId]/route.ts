import { get } from '@/lib/rtdb';
import { requireUser } from '@/lib/authz';
import { processInvoice } from '@/lib/invoice-processing';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
): Promise<Response> {
  const session = await requireUser();
  if (!session) {
    return Response.json({ error: 'Silakan masuk terlebih dahulu.' }, { status: 401 });
  }

  const { invoiceId } = await params;
  try {
    const invoice = await get<{
      invoiceId: string;
      userId: string;
      purpose: string;
      amount: number;
      fee: number;
      total: number;
      status: string;
      qrisImage: string;
      paymentLink: string;
      createdAt: number;
      expiredAt: number;
      orderId?: string | null;
      productId?: string | null;
      productName?: string | null;
    }>(`invoices/${invoiceId}`);

    if (!invoice || invoice.userId !== session.username) {
      return Response.json({ error: 'Invoice tidak ditemukan.' }, { status: 404 });
    }

    // Proses invoice jika masih pending
    if (invoice.status === 'pending' || invoice.status === 'processing') {
      await processInvoice(invoiceId, { force: false });
    }

    const fresh = await get<{
      invoiceId: string;
      userId: string;
      purpose: string;
      amount: number;
      fee: number;
      total: number;
      status: string;
      qrisImage: string;
      paymentLink: string;
      createdAt: number;
      expiredAt: number;
      orderId?: string | null;
      productId?: string | null;
      productName?: string | null;
    }>(`invoices/${invoiceId}`);

    return Response.json({
      invoiceId: fresh?.invoiceId ?? invoice.invoiceId,
      status: fresh?.status ?? invoice.status,
      amount: fresh?.amount ?? invoice.amount,
      fee: fresh?.fee ?? invoice.fee,
      total: fresh?.total ?? invoice.total,
      qrisImage: fresh?.qrisImage ?? invoice.qrisImage,
      paymentLink: fresh?.paymentLink ?? invoice.paymentLink,
      createdAt: fresh?.createdAt ?? invoice.createdAt,
      expiredAt: fresh?.expiredAt ?? invoice.expiredAt,
      purpose: fresh?.purpose ?? invoice.purpose,
      orderId: fresh?.orderId ?? invoice.orderId ?? null,
      productId: fresh?.productId ?? invoice.productId ?? null,
      productName: fresh?.productName ?? invoice.productName ?? null,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memuat pembayaran.';
    return Response.json({ error: message }, { status: 500 });
  }
}
