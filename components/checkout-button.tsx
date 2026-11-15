'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Copy, ExternalLink, Loader2, QrCode, ShoppingCart, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

type Result = {
  ok: boolean;
  status: string;
  message: string;
  panelUrl?: string | null;
  panelPassword?: string | null;
  qrString?: string | null;
  qrImageUrl?: string | null;
  invoiceUrl?: string | null;
  total?: number;
  expiredAt?: number;
  phone?: string | null;
};

async function readError(res: Response): Promise<string> {
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  return data?.error ?? `Permintaan gagal (${res.status}).`;
}

type PaymentMethod = 'saldo' | 'qris';

const METHOD_LABEL: Record<PaymentMethod, string> = {
  saldo: 'Bayar dari saldo',
  qris: 'Bayar langsung via QRIS',
};

export function CheckoutButton({ productId, kind }: { productId: string; kind: string }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('saldo');

  const checkout = async () => {
    if (kind === 'reseller') {
      if (customerName.trim().length < 2 || customerPhone.trim().length < 8) {
        toast.error('Isi nama dan nomor HP untuk pesanan reseller.');
        return;
      }
    }
    setBusy(true);
    try {
      const res = await fetch('/api/user/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          paymentMethod,
          voucherCode: undefined,
          ...(kind === 'reseller'
            ? { customerName: customerName.trim(), customerPhone: customerPhone.trim() }
            : {}),
        }),
      });
      if (res.status === 401) {
        window.location.href = `/login?next=/produk/${productId}`;
        return;
      }
      const data = (await res.json().catch(() => null)) as (Result & { error?: string }) | null;
      if (!data) throw new Error(await readError(res));
      if (!res.ok || !data.ok) {
        setResult({
          ok: false,
          status: data.status ?? 'failed',
          message: data.message ?? data.error ?? 'Checkout gagal.',
        });
        return;
      }
      setResult(data);
      toast.success(data.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Checkout gagal.');
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <div className="flex flex-col gap-3">
        <div
          className={
            result.ok
              ? 'rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200'
              : 'rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200'
          }
        >
          <p>{result.message}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <Badge variant={result.ok ? 'success' : 'danger'}>{result.status}</Badge>
          </div>
        </div>

        {result.panelUrl ? (
          <div className="flex flex-col gap-2 rounded-xl border border-line p-3">
            <p className="label-mono">Akses panel</p>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={result.panelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
              >
                {result.panelUrl}
                <ExternalLink aria-hidden size={13} />
              </a>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  void navigator.clipboard
                    .writeText(result.panelUrl ?? '')
                    .then(() => toast.success('URL disalin.'));
                }}
              >
                <Copy aria-hidden size={13} />
                Salin
              </Button>
            </div>
            {result.panelPassword ? (
              <div className="flex flex-wrap items-center gap-2">
                <code className="rounded-lg bg-content/5 px-2.5 py-1.5 font-mono text-sm text-content">
                  {result.panelPassword}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void navigator.clipboard
                      .writeText(result.panelPassword ?? '')
                      .then(() => toast.success('Password disalin.'));
                  }}
                >
                  <Copy aria-hidden size={13} />
                  Salin password
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}

        {result.qrImageUrl || result.qrString || result.invoiceUrl ? (
          <Card className="rounded-xl border border-line p-3">
            <CardContent className="p-0">
              <div className="flex flex-col gap-3 p-3">
                <p className="label-mono">QRIS pembayaran (bukan saldo)</p>
                {result.total !== undefined && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-content-faint">Total yang harus dibayar</span>
                    <span className="font-mono font-semibold text-accent">
                      Rp {result.total.toLocaleString('id-ID')}
                    </span>
                  </div>
                )}
                <div className="flex flex-wrap items-start gap-4">
                  {result.qrImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={result.qrImageUrl}
                      alt="QRIS pembayaran"
                      className="h-40 w-40 rounded-xl border border-line bg-white object-contain p-1"
                    />
                  ) : null}
                  <div className="flex flex-col gap-2">
                    {result.invoiceUrl ? (
                      <a
                        href={result.invoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
                      >
                        Buka halaman invoice
                        <ExternalLink aria-hidden size={13} />
                      </a>
                    ) : null}
                    {result.qrString ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          void navigator.clipboard
                            .writeText(result.qrString ?? '')
                            .then(() => toast.success('String QRIS disalin.'));
                        }}
                      >
                        <Copy aria-hidden size={13} />
                        Salin string QRIS
                      </Button>
                    ) : null}
                  </div>
                </div>
                {result.expiredAt && (
                  <p className="text-xs text-content-faint font-mono">
                    Invoice berlaku hingga {new Date(result.expiredAt).toLocaleString('id-ID')}
                  </p>
                )}
                <p className="text-xs text-content-faint">
                  Status diperbarui otomatis setelah pembayaran terkonfirmasi.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/orders"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-line px-5 text-sm text-content transition-colors hover:bg-content/5"
          >
            Lihat riwayat pesanan
          </Link>
          <Button type="button" variant="ghost" size="sm" onClick={() => setResult(null)}>
            Beli lagi
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {kind === 'reseller' ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="checkout-name">Nama pemesan</Label>
            <Input
              id="checkout-name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              maxLength={60}
              placeholder="Nama Anda"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="checkout-phone">Nomor HP (untuk pesanan)</Label>
            <Input
              id="checkout-phone"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              maxLength={20}
              inputMode="tel"
              placeholder="08xxxxxxxxxx"
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="checkout-payment">Metode pembayaran</Label>
            <div className="grid grid-cols-1 gap-2">
              {(['saldo', 'qris'] as PaymentMethod[]).map((m) => (
                <Button
                  key={m}
                  type="button"
                  variant={paymentMethod === m ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPaymentMethod(m)}
                  className="w-full flex items-center gap-2 text-left"
                >
                  {m === 'qris' ? <QrCode aria-hidden size={14} /> : <Wallet aria-hidden size={14} />}
                  {METHOD_LABEL[m]}
                </Button>
              ))}
            </div>
          </div>
          <Button
            type="button"
            onClick={() => void checkout()}
            disabled={busy}
            className="w-fit btn-accent"
          >
            {busy ? (
              <Loader2 aria-hidden size={16} className="animate-spin" />
            ) : (
              <ShoppingCart aria-hidden size={16} />
            )}
            {kind === 'reseller' ? 'Pesan & ambil QRIS' : paymentMethod === 'qris' ? 'Pesan & bayar QRIS' : 'Beli sekarang — bayar dari saldo'}
          </Button>
        </div>
      )}
    </div>
  );
}
