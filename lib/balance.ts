import { getWithEtag, setIfMatch, type Json } from '@/lib/rtdb';

type UserForBalance = { saldo?: number } & Record<string, unknown>;

/**
 * Menambah/mengurangi saldo pengguna secara aman (ETag retry).
 * Mengembalikan saldo baru, atau null bila gagal mengunci / pengguna tidak ada.
 */
export async function adjustSaldo(userKey: string, delta: number): Promise<number | null> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const read = await getWithEtag<UserForBalance>(`users/${userKey}`);
    const user = read.value;
    if (!user) return null;
    const current = typeof user.saldo === 'number' ? user.saldo : 0;
    const next = current + delta;
    if (next < 0) return null;
    const put = await setIfMatch(
      `users/${userKey}`,
      { ...user, saldo: next } as unknown as Json,
      read.etag
    );
    if (put.ok) return next;
  }
  return null;
}
