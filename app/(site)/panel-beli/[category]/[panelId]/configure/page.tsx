'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Server, Cpu, HardDrive, Database, ShieldCheck, Loader2, AlertCircle, CheckCircle2, ChevronDown, ChevronUp, ChevronRight, UserCheck } from 'lucide-react';
import { useSettings } from '@/components/settings-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export const dynamic = 'force-dynamic';

interface PanelCategory {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  active: boolean;
  sortOrder: number;
  pterodactylPanelId?: string;
}

interface PanelRamTier {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  durationDays: number;
  sortOrder: number;
  active: boolean;
  maxPurchasePerUser: number; // 0 = unlimited
  provision: {
    memoryMb: number;
    swapMb: number;
    diskMb: number;
    cpuPercent: number;
    ioWeight: number;
    dockerImage: string | null;
    startup: string | null;
    environment: Record<string, string>;
    allocationMode: 'auto' | 'default';
    allocationId: number | null;
    databases: number;
    allocations: number;
    backups: number;
  };
}

interface EggOption {
  id: number;
  name: string;
  description: string;
  dockerImage: string;
  startup: string;
  nestId: number;
  nestName: string;
  variables: Array<{
    name: string;
    envVariable: string;
    defaultValue: string;
    description: string;
    userViewable: boolean;
    userEditable: boolean;
  }>;
}

interface NestWithEggs {
  nestId: number;
  nestName: string;
  nestDescription: string;
  eggs: EggOption[];
}

export default function PanelConfigurePage({ params }: { params: Promise<{ category: string; panelId: string }> }) {
  const { settings } = useSettings();

  const panelCategories = settings?.panelCategories?.filter((p) => p.active) ?? [];
  const panelRamTiers = settings?.panelRamTiers?.filter((p) => p.active) ?? [];

  const [tier, setTier] = useState<PanelRamTier | null>(null);
  const [category, setCategory] = useState<string>('');
  const [tierId, setTierId] = useState<string>('');

  const [eggs, setEggs] = useState<EggOption[]>([]);
  const [nests, setNests] = useState<NestWithEggs[]>([]);
  const [selectedEggId, setSelectedEggId] = useState<number | null>(null);
  const [loadingEggs, setLoadingEggs] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedNests, setExpandedNests] = useState<Set<number>>(new Set());
  const [userPurchaseCount, setUserPurchaseCount] = useState<number>(0);
  const [checkingPurchase, setCheckingPurchase] = useState(false);

  // Initialize from URL
  useEffect(() => {
    params.then((p) => {
      const cat = p.category;
      const tid = p.panelId;
      setCategory(cat);
      setTierId(tid);
      const found = panelRamTiers.find((t) => t.id === tid);
      if (found) {
        setTier(found);
        // Check user's purchase count for this tier
        checkUserPurchases(found.id);
      }
    });
    fetchEggs();
  }, []);

  const checkUserPurchases = async (tierId: string) => {
    setCheckingPurchase(true);
    try {
      const res = await fetch(`/api/user/purchase-count?productId=${tierId}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setUserPurchaseCount(data.count || 0);
      } else {
        setUserPurchaseCount(0);
      }
    } catch (e) {
      console.error('Failed to check purchase count:', e);
      setUserPurchaseCount(0);
    } finally {
      setCheckingPurchase(false);
    }
  };

  const fetchEggs = useCallback(async () => {
    if (!tier?.provision) {
      setError('Konfigurasi provisioning tidak ditemukan.');
      setLoadingEggs(false);
      return;
    }

    try {
      setLoadingEggs(true);
      const panelConfig = {
        baseUrl: settings?.integrations?.resellerBaseUrl || '',
        apiKey: settings?.integrations?.resellerApiKey || '',
      };

      if (!panelConfig.baseUrl || !panelConfig.apiKey) {
        throw new Error('Konfigurasi panel Pterodactyl tidak lengkap.');
      }

      // Fetch nests with eggs
      const baseUrl = panelConfig.baseUrl.replace(/\/$/, '');
      const apiKey = panelConfig.apiKey;

      const nestsRes = await fetch(`${baseUrl}/api/application/nests?per_page=100`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });

      if (!nestsRes.ok) {
        throw new Error(`Gagal mengambil data nests: ${nestsRes.status}`);
      }

      const nestsData = await nestsRes.json();
      const nestList = nestsData.data || [];

      const allNests: NestWithEggs[] = [];
      const allEggs: EggOption[] = [];

      for (const nest of nestList) {
        const nestId = nest.attributes.id;
        const nestName = nest.attributes.name;
        const nestDescription = nest.attributes.description || '';

        try {
          const eggsRes = await fetch(`${baseUrl}/api/application/nests/${nestId}/eggs?per_page=100`, {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
            cache: 'no-store',
          });

          if (!eggsRes.ok) continue;

          const eggsData = await eggsRes.json();
          const eggList = eggsData.data || [];

          const nestEggs: EggOption[] = [];
          for (const egg of eggList) {
            try {
              const eggDetailRes = await fetch(`${baseUrl}/api/application/nests/${nestId}/eggs/${egg.attributes.id}?include=variables`, {
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                  'Accept': 'application/json',
                  'Content-Type': 'application/json',
                },
                cache: 'no-store',
              });

              let variables: EggOption['variables'] = [];
              let dockerImage = '';
              let startup = '';

              if (eggDetailRes.ok) {
                const eggDetail = await eggDetailRes.json();
                const attrs = eggDetail.attributes || {};
                dockerImage = attrs.docker_image || '';
                startup = attrs.startup || '';
                variables = (eggDetail.relationships?.variables?.data || []).map((v: any) => v.attributes).map((v: any) => ({
                  name: v.name,
                  envVariable: v.env_variable,
                  defaultValue: v.default_value || '',
                  description: v.description || '',
                  userViewable: v.user_viewable ?? true,
                  userEditable: v.user_editable ?? true,
                }));
              }

              const eggOption: EggOption = {
                id: egg.attributes.id,
                name: egg.attributes.name,
                description: egg.attributes.description || '',
                dockerImage,
                startup,
                nestId,
                nestName,
                variables,
              };

              nestEggs.push(eggOption);
              allEggs.push(eggOption);
            } catch (e) {
              console.warn(`Failed to fetch egg ${egg.attributes.id}:`, e);
            }
          }

          if (nestEggs.length > 0) {
            allNests.push({
              nestId,
              nestName,
              nestDescription,
              eggs: nestEggs,
            });
          }
        } catch (e) {
          console.warn(`Failed to process nest ${nestId}:`, e);
        }
      }

      setNests(allNests);
      setEggs(allEggs);

      // Auto-select first egg if none selected
      if (!selectedEggId && allEggs.length > 0) {
        setSelectedEggId(allEggs[0].id);
      }
    } catch (err) {
      console.error('Error fetching eggs:', err);
      setError(err instanceof Error ? err.message : 'Gagal memuat daftar game (egg). Pastikan konfigurasi panel benar.');
    } finally {
      setLoadingEggs(false);
    }
  }, [tier, settings, selectedEggId]);

  const toggleNest = (nestId: number) => {
    setExpandedNests((prev) => {
      const next = new Set(prev);
      if (next.has(nestId)) {
        next.delete(nestId);
      } else {
        next.add(nestId);
      }
      return next;
    });
  };

  const handleContinue = () => {
    if (!selectedEggId) {
      toast.error('Pilih jenis game (egg) terlebih dahulu.');
      return;
    }

    // Check max purchase limit
    if (tier && tier.maxPurchasePerUser > 0 && userPurchaseCount >= tier.maxPurchasePerUser) {
      toast.error(`Anda sudah mencapai batas pembelian untuk produk ini (maks ${tier.maxPurchasePerUser}x).`);
      return;
    }

    // Store selection in sessionStorage for checkout
    const selectedEgg = eggs.find((e) => e.id === selectedEggId);
    const config = {
      tierId: tier?.id,
      tierName: tier?.name,
      category: category,
      provision: tier?.provision,
      selectedEggId: selectedEggId,
      selectedEggName: selectedEgg?.name,
      selectedEggNestName: selectedEgg?.nestName,
      price: tier?.price,
      durationDays: tier?.durationDays,
      maxPurchasePerUser: tier?.maxPurchasePerUser,
    };

    sessionStorage.setItem('panel_config', JSON.stringify(config));

    // Redirect to checkout
    window.location.href = `/checkout?type=panel&tier_id=${tier?.id}&egg_id=${selectedEggId}`;
  };

  if (!tier) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <Link href="/panel-beli" className="mb-6 inline-flex min-h-[40px] items-center gap-2 rounded-full border border-line px-4 text-sm text-content-muted transition-colors hover:text-content">
          <ArrowLeft aria-hidden size={15} />
          Kembali
        </Link>
        <div className="text-center py-12">
          <AlertCircle aria-hidden size={48} className="mx-auto mb-4 text-orange-500" />
          <h3 className="text-lg font-semibold text-content">Tier tidak ditemukan</h3>
          <p className="mt-2 text-sm text-content-muted">Tier yang dipilih tidak valid atau tidak aktif.</p>
        </div>
      </div>
    );
  }

  const categoryLabel = category === 'pterodactyl' ? 'Panel Pterodactyl' : 'Panel Custom';

  // Check purchase limit
  const isPurchaseLimited = tier.maxPurchasePerUser > 0 && userPurchaseCount >= tier.maxPurchasePerUser;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href={`/panel-beli/${category}`}
        className="mb-6 inline-flex min-h-[40px] items-center gap-2 rounded-full border border-line px-4 text-sm text-content-muted transition-colors hover:text-content"
      >
        <ArrowLeft aria-hidden size={15} />
        Kembali ke {categoryLabel}
      </Link>

      {/* Progress Steps */}
      <div className="mb-8 flex items-center justify-center">
        <div className="flex items-center gap-4">
          <StepCircle step={1} completed={true}>Kategori</StepCircle>
          <StepLine completed={true} />
          <StepCircle step={2} completed={true}>Spesifikasi RAM</StepCircle>
          <StepLine completed={true} />
          <StepCircle step={3} active={true} completed={true}>Jenis Game (Egg)</StepCircle>
          <StepLine />
          <StepCircle step={4}>Pembayaran</StepCircle>
          <StepLine />
          <StepCircle step={5}>Provisioning</StepCircle>
          <StepLine />
          <StepCircle step={6}>Kelola Panel</StepCircle>
        </div>
      </div>

      {/* Tier Summary */}
      <Card className="mb-6 rounded-2xl border border-line bg-gradient-to-r from-accent/5 to-transparent">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-accent/10">
                <Server aria-hidden size={24} className="text-accent" />
              </div>
              <div>
                <p className="text-sm text-content-muted">{categoryLabel}</p>
                <h3 className="text-xl font-semibold text-content">{tier.name}</h3>
                <p className="text-sm text-content-muted">{tier.description}</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4 text-right sm:text-left">
              <div className="flex items-center gap-4 text-sm text-content-muted">
                <div className="flex items-center gap-1">
                  <HardDrive aria-hidden size={14} />
                  <span>{tier.provision.memoryMb} MB RAM</span>
                </div>
                <div className="flex items-center gap-1">
                  <Database aria-hidden size={14} />
                  <span>{tier.provision.diskMb} MB Disk</span>
                </div>
                <div className="flex items-center gap-1">
                  <Cpu aria-hidden size={14} />
                  <span>{tier.provision.cpuPercent}% CPU</span>
                </div>
                {tier.maxPurchasePerUser > 0 && (
                  <div className="flex items-center gap-1 text-orange-500">
                    <UserCheck aria-hidden size={14} />
                    <span>Maks {tier.maxPurchasePerUser}x per user</span>
                  </div>
                )}
              </div>
              <div className="text-2xl font-bold text-accent">Rp{formatRupiah(tier.price)}<span className="text-sm font-normal text-content-muted">/bln</span></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Purchase Limit Warning */}
      {tier.maxPurchasePerUser > 0 && (
        <div className="mb-6 rounded-xl border border-orange-300/50 bg-orange-500/5 p-4">
          <div className="flex items-center gap-3">
            <AlertCircle aria-hidden size={20} className="text-orange-500" />
            <div>
              <p className="font-medium text-orange-300">Batas Pembelian</p>
              <p className="text-sm text-orange-200">
                Produk ini dibatasi maksimal <strong>{tier.maxPurchasePerUser}x per user</strong>.
                Anda sudah membeli <strong>{userPurchaseCount}x</strong>.
                {isPurchaseLimited && ' Batas tercapai, tidak bisa membeli lagi.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Egg Selection */}
      <Card className="mb-6 rounded-2xl border border-line">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server aria-hidden size={20} className="text-accent" />
            Pilih Jenis Game (Egg)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {error && (
            <div className="mb-4 rounded-xl border border-red-300/50 bg-red-500/5 p-4 text-red-300">
              <AlertCircle aria-hidden size={16} className="mr-2" />
              {error}
              <Button size="sm" variant="outline" className="ml-4" onClick={fetchEggs}>
                <Loader2 aria-hidden size={14} className="mr-1" />
                Coba Lagi
              </Button>
            </div>
          )}

          {loadingEggs ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
              <span className="ml-3 text-content-muted">Memuat daftar game dari panel...</span>
            </div>
          ) : eggs.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle aria-hidden size={48} className="mx-auto mb-4 text-orange-500" />
              <h3 className="text-lg font-semibold text-content">Tidak ada egg ditemukan</h3>
              <p className="mt-2 text-sm text-content-muted">
                Panel Pterodactyl tidak memiliki nest/egg yang terkonfigurasi.
                Hubungi admin untuk menambahkan egg ke panel.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {nests.map((nest) => {
                const isExpanded = expandedNests.has(nest.nestId);
                return (
                  <div key={nest.nestId} className="rounded-xl border border-line/40 bg-content/5 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleNest(nest.nestId)}
                      className="w-full flex items-center justify-between p-4 hover:bg-content/10 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-accent/10">
                          <Database aria-hidden size={20} className="text-accent" />
                        </div>
                        <div>
                          <p className="font-medium text-content">{nest.nestName}</p>
                          <p className="text-sm text-content-muted">{nest.eggs.length} game tersedia</p>
                        </div>
                      </div>
                      <ChevronDown
                        aria-hidden
                        size={20}
                        className={`text-content-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {isExpanded && (
                      <div className="border-t border-line/40 p-4 space-y-3">
                        {nest.eggs.map((egg) => (
                          <EggOptionCard
                            key={egg.id}
                            egg={egg}
                            selected={selectedEggId === egg.id}
                            onSelect={() => setSelectedEggId(egg.id)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Selected Egg Summary */}
              {selectedEggId && (
                <div className="rounded-xl border border-accent/50 bg-accent/5 p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 aria-hidden size={20} className="text-accent" />
                    <div className="flex-1">
                      <p className="font-medium text-content">Egg terpilih: <span className="text-accent">{eggs.find((e) => e.id === selectedEggId)?.name}</span></p>
                      <p className="text-sm text-content-muted">Nest: {eggs.find((e) => e.id === selectedEggId)?.nestName}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Continue Button */}
      <div className="sticky bottom-0 mb-6 border-t border-line/40 bg-background/80 backdrop-blur-sm p-4">
        <Button
          className="w-full"
          size="lg"
          onClick={handleContinue}
          disabled={loadingEggs || !selectedEggId || isPurchaseLimited || checkingPurchase}
        >
          {checkingPurchase ? (
            <>
              <Loader2 aria-hidden size={20} className="mr-2 animate-spin" />
              Memeriksa batas pembelian...
            </>
          ) : (
            <>
              <ChevronRight aria-hidden size={20} className="mr-2" />
              Lanjut ke Pembayaran
            </>
          )}
        </Button>
        <p className="mt-2 text-center text-xs text-content-faint">
          Harga: Rp{formatRupiah(tier.price)}/bulan · Masa aktif: {tier.durationDays} hari
          {tier.maxPurchasePerUser > 0 && ` · Batas: {tier.maxPurchasePerUser}x per user`}
        </p>
      </div>
    </div>
  );
}

function StepCircle({ step, active, completed, children }: { step: number; active?: boolean; completed?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
        completed ? 'bg-accent border-accent text-white' : active ? 'bg-accent/10 border-accent text-accent' : 'bg-content/5 border-line text-content-muted'
      }`}>
        {completed ? <CheckCircle2 aria-hidden size={18} /> : <span className="font-medium">{step}</span>}
      </div>
      <span className={`text-xs font-medium ${completed || active ? 'text-accent' : 'text-content-muted'}`}>{children}</span>
    </div>
  );
}

function StepLine({ completed }: { completed?: boolean }) {
  return (
    <div className={`h-1 w-16 rounded transition-colors ${completed ? 'bg-accent' : 'bg-line'}`} />
  );
}

function EggOptionCard({ egg, selected, onSelect }: { egg: EggOption; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 transition-all ${
        selected
          ? 'border-accent bg-accent/5'
          : 'border-line hover:border-accent/50 hover:bg-content/5'
      }`}
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg border-2 flex-shrink-0 ${
        selected ? 'border-accent bg-accent text-white' : 'border-line bg-content/5 text-content-muted'
      }`}>
        {selected ? <CheckCircle2 aria-hidden size={18} /> : <Database aria-hidden size={18} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-content truncate">{egg.name}</p>
        <p className="text-sm text-content-muted truncate">{egg.description || 'Tidak ada deskripsi'}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-content-faint">
          {egg.dockerImage && <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-content/10">{egg.dockerImage}</span>}
          {egg.startup && <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-content/10">Startup: {egg.startup.slice(0, 30)}...</span>}
          {egg.variables.length > 0 && <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500">{egg.variables.length} variabel</span>}
        </div>
      </div>
      {selected && <CheckCircle2 aria-hidden size={20} className="text-accent flex-shrink-0" />}
    </button>
  );
}

function formatRupiah(value: number): string {
  return new Intl.NumberFormat('id-ID').format(value);
}