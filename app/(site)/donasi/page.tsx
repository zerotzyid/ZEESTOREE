import { Wallet, Headset, Clock, Heart, ArrowUpRight, Loader2, QrCode, CheckCircle2, ExternalLink } from 'lucide-react';
import { getSettings } from '@/lib/settings';
import { getPublicPaymentConfig } from '@/lib/payment-config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const dynamic = 'force-dynamic';

type Contact = {
  whatsapp?: string | null;
  telegram?: string | null;
  email?: string | null;
};

type DonationConfig = {
  enabled: boolean;
  title: string;
  description: string;
  suggestedAmounts: number[];
  showCustomAmount: boolean;
  minAmount: number;
  maxAmount: number;
  qrImage: string;
  qrAlt: string;
};

type BrandingConfig = {
  logo: string;
  favicon: string;
  banner: string;
  donationQrLogo: string;
};

type PaymentConfig = {
  configured: boolean;
  minAmount: number;
  maxAmount: number;
};

function contactHref(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

function formatRupiah(value: number): string {
  return `Rp ${value.toLocaleString('id-ID')}`;
}

function mergeQrWithLogo(qrDataUrl: string, logoDataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const qrImg = new Image();
    qrImg.crossOrigin = 'anonymous';
    qrImg.onload = () => {
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      logoImg.onload = () => {
        const canvas = document.createElement('canvas');
        const size = qrImg.width;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(qrImg, 0, 0);
        const logoSize = size * 0.2;
        const x = (size - logoSize) / 2;
        const y = (size - logoSize) / 2;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(x - 4, y - 4, logoSize + 8, logoSize + 8, 8);
        ctx.fill();
        ctx.drawImage(logoImg, x, y, logoSize, logoSize);
        resolve(canvas.toDataURL('image/png'));
      };
      logoImg.onerror = () => resolve(qrDataUrl);
      logoImg.src = logoDataUrl;
    };
    qrImg.onerror = () => resolve(qrDataUrl);
    qrImg.src = qrDataUrl;
  });
}

export default async function DonasiPage() {
  let storeName = 'Kami';
  let contact: Contact = {};
  let donation: DonationConfig = {
    enabled: false,
    title: 'Dukung Kami',
    description: 'Donasi Anda membantu menjaga layanan ini tetap berjalan dan dikembangkan. Setiap kontribusi sangat dihargai.',
    suggestedAmounts: [10000, 25000, 50000, 100000],
    showCustomAmount: true,
    minAmount: 5000,
    maxAmount: 10000000,
    qrImage: '',
    qrAlt: 'QRIS Donasi',
  };
  let branding: BrandingConfig = { logo: '', favicon: '', banner: '', donationQrLogo: '' };
  let paymentConfig: PaymentConfig = { configured: false, minAmount: 0, maxAmount: 0 };

  try {
    const [settings, payConfig] = await Promise.all([
      getSettings(),
      getPublicPaymentConfig(),
    ]);
    storeName = settings.identity.storeName || storeName;
    contact = settings.contact;
    donation = settings.donation || donation;
    branding = settings.branding || branding;
    paymentConfig = payConfig;
  } catch {
    /* pakai fallback bila RTDB belum terkonfigurasi */
  }

  // Jika donasi tidak diaktifkan, tampilkan halaman info saja
  if (!donation.enabled) {
    const waHref = contactHref(contact.whatsapp);
    const tgHref = contactHref(contact.telegram);
    const emailHref = contactHref(contact.email);

    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="flex flex-col gap-1">
          <p className="label-mono">Donasi</p>
          <h1 className="text-3xl font-semibold text-content sm:text-4xl">
            Dukungi {storeName}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-content-muted">
            Donasi Anda membantu menjaga layanan ini tetap berjalan dan dikembangkan.
            Setiap kontribusi sangat dihargai.
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <Card className="rounded-2xl border border-line p-6">
            <CardHeader>
              <CardTitle className="text-lg">Donasi Manual</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 flex flex-col gap-4">
              <p className="text-sm text-content-muted">
                Fitur donasi otomatis via QRIS belum diaktifkan. Anda bisa mentransfer manual
                ke rekening berikut dan konfirmasi lewat kontak di bawah.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col items-center gap-1.5 rounded-xl border border-line p-3">
                  <span className="text-[10px] uppercase tracking-wider text-content-faint">Nominal</span>
                  <span className="font-mono font-semibold text-accent">Rp 10.000</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 rounded-xl border border-line p-3">
                  <span className="text-[10px] uppercase tracking-wider text-content-faint">Nominal</span>
                  <span className="font-mono font-semibold text-accent">Rp 25.000</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 rounded-xl border border-line p-3">
                  <span className="text-[10px] uppercase tracking-wider text-content-faint">Nominal</span>
                  <span className="font-mono font-semibold text-accent">Rp 50.000</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 rounded-xl border border-line p-3">
                  <span className="text-[10px] uppercase tracking-wider text-content-faint">Nominal</span>
                  <span className="font-mono font-semibold text-accent">Rp 100.000</span>
                </div>
              </div>
              <p className="text-xs text-content-faint">
                Tidak ada nominal yang tertera? Silakan transfer sembarang jumlah dan konfirmasi lewat kontak di bawah.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-line p-6">
            <CardHeader>
              <CardTitle className="text-lg">Kontak & Konfirmasi</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Headset aria-hidden size={16} className="text-accent" />
                <span className="text-sm text-content-muted">Kirim bukti transfer</span>
              </div>

              {waHref ? (
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 rounded-xl border border-line bg-content/[0.02] px-3 py-2.5 text-sm text-content transition-colors hover:border-accent hover:text-accent"
                >
                  <span className="text-xs font-mono text-content-faint">WhatsApp</span>
                  {contact.whatsapp}
                </a>
              ) : null}
              {tgHref ? (
                <a
                  href={tgHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 rounded-xl border border-line bg-content/[0.02] px-3 py-2.5 text-sm text-content transition-colors hover:border-accent hover:text-accent"
                >
                  <span className="text-xs font-mono text-content-faint">Telegram</span>
                  {contact.telegram}
                </a>
              ) : null}
              {emailHref ? (
                <a
                  href={`mailto:${emailHref}`}
                  className="inline-flex items-center gap-2.5 rounded-xl border border-line bg-content/[0.02] px-3 py-2.5 text-sm text-content transition-colors hover:border-accent hover:text-accent"
                >
                  <span className="text-xs font-mono text-content-faint">Email</span>
                  {contact.email}
                </a>
              ) : null}

              {!waHref && !tgHref && !emailHref ? (
                <p className="text-sm text-content-muted">Kontak admin belum diatur.</p>
              ) : null}

              <div className="mt-4 pt-4 border-t border-line/60 flex flex-col gap-2">
                <span className="text-[10px] uppercase tracking-wider text-content-faint">Catatan</span>
                <p className="text-sm text-content-muted">
                  Sertakan username atau email akun Anda dalam keterangan transfer agar kami dapat
                  mengakui donasi Anda.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 flex flex-col items-center gap-3 rounded-2xl border border-line bg-content/[0.02] p-6 text-center">
          <Clock aria-hidden size={16} className="text-content-faint" />
          <p className="text-xs text-content-faint">
            Donasi bersifat sukarela dan tidak dapat dikembalikan. Terima kasih atas dukungan Anda.
          </p>
        </div>

        <div className="mt-10 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <a
            href="/"
            className="inline-flex min-h-[40px] items-center rounded-full border border-line px-4 text-sm text-content transition-colors hover:bg-content/5"
          >
            Kembali ke beranda
          </a>
        </div>
      </div>
    );
  }

  // Jika Pixpayz tidak dikonfigurasi, tampilkan mode manual dengan QR statis jika ada
  if (!paymentConfig.configured || !donation.qrImage) {
    const waHref = contactHref(contact.whatsapp);
    const tgHref = contactHref(contact.telegram);
    const emailHref = contactHref(contact.email);

    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="flex flex-col gap-1">
          <p className="label-mono">Donasi</p>
          <h1 className="text-3xl font-semibold text-content sm:text-4xl">{donation.title}</h1>
          <p className="mt-2 max-w-xl text-sm text-content-muted">{donation.description}</p>
        </div>

        {donation.qrImage && (
          <div className="mt-8 flex flex-col items-center gap-4">
            <Card className="rounded-2xl border border-line p-6 w-full max-w-xs">
              <CardContent className="flex flex-col items-center gap-3 pt-0">
                <img
                  src={donation.qrImage}
                  alt={donation.qrAlt}
                  className="w-full max-w-[280px] rounded-2xl border border-line bg-white p-2"
                />
                <p className="text-xs text-content-faint text-center">Scan untuk donasi manual</p>
              </CardContent>
            </Card>
            <p className="text-xs text-content-faint">Gunakan aplikasi e-wallet apa pun (GoPay, OVO, DANA, ShopeePay, dll.)</p>
          </div>
        )}

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <Card className="rounded-2xl border border-line p-6">
            <CardHeader>
              <CardTitle className="text-lg">Nominal Disarankan</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-3">
                {donation.suggestedAmounts.map((amt) => (
                  <div key={amt} className="flex flex-col items-center gap-1.5 rounded-xl border border-line p-3">
                    <span className="text-[10px] uppercase tracking-wider text-content-faint">Nominal</span>
                    <span className="font-mono font-semibold text-accent">{formatRupiah(amt)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-line p-6">
            <CardHeader>
              <CardTitle className="text-lg">Kontak & Konfirmasi</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Headset aria-hidden size={16} className="text-accent" />
                <span className="text-sm text-content-muted">Kirim bukti transfer</span>
              </div>

              {waHref ? (
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 rounded-xl border border-line bg-content/[0.02] px-3 py-2.5 text-sm text-content transition-colors hover:border-accent hover:text-accent"
                >
                  <span className="text-xs font-mono text-content-faint">WhatsApp</span>
                  {contact.whatsapp}
                </a>
              ) : null}
              {tgHref ? (
                <a
                  href={tgHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 rounded-xl border border-line bg-content/[0.02] px-3 py-2.5 text-sm text-content transition-colors hover:border-accent hover:text-accent"
                >
                  <span className="text-xs font-mono text-content-faint">Telegram</span>
                  {contact.telegram}
                </a>
              ) : null}
              {emailHref ? (
                <a
                  href={`mailto:${emailHref}`}
                  className="inline-flex items-center gap-2.5 rounded-xl border border-line bg-content/[0.02] px-3 py-2.5 text-sm text-content transition-colors hover:border-accent hover:text-accent"
                >
                  <span className="text-xs font-mono text-content-faint">Email</span>
                  {contact.email}
                </a>
              ) : null}

              {!waHref && !tgHref && !emailHref ? (
                <p className="text-sm text-content-muted">Kontak admin belum diatur.</p>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 flex flex-col items-center gap-3 rounded-2xl border border-line bg-content/[0.02] p-6 text-center">
          <Clock aria-hidden size={16} className="text-content-faint" />
          <p className="text-xs text-content-faint">Donasi bersifat sukarela dan tidak dapat dikembalikan. Terima kasih atas dukungan Anda.</p>
        </div>

        <div className="mt-10 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <a href="/" className="inline-flex min-h-[40px] items-center rounded-full border border-line px-4 text-sm text-content transition-colors hover:bg-content/5">Kembali ke beranda</a>
        </div>
      </div>
    );
  }

  // Mode QRIS otomatis via Pixpayz - client component needed
  return (
    <DonationClient
      storeName={storeName}
      donation={donation}
      branding={branding}
      paymentConfig={paymentConfig}
      contact={contact}
    />
  );
}

function DonationClient({
  storeName,
  donation,
  branding,
  paymentConfig,
  contact,
}: {
  storeName: string;
  donation: DonationConfig;
  branding: BrandingConfig;
  paymentConfig: PaymentConfig;
  contact: Contact;
}) {
  const [phase, setPhase] = useState<'loading' | 'form' | 'qr' | 'paid' | 'expired' | 'error'>('loading');
  const [invoice, setInvoice] = useState<{
    invoiceId: string;
    amount: number;
    fee: number;
    total: number;
    status: string;
    qrisImage: string;
    paymentLink: string;
    expiredAt: number;
  } | null>(null);
  const [amountInput, setAmountInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [qrWithLogo, setQrWithLogo] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    setAnimateIn(true);
    void loadPending();
  }, []);

  useEffect(() => {
    if (phase === 'qr' && qrWithLogo === null && invoice?.qrisImage && branding.donationQrLogo) {
      mergeQrWithLogo(invoice.qrisImage, branding.donationQrLogo).then(setQrWithLogo).catch(() => setQrWithLogo(invoice?.qrisImage ?? null));
    } else if (phase === 'qr' && invoice?.qrisImage) {
      setQrWithLogo(invoice.qrisImage);
    }
  }, [phase, invoice, branding.donationQrLogo]);

  const loadPending = async () => {
    setPhase('loading');
    try {
      const [pendingRes, configRes] = await Promise.all([
        fetch('/api/user/invoices/pending?purpose=donation', { cache: 'no-store' }),
        fetch('/api/user/deposit', { cache: 'no-store' }),
      ]);
      if (pendingRes.ok) {
        const data = await pendingRes.json();
        if (data.invoice) {
          setInvoice(data.invoice);
          setPhase(data.invoice.status === 'paid' ? 'paid' : data.invoice.status === 'expired' || data.invoice.status === 'failed' ? 'expired' : 'qr');
          return;
        }
      }
      if (!configRes.ok) throw new Error('Gagal memuat konfigurasi.');
      const config = await configRes.json();
      if (!config.configured) {
        setPhase('error');
      } else {
        setPhase('form');
      }
    } catch {
      setPhase('error');
    }
  };

  const applyInvoice = (next: typeof invoice) => {
    setInvoice(next);
    if (next?.status === 'paid') setPhase('paid');
    else if (next?.status === 'expired' || next?.status === 'failed') setPhase('expired');
    else setPhase('qr');
  };

  useEffect(() => {
    if (phase !== 'qr' || !invoice) return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/user/invoices/${invoice.invoiceId}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (data.invoice) applyInvoice(data.invoice);
      } catch {}
    }, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [phase, invoice]);

  useEffect(() => {
    if (phase !== 'qr' || !invoice || invoice.expiredAt <= 0) return;
    const tick = () => setRemaining(invoice.expiredAt - Date.now());
    tick();
    countdownRef.current = setInterval(tick, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [phase, invoice]);

  const submit = async () => {
    const amount = Number(amountInput);
    if (!Number.isInteger(amount) || amount <= 0) {
      toast.error('Masukkan nominal donasi yang valid (bilangan bulat).');
      return;
    }
    if (donation.minAmount > 0 && amount < donation.minAmount) {
      toast.error(`Minimal donasi ${formatRupiah(donation.minAmount)}.`);
      return;
    }
    if (donation.maxAmount > 0 && amount > donation.maxAmount) {
      toast.error(`Maksimal donasi ${formatRupiah(donation.maxAmount)}.`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/user/donation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Gagal membuat invoice.');
      setAmountInput('');
      applyInvoice(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal membuat invoice.');
    } finally {
      setSubmitting(false);
    }
  };

  const retry = () => {
    setInvoice(null);
    setRemaining(null);
    setQrWithLogo(null);
    setPhase('form');
  };

  const formatCountdown = (ms: number) => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (phase === 'loading') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="flex flex-col gap-1">
          <p className="label-mono">Donasi</p>
          <h1 className="text-3xl font-semibold text-content">{donation.title}</h1>
        </div>
        <div className="mt-8 animate-pulse space-y-4">
          <div className="h-8 bg-content/10 rounded w-1/2"></div>
          <div className="h-64 bg-content/10 rounded"></div>
        </div>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Card className="rounded-2xl border border-line p-6 text-center">
          <CardContent className="flex flex-col items-center gap-4">
            <Heart aria-hidden size={32} className="text-content-faint" />
            <h2 className="text-lg font-semibold text-content">Donasi belum tersedia</h2>
            <p className="text-sm text-content-muted">Admin belum mengonfigurasi pembayaran. Silakan coba lagi nanti.</p>
            <Button variant="outline" onClick={() => loadPending()}>Coba lagi</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const waHref = contactHref(contact.whatsapp);
  const tgHref = contactHref(contact.telegram);
  const emailHref = contactHref(contact.email);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 animate-in fade-in duration-300">
      <div className="flex flex-col gap-1">
        <p className="label-mono">Donasi</p>
        <h1 className="text-3xl font-semibold text-content sm:text-4xl">{donation.title}</h1>
        <p className="mt-2 max-w-xl text-sm text-content-muted">{donation.description}</p>
      </div>

      {phase === 'form' && (
        <Card className="mt-8 rounded-2xl border border-line overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart aria-hidden size={17} className="text-accent" />
              Donasi via QRIS
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-content-muted">
              Pilih nominal atau masukkan nominal custom. Pembayaran diproses via Pixpayz (QRIS).
            </p>

            <div className="flex flex-wrap gap-2">
              {donation.suggestedAmounts.map((amt) => (
                <Button
                  key={amt}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => { setAmountInput(String(amt)); void submit(); }}
                  disabled={submitting}
                  className="transition-all hover:bg-accent-soft hover:text-accent"
                >
                  {formatRupiah(amt)}
                </Button>
              ))}
            </div>

            {donation.showCustomAmount && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="donation-amount">Atau masukkan nominal custom (Rp)</Label>
                <Input
                  id="donation-amount"
                  type="number"
                  inputMode="numeric"
                  min={donation.minAmount || 1}
                  max={donation.maxAmount || 10000000}
                  step={1}
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="Contoh: 15000"
                />
                <p className="text-xs text-content-faint">
                  Minimal {formatRupiah(donation.minAmount || 0)}
                  {donation.maxAmount > 0 ? ` · Maksimal ${formatRupiah(donation.maxAmount)}` : ''}
                </p>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                type="button"
                disabled={submitting || !amountInput}
                onClick={() => void submit()}
                className="min-w-[180px]"
              >
                {submitting ? (
                  <>
                    <Loader2 aria-hidden size={16} className="animate-spin" />
                    Membuat QRIS...
                  </>
                ) : (
                  <>
                    <QrCode aria-hidden size={16} />
                    Buat QRIS Donasi
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {phase === 'qr' && invoice && (
        <div className="mt-8 animate-in slide-in-from-top-2 duration-300">
          <Card className="rounded-2xl border border-line overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode aria-hidden size={17} className="text-accent" />
                Bayar Donasi
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4 text-center">
              <div className="flex flex-col gap-1">
                <span className="text-sm text-content-muted">Total yang harus dibayar</span>
                <span className="text-3xl font-semibold text-content animate-pulse">
                  {formatRupiah(invoice.total)}
                </span>
                {invoice.fee > 0 && (
                  <span className="text-xs text-content-faint">Termasuk biaya layanan {formatRupiah(invoice.fee)}</span>
                )}
              </div>

              <div className="relative group">
                {qrWithLogo ? (
                  <img
                    src={qrWithLogo}
                    alt="QRIS Donasi"
                    className="w-full max-w-[300px] rounded-2xl border border-line bg-white p-3 shadow-lg transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="w-full max-w-[300px] aspect-square rounded-2xl border border-dashed border-line bg-content/5 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-accent" />
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-black/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-4">
                    <p className="text-center text-white text-sm font-medium">Pindai dengan aplikasi e-wallet</p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-content-faint">Gunakan aplikasi pembayaran apa pun (GoPay, OVO, DANA, ShopeePay, dll.)</p>

              {invoice.paymentLink && (
                <a
                  href={invoice.paymentLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 min-h-[44px] rounded-xl border border-line px-4 text-sm text-content transition-colors hover:bg-content/5"
                >
                  Buka halaman pembayaran
                  <ExternalLink aria-hidden size={15} />
                </a>
              )}

              {invoice.expiredAt > 0 && (
                <p className="flex items-center gap-1.5 font-mono text-sm text-content-muted">
                  <Clock aria-hidden size={14} />
                  {remaining !== null && remaining <= 0 ? 'Kedaluwarsa' : `Berlaku ${formatCountdown(remaining ?? 0)}`}
                </p>
              )}

              <p className="text-xs text-content-faint">Status diperbarui otomatis. Anda boleh menutup halaman ini.</p>
            </CardContent>
          </Card>
        </div>
      )}

      {phase === 'paid' && invoice && (
        <div className="mt-8 animate-in fade-in duration-300">
          <Card className="rounded-2xl border border-line overflow-hidden">
            <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
              <div className="relative">
                <div className="absolute inset-0 bg-accent/20 rounded-full animate-ping" />
                <CheckCircle2 aria-hidden size={48} className="text-accent relative z-10" />
              </div>
              <h2 className="text-xl font-semibold text-content">Terima kasih!</h2>
              <p className="text-sm text-content-muted">
                Donasi Anda sebesar <span className="font-semibold text-content">{formatRupiah(invoice.amount)}</span> telah diterima.
              </p>
              <p className="text-xs text-content-faint">Dukungan Anda sangat berarti untuk pengembangan layanan ini.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                <Button variant="outline" onClick={retry}>
                  <Heart aria-hidden size={15} />
                  Donasi Lagi
                </Button>
                <a
                  href="/"
                  className="inline-flex min-h-[40px] items-center rounded-full border border-line px-4 text-sm text-content transition-colors hover:bg-content/5"
                >
                  Kembali ke beranda
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {phase === 'expired' && (
        <div className="mt-8 animate-in fade-in duration-300">
          <Card className="rounded-2xl border border-line overflow-hidden">
            <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
              <Clock aria-hidden size={40} className="text-content-faint" />
              <h2 className="text-lg font-semibold text-content">Waktu pembayaran habis</h2>
              <p className="text-sm text-content-muted">Invoice QRIS telah kedaluwarsa. Silakan buat invoice baru.</p>
              <Button onClick={retry}>
                <RefreshCw aria-hidden size={16} />
                Buat QRIS Baru
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        <Card className="rounded-2xl border border-line p-6">
          <CardHeader>
            <CardTitle className="text-lg">Nominal Disarankan</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-3">
              {donation.suggestedAmounts.map((amt) => (
                <div key={amt} className="flex flex-col items-center gap-1.5 rounded-xl border border-line p-3">
                  <span className="text-[10px] uppercase tracking-wider text-content-faint">Nominal</span>
                  <span className="font-mono font-semibold text-accent">{formatRupiah(amt)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-line p-6">
          <CardHeader>
            <CardTitle className="text-lg">Kontak & Konfirmasi</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Headset aria-hidden size={16} className="text-accent" />
              <span className="text-sm text-content-muted">Butuh bantuan?</span>
            </div>

            {waHref ? (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 rounded-xl border border-line bg-content/[0.02] px-3 py-2.5 text-sm text-content transition-colors hover:border-accent hover:text-accent"
              >
                <span className="text-xs font-mono text-content-faint">WhatsApp</span>
                {contact.whatsapp}
              </a>
            ) : null}
            {tgHref ? (
              <a
                href={tgHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 rounded-xl border border-line bg-content/[0.02] px-3 py-2.5 text-sm text-content transition-colors hover:border-accent hover:text-accent"
              >
                <span className="text-xs font-mono text-content-faint">Telegram</span>
                {contact.telegram}
              </a>
            ) : null}
            {emailHref ? (
              <a
                href={`mailto:${emailHref}`}
                className="inline-flex items-center gap-2.5 rounded-xl border border-line bg-content/[0.02] px-3 py-2.5 text-sm text-content transition-colors hover:border-accent hover:text-accent"
              >
                <span className="text-xs font-mono text-content-faint">Email</span>
                {contact.email}
              </a>
            ) : null}

            {!waHref && !tgHref && !emailHref ? (
              <p className="text-sm text-content-muted">Kontak admin belum diatur.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="mt-12 flex flex-col items-center gap-3 rounded-2xl border border-line bg-content/[0.02] p-6 text-center">
        <Clock aria-hidden size={16} className="text-content-faint" />
        <p className="text-xs text-content-faint">Donasi bersifat sukarela dan tidak dapat dikembalikan. Terima kasih atas dukungan Anda.</p>
      </div>

      <div className="mt-10 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
        <a href="/" className="inline-flex min-h-[40px] items-center rounded-full border border-line px-4 text-sm text-content transition-colors hover:bg-content/5">Kembali ke beranda</a>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';