/**
 * Teks awal situs sesuai spesifikasi pemilik (prompt/PRD).
 * Nilai di bawah HANYA ditulis ke RTDB saat setup pertama (lihat lib/settings.ts).
 * Setelah tersimpan, settings di RTDB yang menjadi sumber kebenaran
 * dan seluruhnya bisa diubah dari halaman admin tanpa deploy.
 */

export type FaqItem = { id: string; q: string; a: string };

/**
 * Kategori Panel (misal: Pterodactyl, Custom)
 */
export type PanelCategory = {
  id: string;
  key: string; // 'pterodactyl' | 'custom' | custom key
  name: string;
  description: string;
  icon: string; // lucide icon name
  active: boolean;
  sortOrder: number;
  // Pterodactyl-specific settings
  pterodactylPanelId?: string; // ID panel Pterodactyl untuk provisioning
};

/**
 * Tier RAM dalam kategori (misal: 1GB, 2GB, 4GB)
 */
export type PanelRamTier = {
  id: string;
  categoryId: string;
  name: string; // misal: "Lite", "Standard", "Elite"
  description: string;
  price: number; // per bulan
  durationDays: number;
  sortOrder: number;
  active: boolean;
  maxPurchasePerUser: number; // 0 = unlimited, 1 = sekali beli, 2 = maks 2 kali, dst.
  // Spesifikasi provisioning
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
};

export type PanelType = {
  id: string;
  name: string;
  description: string;
  price: number;
  durationDays: number;
  category: 'pterodactyl' | 'custom';
  provision: {
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
  } | null;
  active: boolean;
  sortOrder: number;
};

export type Settings = {
  identity: {
    storeName: string;
    tagline: string;
    seoTitle: string;
    seoDescription: string;
  };
  home: {
    eyebrow: string;
    headline1: string;
    headline2: string;
    subtext: string;
    ctaPrimary: string;
    ctaSecondary: string;
    chip1: string;
    chip2: string;
    chip3: string;
    helpBubble: string;
    helpChip: string;
  };
  appearance: {
    accent: string;
    themeToggleEnabled: boolean;
    footerText: string;
  };
  contact: {
    whatsapp: string;
    telegram: string;
    email: string;
  };
  faq: FaqItem[];
  operational: {
    maintenanceMode: boolean;
    maintenanceMessage: string;
  };
  systemTexts: {
    menu: Record<string, string>;
    titles: Record<string, string>;
    messages: Record<string, string>;
  };
  integrations: {
    resellerBaseUrl: string;
    resellerApiKey: string;
    axmisuBaseUrl: string;
    axmisuApiKey: string;
  };
  donation: {
    enabled: boolean;
    title: string;
    description: string;
    suggestedAmounts: number[];
    showCustomAmount: boolean;
    minAmount: number;
    maxAmount: number;
    qrImage: string;
    qrAlt: string;
  };
  branding: {
    logo: string;
    favicon: string;
    banner: string;
    donationQrLogo: string;
  };
  limits: {
    maxProductsPerUser: number;
  };
  // NEW: Panel Categories & RAM Tiers
  panelCategories: PanelCategory[];
  panelRamTiers: PanelRamTier[];
  // Legacy: Panel Types (for backward compatibility)
  panelTypes: PanelType[];
  oauth: {
    enabled: boolean;
    providers: Record<string, { enabled: boolean; clientId: string; clientSecret: string; name: string; icon?: string }>;
  };
};

export const DEFAULT_SETTINGS: Settings = {
  identity: {
    storeName: '',
    tagline: '',
    seoTitle: '',
    seoDescription: '',
  },
  home: {
    eyebrow: 'LAYANAN HOSTING',
    headline1: 'Layanan server.',
    headline2: 'Tanpa alur ribet.',
    subtext: 'Panel server, VPS trial, source code, dan saldo akun dalam satu tempat.',
    ctaPrimary: 'Lihat produk ->',
    ctaSecondary: 'Buat akun',
    chip1: 'Checkout saldo',
    chip2: 'Riwayat pesanan',
    chip3: 'Dashboard akun',
    helpBubble: 'Ada kendala? Kami siap bantu',
    helpChip: 'Bantuan pelanggan',
  },
  appearance: {
    accent: '#e5334b',
    themeToggleEnabled: true,
    footerText: '',
  },
  contact: {
    whatsapp: '',
    telegram: '',
    email: '',
  },
  faq: [],
  operational: {
    maintenanceMode: false,
    maintenanceMessage: '',
  },
  systemTexts: {
    menu: {
      home: 'Beranda',
      products: 'Produk',
      faq: 'FAQ',
      dashboard: 'Dashboard',
      orders: 'Riwayat pesanan',
      transactions: 'Riwayat transaksi',
      profile: 'Profil',
      deposit: 'Deposit',
      voucher: 'Voucher',
      nokos: 'Nomor Virtual',
      login: 'Masuk',
      register: 'Daftar',
      donation: 'Donasi',
    },
    titles: {
      home: '',
      login: 'Masuk',
      register: 'Daftar',
      dashboard: 'Dashboard',
      maintenance: 'Pemeliharaan',
      notFound: 'Halaman tidak ditemukan',
    },
    messages: {
      emptyProducts: 'Belum ada produk.',
      emptyOrders: 'Belum ada pesanan.',
      emptyTransactions: 'Belum ada transaksi.',
      comingSoonNokos: 'Segera hadir.',
      maintenance: 'Situs sedang dalam pemeliharaan. Silakan kembali lagi nanti.',
      loginRequired: 'Silakan masuk terlebih dahulu.',
    },
  },
  integrations: {
    resellerBaseUrl: 'https://store.roselynsound.my.id/api/v1',
    resellerApiKey: '',
    axmisuBaseUrl: 'https://api.axmisu.com/v1',
    axmisuApiKey: '',
  },
  donation: {
    enabled: false,
    title: 'Dukung Kami',
    description: 'Donasi Anda membantu menjaga layanan ini tetap berjalan dan dikembangkan. Setiap kontribusi sangat dihargai.',
    suggestedAmounts: [10000, 25000, 50000, 100000],
    showCustomAmount: true,
    minAmount: 5000,
    maxAmount: 10000000,
    qrImage: '',
    qrAlt: 'QRIS Donasi',
  },
  branding: {
    logo: '',
    favicon: '',
    banner: '',
    donationQrLogo: '',
  },
  limits: {
    maxProductsPerUser: 5,
  },
  // NEW: Panel Categories & RAM Tiers
  panelCategories: [
    {
      id: 'cat-pterodactyl',
      key: 'pterodactyl',
      name: 'Panel Pterodactyl',
      description: 'Panel server game dengan provisioning otomatis ke Pterodactyl. Pilih RAM, lalu pilih jenis game (egg).',
      icon: 'Server',
      active: true,
      sortOrder: 1,
      pterodactylPanelId: '',
    },
    {
      id: 'cat-custom',
      key: 'custom',
      name: 'Panel Custom',
      description: 'Panel dengan konfigurasi manual atau panel lain non-Pterodactyl.',
      icon: 'Box',
      active: true,
      sortOrder: 2,
    },
  ],
  panelRamTiers: [
    {
      id: 'tier-lite',
      categoryId: 'cat-pterodactyl',
      name: 'Lite',
      description: 'Hemat untuk server game ringan / development',
      price: 35000,
      durationDays: 30,
      sortOrder: 1,
      active: true,
      maxPurchasePerUser: 0, // unlimited
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
    },
    {
      id: 'tier-standard',
      categoryId: 'cat-pterodactyl',
      name: 'Standard',
      description: 'Standar untuk server game ringan hingga menengah',
      price: 75000,
      durationDays: 30,
      sortOrder: 2,
      active: true,
      maxPurchasePerUser: 0, // unlimited
      provision: {
        memoryMb: 2048,
        swapMb: 256,
        diskMb: 5120,
        cpuPercent: 100,
        ioWeight: 500,
        dockerImage: null,
        startup: null,
        environment: {},
        allocationMode: 'auto',
        allocationId: null,
        databases: 3,
        allocations: 3,
        backups: 2,
      },
    },
    {
      id: 'tier-elite',
      categoryId: 'cat-pterodactyl',
      name: 'Elite',
      description: 'Premium dengan spesifikasi tinggi untuk server game berat',
      price: 150000,
      durationDays: 30,
      sortOrder: 3,
      active: true,
      maxPurchasePerUser: 0, // unlimited
      provision: {
        memoryMb: 4096,
        swapMb: 512,
        diskMb: 10240,
        cpuPercent: 200,
        ioWeight: 500,
        dockerImage: null,
        startup: null,
        environment: {},
        allocationMode: 'auto',
        allocationId: null,
        databases: 5,
        allocations: 5,
        backups: 3,
      },
    },
  ],
  // Legacy: Panel Types (kept for backward compatibility during migration)
  panelTypes: [
    {
      id: 'panel-elite',
      name: 'Panel Elite',
      description: 'Panel premium dengan spesifikasi tinggi untuk server game berat',
      price: 150000,
      durationDays: 30,
      category: 'pterodactyl',
      provision: {
        panelId: '',
        eggId: 1,
        memoryMb: 4096,
        swapMb: 512,
        diskMb: 10240,
        cpuPercent: 200,
        ioWeight: 500,
        dockerImage: null,
        startup: null,
        environment: {},
        allocationMode: 'auto',
        allocationId: null,
        databases: 5,
        allocations: 5,
        backups: 3,
      },
      active: true,
      sortOrder: 1,
    },
    {
      id: 'panel-standard',
      name: 'Panel Standar',
      description: 'Panel standar untuk server game ringan hingga menengah',
      price: 75000,
      durationDays: 30,
      category: 'pterodactyl',
      provision: {
        panelId: '',
        eggId: 1,
        memoryMb: 2048,
        swapMb: 256,
        diskMb: 5120,
        cpuPercent: 100,
        ioWeight: 500,
        dockerImage: null,
        startup: null,
        environment: {},
        allocationMode: 'auto',
        allocationId: null,
        databases: 3,
        allocations: 3,
        backups: 2,
      },
      active: true,
      sortOrder: 2,
    },
    {
      id: 'panel-lite',
      name: 'Panel Lite',
      description: 'Panel hemat untuk server game ringan / development',
      price: 35000,
      durationDays: 30,
      category: 'pterodactyl',
      provision: {
        panelId: '',
        eggId: 1,
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
      active: true,
      sortOrder: 3,
    },
  ],
  oauth: {
    enabled: false,
    providers: {
      google: {
        enabled: false,
        clientId: '',
        clientSecret: '',
        name: 'Google',
        icon: 'google',
      },
      github: {
        enabled: false,
        clientId: '',
        clientSecret: '',
        name: 'GitHub',
        icon: 'github',
      },
    },
  },
};