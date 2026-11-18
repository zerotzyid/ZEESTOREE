'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Server, MemoryStick, Cpu, HardDrive, ShieldCheck, Loader2, AlertCircle, CheckCircle2, ChevronDown, ChevronUp, ChevronRight, UserCheck, Database } from 'lucide-react';
import { useSettings } from '@/components/settings-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export const dynamic = 'force-dynamic';

interface PanelSalesTier {
  id: string;
  panelId: string;
  name: string;
  description: string;
  active: boolean;
  sortOrder: number;
  priceMultiplier: number;
  maxPurchasePerUser: number;
}

interface PanelSalesConfig {
  tiers: PanelSalesTier[];
  ramOptions: number[];
  cpuOptions: number[];
  diskOptions: number[];
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

export default function PanelConfigurePage({ params }: { params: Promise<{ tierId: string }> }) {
  const { settings } = useSettings();

  const panelSales = settings?.panelSales || { tiers: [], ramOptions: [], cpuOptions: [], diskOptions: [] };
  const tiers = panelSales.tiers || [];
  const ramOptions = panelSales.ramOptions || [1024, 2048, 3072, 4096, 5120, 6144, 7168, 8192, 9216, 10240];
  const cpuOptions = panelSales.cpuOptions || [50, 100, 150, 200, 250, 300, 400, 500];
  const diskOptions = panelSales.diskOptions || [10240, 20480, 30720, 40960, 51200, 61440, 71680, 81920, 92160, 102400];

  const [tier, setTier] = useState<PanelSalesTier | null>(null);
  const [tierId, setTierId] = useState<string>('');

  const [selectedRam, setSelectedRam] = useState<number | null>(null);
  const [selectedCpu, setSelectedCpu] = useState<number | null>(null);
  const [selectedDisk, setSelectedDisk] = useState<number | null>(null);

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
      const tid = p.tierId;
      setTierId(tid);
      const found = tiers.find((t) => t.id === tid);
      if (found) setTier(found);
    });
  }, [params, tiers]);

  // Auto-select first options
  useEffect(() => {
    if (ramOptions.length > 0 && !selectedRam) setSelectedRam(ramOptions[0]);
  }, [ramOptions]);

  useEffect(() => {
    if (cpuOptions.length > 0 && !selectedCpu) setSelectedCpu(cpuOptions[0]);
  }, [cpuOptions]);

  useEffect(() => {
    if (diskOptions.length > 0 && !selectedDisk) setSelectedDisk(diskOptions[0]);
  }, [diskOptions]);

  // Fetch eggs from panel API
  const fetchEggs = useCallback(async () => {
    if (!tier) {
      setError('Tier tidak ditemukan');
      setLoadingEggs(false);
      return;
    }

    try {
      setLoadingEggs(true);
      const panelConfig = {
        baseUrl: 'https://panel.example.com', // Will be overridden by tier's panel
        apiKey: '',
      };

      // We need to get the panel's actual baseUrl and apiKey from the tier's panelId
      // For now, we'll use a generic approach - the tier should have panel info
      const panelConfigActual = {
        baseUrl: tier.panelId ? 'https://panel.example.com' : '',
        apiKey: '',
      };

      if (!panelConfigActual.baseUrl || !panelConfigActual.apiKey) {
        throw new Error('Konfigurasi panel Pterodactyl tidak lengkap. Hubungi admin.');
      }

      const baseUrl = panelConfigActual.baseUrl.replace(/\/$/, '');
      const apiKey = panelConfigActual.apiKey;

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

      if (!selectedEggId && allEggs.length > 0) {
        setSelectedEggId(allEggs[0].id);
      }
    } catch (err) {
      console.error('Error fetching eggs:', err);
      setError(err instanceof Error ? err.message : 'Gagal memuat daftar game (egg). Pastikan konfigurasi panel benar.');
    } finally {
      setLoadingEggs(false);
    }
  }, [tier, selectedEggId]);

  const checkUserPurchases = useCallback(async () => {
    if (!tier) return;
    setCheckingPurchase(true);
    try {
      const res = await fetch(`/api/user/purchase-count?productId=${tier.id}`, { cache: 'no-store' });
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
  }, [tier]);

  useEffect(() => {
    checkUserPurchases();
  }, [checkUserPurchases]);

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

  const ramDisplay = selectedRam ? `${selectedRam / 1024}GB` : '-';
  const cpuDisplay = selectedCpu ? (selectedCpu === 0 ? 'Unlimited' : `${selectedCpu}%`) : '-';
  const diskDisplay = selectedDisk ? `${selectedDisk / 1024}GB` : '-';

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
      selectedRam,
      selectedCpu,
      selectedDisk,
      selectedEggId,
      selectedEggName: selectedEgg?.name,
      selectedEggNestName: selectedEgg?.nestName,
      priceMultiplier: tier?.priceMultiplier,
      durationDays: 30,
      maxPurchasePerUser: tier?.maxPurchasePerUser,
    };

    sessionStorage.setItem('panel_config', JSON.stringify(config));

    // Redirect to checkout
    window.location.href = `/checkout?type=panel&tier_id=${tier?.id}&ram=${selectedRam}&cpu=${selectedCpu}&disk=${selectedDisk}&egg_id=${selectedEggId}`;
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

  // Calculate price (simplified: base price per GB/MB/percent)
  const baseRamPrice = (selectedRam || 0) * 25; // 25 per MB
  const baseCpuPrice = (selectedCpu || 0) * 100; // 100 per percent
  const baseDiskPrice = (selectedDisk || 0) * 5; // 5 per MB
  const totalPrice = (baseRamPrice + baseCpuPrice + baseDiskPrice) * (tier?.priceMultiplier || 1);

  const isPurchaseLimited = tier && tier.maxPurchasePerUser > 0 && userPurchaseCount >= tier.maxPurchasePerUser;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/panel-beli"
        className="mb-6 inline-flex min-h-[40px] items-center gap-2 rounded-full border border-line px-4 text-sm text-content-muted transition-colors hover:text-content"
      >
        <ArrowLeft aria-hidden size={15} />
        Kembali ke Panel Tier
      </Link>

      {/* Progress Steps */}
      <div className="mb-8 flex items-center justify-center">
        <div className="flex items-center gap-4">
          <StepCircle step={1} completed={true}>Panel</StepCircle>
          <StepLine completed={true} />
          <StepCircle step={2} active completed>Specs</StepCircle>
          <StepLine />
          <StepCircle step={3}>Egg</StepCircle>
          <StepLine />
          <StepCircle step={4}>Bayar</StepCircle>
          <StepLine />
          <StepCircle step={5}>Provisioning</StepCircle>
          <StepLine />
          <StepCircle step={6}>Kelola</StepCircle>
        </div>
      </div>

      {/* Config Summary */}
      <Card className="mb-6 rounded-2xl border border-line bg-gradient-to-r from-accent/5 to-transparent">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-accent/10">
                <Server aria-hidden size={24} className="text-accent" />
              </div>
              <div>
                <p className="text-sm text-content-muted">{tier.name}</p>
                <h3 className="text-xl font-semibold text-content">
                  RAM: {selectedRam ? `${selectedRam / 1024}GB` : '-'} | 
                  CPU: {selectedCpu ? (selectedCpu === 0 ? 'Unlimited' : `${selectedCpu}%`) : '-'} | 
                  Disk: {selectedDisk ? `${selectedDisk / 1024}GB` : '-'}
                </h3>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4 text-right sm:text-left">
              <div className="flex flex-wrap items-center gap-2 text-sm text-content-muted">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-content/10 text-[10px] font-medium">
                  <MemoryStick aria-hidden size={10} /> RAM: {selectedRam ? `${selectedRam / 1024}GB` : '-'}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-content/10 text-[10px] font-medium">
                  <Cpu aria-hidden size={10} /> CPU: {selectedCpu ? (selectedCpu === 0 ? 'Unlimited' : `${selectedCpu}%`) : '-'}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-content/10 text-[10px] font-medium">
                  <HardDrive aria-hidden size={10} /> Disk: {selectedDisk ? `${selectedDisk / 1024}GB` : '-'}
                </span>
              </div>
              <div className="text-2xl font-bold text-accent">Rp{formatRupiah(totalPrice)}<span className="text-sm font-normal text-content-muted">/bln</span></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Purchase Limit Warning */}
      {tier?.maxPurchasePerUser > 0 && (
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

      {/* Step 2: Specs Selection */}
      <div className="space-y-8">
        {/* RAM Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MemoryStick aria-hidden size={20} className="text-blue-400" />
              1. Pilih RAM
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ramOptions.map((ram) => (
                <button
                  key={ram}
                  onClick={() => setSelectedRam(ram)}
                  className={`relative flex flex-col h-full overflow-hidden rounded-3xl border-2 p-4 transition-all ${
                    selectedRam === ram
                      ? 'border-blue-500 bg-blue-500/5'
                      : 'border-line hover:border-blue-500/50 hover:bg-content/5'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-xl bg-blue-500/10">
                      <MemoryStick aria-hidden size={20} className="text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-content">{ram / 1024}GB</h3>
                      <p className="text-sm text-content-muted">{ram} MB</p>
                    </div>
                  </div>
                  {selectedRam === ram && <CheckCircle2 className="absolute top-4 right-4 text-blue-500" size={20} />}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* CPU Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu aria-hidden size={20} className="text-orange-400" />
              2. Pilih CPU
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cpuOptions.map((cpu) => (
                <button
                  key={cpu}
                  onClick={() => setSelectedCpu(cpu)}
                  className={`relative flex flex-col h-full overflow-hidden rounded-3xl border-2 p-4 transition-all ${
                    selectedCpu === cpu
                      ? 'border-orange-500 bg-orange-500/5'
                      : 'border-line hover:border-orange-500/50 hover:bg-content/5'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-xl bg-orange-500/10">
                      <Cpu aria-hidden size={24} className="text-orange-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-content">{cpu === 0 ? 'Unlimited' : `${cpu}%`}</h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-content-muted">
                    <span className="flex items-center gap-1">
                      <Cpu aria-hidden size={14} />
                      {cpu === 0 ? 'Unlimited' : `${cpu}%`} CPU
                    </span>
                  </div>
                  {selectedCpu === cpu && <CheckCircle2 className="absolute top-4 right-4 text-orange-500" size={20} />}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Disk Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive aria-hidden size={20} className="text-green-400" />
              3. Pilih Disk / Storage
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {diskOptions.map((disk) => (
                <button
                  key={disk}
                  onClick={() => setSelectedDisk(disk)}
                  className={`relative flex flex-col h-full overflow-hidden rounded-3xl border-2 p-4 transition-all ${
                    selectedDisk === disk
                      ? 'border-green-500 bg-green-500/5'
                      : 'border-line hover:border-green-500/50 hover:bg-content/5'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-xl bg-green-500/10">
                      <HardDrive aria-hidden size={24} className="text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-content">{disk / 1024}GB</h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-content-muted">
                    <span className="flex items-center gap-1">
                      <HardDrive aria-hidden size={14} />
                      {disk / 1024}GB
                    </span>
                  </div>
                  {selectedDisk === disk && <CheckCircle2 className="absolute top-4 right-4 text-green-500" size={20} />}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Step 3: Egg Selection */}
      <Card className="mb-6 rounded-2xl border border-line">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server aria-hidden size={20} className="text-accent" />
            4. Pilih Jenis Game (Egg)
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
          Harga estimasi: Rp{formatRupiah(totalPrice)}/bln · Masa aktif: 30 hari
          {tier?.maxPurchasePerUser > 0 && ` · Batas: {tier.maxPurchasePerUser}x per user`}
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