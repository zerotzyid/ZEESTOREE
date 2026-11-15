import { requireUser } from '@/lib/authz';
import { getLatestPendingInvoice } from '@/lib/invoice-processing';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const session = await requireUser();
  if (!session) {
    return Response.json({ error: 'Silakan masuk terlebih dahulu.' }, { status: 401 });
  }

  const url = new URL(request.url);
  const purpose = url.searchParams.get('purpose') as 'deposit' | 'donation' | 'direct_purchase' | null;

  try {
    const invoice = await getLatestPendingInvoice(session.username, purpose ?? undefined);
    if (!invoice) {
      return Response.json({ invoice: null }, { headers: { 'Cache-Control': 'no-store' } });
    }
    return Response.json(
      {
        invoice: {
          invoiceId: invoice.invoiceId,
          amount: invoice.amount,
          fee: invoice.fee,
          total: invoice.total,
          status: invoice.status,
          qrisImage: invoice.qrisImage,
          paymentLink: invoice.paymentLink,
          expiredAt: invoice.expiredAt,
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memuat invoice.';
    return Response.json({ error: message }, { status: 500 });
  }
}