import { z } from 'zod';
import { set } from '@/lib/rtdb';
import { requireAdmin } from '@/lib/authz';
import { encryptSecret } from '@/lib/crypto';
import { getPublicPaymentConfig } from '@/lib/payment-config';
import { writeLog } from '@/lib/log';

export const dynamic = 'force-dynamic';

const saveSchema = z.object({
  apiKey: z.string().trim().min(1).max(300).optional(),
  minAmount: z.number().int().min(0).max(10_000_000_000),
  maxAmount: z.number().int().min(0).max(10_000_000_000),
  webhookToken: z.string().trim().min(8).max(128),
});

/** GET: konfigurasi publik + URL webhook yang harus didaftarkan di Pixpayz. */
export async function GET(request: Request): Promise<Response> {
  const session = await requireAdmin();
  if (!session) {
    return Response.json({ error: 'Hanya admin.' }, { status: 403 });
  }

  try {
    const config = await getPublicPaymentConfig();
    const origin = new URL(request.url).origin;
    const webhookUrl = config.webhookToken
      ? `${origin}/api/webhook/pixpayz?token=${encodeURIComponent(config.webhookToken)}`
      : `${origin}/api/webhook/pixpayz?token=<token>`;
    return Response.json(
      { ...config, webhookUrl },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memuat konfigurasi.';
    return Response.json({ error: message }, { status: 500 });
  }
}

/** POST: simpan konfigurasi. apiKey dikirim hanya bila diganti. */
export async function POST(request: Request): Promise<Response> {
  const session = await requireAdmin();
  if (!session) {
    return Response.json({ error: 'Hanya admin.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Permintaan tidak valid.' }, { status: 400 });
  }

  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.errors[0]?.message ?? 'Input tidak valid.' },
      { status: 400 }
    );
  }

  if (parsed.data.maxAmount > 0 && parsed.data.minAmount > parsed.data.maxAmount) {
    return Response.json(
      { error: 'Minimal deposit tidak boleh melebihi maksimal.' },
      { status: 400 }
    );
  }

  try {
    const updates: Record<string, string | number> = {
      minAmount: parsed.data.minAmount,
      maxAmount: parsed.data.maxAmount,
      webhookToken: parsed.data.webhookToken,
    };
    if (parsed.data.apiKey) {
      updates.apiKeyEnc = encryptSecret(parsed.data.apiKey.trim());
    }
    for (const [field, value] of Object.entries(updates)) {
      await set(`payment_config/${field}`, value);
    }
    await writeLog({
      actor: session.username,
      action: 'payment_config.update',
      detail: parsed.data.apiKey ? 'apiKey, limits, token' : 'limits, token',
    });
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal menyimpan konfigurasi.';
    return Response.json({ error: message }, { status: 500 });
  }
}
