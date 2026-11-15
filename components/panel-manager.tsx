'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, File as FileIcon, Folder, Play, RotateCw, Skull, Square, Trash2, FolderPlus, ArrowUp, Save, CalendarPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

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

export function PanelManager({ orderId, initialExpiresAt }: { orderId: string; initialExpiresAt?: number | null }) {
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
      toast.error(e instanceof Error ? e.message : 'Gagal memuat status.');
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

  const tabs: Array<[Tab, string]> = [['kontrol', 'Kontrol'], ['console', 'Console'], ['file', 'File']];

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line p-3">
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map(([k, label]) => (
          <Button key={k} size="sm" variant={tab === k ? 'default' : 'outline'} onClick={() => setTab(k)}>
            {label}
          </Button>
        ))}
        <span className="ml-auto text-xs text-content-faint">
          {expiresAt ? `${expired ? 'Kedaluwarsa' : 'Aktif sampai'} ${fmtDate(expiresAt)}` : 'Tanpa masa aktif'}
        </span>
      </div>

      {tab === 'kontrol' && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2 text-xs text-content-muted sm:grid-cols-4">
            <span>Status: <b className="text-content">{st?.state ?? '—'}</b></span>
            <span>CPU: <b className="text-content">{st ? `${st.cpu.toFixed(1)}%` : '—'}</b></span>
            <span>RAM: <b className="text-content">{st ? mb(st.memoryBytes) : '—'}</b></span>
            <span>Disk: <b className="text-content">{st ? mb(st.diskBytes) : '—'}</b></span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={busy} onClick={() => void power('start')}><Play size={13} />Start</Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void power('restart')}><RotateCw size={13} />Restart</Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void power('stop')}><Square size={13} />Stop</Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void power('kill')}><Skull size={13} />Kill</Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={renew}><CalendarPlus size={13} />Perpanjang</Button>
          </div>
        </div>
      )}

      {tab === 'console' && <ConsoleTab orderId={orderId} />}
      {tab === 'file' && <FilesTab orderId={orderId} />}
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
    <div className="flex flex-col gap-2">
      <pre ref={box} className="h-64 overflow-auto rounded-lg bg-black/80 p-3 font-mono text-[11px] leading-relaxed text-green-300">
        {lines.length ? lines.join('\n') : 'Belum ada output (server mati atau belum ada log).'}
      </pre>
      <form onSubmit={send} className="flex gap-2">
        <Input value={cmd} onChange={(e) => setCmd(e.target.value)} placeholder="Ketik command lalu Enter" maxLength={500} />
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

  if (edit) {
    return (
      <div className="flex flex-col gap-2">
        <p className="font-mono text-xs text-content-muted">{edit.file}</p>
        <Textarea value={edit.content} onChange={(e) => setEdit({ ...edit, content: e.target.value })} className="h-64 font-mono text-xs" />
        <div className="flex gap-2">
          <Button size="sm" onClick={() => void act({ action: 'write', file: edit.file, content: edit.content }, 'File disimpan.')}>
            <Save size={13} />Simpan
          </Button>
          <Button size="sm" variant="outline" onClick={() => setEdit(null)}>Tutup</Button>
        </div>
      </div>
    );
  }

  const parent = dir === '/' ? '/' : dir.replace(/\/[^/]+$/, '') || '/';

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" disabled={dir === '/'} onClick={() => void load(parent)}><ArrowUp size={13} /></Button>
        <code className="rounded bg-content/5 px-2 py-1 text-xs">{dir}</code>
        <Button
          size="sm"
          variant="outline"
          className="ml-auto"
          onClick={() => {
            const n = prompt('Nama folder baru:');
            if (n) void act({ action: 'mkdir', dir, name: n }, 'Folder dibuat.');
          }}
        >
          <FolderPlus size={13} />Folder
        </Button>
      </div>
      <ul className="flex max-h-72 flex-col divide-y divide-line overflow-auto rounded-lg border border-line">
        {files.length === 0 && <li className="p-3 text-xs text-content-faint">Folder kosong.</li>}
        {files.map((f) => (
          <li key={f.name} className="flex items-center gap-2 px-3 py-2 text-sm">
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-2 text-left hover:text-accent"
              onClick={() => (f.isFile ? void open(f.name) : void load(join(dir, f.name)))}
            >
              {f.isFile ? <FileIcon size={14} /> : <Folder size={14} />}
              <span className="truncate">{f.name}</span>
            </button>
            {f.isFile && (
              <button type="button" aria-label="Download" onClick={() => void download(f.name)}><Download size={14} /></button>
            )}
            <button
              type="button"
              aria-label="Hapus"
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
