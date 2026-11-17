import { get } from '@/lib/rtdb';
import { requireUser } from '@/lib/authz';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> }
): Promise<Response> {
  const session = await requireUser();
  if (!session) {
    return Response.json({ error: 'Silakan masuk terlebih dahulu.' }, { status: 401 });
  }

  const { orderId } = await params;
  try {
    const order = await get<{
      id: string;
      userId: string;
      status: string;
      panelUrl?: string | null;
      panelServerId?: string | null;
      panelServerUuid?: string | null;
      panelPassword?: string | null;
      username?: string;
      email?: string;
    }>(`orders/${orderId}`);

    if (!order) {
      return Response.json({ error: 'Pesanan tidak ditemukan.' }, { status: 404 });
    }

    if (order.userId !== session.username) {
      return Response.json({ error: 'Akses ditolak.' }, { status: 403 });
    }

    if (!order.panelUrl) {
      return Response.json({ error: 'Panel belum tersedia untuk pesanan ini.' }, { status: 404 });
    }

    return Response.json({
      orderId: order.id,
      panelUrl: order.panelUrl,
      panelServerId: order.panelServerId,
      panelServerUuid: order.panelServerUuid,
      panelPassword: order.panelPassword,
      username: order.username,
      email: order.email,
      status: order.status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memuat akses panel.';
    return Response.json({ error: message }, { status: 500 });
  }
}
