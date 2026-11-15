'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUp,
  ChevronLeft,
  Copy,
  Download,
  ExternalLink,
  File as FileIcon,
  Folder,
  FolderPlus,
  HardDrive,
  Loader2,
  Play,
  RotateCw,
  Save,
  Server,
  Skull,
  Square,
  Trash2,
  Upload,
  Zap,
  X,
  CalendarPlus,
  Wifi,
  WifiOff,
  Terminal,
  Database,
  Cpu,
  Monitor,
  Shield,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { FadeIn } from '@/components/anim';

type State = { state: string; cpu: number; memoryBytes: number; diskBytes: number; uptimeMs: number } | null;
type FileItem = { name: string; isFile: boolean; size: number };
type Tab = 'overview' | 'console' | 'files' | 'settings' | 'backups';

async function api<T>(id: string, qs: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api/user/panels/${id}${qs}`, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Gagal (${res.status})`);
  return data;
}

const mb = (b: number) => `${(b / 1048576).toFixed(0)} MB`;
const fmtDate = (t: number) => new Date(t).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const fmtUptime = (ms: number) => {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d ? `${d}h ${h}j ${m}m` : h ? `${h}j ${m}m` : `${m}m`;
};

function StatusDot({ online }: { online: boolean }) {
  return (
    <span className="relative flex h-2 w-2">
      <span className={`absolute inset-0 rounded-full ${online ? 'bg-green-400 shadow-[0_0_8px_#22c55e]' : 'bg-gray-500'}`} />
      <span className="absolute inset-0 rounded-full bg-inherit opacity-30 animate-ping" />
    </span>
  );
}

function ZipUpload({ orderId, dir, onUploaded }: { orderId: string; dir: string; onUploaded: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return toast.error('Pilih file .zip dulu.');
    if (!file.name.endsWith('.zip')) return toast.error('Hanya file .zip yang diperbolehkan.');

    setUploading(true);
    setProgress(0);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('dir', dir);
      formData.append('action', 'upload');

      const res = await fetch(`/api/user/panels/${orderId}`, {
        method: 'POST',
        body: formData,
        cache: 'no-store',
      });

      const interval = setInterval(() => setProgress((p) => Math.min(p + 15, 90)), 200);

      const data = (await res.json().catch(() => ({}))) as { error?: string };
      clearInterval(interval);
      setProgress(100);

      if (!res.ok) throw new Error(data.error ?? `Upload gagal (${res.status})`);
      toast.success('ZIP diupload & diekstrak.');
      setFile(null);
      onUploaded();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal upload ZIP.');
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 500);
    }
  };

  return (
    <form onSubmit={handleUpload} className="flex flex-col gap-2 p-3 rounded-lg border border-line bg-content/5">
      <label className="text-xs font-medium text-content-muted">Upload & Ekstrak ZIP</label>
      <div className="flex items-center gap-2">
        <Input type="file" accept=".zip" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="flex-1" />
        <Button type="submit" size="sm" disabled={uploading || !file}>
          {uploading ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              {progress}%
            </>
          ) : (
            <>
              <Upload size={13} />
              Upload
            </>
          )}
        </Button>
      </div>
      {uploading && (
        <div className="h-1.5 rounded-full bg-content/10 overflow-hidden">
          <div className="h-full bg-accent transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      )}
      <p className="text-[10px] text-content-faint">Maks 50MB. Akan diekstrak otomatis ke folder saat ini.</p>
    </form>
  );
}

export default function PanelServerPage({ params }: { params: Promise<{ id: string }> }) {
  const [orderId, setOrderId] = useState('');
  const [order, setOrder] = useState<{
    id: string;
    productName?: string;
    status?: string;
    panelUrl?: string | null;
    panelUsername?: string | null;
    panelPassword?: string | null;
    panelServerId?: number | null;
    panelServerUuid?: string | null;
    expiresAt?: number | null;
    createdAt?: number;
  } | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [st, setSt] = useState<State>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [expired, setExpired] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!orderId) return;
    try {
      const d = await api<{ state: State; expiresAt: number | null; expired: boolean }>(orderId, '?view=status');
      setSt(d.state);
      setExpiresAt(d.expiresAt);
      setExpired(d.expired);
    } catch (e) {
      // jangan toast error di auto-refresh
    }
  }, [orderId]);

  useEffect(() => {
    const loadOrder = async () => {
      const { id } = await params;
      setOrderId(id);
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/user/orders', { cache: 'no-store' });
        if (res.status === 401) {
          window.location.href = `/login?next=/dashboard/panels/${id}`;
          return;
        }
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { orders?: typeof order[] };
        const found = data.orders?.find((o) => o?.id === id);
        if (!found || !found.panelUrl || (found.status !== 'active' && found.status !== 'completed')) {
          throw new Error('Server tidak ditemukan atau tidak aktif.');
        }
        setOrder(found);
        setExpiresAt(found.expiresAt ?? null);
      } catch {
        setError('Gagal memuat data server.');
      } finally {
        setLoading(false);
      }
    };
    void loadOrder();
  }, [params]);

  useEffect(() => {
    if (!orderId) return;
    void refresh();
    const t = setInterval(() => void refresh(), 10_000);
    return () => clearInterval(t);
  }, [refresh, orderId]);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      void refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal.');
    } finally {
      setBusy(false);
    }
  };

  const power = (signal: 'start' | 'stop' | 'restart' | 'kill') =>
    run(() => api(orderId, '', { action: 'power', signal }), `Perintah ${signal} dikirim.`);

  const renew = () => {
    if (!confirm('Perpanjang server? Saldo akan terpotong sesuai harga produk.')) return;
    void run(() => api(orderId, '', { action: 'renew' }), 'Server diperpanjang.');
  };

  if (loading) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-36 w-full" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-4xl">
        <EmptyState
          icon={Server}
          title="Server tidak ditemukan"
          description={error || 'Server tidak ditemukan atau Anda tidak memiliki akses.'}
          action={
            <Link href="/dashboard/panels" className="inline-flex min-h-[40px] items-center rounded-full border border-line px-4 text-sm text-content transition-colors hover:bg-content/5">
              <ChevronLeft aria-hidden size={15} className="mr-1" />
              Kembali ke Panel Saya
            </Link>
          }
        />
      </div>
    );
  }

  const online = st?.state === 'running';
  const cpuPct = st?.cpu ?? 0;
  const ramMB = st ? Math.round(st.memoryBytes / 1048576) : 0;
  const diskMB = st ? Math.round(st.diskBytes / 1048576) : 0;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/panels"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-content/5 text-content-muted hover:bg-content/10 transition-colors"
            aria-label="Kembali"
          >
            <ChevronLeft aria-hidden size={18} />
          </Link>
          <div>
            <p className="label-mono">Kelola Server</p>
            <h1 className="text-2xl font-semibold text-content">{order.productName ?? order.id}</h1>
            <p className="font-mono text-[11px] text-content-faint">
              {order.panelServerId ? `Server #${order.panelServerId}` : order.id}
              {order.panelServerUuid && ` · ${order.panelServerUuid.slice(0, 8)}...`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={online ? 'success' : 'danger'} className="gap-1">
            <StatusDot online={online} />
            {online ? 'Online' : 'Offline'}
            {st?.state && ` · ${st.state}`}
          </Badge>
          <Badge variant={expired ? 'danger' : 'default'}>
            {expired ? 'Kedaluwarsa' : expiresAt ? `Aktif sampai ${fmtDate(expiresAt)}` : 'Tanpa masa aktif'}
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="rounded-2xl border border-line p-4">
          <CardContent className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-green-500/10 text-green-400">
                <Wifi aria-hidden size={16} />
              </span>
              <span className="text-xs text-content-muted">Status</span>
            </div>
            <p className="font-mono text-lg font-semibold text-content">{st?.state ?? '—'}</p>
            <p className="text-[10px] text-content-faint">{online ? 'Server berjalan normal' : 'Server tidak aktif'}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border border-line p-4">
          <CardContent className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-yellow-500/10 text-yellow-400">
                <Cpu aria-hidden size={16} />
              </span>
              <span className="text-xs text-content-muted">CPU</span>
            </div>
            <p className="font-mono text-lg font-semibold text-content">{cpuPct.toFixed(1)}%</p>
            <p className="text-[10px] text-content-faint">Penggunaan CPU</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border border-line p-4">
          <CardContent className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                <HardDrive aria-hidden size={16} />
              </span>
              <span className="text-xs text-content-muted">RAM</span>
            </div>
            <p className="font-mono text-lg font-semibold text-content">{ramMB} MB</p>
            <p className="text-[10px] text-content-faint">Digunakan dari total</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border border-line p-4">
          <CardContent className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
                <Database aria-hidden size={16} />
              </span>
              <span className="text-xs text-content-muted">Disk</span>
            </div>
            <p className="font-mono text-lg font-semibold text-content">{diskMB} MB</p>
            <p className="text-[10px] text-content-faint">Terpakai</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)} className="rounded-2xl border border-line">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview"><Monitor className="mr-1 h-4 w-4" />Overview</TabsTrigger>
          <TabsTrigger value="console"><Terminal className="mr-1 h-4 w-4" />Console</TabsTrigger>
          <TabsTrigger value="files"><Folder className="mr-1 h-4 w-4" />Files</TabsTrigger>
          <TabsTrigger value="backups"><Database className="mr-1 h-4 w-4" />Backups</TabsTrigger>
          <TabsTrigger value="settings"><Shield className="mr-1 h-4 w-4" />Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="p-4">
          <div className="flex flex-col gap-4">
            {/* Quick Actions */}
            <Card className="rounded-xl border border-line">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap aria-hidden size={16} className="text-yellow-400" />
                  Power Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" disabled={busy || online} onClick={() => power('start')}>
                    <Play size={13} /> Start
                  </Button>
                  <Button size="sm" variant="outline" disabled={busy || !online} onClick={() => power('restart')}>
                    <RotateCw size={13} /> Restart
                  </Button>
                  <Button size="sm" variant="outline" disabled={busy || !online} onClick={() => power('stop')}>
                    <Square size={13} /> Stop
                  </Button>
                  <Button size="sm" variant="outline" disabled={busy || !online} onClick={() => power('kill')}>
                    <Skull size={13} /> Kill
                  </Button>
                  <Button size="sm" variant="ghost" onClick={renew}>
                    <CalendarPlus size={13} /> Perpanjang
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Server Info */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Card className="rounded-xl border border-line">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Server aria-hidden size={16} className="text-accent" />
                    Informasi Server
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  <InfoRow label="Panel URL" value={<a href={order.panelUrl ?? '#'} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline flex items-center gap-1">{order.panelUrl}<ExternalLink size={12} /></a>} />
                  {order.panelUsername && <InfoRow label="Username" value={<code className="font-mono text-sm">{order.panelUsername}</code>} />}
                  {order.panelPassword && <InfoRow label="Password" value={<code className="font-mono text-sm">{order.panelPassword}</code>} />}
                  <InfoRow label="Server ID" value={order.panelServerId ? `#${order.panelServerId}` : '—'} />
                  <InfoRow label="UUID" value={order.panelServerUuid ? order.panelServerUuid : '—'} />
                  <InfoRow label="Dibuat" value={order.createdAt ? fmtDate(order.createdAt) : '—'} />
                  <InfoRow label="Uptime" value={st?.uptimeMs ? fmtUptime(st.uptimeMs) : '—'} />
                </CardContent>
              </Card>

              <Card className="rounded-xl border border-line">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield aria-hidden size={16} className="text-green-400" />
                    Status & Peringatan
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {expired ? (
                    <AlertTriangle className="text-orange-400" size={16} />
                  ) : null}
                  <div className="flex items-center gap-2 text-sm">
                    <span className={`w-2 h-2 rounded-full ${online ? 'bg-green-400' : 'bg-red-400'}`} />
                    <span className="text-content">{online ? 'Server Online' : 'Server Offline'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className={`w-2 h-2 rounded-full ${expired ? 'bg-red-400' : 'bg-green-400'}`} />
                    <span className="text-content">{expired ? 'Masa Aktif Habis' : 'Masa Aktif Normal'}</span>
                  </div>
                  {expired && (
                    <p className="text-xs text-content-muted">Server ini sudah kedaluwarsa. Perpanjang untuk mengaktifkan kembali.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="console" className="p-4">
          <ConsoleTab orderId={orderId} />
        </TabsContent>

        <TabsContent value="files" className="p-4">
          <FilesTab orderId={orderId} />
        </TabsContent>

        <TabsContent value="backups" className="p-4">
          <BackupsTab orderId={orderId} />
        </TabsContent>

        <TabsContent value="settings" className="p-4">
          <SettingsTab orderId={orderId} expired={expired} onRenew={renew} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-xs text-content-muted">{label}</span>
      <span className="font-mono text-sm text-content truncate text-right sm:text-left">{value}</span>
    </div>
  );
}

function ConsoleTab({ orderId }: { orderId: string }) {
  const [lines, setLines] = useState<string[]>([]);
  const [cmd, setCmd] = useState('');
  const [auto, setAuto] = useState(true);
  const box = useRef<HTMLPreElement>(null);

  const load = useCallback(async () => {
    try {
      const d = await api<{ lines: string[] }>(orderId, '?view=console');
      setLines(d.lines);
    } catch (e) {
      setAuto(false);
      toast.error(e instanceof Error ? e.message : 'Gagal memuat console.');
    }
  }, [orderId]);

  useEffect(() => {
    void load();
    if (!auto) return;
    const t = setInterval(() => void load(), 5000);
    return () => clearInterval(t);
  }, [load, auto]);

  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight });
  }, [lines]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cmd.trim()) return;
    try {
      await api(orderId, '', { action: 'command', command: cmd.trim() });
      setCmd('');
      setTimeout(() => void load(), 800);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal kirim command.');
    }
  };

  return (
    <div className="flex flex-col gap-2 h-[500px]">
      <pre
        ref={box}
        className="flex-1 overflow-auto rounded-lg bg-black/80 p-3 font-mono text-[11px] leading-relaxed text-green-300"
      >
        {lines.length ? lines.join('\n') : 'Belum ada output (server mati atau belum ada log).'}
      </pre>
      <form onSubmit={send} className="flex gap-2">
        <Input
          value={cmd}
          onChange={(e) => setCmd(e.target.value)}
          placeholder="Ketik command lalu Enter"
          maxLength={500}
          className="flex-1"
        />
        <Button type="submit" size="sm">Kirim</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setAuto((a) => !a)}>
          {auto ? 'Auto: on' : 'Auto: off'}
        </Button>
      </form>
    </div>
  );
}

function FilesTab({ orderId }: { orderId: string }) {
  const [dir, setDir] = useState('/');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [edit, setEdit] = useState<{ file: string; content: string } | null>(null);
  const join = (d: string, n: string) => (d === '/' ? `/${n}` : `${d}/${n}`);

  const load = useCallback(
    async (d: string) => {
      try {
        const r = await api<{ dir: string; files: FileItem[] }>(orderId, `?view=files&dir=${encodeURIComponent(d)}`);
        setFiles([...r.files].sort((a, b) => Number(a.isFile) - Number(b.isFile) || a.name.localeCompare(b.name)));
        setDir(r.dir);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Gagal memuat file.');
      }
    },
    [orderId]
  );

  useEffect(() => {
    void load('/');
  }, [load]);

  const act = async (body: unknown, ok: string) => {
    try {
      await api(orderId, '', body);
      toast.success(ok);
      void load(dir);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal.');
    }
  };

  const open = async (name: string) => {
    try {
      const r = await api<{ file: string; content: string }>(orderId, `?view=file&file=${encodeURIComponent(join(dir, name))}`);
      setEdit(r);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal membuka file.');
    }
  };

  const download = async (name: string) => {
    try {
      const r = await api<{ url: string }>(orderId, '', { action: 'download', file: join(dir, name) });
      window.open(r.url, '_blank', 'noopener');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal download.');
    }
  };

  const handleUploaded = () => void load(dir);

  if (edit) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs text-content-muted">{edit.file}</p>
          <Button size="sm" variant="ghost" onClick={() => setEdit(null)}>
            <X size={13} />
          </Button>
        </div>
        <Textarea value={edit.content} onChange={(e) => setEdit({ ...edit, content: e.target.value })} className="h-64 font-mono text-xs" />
        <div className="flex gap-2 justify-end">
          <Button size="sm" onClick={() => void act({ action: 'write', file: edit.file, content: edit.content }, 'File disimpan.')}>
            <Save size={13} /> Simpan
          </Button>
          <Button size="sm" variant="outline" onClick={() => setEdit(null)}>Tutup</Button>
        </div>
      </div>
    );
  }

  const parent = dir === '/' ? '/' : dir.replace(/\/[^/]+$/, '') || '/';

  return (
    <div className="flex flex-col gap-3 h-[500px]">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" disabled={dir === '/'} onClick={() => void load(parent)}>
            <ArrowUp size={13} />
          </Button>
          <code className="flex-1 rounded bg-content/5 px-2 py-1 text-xs truncate">{dir}</code>
          <Button size="sm" variant="outline" onClick={() => {
            const n = prompt('Nama folder baru:');
            if (n) void act({ action: 'mkdir', dir, name: n }, 'Folder dibuat.');
          }}>
            <FolderPlus size={13} /> Folder
          </Button>
        </div>
        <ZipUpload orderId={orderId} dir={dir} onUploaded={handleUploaded} />
      </div>

      <ul className="flex-1 overflow-auto rounded-lg border border-line divide-y divide-line">
        {files.length === 0 && (
          <li className="p-4 text-center text-xs text-content-faint">Folder kosong.</li>
        )}
        {files.map((f) => (
          <li key={f.name} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-content/3">
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-2 text-left hover:text-accent"
              onClick={() => (f.isFile ? void open(f.name) : void load(join(dir, f.name)))}
            >
              {f.isFile ? <FileIcon size={14} /> : <Folder size={14} />}
              <span className="truncate">{f.name}</span>
              {f.isFile && <span className="text-[10px] text-content-faint">({(f.size / 1024).toFixed(1)} KB)</span>}
            </button>
            {f.isFile && (
              <button type="button" aria-label="Download" className="text-content-faint hover:text-accent" onClick={() => void download(f.name)}>
                <Download size={14} />
              </button>
            )}
            <button
              type="button"
              aria-label="Hapus"
              className="text-content-faint hover:text-red-400"
              onClick={() => {
                if (confirm(`Hapus ${f.name}?`)) void act({ action: 'delete', dir, name: f.name }, 'Dihapus.');
              }}
            >
              <Trash2 size={14} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BackupsTab({ orderId }: { orderId: string }) {
  const [backups, setBackups] = useState<Array<{ id: string; name: string; createdAt: number; size: number; status: string }>>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await api<Array<{ id: string; name: string; createdAt: number; size: number; status: string }>>(orderId, '?view=backups');
      setBackups(r);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal memuat backup.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  const createBackup = async () => {
    try {
      await api(orderId, '', { action: 'create_backup' });
      toast.success('Backup dibuat.');
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal membuat backup.');
    }
  };

  const restoreBackup = async (id: string) => {
    if (!confirm('Restore backup ini? Data server saat ini akan ditimpa.')) return;
    try {
      await api(orderId, '', { action: 'restore_backup', backupId: id });
      toast.success('Backup direstore.');
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal restore backup.');
    }
  };

  const downloadBackup = async (id: string) => {
    try {
      const r = await api<{ url: string }>(orderId, '', { action: 'download_backup', backupId: id });
      window.open(r.url, '_blank', 'noopener');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal download backup.');
    }
  };

  const deleteBackup = async (id: string) => {
    if (!confirm('Hapus backup ini?')) return;
    try {
      await api(orderId, '', { action: 'delete_backup', backupId: id });
      toast.success('Backup dihapus.');
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal hapus backup.');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-content">Backup Server</h3>
        <Button size="sm" onClick={createBackup}>
          <Database aria-hidden size={13} className="mr-1" />
          Buat Backup
        </Button>
      </div>

      {backups.length === 0 ? (
        <EmptyState
          icon={Database}
          title="Belum ada backup"
          description="Buat backup pertama untuk melindungi data server Anda."
          action={
            <Button size="sm" onClick={createBackup}>
              <Database aria-hidden size={13} className="mr-1" />
              Buat Backup
            </Button>
          }
        />
      ) : (
        <div className="rounded-lg border border-line divide-y divide-line overflow-hidden">
          {backups.map((b) => (
            <div key={b.id} className="flex items-center justify-between px-4 py-3 hover:bg-content/3">
              <div className="flex items-center gap-3 min-w-0">
                <Database className="text-blue-400" size={20} />
                <div>
                  <p className="font-medium text-content truncate">{b.name}</p>
                  <p className="text-xs text-content-muted">
                    {fmtDate(b.createdAt)} · {(b.size / 1024 / 1024).toFixed(1)} MB · {b.status}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => void downloadBackup(b.id)}>
                  <Download size={13} />
                </Button>
                <Button size="sm" variant="outline" onClick={() => void restoreBackup(b.id)}>
                  <RotateCw size={13} /> Restore
                </Button>
                <Button size="sm" variant="ghost" className="text-red-400" onClick={() => void deleteBackup(b.id)}>
                  <Trash2 size={13} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsTab({ orderId, expired, onRenew }: { orderId: string; expired: boolean; onRenew: () => void }) {
  const [reinstalling, setReinstalling] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const reinstall = async () => {
    if (!confirm('REINSTALL akan menghapus SEMUA data server. Lanjutkan?')) return;
    setReinstalling(true);
    try {
      await api(orderId, '', { action: 'reinstall' });
      toast.success('Reinstall dimulai.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal reinstall.');
    } finally {
      setReinstalling(false);
    }
  };

  const changePassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      toast.error('Password minimal 8 karakter.');
      return;
    }
    setChangingPassword(true);
    try {
      await api(orderId, '', { action: 'change_password', password: newPassword });
      toast.success('Password panel diubah.');
      setNewPassword('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal ubah password.');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card className="rounded-xl border border-line">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield aria-hidden size={16} className="text-accent" />
            Pengaturan Server
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-xl border border-line p-4">
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-content">Auto-start</span>
              <span className="text-xs text-content-muted">Mulai otomatis saat panel restart</span>
            </div>
            <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-line accent-accent" />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl border border-line p-4">
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-content">Backup otomatis</span>
              <span className="text-xs text-content-muted">Backup harian jam 03:00 WIB</span>
            </div>
            <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-line accent-accent" />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border border-line border-red-200/50 bg-red-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-300">
            <AlertTriangle aria-hidden size={16} />
            Zona Bahaya
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-xl border border-red-300/50 p-4">
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-red-300">Reinstall Server</span>
              <span className="text-xs text-red-200">Hapus SEMUA data dan install ulang. TIDAK DAPAT DIBATALKAN.</span>
            </div>
            <Button size="sm" variant="danger" disabled={reinstalling} onClick={reinstall}>
              {reinstalling ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reinstall'}
            </Button>
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-line p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="font-medium text-content">Ubah Password Panel</span>
                <span className="text-xs text-content-muted">Password login ke panel Pterodactyl</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Password baru (min 8 karakter)"
                className="flex-1"
              />
              <Button size="sm" disabled={changingPassword || !newPassword || newPassword.length < 8} onClick={changePassword}>
                {changingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ubah'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {expired && (
        <Card className="rounded-xl border border-orange-200/50 bg-orange-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-300">
              <CalendarPlus aria-hidden size={16} />
              Perpanjang Server
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-orange-200 mb-3">Server ini sudah kedaluwarsa. Perpanjang untuk mengaktifkan kembali.</p>
            <Button size="sm" onClick={onRenew}>
              <CalendarPlus aria-hidden size={13} className="mr-1" />
              Perpanjang Sekarang
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}