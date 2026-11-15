import { initializeApp, getApps, cert, type AppOptions } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

/**
 * Inisialisasi Firebase Admin SDK untuk verifikasi ID Token dari OAuth provider.
 * Konfigurasi diambil dari environment variables (tidak disimpan di RTDB karena mengandung private key).
 */
function getFirebaseConfig(): AppOptions | null {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return {
    credential: cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    }),
    projectId,
  };
}

let firebaseApp: ReturnType<typeof initializeApp> | null = null;

export function getFirebaseAuth() {
  if (!firebaseApp) {
    const config = getFirebaseConfig();
    if (!config) {
      throw new Error('Firebase Admin belum dikonfigurasi (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY).');
    }
    if (getApps().length === 0) {
      firebaseApp = initializeApp(config);
    } else {
      firebaseApp = getApps()[0];
    }
  }
  return getAuth(firebaseApp);
}

/**
 * Verifikasi Firebase ID Token dan mengembalikan data pengguna.
 * Digunakan oleh endpoint /api/auth/oauth/[provider].
 */
export async function verifyFirebaseIdToken(idToken: string) {
  const auth = getFirebaseAuth();
  const decoded = await auth.verifyIdToken(idToken);
  return {
    uid: decoded.uid,
    email: decoded.email ?? null,
    emailVerified: decoded.email_verified ?? false,
    name: decoded.name ?? null,
    picture: decoded.picture ?? null,
    provider: decoded.firebase?.identities ? Object.keys(decoded.firebase.identities)[0] : 'unknown',
    raw: decoded,
  };
}
