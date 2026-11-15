import bcrypt from 'bcryptjs';
import { get, set, type Json } from '@/lib/rtdb';
import { createSession } from '@/lib/session';
import { loginSchema } from '@/lib/validators';
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

const INVALID = 'Username atau password salah.';

async function findUser(identifier: string): Promise<StoredUser | null> {
  const id = identifier.trim().toLowerCase();
  // Username hanya [a-zA-Z0-9_] — aman untuk path. Email mengandung titik
  // (dilarang di path RTDB), jadi lewat index users_by_email yang sudah dikodekan.
  if (!id.includes('@')) {
    return get<StoredUser>(`users/${id}`);
  }
  const byEmail = await get<string>(`users_by_email/${emailPathKey(id)}`);
  if (!byEmail) return null;
  return get<StoredUser>(`users/${byEmail}`);
}

/**
 * Admin pertama (FR-A4): bila belum ada user dengan ADMIN_USERNAME
 * dan kredensial cocok dengan env, buat/promosikan menjadi admin.
 */
async function bootstrapAdmin(identifier: string, password: string): Promise<StoredUser | null> {
  const adminUser = process.env.ADMIN_USERNAME;
  const adminPass = process.env.ADMIN_PASSWORD;
  if (!adminUser || !adminPass) return null;
  if (identifier.toLowerCase() !== adminUser.toLowerCase()) return null;
  if (password !== adminPass) return null;

  const key = adminUser.toLowerCase();
  const existing = await get<StoredUser>(`users/${key}`);
  if (existing) {
    if (existing.role === 'admin') return existing;
    // Cocok dengan kredensial env -> promosikan menjadi admin.
    await set(`users/${key}/role`, 'admin');
    await writeLog({ actor: adminUser, action: 'auth.admin_promote' });
    return { ...existing, role: 'admin' };
  }

  const user: StoredUser = {
    username: adminUser,
    email: '',
    passwordHash: await bcrypt.hash(password, 10),
    role: 'admin',
    saldo: 0,
    banned: false,
    createdAt: Date.now(),
  };
  await set(`users/${key}`, user as unknown as Json);
  await writeLog({ actor: adminUser, action: 'auth.admin_bootstrap' });
  return user;
}

export async function POST(request: Request): Promise<Response> {
  const ip = clientIp(request);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Permintaan tidak valid.' }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.errors[0]?.message ?? 'Input tidak valid.' },
      { status: 400 }
    );
  }

  const identifier = parsed.data.identifier;
  const limit = rateLimit(`login:${ip}:${identifier.toLowerCase()}`, 5, 60 * 1000);
  if (!limit.ok) {
    return Response.json(
      { error: `Terlalu banyak percobaan. Coba lagi dalam ${limit.retryAfterSec} detik.` },
      { status: 429 }
    );
  }

  try {
    let user = await findUser(identifier);
    if (!user) {
      user = await bootstrapAdmin(identifier, parsed.data.password);
      if (!user) {
        return Response.json({ error: INVALID }, { status: 401 });
      }
    } else {
      const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
      if (!valid) {
        // Cek bootstrapping admin bila hash env berbeda dari hash tersimpan.
        const bootstrapped = await bootstrapAdmin(identifier, parsed.data.password);
        if (!bootstrapped) {
          return Response.json({ error: INVALID }, { status: 401 });
        }
        user = bootstrapped;
      }
    }

    if (user.banned) {
      return Response.json(
        { error: 'Akun Anda diblokir. Hubungi admin untuk informasi lebih lanjut.' },
        { status: 403 }
      );
    }

    await createSession({ username: user.username, role: user.role });
    await writeLog({ actor: user.username, action: 'auth.login' });
    return Response.json({ ok: true, role: user.role });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login gagal. Coba lagi.';
    return Response.json({ error: message }, { status: 500 });
  }
}
