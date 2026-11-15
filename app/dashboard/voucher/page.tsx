'use client';

import { useCallback, useState } from 'react';
import { useSettings } from '@/components/settings-provider';
import { Loader2, Ticket, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatRupiah } from '@/lib/format';

export default function VoucherPage() {
  const { settings } = useSettings();
  const [code, setCode] = useState('');
  const [result, setResult] = useState<{
    ok: boolean;
    message: string;
    newSaldo?: number;
    voucher?: any;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const redeem = async () => {
    const c = code.trim().toUpperCase();
    if (!c) {
      toast.error('Masukkan kode voucher.');
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch('/api/user/vouchers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: c }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; message?: string; newSaldo?: number; error?: string }
        | null;
      if (!res.ok || !data?.ok) {
        setResult({
          ok: false,
          message: data?.message ?? data?.error ?? 'Gagal meredeem voucher.',
        });
        return;
      }
      setResult({
        ok: true,
        message: data.message ?? 'Voucher berhasil diredeem.',
        newSaldo: data.newSaldo,
      });
      setCode('');
      toast.success(data.message ?? 'Voucher berhasil diredeem.');
    } catch (error) {
      setResult({
        ok: false,
        message: error instanceof Error ? error.message : 'Gagal meredeem voucher.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="label-mono">{settings?.systemTexts.menu.voucher ?? 'Voucher'}</p>
        <h1 className="text-2xl font-semibold text-content">Redeem Voucher</h1>
        <p className="text-sm text-content-muted">
          Masukkan kode voucher untuk menambahkan saldo ke akun Anda.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket aria-hidden size={17} className="text-accent" />
            Masukkan kode voucher
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="voucher-code">Kode voucher</Label>
            <Input
              id="voucher-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Contoh: SAVE10"
              maxLength={20}
            />
          </div>
          <div className="flex justify-end">
            <Button type="button" disabled={busy || !code.trim()} onClick={() => void redeem()} className="btn-accent">
              {busy ? (
                <Loader2 aria-hidden size={16} className="animate-spin" />
              ) : (
                <Wallet aria-hidden size={16} />
              )}
              {busy ? 'Memproses...' : 'Redeem'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card className={`rounded-xl border p-4 ${
          result.ok ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-red-500/30 bg-red-500/10'
        }`}>
          <div className="flex items-center gap-3">
            <div
              className={`h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                result.ok ? 'bg-emerald-500/15 text-emerald-500' : 'bg-red-500/15 text-red-500'
              }`}
            >
              {result.ok ? (
                <Ticket aria-hidden size={18} />
              ) : (
                <Wallet aria-hidden size={18} />
              )}
            </div>
            <div className="flex-1">
              <p className={`text-sm font-semibold ${result.ok ? 'text-emerald-200' : 'text-red-200'}`}>
                {result.message}
              </p>
              {result.newSaldo !== null && result.newSaldo !== undefined && (
                <p className="text-xs text-content-muted font-mono">
                  Saldo baru: {formatRupiah(result.newSaldo)}
                </p>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
