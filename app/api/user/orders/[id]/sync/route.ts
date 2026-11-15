import { get, update, type Json } from '@/lib/rtdb';
import { requireUser } from '@/lib/authz';
import { adjustSaldo } from '@/lib/balance';
import { getSettings } from '@/lib/settings';
import { writeLog } from '@/lib/log';

export const dynamic = 'force-dynamic';
export const maxDuration = 20;

type ExternalDoc = {
  provider?: unknown;
  orderId?: unknown;
  [key: string]: unknown;
};

type OrderDoc = Record<string, unknown> & { external?: ExternalDoc | null; status?: string };

const FALLZX_STATUS: Record<string, string> = {
  PENDING: 'pending',
  PROCESSING: 'active',
  PAID: 'active',
  COMPLETED: 'completed',
  FAILED: 'failed',
  EXPIRED: 'failed',
  CANCELLED: 'cancelled',
};

/**
 * Sinkronkan satu pesanan eksternal milik user ke penyedia:
 * - FallZx (QRIS reseller) → status pembayaran + kredensial panel
 * - Axmisu (NOKOS) → status nomor + OTP; gagal = refund saldo otomatis
 */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const session = await requireUser();
  if (!session) {
    return Response.json({ error: 'Silakan masuk terlebih dahulu.' }, { status: 401 });
  }
  const { id } = await ctx.params;

  try {
    const order = await get<OrderDoc>(`orders/${id}`);
    if (!order || order.userId !== session.username) {
      return Response.json({ error: 'Pesanan tidak ditemukan.' }, { status: 404 });
    }

    const ext = order.external;
    const provider = typeof ext?.provider === 'string' ? ext.provider : null;
    const externalId = typeof ext?.orderId === 'string' ? ext.orderId : null;
    if (!provider || !externalId) {
      return Response.json({ order: { id, ...order } }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const settings = await getSettings();
    const updates: Record<string, Json> = { [`orders/${id}/updatedAt`]: Date.now() };

    if (provider === 'fallzx') {
      const base = settings.integrations.resellerBaseUrl.replace(/\/+$/, '');
      const key = settings.integrations.resellerApiKey;
      if (!key) {
        return Response.json({ order: { id, ...order } }, { headers: { 'Cache-Control': 'no-store' } });
      }
      const res = await fetch(`${base}/orders/${encodeURIComponent(externalId)}`, {
        headers: { Authorization: `Bearer ${key}` },
        cache: 'no-store',
        signal: AbortSignal.timeout(15_000),
      });
      const body = (await res.json().catch(() => null)) as
        | {
            data?: {
              status?: string;
              payment?: { qr_string?: string; qr_image_url?: string; expired_at?: string };
              invoice_url?: string;
              pterodactyl?: { panel_url?: string; username?: string; password?: string; server_identifier?: string };
            };
          }
        | null;
      const d = body?.data;
      if (res.ok && d) {
        const mapped = FALLZX_STATUS[d.status ?? ''];
        if (mapped) {
          updates[`orders/${id}/status`] = mapped;
          if (mapped === 'completed' && !order.completedAt) updates[`orders/${id}/completedAt`] = Date.now();
        }
        if (d.payment?.qr_string) updates[`orders/${id}/external/qrString`] = d.payment.qr_string;
        if (d.payment?.qr_image_url) updates[`orders/${id}/external/qrImageUrl`] = d.payment.qr_image_url;
        if (d.invoice_url) updates[`orders/${id}/external/invoiceUrl`] = d.invoice_url;
        if (d.pterodactyl?.panel_url) {
          updates[`orders/${id}/panelUrl`] = d.pterodactyl.panel_url;
          updates[`orders/${id}/panelUsername`] = d.pterodactyl.username ?? null;
          updates[`orders/${id}/panelPassword`] = d.pterodactyl.password ?? null;
        }
      }
    } else if (provider === 'axmisu') {
      const base = settings.integrations.axmisuBaseUrl.replace(/\/+$/, '');
      const key = settings.integrations.axmisuApiKey;
      if (!key) {
        return Response.json({ order: { id, ...order } }, { headers: { 'Cache-Control': 'no-store' } });
      }
      const res = await fetch(`${base}/order/${encodeURIComponent(externalId)}`, {
        headers: { Authorization: `Bearer ${key}` },
        cache: 'no-store',
        signal: AbortSignal.timeout(15_000),
      });
      const body = (await res.json().catch(() => null)) as
        | {
            order?: {
              status?: string;
              number?: string;
              otp?: string | null;
              expired_at?: number;
              resend_waiting?: boolean;
            };
          }
        | null;
      const o = body?.order;
      if (res.ok && o) {
        if (o.status === 'success') {
          updates[`orders/${id}/status`] = 'completed';
          if (!order.completedAt) updates[`orders/${id}/completedAt`] = Date.now();
          if (o.otp) updates[`orders/${id}/external/otp`] = o.otp;
          if (o.number) updates[`orders/${id}/external/phone`] = o.number;
        } else if (o.status === 'failed') {
          // Gagal di penyedia = saldo user harus kembali (idempoten via refundedAt).
          if (order.status !== 'failed' && !order.refundedAt) {
            const price = typeof order.price === 'number' ? order.price : 0;
            const refunded = price > 0 ? await adjustSaldo(String(order.userId), price) : 0;
            if (refunded !== null || price === 0) {
              updates[`orders/${id}/refundedAt`] = Date.now();
              updates[`transactions/refund_${id}`] = {
                userId: order.userId,
                type: 'refund',
                amount: price,
                balanceAfter: refunded,
                note: `Refund NOKOS gagal (${externalId})`,
                orderId: id,
                createdAt: Date.now(),
              };
              await writeLog({
                actor: String(order.userId),
                action: 'order.nokos_refund',
                detail: `${id} · ${externalId}`,
              });
            }
          }
          updates[`orders/${id}/status`] = 'failed';
          updates[`orders/${id}/failReason`] = 'Pesanan NOKOS gagal di penyedia — saldo dikembalikan.';
        } else if (o.resend_waiting === true) {
          updates[`orders/${id}/external/resendWaiting`] = true;
        }
      }
    }

    await update('/', updates);
    const fresh = await get<OrderDoc>(`orders/${id}`);
    return Response.json(
      { order: { id, ...fresh } },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sinkronisasi gagal.';
    return Response.json({ error: message }, { status: 500 });
  }
}
