import { cookies } from 'next/headers';
import { createHash } from 'crypto';
import { get, set, type Json } from '@/lib/rtdb';
import { createSession } from '@/lib/session';
import { emailPathKey } from '@/lib/keys';
import { writeLog } from '@/lib/log';

/**
 * Callback OAuth Google.
 * Google mengarahkan kembali ke sini setelah pengguna menyetujui izin.
 * Kode ditukarkan dengan token, lalu informasi profil diambil dari Google.
 * Pengguna dicari atau dibuat di RTDB, lalu sesi dibuat.
 */
export const dynamic = 'force-dynamic';

type GoogleTokenResponse = {
  access_token?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleUserInfo = {
  id: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
};

export async function GET(request: Request): Promise<Response> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return Response.json(
      { error: 'Login Google belum dikonfigurasi admin.' },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return Response.redirect(`/login?error=google_${error}`);
  }

  if (!code || !state) {
    return Response.redirect('/login?error=google_invalid_response');
  }

  // Verifikasi state (CSRF protection)
  const store = await cookies();
  const storedState = store.get('oauth_state')?.value;
  store.delete('oauth_state');

  if (!storedState || storedState !== state) {
    return Response.redirect('/login?error=google_invalid_state');
  }

  try {
    // 1. Tukarkan kode dengan token dari Google
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = (await tokenRes.json()) as GoogleTokenResponse;
    if (!tokenRes.ok || !tokenData.access_token) {
      return Response.redirect(`/login?error=google_token_failed`);
    }

    // 2. Ambil informasi pengguna dari Google
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userRes.ok) {
      return Response.redirect('/login?error=google_userinfo_failed');
    }

    const profile = (await userRes.json()) as GoogleUserInfo;
    if (!profile.email || !profile.email_verified) {
      return Response.redirect('/login?error=google_email_unverified');
    }

    const emailKey = emailPathKey(profile.email);
    const emailLower = profile.email.toLowerCase();

    // 3. Cari pengguna berdasarkan email
    let user = await get<{ username: string; email: string; passwordHash: string; role: 'user' | 'admin'; saldo: number; banned: boolean; createdAt: number; googleId?: string }>(
      `users_by_email/${emailKey}`
    );

    let username: string;

    if (user) {
      // Pengguna sudah ada — tautkan Google ID jika belum
      username = user.username;
      if (!user.googleId) {
        await set(`users/${username}/googleId`, profile.id);
        await writeLog({ actor: username, action: 'auth.google_link' });
      }
    } else {
      // Buat pengguna baru dari profil Google
      // Buat username dari email (bagian sebelum @), bersihkan karakter yang tidak diizinkan
      const baseUsername = profile.email.split('@')[0]
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .slice(0, 24) || `user${profile.id.slice(-6)}`;

      let finalUsername = baseUsername;
      let counter = 1;
      while (await get(`users/${finalUsername.toLowerCase()}`)) {
        finalUsername = `${baseUsername}${counter}`;
        counter++;
        if (counter > 100) {
          return Response.redirect('/login?error=google_username_taken');
        }
      }

      username = finalUsername;

      const newUser: {
        username: string;
        email: string;
        passwordHash: string;
        role: 'user' | 'admin';
        saldo: number;
        banned: boolean;
        createdAt: number;
        googleId: string;
      } = {
        username,
        email: emailLower,
        passwordHash: '', // Tidak pakai password untuk login Google
        role: 'user',
        saldo: 0,
        banned: false,
        createdAt: Date.now(),
        googleId: profile.id,
      };

      await set(`users/${username.toLowerCase()}`, newUser as unknown as Json);
      await set(`users_by_email/${emailKey}`, username.toLowerCase());

      await writeLog({ actor: username, action: 'auth.google_register' });
    }

    // 4. Buat sesi
    await createSession({ username, role: 'user' });
    await writeLog({ actor: username, action: 'auth.login' });

    // 5. Arahkan ke halaman yang diminta atau beranda
    const next = searchParams.get('next') || '/';
    return Response.redirect(next.startsWith('/') ? next : '/');
  } catch {
    return Response.redirect('/login?error=google_server_error');
  }
}
