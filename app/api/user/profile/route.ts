import bcrypt from 'bcryptjs';
import { get, set, type Json } from '@/lib/rtdb';
import { requireUser } from '@/lib/authz';
import { emailPathKey } from '@/lib/keys';
import { writeLog } from '@/lib/log';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

type StoredUser = {
  username: string;
  email: string;
  passwordHash: string;
  role: 'user' | 'admin';
  saldo: number;
  banned: boolean;
  createdAt: number;
};

export async function GET(): Promise<Response> {
  const session = await requireUser();
  if (!session) {
    return Response.json({ error: 'Silakan masuk terlebih dahulu.' }, { status: 401 });
  }

  try {
    const user = await get<StoredUser>(`users/${session.username.toLowerCase()}`);
    if (!user) {
      return Response.json({ error: 'Akun tidak ditemukan.' }, { status: 404 });
    }
    if (user.banned) {
      return Response.json({ error: 'Akun Anda diblokir.' }, { status: 403 });
    }
    return Response.json(
      {
        username: user.username,
        email: user.email,
        saldo: user.saldo,
        createdAt: user.createdAt,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memuat profil.';
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request): Promise<Response> {
  const session = await requireUser();
  if (!session) {
    return Response.json({ error: 'Silakan masuk terlebih dahulu.' }, { status: 401 });
  }

  const key = session.username.toLowerCase();
  const limit = rateLimit(`profile:${key}`, 10, 60 * 1000);
  if (!limit.ok) {
    return Response.json(
      { error: `Terlalu banyak permintaan. Coba lagi dalam ${limit.retryAfterSec} detik.` },
      { status: 429 }
    );
  }

  let body: { email?: string; currentPassword?: string; newPassword?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Permintaan tidak valid.' }, { status: 400 });
  }

  try {
    const user = await get<StoredUser>(`users/${key}`);
    if (!user) {
      return Response.json({ error: 'Akun tidak ditemukan.' }, { status: 404 });
    }

    const updates: Record<string, Json> = {};
    const actions: string[] = [];

    if (typeof body.email === 'string' && body.email.trim()) {
      const email = body.email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 100) {
        return Response.json({ error: 'Format email tidak valid.' }, { status: 400 });
      }
      if (email !== user.email.toLowerCase()) {
        const existing = await get<string>(`users_by_email/${emailPathKey(email)}`);
        if (existing && existing !== key) {
          return Response.json({ error: 'Email sudah dipakai akun lain.' }, { status: 409 });
        }
        const oldEmail = user.email ? user.email.toLowerCase() : null;
        updates['email'] = body.email.trim();
        actions.push('email');
        if (oldEmail) {
          await set(`users_by_email/${emailPathKey(oldEmail)}`, null);
        }
        await set(`users_by_email/${emailPathKey(email)}`, key);
      }
    }

    if (typeof body.newPassword === 'string' && body.newPassword) {
      if (body.newPassword.length < 8 || body.newPassword.length > 72) {
        return Response.json({ error: 'Password baru harus 8-72 karakter.' }, { status: 400 });
      }
      if (typeof body.currentPassword !== 'string' || !body.currentPassword) {
        return Response.json({ error: 'Masukkan password saat ini.' }, { status: 400 });
      }
      const valid = await bcrypt.compare(body.currentPassword, user.passwordHash);
      if (!valid) {
        return Response.json({ error: 'Password saat ini salah.' }, { status: 400 });
      }
      updates['passwordHash'] = await bcrypt.hash(body.newPassword, 10);
      actions.push('password');
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'Tidak ada perubahan untuk disimpan.' }, { status: 400 });
    }

    for (const [field, value] of Object.entries(updates)) {
      await set(`users/${key}/${field}`, value);
    }

    await writeLog({
      actor: session.username,
      action: 'profile.update',
      detail: actions.join(', '),
    });

    return Response.json({ ok: true, updated: actions });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memperbarui profil.';
    return Response.json({ error: message }, { status: 500 });
  }
}
