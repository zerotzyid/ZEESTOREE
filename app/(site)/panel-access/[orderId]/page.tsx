import Link from 'next/link';
import type { Route } from 'next';
import { notFound } from 'next/navigation';
import { ArrowLeft, Server, ExternalLink, Copy, LogIn } from 'lucide-react';
import { get } from '@/lib/rtdb';
import { getSession } from '@/lib/session';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

type PanelAccess = {
  orderId: string;
  panelUrl: string | null;
  panelServerId?: string | null;
  panelServerUuid?: string | null;
  panelPassword?: string | null;
  username?: string | null;
  email?: string | null;
  status: string;
};

export default async function PanelAccessPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const session = await getSession();

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-sm text-content-muted">Anda harus masuk terlebih dahulu.</p>
          <Link
            href="/login"
            className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-full border border-line px-6 text-sm font-medium text-content transition-colors hover:bg-content/5"
          >
            <LogIn aria-hidden size={16} />
            Masuk
          </Link>
        </div>
      </div>
    );
  }

  let panel: PanelAccess | null = null;
  let error: string | null = null;

  try {
    const res = await fetch(`/api/user/panel-access/${orderId}`);
    if (res.status === 404) {
      return notFound();
    }
    if (!res.ok) {
      throw new Error('Gagal memuat akses panel.');
    }
    panel = await res.json();
  } catch {
    error = 'Gagal memuat akses panel.';
  }

  if (error || !panel) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-sm text-red-500">{error || 'Panel tidak tersedia.'}</p>
          <Link
            href="/dashboard/orders"
            className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-full border border-line px-6 text-sm font-medium text-content transition-colors hover:bg-content/5"
          >
            <ArrowLeft aria-hidden size={16} />
            Kembali ke pesanan
          </Link>
        </div>
      </div>
    );
  }

  const panelUrl = panel.panelUrl ?? '';
  const username = panel.email ?? panel.username ?? '';
  const password = panel.panelPassword ?? '';
  const displayName = panel.email ?? panel.username ?? 'Panel';

  return (
    <div className="mx-auto px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/dashboard/orders"
        className="mb-6 inline-flex min-h-[40px] items-center gap-2 rounded-full border border-line px-4 text-sm text-content-muted transition-colors hover:text-content"
      >
        <ArrowLeft aria-hidden size={15} />
        Kembali ke pesanan
      </Link>

      <div className="max-w-2xl">
        <div className="rounded-3xl border border-line/60 bg-content/5 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-xs text-content-muted">Panel Pterodactyl</p>
              <h1 className="text-2xl font-semibold text-content">{displayName}</h1>
            </div>
            <Badge
              variant={panel.status === 'active' ? 'success' : 'warning'}
              className="text-xs"
            >
              {panel.status === 'active' ? 'Aktif' : panel.status === 'paid' ? 'Dibayar' : 'Pending'}
            </Badge>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-line p-4">
              <p className="text-xs text-content-muted">URL Panel</p>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  value={panelUrl}
                  readOnly
                  className="flex-1 text-sm font-mono text-content bg-transparent border-none focus:ring-0"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void navigator.clipboard
                      .writeText(panelUrl)
                      .then(() => toast.success('URL panel disalin.'));
                  }}
                >
                  <Copy aria-hidden size={14} />
                  Salin
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-line p-4">
              <p className="text-xs text-content-muted">Username</p>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  value={username}
                  readOnly
                  className="flex-1 text-sm font-mono text-content bg-transparent border-none focus:ring-0"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void navigator.clipboard
                      .writeText(username)
                      .then(() => toast.success('Username disalin.'));
                  }}
                >
                  <Copy aria-hidden size={14} />
                  Salin
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-line p-4">
              <p className="text-xs text-content-muted">Password</p>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="password"
                  value={password}
                  readOnly
                  className="flex-1 text-sm font-mono text-content bg-transparent border-none focus:ring-0"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void navigator.clipboard
                      .writeText(password)
                      .then(() => toast.success('Password disalin.'));
                  }}
                >
                  <Copy aria-hidden size={14} />
                  Salin
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-xs text-content-muted mb-2">Masuk ke Panel Pterodactyl</p>
            <div className="flex flex-col sm:flex-row gap-3">
              {!panelUrl ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled
                >
                  <Server aria-hidden size={16} />
                  Panel Belum Tersedia
                </Button>
              ) : (
                <a
                  href={panelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-accent inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-6 text-sm font-medium"
                >
                  <Server aria-hidden size={16} />
                  Buka Panel Pterodactyl
                </a>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!panelUrl}
                onClick={() => {
                  if (panelUrl) {
                    window.open(panelUrl, '_blank');
                  }
                }}
              >
                <ExternalLink aria-hidden size={16} />
                Buka di Tab Baru
              </Button>
            </div>
            <p className="mt-2 text-xs text-content-faint">
              Masuk dengan email dan password di atas. Jika lupa password, gunakan fitur
              "Lupa Password" di halaman login panel.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
