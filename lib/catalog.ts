/** Tipe dokumen katalog (produk & kategori) di Realtime Database. */

export type ProductKind =
  | 'panel'
  | 'digital'
  | 'vps_trial'
  | 'lainnya'
  | 'reseller'
  | 'nokos';

/** Konfigurasi produk reseller (FallZx) — pembayaran QRIS eksternal, tanpa saldo. */
export type ResellerConfig = {
  productId: string;
  variantId: string | null;
};

/** Konfigurasi produk NOKOS (Axmisu) — dipesan dari saldo situs via Axmisu. */
export type NokosConfig = {
  country: string;
  produk: string;
  operator: string;
  productId: number | null;
  maxPrice: number | null;
};

/**
 * Konfigurasi pembuatan server otomatis untuk produk kind='panel'.
 * Semua nilai diisi admin dari data panel masing-masing (egg, alokasi, limit).
 */
export type ProvisionConfig = {
  panelId: string;
  eggId: number;
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

export type ProductDoc = {
  name: string;
  description: string;
  price: number;
  categoryId: string | null;
  image: string | null;
  kind: ProductKind;
  active: boolean;
  provision?: ProvisionConfig | null;
  reseller?: ResellerConfig | null;
  nokos?: NokosConfig | null;
  createdAt: number;
  updatedAt: number;
};

export type CategoryDoc = {
  name: string;
  order: number;
  active: boolean;
  createdAt: number;
};

/** Voucher System */
export type VoucherDoc = {
  code: string;           // Kode voucher (uppercase, alphanumeric)
  type: 'balance' | 'discount' | 'product'; // Jenis voucher
  value: number;          // Nominal (balance) atau persen (discount) atau productId (product)
  productId?: string;     // Untuk tipe 'product': produk yang gratis/diskon
  discountPercent?: number; // Untuk tipe 'discount': persen diskon (1-100)
  maxUses: number;        // Maksimal penggunaan total
  usedCount: number;      // Sudah digunakan berapa kali
  maxPerUser: number;     // Maks per user (default 1)
  minPurchase?: number;   // Minimal belanja untuk bisa pakai voucher
  expiresAt?: number;     // Timestamp expired (null = tidak expired)
  active: boolean;        // Aktif/tidak
  createdAt: number;
  createdBy: string;      // Admin yang buat
  description?: string;   // Deskripsi internal admin
};

export type VoucherValidationResult = {
  valid: boolean;
  voucher?: VoucherDoc;
  error?: string;
  discountAmount?: number; // Jumlah potongan harga
  finalPrice?: number;     // Harga akhir setelah voucher
  freeProduct?: boolean;   // Apakah produk gratis (tipe product)
};