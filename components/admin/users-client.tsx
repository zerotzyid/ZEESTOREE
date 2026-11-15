'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ban, CheckCircle2, Loader2, Plus, Search, ShieldCheck, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { FadeIn } from '@/components/anim';
import { formatDateTimeWIB, formatRupiah } from '@/lib/format';

type AdminUser = {
  key: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  saldo: number;
  banned: boolean;
  createdAt: number;
};

async function readError(res: Response): Promise<string> {
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  return data?.error ?? `Permintaan gagal (${res.status}).`;
}

export function UsersClient() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const [saldoTarget, setSaldoTarget] = useState<AdminUser | null>(null);
  const [saldoValue, setSaldoValue] = useState('');
  const [saldoReason, setSaldoReason] = useState('');
  const [savingSaldo, setSavingSaldo] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users', { cache: 'no-store' });
      if (!res.ok) throw new Error(await readError(res));
      const data = (await res.json()) as { users?: AdminUser[] };
      setUsers(data.users ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat pengguna.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [users, search]);

  const toggleBan = async (user: AdminUser) => {
    setBusyKey(user.key);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(user.key)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ banned: !user.banned }),
      });
      if (!res.ok) throw new Error(await readError(res));
      toast.success(user.banned ? 'Pengguna dibuka blokirnya.' : 'Pengguna diblokir.');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal memperbarui pengguna.');
    } finally {
      setBusyKey(null);
    }
  };

  const saveSaldo = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!saldoTarget) return;
    const delta = Number.parseInt(saldoValue.replace(/[^\d-]/g, ''), 10);
    if (!Number.isFinite(delta) || delta === 0) {
      toast.error('Masukkan nominal koreksi (positif menambah, negatif mengurangi).');
      return;
    }
    setSavingSaldo(true);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(saldoTarget.key)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saldoDelta: delta, reason: saldoReason.trim() || undefined }),
      });
      if (!res.ok) throw new Error(await readError(res));
      toast.success(`Saldo ${saldoTarget.username} dikoreksi ${delta > 0 ? '+' : ''}${formatRupiah(delta)}.`);
      setSaldoTarget(null);
      setSaldoValue('');
      setSaldoReason('');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengoreksi saldo.');
    } finally {
      setSavingSaldo(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-11 w-full" />
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={Ban}
        title="Gagal memuat pengguna"
        description={error}
        action={
          <Button variant="outline" onClick={() => void load()}>
            Coba lagi
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search
          aria-hidden
          size={16}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-content-faint"
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari username atau email…"
          className="pl-10"
          aria-label="Cari pengguna"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={users.length === 0 ? 'Belum ada pengguna' : 'Tidak ada yang cocok'}
          description={
            users.length === 0
              ? 'Pengguna terdaftar akan tampil di sini.'
              : 'Ubah kata kunci pencarian.'
          }
        />
      ) : (
        <>
          {/* Tabel desktop */}
          <div className="glass hidden overflow-hidden rounded-2xl md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line/60 text-left text-xs uppercase tracking-wider text-content-faint">
                  <th className="px-4 py-3 font-medium">Pengguna</th>
                  <th className="px-4 py-3 font-medium">Saldo</th>
                  <th className="px-4 py-3 font-medium">Bergabung</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/50">
                {filtered.map((user) => (
                  <tr key={user.key} className="transition-colors hover:bg-content/[0.03]">
                    <td className="px-4 py-3">
                      <p className="flex items-center gap-2 font-medium text-content">
                        {user.username}
                        {user.role === 'admin' ? (
                          <Badge variant="default">
                            <ShieldCheck aria-hidden size={11} /> Admin
                          </Badge>
                        ) : null}
                      </p>
                      <p className="text-xs text-content-faint">{user.email || '—'}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-content">
                      {formatRupiah(user.saldo)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-content-muted">
                      {user.createdAt ? formatDateTimeWIB(user.createdAt) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={user.banned ? 'danger' : 'success'}>
                        {user.banned ? 'Diblokir' : 'Aktif'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSaldoTarget(user);
                            setSaldoValue('');
                            setSaldoReason('');
                          }}
                        >
                          <Plus aria-hidden size={14} />
                          Saldo
                        </Button>
                        {user.role !== 'admin' ? (
                          <Button
                            type="button"
                            variant={user.banned ? 'outline' : 'ghost'}
                            size="sm"
                            disabled={busyKey === user.key}
                            onClick={() => void toggleBan(user)}
                          >
                            {busyKey === user.key ? (
                              <Loader2 aria-hidden size={14} className="animate-spin" />
                            ) : user.banned ? (
                              <CheckCircle2 aria-hidden size={14} />
                            ) : (
                              <Ban aria-hidden size={14} />
                            )}
                            {user.banned ? 'Buka' : 'Blokir'}
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Kartu mobile */}
          <div className="flex flex-col gap-3 md:hidden">
            {filtered.map((user) => (
              <FadeIn key={user.key} y={8}>
                <div className="glass flex flex-col gap-3 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-content">{user.username}</p>
                      <p className="truncate text-xs text-content-faint">{user.email || '—'}</p>
                    </div>
                    <Badge variant={user.banned ? 'danger' : user.role === 'admin' ? 'default' : 'success'}>
                      {user.banned ? 'Diblokir' : user.role === 'admin' ? 'Admin' : 'Aktif'}
                    </Badge>
                  </div>
                  <p className="text-sm text-content">{formatRupiah(user.saldo)}</p>
                  <div className="flex justify-end gap-2 border-t border-line/50 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSaldoTarget(user);
                        setSaldoValue('');
                        setSaldoReason('');
                      }}
                    >
                      Koreksi saldo
                    </Button>
                    {user.role !== 'admin' ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={busyKey === user.key}
                        onClick={() => void toggleBan(user)}
                      >
                        {user.banned ? 'Buka blokir' : 'Blokir'}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </>
      )}

      <Dialog open={Boolean(saldoTarget)} onOpenChange={(open) => !open && setSaldoTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Koreksi Saldo</DialogTitle>
            <DialogDescription>
              {saldoTarget?.username} · saldo saat ini {formatRupiah(saldoTarget?.saldo ?? 0)}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveSaldo} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="saldo-delta" className="text-sm font-medium text-content">
                Nominal (Rp)
              </label>
              <Input
                id="saldo-delta"
                value={saldoValue}
                onChange={(e) => setSaldoValue(e.target.value)}
                placeholder="contoh: 50000 atau -10000"
                inputMode="numeric"
                required
              />
              <p className="text-xs text-content-faint">
                Angka positif menambah saldo, negatif mengurangi. Tercatat di log admin.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="saldo-reason" className="text-sm font-medium text-content">
                Alasan (opsional)
              </label>
              <Input
                id="saldo-reason"
                value={saldoReason}
                onChange={(e) => setSaldoReason(e.target.value)}
                maxLength={200}
                placeholder="contoh: koreksi manual"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setSaldoTarget(null)}>
                Batal
              </Button>
              <Button type="submit" disabled={savingSaldo}>
                {savingSaldo ? <Loader2 aria-hidden size={16} className="animate-spin" /> : null}
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
