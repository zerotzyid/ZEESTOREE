'use client';

import { useRef, useState } from 'react';
import { Loader2, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useSettings } from '@/components/settings-provider';
import { Button } from '@/components/ui/button';
import { fileToCompressedDataUrl } from '@/lib/image-client';

type AssetKind = 'logo' | 'favicon' | 'banner' | 'donationQrLogo';

const LIMITS: Record<AssetKind, { maxSide: number; maxBytes: number }> = {
  logo: { maxSide: 512, maxBytes: 200 * 1024 },
  favicon: { maxSide: 512, maxBytes: 200 * 1024 },
  banner: { maxSide: 1600, maxBytes: 500 * 1024 },
  donationQrLogo: { maxSide: 512, maxBytes: 200 * 1024 },
};

type Props = {
  name: string;
  label: string;
  kind: AssetKind;
  hint?: string;
};

export function AssetField({ name, label, kind, hint }: Props) {
  const { assets, refresh } = useSettings();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);

  const exists = assets[kind];
  const src = exists ? `/api/asset/${name}${version ? `?v=${version}` : ''}` : null;

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await fileToCompressedDataUrl(file, LIMITS[kind]);
      const res = await fetch('/api/admin/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, dataUrl }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Gagal mengunggah gambar.');
      setVersion(Date.now());
      await refresh();
      toast.success(`${label} berhasil disimpan.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal mengunggah gambar.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Hapus ${label}?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/assets?name=${encodeURIComponent(name)}`, {
        method: 'DELETE',
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Gagal menghapus gambar.');
      setVersion(Date.now());
      await refresh();
      toast.success(`${label} dihapus.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menghapus gambar.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line p-4">
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-medium text-content">{label}</p>
        {hint ? <p className="text-xs text-content-faint">{hint}</p> : null}
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            {/* Pratinjau tema gelap */}
            <div className="flex h-16 min-w-[96px] items-center justify-center rounded-xl border border-line bg-[#14171d] p-2">
              {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt={`${label} (pratinjau gelap)`} className="max-h-12 max-w-[80px] object-contain" />
              ) : (
                <span className="font-mono text-[10px] text-white/40">gelap</span>
              )}
            </div>
            {/* Pratinjau tema terang */}
            <div className="flex h-16 min-w-[96px] items-center justify-center rounded-xl border border-line bg-[#f7f8fa] p-2">
              {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt={`${label} (pratinjau terang)`} className="max-h-12 max-w-[80px] object-contain" />
              ) : (
                <span className="font-mono text-[10px] text-[#14171d]/40">terang</span>
              )}
            </div>
          </div>
          {kind === 'banner' && src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={`${label} (pratinjau)`} className="w-full max-w-md rounded-xl border border-line object-cover" />
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            aria-label={`Pilih file ${label}`}
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              {busy ? <Loader2 aria-hidden size={14} className="animate-spin" /> : <Upload aria-hidden size={14} />}
              {exists ? 'Ganti' : 'Unggah'}
            </Button>
            {exists ? (
              <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => void handleDelete()}>
                <Trash2 aria-hidden size={14} />
                Hapus
              </Button>
            ) : null}
          </div>
          <p className="max-w-[220px] text-xs text-content-faint">
            PNG, JPG, atau WEBP. {kind === 'banner' ? 'Maks 1600px & 500 KB' : 'Maks 512px & 200 KB'} setelah kompresi.
          </p>
        </div>
      </div>
    </div>
  );
}
