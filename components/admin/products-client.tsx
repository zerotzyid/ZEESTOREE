'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
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
import { Textarea } from '@/components/ui/textarea';
import { FadeIn } from '@/components/anim';
import { cn } from '@/lib/cn';
import { formatRupiah } from '@/lib/format';
import { fileToCompressedDataUrl } from '@/lib/image-client';
import type { CategoryDoc, ProductDoc, ProductKind } from '@/lib/catalog';

const PAGE_SIZE = 8;

export const KIND_LABELS: Record<ProductKind, string> = {
  panel: 'Panel',
  digital: 'Digital',
  vps_trial: 'VPS Trial',
  lainnya: 'Lainnya',
  reseller: 'Reseller (QRIS)',
  nokos: 'NOKOS (Axmisu)',
};

type Product = ProductDoc & { id: string };
type Category = CategoryDoc & { id: string };
type PanelOption = { id: string; name: string; active: boolean };
type NestEggs = { nestId: number; nestName: string; eggs: Array<{ id: number; name: string }> };

type StatusFilter = 'all' | 'active' | 'inactive';

type FormState = {
  name: string;
  kind: ProductKind;
  categoryId: string;
  price: string;
  description: string;
  active: boolean;
};

type ProvisionForm = {
  panelId: string;
  eggId: string;
  memoryMb: string;
  swapMb: string;
  diskMb: string;
  cpuPercent: string;
  ioWeight: string;
  dockerImage: string;
  startup: string;
  environment: string;
  allocationMode: 'auto' | 'default';
  allocationId: string;
  databases: string;
  allocations: string;
  backups: string;
  durationDays: string;
};

const EMPTY_PROVISION: ProvisionForm = {
  panelId: '',
  eggId: '',
  memoryMb: '1024',
  swapMb: '0',
  diskMb: '2048',
  cpuPercent: '100',
  ioWeight: '500',
  dockerImage: '',
  startup: '',
  environment: '{}',
  allocationMode: 'auto',
  allocationId: '',
  databases: '0',
  allocations: '1',
  backups: '0',
  durationDays: '30',
};

type ResellerForm = { productId: string; variantId: string };
type NokosForm = { country: string; produk: string; operator: string; productId: string; maxPrice: string };

const EMPTY_RESELLER: ResellerForm = { productId: '', variantId: '' };
const EMPTY_NOKOS: NokosForm = { country: '6', produk: 'whatsapp', operator: 'any', productId: '', maxPrice: '' };

const EMPTY_FORM: FormState = {
  name: '',
  kind: 'lainnya',
  categoryId: '',
  price: '',
  description: '',
  active: true,
};

function num(value: string): number | null {
  const n = Number.parseInt(value.replace(/[^\d]/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

function parsePrice(value: string): number | null {
  const digits = value.replace(/[^\d]/g, '');
  if (!digits) return null;
  const n = Number.parseInt(digits, 10);
  return Number.isFinite(n) ? n : null;
}

async function readError(res: Response): Promise<string> {
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  return data?.error ?? `Permintaan gagal (${res.status}).`;
}

export function ProductsClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [panels, setPanels] = useState<PanelOption[]>([]);
  const [nests, setNests] = useState<NestEggs[]>([]);
  const [nestsLoading, setNestsLoading] = useState(false);
  const [nestsError, setNestsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [provision, setProvision] = useState<ProvisionForm>(EMPTY_PROVISION);
  const [reseller, setReseller] = useState<ResellerForm>(EMPTY_RESELLER);
  const [nokos, setNokos] = useState<NokosForm>(EMPTY_NOKOS);
  const [saving, setSaving] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [catOpen, setCatOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [pRes, cRes, panRes] = await Promise.all([
        fetch('/api/admin/products', { cache: 'no-store' }),
        fetch('/api/admin/categories', { cache: 'no-store' }),
        fetch('/api/admin/panels', { cache: 'no-store' }),
      ]);
      if (!pRes.ok) throw new Error(await readError(pRes));
      const pData = (await pRes.json()) as { products?: Product[] };
      setProducts(pData.products ?? []);
      if (cRes.ok) {
        const cData = (await cRes.json()) as { categories?: Category[] };
        setCategories(cData.categories ?? []);
      }
      if (panRes.ok) {
        const panData = (await panRes.json()) as { panels?: PanelOption[] };
        setPanels(panData.panels ?? []);
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Gagal memuat produk.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadNests = useCallback(async (panelId: string) => {
    if (!panelId) return;
    setNestsLoading(true);
    setNestsError(null);
    try {
      const res = await fetch(`/api/admin/panels/${panelId}/eggs`, { cache: 'no-store' });
      const data = (await res.json().catch(() => null)) as
        | { nests?: NestEggs[]; error?: string }
        | null;
      if (!res.ok || !data?.nests) {
        setNests([]);
        setNestsError(data?.error ?? 'Gagal memuat nest/egg. Isi Egg ID manual bila panel v2.');
        return;
      }
      setNests(data.nests);
    } finally {
      setNestsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const categoryName = useCallback(
    (id: string | null | undefined) =>
      id ? (categories.find((c) => c.id === id)?.name ?? '—') : 'Tanpa kategori',
    [categories]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (statusFilter === 'active' && !p.active) return false;
      if (statusFilter === 'inactive' && p.active) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [products, search, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setProvision(EMPTY_PROVISION);
    setReseller(EMPTY_RESELLER);
    setNokos(EMPTY_NOKOS);
    setNests([]);
    setNestsError(null);
    setDialogOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setForm({
      name: product.name,
      kind: product.kind,
      categoryId: product.categoryId ?? '',
      price: String(product.price),
      description: product.description,
      active: product.active,
    });
    const p = product.provision;
    setProvision(
      p
        ? {
            panelId: p.panelId ?? '',
            eggId: String(p.eggId ?? ''),
            memoryMb: String(p.memoryMb ?? 1024),
            swapMb: String(p.swapMb ?? 0),
            diskMb: String(p.diskMb ?? 2048),
            cpuPercent: String(p.cpuPercent ?? 100),
            ioWeight: String(p.ioWeight ?? 500),
            dockerImage: p.dockerImage ?? '',
            startup: p.startup ?? '',
            environment: JSON.stringify(p.environment ?? {}, null, 0),
            allocationMode: p.allocationMode ?? 'auto',
            allocationId: p.allocationId != null ? String(p.allocationId) : '',
            databases: String(p.databases ?? 0),
            allocations: String(p.allocations ?? 1),
            backups: String(p.backups ?? 0),
            durationDays: p.durationDays != null ? String(p.durationDays) : '30',
          }
        : EMPTY_PROVISION
    );
    setNests([]);
    setNestsError(null);
    if (product.provision?.panelId) void loadNests(product.provision.panelId);
    setReseller(
      product.reseller
        ? { productId: product.reseller.productId ?? '', variantId: product.reseller.variantId ?? '' }
        : EMPTY_RESELLER
    );
    setNokos(
      product.nokos
        ? {
            country: product.nokos.country || '6',
            produk: product.nokos.produk || '',
            operator: product.nokos.operator || 'any',
            productId: product.nokos.productId != null ? String(product.nokos.productId) : '',
            maxPrice: product.nokos.maxPrice != null ? String(product.nokos.maxPrice) : '',
          }
        : EMPTY_NOKOS
    );
    setDialogOpen(true);
  };

  const buildProvision = (): { ok: true; value: Record<string, unknown> | null } | { ok: false; error: string } => {
    if (form.kind !== 'panel') return { ok: true, value: null };
    if (!provision.panelId) return { ok: false, error: 'Pilih panel tujuan untuk produk panel.' };
    const eggId = num(provision.eggId);
    if (!eggId) return { ok: false, error: 'Egg ID wajib diisi untuk produk panel.' };
    const memoryMb = num(provision.memoryMb);
    const swapMb = num(provision.swapMb);
    const diskMb = num(provision.diskMb);
    const cpuPercent = num(provision.cpuPercent);
    const ioWeight = num(provision.ioWeight);
    if (memoryMb === null || swapMb === null || diskMb === null || cpuPercent === null || ioWeight === null) {
      return { ok: false, error: 'Limit resource (memory/swap/disk/cpu/io) harus angka.' };
    }
    let environment: Record<string, string> = {};
    try {
      const parsedEnv: unknown = JSON.parse(provision.environment || '{}');
      if (!parsedEnv || typeof parsedEnv !== 'object' || Array.isArray(parsedEnv)) {
        return { ok: false, error: 'Environment harus berupa objek JSON { "KEY": "value" }.' };
      }
      environment = Object.fromEntries(
        Object.entries(parsedEnv as Record<string, unknown>).map(([k, v]) => [k, String(v)])
      );
    } catch {
      return { ok: false, error: 'Environment bukan JSON yang valid.' };
    }
    if (provision.allocationMode === 'default' && !num(provision.allocationId)) {
      return { ok: false, error: 'Isi Allocation ID atau pakai mode auto.' };
    }
    return {
      ok: true,
      value: {
        panelId: provision.panelId,
        eggId,
        memoryMb,
        swapMb,
        diskMb,
        cpuPercent,
        ioWeight,
        dockerImage: provision.dockerImage.trim() || null,
        startup: provision.startup.trim() || null,
        environment,
        allocationMode: provision.allocationMode,
        allocationId: num(provision.allocationId),
        databases: num(provision.databases) ?? 0,
        allocations: num(provision.allocations) ?? 1,
        backups: num(provision.backups) ?? 0,
        durationDays: num(provision.durationDays) ?? 30,
      },
    };
  };

  const buildIntegrationCfg = ():
    | { ok: true; reseller: Record<string, unknown> | null; nokos: Record<string, unknown> | null }
    | { ok: false; error: string } => {
    if (form.kind === 'reseller') {
      if (!reseller.productId.trim()) {
        return { ok: false, error: 'ID produk reseller wajib diisi (dari katalog penyedia).' };
      }
      return {
        ok: true,
        reseller: { productId: reseller.productId.trim(), variantId: reseller.variantId.trim() || null },
        nokos: null,
      };
    }
    if (form.kind === 'nokos') {
      if (!nokos.produk.trim()) {
        return { ok: false, error: 'Kode layanan NOKOS wajib diisi (mis. whatsapp).' };
      }
      const productId = num(nokos.productId);
      const maxPrice = num(nokos.maxPrice);
      return {
        ok: true,
        reseller: null,
        nokos: {
          country: nokos.country.trim() || '6',
          produk: nokos.produk.trim(),
          operator: nokos.operator.trim() || 'any',
          productId,
          maxPrice,
        },
      };
    }
    return { ok: true, reseller: null, nokos: null };
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const price = parsePrice(form.price);
    if (!form.name.trim()) {
      toast.error('Nama produk wajib diisi.');
      return;
    }
    if (price === null) {
      toast.error('Harga harus berupa angka (boleh 0).');
      return;
    }
    setSaving(true);
    try {
      const built = buildProvision();
      if (!built.ok) {
        toast.error(built.error);
        return;
      }
      const integ = buildIntegrationCfg();
      if (!integ.ok) {
        toast.error(integ.error);
        return;
      }
      const payload = {
        name: form.name.trim(),
        kind: form.kind,
        categoryId: form.categoryId || null,
        price,
        description: form.description.trim(),
        active: form.active,
        provision: built.value,
        reseller: integ.reseller,
        nokos: integ.nokos,
      };

      if (editing) {
        const res = await fetch(`/api/admin/products/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await readError(res));
        toast.success('Produk diperbarui.');
      } else {
        const res = await fetch('/api/admin/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await readError(res));
        const data = (await res.json()) as { id?: string };
        toast.success('Produk dibuat. Unggah gambar lewat tombol Edit.');
        if (data.id) {
          await load();
          setDialogOpen(false);
          return;
        }
      }
      await load();
      setDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyimpan produk.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product: Product) => {
    if (!window.confirm(`Hapus produk "${product.name}"? Gambar produk ikut terhapus.`)) return;
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await readError(res));
      toast.success('Produk dihapus.');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menghapus produk.');
    }
  };

  const handleImageFile = async (file: File | undefined) => {
    if (!file || !editing) return;
    setImageBusy(true);
    try {
      const dataUrl = await fileToCompressedDataUrl(file, { maxSide: 1280, maxBytes: 500 * 1024 });
      const assetName = `products/${editing.id}`;
      const upRes = await fetch('/api/admin/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: assetName, dataUrl }),
      });
      if (!upRes.ok) throw new Error(await readError(upRes));
      if (editing.image !== assetName) {
        const patchRes = await fetch(`/api/admin/products/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: assetName }),
        });
        if (!patchRes.ok) throw new Error(await readError(patchRes));
      }
      toast.success('Gambar produk disimpan.');
      await load();
      setEditing((prev) => (prev ? { ...prev, image: assetName } : prev));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal mengunggah gambar.');
    } finally {
      setImageBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleImageDelete = async () => {
    if (!editing?.image) return;
    if (!window.confirm('Hapus gambar produk ini?')) return;
    setImageBusy(true);
    try {
      const res = await fetch(`/api/admin/assets?name=${encodeURIComponent(editing.image)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(await readError(res));
      const patchRes = await fetch(`/api/admin/products/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: null }),
      });
      if (!patchRes.ok) throw new Error(await readError(patchRes));
      toast.success('Gambar dihapus.');
      setEditing((prev) => (prev ? { ...prev, image: null } : prev));
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menghapus gambar.');
    } finally {
      setImageBusy(false);
    }
  };

  const imageSrc = editing?.image
    ? `/api/asset/${editing.image}?v=${editing.updatedAt ?? 0}`
    : null;

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex gap-3">
          <Skeleton className="h-11 flex-1" />
          <Skeleton className="h-11 w-32" />
        </div>
        <Skeleton className="h-12 w-full" />
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (loadError) {
    return (
      <EmptyState
        icon={ImageIcon}
        title="Gagal memuat produk"
        description={loadError}
        action={
          <Button type="button" variant="outline" onClick={() => void load()}>
            Coba lagi
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            aria-hidden
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-content-faint"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama produk…"
            className="pl-10"
            aria-label="Cari produk"
          />
        </div>
        <div className="flex gap-2">
          {(
            [
              ['all', 'Semua'],
              ['active', 'Aktif'],
              ['inactive', 'Nonaktif'],
            ] as Array<[StatusFilter, string]>
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatusFilter(value)}
              className={cn(
                'min-h-[40px] rounded-full border px-4 text-sm transition-colors',
                statusFilter === value
                  ? 'border-accent bg-accent-soft text-accent'
                  : 'border-line text-content-muted hover:bg-content/5'
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => setCatOpen(true)}>
            <FolderOpen aria-hidden size={16} />
            Kategori
          </Button>
          <Button type="button" onClick={openCreate}>
            <Plus aria-hidden size={16} />
            Produk
          </Button>
        </div>
      </div>

      {products.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="Belum ada produk"
          description="Tambahkan produk pertama Anda. Katalog kosong akan tampil bersih tanpa data dummy."
          action={
            <Button type="button" onClick={openCreate}>
              <Plus aria-hidden size={16} />
              Tambah Produk
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title="Tidak ada yang cocok" description="Ubah kata kunci atau filter status." />
      ) : (
        <>
          {/* Tabel desktop */}
          <div className="glass hidden overflow-hidden rounded-2xl md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line/60 text-left text-xs uppercase tracking-wider text-content-faint">
                  <th className="px-4 py-3 font-medium">Produk</th>
                  <th className="px-4 py-3 font-medium">Harga</th>
                  <th className="px-4 py-3 font-medium">Kategori</th>
                  <th className="px-4 py-3 font-medium">Jenis</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/50">
                {paged.map((product) => (
                  <tr key={product.id} className="transition-colors hover:bg-content/[0.03]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <ProductThumb product={product} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-content">{product.name}</p>
                          <p className="font-mono text-[11px] text-content-faint">{product.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-content">{formatRupiah(product.price)}</td>
                    <td className="px-4 py-3 text-content-muted">{categoryName(product.categoryId)}</td>
                    <td className="px-4 py-3">
                      <Badge variant="neutral">{KIND_LABELS[product.kind]}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={product.active ? 'success' : 'danger'}>
                        {product.active ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(product)}
                          aria-label={`Edit ${product.name}`}
                        >
                          <Pencil aria-hidden size={15} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => void handleDelete(product)}
                          aria-label={`Hapus ${product.name}`}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 aria-hidden size={15} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Kartu mobile */}
          <div className="flex flex-col gap-3 md:hidden">
            {paged.map((product) => (
              <FadeIn key={product.id} y={8}>
                <div className="glass flex flex-col gap-3 rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <ProductThumb product={product} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-content">{product.name}</p>
                      <p className="text-sm text-content">{formatRupiah(product.price)}</p>
                      <p className="mt-0.5 text-xs text-content-faint">
                        {categoryName(product.categoryId)} · {KIND_LABELS[product.kind]}
                      </p>
                    </div>
                    <Badge variant={product.active ? 'success' : 'danger'}>
                      {product.active ? 'Aktif' : 'Off'}
                    </Badge>
                  </div>
                  <div className="flex justify-end gap-2 border-t border-line/50 pt-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => openEdit(product)}>
                      <Pencil aria-hidden size={14} />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleDelete(product)}
                      className="text-red-400"
                    >
                      <Trash2 aria-hidden size={14} />
                      Hapus
                    </Button>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>

          {filtered.length > PAGE_SIZE ? (
            <div className="flex items-center justify-between">
              <p className="text-xs text-content-faint">
                {filtered.length} produk · halaman {safePage} dari {pageCount}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft aria-hidden size={14} />
                  Sebelumnya
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={safePage >= pageCount}
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                >
                  Berikutnya
                  <ChevronRight aria-hidden size={14} />
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}

      {/* Dialog produk */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Produk' : 'Tambah Produk'}</DialogTitle>
            <DialogDescription>
              {editing
                ? `Id produk: ${editing.id}`
                : 'Isi data produk. Gambar dapat diunggah setelah produk dibuat.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="product-name">Nama produk</Label>
                <Input
                  id="product-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="contoh: Paket Premium"
                  maxLength={100}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="product-kind">Jenis</Label>
                <select
                  id="product-kind"
                  value={form.kind}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, kind: e.target.value as ProductKind }))
                  }
                  className="min-h-[44px] rounded-xl border border-line bg-transparent px-3 text-sm text-content focus:border-accent focus:outline-none"
                >
                  {(Object.keys(KIND_LABELS) as ProductKind[]).map((kind) => (
                    <option key={kind} value={kind} className="bg-surface-raised text-content">
                      {KIND_LABELS[kind]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="product-category">Kategori</Label>
                <select
                  id="product-category"
                  value={form.categoryId}
                  onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                  className="min-h-[44px] rounded-xl border border-line bg-transparent px-3 text-sm text-content focus:border-accent focus:outline-none"
                >
                  <option value="" className="bg-surface-raised text-content">
                    Tanpa kategori
                  </option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id} className="bg-surface-raised text-content">
                      {cat.name}
                      {cat.active ? '' : ' (nonaktif)'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="product-price">Harga (Rp)</Label>
                <Input
                  id="product-price"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  inputMode="numeric"
                  placeholder="0"
                  required
                />
                {parsePrice(form.price) !== null ? (
                  <p className="text-xs text-content-faint">{formatRupiah(parsePrice(form.price) ?? 0)}</p>
                ) : null}
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3 sm:col-span-1">
                <div>
                  <Label htmlFor="product-active">Aktif</Label>
                  <p className="text-xs text-content-faint">Tampil di katalog publik.</p>
                </div>
                <Switch
                  id="product-active"
                  checked={form.active}
                  onCheckedChange={(checked) => setForm((f) => ({ ...f, active: checked }))}
                />
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="product-desc">Deskripsi</Label>
                <Textarea
                  id="product-desc"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={4}
                  maxLength={2000}
                  placeholder="Penjelasan singkat tentang produk ini."
                />
              </div>

              {form.kind === 'panel' ? (
                <div className="flex flex-col gap-4 rounded-xl border border-accent/30 bg-accent-soft/30 p-4 sm:col-span-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-content">Provisioning panel otomatis</p>
                      <p className="text-xs text-content-faint">
                        Server dibuat di Pterodactyl via Application API saat pelanggan checkout.
                        Gagal buat server = saldo otomatis dikembalikan.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="prov-panel">Panel tujuan</Label>
                      <select
                        id="prov-panel"
                        value={provision.panelId}
                        onChange={(e) => {
                          const panelId = e.target.value;
                          setProvision((p) => ({ ...p, panelId }));
                          setNests([]);
                          setNestsError(null);
                          if (panelId) void loadNests(panelId);
                        }}
                        className="min-h-[44px] rounded-xl border border-line bg-transparent px-3 text-sm text-content focus:border-accent focus:outline-none"
                      >
                        <option value="" className="bg-surface-raised text-content">
                          — pilih panel —
                        </option>
                        {panels
                          .filter((p) => p.active)
                          .map((p) => (
                            <option key={p.id} value={p.id} className="bg-surface-raised text-content">
                              {p.name}
                            </option>
                          ))}
                      </select>
                      {panels.filter((p) => p.active).length === 0 ? (
                        <p className="text-xs text-amber-400">
                          Belum ada panel aktif — tambahkan dulu di menu Panel.
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="prov-egg">Egg</Label>
                      <div className="flex gap-2">
                        <select
                          id="prov-egg"
                          value={provision.eggId}
                          onChange={(e) =>
                            setProvision((p) => ({ ...p, eggId: e.target.value }))
                          }
                          disabled={nestsLoading}
                          className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-line bg-transparent px-3 text-sm text-content focus:border-accent focus:outline-none disabled:opacity-60"
                        >
                          <option value="" className="bg-surface-raised text-content">
                            {nestsLoading
                              ? 'Memuat egg…'
                              : nests.length > 0
                                ? '— pilih egg —'
                                : 'Isi Egg ID manual'}
                          </option>
                          {nests.map((nest) => (
                            <optgroup
                              key={nest.nestId}
                              label={nest.nestName}
                              className="bg-surface-raised"
                            >
                              {nest.eggs.map((egg) => (
                                <option
                                  key={egg.id}
                                  value={String(egg.id)}
                                  className="bg-surface-raised text-content"
                                >
                                  {egg.name} (#{egg.id})
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!provision.panelId || nestsLoading}
                          onClick={() => void loadNests(provision.panelId)}
                          className="shrink-0"
                        >
                          {nestsLoading ? (
                            <Loader2 aria-hidden size={14} className="animate-spin" />
                          ) : (
                            'Muat'
                          )}
                        </Button>
                      </div>
                      <Input
                        value={provision.eggId}
                        onChange={(e) => setProvision((p) => ({ ...p, eggId: e.target.value }))}
                        inputMode="numeric"
                        placeholder="Egg ID (angka)"
                        aria-label="Egg ID"
                      />
                      {nestsError ? <p className="text-xs text-amber-400">{nestsError}</p> : null}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="prov-alloc-mode">Alokasi IP/port</Label>
                      <select
                        id="prov-alloc-mode"
                        value={provision.allocationMode}
                        onChange={(e) =>
                          setProvision((p) => ({
                            ...p,
                            allocationMode: e.target.value as 'auto' | 'default',
                          }))
                        }
                        className="min-h-[44px] rounded-xl border border-line bg-transparent px-3 text-sm text-content focus:border-accent focus:outline-none"
                      >
                        <option value="auto" className="bg-surface-raised text-content">
                          Auto (cari alokasi tersedia)
                        </option>
                        <option value="default" className="bg-surface-raised text-content">
                          Alokasi tetap (isi ID)
                        </option>
                      </select>
                      {provision.allocationMode === 'default' ? (
                        <Input
                          value={provision.allocationId}
                          onChange={(e) =>
                            setProvision((p) => ({ ...p, allocationId: e.target.value }))
                          }
                          inputMode="numeric"
                          placeholder="Allocation ID"
                          aria-label="Allocation ID"
                        />
                      ) : null}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          ['memoryMb', 'RAM (MB)'],
                          ['diskMb', 'Disk (MB)'],
                          ['swapMb', 'Swap (MB)'],
                        ] as const
                      ).map(([key, label]) => (
                        <div key={key} className="flex flex-col gap-1.5">
                          <Label htmlFor={`prov-${key}`}>{label}</Label>
                          <Input
                            id={`prov-${key}`}
                            value={provision[key]}
                            onChange={(e) => setProvision((p) => ({ ...p, [key]: e.target.value }))}
                            inputMode="numeric"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="prov-cpu">CPU (%)</Label>
                        <Input
                          id="prov-cpu"
                          value={provision.cpuPercent}
                          onChange={(e) =>
                            setProvision((p) => ({ ...p, cpuPercent: e.target.value }))
                          }
                          inputMode="numeric"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="prov-io">IO</Label>
                        <Input
                          id="prov-io"
                          value={provision.ioWeight}
                          onChange={(e) => setProvision((p) => ({ ...p, ioWeight: e.target.value }))}
                          inputMode="numeric"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="prov-db">Database</Label>
                        <Input
                          id="prov-db"
                          value={provision.databases}
                          onChange={(e) =>
                            setProvision((p) => ({ ...p, databases: e.target.value }))
                          }
                          inputMode="numeric"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="prov-alloc">Alokasi maks</Label>
                        <Input
                          id="prov-alloc"
                          value={provision.allocations}
                          onChange={(e) =>
                            setProvision((p) => ({ ...p, allocations: e.target.value }))
                          }
                          inputMode="numeric"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="prov-backup">Backup maks</Label>
                        <Input
                          id="prov-backup"
                          value={provision.backups}
                          onChange={(e) =>
                            setProvision((p) => ({ ...p, backups: e.target.value }))
                          }
                          inputMode="numeric"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="prov-duration">Kadaluarsa (hari)</Label>
                        <Input
                          id="prov-duration"
                          value={provision.durationDays}
                          onChange={(e) =>
                            setProvision((p) => ({ ...p, durationDays: e.target.value }))
                          }
                          inputMode="numeric"
                          placeholder="30"
                        />
                        <p className="text-xs text-content-faint">
                          Server akan dihapus otomatis setelah hari ini jika tidak diperpanjang.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="prov-docker">Docker image (opsional)</Label>
                      <Input
                        id="prov-docker"
                        value={provision.dockerImage}
                        onChange={(e) => setProvision((p) => ({ ...p, dockerImage: e.target.value }))}
                        placeholder="biarkan kosong untuk default egg"
                        maxLength={200}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="prov-startup">Startup command (opsional)</Label>
                      <Input
                        id="prov-startup"
                        value={provision.startup}
                        onChange={(e) => setProvision((p) => ({ ...p, startup: e.target.value }))}
                        placeholder="biarkan kosong untuk default egg"
                        maxLength={500}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5 sm:col-span-2">
                      <Label htmlFor="prov-env">Environment variables (JSON)</Label>
                      <Textarea
                        id="prov-env"
                        value={provision.environment}
                        onChange={(e) => setProvision((p) => ({ ...p, environment: e.target.value }))}
                        rows={3}
                        placeholder='{"KEY":"value"}'
                        className="font-mono text-xs"
                      />
                      <p className="text-xs text-content-faint">
                        Wajib diisi bila egg meminta variabel (cek halaman egg di panel).
                        Env var wajib egg lain ikut terisi otomatis saat checkout.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {form.kind === 'reseller' ? (
                <div className="flex flex-col gap-4 rounded-xl border border-accent/30 bg-accent-soft/30 p-4 sm:col-span-2">
                  <div>
                    <p className="text-sm font-medium text-content">Produk reseller (FallZx)</p>
                    <p className="text-xs text-content-faint">
                      Dibayar via QRIS penyedia — bukan Pixpayz, tanpa saldo situs. Isi ID produk dari
                      katalog penyedia (API key di Pengaturan → Integrasi).
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="res-product">ID produk reseller</Label>
                      <Input
                        id="res-product"
                        value={reseller.productId}
                        onChange={(e) => setReseller((r) => ({ ...r, productId: e.target.value }))}
                        placeholder="panel-private-1gb"
                        maxLength={80}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="res-variant">ID varian (opsional)</Label>
                      <Input
                        id="res-variant"
                        value={reseller.variantId}
                        onChange={(e) => setReseller((r) => ({ ...r, variantId: e.target.value }))}
                        placeholder="starter"
                        maxLength={80}
                      />
                    </div>
                  </div>
                </div>
              ) : null}

              {form.kind === 'nokos' ? (
                <div className="flex flex-col gap-4 rounded-xl border border-accent/30 bg-accent-soft/30 p-4 sm:col-span-2">
                  <div>
                    <p className="text-sm font-medium text-content">NOKOS (Axmisu)</p>
                    <p className="text-xs text-content-faint">
                      Saldo situs user dipotong saat checkout, order dikirim ke API Axmisu. Ambil
                      parameter dari katalog Axmisu (`/catalog?type=nokos-services|nokos-products`).
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="nk-country">ID negara</Label>
                      <Input
                        id="nk-country"
                        value={nokos.country}
                        onChange={(e) => setNokos((n) => ({ ...n, country: e.target.value }))}
                        placeholder="6 (Indonesia)"
                        maxLength={10}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="nk-produk">Kode layanan</Label>
                      <Input
                        id="nk-produk"
                        value={nokos.produk}
                        onChange={(e) => setNokos((n) => ({ ...n, produk: e.target.value }))}
                        placeholder="whatsapp"
                        maxLength={40}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="nk-operator">Operator</Label>
                      <Input
                        id="nk-operator"
                        value={nokos.operator}
                        onChange={(e) => setNokos((n) => ({ ...n, operator: e.target.value }))}
                        placeholder="any"
                        maxLength={40}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="nk-productid">Product ID (opsional)</Label>
                      <Input
                        id="nk-productid"
                        value={nokos.productId}
                        onChange={(e) => setNokos((n) => ({ ...n, productId: e.target.value }))}
                        inputMode="numeric"
                        placeholder="kosongkan = termurah"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="nk-maxprice">Batas harga (Rp, opsional)</Label>
                      <Input
                        id="nk-maxprice"
                        value={nokos.maxPrice}
                        onChange={(e) => setNokos((n) => ({ ...n, maxPrice: e.target.value }))}
                        inputMode="numeric"
                        placeholder="tanpa Product ID"
                      />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {editing ? (
              <div className="flex flex-col gap-3 rounded-xl border border-line p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-content">Gambar produk</p>
                    <p className="text-xs text-content-faint">PNG, JPG, atau WEBP. Maks 1280px & 500 KB.</p>
                  </div>
                  <Badge variant={editing.image ? 'success' : 'neutral'}>
                    {editing.image ? 'Terunggah' : 'Belum ada'}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-content/5">
                    {imageSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imageSrc} alt="Gambar produk" className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon aria-hidden size={20} className="text-content-faint" />
                    )}
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    aria-label="Pilih gambar produk"
                    onChange={(e) => void handleImageFile(e.target.files?.[0])}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={imageBusy}
                      onClick={() => fileRef.current?.click()}
                    >
                      {imageBusy ? (
                        <Loader2 aria-hidden size={14} className="animate-spin" />
                      ) : (
                        <Plus aria-hidden size={14} />
                      )}
                      {editing.image ? 'Ganti' : 'Unggah'}
                    </Button>
                    {editing.image ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={imageBusy}
                        onClick={() => void handleImageDelete()}
                        className="text-red-400"
                      >
                        <Trash2 aria-hidden size={14} />
                        Hapus
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Batal
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 aria-hidden size={16} className="animate-spin" /> : null}
                {editing ? 'Simpan Perubahan' : 'Buat Produk'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <CategoriesDialog open={catOpen} onOpenChange={setCatOpen} onChanged={load} />
    </div>
  );
}

function ProductThumb({ product }: { product: Product }) {
  const [failed, setFailed] = useState(false);
  const src = product.image && !failed ? `/api/asset/${product.image}?v=${product.updatedAt ?? 0}` : null;
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-content/5">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <ImageIcon aria-hidden size={17} className="text-content-faint" />
      )}
    </div>
  );
}

function CategoriesDialog({
  open,
  onOpenChange,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => Promise<void> | void;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [newOrder, setNewOrder] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/categories', { cache: 'no-store' });
      if (res.ok) {
        const data = (await res.json()) as { categories?: Category[] };
        setCategories(data.categories ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const addCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          order: Number.parseInt(newOrder, 10) || 0,
          active: true,
        }),
      });
      if (!res.ok) throw new Error(await readError(res));
      toast.success('Kategori ditambahkan.');
      setNewName('');
      setNewOrder('');
      await load();
      await onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menambah kategori.');
    } finally {
      setBusy(false);
    }
  };

  const patchCategory = async (id: string, patch: Partial<CategoryDoc>, label: string) => {
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(await readError(res));
      toast.success(`${label} kategori disimpan.`);
      await load();
      await onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyimpan kategori.');
      await load();
    }
  };

  const deleteCategory = async (category: Category) => {
    if (
      !window.confirm(
        `Hapus kategori "${category.name}"? Produk yang menggunakannya menjadi tanpa kategori.`
      )
    )
      return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/categories/${category.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await readError(res));
      toast.success('Kategori dihapus.');
      await load();
      await onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menghapus kategori.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kelola Kategori</DialogTitle>
          <DialogDescription>Urutkan, sembunyikan, atau hapus kategori katalog.</DialogDescription>
        </DialogHeader>

        <form onSubmit={addCategory} className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nama kategori baru"
              maxLength={60}
              aria-label="Nama kategori baru"
            />
            <Input
              value={newOrder}
              onChange={(e) => setNewOrder(e.target.value)}
              inputMode="numeric"
              placeholder="Urutan"
              className="w-24 shrink-0"
              aria-label="Urutan"
            />
          </div>
          <Button type="submit" variant="outline" size="sm" disabled={busy || !newName.trim()}>
            {busy ? <Loader2 aria-hidden size={14} className="animate-spin" /> : <Plus aria-hidden size={14} />}
            Tambah Kategori
          </Button>
        </form>

        <div className="flex flex-col gap-2">
          {loading ? (
            <Skeleton className="h-16 w-full" />
          ) : categories.length === 0 ? (
            <p className="py-3 text-center text-sm text-content-muted">
              Belum ada kategori. Anda tetap bisa membuat produk tanpa kategori.
            </p>
          ) : (
            categories.map((category) => (
              <div
                key={category.id}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-line p-3"
              >
                <Input
                  defaultValue={category.name}
                  onBlur={(e) => {
                    const value = e.target.value.trim();
                    if (value && value !== category.name) {
                      void patchCategory(category.id, { name: value }, 'Nama');
                    }
                  }}
                  aria-label={`Nama kategori ${category.name}`}
                  maxLength={60}
                  className="min-w-0 flex-1"
                />
                <Input
                  defaultValue={String(category.order ?? 0)}
                  onBlur={(e) => {
                    const value = Number.parseInt(e.target.value, 10);
                    if (Number.isFinite(value) && value !== category.order) {
                      void patchCategory(category.id, { order: value }, 'Urutan');
                    }
                  }}
                  inputMode="numeric"
                  aria-label={`Urutan kategori ${category.name}`}
                  className="w-20"
                />
                <Switch
                  checked={category.active}
                  onCheckedChange={(checked) =>
                    void patchCategory(category.id, { active: checked }, 'Status')
                  }
                  aria-label={`Status kategori ${category.name}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void deleteCategory(category)}
                  disabled={busy}
                  aria-label={`Hapus kategori ${category.name}`}
                  className="text-red-400"
                >
                  <Trash2 aria-hidden size={15} />
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
