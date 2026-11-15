import { get } from '@/lib/rtdb';
import { processInvoice } from '@/lib/invoice-processing';
import { getPaymentConfig } from '@/lib/payment-config';
import { writeLog } from '@/lib/log';

export const dynamic = 'force-dynamic';

/**
 * Webhook Pixpayz (dokumentasi: event "deposit.paid", header X-Webhook-Event).
 * Dokumen TIDAK menyebut signature — keamanan memakai token rahasia di URL (?token=)
 * dan status lunas SELALU diverifikasi ulang lewat checkinvoice (payload tidak dipercaya).
 * Selalu membalas 2xx secepat mungkin; pemrosesan ringan dijalankan sebelum balasan,
 * dan bila gagal, cron fallback akan mengulang.
 */
export async function POST(request: Request): Promise<Response> {
  let token: string | null = null;
  try {
    token = new URL(request.url).searchParams.get('token');
  } catch {
    token = null;
  }

  let config;
  try {
    config = await getPaymentConfig();
  } catch {
    return Response.json({ error: 'Konfigurasi pembayaran gagal dibaca.' }, { status: 500 });
  }

  if (!config || !config.webhookToken) {
    return Response.json({ error: 'Token webhook belum diatur.' }, { status: 401 });
  }
  if (!token || token !== config.webhookToken) {
    await writeLog({ actor: 'pixpayz', action: 'webhook.rejected', detail: 'token tidak cocok' });
    return Response.json({ error: 'Token tidak valid.' }, { status: 401 });
  }

  let body: {
    event?: string;
    data?: { id?: string; reference?: string; status?: string };
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Body tidak valid.' }, { status: 400 });
  }

  const headerEvent = request.headers.get('x-webhook-event');
  const event = body.event ?? headerEvent;
  if (event !== 'deposit.paid') {
    // Event lain diabaikan (dokumen hanya mendefinisikan deposit.paid).
    return Response.json({ ok: true, ignored: true });
  }

  const candidates = [body.data?.id, body.data?.reference].filter(
    (value): value is string => typeof value === 'string' && value.length > 0
  );
  if (candidates.length === 0) {
    return Response.json({ error: 'data.id tidak ada.' }, { status: 400 });
  }

  try {
    // Cari invoice tersimpan: cocokkan id langsung, bila tidak ada coba checkinvoice
    // (dokumen tidak menjelaskan apakah data.id sama dengan invoice_id).
    for (const candidate of candidates) {
      const direct = await get(`invoices/${candidate}`);
      if (direct) {
        await processInvoice(candidate, { force: true });
        return Response.json({ ok: true });
      }
    }

    const { checkInvoice } = await import('@/lib/pixpayz');
    for (const candidate of candidates) {
      try {
        const check = await checkInvoice(candidate);
        if (check.invoice_id) {
          const stored = await get(`invoices/${check.invoice_id}`);
          if (stored) {
            await processInvoice(check.invoice_id, { force: true });
            return Response.json({ ok: true });
          }
        }
      } catch {
        /* lanjut kandidat berikutnya */
      }
    }

    await writeLog({
      actor: 'pixpayz',
      action: 'webhook.unknown_invoice',
      detail: candidates.join(', '),
    });
    // 2xx agar Pixpayz tidak retry tanpa henti untuk invoice yang bukan milik kita.
    return Response.json({ ok: true, unknown: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'proses webhook gagal';
    await writeLog({ actor: 'pixpayz', action: 'webhook.error', detail: message });
    // Tetap 2xx — cron fallback yang menyelesaikan (menghindari retry beruntun).
    return Response.json({ ok: true, deferred: true });
  }
}
