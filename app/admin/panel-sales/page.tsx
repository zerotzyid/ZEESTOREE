'use client';

import { useEffect, useState } from 'react';
import { Loader2, Save, Plus, Trash2, Server, Box, MemoryStick, Cpu, HardDrive, ExternalLink, ShieldCheck, GripVertical, ArrowUpDown, Eye, EyeOff } from 'lucide-react';
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
import type { PanelSalesTier } from '@/lib/settings-defaults';

export default function PanelSalesPage() {
  const { settings } = useSettings();
  const [draft, setDraft] = useState<{
    tiers: PanelSalesTier[];
    ramOptions: number[];
    cpuOptions: number[];
    diskOptions: number[];
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'tiers' | 'options'>('tiers');
  const [panels, setPanels] = useState<Array<{id: string; name: string; baseUrl: string}>>([]);

  useEffect(() => {
    if (settings) {
      setDraft({
        tiers: settings.panelSales?.tiers || [],
        ramOptions: settings.panelSales?.ramOptions || [1024, 2048, 3072, 4096, 5120, 6144, 7168, 8192, 9216, 10240],
        cpuOptions: settings.panelSales?.cpuOptions || [50, 100, 150, 200, 250, 300, 400, 500],
        diskOptions: settings.panelSales?.diskOptions || [10240, 20480, 30720, 40960, 51200, 61440, 71680, 81920, 92160, 102400],
      });
    }
    // Fetch existing panels from the existing panel system
    fetch('/api/admin/panels', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (data.panels) {
          setPanels(data.panels.filter((p: any) => p.active && p.hasKey).map((p: any) => ({
            id: p.id,
            name: p.name,
            baseUrl: p.baseUrl
          })));
        }
      })
      .catch(() => {});
  }, [settings]);

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          panelSales: {
            tiers: draft.tiers,
            ramOptions: draft.ramOptions,
            cpuOptions: draft.cpuOptions,
            diskOptions: draft.diskOptions,
          },
        }),
      });
      if (!res.ok) throw new Error('Gagal menyimpan ke server');
      toast.success('Pengaturan panel sales tersimpan.');
    } catch (err) {
      toast.error('Gagal menyimpan: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const addTier = () => {
    if (!draft) return;
    const newTier = {
      id: `tier-${Date.now()}`,
      panelId: '',
      name: '',
      description: '',
      active: true,
      sortOrder: (draft.tiers?.length ?? 0) + 1,
      priceMultiplier: 1.0,
      maxPurchasePerUser: 0,
    };
    setDraft({ ...draft, tiers: [...(draft.tiers || []), newTier] });
  };

  const removeTier = (index: number) => {
    if (!draft) return;
    const tiers = [...draft.tiers];
    tiers.splice(index, 1);
    setDraft({ ...draft, tiers });
  };

  const updateTier = (index: number, updated: Partial<PanelSalesTier>) => {
    if (!draft) return;
    const tiers = [...draft.tiers];
    tiers[index] = { ...tiers[index], ...updated };
    setDraft({ ...draft, tiers });
  };

  const addOption = (type: 'ramOptions' | 'cpuOptions' | 'diskOptions') => {
    if (!draft) return;
    const current = draft[type] || [];
    const newVal = type === 'ramOptions' ? 1024 : (type === 'cpuOptions' ? 50 : 10240);
    const updated = [...current, newVal].sort((a, b) => a - b);
    setDraft({ ...draft, [type]: updated });
  };

  const removeOption = (type: 'ramOptions' | 'cpuOptions' | 'diskOptions', index: number) => {
    if (!draft) return;
    const current = [...(draft[type] || [])];
    current.splice(index, 1);
    setDraft({ ...draft, [type]: current });
  };

  const updateOption = (type: 'ramOptions' | 'cpuOptions' | 'diskOptions', index: number, value: number) => {
    if (!draft) return;
    const current = [...(draft[type] || [])];
    current[index] = value;
    current.sort((a, b) => a - b);
    setDraft({ ...draft, [type]: current });
  };

  const formatRam = (mb: number) => `${mb / 1024}GB`;
  const formatCpu = (pct: number) => pct === 0 ? 'Unlimited' : `${pct}%`;
  const formatDisk = (mb: number) => `${mb / 1024}GB`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-content flex items-center gap-2">
            <Server className="text-accent" size={24} />
            Panel Sales Settings
          </h1>
          <p className="text-sm text-content-muted">
            Kelola panel yang dijual dan opsi spesifikasi (RAM, CPU, Disk) global.
            Data panel diambil dari sistem Multi Panel existing.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="w-fit">
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'tiers' | 'options')} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tiers"><Server className="mr-2 h-4 w-4" />Panel Tiers</TabsTrigger>
          <TabsTrigger value="options"><Box className="mr-2 h-4 w-4" />Opsi Spesifikasi</TabsTrigger>
        </TabsList>

        {/* TIERS TAB */}
        <TabsContent value="tiers" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Daftar Panel Tier (Dari Multi Panel Existing)
                <Button variant="outline" size="sm" onClick={addTier}>
                  <Plus className="mr-2 h-4 w-4" />
                  Tambah Tier
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {draft?.tiers?.length === 0 ? (
                <div className="text-center py-12">
                  <Server className="mx-auto mb-4 h-12 w-12 text-content-muted/30" />
                  <h3 className="text-lg font-semibold text-content">Belum ada Panel Tier</h3>
                  <p className="mt-2 text-sm text-content-muted">Tambah Tier pertama. Tier mereferensikan panel dari Multi Panel existing.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {draft?.tiers?.map((tier, index) => (
                    <TierCard
                      key={tier.id}
                      tier={tier}
                      index={index}
                      panels={panels}
                      onUpdate={updateTier}
                      onRemove={removeTier}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* OPTIONS TAB */}
        <TabsContent value="options" className="mt-6">
          <div className="space-y-8">
            {/* RAM Options */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <MemoryStick className="mr-2 h-5 w-5 text-blue-400" />
                  RAM Options (Global - MB)
                  <Button variant="outline" size="sm" onClick={() => addOption('ramOptions')}>
                    <Plus className="mr-1 h-3 w-3" />
                    Tambah
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {draft?.ramOptions?.length === 0 ? (
                  <p className="text-sm text-content-muted">Belum ada opsi RAM. Klik tombol di atas untuk tambah.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {draft?.ramOptions?.map((ram, index) => (
                      <OptionCard
                        key={ram}
                        value={ram}
                        index={index}
                        format={formatRam}
                        unit="MB"
                        onUpdate={(v) => updateOption('ramOptions', index, v)}
                        onRemove={() => removeOption('ramOptions', index)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* CPU Options */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <Cpu className="mr-2 h-5 w-5 text-orange-400" />
                  CPU Options (Global - %)
                  <Button variant="outline" size="sm" onClick={() => addOption('cpuOptions')}>
                    <Plus className="mr-1 h-3 w-3" />
                    Tambah
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {draft?.cpuOptions?.length === 0 ? (
                  <p className="text-sm text-content-muted">Belum ada opsi CPU. Klik tombol di atas untuk tambah.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {draft?.cpuOptions?.map((cpu, index) => (
                      <OptionCard
                        key={cpu}
                        value={cpu}
                        index={index}
                        format={formatCpu}
                        unit="%"
                        onUpdate={(v) => updateOption('cpuOptions', index, v)}
                        onRemove={() => removeOption('cpuOptions', index)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Disk Options */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <HardDrive className="mr-2 h-5 w-5 text-green-400" />
                  Disk Options (Global - MB)
                  <Button variant="outline" size="sm" onClick={() => addOption('diskOptions')}>
                    <Plus className="mr-1 h-3 w-3" />
                    Tambah
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {draft?.diskOptions?.length === 0 ? (
                  <p className="text-sm text-content-muted">Belum ada opsi Disk. Klik tombol di atas untuk tambah.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {draft?.diskOptions?.map((disk, index) => (
                      <OptionCard
                        key={disk}
                        value={disk}
                        index={index}
                        format={formatDisk}
                        unit="MB"
                        onUpdate={(v) => updateOption('diskOptions', index, v)}
                        onRemove={() => removeOption('diskOptions', index)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TierCard({ tier, index, panels, onUpdate, onRemove }: {
  tier: any;
  index: number;
  panels: Array<{id: string; name: string; baseUrl: string}>;
  onUpdate: (index: number, updated: Partial<any>) => void;
  onRemove: (index: number) => void;
}) {
  const selectedPanel = panels.find(p => p.id === tier.panelId);
  return (
    <div className="rounded-xl border border-line p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <GripVertical className="text-content-muted/50 h-5 w-5 cursor-grab" />
          <div className="h-10 w-10 rounded-lg flex items-center justify-center border border-line bg-content/5">
            <Server className="text-accent" size={20} />
          </div>
          <div>
            <p className="text-sm font-medium text-content">Tier #{index + 1}</p>
            <p className="text-xs text-content-faint">ID: <code>{tier.id}</code></p>
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
            placeholder="tier-1"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`tier-${index}-panelId`}>Panel (Dari Multi Panel Existing)</Label>
          <select
            id={`tier-${index}-panelId`}
            value={tier.panelId || ''}
            onChange={(e) => onUpdate(index, { panelId: e.target.value })}
            className="min-h-[44px] rounded-xl border border-line bg-transparent px-4 py-3 text-sm text-content focus:border-accent focus:outline-none appearance-none bg-white/5"
          >
            <option value="">Pilih Panel dari Multi Panel Existing</option>
            {panels.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.baseUrl})</option>
            ))}
          </select>
          {panels.length === 0 && (
            <p className="text-xs text-amber-400 mt-1">Belum ada panel aktif. Tambah di <a href="/admin/panels" className="underline text-accent">Admin Panel</a>.</p>
          )}
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
          <Label htmlFor={`tier-${index}-priceMultiplier`}>Price Multiplier</Label>
          <Input
            id={`tier-${index}-priceMultiplier`}
            type="number"
            step="0.1"
            min="0.1"
            max="10"
            value={String(tier.priceMultiplier)}
            onChange={(e) => onUpdate(index, { priceMultiplier: Number(e.target.value) || 1.0 })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`tier-${index}-maxPurchase`}>Maks Beli per User</Label>
          <Input
            id={`tier-${index}-maxPurchase`}
            type="number"
            inputMode="numeric"
            value={String(tier.maxPurchasePerUser)}
            onChange={(e) => onUpdate(index, { maxPurchasePerUser: Number(e.target.value) || 0 })}
            min={0}
            max={100}
          />
          <p className="text-xs text-content-faint">0 = unlimited</p>
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

function OptionCard({ value, index, format, unit, onUpdate, onRemove }: {
  value: number;
  index: number;
  format: (v: number) => string;
  unit: string;
  onUpdate: (v: number) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="relative flex items-center gap-2 p-3 rounded-xl border border-line bg-content/5">
      <div className="flex items-center gap-2">
        <GripVertical className="text-content-muted/50 h-5 w-5 cursor-grab" />
        <span className="font-medium text-content">{format(value)}</span>
      </div>
      <Input
        type="number"
        inputMode="numeric"
        value={String(value)}
        onChange={(e) => onUpdate(Number(e.target.value) || 0)}
        min={1}
        max={1048576}
        step={1}
        className="w-24"
      />
      <span className="text-xs text-content-muted">{unit}</span>
      <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(value)} className="text-red-500 hover:text-red-400">
        <Trash2 size={14} />
      </Button>
    </div>
  );
}

function formatRam(value: number) {
  if (value >= 1024) return `${value / 1024}GB`;
  return `${value}MB`;
}

function formatCpu(value: number) {
  return value === 0 ? 'Unlimited' : `${value}%`;
}

function formatDisk(value: number) {
  if (value >= 1024) return `${value / 1024}GB`;
  return `${value}MB`;
}