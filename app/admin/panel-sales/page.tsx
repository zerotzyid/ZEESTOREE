'use client';

import { useEffect, useState } from 'react';
import { Loader2, Save, Plus, Trash2, Server, Box, HardDrive, Cpu, Database, ExternalLink, ShieldCheck, GripVertical, ArrowUpDown, Eye, EyeOff } from 'lucide-react';
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
import type { PanelCategory, PanelRamTier } from '@/lib/settings-defaults';

export default function PanelSalesPage() {
  const { settings } = useSettings();
  const [draft, setDraft] = useState<{
    panelCategories: PanelCategory[];
    panelRamTiers: PanelRamTier[];
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'categories' | 'tiers'>('categories');
  const [expandedTier, setExpandedTier] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setDraft({
        panelCategories: settings.panelCategories || [],
        panelRamTiers: settings.panelRamTiers || [],
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
          panelCategories: draft.panelCategories,
          panelRamTiers: draft.panelRamTiers,
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

  const addCategory = () => {
    if (!draft) return;
    const newCat: PanelCategory = {
      id: `cat-${Date.now()}`,
      key: '',
      name: '',
      description: '',
      icon: 'Server',
      active: true,
      sortOrder: (draft.panelCategories?.length ?? 0) + 1,
      pterodactylPanelId: '',
    };
    setDraft({ ...draft, panelCategories: [...(draft.panelCategories || []), newCat] });
  };

  const removeCategory = (index: number) => {
    if (!draft) return;
    const cats = [...draft.panelCategories];
    cats.splice(index, 1);
    setDraft({ ...draft, panelCategories: cats });
  };

  const updateCategory = (index: number, updated: Partial<PanelCategory>) => {
    if (!draft) return;
    const cats = [...draft.panelCategories];
    cats[index] = { ...cats[index], ...updated };
    setDraft({ ...draft, panelCategories: cats });
  };

  const addTier = () => {
    if (!draft) return;
    const firstCat = draft.panelCategories?.[0]?.id || 'cat-pterodactyl';
    const newTier: PanelRamTier = {
      id: `tier-${Date.now()}`,
      categoryId: firstCat,
      name: '',
      description: '',
      price: 0,
      durationDays: 30,
      sortOrder: (draft.panelRamTiers?.length ?? 0) + 1,
      active: true,
      maxPurchasePerUser: 0,
      provision: {
        memoryMb: 1024,
        swapMb: 128,
        diskMb: 2048,
        cpuPercent: 50,
        ioWeight: 500,
        dockerImage: null,
        startup: null,
        environment: {},
        allocationMode: 'auto',
        allocationId: null,
        databases: 1,
        allocations: 1,
        backups: 1,
      },
    };
    setDraft({ ...draft, panelRamTiers: [...(draft.panelRamTiers || []), newTier] });
  };

  const removeTier = (index: number) => {
    if (!draft) return;
    const tiers = [...draft.panelRamTiers];
    tiers.splice(index, 1);
    setDraft({ ...draft, panelRamTiers: tiers });
  };

  const updateTier = (index: number, updated: Partial<PanelRamTier>) => {
    if (!draft) return;
    const tiers = [...draft.panelRamTiers];
    tiers[index] = { ...tiers[index], ...updated };
    setDraft({ ...draft, panelRamTiers: tiers });
  };

  const toggleTierExpand = (id: string) => {
    setExpandedTier((prev) => (prev === id ? null : id));
  };

  const categoryOptions = draft?.panelCategories?.map((c) => (
    <option key={c.id} value={c.id} className="bg-surface-raised text-content">
      {c.name} ({c.key})
    </option>
  ));

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-content flex items-center gap-2">
            <Server className="text-accent" size={24} />
            Kelola Panel Sales
          </h1>
          <p className="text-sm text-content-muted">
            Kelola kategori panel, tier RAM, dan spesifikasi provisioning untuk sistem pembelian panel Pterodactyl.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="w-fit">
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'categories' | 'tiers')} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="categories">
            <Server className="mr-2 h-4 w-4" />
            Kategori Panel
          </TabsTrigger>
          <TabsTrigger value="tiers">
            <HardDrive className="mr-2 h-4 w-4" />
            Tier RAM
          </TabsTrigger>
        </TabsList>

        {/* KATEGORI PANEL */}
        <TabsContent value="categories" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Daftar Kategori Panel
                <Button variant="outline" size="sm" onClick={addCategory}>
                  <Plus className="mr-2 h-4 w-4" />
                  Tambah Kategori
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {draft?.panelCategories?.length === 0 ? (
                <div className="text-center py-12">
                  <Server className="mx-auto mb-4 h-12 w-12 text-content-muted/30" />
                  <h3 className="text-lg font-semibold text-content">Belum ada kategori panel</h3>
                  <p className="mt-2 text-sm text-content-muted">Tambah kategori pertama (contoh: Panel Pterodactyl, Panel Custom).</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {draft?.panelCategories?.map((cat, index) => (
                    <CategoryCard
                      key={cat.id}
                      cat={cat}
                      index={index}
                      onUpdate={updateCategory}
                      onRemove={removeCategory}
                      onToggleExpand={() => {}}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TIER RAM */}
        <TabsContent value="tiers" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Daftar Tier RAM
                <Button variant="outline" size="sm" onClick={addTier}>
                  <Plus className="mr-2 h-4 w-4" />
                  Tambah Tier
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {draft?.panelRamTiers?.length === 0 ? (
                <div className="text-center py-12">
                  <HardDrive className="mx-auto mb-4 h-12 w-12 text-content-muted/30" />
                  <h3 className="text-lg font-semibold text-content">Belum ada tier RAM</h3>
                  <p className="mt-2 text-sm text-content-muted">Tambah tier pertama (contoh: Lite 1GB, Standard 2GB, Elite 4GB).</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {draft?.panelRamTiers?.map((tier, index) => (
                    <TierCard
                      key={tier.id}
                      tier={tier}
                      index={index}
                      categories={draft?.panelCategories || []}
                      onUpdate={updateTier}
                      onRemove={removeTier}
                      expanded={expandedTier === tier.id}
                      onToggleExpand={toggleTierExpand}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CategoryCard({ cat, index, onUpdate, onRemove, onToggleExpand }: {
  cat: PanelCategory;
  index: number;
  onUpdate: (index: number, updated: Partial<PanelCategory>) => void;
  onRemove: (index: number) => void;
  onToggleExpand: () => void;
}) {
  return (
    <div className="rounded-xl border border-line p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <GripVertical className="text-content-muted/50 h-5 w-5 cursor-grab" />
          <div className="h-10 w-10 rounded-lg flex items-center justify-center border border-line bg-content/5">
            <LucideIcon name={cat.icon} size={20} className="text-accent" />
          </div>
          <div>
            <p className="text-sm font-medium text-content">Kategori #{index + 1}</p>
            <p className="text-xs text-content-faint">Key: <code>{cat.key}</code> · ID: <code>{cat.id}</code></p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={cat.active}
            onCheckedChange={(checked) => onUpdate(index, { active: checked })}
          />
          <span className="text-xs text-content-muted">{cat.active ? 'Aktif' : 'Nonaktif'}</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(index)} className="text-red-500 hover:text-red-400">
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`cat-${index}-id`}>ID</Label>
          <Input
            id={`cat-${index}-id`}
            value={cat.id}
            onChange={(e) => onUpdate(index, { id: e.target.value })}
            maxLength={60}
            placeholder="cat-pterodactyl"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`cat-${index}-key`}>Key (Unik, untuk routing)</Label>
          <Input
            id={`cat-${index}-key`}
            value={cat.key}
            onChange={(e) => onUpdate(index, { key: e.target.value })}
            maxLength={60}
            placeholder="pterodactyl"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`cat-${index}-name`}>Nama Tampilan</Label>
          <Input
            id={`cat-${index}-name`}
            value={cat.name}
            onChange={(e) => onUpdate(index, { name: e.target.value })}
            maxLength={100}
            placeholder="Panel Pterodactyl"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`cat-${index}-icon`}>Icon (Lucide)</Label>
          <Input
            id={`cat-${index}-icon`}
            value={cat.icon}
            onChange={(e) => onUpdate(index, { icon: e.target.value })}
            maxLength={50}
            placeholder="Server, Box, Cpu, Database"
          />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor={`cat-${index}-desc`}>Deskripsi</Label>
          <Textarea
            id={`cat-${index}-desc`}
            value={cat.description}
            onChange={(e) => onUpdate(index, { description: e.target.value })}
            maxLength={500}
            rows={2}
            placeholder="Deskripsi untuk ditampilkan ke pengguna"
          />
        </div>
        {cat.key === 'pterodactyl' && (
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor={`cat-${index}-pterodactylPanelId`}>Panel Pterodactyl Tujuan (ID)</Label>
            <Input
              id={`cat-${index}-pterodactylPanelId`}
              value={cat.pterodactylPanelId || ''}
              onChange={(e) => onUpdate(index, { pterodactylPanelId: e.target.value })}
              maxLength={60}
              placeholder="ID panel di Pterodactyl (opsional)"
            />
            <p className="text-xs text-content-faint">Gunakan panel ini untuk provisioning server otomatis.</p>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-4 pt-4 border-t border-line/60">
        <div className="flex items-center gap-2">
          <Label htmlFor={`cat-${index}-sort`}>Urutan</Label>
          <Input
            id={`cat-${index}-sort`}
            type="number"
            inputMode="numeric"
            value={String(cat.sortOrder)}
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

function TierCard({ tier, index, categories, onUpdate, onRemove, expanded, onToggleExpand }: {
  tier: PanelRamTier;
  index: number;
  categories: PanelCategory[];
  onUpdate: (index: number, updated: Partial<PanelRamTier>) => void;
  onRemove: (index: number) => void;
  expanded: boolean;
  onToggleExpand: (id: string) => void;
}) {
  const parentCategory = categories.find((c) => c.id === tier.categoryId);

  return (
    <div className="rounded-xl border border-line overflow-hidden">
      <button
        type="button"
        onClick={() => onToggleExpand(tier.id)}
        className="w-full flex items-center justify-between p-4 hover:bg-content/3 transition-colors"
      >
        <div className="flex items-center gap-3">
          <ArrowUpDown className="text-content-muted/50 h-5 w-5 cursor-grab" />
          <div className="h-10 w-10 rounded-lg flex items-center justify-center border border-line bg-content/5">
            <HardDrive className="text-accent" size={20} />
          </div>
          <div>
            <p className="text-sm font-medium text-content">Tier #{index + 1}: {tier.name || 'Nama belum diisi'}</p>
            <p className="text-xs text-content-faint">
              Kategori: {parentCategory?.name ?? tier.categoryId} · ID: {tier.id}
              · Rp{tier.price.toLocaleString('id-ID')}/{tier.durationDays} hari
            </p>
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
          <span className="text-content-muted">{expanded ? <EyeOff size={18} /> : <Eye size={18} />}</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-line/40 p-4 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`tier-${index}-id`}>ID</Label>
              <Input
                id={`tier-${index}-id`}
                value={tier.id}
                onChange={(e) => onUpdate(index, { id: e.target.value })}
                maxLength={60}
                placeholder="tier-lite"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`tier-${index}-categoryId`}>Kategori</Label>
              <select
                id={`tier-${index}-categoryId`}
                value={tier.categoryId}
                onChange={(e) => onUpdate(index, { categoryId: e.target.value })}
                className="min-h-[44px] rounded-xl border border-line bg-transparent px-3 text-sm text-content focus:border-accent focus:outline-none"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id} className="bg-surface-raised text-content">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`tier-${index}-name`}>Nama Tier</Label>
              <Input
                id={`tier-${index}-name`}
                value={tier.name}
                onChange={(e) => onUpdate(index, { name: e.target.value })}
                maxLength={100}
                placeholder="Lite, Standard, Elite"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`tier-${index}-price`}>Harga (Rp/bulan)</Label>
              <Input
                id={`tier-${index}-price`}
                type="number"
                inputMode="numeric"
                value={String(tier.price)}
                onChange={(e) => onUpdate(index, { price: Number(e.target.value) || 0 })}
                min={0}
                max={1000000000}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`tier-${index}-duration`}>Durasi (hari)</Label>
              <Input
                id={`tier-${index}-duration`}
                type="number"
                inputMode="numeric"
                value={String(tier.durationDays)}
                onChange={(e) => onUpdate(index, { durationDays: Number(e.target.value) || 30 })}
                min={1}
                max={3650}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`tier-${index}-maxPurchase`}>Maks Beli per User</Label>
              <Input
                id={`tier-${index}-maxPurchase`}
                type="number"
                inputMode="numeric"
                value={String(tier.maxPurchasePerUser ?? 0)}
                onChange={(e) => onUpdate(index, { maxPurchasePerUser: Number(e.target.value) || 0 })}
                min={0}
                max={100}
              />
              <p className="text-xs text-content-faint">0 = unlimited, 1 = sekali beli, 2 = max 2x, dst.</p>
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor={`tier-${index}-desc`}>Deskripsi</Label>
              <Textarea
                id={`tier-${index}-desc`}
                value={tier.description}
                onChange={(e) => onUpdate(index, { description: e.target.value })}
                maxLength={500}
                rows={2}
                placeholder="Deskripsi tier untuk ditampilkan ke pengguna"
              />
            </div>
          </div>

          <div className="rounded-xl border border-accent/30 bg-accent-soft/30 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-content">Spesifikasi Provisioning</p>
                <p className="text-xs text-content-faint">Spesifikasi server yang akan dibuat di Pterodactyl.</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <ProvisionInput label="RAM (MB)" id={`tier-${index}-memory`} value={tier.provision.memoryMb} onChange={(v) => onUpdate(index, { provision: { ...tier.provision, memoryMb: v } })} min={16} max={1048576} />
              <ProvisionInput label="Swap (MB)" id={`tier-${index}-swap`} value={tier.provision.swapMb} onChange={(v) => onUpdate(index, { provision: { ...tier.provision, swapMb: v } })} min={0} max={1048576} />
              <ProvisionInput label="Disk (MB)" id={`tier-${index}-disk`} value={tier.provision.diskMb} onChange={(v) => onUpdate(index, { provision: { ...tier.provision, diskMb: v } })} min={16} max={1048576} />
              <ProvisionInput label="CPU (%)" id={`tier-${index}-cpu`} value={tier.provision.cpuPercent} onChange={(v) => onUpdate(index, { provision: { ...tier.provision, cpuPercent: v } })} min={0} max={100000} />
              <ProvisionInput label="IO Weight" id={`tier-${index}-io`} value={tier.provision.ioWeight} onChange={(v) => onUpdate(index, { provision: { ...tier.provision, ioWeight: v } })} min={10} max={1000} />
              <ProvisionInput label="Databases" id={`tier-${index}-databases`} value={tier.provision.databases} onChange={(v) => onUpdate(index, { provision: { ...tier.provision, databases: v } })} min={0} max={100} />
              <ProvisionInput label="Allocations" id={`tier-${index}-allocations`} value={tier.provision.allocations} onChange={(v) => onUpdate(index, { provision: { ...tier.provision, allocations: v } })} min={0} max={100} />
              <ProvisionInput label="Backups" id={`tier-${index}-backups`} value={tier.provision.backups} onChange={(v) => onUpdate(index, { provision: { ...tier.provision, backups: v } })} min={0} max={100} />
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor={`tier-${index}-allocMode`}>Mode Alokasi</Label>
                <select
                  id={`tier-${index}-allocMode`}
                  value={tier.provision.allocationMode}
                  onChange={(e) => onUpdate(index, { provision: { ...tier.provision, allocationMode: e.target.value as 'auto' | 'default' } })}
                  className="min-h-[44px] rounded-xl border border-line bg-transparent px-3 text-sm text-content focus:border-accent focus:outline-none"
                >
                  <option value="auto" className="bg-surface-raised text-content">Auto</option>
                  <option value="default" className="bg-surface-raised text-content">Default</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 pt-4 border-t border-line/60">
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
      )}
    </div>
  );
}

function ProvisionInput({ label, id, value, onChange, min, max }: {
  label: string;
  id: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        value={String(value)}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        min={min}
        max={max}
      />
    </div>
  );
}