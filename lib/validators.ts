import { z } from 'zod';

const username = z
  .string()
  .trim()
  .min(3, 'Username minimal 3 karakter.')
  .max(24, 'Username maksimal 24 karakter.')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username hanya boleh huruf, angka, dan underscore.');

const email = z
  .string()
  .trim()
  .min(5, 'Email tidak valid.')
  .max(100, 'Email maksimal 100 karakter.')
  .email('Format email tidak valid.');

const password = z
  .string()
  .min(8, 'Password minimal 8 karakter.')
  .max(72, 'Password maksimal 72 karakter.');

export const registerSchema = z.object({
  username,
  email,
  password,
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(3, 'Masukkan username atau email.').max(100),
  password: z.string().min(1, 'Masukkan password.').max(100),
});

const accent = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Warna harus berupa heksadesimal 6 digit, contoh #e5334b.');

const shortText = (max: number) => z.string().trim().max(max, `Maksimal ${max} karakter.`);
const longText = (max: number) => z.string().max(max, `Maksimal ${max} karakter.`);

export const identitySettingsSchema = z.object({
  storeName: shortText(60),
  tagline: shortText(120),
  seoTitle: shortText(70),
  seoDescription: shortText(160),
});

export const homeSettingsSchema = z.object({
  eyebrow: shortText(60),
  headline1: shortText(80),
  headline2: shortText(80),
  subtext: shortText(240),
  ctaPrimary: shortText(40),
  ctaSecondary: shortText(40),
  chip1: shortText(40),
  chip2: shortText(40),
  chip3: shortText(40),
  helpBubble: shortText(80),
  helpChip: shortText(40),
});

export const appearanceSettingsSchema = z.object({
  accent,
  themeToggleEnabled: z.boolean(),
  footerText: shortText(200),
});

export const contactSettingsSchema = z.object({
  whatsapp: shortText(40),
  telegram: shortText(60),
  email: shortText(100),
});

export const donationSettingsSchema = z.object({
  enabled: z.boolean(),
  title: shortText(60),
  description: longText(300),
  suggestedAmounts: z.array(z.number().int().positive()).max(20),
  showCustomAmount: z.boolean(),
  minAmount: z.number().int().min(0),
  maxAmount: z.number().int().min(0),
  qrImage: shortText(200).nullable().optional(),
  qrAlt: shortText(120).nullable().optional(),
});

const oauthProviderSchema = z.object({
  enabled: z.boolean(),
  clientId: shortText(100),
  clientSecret: shortText(200),
  name: shortText(30),
  icon: shortText(20).nullable().optional(),
});

export const oauthSettingsSchema = z.object({
  enabled: z.boolean(),
  providers: z.record(oauthProviderSchema),
});

export const faqSettingsSchema = z
  .array(
    z.object({
      id: z.string().min(1).max(40),
      q: shortText(200),
      a: longText(2000),
    })
  )
  .max(50, 'FAQ maksimal 50 item.');

export const operationalSettingsSchema = z.object({
  maintenanceMode: z.boolean(),
  maintenanceMessage: shortText(300),
});

const stringMap = z.record(z.string().max(80), shortText(120));

export const systemTextsSettingsSchema = z.object({
  menu: stringMap,
  titles: stringMap,
  messages: stringMap,
});

export const integrationsSettingsSchema = z.object({
  resellerBaseUrl: z.string().trim().url('URL tidak valid.').max(200),
  resellerApiKey: shortText(200),
  axmisuBaseUrl: z.string().trim().url('URL tidak valid.').max(200),
  axmisuApiKey: shortText(200),
});

const provisionSchema = z.object({
  panelId: z.string().trim().min(1).max(60),
  eggId: z.number().int().min(1).max(999999),
  memoryMb: z.number().int().min(16).max(1048576),
  swapMb: z.number().int().min(0).max(1048576),
  diskMb: z.number().int().min(16).max(1048576),
  cpuPercent: z.number().int().min(0).max(100000),
  ioWeight: z.number().int().min(10).max(1000),
  dockerImage: z.string().trim().max(200).nullable(),
  startup: z.string().trim().max(500).nullable(),
  environment: z.record(z.string().max(80), z.string().max(300)),
  allocationMode: z.enum(['auto', 'default']),
  allocationId: z.number().int().min(1).max(999999).nullable(),
  databases: z.number().int().min(0).max(100),
  allocations: z.number().int().min(0).max(100),
  backups: z.number().int().min(0).max(100),
  durationDays: z.number().int().min(1).max(3650).default(30),
});

const panelTypeSchema = z.object({
  id: z.string().trim().min(1).max(60),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500),
  price: z.number().int().min(0).max(1000000000),
  durationDays: z.number().int().min(1).max(3650),
  category: z.enum(['pterodactyl', 'custom']).default('pterodactyl'),
  provision: provisionSchema.nullable(),
  active: z.boolean(),
  sortOrder: z.number().int().min(0).max(9999),
});

export const panelTypesSettingsSchema = z.array(panelTypeSchema).max(20);

export const limitsSettingsSchema = z.object({
  maxProductsPerUser: z.number().int().min(1).max(100),
});

export const settingsPatchSchema = z
  .object({
    identity: identitySettingsSchema.optional(),
    home: homeSettingsSchema.optional(),
    appearance: appearanceSettingsSchema.optional(),
    contact: contactSettingsSchema.optional(),
    donation: donationSettingsSchema.optional(),
    oauth: oauthSettingsSchema.optional(),
    faq: faqSettingsSchema.optional(),
    operational: operationalSettingsSchema.optional(),
    systemTexts: systemTextsSettingsSchema.optional(),
    integrations: integrationsSettingsSchema.optional(),
    limits: limitsSettingsSchema.optional(),
    panelTypes: panelTypesSettingsSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Tidak ada bagian yang dikirim.' });

const DATA_URL_RE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/;
const ASSET_NAME_RE = /^[a-zA-Z0-9_.\-/]{1,120}$/;

export const assetUploadSchema = z.object({
  name: z
    .string()
    .regex(ASSET_NAME_RE, 'Nama aset tidak valid. Hanya huruf, angka, garis bawah, titik, strip, dan garis miring. Contoh: products/sepatu-merah, foto/profil, slider/utama.'),
  dataUrl: z
    .string()
    .regex(DATA_URL_RE, 'Format gambar harus PNG, JPG, atau WEBP (data URL base64).')
    .max(1_200_000, 'Gambar terlalu besar setelah kompresi.'),
});

/** Jenis produk — nilai mengikuti cakupan PRD (panel, produk digital, VPS trial, lainnya). */
export const productKind = z.enum(['panel', 'digital', 'vps_trial', 'lainnya', 'reseller', 'nokos']);

const resellerSchema = z.object({
  productId: z.string().trim().min(1, 'ID produk reseller wajib diisi.').max(80),
  variantId: z.string().trim().max(80).nullable(),
});

const nokosSchema = z.object({
  country: z.string().trim().min(1).max(10),
  produk: z.string().trim().min(1).max(40),
  operator: z.string().trim().min(1).max(40),
  productId: z.number().int().min(1).nullable(),
  maxPrice: z.number().int().min(1).nullable(),
});

export const productCreateSchema = z.object({
  name: z.string().trim().min(1, 'Nama produk wajib diisi.').max(100),
  description: z.string().trim().max(2000, 'Deskripsi maksimal 2000 karakter.'),
  price: z.number().int().min(0, 'Harga tidak valid.').max(10_000_000_000),
  categoryId: z.string().trim().max(60).nullable(),
  kind: productKind,
  active: z.boolean(),
  provision: provisionSchema.nullable().optional(),
  reseller: resellerSchema.nullable().optional(),
  nokos: nokosSchema.nullable().optional(),
});

export const productPatchSchema = productCreateSchema
  .partial()
  .extend({
    image: z
      .string()
      .regex(/^products\/[a-zA-Z0-9_.\-/]{1,60}$/, 'Nama gambar produk tidak valid. Contoh: products/sepatu-merah.')
      .nullable()
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Tidak ada perubahan untuk disimpan.',
  });

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(1, 'Nama kategori wajib diisi.').max(60),
  order: z.number().int().min(0).max(9999),
  active: z.boolean(),
});

export const categoryPatchSchema = categoryCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Tidak ada perubahan untuk disimpan.',
  });
