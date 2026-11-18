import { get, set, type Json } from '@/lib/rtdb';
import { createSession } from '@/lib/session';
import { emailPathKey } from '@/lib/keys';
import { writeLog } from '@/lib/log';
import { verifyFirebaseIdToken } from '@/lib/firebase-admin';
import { getSettings } from '@/lib/settings';

/**
 * Endpoint callback OAuth (Firebase).
 * Alur:
 *  1. Frontend login dengan Firebase OAuth (Google, GitHub, dll).
 *  2. Frontend mengirimkan Firebase ID Token ke endpoint ini.
 *  3. Endpoint memverifikasi ID Token via Firebase Admin SDK.
 *  4. Cari atau buat pengguna di RTDB berdasarkan email.
 *  5. Buat sesi JWT lokal dan arahkan ke halaman tujuan.
 *
 * Provider yang didukung ditentukan oleh pengaturan OAuth di admin.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type OAuthRequest = {
  idToken: string;
  next?: string;
};

type StoredUser = {
  username: string;
  email: string;
  passwordHash: string;
  role: 'user' | 'admin';
  saldo: number;
  banned: boolean;
  createdAt: number;
  oauthProvider?: string;
  oauthUid?: string;
  avatar?: string | null;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
): Promise<Response> {
  const { provider } = await params;

  try {
    // Baca pengaturan OAuth dari admin
    const settings = await getSettings();
    const oauth = settings.oauth;

    if (!oauth?.enabled) {
      return Response.json({ error: 'OAuth login belum diaktifkan admin.' }, { status: 403 });
    }

    const providerConfig = (oauth.providers as Record<string, { enabled: boolean }> | undefined)?.[provider];
    if (!providerConfig || !providerConfig.enabled) {
      return Response.json({ error: `Penyedia OAuth '${provider}' tidak diaktifkan.` }, { status: 403 });
    }

    let body: OAuthRequest;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Permintaan tidak valid.' }, { status: 400 });
    }

    if (!body.idToken) {
      return Response.json({ error: 'ID Token wajib diisi.' }, { status: 400 });
    }

    // Verifikasi Firebase ID Token
    let decoded;
    try {
      decoded = await verifyFirebaseIdToken(body.idToken);
    } catch (error) {
      return Response.json({ error: 'Token OAuth tidak valid.' }, { status: 401 });
    }

    const email = decoded.email;
    if (!email || !decoded.emailVerified) {
      return Response.json({ error: 'Email tidak terverifikasi.' }, { status: 400 });
    }

    const emailLower = email.toLowerCase();
    const emailKey = emailPathKey(emailLower);

    // Cari pengguna berdasarkan email
    let existing = await get<StoredUser>(`users_by_email/${emailKey}`);
    let username: string;

    if (existing) {
      // Pengguna sudah ada — tautkan OAuth jika belum
      username = existing.username;
      const updates: Record<string, Json> = {};
      if (!existing.oauthProvider) {
        updates['oauthProvider'] = provider;
      }
      if (!existing.oauthUid) {
        updates['oauthUid'] = decoded.uid;
      }
      if (decoded.picture && !existing.avatar) {
        updates['avatar'] = decoded.picture;
      }
      if (Object.keys(updates).length > 0) {
        await set(`users/${username.toLowerCase()}`, { ...existing, ...updates } as unknown as Json);
      }
      await writeLog({ actor: username, action: 'auth.oauth_link', detail: `provider=${provider}` });
    } else {
      // Buat pengguna baru dari profil OAuth
      const baseUsername = emailLower.split('@')[0]
        .replace(/[^a-z0-9_]/g, '_')
        .slice(0, 24) || `user${decoded.uid.slice(-6)}`;

      let finalUsername = baseUsername;
      let counter = 1;
      while (await get<StoredUser>(`users/${finalUsername.toLowerCase()}`)) {
        finalUsername = `${baseUsername}${counter}`;
        counter++;
        if (counter > 100) {
          return Response.json({ error: 'Gagal membuat username.' }, { status: 500 });
        }
      }

      username = finalUsername;

      const newUser: StoredUser = {
        username,
        email: emailLower,
        passwordHash: '', // Tidak pakai password untuk login OAuth
        role: 'user',
        saldo: 0,
        banned: false,
        createdAt: Date.now(),
        oauthProvider: provider,
        oauthUid: decoded.uid,
        avatar: decoded.picture ?? null,
      };

      await set(`users/${username.toLowerCase()}`, newUser as unknown as Json);
      await set(`users_by_email/${emailKey}`, username.toLowerCase());

      await writeLog({ actor: username, action: 'auth.oauth_register', detail: `provider=${provider}` });
    }

    // Buat sesi JWT lokal
    await createSession({ username, role: 'user' });
    await writeLog({ actor: username, action: 'auth.login' });

    const next = body.next && body.next.startsWith('/') ? body.next : '/';
    return Response.json({ ok: true, role: 'user', next });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login OAuth gagal.';
    return Response.json({ error: message }, { status: 500 });
  }
}
