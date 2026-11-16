import { get, update, type Json } from '@/lib/rtdb';
import { requireUser } from '@/lib/authz';

export const dynamic = 'force-dynamic';

export async function POST(
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
      status: string;
      orderId?: string | null;
    }>(`invoices/${invoiceId}`);

    if (!invoice || invoice.userId !== session.username) {
      return Response.json({ error: 'Invoice tidak ditemukan.' }, { status: 404 });
    }

    if (invoice.status !== 'pending' && invoice.status !== 'processing') {
      return Response.json(
        { error: 'Invoice tidak dapat dibatalkan (sudah diproses atau kadaluwarsa).' },
        { status: 400 }
      );
    }

    // Tandai invoice sebagai expired/cancelled
    await update('/', {
      [`invoices/${invoiceId}/status`]: 'failed',
      [`invoices/${invoiceId}/error`]: 'Dibatalkan oleh pengguna.',
      [`invoices/${invoiceId}/updatedAt`]: Date.now(),
    } as Record<string, Json>);

    // Jika terkait order, tandai order juga sebagai cancelled
    if (invoice.orderId) {
      await update('/', {
        [`orders/${invoice.orderId}/status`]: 'cancelled',
        [`orders/${invoice.orderId}/failReason`]: 'Pembayaran dibatalkan oleh pengguna.',
        [`orders/${invoice.orderId}/updatedAt`]: Date.now(),
      } as Record<string, Json>);
    }

    return Response.json({
      ok: true,
      message: 'Pembayaran berhasil dibatalkan.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal membatalkan pembayaran.';
    return Response.json({ error: message }, { status: 500 });
  }
}
