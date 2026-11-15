'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  ChevronDown,
  Copy,
  Download,
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
  Wifi,
  WifiOff,
  Zap,
  X,
  CalendarPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

type State = { state: string; cpu: number; memoryBytes: number; diskBytes: number; uptimeMs: number } | null;
type FileItem = { name: string; isFile: boolean; size: number };
type Tab = 'kontrol' | 'console' | 'file';

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
const fmtDate = (t: number) => new Date(t).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
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
      <span
        className={`absolute inset-0 rounded-full ${
          online ? 'bg-green-400 shadow-[0_0_8px_#22c55e]' : 'bg-gray-500'
        }`}
      />
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

      // Simulasi progress (karena fetch tidak native progress)
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
        <Input
          type="file"
          accept=".zip"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="flex-1"
        />
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
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      <p className="text-[10px] text-content-faint">Maks 50MB. Akan diekstrak otomatis ke folder saat ini.</p>
    </form>
  );
}

export function PanelManager({ orderId, initialExpiresAt }: { orderId: string; initialExpiresAt?: number | null }) {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<Tab>('kontrol');
  const [st, setSt] = useState<State>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(initialExpiresAt ?? null);
  const [expired, setExpired] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
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
    void refresh();
    const t = setInterval(() => void refresh(), 10_000);
    return () => clearInterval(t);
  }, [refresh]);

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
    if (!confirm('Perpanjang panel? Saldo akan terpotong sesuai harga produk.')) return;
    void run(() => api(orderId, '', { action: 'renew' }), 'Panel diperpanjang.');
  };

  const online = st?.state === 'running';
  const cpuPct = st?.cpu ?? 0;
  const ramMB = st ? Math.round(st.memoryBytes / 1048576) : 0;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line overflow-hidden">
      {/* Outer Card - Collapsed View */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between gap-4 p-4 hover:bg-content/5 transition-colors text-left"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <Server size={18} />
          </span>
          <div className="min-w-0">
            <p className="font-medium text-content truncate">Panel Server</p>
            <p className="flex items-center gap-1.5 text-xs text-content-muted">
              <StatusDot online={online} />
              <span>{online ? 'Online' : 'Offline'}</span>
              {st?.state && (
                <>
                  <span className="text-line">•</span>
                  <span className="capitalize">{st.state}</span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {/* CPU */}
          <div className="flex items-center gap-1.5 text-xs">
            <Zap size={12} className="text-yellow-400" />
            <span className="font-mono text-content">{cpuPct.toFixed(1)}%</span>
            <span className="text-content-faint">CPU</span>
          </div>
          {/* RAM */}
          <div className="flex items-center gap-1.5 text-xs">
            <HardDrive size={12} className="text-blue-400" />
            <span className="font-mono text-content">{ramMB} MB</span>
            <span className="text-content-faint">RAM</span>
          </div>
          {/* Expand indicator */}
          <ChevronDown
            size={18}
            className={`text-content-faint transition-transform ${expanded ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="animate-in slide-in-from-top-2 duration-200 border-t border-line">
          <div className="flex flex-wrap items-center gap-2 p-3 bg-content/3 border-b border-line">
            {(['kontrol', 'console', 'file'] as Tab[]).map((k) => (
              <Button
                key={k}
                size="sm"
                variant={tab === k ? 'default' : 'outline'}
                onClick={() => setTab(k)}
                className="gap-1"
              >
                {k === 'kontrol' && <Play size={12} />}
                {k === 'console' && <Wifi size={12} />}
                {k === 'file' && <Folder size={12} />}
                {k.charAt(0).toUpperCase() + k.slice(1)}
              </Button>
            ))}
            <span className="ml-auto text-xs text-content-faint">
              {expiresAt ? `${expired ? 'Kedaluwarsa' : 'Aktif sampai'} ${fmtDate(expiresAt)}` : 'Tanpa masa aktif'}
            </span>
          </div>

          <div className="p-3">
            {tab === 'kontrol' && <ControlTab st={st} busy={busy} onPower={power} onRenew={renew} />}
            {tab === 'console' && <ConsoleTab orderId={orderId} />}
            {tab === 'file' && <FilesTab orderId={orderId} />}
          </div>
        </div>
      )}
    </div>
  );
}

function ControlTab({
  st,
  busy,
  onPower,
  onRenew,
}: {
  st: State;
  busy: boolean;
  onPower: (signal: 'start' | 'stop' | 'restart' | 'kill') => void;
  onRenew: () => void;
}) {
  const online = st?.state === 'running';

  return (
    <div className="flex flex-col gap-4">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<Wifi size={14} />} label="Status" value={st?.state ?? '—'} online={online} />
        <StatCard icon={<Zap size={14} />} label="CPU" value={st ? `${st.cpu.toFixed(1)}%` : '—'} />
        <StatCard icon={<HardDrive size={14} />} label="RAM" value={st ? `${Math.round(st.memoryBytes / 1048576)} MB` : '—'} />
        <StatCard icon={<Server size={14} />} label="Disk" value={st ? `${Math.round(st.diskBytes / 1048576)} MB` : '—'} />
      </div>

      {/* Power Controls */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={busy || online} onClick={() => onPower('start')}>
          <Play size={13} /> Start
        </Button>
        <Button size="sm" variant="outline" disabled={busy || !online} onClick={() => onPower('restart')}>
          <RotateCw size={13} /> Restart
        </Button>
        <Button size="sm" variant="outline" disabled={busy || !online} onClick={() => onPower('stop')}>
          <Square size={13} /> Stop
        </Button>
        <Button size="sm" variant="outline" disabled={busy || !online} onClick={() => onPower('kill')}>
          <Skull size={13} /> Kill
        </Button>
        <Button size="sm" variant="ghost" onClick={onRenew}>
          <CalendarPlus size={13} /> Perpanjang
        </Button>
      </div>

      {st?.uptimeMs && (
        <p className="text-xs text-content-faint">Uptime: {fmtUptime(st.uptimeMs)}</p>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, online }: { icon: React.ReactNode; label: string; value: string; online?: boolean }) {
  return (
    <div className="rounded-xl border border-line p-3 text-center">
      <div className="flex items-center justify-center gap-1.5 mb-1">{icon}</div>
      <p className="text-[10px] text-content-faint uppercase tracking-wide">{label}</p>
      <p className="font-mono text-sm text-content font-semibold">
        {value}
        {online !== undefined && <StatusDot online={online} />}
      </p>
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
    <div className="flex flex-col gap-2 h-80">
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
    <div className="flex flex-col gap-3 h-[calc(100vh-320px)] min-h-[300px] max-h-[500px]">
      {/* Path bar + ZIP Upload */}
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

        {/* ZIP Upload Section */}
        <ZipUpload orderId={orderId} dir={dir} onUploaded={handleUploaded} />
      </div>

      {/* File List */}
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