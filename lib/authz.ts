import { getSession, type Session } from './session';

/** Mengambil sesi bila pengguna login (role apa pun), selainnya null. */
export async function requireUser(): Promise<Session | null> {
  return getSession();
}

/** Mengambil sesi bila role admin, selainnya null. */
export async function requireAdmin(): Promise<Session | null> {
  const session = await getSession();
  if (!session || session.role !== 'admin') return null;
  return session;
}
