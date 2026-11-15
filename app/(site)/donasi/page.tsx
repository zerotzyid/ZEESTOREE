import { Wallet, Headset, Clock } from 'lucide-react';
import { getSettings } from '@/lib/settings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

type Contact = {
  whatsapp?: string | null;
  telegram?: string | null;
  email?: string | null;
};

function contactHref(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

export default async function DonasiPage() {
  let storeName = 'Kami';
  let contact: Contact = {};

  try {
    const settings = await getSettings();
    storeName = settings.identity.storeName || storeName;
    contact = settings.contact;
  } catch {
    /* pakai fallback bila RTDB belum terkonfigurasi */
  }

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
          Setiap contributi sangat dihargai.
        </p>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        <Card className="rounded-2xl border border-line p-6">
          <CardHeader>
            <CardTitle className="text-lg">Donasi via QRIS</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 flex flex-col gap-4">
            <div className="flex flex-col items-center gap-2">
              <Badge variant="default" className="flex items-center gap-1.5 text-xs">
                <Wallet aria-hidden size={14} />
                QRIS
              </Badge>
              <p className="text-sm text-content-muted text-center">
                Scan kode QR di aplikasi dompet digital Anda (GoPay, OVO, DANA, ShopeePay, dll.)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col items-center gap-1.5 rounded-xl border border-line p-3">
                <span className="text-[10px] uppercase tracking-wider text-content-faint">
                  Nominal
                </span>
                <span className="font-mono font-semibold text-accent">Rp 10.000</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 rounded-xl border border-line p-3">
                <span className="text-[10px] uppercase tracking-wider text-content-faint">
                  Nominal
                </span>
                <span className="font-mono font-semibold text-accent">Rp 25.000</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 rounded-xl border border-line p-3">
                <span className="text-[10px] uppercase tracking-wider text-content-faint">
                  Nominal
                </span>
                <span className="font-mono font-semibold text-accent">Rp 50.000</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 rounded-xl border border-line p-3">
                <span className="text-[10px] uppercase tracking-wider text-content-faint">
                  Nominal
                </span>
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
            <CardTitle className="text-lg">Kontak &amp; Konfirmasi</CardTitle>
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
              <span className="text-[10px] uppercase tracking-wider text-content-faint">
                Catatan
              </span>
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
          className="inline-flex min-h-[44px] items-center rounded-full border border-line px-6 text-sm text-content transition-colors hover:bg-content/5"
        >
          Kembali ke beranda
        </a>
      </div>
    </div>
  );
}
