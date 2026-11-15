import { get } from '@/lib/rtdb';
import { expireInvoiceIfDue, processInvoice, type InvoiceDoc } from '@/lib/invoice-processing';
import { writeLog } from '@/lib/log';

export const dynamic = 'force-dynamic';

const BATCH_LIMIT = 30;
const STALE_PROCESSING_MS = 5 * 60_000;

/**
 * Cron cadangan (vercel.json):
 *  1. menandai invoice pending yang lewat masa berlaku sebagai expired;
 *  2. memeriksa ulang invoice pending (checkinvoice) bila webhook tidak masuk;
 *  3. mengulang invoice yang macet di processing (crash di tengah proses).
 */
export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ error: 'CRON_SECRET belum diatur.' }, { status: 503 });
  }
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${secret}`) {
    return Response.json({ error: 'Tidak berwenang.' }, { status: 401 });
  }

  try {
    const invoices = await get<Record<string, InvoiceDoc>>('invoices');
    const all = invoices ? Object.values(invoices).filter(Boolean) : [];

    let expired = 0;
    let processed = 0;
    let paid = 0;

    for (const invoice of all) {
      if (await expireInvoiceIfDue(invoice)) expired += 1;
    }

    const candidates = all
      .filter(
        (inv) =>
          inv.status === 'pending' ||
          (inv.status === 'processing' &&
            inv.lockedAt &&
            Date.now() - inv.lockedAt > STALE_PROCESSING_MS)
      )
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
      .slice(0, BATCH_LIMIT);

    for (const invoice of candidates) {
      processed += 1;
      try {
        const result = await processInvoice(invoice.invoiceId, { force: true });
        if (result.paid) paid += 1;
      } catch {
        /* lanjut invoice berikutnya */
      }
    }

    await writeLog({
      actor: 'cron',
      action: 'invoices.sweep',
      detail: `expired=${expired} checked=${processed} paid=${paid}`,
    });

    return Response.json({ ok: true, expired, checked: processed, paid });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'cron gagal';
    return Response.json({ error: message }, { status: 500 });
  }
}
