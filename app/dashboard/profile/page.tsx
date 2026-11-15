'use client';

import { useCallback, useEffect, useState } from 'react';
import { KeyRound, Loader2, RefreshCw, Save, User } from 'lucide-react';
import { toast } from 'sonner';
import { useSettings } from '@/components/settings-provider';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateWIB } from '@/lib/format';

type Profile = { username: string; email: string; saldo: number; createdAt: number };

export default function ProfilePage() {
  const { settings } = useSettings();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const load = useCallback(async () => {
    setState('loading');
    try {
      const res = await fetch('/api/user/profile', { cache: 'no-store' });
      if (res.status === 401) {
        window.location.href = '/login?next=/dashboard/profile';
        return;
      }
      if (!res.ok) throw new Error('Gagal memuat profil.');
      const data = (await res.json()) as Profile;
      setProfile(data);
      setEmail(data.email ?? '');
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingEmail(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Gagal menyimpan email.');
      toast.success('Email diperbarui.');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyimpan email.');
    } finally {
      setSavingEmail(false);
    }
  };

  const savePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword.length < 8) {
      toast.error('Password baru minimal 8 karakter.');
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Gagal mengganti password.');
      toast.success('Password berhasil diganti.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal mengganti password.');
    } finally {
      setSavingPassword(false);
    }
  };

  if (state === 'loading') {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (state === 'error' || !profile) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          icon={RefreshCw}
          title="Gagal memuat profil"
          description="Periksa koneksi lalu coba lagi."
          action={
            <Button variant="outline" size="sm" onClick={() => void load()}>
              Coba lagi
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="label-mono">{settings?.systemTexts.menu.dashboard ?? 'Dashboard'}</p>
        <h1 className="text-2xl font-semibold text-content">
          {settings?.systemTexts.menu.profile ?? 'Profil'}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User aria-hidden size={17} className="text-accent" />
            Data akun
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-content-muted">Username</span>
            <span className="font-mono text-content">{profile.username}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-content-muted">Bergabung</span>
            <span className="text-content">{formatDateWIB(profile.createdAt)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveEmail} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="profile-email">Alamat email</Label>
              <Input
                id="profile-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" size="sm" className="self-start" disabled={savingEmail}>
              {savingEmail ? <Loader2 aria-hidden size={15} className="animate-spin" /> : <Save aria-hidden size={15} />}
              {savingEmail ? 'Menyimpan...' : 'Simpan email'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound aria-hidden size={17} className="text-accent" />
            Ganti password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={savePassword} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="current-password">Password saat ini</Label>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-password">Password baru</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
              <p className="text-xs text-content-faint">Minimal 8 karakter.</p>
            </div>
            <Button type="submit" size="sm" className="self-start" disabled={savingPassword}>
              {savingPassword ? (
                <Loader2 aria-hidden size={15} className="animate-spin" />
              ) : (
                <KeyRound aria-hidden size={15} />
              )}
              {savingPassword ? 'Memproses...' : 'Ganti password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
