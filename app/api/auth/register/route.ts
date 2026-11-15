import bcrypt from 'bcryptjs';
import { get, set, type Json } from '@/lib/rtdb';
import { createSession } from '@/lib/session';
import { registerSchema } from '@/lib/validators';
import { emailPathKey } from '@/lib/keys';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { writeLog } from '@/lib/log';

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

export async function POST(request: Request): Promise<Response> {
  const ip = clientIp(request);
  const limit = rateLimit(`register:${ip}`, 5, 10 * 60 * 1000);
  if (!limit.ok) {
    return Response.json(
      { error: `Terlalu banyak percobaan. Coba lagi dalam ${limit.retryAfterSec} detik.` },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Permintaan tidak valid.' }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.errors[0]?.message ?? 'Input tidak valid.' },
      { status: 400 }
    );
  }

  const usernameKey = parsed.data.username.toLowerCase();
  const emailKey = emailPathKey(parsed.data.email);

  try {
    const existingUsername = await get<StoredUser>(`users/${usernameKey}`);
    if (existingUsername) {
      return Response.json({ error: 'Username sudah dipakai.' }, { status: 409 });
    }
    const existingEmail = await get<string>(`users_by_email/${emailKey}`);
    if (existingEmail) {
      return Response.json({ error: 'Email sudah terdaftar.' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    const user: StoredUser = {
      username: parsed.data.username,
      email: parsed.data.email,
      passwordHash,
      role: 'user',
      saldo: 0,
      banned: false,
      createdAt: Date.now(),
    };

    await set(`users/${usernameKey}`, user as unknown as Json);
    try {
      await set(`users_by_email/${emailKey}`, usernameKey);
    } catch (error) {
      await set(`users/${usernameKey}`, null);
      throw error;
    }

    await createSession({ username: parsed.data.username, role: 'user' });
    await writeLog({ actor: parsed.data.username, action: 'auth.register' });
    return Response.json({ ok: true, role: 'user' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Pendaftaran gagal. Coba lagi.';
    return Response.json({ error: message }, { status: 500 });
  }
}
