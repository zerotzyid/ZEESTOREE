'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Route } from 'next';
import { motion, useReducedMotion } from 'framer-motion';
import { toast } from 'sonner';
import { useSettings } from '@/components/settings-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loginSchema } from '@/lib/validators';
import { Mail, Github } from 'lucide-react';

type OAuthProvider = {
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  name: string;
  icon?: string;
};

type OAuthSettings = {
  enabled: boolean;
  providers: Record<string, OAuthProvider>;
};

const PROVIDER_ICONS: Record<string, React.ElementType> = {
  google: Mail,
  github: Github,
};

function getProviderIcon(provider: string): React.ElementType {
  return PROVIDER_ICONS[provider] || Mail;
}

function OAuthIcon({ provider }: { provider: string }) {
  const Icon = getProviderIcon(provider);
  return <Icon aria-hidden size={16} />;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { settings } = useSettings();
  const reduceMotion = useReducedMotion();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [oauthLoading, setOAuthLoading] = useState(false);

  const nextPath = searchParams.get('next');
  const loginError = searchParams.get('error');

  const oauth: OAuthSettings | undefined = settings?.oauth;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = loginSchema.safeParse({ identifier, password });
    if (!parsed.success) {
      const fieldErrors: typeof errors = {};
      for (const issue of parsed.error.errors) {
        const key = issue.path[0] as 'identifier' | 'password';
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const data = (await res.json()) as { error?: string; role?: string };
      if (!res.ok) throw new Error(data.error ?? 'Login gagal.');
      toast.success('Berhasil masuk.');
      const target: Route =
        data.role === 'admin'
          ? '/admin'
          : nextPath && nextPath.startsWith('/')
            ? (nextPath as Route)
            : '/';
      router.push(target);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login gagal.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOAuthLogin = useCallback(
    async (provider: string) => {
      if (!oauth?.enabled || !oauth.providers?.[provider]?.enabled) {
        toast.error(`Penyedia OAuth '${provider}' tidak diaktifkan.`);
        return;
      }

      setOAuthLoading(true);
      try {
        // Inisialisasi Firebase client SDK untuk OAuth
        const { initializeApp } = await import('firebase/app');
        const {
          getAuth,
          signInWithPopup,
          GoogleAuthProvider,
          GithubAuthProvider,
        } = await import('firebase/auth');

        const firebaseConfig = {
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        };

        if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
          toast.error('Firebase belum dikonfigurasi di sisi klien.');
          return;
        }

        const app = initializeApp(firebaseConfig, `oauth-${provider}`);
        const auth = getAuth(app);

        let result: any;
        if (provider === 'google') {
          result = await signInWithPopup(auth, new GoogleAuthProvider());
        } else if (provider === 'github') {
          result = await signInWithPopup(auth, new GithubAuthProvider());
        } else {
          toast.error(`Penyedia '${provider}' belum didukung.`);
          return;
        }

        const idToken = await result.user.getIdToken();

        // Kirim ID Token ke backend untuk verifikasi dan buat sesi
        const res = await fetch(`/api/auth/oauth/${provider}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken, next: nextPath ?? undefined }),
        });

        const data = (await res.json()) as { ok?: boolean; role?: string; next?: string; error?: string };
        if (!res.ok || !data.ok) {
          toast.error(data.error ?? 'Login OAuth gagal.');
          return;
        }

        toast.success('Berhasil masuk dengan ' + (oauth.providers[provider]?.name ?? provider));
        const target: Route =
          data.next && data.next.startsWith('/')
            ? (data.next as Route)
            : data.role === 'admin'
              ? '/admin'
              : nextPath && nextPath.startsWith('/')
                ? (nextPath as Route)
                : '/';
        router.push(target);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Login OAuth gagal.');
      } finally {
        setOAuthLoading(false);
      }
    },
    [oauth, nextPath, router]
  );

  const enabledProviders = Object.entries(oauth?.providers ?? {})
    .filter(([, p]) => p.enabled)
    .map(([key, p]) => ({ key, ...p }));

  const animation = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.24 },
      };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-10">
      <motion.div {...animation} className="glass rounded-3xl p-6 shadow-soft sm:p-8">
        <div className="mb-6 flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-content">
            {settings?.systemTexts.titles.login ?? 'Masuk'}
          </h1>
          {settings?.identity.storeName ? (
            <p className="text-sm text-content-muted">{settings.identity.storeName}</p>
          ) : null}
        </div>

        {/* OAuth providers */}
        {oauth?.enabled && enabledProviders.length > 0 ? (
          <div className="flex flex-col gap-2">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-line/60"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase font-medium text-content-faint px-2">
                Atau masuk dengan
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {enabledProviders.map((prov) => (
                <Button
                  key={prov.key}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleOAuthLogin(prov.key)}
                  disabled={submitting || oauthLoading}
                  className="w-full flex items-center justify-center gap-2"
                >
                  {oauthLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="relative h-4 w-4">
                        <span className="animate-spin block h-full w-full rounded-full border-2 border-accent border-t-transparent"></span>
                      </span>
                    </span>
                  ) : (
                    <OAuthIcon provider={prov.key} />
                  )}
                  {prov.name}
                </Button>
              ))}
            </div>
          </div>
        ) : null}

        <form onSubmit={submit} noValidate className={`flex flex-col gap-4 ${oauth?.enabled && enabledProviders.length > 0 ? 'pt-6 border-t border-line/60' : ''}`}>
          {loginError && (
            <p className="text-xs text-red-500 text-center animate-pulse">
              {loginError === 'google_invalid_state'
                ? 'Sesi Google tidak valid. Coba lagi.'
                : loginError === 'google_email_unverified'
                  ? 'Email Google belum diverifikasi.'
                  : loginError === 'google_token_failed'
                    ? 'Gagal mengautentikasi dengan Google.'
                    : loginError === 'google_userinfo_failed'
                      ? 'Gagal mengambil data profil Google.'
                      : loginError === 'google_username_taken'
                        ? 'Gagal membuat username dari akun Google.'
                        : loginError.startsWith('google_')
                          ? 'Login dengan Google gagal. Coba lagi.'
                          : 'Login gagal. Coba lagi.'}
            </p>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="identifier">Username atau email</Label>
            <Input
              id="identifier"
              name="identifier"
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              aria-invalid={Boolean(errors.identifier)}
              aria-describedby={errors.identifier ? 'identifier-error' : undefined}
            />
            {errors.identifier ? (
              <p id="identifier-error" className="text-xs text-red-500">
                {errors.identifier}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'password-error' : undefined}
            />
            {errors.password ? (
              <p id="password-error" className="text-xs text-red-500">
                {errors.password}
              </p>
            ) : null}
          </div>

          <Button type="submit" disabled={submitting} className="mt-1 w-full">
            {submitting ? 'Memproses...' : (settings?.systemTexts.menu.login ?? 'Masuk')}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-content-muted">
          Belum punya akun?{' '}
          <Link href="/register" className="text-accent hover:underline">
            {settings?.systemTexts.menu.register ?? 'Daftar'}
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
