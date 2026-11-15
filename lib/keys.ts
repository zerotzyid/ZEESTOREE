/**
 * Kunci RTDB yang aman untuk path.
 * Firebase menolak karakter . # $ [ ] / di nama node, dan escape percent
 * (%2E) di-decode server sebelum divalidasi sehingga tidak bisa dipakai.
 * Email dikodekan base64url (hanya A-Za-z0-9-_) — selalu aman dan bisa dibalik.
 */
export function emailPathKey(email: string): string {
  return Buffer.from(email.trim().toLowerCase(), 'utf8').toString('base64url');
}

/** Membalikkan kunci dari emailPathKey. */
export function emailFromPathKey(key: string): string {
  return Buffer.from(key, 'base64url').toString('utf8');
}
