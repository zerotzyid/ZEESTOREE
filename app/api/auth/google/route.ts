import { createHash } from 'crypto';
import { cookies } from 'next/headers';

/**
 * Memulai alur OAuth Google.
 * Mengarahkan pengguna ke halaman persetujuan Google.
 * Setelah setuju, Google akan mengarahkan kembali ke /api/auth/google/callback.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return Response.json(
      { error: 'Login Google belum dikonfigurasi admin.' },
      { status: 500 }
    );
  }

  // State untuk proteksi CSRF
  const state = createHash('sha256').update(String(Date.now()) + Math.random()).digest('hex');

  const store = await cookies();
  store.set('oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 10 * 60, // 10 menit
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  const googleUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return Response.redirect(googleUrl);
}
