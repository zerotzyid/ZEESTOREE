'use client';

import { Suspense, useState } from 'react';
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

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { settings } = useSettings();
  const reduceMotion = useReducedMotion();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const nextPath = searchParams.get('next');

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

        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
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
