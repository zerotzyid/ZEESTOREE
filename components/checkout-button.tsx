'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Copy, Download, ExternalLink, Loader2, QrCode, RefreshCw, ShoppingCart, Trash2, Wallet, X, Mail, Server, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
  orderId?: string | null;
  invoiceId?: string | null;
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
  const [voucherCode, setVoucherCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('saldo');
  const [cancelBusy, setCancelBusy] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState(0);

  const downloadQRIS = async (qrString: string | null) => {
    if (!qrString) return;
    try {
      const jpgUrl = qrString.replace(/\.(png|webp|jpeg)$/i, '.jpg');
      const link = document.createElement('a');
      link.href = jpgUrl;
      link.download = 'qris-pembayaran.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('QRIS berhasil diunduh.');
    } catch {
      try {
        const link = document.createElement('a');
        link.href = qrString;
        link.download = 'qris-pembayaran.jpg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('QRIS berhasil diunduh.');
      } catch {
        toast.error('Gagal mengunduh QRIS.');
      }
    }
  };

  const cancelPayment = async (invoiceId: string | null, orderId: string | null) => {
    if (!invoiceId && !orderId) return;
    if (!window.confirm('Batalkan pembayaran ini? Pesanan akan dibatalkan.')) return;
    setCancelBusy(true);
    try {
      if (invoiceId) {
        const res = await fetch(`/api/user/payments/${invoiceId}/cancel`, {
          method: 'POST',
        });
        if (res.ok) {
          toast.success('Pembayaran berhasil dibatalkan.');
          setResult(null);
          setQrDialogOpen(false);
          return;
        }
      }
      if (orderId) {
        toast.success('Pesanan dibatalkan.');
        setResult(null);
        setQrDialogOpen(false);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal membatalkan pembayaran.');
    } finally {
      setCancelBusy(false);
    }
  };

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
          voucherCode: voucherCode.trim().toUpperCase() || undefined,
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

      // Jika pembelian panel via QRIS, buka dialog pembayaran
      if (data.ok && (data.qrImageUrl || data.qrString || data.invoiceUrl)) {
        setQrDialogOpen(true);
        return;
      }

      // Jika pembelian panel via saldo, langsung redirect ke manajemen panel
      if (data.ok && data.orderId && kind === 'panel') {
        window.location.href = `/dashboard/panels/${data.orderId}`;
        return;
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Checkout gagal.');
    } finally {
      setBusy(false);
    }
  };

  // Simulasi proses instalasi panel setelah pembayaran berhasil
  const handleInstallComplete = (orderId: string) => {
    setInstalling(true);
    setInstallProgress(0);
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setInstallProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setInstalling(false);
        window.location.href = `/dashboard/panels/${orderId}`;
      }
    }, 200);
  };

  // Error result
  if (result && !result.ok) {
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <p>{result.message}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <Badge variant="danger">{result.status}</Badge>
          </div>
        </div>
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

  // Panel success result - redirect to panel management
  if (result && result.ok && result.panelUrl) {
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          <p>{result.message}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <Badge variant="success">{result.status}</Badge>
          </div>
        </div>
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

  // QRIS Dialog
  if (qrDialogOpen && result) {
    const r = result;
    return (
      <>
        <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Pembayaran QRIS</DialogTitle>
              <DialogDescription>
                Silakan scan QRIS berikut untuk melanjutkan pembayaran.
              </DialogDescription>
            </DialogHeader>
            <div className="p-4 flex flex-col items-center gap-4">
              <p className="text-sm text-content-muted">
                Total: <span className="font-semibold text-accent">
                  {r.total !== undefined ? `Rp ${r.total.toLocaleString('id-ID')}` : '-'}
                </span>
              </p>
              {r.qrImageUrl ? (
                <img
                  src={r.qrImageUrl}
                  alt="QRIS pembayaran"
                  className="w-64 h-64 rounded-xl border border-line bg-white p-2 object-contain"
                />
              ) : null}
              {r.qrString && (
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      void navigator.clipboard
                        .writeText(r.qrString ?? '')
                        .then(() => toast.success('String QRIS disalin.'));
                    }}
                  >
                    <Copy aria-hidden size={13} />
                    Salin string QRIS
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void downloadQRIS(r.qrString ?? null)}
                  >
                    <Download aria-hidden size={13} />
                    Unduh QRIS (JPG)
                  </Button>
                </div>
              )}
              {r.invoiceUrl && (
                <a
                  href={r.invoiceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
                >
                  Buka halaman invoice
                  <ExternalLink aria-hidden size={13} />
                </a>
              )}
              {r.expiredAt !== undefined && r.expiredAt !== null && (
                <p className="text-xs text-content-faint font-mono">
                  Invoice berlaku hingga {new Date(r.expiredAt).toLocaleString('id-ID')}
                </p>
              )}
              {r.orderId && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={cancelBusy}
                  onClick={() => void cancelPayment(r.invoiceId ?? r.orderId ?? null, r.orderId ?? null)}
                >
                  {cancelBusy ? (
                    <Loader2 aria-hidden size={12} className="animate-spin" />
                  ) : (
                    <X aria-hidden size={13} />
                  )}
                  Batal Pembayaran
                </Button>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setQrDialogOpen(false)}>
                Tutup
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Panel installing animation
  if (installing && result) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8">
        <Server className="animate-spin text-4xl text-accent" />
        <h3 className="text-lg font-semibold text-content">Menginstall Server Panel</h3>
        <p className="text-sm text-content-muted">
          Mohon tunggu, server panel Anda sedang dikonfigurasi...
        </p>
        <div className="w-full h-4 bg-content/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${installProgress}%` }}
          />
        </div>
        <p className="text-xs text-content-faint">{installProgress}%</p>
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

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="checkout-voucher">Kode voucher (opsional)</Label>
            <Input
              id="checkout-voucher"
              value={voucherCode}
              onChange={(e) => setVoucherCode(e.target.value)}
              placeholder="Masukkan kode voucher"
              maxLength={20}
            />
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
