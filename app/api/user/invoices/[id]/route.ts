import { get } from '@/lib/rtdb';
import { requireUser } from '@/lib/authz';
import { processInvoice, type InvoiceDoc } from '@/lib/invoice-processing';

export const dynamic = 'force-dynamic';

/**
 * Polling status invoice dari halaman pembayaran (fallback webhook).
 * Saat invoice masih pending, verifikasi ke Pixpayz lewat checkinvoice
 * lalu proses idempoten bila sudah lunas.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const session = await requireUser();
  if (!session) {
    return Response.json({ error: 'Silakan masuk terlebih dahulu.' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const invoice = await get<InvoiceDoc>(`invoices/${id}`);
    if (!invoice || invoice.userId !== session.username) {
      return Response.json({ error: 'Invoice tidak ditemukan.' }, { status: 404 });
    }

    if (invoice.status === 'pending' || invoice.status === 'processing') {
      await processInvoice(id, { force: false });
    }

    const fresh = await get<InvoiceDoc>(`invoices/${id}`);
    return Response.json(
      {
        invoiceId: fresh?.invoiceId ?? invoice.invoiceId,
        status: fresh?.status ?? invoice.status,
        amount: fresh?.amount ?? invoice.amount,
        fee: fresh?.fee ?? invoice.fee,
        total: fresh?.total ?? invoice.total,
        qrisImage: fresh?.qrisImage ?? invoice.qrisImage,
        qrImageUrl: fresh?.qrisImage ?? invoice.qrisImage,
        paymentLink: fresh?.paymentLink ?? invoice.paymentLink,
        expiredAt: fresh?.expiredAt ?? invoice.expiredAt,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memuat invoice.';
    return Response.json({ error: message }, { status: 500 });
  }
}
