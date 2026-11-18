'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Server, MemoryStick, Cpu, HardDrive, ShieldCheck, ChevronDown, ChevronRight, ChevronLeft } from 'lucide-react';
import { useSettings } from '@/components/settings-provider';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { formatRupiah } from '@/lib/format';

export const dynamic = 'force-dynamic';

interface PanelDoc {
  id: string;
  name: string;
  baseUrl: string;
  active?: boolean;
  hasKey?: boolean;
}

interface PanelRamOption {
  id: string;
  name: string;
  memoryMb: number;
  price: number;
  durationDays: number;
  maxPurchasePerUser: number;
  active: boolean;
  isCustom: boolean;
  customMaxMb?: number;
}

interface PanelCpuOption {
  id: string;
  name: string;
  cpuPercent: number;
  priceModifier: number;
  active: boolean;
}

interface PanelDiskOption {
  id: string;
  name: string;
  diskMb: number;
  priceModifier: number;
  active: boolean;
  isCustom: boolean;
  customMaxMb?: number;
}

export default function PanelBeliPage() {
  const { settings } = useSettings();
  const [existingPanels, setExistingPanels] = useState<{id: string; name: string; baseUrl: string}[]>([]);
  
  useEffect(() => {
    fetch('/api/admin/panels', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (data.panels) {
          setExistingPanels(data.panels
            .filter((p: any) => p.active && p.hasKey)
            .map((p: any) => ({ id: p.id, name: p.name, baseUrl: p.baseUrl }))
          );
        }
      })
      .catch(() => {});
  }, []);
  
  // Use panelTiers from settings for RAM/CPU/Disk options
  const panelTiers = settings?.panelTiers?.filter((p: any) => p.active) ?? [];
  const panelRamOptions = settings?.panelRamOptions?.filter((r: any) => r.active) ?? [];
  
  // Simple CPU options
  const cpuOptions: PanelCpuOption[] = [
    { id: 'cpu-500', name: '500%', cpuPercent: 500, priceModifier: 0, active: true },
    { id: 'cpu-unlimited', name: 'Unlimited', cpuPercent: 0, priceModifier: 50000, active: true },
  ];
  
  // Simple Disk options
  const diskOptions: PanelDiskOption[] = [
    { id: 'disk-10gb', name: '10GB', diskMb: 10240, priceModifier: 0, active: true, isCustom: false },
    { id: 'disk-20gb', name: '20GB', diskMb: 20480, priceModifier: 15000, active: true, isCustom: false },
    { id: 'disk-50gb', name: '50GB', diskMb: 51200, priceModifier: 40000, active: true, isCustom: false },
  ];

  const [selectedPanel, setSelectedPanel] = useState<PanelDoc | null>(null);
  const [selectedRam, setSelectedRam] = useState<PanelRamOption | null>(null);
  const [selectedCpu, setSelectedCpu] = useState<PanelCpuOption | null>(null);
  const [selectedDisk, setSelectedDisk] = useState<any>(null);
  const [customRamMb, setCustomRamMb] = useState(0);
  const [step, setStep] = useState(1); // 1=Panel, 2=RAM, 3=CPU, 4=Disk, 5=Egg

  // Auto-select first options
  useEffect(() => {
    if (existingPanels.length > 0 && !selectedPanel) {
      setSelectedPanel(existingPanels[0]);
    }
  }, [existingPanels]);

  useEffect(() => {
    if (selectedRam && panelRamOptions.length > 0 && !selectedRam) {
      setSelectedRam(panelRamOptions[0]);
    }
  }, [panelRamOptions]);

  useEffect(() => {
    if (cpuOptions.length > 0 && !selectedCpu) {
      setSelectedCpu(cpuOptions[0]);
    }
  }, [cpuOptions]);

  useEffect(() => {
    if (diskOptions.length > 0 && !selectedDisk) {
      setSelectedDisk(diskOptions[0]);
    }
  }, [diskOptions]);

  const totalPrice = (selectedRam?.price || 0) + (selectedCpu?.priceModifier || 0) + (selectedDisk?.priceModifier || 0);
  const ramDisplay = selectedRam ? `${selectedRam.memoryMb / 1024}GB` : '-';
  const cpuDisplay = selectedCpu ? (selectedCpu.cpuPercent === 0 ? 'Unlimited' : `${selectedCpu.cpuPercent}%`) : '-';
  const diskDisplay = selectedDisk ? `${selectedDisk.diskMb / 1024}GB` : '-';

  const handleContinue = () => {
    if (step === 1 && !selectedPanel) return;
    if (step === 2 && !selectedRam) return;
    if (step === 3 && !selectedCpu) return;
    if (step === 4 && !selectedDisk) return;
    if (step === 5) {
      window.location.href = `/checkout?type=panel&panel_id=${selectedPanel?.id}&ram_id=${selectedRam?.id}&cpu_id=${selectedCpu?.id}&disk_id=${selectedDisk?.id}`;
      return;
    }
    setStep(step + 1);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/#katalog"
        className="mb-6 inline-flex min-h-[40px] items-center gap-2 rounded-full border border-line px-4 text-sm text-content-muted transition-colors hover:text-content"
      >
        <ArrowLeft aria-hidden size={15} />
        Kembali ke katalog
      </Link>

      {/* Progress Steps */}
      <div className="mb-8 flex items-center justify-center">
        <div className="flex items-center gap-4">
          <StepCircle step={1} active={step >= 1} completed={step > 1}>Panel</StepCircle>
          <StepLine completed={step > 1} />
          <StepCircle step={2} active={step >= 2} completed={step > 2}>RAM</StepCircle>
          <StepLine completed={step > 2} />
          <StepCircle step={3} active={step >= 3} completed={step > 3}>CPU</StepCircle>
          <StepLine completed={step > 3} />
          <StepCircle step={4} active={step >= 4} completed={step > 4}>Disk</StepCircle>
          <StepLine completed={step > 4} />
          <StepCircle step={5} active={step >= 5}>Egg</StepCircle>
        </div>
      </div>

      {/* Step 1: Panel Selection */}
      {step >= 1 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server aria-hidden size={20} className="text-accent" />
              1. Pilih Panel (Lokasi/API)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <Label className="text-sm font-medium text-content">Panel Pterodactyl</Label>
                <div className="relative flex-1">
                  <select
                    value={selectedPanel?.id || ''}
                    onChange={(e) => {
                      const panel = existingPanels.find(p => p.id === e.target.value);
                      setSelectedPanel(panel || null);
                    }}
                    className="w-full min-h-[44px] rounded-xl border border-line bg-transparent px-4 py-3 text-sm text-content focus:border-accent focus:outline-none appearance-none bg-white/5"
                  >
                    <option value="">Pilih Panel</option>
                    {existingPanels.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.baseUrl})</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-content-muted pointer-events-none" />
                </div>
              </div>
              
              {selectedPanel && (
                <div className="p-4 rounded-xl bg-accent/5 border border-accent/20">
                  <p className="text-sm text-content">Panel terpilih: <strong>{selectedPanel.name}</strong></p>
                  <p className="text-xs text-content-muted">{selectedPanel.baseUrl}</p>
                </div>
              )}
              
              {existingPanels.length === 0 && (
                <div className="text-center py-4 text-orange-500">
                  <AlertTriangle aria-hidden size={20} className="mx-auto mb-2" />
                  <p className="text-sm">Belum ada panel aktif. Tambah panel di <a href="/admin/panels" className="text-accent underline">Admin Panel</a>.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: RAM Selection */}
      {step >= 2 && selectedPanel && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MemoryStick aria-hidden size={20} className="text-blue-400" />
              2. Pilih RAM
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {panelRamOptions.map((ram) => (
                <button
                  key={ram.id}
                  onClick={() => { setSelectedRam(ram); setStep(3); }}
                  className={`relative flex flex-col h-full overflow-hidden rounded-3xl border-2 p-4 transition-all ${
                    selectedRam?.id === ram.id
                      ? 'border-accent bg-accent/5'
                      : 'border-line hover:border-accent/50 hover:bg-content/5'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-xl bg-blue-500/10">
                      <MemoryStick aria-hidden size={20} className="text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-content">{ram.name}</h3>
                      <p className="text-sm text-content-muted">Rp{formatRupiah(ram.price)}/bln · {ram.durationDays} hari</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-content-muted">
                    <span className="flex items-center gap-1">
                      <MemoryStick aria-hidden size={14} />
                      {ram.memoryMb / 1024}GB RAM
                    </span>
                    <span className="flex items-center gap-1">
                      <ShieldCheck aria-hidden size={14} />
                      {ram.maxPurchasePerUser === 0 ? 'Unlimited' : `${ram.maxPurchasePerUser}x`}
                    </span>
                  </div>
                  {selectedRam?.id === ram.id && <CheckCircle2 className="absolute top-4 right-4 text-accent" size={20} />}
                </button>
              ))}
            </div>
            {panelRamOptions.length === 0 && (
              <p className="text-center text-content-muted py-4">Belum ada opsi RAM. Tambah di Admin → Panel Types.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: CPU Selection */}
      {step >= 3 && selectedRam && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu aria-hidden size={20} className="text-orange-400" />
              3. Pilih CPU
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {cpuOptions.map((cpu) => (
                <button
                  key={cpu.id}
                  onClick={() => { setSelectedCpu(cpu); setStep(4); }}
                  className={`relative flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                    selectedCpu?.id === cpu.id
                      ? 'border-orange-500 bg-orange-500/5'
                      : 'border-line hover:border-orange-500/50 hover:bg-content/5'
                  }`}
                >
                  <div className="p-3 rounded-xl bg-orange-500/10">
                    <Cpu aria-hidden size={24} className="text-orange-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-content">{cpu.name}</h3>
                    <p className="text-sm text-content-muted">
                      {cpu.cpuPercent === 0 ? 'Unlimited' : `${cpu.cpuPercent}%`} CPU
                      {cpu.priceModifier > 0 && ` · +Rp${formatRupiah(cpu.priceModifier)}/bln`}
                    </p>
                  </div>
                  {selectedCpu?.id === cpu.id && <CheckCircle2 className="text-orange-500" size={24} />}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Disk Selection */}
      {step >= 4 && selectedCpu && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive aria-hidden size={20} className="text-green-400" />
              4. Pilih Disk / Storage
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {diskOptions.map((disk) => (
                <button
                  key={disk.id}
                  onClick={() => { setSelectedDisk(disk); setStep(5); }}
                  className={`relative flex flex-col p-4 rounded-2xl border-2 transition-all ${
                    selectedDisk?.id === disk.id
                      ? 'border-green-500 bg-green-500/5'
                      : 'border-line hover:border-green-500/50 hover:bg-content/5'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-xl bg-green-500/10">
                      <HardDrive aria-hidden size={20} className="text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-content">{disk.name}</h3>
                      <p className="text-sm text-content-muted">
                        {disk.priceModifier === 0 ? 'Gratis' : `+Rp${formatRupiah(disk.priceModifier)}/bln`}
                      </p>
                    </div>
                  </div>
                  {selectedDisk?.id === disk.id && <CheckCircle2 className="absolute top-4 right-4 text-green-500" size={20} />}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Egg Selection */}
      {step >= 5 && selectedDisk && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server aria-hidden size={20} className="text-accent" />
              5. Pilih Jenis Game (Egg)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-center py-8">
              <Server aria-hidden size={48} className="mx-auto mb-4 text-accent/50" />
              <h3 className="text-lg font-semibold text-content">Pilih Egg di Halaman Berikutnya</h3>
              <p className="mt-2 text-sm text-content-muted">
                Setelah memilih Disk, Anda akan memilih jenis game (egg) dari panel Pterodactyl.
              </p>
              <Button 
                className="mt-4" 
                onClick={() => window.location.href = `/checkout?type=panel&panel_id=${selectedPanel?.id}&ram_id=${selectedRam?.id}&cpu_id=${selectedCpu?.id}&disk_id=${selectedDisk?.id}`}
              >
                <ChevronRight aria-hidden size={20} className="mr-2" />
                Lanjut ke Pemilihan Egg & Bayar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {selectedPanel && selectedRam && selectedCpu && selectedDisk && (
        <Card className="mb-6 rounded-2xl border border-line bg-gradient-to-r from-accent/5 to-transparent">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-accent/10"><Server aria-hidden size={16} className="text-accent" /></div>
                  <div><p className="text-xs text-content-muted">Panel</p><p className="font-semibold text-content">{selectedPanel.name}</p></div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-500/10"><MemoryStick aria-hidden size={16} className="text-blue-400" /></div>
                  <div><p className="text-xs text-content-muted">RAM</p><p className="font-semibold text-content">{selectedRam.name}</p></div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-orange-500/10"><Cpu aria-hidden size={16} className="text-orange-400" /></div>
                  <div><p className="text-xs text-content-muted">CPU</p><p className="font-semibold text-content">{selectedCpu.name}</p></div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-green-500/10"><HardDrive aria-hidden size={16} className="text-green-400" /></div>
                  <div><p className="text-xs text-content-muted">Disk</p><p className="font-semibold text-content">{selectedDisk.name}</p></div>
                </div>
              </div>
              <div className="text-right sm:text-left">
                <p className="text-2xl font-bold text-accent">Rp{formatRupiah(totalPrice)}<span className="text-sm font-normal text-content-muted">/bln</span></p>
                <p className="text-xs text-content-muted">Masa aktif: {selectedRam.durationDays} hari</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-4">
        {step > 1 && (
          <Button variant="outline" onClick={() => setStep(step - 1)}>
            <ChevronLeft aria-hidden size={16} className="mr-2" />
            Kembali
          </Button>
        )}
        <div className="flex-1" />
        {step < 5 && selectedPanel && (
          step === 1 && !selectedPanel ? null :
          step === 2 && !selectedRam ? null :
          step === 3 && !selectedCpu ? null :
          step === 4 && !selectedDisk ? null :
          <Button onClick={handleContinue} size="lg" className="w-full sm:w-auto">
            {step === 5 ? (
              <>
                <ChevronRight aria-hidden size={20} className="mr-2" />
                Lanjut ke Egg & Bayar
              </>
            ) : (
              <>
                Lanjut
                <ChevronRight aria-hidden size={16} className="ml-2" />
              </>
            )}
          </Button>
        )}
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

import { CheckCircle2 } from 'lucide-react';
import { AlertTriangle } from 'lucide-react';