/**
 * Teks awal situs sesuai spesifikasi pemilik (prompt/PRD).
 * Nilai di bawah HANYA ditulis ke RTDB saat setup pertama (lihat lib/settings.ts).
 * Setelah tersimpan, settings di RTDB yang menjadi sumber kebenaran
 * dan seluruhnya bisa diubah dari halaman admin tanpa deploy.
 */

export type FaqItem = { id: string; q: string; a: string };

/**
 * Panel Tier - Utama/Kategori Utama
 * Mewakili instalasi Pterodactyl yang berbeda (Panel 1, Panel 2, dll)
 * Setiap tier punya API/panel Pterodactyl sendiri
 */
export type PanelTier = {
  id: string;
  key: string; // unique key untuk routing, misal: 'panel-1', 'panel-sgp', 'panel-us'
  name: string; // misal: 'Panel Indonesia 1', 'Panel Singapore', 'Panel US East'
  description: string;
  icon: string; // lucide icon name
  active: boolean;
  sortOrder: number;
  // Pterodactyl API Configuration untuk tier ini
  pterodactyl: {
    panelId: string; // ID panel di Pterodactyl (untuk provisioning)
    baseUrl: string; // Base URL Pterodactyl panel ini
    apiKey: string; // API Key untuk panel ini
  };
};

/**
 * RAM Option - Opsi RAM dalam Tier
 * 1GB, 2GB, 3GB, 4GB, Custom (max 10GB)
 */
export type PanelRamOption = {
  id: string;
  tierId: string;
  name: string; // misal: '1GB', '2GB', '4GB', 'Custom'
  memoryMb: number; // RAM dalam MB
  price: number; // harga per bulan untuk RAM ini
  durationDays: number;
  maxPurchasePerUser: number; // 0 = unlimited
  active: boolean;
  sortOrder: number;
  isCustom: boolean; // true jika ini opsi custom (user input manual)
  customMaxMb?: number; // max RAM untuk custom (default 10240 = 10GB)
};

/**
 * CPU Option - Opsi CPU dalam Tier
 * 500%, Unlimited, dll
 */
export type PanelCpuOption = {
  id: string;
  tierId: string;
  name: string; // misal: '500%', 'Unlimited'
  cpuPercent: number; // persentase CPU, 0 = unlimited
  priceModifier: number; // tambahan harga di atas harga RAM
  active: boolean;
  sortOrder: number;
};

/**
 * Disk Option - Opsi Disk/Storage dalam Tier
 */
export type PanelDiskOption = {
  id: string;
  tierId: string;
  name: string; // misal: '10GB', '20GB', '50GB', 'Custom'
  diskMb: number; // disk dalam MB
  priceModifier: number; // tambahan harga di atas harga RAM
  active: boolean;
  sortOrder: number;
  isCustom: boolean;
  customMaxMb?: number;
};

/**
 * Kategori Panel (misal: Pterodactyl, Custom) - LEGACY
 * @deprecated Use PanelTier instead
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
 * Tier RAM dalam kategori (misal: 1GB, 2GB, 4GB) - LEGACY
 * @deprecated Use PanelRamOption instead
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

/**
 * Legacy PanelType (untuk backward compatibility)
 */
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
  // NEW: Panel Tier System
  panelTiers: PanelTier[];
  panelRamOptions: PanelRamOption[];
  panelCpuOptions: PanelCpuOption[];
  panelDiskOptions: PanelDiskOption[];
  // Legacy (for backward compatibility with admin settings)
  panelCategories: PanelCategory[];
  panelRamTiers: PanelRamTier[];
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
  // NEW: Panel Tier System
  panelTiers: [
    {
      id: 'tier-panel-1',
      key: 'panel-1',
      name: 'Panel Indonesia 1',
      description: 'Server Pterodactyl berlokasi di Indonesia dengan latensi rendah.',
      icon: 'Server',
      active: true,
      sortOrder: 1,
      pterodactyl: {
        panelId: '',
        baseUrl: 'https://panel1.example.com',
        apiKey: '',
      },
    },
    {
      id: 'tier-panel-2',
      key: 'panel-2',
      name: 'Panel Singapore',
      description: 'Server Pterodactyl berlokasi di Singapore untuk performa Asia optimal.',
      icon: 'Server',
      active: true,
      sortOrder: 2,
      pterodactyl: {
        panelId: '',
        baseUrl: 'https://panel2.example.com',
        apiKey: '',
      },
    },
  ],
  panelRamOptions: [
    // Tier 1 RAM Options
    { id: 'ram-1gb-1', tierId: 'tier-panel-1', name: '1GB', memoryMb: 1024, price: 25000, durationDays: 30, maxPurchasePerUser: 0, active: true, sortOrder: 1, isCustom: false },
    { id: 'ram-2gb-1', tierId: 'tier-panel-1', name: '2GB', memoryMb: 2048, price: 50000, durationDays: 30, maxPurchasePerUser: 0, active: true, sortOrder: 2, isCustom: false },
    { id: 'ram-3gb-1', tierId: 'tier-panel-1', name: '3GB', memoryMb: 3072, price: 75000, durationDays: 30, maxPurchasePerUser: 0, active: true, sortOrder: 3, isCustom: false },
    { id: 'ram-4gb-1', tierId: 'tier-panel-1', name: '4GB', memoryMb: 4096, price: 100000, durationDays: 30, maxPurchasePerUser: 0, active: true, sortOrder: 4, isCustom: false },
    { id: 'ram-custom-1', tierId: 'tier-panel-1', name: 'Custom (max 10GB)', memoryMb: 0, price: 0, durationDays: 30, maxPurchasePerUser: 0, active: true, sortOrder: 5, isCustom: true, customMaxMb: 10240 },
    // Tier 2 RAM Options
    { id: 'ram-1gb-2', tierId: 'tier-panel-2', name: '1GB', memoryMb: 1024, price: 30000, durationDays: 30, maxPurchasePerUser: 0, active: true, sortOrder: 1, isCustom: false },
    { id: 'ram-2gb-2', tierId: 'tier-panel-2', name: '2GB', memoryMb: 2048, price: 60000, durationDays: 30, maxPurchasePerUser: 0, active: true, sortOrder: 2, isCustom: false },
    { id: 'ram-3gb-2', tierId: 'tier-panel-2', name: '3GB', memoryMb: 3072, price: 90000, durationDays: 30, maxPurchasePerUser: 0, active: true, sortOrder: 3, isCustom: false },
    { id: 'ram-4gb-2', tierId: 'tier-panel-2', name: '4GB', memoryMb: 4096, price: 120000, durationDays: 30, maxPurchasePerUser: 0, active: true, sortOrder: 4, isCustom: false },
    { id: 'ram-custom-2', tierId: 'tier-panel-2', name: 'Custom (max 10GB)', memoryMb: 0, price: 0, durationDays: 30, maxPurchasePerUser: 0, active: true, sortOrder: 5, isCustom: true, customMaxMb: 10240 },
  ],
  panelCpuOptions: [
    // Tier 1 CPU Options
    { id: 'cpu-500-1', tierId: 'tier-panel-1', name: '500%', cpuPercent: 500, priceModifier: 0, active: true, sortOrder: 1 },
    { id: 'cpu-unlimited-1', tierId: 'tier-panel-1', name: 'Unlimited', cpuPercent: 0, priceModifier: 50000, active: true, sortOrder: 2 },
    // Tier 2 CPU Options
    { id: 'cpu-500-2', tierId: 'tier-panel-2', name: '500%', cpuPercent: 500, priceModifier: 0, active: true, sortOrder: 1 },
    { id: 'cpu-unlimited-2', tierId: 'tier-panel-2', name: 'Unlimited', cpuPercent: 0, priceModifier: 50000, active: true, sortOrder: 2 },
  ],
  panelDiskOptions: [
    // Tier 1 Disk Options
    { id: 'disk-10gb-1', tierId: 'tier-panel-1', name: '10GB', diskMb: 10240, priceModifier: 0, active: true, sortOrder: 1, isCustom: false },
    { id: 'disk-20gb-1', tierId: 'tier-panel-1', name: '20GB', diskMb: 20480, priceModifier: 15000, active: true, sortOrder: 2, isCustom: false },
    { id: 'disk-50gb-1', tierId: 'tier-panel-1', name: '50GB', diskMb: 51200, priceModifier: 40000, active: true, sortOrder: 3, isCustom: false },
    { id: 'disk-custom-1', tierId: 'tier-panel-1', name: 'Custom', diskMb: 0, priceModifier: 0, active: true, sortOrder: 4, isCustom: true, customMaxMb: 102400 },
    // Tier 2 Disk Options
    { id: 'disk-10gb-2', tierId: 'tier-panel-2', name: '10GB', diskMb: 10240, priceModifier: 0, active: true, sortOrder: 1, isCustom: false },
    { id: 'disk-20gb-2', tierId: 'tier-panel-2', name: '20GB', diskMb: 20480, priceModifier: 20000, active: true, sortOrder: 2, isCustom: false },
    { id: 'disk-50gb-2', tierId: 'tier-panel-2', name: '50GB', diskMb: 51200, priceModifier: 50000, active: true, sortOrder: 3, isCustom: false },
    { id: 'disk-custom-2', tierId: 'tier-panel-2', name: 'Custom', diskMb: 0, priceModifier: 0, active: true, sortOrder: 4, isCustom: true, customMaxMb: 102400 },
  ],
  // Legacy (for backward compatibility)
  panelCategories: [
    {
      id: 'cat-pterodactyl',
      key: 'pterodactyl',
      name: 'Panel Pterodactyl',
      description: 'Panel server game dengan provisioning otomatis ke Pterodactyl. Pilih spesifikasi RAM, lalu pilih jenis game (egg).',
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
      maxPurchasePerUser: 0,
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
      maxPurchasePerUser: 0,
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
  // Legacy
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