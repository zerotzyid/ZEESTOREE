'use client';

import { useCallback, useEffect, useState } from 'react';
import { Copy, Loader2, Plug, Save, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

type PixpayzConfig = {
  configured: boolean;
  minAmount: number;
  maxAmount: number;
  webhookToken: string;
  webhookUrl: string;
};

type Profile = {
  username: string;
  email: string;
  balance: number;
  pending_balance: number;
};

function formatRupiah(value: number): string {
  return `Rp ${value.toLocaleString('id-ID')}`;
}

export function PixpayzClient() {
  const [config, setConfig] = useState<PixpayzConfig | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [minAmount, setMinAmount] = useState('0');
  const [maxAmount, setMaxAmount] = useState('0');
  const [webhookToken, setWebhookToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/pixpayz', { cache: 'no-store' });
      const data = (await res.json()) as PixpayzConfig & { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Gagal memuat konfigurasi.');
      setConfig(data);
      setMinAmount(String(data.minAmount));
      setMaxAmount(String(data.maxAmount));
      setWebhookToken(data.webhookToken);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal memuat konfigurasi.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        minAmount: Number(minAmount) || 0,
        maxAmount: Number(maxAmount) || 0,
        webhookToken: webhookToken.trim(),
      };
      if (apiKey.trim()) payload.apiKey = apiKey.trim();
      const res = await fetch('/api/admin/pixpayz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Gagal menyimpan.');
      toast.success('Konfigurasi pembayaran tersimpan.');
      setApiKey('');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyimpan.');
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    try {
      const res = await fetch('/api/admin/pixpayz/test', { method: 'POST' });
      const data = (await res.json()) as { error?: string; profile?: Profile };
      if (!res.ok) throw new Error(data.error ?? 'Tes koneksi gagal.');
      setProfile(data.profile ?? null);
      toast.success('Koneksi ke Pixpayz berhasil.');
    } catch (error) {
      setProfile(null);
      toast.error(error instanceof Error ? error.message : 'Tes koneksi gagal.');
    } finally {
      setTesting(false);
    }
  };

  const copyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(config?.webhookUrl ?? '');
      toast.success('URL webhook disalin.');
    } catch {
      toast.error('Gagal menyalin. Salin manual dari kotak teks.');
    }
  };

  if (!config) {
    return (
      <div className="flex max-w-3xl flex-col gap-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="label-mono">Admin</p>
        <h1 className="text-2xl font-semibold text-content">Pembayaran (Pixpayz)</h1>
        <p className="text-sm text-content-muted">
          Sumber aturan: dokumentasi resmi Pixpayz. API key disimpan terenkripsi.
        </p>
      </div>

      <div className="glass-strong flex flex-col gap-3 rounded-2xl border border-line/60 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Wallet aria-hidden size={18} className="text-accent" />
            <span className="text-sm font-medium text-content">
              {config.configured ? 'API key sudah tersimpan' : 'Belum ada API key'}
            </span>
          </div>
          <Button type="button" variant="outline" disabled={testing} onClick={() => void test()}>
            {testing ? (
              <Loader2 aria-hidden size={16} className="animate-spin" />
            ) : (
              <Plug aria-hidden size={16} />
            )}
            {testing ? 'Menguji...' : 'Tes koneksi'}
          </Button>
        </div>
        {profile ? (
          <div className="grid grid-cols-1 gap-2 rounded-xl border border-line/60 bg-content/5 p-3 text-sm sm:grid-cols-3">
            <div className="flex flex-col">
              <span className="text-xs text-content-faint">Akun Pixpayz</span>
              <span className="text-content">{profile.username}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-content-faint">Saldo</span>
              <span className="text-content">{formatRupiah(profile.balance)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-content-faint">Pending</span>
              <span className="text-content">{formatRupiah(profile.pending_balance)}</span>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pixpayz-api-key">API key</Label>
          <Input
            id="pixpayz-api-key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            autoComplete="off"
            placeholder={
              config.configured ? 'Tersimpan — isi untuk mengganti' : 'Masukkan API key Pixpayz'
            }
            maxLength={300}
          />
          <p className="text-xs text-content-faint">Dari dasbor Pixpayz. Tidak ditampilkan kembali.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pixpayz-min">Minimal deposit (Rp)</Label>
            <Input
              id="pixpayz-min"
              type="number"
              inputMode="numeric"
              min={0}
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
            />
            <p className="text-xs text-content-faint">0 tanpa batas.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pixpayz-max">Maksimal deposit (Rp)</Label>
            <Input
              id="pixpayz-max"
              type="number"
              inputMode="numeric"
              min={0}
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
            />
            <p className="text-xs text-content-faint">0 tanpa batas.</p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pixpayz-token">Token webhook</Label>
          <Input
            id="pixpayz-token"
            value={webhookToken}
            onChange={(e) => setWebhookToken(e.target.value)}
            placeholder="String acak minimal 8 karakter"
            maxLength={128}
            autoComplete="off"
          />
          <p className="text-xs text-content-faint">
            Dipakai untuk memverifikasi permintaan masuk dari Pixpayz.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pixpayz-webhook-url">URL webhook (daftarkan di Pixpayz)</Label>
          <div className="flex gap-2">
            <Input
              id="pixpayz-webhook-url"
              readOnly
              value={config.webhookUrl}
              className="font-mono text-xs"
            />
            <Button type="button" variant="outline" aria-label="Salin URL webhook" onClick={() => void copyWebhook()}>
              <Copy aria-hidden size={16} />
            </Button>
          </div>
          <p className="text-xs text-content-faint">
            Setelah mengganti token, simpan lalu salin URL baru.
          </p>
        </div>

        <div className="flex justify-end border-t border-line pt-4">
          <Button type="button" disabled={saving} onClick={() => void save()}>
            {saving ? <Loader2 aria-hidden size={16} className="animate-spin" /> : <Save aria-hidden size={16} />}
            {saving ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </div>
      </div>
    </div>
  );
}
