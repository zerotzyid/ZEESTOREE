'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { toast } from 'sonner';
import { useSettings } from '@/components/settings-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { registerSchema } from '@/lib/validators';

export default function RegisterPage() {
  const router = useRouter();
  const { settings } = useSettings();
  const reduceMotion = useReducedMotion();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ username?: string; email?: string; password?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = registerSchema.safeParse({ username, email, password });
    if (!parsed.success) {
      const fieldErrors: typeof errors = {};
      for (const issue of parsed.error.errors) {
        const key = issue.path[0] as 'username' | 'email' | 'password';
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Pendaftaran gagal.');
      toast.success('Akun berhasil dibuat.');
      router.push('/');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Pendaftaran gagal.');
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
            {settings?.systemTexts.titles.register ?? 'Daftar'}
          </h1>
          {settings?.identity.storeName ? (
            <p className="text-sm text-content-muted">{settings.identity.storeName}</p>
          ) : null}
        </div>

        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              name="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              aria-invalid={Boolean(errors.username)}
              aria-describedby={errors.username ? 'username-error' : undefined}
            />
            {errors.username ? (
              <p id="username-error" className="text-xs text-red-500">
                {errors.username}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
            {errors.email ? (
              <p id="email-error" className="text-xs text-red-500">
                {errors.email}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
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
            <p className="text-xs text-content-faint">Minimal 8 karakter.</p>
          </div>

          <Button type="submit" disabled={submitting} className="mt-1 w-full">
            {submitting ? 'Memproses...' : (settings?.systemTexts.menu.register ?? 'Daftar')}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-content-muted">
          Sudah punya akun?{' '}
          <Link href="/login" className="text-accent hover:underline">
            {settings?.systemTexts.menu.login ?? 'Masuk'}
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
