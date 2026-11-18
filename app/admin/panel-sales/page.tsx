'use client';

import { useEffect, useState } from 'react';
import { Loader2, Save, Plus, Trash2, Server, Box, HardDrive, Cpu, Database, ExternalLink, ShieldCheck, GripVertical, ArrowUpDown, Eye, EyeOff, MemoryStick, Cpu as CpuIcon, HardDrive as DiskIcon, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { useSettings } from '@/components/settings-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from '@/lib/icon-map';
import type { PanelTier, PanelRamOption, PanelCpuOption, PanelDiskOption } from '@/lib/settings-defaults';

export default function PanelSalesPage() {
  const { settings } = useSettings();
  const [draft, setDraft] = useState<{
    panelTiers: PanelTier[];
    panelRamOptions: PanelRamOption[];
    panelCpuOptions: PanelCpuOption[];
    panelDiskOptions: PanelDiskOption[];
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'tiers' | 'ram' | 'cpu' | 'disk'>('tiers');
  const [expandedTier, setExpandedTier] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setDraft({
        panelTiers: settings.panelTiers || [],
        panelRamOptions: settings.panelRamOptions || [],
        panelCpuOptions: settings.panelCpuOptions || [],
        panelDiskOptions: settings.panelDiskOptions || [],
      });
    }
  }, [settings]);

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          panelTiers: draft.panelTiers,
          panelRamOptions: draft.panelRamOptions,
          panelCpuOptions: draft.panelCpuOptions,
          panelDiskOptions: draft.panelDiskOptions,
        }),
      });
      if (!res.ok) throw new Error('Gagal menyimpan ke server');
      toast.success('Pengaturan panel tersimpan.');
    } catch (err) {
      toast.error('Gagal menyimpan: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  // ===== TIER MANAGEMENT =====
  const addTier = () => {
    if (!draft) return;
    const newTier: PanelTier = {
      id: `tier-${Date.now()}`,
      key: '',
      name: '',
      description: '',
      icon: 'Server',
      active: true,
      sortOrder: (draft.panelTiers?.length ?? 0) + 1,
      pterodactyl: {
        panelId: '',
        baseUrl: 'https://',
        apiKey: '',
      },
    };
    setDraft({ ...draft, panelTiers: [...(draft.panelTiers || []), newTier] });
  };

  const removeTier = (index: number) => {
    if (!draft) return;
    const tiers = [...draft.panelTiers];
    const removedTierId = tiers[index].id;
    tiers.splice(index, 1);
    // Also remove associated options
    const newRam = draft.panelRamOptions.filter((r) => r.tierId !== removedTierId);
    const newCpu = draft.panelCpuOptions.filter((c) => c.tierId !== removedTierId);
    const newDisk = draft.panelDiskOptions.filter((d) => d.tierId !== removedTierId);
    setDraft({ ...draft, panelTiers: tiers, panelRamOptions: newRam, panelCpuOptions: newCpu, panelDiskOptions: newDisk });
  };

  const updateTier = (index: number, updated: Partial<PanelTier>) => {
    if (!draft) return;
    const tiers = [...draft.panelTiers];
    tiers[index] = { ...tiers[index], ...updated };
    setDraft({ ...draft, panelTiers: tiers });
  };

  // ===== RAM OPTION MANAGEMENT =====
  const addRamOption = (tierId: string) => {
    if (!draft) return;
    const tierRamCount = draft.panelRamOptions.filter((r) => r.tierId === tierId).length;
    const newRam: PanelRamOption = {
      id: `ram-${Date.now()}`,
      tierId,
      name: '',
      memoryMb: 1024,
      price: 0,
      durationDays: 30,
      maxPurchasePerUser: 0,
      active: true,
      sortOrder: tierRamCount + 1,
      isCustom: false,
    };
    setDraft({ ...draft, panelRamOptions: [...(draft.panelRamOptions || []), newRam] });
  };

  const removeRamOption = (index: number) => {
    if (!draft) return;
    const ram = [...draft.panelRamOptions];
    ram.splice(index, 1);
    setDraft({ ...draft, panelRamOptions: ram });
  };

  const updateRamOption = (index: number, updated: Partial<PanelRamOption>) => {
    if (!draft) return;
    const ram = [...draft.panelRamOptions];
    ram[index] = { ...ram[index], ...updated };
    setDraft({ ...draft, panelRamOptions: ram });
  };

  // ===== CPU OPTION MANAGEMENT =====
  const addCpuOption = (tierId: string) => {
    if (!draft) return;
    const tierCpuCount = draft.panelCpuOptions.filter((c) => c.tierId === tierId).length;
    const newCpu: PanelCpuOption = {
      id: `cpu-${Date.now()}`,
      tierId,
      name: '',
      cpuPercent: 500,
      priceModifier: 0,
      active: true,
      sortOrder: tierCpuCount + 1,
    };
    setDraft({ ...draft, panelCpuOptions: [...(draft.panelCpuOptions || []), newCpu] });
  };

  const removeCpuOption = (index: number) => {
    if (!draft) return;
    const cpu = [...draft.panelCpuOptions];
    cpu.splice(index, 1);
    setDraft({ ...draft, panelCpuOptions: cpu });
  };

  const updateCpuOption = (index: number, updated: Partial<PanelCpuOption>) => {
    if (!draft) return;
    const cpu = [...draft.panelCpuOptions];
    cpu[index] = { ...cpu[index], ...updated };
    setDraft({ ...draft, panelCpuOptions: cpu });
  };

  // ===== DISK OPTION MANAGEMENT =====
  const addDiskOption = (tierId: string) => {
    if (!draft) return;
    const tierDiskCount = draft.panelDiskOptions.filter((d) => d.tierId === tierId).length;
    const newDisk: PanelDiskOption = {
      id: `disk-${Date.now()}`,
      tierId,
      name: '',
      diskMb: 10240,
      priceModifier: 0,
      active: true,
      sortOrder: tierDiskCount + 1,
      isCustom: false,
    };
    setDraft({ ...draft, panelDiskOptions: [...(draft.panelDiskOptions || []), newDisk] });
  };

  const removeDiskOption = (index: number) => {
    if (!draft) return;
    const disk = [...draft.panelDiskOptions];
    disk.splice(index, 1);
    setDraft({ ...draft, panelDiskOptions: disk });
  };

  const updateDiskOption = (index: number, updated: Partial<PanelDiskOption>) => {
    if (!draft) return;
    const disk = [...draft.panelDiskOptions];
    disk[index] = { ...disk[index], ...updated };
    setDraft({ ...draft, panelDiskOptions: disk });
  };

  // Helper functions
  const getRamOptionsForTier = (tierId: string) => draft?.panelRamOptions.filter((r) => r.tierId === tierId).sort((a, b) => a.sortOrder - b.sortOrder) || [];
  const getCpuOptionsForTier = (tierId: string) => draft?.panelCpuOptions.filter((c) => c.tierId === tierId).sort((a, b) => a.sortOrder - b.sortOrder) || [];
  const getDiskOptionsForTier = (tierId: string) => draft?.panelDiskOptions.filter((d) => d.tierId === tierId).sort((a, b) => a.sortOrder - b.sortOrder) || [];

  const formatRam = (mb: number) => mb === 0 ? 'Custom' : `${mb / 1024}GB`;
  const formatDisk = (mb: number) => mb === 0 ? 'Custom' : `${mb / 1024}GB`;
  const formatCpu = (pct: number) => pct === 0 ? 'Unlimited' : `${pct}%`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-content flex items-center gap-2">
            <Server className="text-accent" size={24} />
            Kelola Panel Sales (Tier System)
          </h1>
          <p className="text-sm text-content-muted">
            Tier = Panel Pterodactyl berbeda (API/Location). Setiap Tier punya opsi RAM, CPU, Disk sendiri.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="w-fit">
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'tiers' | 'ram' | 'cpu' | 'disk')} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tiers"><Server className="mr-2 h-4 w-4" />Panel Tier</TabsTrigger>
          <TabsTrigger value="ram"><MemoryStick className="mr-2 h-4 w-4" />RAM Options</TabsTrigger>
          <TabsTrigger value="cpu"><CpuIcon className="mr-2 h-4 w-4" />CPU Options</TabsTrigger>
          <TabsTrigger value="disk"><DiskIcon className="mr-2 h-4 w-4" />Disk Options</TabsTrigger>
        </TabsList>

        {/* TIERS TAB */}
        <TabsContent value="tiers" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Daftar Panel Tier
                <Button variant="outline" size="sm" onClick={addTier}>
                  <Plus className="mr-2 h-4 w-4" />
                  Tambah Tier
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {draft?.panelTiers?.length === 0 ? (
                <div className="text-center py-12">
                  <Server className="mx-auto mb-4 h-12 w-12 text-content-muted/30" />
                  <h3 className="text-lg font-semibold text-content">Belum ada Panel Tier</h3>
                  <p className="mt-2 text-sm text-content-muted">Tambah Tier pertama (misal: Panel Indonesia 1, Panel Singapore, dll).</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {draft?.panelTiers?.map((tier, index) => (
                    <TierCard
                      key={tier.id}
                      tier={tier}
                      index={index}
                      onUpdate={updateTier}
                      onRemove={removeTier}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* RAM OPTIONS TAB */}
        <TabsContent value="ram" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                RAM Options per Tier
                <div className="flex gap-2">
                  {draft?.panelTiers?.map((tier) => (
                    <Button key={tier.id} variant="outline" size="sm" onClick={() => addRamOption(tier.id)}>
                      <Plus className="mr-1 h-3 w-3" />
                      RAM untuk {tier.name}
                    </Button>
                  ))}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {draft?.panelTiers?.map((tier) => {
                const ramOptions = getRamOptionsForTier(tier.id);
                return (
                  <div key={tier.id} className="mb-8">
                    <h3 className="mb-4 text-lg font-medium text-content flex items-center gap-2">
                      <MemoryStick className="text-accent" size={20} />
                      RAM Options: {tier.name}
                      <span className="text-sm text-content-muted">({ramOptions.length} opsi)</span>
                    </h3>
                    {ramOptions.length === 0 ? (
                      <p className="text-sm text-content-muted ml-4">Belum ada opsi RAM. Klik tombol di atas untuk tambah.</p>
                    ) : (
                      <div className="space-y-3 ml-4">
                        {ramOptions.map((ram, index) => (
                          <RamOptionCard
                            key={ram.id}
                            ram={ram}
                            index={index}
                            onUpdate={updateRamOption}
                            onRemove={removeRamOption}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {draft?.panelRamOptions?.length === 0 && (
                <div className="text-center py-12">
                  <MemoryStick className="mx-auto mb-4 h-12 w-12 text-content-muted/30" />
                  <h3 className="text-lg font-semibold text-content">Belum ada RAM Option</h3>
                  <p className="mt-2 text-sm text-content-muted">Pilih Tier di atas lalu tambah RAM Option.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CPU OPTIONS TAB */}
        <TabsContent value="cpu" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                CPU Options per Tier
                <div className="flex gap-2">
                  {draft?.panelTiers?.map((tier) => (
                    <Button key={tier.id} variant="outline" size="sm" onClick={() => addCpuOption(tier.id)}>
                      <Plus className="mr-1 h-3 w-3" />
                      CPU untuk {tier.name}
                    </Button>
                  ))}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {draft?.panelTiers?.map((tier) => {
                const cpuOptions = getCpuOptionsForTier(tier.id);
                return (
                  <div key={tier.id} className="mb-8">
                    <h3 className="mb-4 text-lg font-medium text-content flex items-center gap-2">
                      <CpuIcon className="text-accent" size={20} />
                      CPU Options: {tier.name}
                      <span className="text-sm text-content-muted">({cpuOptions.length} opsi)</span>
                    </h3>
                    {cpuOptions.length === 0 ? (
                      <p className="text-sm text-content-muted ml-4">Belum ada opsi CPU. Klik tombol di atas untuk tambah.</p>
                    ) : (
                      <div className="space-y-3 ml-4">
                        {cpuOptions.map((cpu, index) => (
                          <CpuOptionCard
                            key={cpu.id}
                            cpu={cpu}
                            index={index}
                            onUpdate={updateCpuOption}
                            onRemove={removeCpuOption}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {draft?.panelCpuOptions?.length === 0 && (
                <div className="text-center py-12">
                  <CpuIcon className="mx-auto mb-4 h-12 w-12 text-content-muted/30" />
                  <h3 className="text-lg font-semibold text-content">Belum ada CPU Option</h3>
                  <p className="mt-2 text-sm text-content-muted">Pilih Tier di atas lalu tambah CPU Option.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* DISK OPTIONS TAB */}
        <TabsContent value="disk" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Disk Options per Tier
                <div className="flex gap-2">
                  {draft?.panelTiers?.map((tier) => (
                    <Button key={tier.id} variant="outline" size="sm" onClick={() => addDiskOption(tier.id)}>
                      <Plus className="mr-1 h-3 w-3" />
                      Disk untuk {tier.name}
                    </Button>
                  ))}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {draft?.panelTiers?.map((tier) => {
                const diskOptions = getDiskOptionsForTier(tier.id);
                return (
                  <div key={tier.id} className="mb-8">
                    <h3 className="mb-4 text-lg font-medium text-content flex items-center gap-2">
                      <DiskIcon className="text-accent" size={20} />
                      Disk Options: {tier.name}
                      <span className="text-sm text-content-muted">({diskOptions.length} opsi)</span>
                    </h3>
                    {diskOptions.length === 0 ? (
                      <p className="text-sm text-content-muted ml-4">Belum ada opsi Disk. Klik tombol di atas untuk tambah.</p>
                    ) : (
                      <div className="space-y-3 ml-4">
                        {diskOptions.map((disk, index) => (
                          <DiskOptionCard
                            key={disk.id}
                            disk={disk}
                            index={index}
                            onUpdate={updateDiskOption}
                            onRemove={removeDiskOption}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {draft?.panelDiskOptions?.length === 0 && (
                <div className="text-center py-12">
                  <DiskIcon className="mx-auto mb-4 h-12 w-12 text-content-muted/30" />
                  <h3 className="text-lg font-semibold text-content">Belum ada Disk Option</h3>
                  <p className="mt-2 text-sm text-content-muted">Pilih Tier di atas lalu tambah Disk Option.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TierCard({ tier, index, onUpdate, onRemove }: {
  tier: PanelTier;
  index: number;
  onUpdate: (index: number, updated: Partial<PanelTier>) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="rounded-xl border border-line p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <GripVertical className="text-content-muted/50 h-5 w-5 cursor-grab" />
          <div className="h-10 w-10 rounded-lg flex items-center justify-center border border-line bg-content/5">
            <LucideIcon name={tier.icon} size={20} className="text-accent" />
          </div>
          <div>
            <p className="text-sm font-medium text-content">Tier #{index + 1}</p>
            <p className="text-xs text-content-faint">Key: <code>{tier.key}</code> · ID: <code>{tier.id}</code></p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={tier.active}
            onCheckedChange={(checked) => onUpdate(index, { active: checked })}
          />
          <span className="text-xs text-content-muted">{tier.active ? 'Aktif' : 'Nonaktif'}</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(index)} className="text-red-500 hover:text-red-400">
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`tier-${index}-id`}>ID</Label>
          <Input
            id={`tier-${index}-id`}
            value={tier.id}
            onChange={(e) => onUpdate(index, { id: e.target.value })}
            maxLength={60}
            placeholder="tier-panel-1"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`tier-${index}-key`}>Key (Unik, untuk routing)</Label>
          <Input
            id={`tier-${index}-key`}
            value={tier.key}
            onChange={(e) => onUpdate(index, { key: e.target.value })}
            maxLength={60}
            placeholder="panel-1"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`tier-${index}-name`}>Nama Tier</Label>
          <Input
            id={`tier-${index}-name`}
            value={tier.name}
            onChange={(e) => onUpdate(index, { name: e.target.value })}
            maxLength={100}
            placeholder="Panel Indonesia 1"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`tier-${index}-icon`}>Icon (Lucide)</Label>
          <Input
            id={`tier-${index}-icon`}
            value={tier.icon}
            onChange={(e) => onUpdate(index, { icon: e.target.value })}
            maxLength={50}
            placeholder="Server"
          />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor={`tier-${index}-desc`}>Deskripsi</Label>
          <Textarea
            id={`tier-${index}-desc`}
            value={tier.description}
            onChange={(e) => onUpdate(index, { description: e.target.value })}
            maxLength={500}
            rows={2}
            placeholder="Deskripsi untuk ditampilkan ke pengguna"
          />
        </div>
        
        {/* Pterodactyl Config */}
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor={`tier-${index}-pterodactyl-panelId`}>Panel ID Pterodactyl</Label>
          <Input
            id={`tier-${index}-pterodactyl-panelId`}
            value={tier.pterodactyl?.panelId || ''}
            onChange={(e) => onUpdate(index, { pterodactyl: { ...tier.pterodactyl, panelId: e.target.value } })}
            maxLength={60}
            placeholder="ID panel di Pterodactyl (opsional)"
          />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor={`tier-${index}-pterodactyl-baseUrl`}>Base URL Pterodactyl *</Label>
          <Input
            id={`tier-${index}-pterodactyl-baseUrl`}
            value={tier.pterodactyl?.baseUrl || ''}
            onChange={(e) => onUpdate(index, { pterodactyl: { ...tier.pterodactyl, baseUrl: e.target.value } })}
            maxLength={200}
            placeholder="https://panel.example.com"
          />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor={`tier-${index}-pterodactyl-apiKey`}>API Key Pterodactyl *</Label>
          <Input
            id={`tier-${index}-pterodactyl-apiKey`}
            type="password"
            value={tier.pterodactyl?.apiKey || ''}
            onChange={(e) => onUpdate(index, { pterodactyl: { ...tier.pterodactyl, apiKey: e.target.value } })}
            maxLength={200}
            placeholder="ptla_xxxxxxxxxxxxxxxxxxxxxxxx"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4 pt-4 border-t border-line/60">
        <div className="flex items-center gap-2">
          <Label htmlFor={`tier-${index}-sort`}>Urutan</Label>
          <Input
            id={`tier-${index}-sort`}
            type="number"
            inputMode="numeric"
            value={String(tier.sortOrder)}
            onChange={(e) => onUpdate(index, { sortOrder: Number(e.target.value) || 0 })}
            min={0}
            max={9999}
            className="w-24"
          />
        </div>
      </div>
    </div>
  );
}

function RamOptionCard({ ram, index, onUpdate, onRemove }: {
  ram: PanelRamOption;
  index: number;
  onUpdate: (index: number, updated: Partial<PanelRamOption>) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="rounded-xl border border-line p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <GripVertical className="text-content-muted/50 h-5 w-5 cursor-grab" />
          <div className="h-8 w-8 rounded-lg flex items-center justify-center border border-line bg-content/5">
            <MemoryStick className="text-accent" size={16} />
          </div>
          <div>
            <p className="text-sm font-medium text-content">RAM #{index + 1}</p>
            <p className="text-xs text-content-faint">ID: {ram.id} · {ram.memoryMb === 0 ? 'Custom' : `${ram.memoryMb / 1024}GB`}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={ram.active}
            onCheckedChange={(checked) => onUpdate(index, { active: checked })}
          />
          <span className="text-xs text-content-muted">{ram.active ? 'Aktif' : 'Nonaktif'}</span>
          {ram.isCustom && <span className="text-xs text-amber-500 px-1.5 py-0.5 rounded bg-amber-500/10">Custom</span>}
          <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(index)} className="text-red-500 hover:text-red-400">
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`ram-${index}-id`}>ID</Label>
          <Input id={`ram-${index}-id`} value={ram.id} onChange={(e) => onUpdate(index, { id: e.target.value })} maxLength={60} placeholder="ram-1gb-1" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`ram-${index}-name`}>Nama</Label>
          <Input id={`ram-${index}-name`} value={ram.name} onChange={(e) => onUpdate(index, { name: e.target.value })} maxLength={100} placeholder="1GB, 2GB, Custom" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`ram-${index}-memory`}>RAM (MB)</Label>
          <Input id={`ram-${index}-memory`} type="number" inputMode="numeric" value={String(ram.memoryMb)} onChange={(e) => onUpdate(index, { memoryMb: Number(e.target.value) || 0 })} min={0} max={10485760} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`ram-${index}-customMax`}>Max Custom (MB)</Label>
          <Input id={`ram-${index}-customMax`} type="number" inputMode="numeric" value={String(ram.customMaxMb || 10240)} onChange={(e) => onUpdate(index, { customMaxMb: Number(e.target.value) || 10240 })} min={1024} max={10485760} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`ram-${index}-price`}>Harga (Rp/bulan)</Label>
          <Input id={`ram-${index}-price`} type="number" inputMode="numeric" value={String(ram.price)} onChange={(e) => onUpdate(index, { price: Number(e.target.value) || 0 })} min={0} max={1000000000} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`ram-${index}-duration`}>Durasi (hari)</Label>
          <Input id={`ram-${index}-duration`} type="number" inputMode="numeric" value={String(ram.durationDays)} onChange={(e) => onUpdate(index, { durationDays: Number(e.target.value) || 30 })} min={1} max={3650} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`ram-${index}-custom`}>Opsi Custom?</Label>
          <div className="flex items-center gap-2">
            <Input type="checkbox" id={`ram-${index}-custom-check`} checked={ram.isCustom} onChange={(e) => onUpdate(index, { isCustom: e.target.checked })} className="h-4 w-4" />
            <Label htmlFor={`ram-${index}-custom-check`} className="cursor-pointer">Ya, ini opsi custom (user input manual RAM)</Label>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`ram-${index}-maxPurchase`}>Maks Beli per User</Label>
          <Input id={`ram-${index}-maxPurchase`} type="number" inputMode="numeric" value={String(ram.maxPurchasePerUser)} onChange={(e) => onUpdate(index, { maxPurchasePerUser: Number(e.target.value) || 0 })} min={0} max={100} />
          <p className="text-xs text-content-faint">0 = unlimited</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-4 pt-3 border-t border-line/60">
        <div className="flex items-center gap-2">
          <Label htmlFor={`ram-${index}-sort`}>Urutan</Label>
          <Input id={`ram-${index}-sort`} type="number" inputMode="numeric" value={String(ram.sortOrder)} onChange={(e) => onUpdate(index, { sortOrder: Number(e.target.value) || 0 })} min={0} max={9999} className="w-24" />
        </div>
      </div>
    </div>
  );
}

function CpuOptionCard({ cpu, index, onUpdate, onRemove }: {
  cpu: PanelCpuOption;
  index: number;
  onUpdate: (index: number, updated: Partial<PanelCpuOption>) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="rounded-xl border border-line p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <GripVertical className="text-content-muted/50 h-5 w-5 cursor-grab" />
          <div className="h-8 w-8 rounded-lg flex items-center justify-center border border-line bg-content/5">
            <CpuIcon className="text-accent" size={16} />
          </div>
          <div>
            <p className="text-sm font-medium text-content">CPU #{index + 1}</p>
            <p className="text-xs text-content-faint">ID: {cpu.id} · {cpu.cpuPercent === 0 ? 'Unlimited' : `${cpu.cpuPercent}%`}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={cpu.active} onCheckedChange={(checked) => onUpdate(index, { active: checked })} />
          <span className="text-xs text-content-muted">{cpu.active ? 'Aktif' : 'Nonaktif'}</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(index)} className="text-red-500 hover:text-red-400">
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`cpu-${index}-id`}>ID</Label>
          <Input id={`cpu-${index}-id`} value={cpu.id} onChange={(e) => onUpdate(index, { id: e.target.value })} maxLength={60} placeholder="cpu-500-1" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`cpu-${index}-name`}>Nama</Label>
          <Input id={`cpu-${index}-name`} value={cpu.name} onChange={(e) => onUpdate(index, { name: e.target.value })} maxLength={100} placeholder="500%, Unlimited" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`cpu-${index}-cpuPercent`}>CPU (%)</Label>
          <Input id={`cpu-${index}-cpuPercent`} type="number" inputMode="numeric" value={String(cpu.cpuPercent)} onChange={(e) => onUpdate(index, { cpuPercent: Number(e.target.value) || 0 })} min={0} max={100000} />
          <p className="text-xs text-content-faint">0 = Unlimited</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`cpu-${index}-priceModifier`}>Tambahan Harga (Rp/bulan)</Label>
          <Input id={`cpu-${index}-priceModifier`} type="number" inputMode="numeric" value={String(cpu.priceModifier)} onChange={(e) => onUpdate(index, { priceModifier: Number(e.target.value) || 0 })} min={0} max={1000000000} />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-4 pt-3 border-t border-line/60">
        <div className="flex items-center gap-2">
          <Label htmlFor={`cpu-${index}-sort`}>Urutan</Label>
          <Input id={`cpu-${index}-sort`} type="number" inputMode="numeric" value={String(cpu.sortOrder)} onChange={(e) => onUpdate(index, { sortOrder: Number(e.target.value) || 0 })} min={0} max={9999} className="w-24" />
        </div>
      </div>
    </div>
  );
}

function DiskOptionCard({ disk, index, onUpdate, onRemove }: {
  disk: PanelDiskOption;
  index: number;
  onUpdate: (index: number, updated: Partial<PanelDiskOption>) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="rounded-xl border border-line p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <GripVertical className="text-content-muted/50 h-5 w-5 cursor-grab" />
          <div className="h-8 w-8 rounded-lg flex items-center justify-center border border-line bg-content/5">
            <DiskIcon className="text-accent" size={16} />
          </div>
          <div>
            <p className="text-sm font-medium text-content">Disk #{index + 1}</p>
            <p className="text-xs text-content-faint">ID: {disk.id} · {disk.diskMb === 0 ? 'Custom' : `${disk.diskMb / 1024}GB`}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={disk.active} onCheckedChange={(checked) => onUpdate(index, { active: checked })} />
          <span className="text-xs text-content-muted">{disk.active ? 'Aktif' : 'Nonaktif'}</span>
          {disk.isCustom && <span className="text-xs text-amber-500 px-1.5 py-0.5 rounded bg-amber-500/10">Custom</span>}
          <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(index)} className="text-red-500 hover:text-red-400">
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`disk-${index}-id`}>ID</Label>
          <Input id={`disk-${index}-id`} value={disk.id} onChange={(e) => onUpdate(index, { id: e.target.value })} maxLength={60} placeholder="disk-10gb-1" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`disk-${index}-name`}>Nama</Label>
          <Input id={`disk-${index}-name`} value={disk.name} onChange={(e) => onUpdate(index, { name: e.target.value })} maxLength={100} placeholder="10GB, 20GB, Custom" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`disk-${index}-disk`}>Disk (MB)</Label>
          <Input id={`disk-${index}-disk`} type="number" inputMode="numeric" value={String(disk.diskMb)} onChange={(e) => onUpdate(index, { diskMb: Number(e.target.value) || 0 })} min={0} max={104857600} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`disk-${index}-customMax`}>Max Custom (MB)</Label>
          <Input id={`disk-${index}-customMax`} type="number" inputMode="numeric" value={String(disk.customMaxMb || 102400)} onChange={(e) => onUpdate(index, { customMaxMb: Number(e.target.value) || 102400 })} min={1024} max={104857600} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`disk-${index}-priceModifier`}>Tambahan Harga (Rp/bulan)</Label>
          <Input id={`disk-${index}-priceModifier`} type="number" inputMode="numeric" value={String(disk.priceModifier)} onChange={(e) => onUpdate(index, { priceModifier: Number(e.target.value) || 0 })} min={0} max={1000000000} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`disk-${index}-custom`}>Opsi Custom?</Label>
          <div className="flex items-center gap-2">
            <Input type="checkbox" id={`disk-${index}-custom-check`} checked={disk.isCustom} onChange={(e) => onUpdate(index, { isCustom: e.target.checked })} className="h-4 w-4" />
            <Label htmlFor={`disk-${index}-custom-check`} className="cursor-pointer">Ya, ini opsi custom (user input manual Disk)</Label>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-4 pt-3 border-t border-line/60">
        <div className="flex items-center gap-2">
          <Label htmlFor={`disk-${index}-sort`}>Urutan</Label>
          <Input id={`disk-${index}-sort`} type="number" inputMode="numeric" value={String(disk.sortOrder)} onChange={(e) => onUpdate(index, { sortOrder: Number(e.target.value) || 0 })} min={0} max={9999} className="w-24" />
        </div>
      </div>
    </div>
  );
}