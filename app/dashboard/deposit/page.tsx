'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Loader2,
  QrCode,
  RefreshCw,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSettings } from '@/components/settings-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { formatRupiah } from '@/lib/format';

type PaymentConfig = {
  configured: boolean;
  minAmount: number;
  maxAmount: number;
};

type Invoice = {
  invoiceId: string;
  amount: number;
  fee: number;
  total: number;
  status: string;
  qrisImage: string;
  paymentLink: string;
  expiredAt: number;
};

type Phase = 'loading' | 'error' | 'unconfigured' | 'form' | 'qr' | 'paid' | 'expired';

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function DepositPage() {
  const { settings, refresh } = useSettings();
  const [phase, setPhase] = useState<Phase>('loading');
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [amountInput, setAmountInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadConfigAndPending = useCallback(async () => {
    setPhase('loading');
    try {
      const [configRes, pendingRes] = await Promise.all([
        fetch('/api/user/deposit', { cache: 'no-store' }),
        fetch('/api/user/invoices/pending', { cache: 'no-store' }),
      ]);
      if (configRes.status === 401) {
        window.location.href = '/login?next=/dashboard/deposit';
        return;
      }
      if (!configRes.ok) throw new Error('Gagal memuat konfigurasi pembayaran.');
      const paymentConfig = (await configRes.json()) as PaymentConfig;
      setConfig(paymentConfig);

      const pendingData = pendingRes.ok
        ? ((await pendingRes.json()) as { invoice: Invoice | null })
        : { invoice: null };

      if (pendingData.invoice) {
        setInvoice(pendingData.invoice);
        setPhase('qr');
      } else if (!paymentConfig.configured) {
        setPhase('unconfigured');
      } else {
        setPhase('form');
      }
    } catch {
      setPhase('error');
    }
  }, []);

  useEffect(() => {
    void loadConfigAndPending();
  }, [loadConfigAndPending]);

  const applyInvoice = useCallback((next: Invoice) => {
    setInvoice(next);
    if (next.status === 'paid') {
      setPhase('paid');
      void refresh();
    } else if (next.status === 'expired' || next.status === 'failed') {
      setPhase('expired');
    } else {
      setPhase('qr');
    }
  }, [refresh]);

  useEffect(() => {
    if (phase !== 'qr' || !invoice) return;

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/user/invoices/${invoice.invoiceId}`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = (await res.json()) as { invoice?: Invoice };
        if (data.invoice) applyInvoice(data.invoice);
      } catch {
        /* biarkan polling berikutnya mencoba */
      }
    }, 5000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [phase, invoice, applyInvoice]);

  useEffect(() => {
    if (phase !== 'qr' || !invoice || invoice.expiredAt <= 0) return;
    const tick = () => setRemaining(invoice.expiredAt - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phase, invoice]);

  const submit = async () => {
    if (!config) return;
    const amount = Number(amountInput);
    if (!Number.isInteger(amount) || amount <= 0) {
      toast.error('Masukkan nominal deposit yang valid (bilangan bulat).');
      return;
    }
    if (config.minAmount > 0 && amount < config.minAmount) {
      toast.error(`Minimal deposit ${formatRupiah(config.minAmount)}.`);
      return;
    }
    if (config.maxAmount > 0 && amount > config.maxAmount) {
      toast.error(`Maksimal deposit ${formatRupiah(config.maxAmount)}.`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/user/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });
      const data = (await res.json()) as { ok?: boolean; redirectToPay?: string; invoiceId?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Gagal membuat invoice.');
      // Arahkan ke halaman pembayaran /pay/
      if (data.redirectToPay) {
        window.location.href = data.redirectToPay;
        return;
      }
      setAmountInput('');
      applyInvoice(data as Invoice);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal membuat invoice.');
    } finally {
      setSubmitting(false);
    }
  };

  const retry = () => {
    setInvoice(null);
    setRemaining(null);
    setPhase(config?.configured === false ? 'unconfigured' : 'form');
  };

  if (phase === 'loading') {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="mx-auto max-w-4xl">
        <EmptyState
          icon={RefreshCw}
          title="Gagal memuat halaman deposit"
          description="Periksa koneksi lalu coba lagi."
          action={
            <Button variant="outline" size="sm" onClick={() => void loadConfigAndPending()}>
              Coba lagi
            </Button>
          }
        />
      </div>
    );
  }

  if (phase === 'unconfigured') {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <PageHead title={settings?.systemTexts.menu.deposit ?? 'Deposit'} />
        <EmptyState
          icon={Wallet}
          title="Metode pembayaran belum tersedia"
          description="Admin belum mengonfigurasi pembayaran. Silakan coba lagi nanti."
        />
      </div>
    );
  }

  if (phase === 'paid') {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <PageHead title={settings?.systemTexts.menu.deposit ?? 'Deposit'} />
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <CheckCircle2 aria-hidden size={40} className="text-accent" />
            <h2 className="text-lg font-semibold text-content">Pembayaran diterima</h2>
            <p className="text-sm text-content-muted">
              {invoice ? formatRupiah(invoice.amount) : ''} telah masuk ke saldo Anda.
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link href="/dashboard/transactions">
                  Lihat transaksi
                  <ArrowUpRight aria-hidden size={15} />
                </Link>
              </Button>
              <Button variant="outline" onClick={retry}>
                Deposit lagi
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === 'expired') {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <PageHead title={settings?.systemTexts.menu.deposit ?? 'Deposit'} />
        <EmptyState
          icon={Clock}
          title="Invoice kedaluwarsa"
          description="Waktu pembayaran telah habis. Buat invoice baru untuk mencoba lagi."
          action={
            <Button onClick={retry}>
              <RefreshCw aria-hidden size={16} />
              Buat invoice baru
            </Button>
          }
        />
      </div>
    );
  }

  if (phase === 'qr' && invoice) {
    const showCountdown = invoice.expiredAt > 0;
    const expiredSoon = showCountdown && remaining !== null && remaining <= 0;
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <PageHead title={settings?.systemTexts.menu.deposit ?? 'Deposit'} />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode aria-hidden size={17} className="text-accent" />
              Bayar deposit
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 text-center">
            <div className="flex flex-col gap-1">
              <span className="text-sm text-content-muted">Total yang harus dibayar</span>
              <span className="text-2xl font-semibold text-content">
                {formatRupiah(invoice.total)}
              </span>
              {invoice.fee > 0 ? (
                <span className="text-xs text-content-faint">
                  Termasuk biaya layanan {formatRupiah(invoice.fee)}
                </span>
              ) : null}
            </div>

            {invoice.qrisImage ? (
              <img
                src={invoice.qrisImage}
                alt="Kode QRIS pembayaran"
                className="w-full max-w-[280px] rounded-2xl border border-line bg-white p-2"
              />
            ) : null}

            {invoice.qrisImage ? (
              <p className="text-xs text-content-faint">
                Pindai kode dengan aplikasi pembayaran apa pun.
              </p>
            ) : null}

            {invoice.paymentLink ? (
              <a
                href={invoice.paymentLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-line px-4 text-sm text-content transition-colors hover:bg-content/5"
              >
                Buka tautan pembayaran
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
              Status diperbarui otomatis. Anda boleh menutup halaman ini.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PageHead title={settings?.systemTexts.menu.deposit ?? 'Deposit'} />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet aria-hidden size={17} className="text-accent" />
            Deposit saldo
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="deposit-amount">Nominal deposit (Rp)</Label>
            <Input
              id="deposit-amount"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              placeholder="Masukkan nominal"
            />
            <p className="text-xs text-content-faint">
              {[
                config && config.minAmount > 0
                  ? `Minimal ${formatRupiah(config.minAmount)}`
                  : null,
                config && config.maxAmount > 0
                  ? `Maksimal ${formatRupiah(config.maxAmount)}`
                  : null,
              ]
                .filter(Boolean)
                .join(' · ') || 'Tanpa batas nominal.'}
            </p>
          </div>
          <div className="flex justify-end">
            <Button type="button" disabled={submitting} onClick={() => void submit()}>
              {submitting ? (
                <Loader2 aria-hidden size={16} className="animate-spin" />
              ) : (
                <QrCode aria-hidden size={16} />
              )}
              {submitting ? 'Membuat invoice...' : 'Buat invoice QRIS'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PageHead({ title }: { title: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="label-mono">{title}</p>
      <h1 className="text-2xl font-semibold text-content">Deposit saldo</h1>
    </div>
  );
}
