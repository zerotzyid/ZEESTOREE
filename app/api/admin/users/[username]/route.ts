import { z } from 'zod';
import { get, set } from '@/lib/rtdb';
import { requireAdmin } from '@/lib/authz';
import { adjustSaldo } from '@/lib/balance';
import { writeLog } from '@/lib/log';

export const dynamic = 'force-dynamic';

const patchSchema = z
  .object({
    banned: z.boolean().optional(),
    saldoDelta: z.number().int().min(-1_000_000_000).max(1_000_000_000).optional(),
    reason: z.string().trim().max(200).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Tidak ada perubahan.' });

type StoredUser = Record<string, unknown> & { username?: string; role?: string; banned?: boolean };

/**
 * PATCH: ban/unban pengguna dan/atau koreksi saldo manual oleh admin.
 * param username = key di RTDB (huruf kecil, sama dengan username saat registrasi).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
): Promise<Response> {
  const session = await requireAdmin();
  if (!session) {
    return Response.json({ error: 'Hanya admin.' }, { status: 403 });
  }

  const { username } = await params;
  if (!/^[a-z0-9_]{3,24}$/.test(username)) {
    return Response.json({ error: 'Key pengguna tidak valid.' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Permintaan tidak valid.' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.errors[0]?.message ?? 'Input tidak valid.' },
      { status: 400 }
    );
  }

  try {
    const existing = await get<StoredUser>(`users/${username}`);
    if (!existing) {
      return Response.json({ error: 'Pengguna tidak ditemukan.' }, { status: 404 });
    }

    if (parsed.data.banned !== undefined) {
      if (existing.role === 'admin') {
        return Response.json({ error: 'Admin tidak dapat diblokir.' }, { status: 400 });
      }
      await set(`users/${username}/banned`, parsed.data.banned);
    }

    if (parsed.data.saldoDelta !== undefined && parsed.data.saldoDelta !== 0) {
      const delta = parsed.data.saldoDelta;
      const current = typeof existing.saldo === 'number' ? existing.saldo : 0;
      if (current + delta < 0) {
        return Response.json({ error: 'Saldo tidak boleh menjadi negatif.' }, { status: 400 });
      }
      const next = await adjustSaldo(username, delta);
      if (next === null) {
        return Response.json({ error: 'Gagal mengunci saldo pengguna. Coba lagi.' }, { status: 500 });
      }
    }

    const parts: string[] = [];
    if (parsed.data.banned !== undefined) parts.push(parsed.data.banned ? 'ban' : 'unban');
    if (parsed.data.saldoDelta) parts.push(`saldo ${parsed.data.saldoDelta > 0 ? '+' : ''}${parsed.data.saldoDelta}`);
    await writeLog({
      actor: session.username,
      action: 'user.update',
      detail: `${username} · ${parts.join(', ')}${parsed.data.reason ? ` · ${parsed.data.reason}` : ''}`,
    });
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memperbarui pengguna.';
    return Response.json({ error: message }, { status: 500 });
  }
}
