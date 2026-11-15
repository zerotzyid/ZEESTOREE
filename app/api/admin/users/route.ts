import { get } from '@/lib/rtdb';
import { requireAdmin } from '@/lib/authz';

export const dynamic = 'force-dynamic';

export type AdminUserRow = {
  key: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  saldo: number;
  banned: boolean;
  createdAt: number;
};

/** GET: daftar pengguna (tanpa hash password) untuk tabel admin. */
export async function GET(): Promise<Response> {
  const session = await requireAdmin();
  if (!session) {
    return Response.json({ error: 'Hanya admin.' }, { status: 403 });
  }

  try {
    const users = await get<Record<string, Record<string, unknown>>>('users');
    const list: AdminUserRow[] = users
      ? Object.entries(users)
          .filter(([, doc]) => doc && typeof doc === 'object' && typeof doc.username === 'string')
          .map(([key, doc]) => ({
            key,
            username: String(doc.username),
            email: typeof doc.email === 'string' ? doc.email : '',
            role: (doc.role === 'admin' ? 'admin' : 'user') as AdminUserRow['role'],
            saldo: typeof doc.saldo === 'number' ? doc.saldo : 0,
            banned: doc.banned === true,
            createdAt: typeof doc.createdAt === 'number' ? doc.createdAt : 0,
          }))
          .sort((a, b) => b.createdAt - a.createdAt)
      : [];
    return Response.json({ users: list }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memuat pengguna.';
    return Response.json({ error: message }, { status: 500 });
  }
}
