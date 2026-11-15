'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Loader2,
  Plus,
  Server,
  Trash2,
  Zap,
  List,
  PauseCircle,
  PlayCircle,
  RotateCw,
  Trash,
  Key,
  Users,
  Settings,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { FadeIn } from '@/components/anim';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type AdminPanel = {
  id: string;
  name: string;
  baseUrl: string;
  active: boolean;
  hasKey: boolean;
  hasCapiKey?: boolean;
  createdAt: number;
};

type FormState = { name: string; baseUrl: string; apiKey: string; capiKey: string; active: boolean };

type ServerInfo = {
  id: number;
  uuid: string;
  name: string;
  node: number;
  state: string;
  limits: { memory: number; disk: number; cpu: number };
  user: number;
};

const EMPTY_FORM: FormState = { name: '', baseUrl: '', apiKey: '', capiKey: '', active: true };

async function readError(res: Response): Promise<string> {
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  return data?.error ?? `Permintaan gagal (${res.status}).`;
}

export function PanelsClient() {
  const [panels, setPanels] = useState<AdminPanel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminPanel | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  // Server management
  const [serverDialogOpen, setServerDialogOpen] = useState(false);
  const [selectedPanel, setSelectedPanel] = useState<AdminPanel | null>(null);
  const [servers, setServers] = useState<ServerInfo[]>([]);
  const [serversLoading, setServersLoading] = useState(false);
  const [serversError, setServersError] = useState<string | null>(null);
  const [serverActionBusy, setServerActionBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/panels', { cache: 'no-store' });
      if (!res.ok) throw new Error(await readError(res));
      const data = (await res.json()) as { panels?: AdminPanel[] };
      setPanels(data.panels ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat panel.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (panel: AdminPanel) => {
    setEditing(panel);
    setForm({ name: panel.name, baseUrl: panel.baseUrl, apiKey: '', capiKey: '', active: panel.active });
    setDialogOpen(true);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return toast.error('Nama panel wajib diisi.');
    if (!/^https?:\/\/\S+/i.test(form.baseUrl.trim())) return toast.error('URL panel tidak valid.');
    if (!editing && !form.apiKey.trim()) return toast.error('API key wajib diisi.');

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        baseUrl: form.baseUrl.trim(),
        active: form.active,
      };
      if (form.apiKey.trim()) payload.apiKey = form.apiKey.trim();
      if (form.capiKey.trim()) payload.capiKey = form.capiKey.trim();

      const res = editing
        ? await fetch(`/api/admin/panels/${editing.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/admin/panels', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
      if (!res.ok) throw new Error(await readError(res));
      toast.success(editing ? 'Panel diperbarui.' : 'Panel ditambahkan.');
      setDialogOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan panel.');
    } finally {
      setSaving(false);
    }
  };

  const test = async (panel: AdminPanel) => {
    setTestingId(panel.id);
    try {
      const res = await fetch('/api/admin/panels/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: panel.id }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; users?: number; error?: string }
        | null;
      if (data?.ok) {
        toast.success(`Koneksi OK — Application API terjangkau (${data.users} pengguna panel).`);
      } else {
        toast.error(data?.error ?? 'Koneksi gagal.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Uji koneksi gagal.');
    } finally {
      setTestingId(null);
    }
  };

  const remove = async (panel: AdminPanel) => {
    if (
      !window.confirm(
        `Hapus panel "${panel.name}"? Produk yang memakai panel ini kehilangan konfigurasi provisioning.`
      )
    )
      return;
    try {
      const res = await fetch(`/api/admin/panels/${panel.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await readError(res));
      toast.success('Panel dihapus.');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus panel.');
    }
  };

  // Server management
  const openServers = async (panel: AdminPanel) => {
    setSelectedPanel(panel);
    setServerDialogOpen(true);
    await loadServers(panel.id);
  };

  const loadServers = async (panelId: string) => {
    setServersLoading(true);
    setServersError(null);
    try {
      const res = await fetch(`/api/admin/panels/${panelId}/servers?action=list&perPage=100`, { cache: 'no-store' });
      if (!res.ok) throw new Error(await readError(res));
      const data = (await res.json()) as { servers?: ServerInfo[] };
      setServers(data.servers ?? []);
    } catch (err) {
      setServersError(err instanceof Error ? err.message : 'Gagal memuat server.');
    } finally {
      setServersLoading(false);
    }
  };

  const serverAction = async (serverId: number, action: 'suspend' | 'unsuspend' | 'delete' | 'reinstall') => {
    if (!selectedPanel) return;
    if (action === 'delete' && !window.confirm('Hapus server PERMANEN? Tindakan ini tidak bisa dibatalkan.')) return;
    if (action === 'reinstall' && !window.confirm('Reinstall server? SEMUA DATA AKAN HILANG.')) return;

    setServerActionBusy(serverId);
    try {
      const res = await fetch(`/api/admin/panels/${selectedPanel.id}/servers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, serverId }),
      });
      if (!res.ok) throw new Error(await readError(res));
      toast.success(`Server berhasil ${action === 'suspend' ? 'disuspend' : action === 'unsuspend' ? 'diaktifkan' : action === 'delete' ? 'dihapus' : 'reinstall dimulai'}.`);
      await loadServers(selectedPanel.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menjalankan aksi.');
    } finally {
      setServerActionBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-11 w-40" />
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={Server}
        title="Gagal memuat panel"
        description={error}
        action={
          <Button variant="outline" onClick={() => void load()}>
            Coba lagi
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-content-muted">
          Daftarkan satu atau banyak panel Pterodactyl (Application API). API key disimpan
          terenkripsi dan tidak pernah ditampilkan kembali.
        </p>
        <Button type="button" onClick={openCreate}>
          <Plus aria-hidden size={16} />
          Tambah Panel
        </Button>
      </div>

      {panels.length === 0 ? (
        <EmptyState
          icon={Server}
          title="Belum ada panel"
          description="Tambahkan URL panel dan Application API key (ptla_…) untuk mengaktifkan checkout produk panel."
          action={
            <Button type="button" onClick={openCreate}>
              <Plus aria-hidden size={16} />
              Tambah Panel
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {panels.map((panel, index) => (
            <FadeIn key={panel.id} delay={index * 0.05}>
              <div className="glass flex h-full flex-col gap-3 rounded-2xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 font-medium text-content">
                      <Server aria-hidden size={15} className="shrink-0 text-accent" />
                      <span className="truncate">{panel.name}</span>
                    </p>
                    <p className="truncate font-mono text-xs text-content-faint">{panel.baseUrl}</p>
                  </div>
                  <Badge variant={panel.active ? 'success' : 'danger'}>
                    {panel.active ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={panel.hasKey ? 'default' : 'warning'}>
                    {panel.hasKey ? 'App API key tersimpan' : 'App API key belum diatur'}
                  </Badge>
                  {panel.hasCapiKey ? (
                    <Badge variant="default">
                      <Key aria-hidden size={11} className="mr-1" />
                      Client API key tersimpan
                    </Badge>
                  ) : (
                    <Badge variant="warning">
                      <Key aria-hidden size={11} className="mr-1" />
                      Client API key belum diatur
                    </Badge>
                  )}
                </div>

                <div className="mt-auto flex flex-wrap justify-end gap-2 border-t border-line/50 pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={testingId === panel.id}
                    onClick={() => void test(panel)}
                  >
                    {testingId === panel.id ? (
                      <Loader2 aria-hidden size={14} className="animate-spin" />
                    ) : (
                      <Zap aria-hidden size={14} />
                    )}
                    Uji koneksi
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void openServers(panel)}
                    disabled={!panel.hasKey || serversLoading}
                  >
                    <List aria-hidden size={14} className="mr-1" />
                    Kelola Server
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(panel)}>
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void remove(panel)}
                    className="text-red-400"
                  >
                    <Trash2 aria-hidden size={14} />
                  </Button>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      )}

      {/* Panel CRUD Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Panel' : 'Tambah Panel'}</DialogTitle>
            <DialogDescription>
              Application API key dibuat di panel: Admin → Application API (awalan ptla_).
              {editing ? ' Kosongkan API key jika tidak diganti.' : ''}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="panel-name">Nama panel</Label>
              <Input
                id="panel-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="contoh: Panel Utama"
                maxLength={60}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="panel-url">URL panel</Label>
              <Input
                id="panel-url"
                value={form.baseUrl}
                onChange={(e) => setForm((f) => ({ ...f, baseUrl: e.target.value }))}
                placeholder="https://panel.contoh.com"
                maxLength={200}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="panel-key">API key{editing ? ' (baru — opsional)' : ''}</Label>
              <Input
                id="panel-key"
                type="password"
                value={form.apiKey}
                onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
                placeholder={editing ? 'Biarkan kosong untuk mempertahankan' : 'ptla_…'}
                maxLength={300}
                autoComplete="off"
                required={!editing}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="panel-capikey">Client API key (ptlc_…){editing ? ' — opsional' : ''}</Label>
              <Input
                id="panel-capikey"
                type="password"
                value={form.capiKey}
                onChange={(e) => setForm((f) => ({ ...f, capiKey: e.target.value }))}
                placeholder="Dari akun admin: Account → API Credentials"
                maxLength={300}
                autoComplete="off"
              />
              <p className="text-xs text-content-faint">
                Dipakai pelanggan untuk start/stop, console & file. Harus dari akun root admin.
              </p>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3">
              <div>
                <Label htmlFor="panel-active">Panel aktif</Label>
                <p className="text-xs text-content-faint">Dapat dipakai untuk checkout produk.</p>
              </div>
              <Switch
                id="panel-active"
                checked={form.active}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, active: checked }))}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 aria-hidden size={16} className="animate-spin" /> : null}
                Simpan
              </Button>
            </DialogFooter          </form>
        </DialogContent>
      </Dialog>

      {/* Server Management Dialog */}
      <Dialog open={serverDialogOpen} onOpenChange={setServerDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Server aria-hidden size={18} className="text-accent" />
              Kelola Server — {selectedPanel?.name}
            </DialogTitle>
            <DialogDescription>
              Daftar server di panel ini. Gunakan Application API key untuk aksi suspend/hapus/reinstall.
            </DialogDescription>
          </DialogHeader>

          {serversLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : serversError ? (
            <EmptyState
              icon={Server}
              title="Gagal memuat server"
              description={serversError}
              action={<Button variant="outline" size="sm" onClick={() => selectedPanel && loadServers(selectedPanel.id)}>Coba lagi</Button>}
            />
          ) : servers.length === 0 ? (
            <EmptyState
              icon={Server}
              title="Tidak ada server"
              description="Panel ini belum memiliki server, atau Application API key tidak memiliki akses."
            />
          ) : (
            <div className="flex flex-col gap-4 max-h-[60vh] overflow-auto">
              <div className="rounded-lg border border-line divide-y divide-line overflow-hidden">
                {servers.map((server) => (
                  <div key={server.id} className="flex items-center justify-between px-4 py-3 hover:bg-content/3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                        <Server aria-hidden size={16} />
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-content truncate">{server.name}</p>
                        <p className="flex items-center gap-2 text-xs text-content-muted">
                          <span className="font-mono">ID: {server.id}</span>
                          <span>·</span>
                          <span>Node: {server.node}</span>
                          <span>·</span>
                          <Badge variant={server.state === 'running' ? 'success' : server.state === 'offline' ? 'danger' : 'default'}>
                            {server.state}
                          </Badge>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {server.state === 'running' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={serverActionBusy === server.id}
                          onClick={() => void serverAction(server.id, 'suspend')}
                        >
                          <PauseCircle aria-hidden size={13} className="mr-1" />
                          Suspend
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={serverActionBusy === server.id}
                          onClick={() => void serverAction(server.id, 'unsuspend')}
                        >
                          <PlayCircle aria-hidden size={13} className="mr-1" />
                          Aktifkan
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={serverActionBusy === server.id}
                        onClick={() => void serverAction(server.id, 'reinstall')}
                      >
                        <RotateCw aria-hidden size={13} className="mr-1" />
                        Reinstall
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-400"
                        disabled={serverActionBusy === server.id}
                        onClick={() => void serverAction(server.id, 'delete')}
                      >
                        <Trash aria-hidden size={13} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setServerDialogOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}