'use client';

import { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useSettings } from '@/components/settings-provider';
import { AssetField } from '@/components/admin/asset-field';
import { FaqEditor } from '@/components/admin/faq-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { computeAccentVars } from '@/lib/accent';
import type { Settings } from '@/lib/settings-defaults';

type SectionKey = keyof Settings;

type Props = {
  initial: Settings | null;
};

const MENU_KEYS = [
  'home',
  'products',
  'faq',
  'dashboard',
  'orders',
  'transactions',
  'profile',
  'deposit',
  'nokos',
  'login',
  'register',
] as const;

const TITLE_KEYS = ['home', 'login', 'register', 'dashboard', 'maintenance', 'notFound'] as const;

const MESSAGE_KEYS = [
  'emptyProducts',
  'emptyOrders',
  'emptyTransactions',
  'comingSoonNokos',
  'maintenance',
  'loginRequired',
] as const;

const GROUP_LABELS: Record<string, string> = {
  home: 'Beranda',
  products: 'Produk',
  faq: 'FAQ',
  dashboard: 'Dashboard',
  orders: 'Riwayat pesanan',
  transactions: 'Riwayat transaksi',
  profile: 'Profil',
  deposit: 'Deposit',
  nokos: 'Nomor Virtual',
  login: 'Masuk',
  register: 'Daftar',
  emptyProducts: 'Kosong: produk',
  emptyOrders: 'Kosong: pesanan',
  emptyTransactions: 'Kosong: transaksi',
  comingSoonNokos: 'Nomor virtual: segera hadir',
  maintenance: 'Pemeliharaan',
  loginRequired: 'Harus masuk',
  notFound: '404',
};

function PreviewBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="label-mono">{title}</span>
      <div className="rounded-2xl border border-dashed border-line bg-content/5 p-4">{children}</div>
    </div>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  hint,
  maxLength,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  maxLength?: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} maxLength={maxLength} />
      {hint ? <p className="text-xs text-content-faint">{hint}</p> : null}
    </div>
  );
}

function AreaField({
  id,
  label,
  value,
  onChange,
  hint,
  maxLength,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  maxLength?: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} maxLength={maxLength} />
      {hint ? <p className="text-xs text-content-faint">{hint}</p> : null}
    </div>
  );
}

function SaveButton({
  section,
  saving,
  onClick,
}: {
  section: SectionKey;
  saving: SectionKey | null;
  onClick: (section: SectionKey) => void;
}) {
  return (
    <div className="mt-6 flex justify-end border-t border-line pt-4">
      <Button type="button" disabled={saving !== null} onClick={() => onClick(section)}>
        {saving === section ? <Loader2 aria-hidden size={16} className="animate-spin" /> : <Save aria-hidden size={16} />}
        {saving === section ? 'Menyimpan...' : 'Simpan'}
      </Button>
    </div>
  );
}

export function SettingsClient({ initial }: Props) {
  const { settings, refresh } = useSettings();
  const [draft, setDraft] = useState<Settings | null>(
    initial ? structuredClone(initial) : null
  );
  const [saving, setSaving] = useState<SectionKey | null>(null);

  useEffect(() => {
    if (!draft && settings) setDraft(structuredClone(settings));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  if (!draft) {
    return (
      <div className="flex max-w-3xl flex-col gap-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  const setSection = <K extends SectionKey>(key: K, value: Settings[K]) => {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const setField = <K extends SectionKey>(
    section: K,
    field: keyof Settings[K] & string,
    value: string | boolean
  ) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const current = prev[section] as Record<string, unknown>;
      return {
        ...prev,
        [section]: { ...current, [field]: value },
      } as Settings;
    });
  };

  const save = async (section: SectionKey) => {
    if (!draft) return;
    if (section === 'faq') {
      const invalid = draft.faq.some((item) => !item.q.trim() || !item.a.trim());
      if (invalid) {
        toast.error('Setiap FAQ wajib memiliki pertanyaan dan jawaban.');
        return;
      }
    }
    setSaving(section);
    try {
      const payload = { [section]: draft[section] } as Partial<Settings>;
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Gagal menyimpan.');
      toast.success('Perubahan tersimpan.');
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyimpan.');
    } finally {
      setSaving(null);
    }
  };

  const accentVars = computeAccentVars(draft.appearance.accent);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="label-mono">Admin</p>
        <h1 className="text-2xl font-semibold text-content">Pengaturan Situs</h1>
        <p className="text-sm text-content-muted">
          Semua perubahan tampil di situs tanpa deploy ulang.
        </p>
      </div>

      <Tabs defaultValue="identity">
        <TabsList aria-label="Bagian pengaturan">
          <TabsTrigger value="identity">Identitas</TabsTrigger>
          <TabsTrigger value="home">Beranda</TabsTrigger>
          <TabsTrigger value="appearance">Tampilan</TabsTrigger>
          <TabsTrigger value="contact">Kontak</TabsTrigger>
          <TabsTrigger value="faq">FAQ</TabsTrigger>
          <TabsTrigger value="operational">Operasional</TabsTrigger>
          <TabsTrigger value="systemTexts">Teks sistem</TabsTrigger>
          <TabsTrigger value="integrations">Integrasi</TabsTrigger>
        </TabsList>

        {/* IDENTITAS */}
        <TabsContent value="identity">
          <div className="flex flex-col gap-4">
            <TextField
              id="identity-storeName"
              label="Nama toko"
              value={draft.identity.storeName}
              onChange={(v) => setField('identity', 'storeName', v)}
              maxLength={60}
            />
            <TextField
              id="identity-tagline"
              label="Tagline"
              value={draft.identity.tagline}
              onChange={(v) => setField('identity', 'tagline', v)}
              maxLength={120}
            />
            <TextField
              id="identity-seoTitle"
              label="Judul SEO (title)"
              value={draft.identity.seoTitle}
              onChange={(v) => setField('identity', 'seoTitle', v)}
              maxLength={70}
              hint="Kosongkan untuk memakai nama toko."
            />
            <AreaField
              id="identity-seoDescription"
              label="Deskripsi SEO (meta description)"
              value={draft.identity.seoDescription}
              onChange={(v) => setField('identity', 'seoDescription', v)}
              maxLength={160}
            />

            <PreviewBox title="Pratinjau identitas">
              <div className="flex items-center gap-3">
                {draft.identity.storeName ? (
                  <span className="text-sm font-semibold text-content">{draft.identity.storeName}</span>
                ) : (
                  <span className="text-sm text-content-faint">Nama toko belum diisi</span>
                )}
                {draft.identity.tagline ? (
                  <span className="text-sm text-content-muted">{draft.identity.tagline}</span>
                ) : null}
              </div>
              <p className="mt-2 text-xs text-content-faint">
                Pratinjau logo (tema gelap & terang) tersedia di kotak unggah di bawah.
              </p>
            </PreviewBox>

            <AssetField
              name="branding/logo"
              label="Logo"
              kind="logo"
              hint="Tampil di header dan footer. Bila kosong, nama toko ditampilkan sebagai teks."
            />
            <AssetField name="branding/favicon" label="Favicon" kind="favicon" hint="Ikon tab browser." />

            <SaveButton section="identity" saving={saving} onClick={(s) => void save(s)} />
          </div>
        </TabsContent>

        {/* BERANDA */}
        <TabsContent value="home">
          <div className="flex flex-col gap-4">
            <TextField
              id="home-eyebrow"
              label="Label eyebrow"
              value={draft.home.eyebrow}
              onChange={(v) => setField('home', 'eyebrow', v)}
              maxLength={60}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                id="home-headline1"
                label="Headline baris 1"
                value={draft.home.headline1}
                onChange={(v) => setField('home', 'headline1', v)}
                maxLength={80}
              />
              <TextField
                id="home-headline2"
                label="Headline baris 2 (aksen)"
                value={draft.home.headline2}
                onChange={(v) => setField('home', 'headline2', v)}
                maxLength={80}
              />
            </div>
            <AreaField
              id="home-subtext"
              label="Subteks"
              value={draft.home.subtext}
              onChange={(v) => setField('home', 'subtext', v)}
              maxLength={240}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                id="home-ctaPrimary"
                label="Tombol utama"
                value={draft.home.ctaPrimary}
                onChange={(v) => setField('home', 'ctaPrimary', v)}
                maxLength={40}
              />
              <TextField
                id="home-ctaSecondary"
                label="Tombol kedua"
                value={draft.home.ctaSecondary}
                onChange={(v) => setField('home', 'ctaSecondary', v)}
                maxLength={40}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <TextField
                id="home-chip1"
                label="Chip 1"
                value={draft.home.chip1}
                onChange={(v) => setField('home', 'chip1', v)}
                maxLength={40}
              />
              <TextField
                id="home-chip2"
                label="Chip 2"
                value={draft.home.chip2}
                onChange={(v) => setField('home', 'chip2', v)}
                maxLength={40}
              />
              <TextField
                id="home-chip3"
                label="Chip 3"
                value={draft.home.chip3}
                onChange={(v) => setField('home', 'chip3', v)}
                maxLength={40}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                id="home-helpBubble"
                label="Teks bubble bantuan"
                value={draft.home.helpBubble}
                onChange={(v) => setField('home', 'helpBubble', v)}
                maxLength={80}
              />
              <TextField
                id="home-helpChip"
                label="Label tombol bantuan"
                value={draft.home.helpChip}
                onChange={(v) => setField('home', 'helpChip', v)}
                maxLength={40}
              />
            </div>

            <PreviewBox title="Pratinjau beranda">
              <div className="flex flex-col gap-3">
                <p className="label-mono">{draft.home.eyebrow}</p>
                <p className="text-xl font-semibold leading-tight text-content">
                  {draft.home.headline1}
                  <br />
                  <span className="text-accent-gradient">{draft.home.headline2}</span>
                </p>
                {draft.home.subtext ? (
                  <p className="text-sm text-content-muted">{draft.home.subtext}</p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <span className="btn-accent inline-flex min-h-[36px] items-center rounded-full px-4 text-xs font-medium">
                    {draft.home.ctaPrimary}
                  </span>
                  <span className="inline-flex min-h-[36px] items-center rounded-full border border-line px-4 text-xs text-content">
                    {draft.home.ctaSecondary}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[draft.home.chip1, draft.home.chip2, draft.home.chip3].map((chip, i) =>
                    chip ? (
                      <span key={i} className="glass rounded-full px-3 py-1 text-[11px] text-content-muted">
                        {chip}
                      </span>
                    ) : null
                  )}
                </div>
                <span className="glass-strong w-fit rounded-xl px-3 py-1.5 text-xs text-content">
                  {draft.home.helpBubble}
                </span>
              </div>
            </PreviewBox>

            <AssetField
              name="branding/banner"
              label="Banner"
              kind="banner"
              hint="Tampil di bawah tombol beranda bila sudah diunggah."
            />

            <SaveButton section="home" saving={saving} onClick={(s) => void save(s)} />
          </div>
        </TabsContent>

        {/* TAMPILAN */}
        <TabsContent value="appearance">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="appearance-accent">Warna aksen utama</Label>
              <div className="flex items-center gap-3">
                <input
                  id="appearance-accent"
                  type="color"
                  value={draft.appearance.accent}
                  onChange={(e) => setField('appearance', 'accent', e.target.value)}
                  className="h-11 w-16 cursor-pointer rounded-xl border border-line bg-transparent p-1"
                  aria-label="Pilih warna aksen"
                />
                <Input
                  value={draft.appearance.accent}
                  onChange={(e) => setField('appearance', 'accent', e.target.value)}
                  maxLength={7}
                  className="max-w-[140px] font-mono"
                  aria-label="Kode warna aksen"
                />
              </div>
              <p className="text-xs text-content-faint">Format heksadesimal, contoh #e5334b.</p>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-2xl border border-line p-4">
              <div className="flex flex-col gap-0.5">
                <Label htmlFor="appearance-themeToggle">Toggle tema (gelap/terang)</Label>
                <p className="text-xs text-content-faint">Nonaktifkan untuk menyembunyikan tombol tema di situs.</p>
              </div>
              <Switch
                id="appearance-themeToggle"
                checked={draft.appearance.themeToggleEnabled}
                onCheckedChange={(checked) => setField('appearance', 'themeToggleEnabled', checked)}
              />
            </div>

            <TextField
              id="appearance-footerText"
              label="Teks footer"
              value={draft.appearance.footerText}
              onChange={(v) => setField('appearance', 'footerText', v)}
              maxLength={200}
            />

            <PreviewBox title="Pratinjau tampilan">
              <div className="flex flex-col gap-3">
                <div
                  className="h-10 rounded-xl"
                  style={{ background: `linear-gradient(90deg, ${accentVars.accent}, ${accentVars.accent2})` }}
                  aria-hidden
                />
                <span className="btn-accent inline-flex w-fit min-h-[36px] items-center rounded-full px-4 text-xs font-medium">
                  Contoh tombol
                </span>
                {draft.appearance.footerText ? (
                  <p className="text-xs text-content-muted">{draft.appearance.footerText}</p>
                ) : (
                  <p className="text-xs text-content-faint">Teks footer belum diisi</p>
                )}
              </div>
            </PreviewBox>

            <SaveButton section="appearance" saving={saving} onClick={(s) => void save(s)} />
          </div>
        </TabsContent>

        {/* KONTAK */}
        <TabsContent value="contact">
          <div className="flex flex-col gap-4">
            <TextField
              id="contact-whatsapp"
              label="WhatsApp"
              value={draft.contact.whatsapp}
              onChange={(v) => setField('contact', 'whatsapp', v)}
              maxLength={40}
              hint="Masukkan URL lengkap, contoh https://wa.me/..."
            />
            <TextField
              id="contact-telegram"
              label="Telegram"
              value={draft.contact.telegram}
              onChange={(v) => setField('contact', 'telegram', v)}
              maxLength={60}
              hint="Masukkan URL lengkap, contoh https://t.me/..."
            />
            <TextField
              id="contact-email"
              label="Email"
              value={draft.contact.email}
              onChange={(v) => setField('contact', 'email', v)}
              maxLength={100}
              hint="Masukkan URL mailto: atau alamat email."
            />

            <PreviewBox title="Pratinjau kontak">
              <div className="flex flex-col gap-1.5 text-sm text-content-muted">
                {(
                  [
                    ['WhatsApp', draft.contact.whatsapp],
                    ['Telegram', draft.contact.telegram],
                    ['Email', draft.contact.email],
                  ] as const
                ).map(([label, value]) =>
                  value ? (
                    <span key={label}>
                      {label}: {value}
                    </span>
                  ) : null
                )}
                {!draft.contact.whatsapp && !draft.contact.telegram && !draft.contact.email ? (
                  <span className="text-content-faint">Belum ada kontak. Tombol bantuan tidak ditampilkan.</span>
                ) : null}
              </div>
            </PreviewBox>

            <SaveButton section="contact" saving={saving} onClick={(s) => void save(s)} />
          </div>
        </TabsContent>

        {/* FAQ */}
        <TabsContent value="faq">
          <div className="flex flex-col gap-4">
            <FaqEditor items={draft.faq} onChange={(items) => setSection('faq', items)} />
            <SaveButton section="faq" saving={saving} onClick={(s) => void save(s)} />
          </div>
        </TabsContent>

        {/* OPERASIONAL */}
        <TabsContent value="operational">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-line p-4">
              <div className="flex flex-col gap-0.5">
                <Label htmlFor="operational-maintenance">Mode pemeliharaan</Label>
                <p className="text-xs text-content-faint">
                  Bila aktif, pengunjung melihat halaman pemeliharaan (admin tetap bisa masuk).
                </p>
              </div>
              <Switch
                id="operational-maintenance"
                checked={draft.operational.maintenanceMode}
                onCheckedChange={(checked) => setField('operational', 'maintenanceMode', checked)}
              />
            </div>
            <AreaField
              id="operational-message"
              label="Pesan pemeliharaan"
              value={draft.operational.maintenanceMessage}
              onChange={(v) => setField('operational', 'maintenanceMessage', v)}
              maxLength={300}
              hint="Kosongkan untuk memakai pesan bawaan dari Teks sistem."
            />

            <PreviewBox title="Pratinjau operasional">
              <p className="text-sm text-content-muted">
                {draft.operational.maintenanceMessage ||
                  settings?.systemTexts.messages.maintenance ||
                  'Pesan pemeliharaan.'}
              </p>
            </PreviewBox>

            <SaveButton section="operational" saving={saving} onClick={(s) => void save(s)} />
          </div>
        </TabsContent>

        {/* TEKS SISTEM */}
        <TabsContent value="systemTexts">
          <div className="flex flex-col gap-6">
            <fieldset className="flex flex-col gap-3">
              <legend className="label-mono mb-2">Nama & label menu</legend>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {MENU_KEYS.map((key) => (
                  <TextField
                    key={key}
                    id={`menu-${key}`}
                    label={GROUP_LABELS[key] ?? key}
                    value={draft.systemTexts.menu[key] ?? ''}
                    onChange={(v) =>
                      setSection('systemTexts', {
                        ...draft.systemTexts,
                        menu: { ...draft.systemTexts.menu, [key]: v },
                      })
                    }
                    maxLength={80}
                  />
                ))}
              </div>
            </fieldset>

            <fieldset className="flex flex-col gap-3">
              <legend className="label-mono mb-2">Judul halaman</legend>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {TITLE_KEYS.map((key) => (
                  <TextField
                    key={key}
                    id={`title-${key}`}
                    label={GROUP_LABELS[key] ?? key}
                    value={draft.systemTexts.titles[key] ?? ''}
                    onChange={(v) =>
                      setSection('systemTexts', {
                        ...draft.systemTexts,
                        titles: { ...draft.systemTexts.titles, [key]: v },
                      })
                    }
                    maxLength={80}
                  />
                ))}
              </div>
            </fieldset>

            <fieldset className="flex flex-col gap-3">
              <legend className="label-mono mb-2">Pesan sistem</legend>
              <div className="grid grid-cols-1 gap-4">
                {MESSAGE_KEYS.map((key) => (
                  <TextField
                    key={key}
                    id={`message-${key}`}
                    label={GROUP_LABELS[key] ?? key}
                    value={draft.systemTexts.messages[key] ?? ''}
                    onChange={(v) =>
                      setSection('systemTexts', {
                        ...draft.systemTexts,
                        messages: { ...draft.systemTexts.messages, [key]: v },
                      })
                    }
                    maxLength={120}
                  />
                ))}
              </div>
            </fieldset>

            <SaveButton section="systemTexts" saving={saving} onClick={(s) => void save(s)} />
          </div>
        </TabsContent>

        {/* INTEGRASI */}
        <TabsContent value="integrations">
          <div className="flex flex-col gap-4">
            <fieldset className="flex flex-col gap-4 rounded-2xl border border-line p-4">
              <legend className="label-mono mb-2">Reseller panel (FallZx)</legend>
              <p className="text-xs text-content-faint">
                Produk dengan jenis <span className="font-mono">reseller</span> dibayar via QRIS dari
                penyedia ini — bukan Pixpayz dan bukan saldo situs.
              </p>
              <TextField
                id="integration-reseller-base"
                label="Base URL API"
                value={draft.integrations?.resellerBaseUrl ?? ''}
                onChange={(v) => setField('integrations', 'resellerBaseUrl', v)}
                hint="Contoh: https://store.roselynsound.my.id/api/v1"
                maxLength={200}
              />
              <TextField
                id="integration-reseller-key"
                label="API key reseller"
                value={draft.integrations?.resellerApiKey ?? ''}
                onChange={(v) => setField('integrations', 'resellerApiKey', v)}
                hint="Format fzx_live_... dari dashboard reseller penyedia."
                maxLength={200}
              />
            </fieldset>

            <fieldset className="flex flex-col gap-4 rounded-2xl border border-line p-4">
              <legend className="label-mono mb-2">NOKOS (Axmisu)</legend>
              <p className="text-xs text-content-faint">
                Produk dengan jenis <span className="font-mono">nokos</span> dipesan dari Axmisu;
                saldo situs user dipotong, order dikirim ke API Axmisu.
              </p>
              <TextField
                id="integration-axmisu-base"
                label="Base URL API"
                value={draft.integrations?.axmisuBaseUrl ?? ''}
                onChange={(v) => setField('integrations', 'axmisuBaseUrl', v)}
                hint="Contoh: https://api.axmisu.com/v1"
                maxLength={200}
              />
              <TextField
                id="integration-axmisu-key"
                label="API key Axmisu"
                value={draft.integrations?.axmisuApiKey ?? ''}
                onChange={(v) => setField('integrations', 'axmisuApiKey', v)}
                hint="Bearer dari profil akun Axmisu."
                maxLength={200}
              />
            </fieldset>

            <SaveButton section="integrations" saving={saving} onClick={(s) => void save(s)} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
