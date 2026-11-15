import { SignJWT, importPKCS8 } from 'jose';

/**
 * Pembungkus semua panggilan Firebase Realtime Database lewat REST API.
 * Sumber: https://firebase.google.com/docs/database/rest
 * Autentikasi: Google OAuth2 access token dari service account
 * (scope resmi: userinfo.email + firebase.database).
 */

export type Json = null | string | number | boolean | Json[] | { [key: string]: Json };

type ServiceAccount = { client_email: string; private_key: string };

const SCOPES = 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/firebase.database';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

let cachedToken: { token: string; exp: number } | null = null;
let tokenPromise: Promise<string> | null = null;

function getDatabaseUrl(): string {
  const url = process.env.FIREBASE_DATABASE_URL;
  if (!url) throw new Error('FIREBASE_DATABASE_URL belum diatur.');
  return url.replace(/\/+$/, '');
}

function getServiceAccount(): ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT belum diatur.');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT bukan JSON yang valid.');
  }
  const sa = parsed as Partial<ServiceAccount>;
  if (!sa.client_email || !sa.private_key) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT tidak memiliki client_email/private_key.');
  }
  return { client_email: sa.client_email, private_key: sa.private_key.replace(/\\n/g, '\n') };
}

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.token;
  if (!tokenPromise) {
    tokenPromise = (async () => {
      const sa = getServiceAccount();
      const key = await importPKCS8(sa.private_key, 'RS256');
      const assertion = await new SignJWT({ scope: SCOPES })
        .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
        .setIssuer(sa.client_email)
        .setAudience(TOKEN_URL)
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(key);
      const res = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion,
        }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(`Gagal mendapatkan access token Firebase (${res.status}). ${detail.slice(0, 200)}`);
      }
      const data = (await res.json()) as { access_token: string; expires_in: number };
      const issuedAt = Math.floor(Date.now() / 1000);
      cachedToken = { token: data.access_token, exp: issuedAt + (data.expires_in ?? 3600) };
      return data.access_token;
    })().finally(() => {
      tokenPromise = null;
    });
  }
  return tokenPromise;
}

function buildUrl(path: string, query?: URLSearchParams): string {
  const clean = path.replace(/^\/+|\/+$/g, '');
  const base = `${getDatabaseUrl()}/${clean}.json`;
  const qs = query && [...query.keys()].length > 0 ? `?${query.toString()}` : '';
  return `${base}${qs}`;
}

async function parseError(res: Response, path: string): Promise<Error> {
  let detail = '';
  try {
    detail = (await res.text()).slice(0, 300);
  } catch {
    /* abaikan */
  }
  if (res.status === 401) {
    return new Error(`RTDB menolak akses (401) di "${path}". Periksa FIREBASE_SERVICE_ACCOUNT dan Security Rules. ${detail}`);
  }
  return new Error(`Permintaan RTDB gagal (${res.status}) di "${path}". ${detail}`);
}

export type QueryOptions = {
  orderBy?: string;
  equalTo?: string | number | boolean;
  startAt?: string | number;
  endAt?: string | number;
  limitToFirst?: number;
  limitToLast?: number;
  shallow?: boolean;
};

function buildQuery(options?: QueryOptions): URLSearchParams | undefined {
  if (!options) return undefined;
  const q = new URLSearchParams();
  if (options.orderBy !== undefined) q.set('orderBy', JSON.stringify(options.orderBy));
  if (options.equalTo !== undefined) q.set('equalTo', JSON.stringify(options.equalTo));
  if (options.startAt !== undefined) q.set('startAt', JSON.stringify(options.startAt));
  if (options.endAt !== undefined) q.set('endAt', JSON.stringify(options.endAt));
  if (options.limitToFirst !== undefined) q.set('limitToFirst', String(options.limitToFirst));
  if (options.limitToLast !== undefined) q.set('limitToLast', String(options.limitToLast));
  if (options.shallow) q.set('shallow', 'true');
  return q.keys().next().done ? undefined : q;
}

/** GET satu path. Mengembalikan null bila node tidak ada. */
export async function get<T = Json>(path: string, options?: QueryOptions): Promise<T | null> {
  const token = await getAccessToken();
  const res = await fetch(buildUrl(path, buildQuery(options)), {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw await parseError(res, path);
  return (await res.json()) as T | null;
}

/** GET + ETag pada path yang sama (untuk penulisan bersyarat). */
export async function getWithEtag<T = Json>(
  path: string
): Promise<{ value: T | null; etag: string | null }> {
  const token = await getAccessToken();
  const res = await fetch(buildUrl(path), {
    headers: { Authorization: `Bearer ${token}`, 'X-Firebase-ETag': 'true' },
    cache: 'no-store',
  });
  if (!res.ok) throw await parseError(res, path);
  const value = (await res.json()) as T | null;
  return { value, etag: res.headers.get('ETag') };
}

/** PUT — menulis/mengganti seluruh isi path. null menghapus path. */
export async function set<T = Json>(path: string, value: Json): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(buildUrl(path), {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(value),
    cache: 'no-store',
  });
  if (!res.ok) throw await parseError(res, path);
  return (await res.json()) as T;
}

/**
 * PUT bersyarat dengan If-Match (setara transaksi REST RTDB).
 * ok=false bila ETag sudah tidak cocok (data berubah oleh pihak lain).
 */
export async function setIfMatch<T = Json>(
  path: string,
  value: Json,
  etag: string | null
): Promise<{ ok: boolean; value: T | null; etag: string | null }> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  if (etag) headers['If-Match'] = etag;
  const res = await fetch(buildUrl(path), {
    method: 'PUT',
    headers,
    body: JSON.stringify(value),
    cache: 'no-store',
  });
  if (res.status === 412) {
    const body = (await res.json().catch(() => null)) as T | null;
    return { ok: false, value: body, etag: res.headers.get('ETag') };
  }
  if (!res.ok) throw await parseError(res, path);
  return { ok: true, value: (await res.json()) as T, etag: res.headers.get('ETag') };
}

/**
 * PATCH — update sebagian child. Mendukung multi-path update
 * (key objek berupa "path/anak" untuk menulis banyak lokasi sekaligus).
 */
export async function update(path: string, value: Record<string, Json>): Promise<void> {
  const token = await getAccessToken();
  const res = await fetch(buildUrl(path), {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(value),
    cache: 'no-store',
  });
  if (!res.ok) throw await parseError(res, path);
}

/** POST — membuat child baru dengan key unik. Mengembalikan key-nya. */
export async function push(path: string, value: Json): Promise<string> {
  const token = await getAccessToken();
  const res = await fetch(buildUrl(path), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(value),
    cache: 'no-store',
  });
  if (!res.ok) throw await parseError(res, path);
  const data = (await res.json()) as { name: string } | null;
  if (!data?.name) throw await parseError(res, path);
  return data.name;
}

/** DELETE — menghapus path. */
export async function remove(path: string): Promise<void> {
  const token = await getAccessToken();
  const res = await fetch(buildUrl(path), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw await parseError(res, path);
}
