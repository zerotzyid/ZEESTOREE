import { get, update, remove, type Json } from '@/lib/rtdb';
import { decryptSecret } from '@/lib/crypto';
import { writeLog } from '@/lib/log';
import { deleteApplicationServer, type PteroPanel } from '@/lib/pterodactyl';
import type { PanelDoc } from '@/app/api/admin/panels/route';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Cron job: hapus otomatis panel/server yang sudah lewat masa aktif (expiresAt)
 * dan belum diperpanjang.
 *
 * Dipanggil oleh layanan cron eksternal (mis. Vercel Cron / GitHub Actions)
 * dengan header Authorization: Bearer <CRON_SECRET>.
 */
export async function GET(request: Request): Promise<Response> {
  // Verifikasi cron secret
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return Response.json({ error: 'CRON_SECRET belum diatur.' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.slice(7) !== cronSecret) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const orders = await get<Record<string, any>>('orders');
    if (!orders) {
      return Response.json({ ok: true, deleted: 0, message: 'Tidak ada order.' });
    }

    const now = Date.now();
    let deleted = 0;
    let skipped = 0;

    for (const [orderId, order] of Object.entries(orders)) {
      if (!order || order.kind !== 'panel') continue;
      if (order.status !== 'active' && order.status !== 'pending') continue;
      if (!order.expiresAt || now <= order.expiresAt) continue;

      // Sudah expired — coba hapus server di Pterodactyl
      const panelId = order.panelId || order.provision?.panelId;
      const panelServerId = order.panelServerId;
      const panelUuid = order.panelServerUuid;

      if (panelId && panelServerId) {
        try {
          const panelDoc = await get<PanelDoc>(`panels/${panelId}`);
          if (panelDoc && panelDoc.apiKeyEnc) {
            const panel: PteroPanel = {
              baseUrl: panelDoc.baseUrl,
              apiKey: decryptSecret(panelDoc.apiKeyEnc),
            };
            await deleteApplicationServer(panel, panelServerId);
            await writeLog({
              actor: 'system',
              action: 'cron.expire_panel_delete',
              detail: `${orderId} · server ${panelServerId}`,
            });
          }
        } catch (error) {
          // Server mungkin sudah dihapus — lanjutkan tetap update status order
          await writeLog({
            actor: 'system',
            action: 'cron.expire_panel_delete_error',
            detail: `${orderId} · ${error instanceof Error ? error.message : String(error)}`,
          });
        }
      }

      // Tandai order sebagai expired
      await update('/', {
        [`orders/${orderId}/status`]: 'expired',
        [`orders/${orderId}/failReason`]: 'Masa aktif habis dan server dihapus otomatis.',
        [`orders/${orderId}/updatedAt`]: now,
      } as Record<string, Json>);

      deleted++;
    }

    await writeLog({
      actor: 'system',
      action: 'cron.expire_panels',
      detail: `Deleted ${deleted}, skipped ${skipped}`,
    });

    return Response.json({ ok: true, deleted, skipped });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Cron gagal.';
    await writeLog({ actor: 'system', action: 'cron.expire_panels_error', detail: message });
    return Response.json({ error: message }, { status: 500 });
  }
}
