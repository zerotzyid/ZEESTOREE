'use client';

import React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Plus,
  Trash2,
  Edit3,
  Search,
  RefreshCw,
  Wallet,
  Percent,
  Package,
  Clock,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatRupiah } from '@/lib/format';

type Voucher = {
  code: string;
  type: 'balance' | 'discount' | 'product';
  value: number;
  productId?: string;
  discountPercent?: number;
  maxUses: number;
  usedCount: number;
  maxPerUser: number;
  minPurchase?: number;
  expiresAt?: number;
  active: boolean;
  createdAt: number;
  createdBy?: string;
  description?: string;
};

type VoucherTypeInfo = { label: string; icon: React.ElementType };

const TYPE_LABEL: Record<string, VoucherTypeInfo> = {
  balance: { label: 'Saldo', icon: Wallet },
  discount: { label: 'Diskon', icon: Percent },
  product: { label: 'Produk Gratis', icon: Package },
};

function formatDate(t: number | null | undefined): string {
  if (!t) return '—';
  return new Date(t).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function VouchersClient() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editing, setEditing] = useState<Voucher | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    setState('loading');
    try {
      const res = await fetch('/api/admin/vouchers', { cache: 'no-store' });
      if (!res.ok) throw new Error('Gagal memuat voucher.');
      const data = (await res.json()) as { vouchers?: Voucher[] };
      setVouchers(data.vouchers ?? []);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    pollRef.current = setInterval(() => void load(), 30_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const filtered = vouchers.filter(
    (v) =>
      v.code.toUpperCase().includes(search.toUpperCase()) ||
      (v.description ?? '').toUpperCase().includes(search.toUpperCase())
  );

  const stats = {
    total: vouchers.length,
    active: vouchers.filter((v) => v.active).length,
    used: vouchers.reduce((sum, v) => sum + v.usedCount, 0),
  };

  const openCreate = () => {
    setEditMode(false);
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (v: Voucher) => {
    setEditMode(true);
    setEditing(v);
    setOpen(true);
  };

  const closeDialog = () => {
    setOpen(false);
    setEditMode(false);
    setEditing(null);
  };

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSaving(true);
    try {
      const type = formData.get('type') as 'balance' | 'discount' | 'product';
      const value = Number(formData.get('value'));
      const maxUses = Number(formData.get('maxUses'));
      const maxPerUser = Number(formData.get('maxPerUser'));
      const minPurchase = formData.get('minPurchase') ? Number(formData.get('minPurchase')) : undefined;
      const expiresAt = formData.get('expiresAt') ? Number(formData.get('expiresAt')) : undefined;
      const active = formData.get('active') === 'true';
      const description = (formData.get('description') as string) || undefined;
      const customCode = (formData.get('customCode') as string) || undefined;

      let productId: string | undefined;
      let discountPercent: number | undefined;
      if (type === 'product') {
        productId = (formData.get('productId') as string) || undefined;
      }
      if (type === 'discount') {
        discountPercent = Number(formData.get('discountPercent'));
      }

      const payload: Record<string, unknown> = {
        type,
        value,
        maxUses,
        maxPerUser,
        ...(minPurchase !== undefined ? { minPurchase } : {}),
        ...(expiresAt !== undefined ? { expiresAt } : {}),
        active,
        ...(description ? { description } : {}),
        ...(customCode ? { customCode } : {}),
        ...(productId ? { productId } : {}),
        ...(discountPercent !== undefined ? { discountPercent } : {}),
      };

      const url = editMode && editing ? `/api/admin/vouchers/${editing.code}` : '/api/admin/vouchers';
      const method = editMode && editing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as { error?: string };
      if (!res.ok) throw new Error(data?.error ?? 'Gagal menyimpan voucher.');
      toast.success(editMode ? 'Voucher diperbarui.' : 'Voucher berhasil dibuat.');
      closeDialog();
      void load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyimpan voucher.');
    } finally {
      setSaving(false);
    }
  };

  const removeVoucher = async (code: string) => {
    if (!window.confirm(`Hapus voucher ${code}?`)) return;
    setDeleting(code);
    try {
      const res = await fetch(`/api/admin/vouchers/${code}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string };
        throw new Error(data?.error ?? 'Gagal menghapus voucher.');
      }
      toast.success('Voucher dihapus.');
      void load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menghapus voucher.');
    } finally {
      setDeleting(null);
    }
  };

  const toggleActive = async (v: Voucher) => {
    setDeleting(v.code);
    try {
      const res = await fetch(`/api/admin/vouchers/${v.code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !v.active }),
      });
      if (!res.ok) throw new Error('Gagal mengubah status voucher.');
      toast.success(`Voucher ${v.active ? 'dinonaktifkan' : 'diaktifkan'}.`);
      void load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal mengubah status.');
    } finally {
      setDeleting(null);
    }
  };

  if (state === 'loading') {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <RefreshCw aria-hidden size={24} className="mb-2 text-content-muted" />
        <p className="text-sm text-content-muted">Gagal memuat daftar voucher.</p>
        <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
          Coba lagi
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-content-faint">Total voucher</p>
                <p className="text-2xl font-semibold text-content">{stats.total}</p>
              </div>
              <Wallet aria-hidden size={20} className="text-accent" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-content-faint">Aktif</p>
                <p className="text-2xl font-semibold text-content">{stats.active}</p>
              </div>
              <div className={`h-9 w-9 rounded-full flex items-center justify-center ${
                stats.active > 0 ? 'bg-emerald-500/15 text-emerald-500' : 'bg-content/10 text-content-muted'
              }`}>
                <Plus aria-hidden size={14} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-content-faint">Total penggunaan</p>
                <p className="text-2xl font-semibold text-content">{stats.used}</p>
              </div>
              <Clock aria-hidden size={20} className="text-content-muted" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative">
          <Search aria-hidden size={16} className="absolute left-3 top-3 h-4 w-4 text-content-faint" />
          <Input
            placeholder="Cari kode atau deskripsi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="button" onClick={() => void openCreate()} className="btn-accent">
          <Plus aria-hidden size={16} />
          Buat voucher
        </Button>
      </div>

      {/* Voucher list */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line/50 text-left text-xs text-content-faint">
                  <th className="pb-3 pl-4">Kode</th>
                  <th className="pb-3 pl-4">Tipe</th>
                  <th className="pb-3 pl-4">Nilai</th>
                  <th className="pb-3 pl-4">Digunakan</th>
                  <th className="pb-3 pl-4">Expired</th>
                  <th className="pb-3 pl-4">Status</th>
                  <th className="pb-3 pl-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="h-32 flex flex-col items-center justify-center text-center">
                      <p className="text-sm text-content-muted">Tidak ada voucher yang cocok.</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((v) => (
                    <tr key={v.code} className="hover:bg-content/5 transition-colors">
                      <td className="pl-4 py-3 font-mono text-sm">
                        {v.code}
                        {v.description ? (
                          <p className="text-xs text-content-faint mt-0.5">{v.description}</p>
                        ) : null}
                      </td>
                      <td className="pl-4 py-3">
                        <Badge variant="default" className="flex items-center gap-1.5">
                          {React.createElement(TYPE_LABEL[v.type]?.icon ?? Wallet, { size: 12 })}
                          {TYPE_LABEL[v.type]?.label}
                        </Badge>
                      </td>
                      <td className="pl-4 py-3">
                        {v.type === 'balance' ? (
                          <span className="font-mono text-content">{formatRupiah(v.value)}</span>
                        ) : v.type === 'discount' ? (
                          <span className="font-mono text-content">{v.discountPercent ?? 0}%</span>
                        ) : (
                          <span className="font-mono text-content">Produk</span>
                        )}
                      </td>
                      <td className="pl-4 py-3 font-mono text-sm">
                        {v.usedCount} / {v.maxUses}
                      </td>
                      <td className="pl-4 py-3 font-mono text-sm text-content-muted">
                        {v.expiresAt ? formatDate(v.expiresAt) : '—'}
                      </td>
                      <td className="pl-4 py-3">
                        <Badge
                          variant={v.active ? 'default' : 'neutral'}
                          onClick={() => void toggleActive(v)}
                          className="cursor-pointer"
                        >
                          {v.active ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </td>
                      <td className="pl-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={deleting === v.code}
                            onClick={() => void openEdit(v)}
                          >
                            {deleting === v.code ? (
                              <Loader2 aria-hidden size={12} className="animate-spin" />
                            ) : (
                              <Edit3 aria-hidden size={12} />
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={deleting === v.code}
                            onClick={() => void removeVoucher(v.code)}
                          >
                            {deleting === v.code ? (
                              <Loader2 aria-hidden size={12} className="animate-spin" />
                            ) : (
                              <Trash2 aria-hidden size={12} />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog: Create / Edit Voucher */}
      <Dialog open={open} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editMode ? 'Edit Voucher' : 'Buat Voucher Baru'}</DialogTitle>
            <DialogDescription>
              {editMode ? 'Ubah data voucher yang sudah ada.' : 'Buat kode voucher baru untuk pelanggan.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="flex flex-col gap-4 mt-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="voucher-type">Tipe voucher</Label>
                <select
                  id="voucher-type"
                  name="type"
                  defaultValue={editing?.type ?? 'balance'}
                  className="rounded-xl border border-line bg-content p-2 text-sm focus:border-accent focus:ring-1 focus:ring-accent"
                >
                  <option value="balance">Saldo (tambah saldo pengguna)</option>
                  <option value="discount">Diskon persen (potong harga)</option>
                  <option value="product">Produk gratis (checkout gratis)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="voucher-value">Nilai</Label>
                <Input
                  id="voucher-value"
                  name="value"
                  type="number"
                  min={0}
                  step={1000}
                  defaultValue={editing?.value?.toString() ?? ''}
                  placeholder="Masukkan nilai"
                />
                <p className="text-xs text-content-faint">
                  {editing?.type === 'balance'
                    ? 'Nominal saldo yang ditambahkan saat diredeem.'
                    : editing?.type === 'discount'
                      ? 'Persentase diskon (1-100).'
                      : 'Biarkan 0 untuk produk gratis.'}
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="voucher-max-uses">Maksimal penggunaan total</Label>
                <Input
                  id="voucher-max-uses"
                  name="maxUses"
                  type="number"
                  min={1}
                  step={1}
                  defaultValue={editing?.maxUses?.toString() ?? '100'}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="voucher-max-per-user">Maksimal per pengguna</Label>
                <Input
                  id="voucher-max-per-user"
                  name="maxPerUser"
                  type="number"
                  min={1}
                  step={1}
                  defaultValue={editing?.maxPerUser?.toString() ?? '1'}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="voucher-min-purchase">Minimal belanja (opsional)</Label>
                <Input
                  id="voucher-min-purchase"
                  name="minPurchase"
                  type="number"
                  min={0}
                  step={1000}
                  defaultValue={editing?.minPurchase?.toString() ?? ''}
                  placeholder="0"
                />
                <p className="text-xs text-content-faint">
                  Voucher hanya berlaku jika belanja minimal sebesar ini.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="voucher-expires">Kedaluwarsa (opsional)</Label>
                <Input
                  id="voucher-expires"
                  name="expiresAt"
                  type="datetime-local"
                  defaultValue={editing?.expiresAt ? new Date(editing.expiresAt).toISOString().slice(0, 16) : ''}
                />
                <p className="text-xs text-content-faint">Kosongkan jika tidak ingin kedaluwarsa.</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="voucher-code">Kode custom (opsional)</Label>
                <Input
                  id="voucher-code"
                  name="customCode"
                  type="text"
                  maxLength={20}
                  defaultValue={editing?.code ?? ''}
                  placeholder="Contoh: SAVE10"
                />
                <p className="text-xs text-content-faint">
                  Kosongkan untuk generate kode otomatis. Tidak bisa diubah setelah dibuat.
                </p>
                {editMode && editing && (
                  <p className="text-xs text-content-faint">
                    Kode saat ini: <span className="font-mono">{editing.code}</span>
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="voucher-description">Deskripsi (opsional)</Label>
                <Input
                  id="voucher-description"
                  name="description"
                  type="text"
                  maxLength={200}
                  defaultValue={editing?.description ?? ''}
                  placeholder="Catatan internal admin"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="voucher-active"
                  name="active"
                  type="checkbox"
                  defaultChecked={editing?.active ?? true}
                  className="rounded border-line bg-content text-accent focus:ring-accent"
                />
                <Label htmlFor="voucher-active" className="text-sm text-content">
                  Aktif (dapat digunakan)
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => void closeDialog()}>
                Batal
              </Button>
              <Button type="submit" disabled={saving} className="btn-accent">
                {saving ? (
                  <Loader2 aria-hidden size={14} className="animate-spin" />
                ) : (
                  editMode ? 'Simpan perubahan' : 'Buat voucher'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default VouchersClient;
