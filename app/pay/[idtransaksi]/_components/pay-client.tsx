'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Loader2,
  Package,
  QrCode,
  RefreshCw,
  Wallet,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatRupiah, formatDateTimeWIB } from '@/lib/format';

type Invoice = {
  invoiceId: string;
  amount: number;
  fee: number;
  total: number;
  status: string;
  qrisImage: string;
  paymentLink: string;
  expiredAt: number;
  purpose?: string;
  orderId?: string | null;
  productName?: string | null;
};

type Order = {
  id: string;
  status?: string;
  productName?: string;
  kind?: string;
  panelUrl?: string | null;
  panelServerId?: number | null;
};

type Phase = 'loading' | 'error' | 'notfound' | 'qr' | 'paid' | 'expired' | 'failed';

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function isProductPurchase(invoice: Invoice): boolean {
  return invoice.purpose === 'direct_purchase' || !!invoice.orderId;
}

export function PayPageClient({ idtransaksi }: { idtransaksi: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('loading');
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadInvoice = useCallback(async () => {
    if (!idtransaksi) return;
    setPhase('loading');
    setError(null);
    try {
      let res = await fetch(`/api/user/invoices/${idtransaksi}`, { cache: 'no-store' });

      if (res.status === 404) {
        // Bukan invoice, coba sebagai order
        const orderRes = await fetch(`/api/user/orders/${idtransaksi}`, { cache: 'no-store' });
        if (!orderRes.ok) {
          setPhase('notfound');
          return;
        }
        const orderData = (await orderRes.json()) as { order?: Order & { invoiceId?: string | null } };
        if (!orderData.order?.invoiceId) {
          setPhase('notfound');
          return;
        }
        setOrder(orderData.order);
        res = await fetch(`/api/user/invoices/${orderData.order.invoiceId}`, { cache: 'no-store' });
        if (!res.ok) {
          setPhase('notfound');
          return;
        }
      }

      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = `/login?next=/pay/${idtransaksi}`;
          return;
        }
        throw new Error('Gagal memuat transaksi.');
      }

      const data = (await res.json()) as Invoice;
      setInvoice(data);

      // Jika ini pembelian produk, ambil detail order
      if (isProductPurchase(data) && data.orderId) {
        try {
          const orderRes = await fetch(`/api/user/orders/${data.orderId}`, { cache: 'no-store' });
          if (orderRes.ok) {
            const orderData = (await orderRes.json()) as { order?: Order };
            if (orderData.order) setOrder(orderData.order);
          }
        } catch {
          /* abaikan gagal ambil order */
        }
      }

      if (data.status === 'paid') {
        setPhase('paid');
      } else if (data.status === 'expired' || data.status === 'failed') {
        setPhase('expired');
      } else {
        setPhase('qr');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat transaksi.');
      setPhase('error');
    }
  }, [idtransaksi]);

  useEffect(() => {
    void loadInvoice();
  }, [idtransaksi, loadInvoice]);

  useEffect(() => {
    if (phase !== 'qr' || !invoice) return;

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/user/invoices/${invoice.invoiceId}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as { invoice?: Invoice };
        if (data.invoice) {
          setInvoice(data.invoice);
          if (data.invoice.status === 'paid') {
            setPhase('paid');
            if (pollRef.current) clearInterval(pollRef.current);
          } else if (data.invoice.status === 'expired' || data.invoice.status === 'failed') {
            setPhase('expired');
            if (pollRef.current) clearInterval(pollRef.current);
          }
        }
      } catch {
        /* biarkan polling berikutnya mencoba */
      }
    }, 5000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [phase, invoice]);

  useEffect(() => {
    if (phase !== 'qr' || !invoice || invoice.expiredAt <= 0) return;
    const tick = () => setRemaining(invoice.expiredAt - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phase, invoice]);

  const retry = () => {
    void loadInvoice();
  };

  const copyQrString = async (qrString: string | null) => {
    if (!qrString) return;
    try {
      await navigator.clipboard.writeText(qrString);
      toast.success('String QRIS disalin.');
    } catch {
      toast.error('Gagal menyalin string QRIS.');
    }
  };

  if (phase === 'error') {
    return (
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-center py-10 text-center">
        <RefreshCw aria-hidden size={32} className="mb-4 text-content-muted" />
        <h2 className="text-lg font-semibold text-content">Gagal memuat transaksi</h2>
        <p className="text-sm text-content-muted">{error}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => void retry()}>
          Coba lagi
        </Button>
      </div>
    );
  }

  if (phase === 'notfound') {
    return (
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-center py-10 text-center">
        <Package aria-hidden size={32} className="mb-4 text-content-muted" />
        <h2 className="text-lg font-semibold text-content">Transaksi tidak ditemukan</h2>
        <p className="text-sm text-content-muted">
          ID transaksi tidak valid atau tidak termasuk milik Anda.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild>
            <a href="/" className="btn-accent">
              Kembali ke beranda
            </a>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void router.push('/dashboard/orders')}
          >
            Lihat pesanan saya
          </Button>
        </div>
      </div>
    );
  }

  if (phase === 'paid' && invoice) {
    const isPurchase = isProductPurchase(invoice);
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-6 py-6">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <CheckCircle2 aria-hidden size={48} className="text-emerald-500" />
            <h2 className="text-lg font-semibold text-content">Pembayaran Berhasil</h2>
            <p className="text-sm text-content-muted">
              {formatRupiah(invoice.amount)} telah diproses.
            </p>

            {isPurchase && order ? (
              <div className="w-full flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-content-muted uppercase tracking-wider">Detail Pesanan</h3>
                <div className="rounded-xl border border-line bg-content/5 p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-content-muted">Produk</span>
                    <span className="font-mono text-content">{order.productName ?? 'Produk'}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-content-muted">Status</span>
                    <Badge variant="default">{order.status ?? 'paid'}</Badge>
                  </div>
                  {order.panelUrl ? (
                    <div className="mt-3 flex items-center gap-2">
                      <a
                        href={order.panelUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
                      >
                        Akses Panel Server
                        <ArrowUpRight aria-hidden size={13} />
                      </a>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="text-sm text-content-muted">
                Saldo telah ditambahkan ke akun Anda.
              </p>
            )}

            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <Button asChild>
                <a href="/dashboard/transactions" className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-line px-5 text-sm text-content transition-colors hover:bg-content/5">
                  Lihat transaksi
                  <ArrowUpRight aria-hidden size={15} />
                </a>
              </Button>
              <Button asChild>
                <a href="/dashboard/orders" className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-line px-5 text-sm text-content transition-colors hover:bg-content/5">
                  Lihat pesanan
                  <ArrowUpRight aria-hidden size={15} />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === 'expired' && invoice) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-center py-10 text-center">
        <Clock aria-hidden size={32} className="mb-4 text-content-muted" />
        <h2 className="text-lg font-semibold text-content">Invoice Kedaluwarsa</h2>
        <p className="text-sm text-content-muted">
          Waktu pembayaran telah habis. Buat transaksi baru untuk mencoba lagi.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button type="button" variant="outline" size="sm" onClick={() => void retry()}>
            <RefreshCw aria-hidden size={16} />
            Coba lagi
          </Button>
          <Button asChild>
            <a href="/" className="btn-accent">
              Kembali ke beranda
            </a>
          </Button>
        </div>
      </div>
    );
  }

  // phase === 'qr' or 'loading'
  if (!invoice) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-4 py-10">
        <Skeleton className="h-9 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  const isPurchase = isProductPurchase(invoice);
  const showCountdown = invoice.expiredAt > 0;
  const expiredSoon = showCountdown && remaining !== null && remaining <= 0;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 py-6">
      <div className="flex flex-col gap-1">
        <p className="label-mono">
          {isPurchase ? 'Pembelian Produk' : 'Pembayaran'}
        </p>
        <h1 className="text-2xl font-semibold text-content">Bayar Sekarang</h1>
        <p className="text-sm text-content-muted">
          ID transaksi: <span className="font-mono text-content">{invoice.invoiceId}</span>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isPurchase ? <Package aria-hidden size={17} className="text-accent" /> : <QrCode aria-hidden size={17} className="text-accent" />}
            {isPurchase ? 'Total Pembelian' : 'Total yang Harus Dibayar'}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 text-center">
          <div className="flex flex-col gap-1">
            <span className="text-sm text-content-muted">Jumlah pembayaran</span>
            <span className="text-3xl font-semibold text-accent">
              {formatRupiah(invoice.total)}
            </span>
            {invoice.fee > 0 ? (
              <span className="text-xs text-content-faint">
                Termasuk biaya layanan {formatRupiah(invoice.fee)}
              </span>
            ) : null}
          </div>

          <div className="w-full flex justify-center">
            {invoice.qrisImage ? (
              <img
                src={invoice.qrisImage}
                alt="Kode QRIS pembayaran"
                className="w-full max-w-[340px] rounded-2xl border border-line bg-white p-2 shadow-sm"
              />
            ) : null}
          </div>

          {invoice.qrisImage ? (
            <p className="text-xs text-content-faint">
              Pindai kode dengan aplikasi pembayaran (GoPay, OVO, Dana, ShopeePay, dll).
            </p>
          ) : null}

          {invoice.paymentLink ? (
            <a
              href={invoice.paymentLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-line px-4 text-sm text-accent hover:bg-content/5"
            >
              Buka Tautan Pembayaran
              <ArrowUpRight aria-hidden size={15} />
            </a>
          ) : null}

          {showCountdown ? (
            <p className="flex items-center gap-1.5 font-mono text-sm text-content-muted">
              <Clock aria-hidden size={14} />
              {expiredSoon ? 'Kedaluwarsa' : `Berlaku ${formatCountdown(remaining ?? 0)}`}
            </p>
          ) : null}

          <p className="text-xs text-content-faint">
            Status diperbarui otomatis setelah pembayaran terkonfirmasi.
          </p>

          <div className="mt-4 flex flex-col sm:flex-row gap-3 w-full">
            {invoice.qrisImage ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void copyQrString(invoice.qrisImage)}
                disabled={!navigator.clipboard}
              >
                <Copy aria-hidden size={14} />
                Salin String QRIS
              </Button>
            ) : null}
            <Button type="button" variant="outline" size="sm" onClick={() => void retry()}>
              <RefreshCw aria-hidden size={16} />
              Segarkan Status
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 flex flex-col gap-2">
        <Badge variant="neutral">
          {invoice.status === 'pending' ? 'Menunggu Pembayaran' : invoice.status === 'processing' ? 'Sedang Diproses' : invoice.status}
        </Badge>
        {order?.panelUrl && (
          <p className="text-xs text-content-faint">
            Setelah pembayaran, server panel akan diaktifkan otomatis.
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button asChild>
          <a href="/dashboard/orders" className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-line px-5 text-sm text-content transition-colors hover:bg-content/5">
            Lihat Riwayat Pesanan
            <ArrowUpRight aria-hidden size={15} />
          </a>
        </Button>
        <Button asChild>
          <a href="/" className="btn-accent">
            Kembali ke Beranda
          </a>
        </Button>
      </div>
    </div>
  );
}
