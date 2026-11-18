/**
 * Teks awal situs sesuai spesifikasi pemilik (prompt/PRD).
 * Nilai di bawah HANYA ditulis ke RTDB saat setup pertama (lihat lib/settings.ts).
 * Setelah tersimpan, settings di RTDB yang menjadi sumber kebenaran
 * dan seluruhnya bisa diubah dari halaman admin tanpa deploy.
 */

export type FaqItem = { id: string; q: string; a: string };

/**
 * Panel Sales Tier - Simple tier referencing existing panel
 * References existing panel from /admin/panels
 */
export type PanelSalesTier = {
  id: string;
  panelId: string;      // Reference to existing panel from /admin/panels
  name: string;         // Display name (e.g., "Panel Indonesia 1")
  description: string;
  active: boolean;
  sortOrder: number;
  priceMultiplier: number; // 1.0 = base price from RAM/CPU/Disk
  maxPurchasePerUser: number; // 0 = unlimited
};

export type PanelSalesConfig = {
  tiers: PanelSalesTier[];
  ramOptions: number[];     // MB: [1024, 2048, 3072, 4096, 5120, 5120, 6144, 7168, 8192, 9216, 10240]
  cpuOptions: number[];     // Percent: [50, 100, 150, 200, 250, 300, 400, 500]
  diskOptions: number[];    // MB: [10240, 20480, 30720, 40960, 51200, 61440, 71680, 81920, 92160, 102400]
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

type Settings = {
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
  // Panel Sales Config - Simple tier selection from existing panels
  panelSales: {
    tiers: PanelSalesTier[];
    ramOptions: number[];
    cpuOptions: number[];
    diskOptions: number[];
  };
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
  _panelTypes: PanelType[];
};

;

  // Define panelTypes separately to allow more than 3 items
const _panelTypes: PanelType[] = [
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
  ];

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
  panelSales: {
    tiers: [
      {
        id: 'tier-1',
        panelId: '',
        name: 'Panel Indonesia 1',
        description: 'Server Pterodactyl berlokasi di Indonesia dengan latensi rendah.',
        active: true,
        sortOrder: 1,
        priceMultiplier: 1.0,
        maxPurchasePerUser: 0,
      },
      {
        id: 'tier-2',
        panelId: '',
        name: 'Panel Singapore',
        description: 'Server Pterodactyl berlokasi di Singapore untuk performa Asia optimal.',
        active: true,
        sortOrder: 2,
        priceMultiplier: 1.2,
        maxPurchasePerUser: 0,
      },
    ],
    ramOptions: [1024, 2048, 3072, 4096, 5120, 6144, 7168, 8192, 9216, 10240],
    cpuOptions: [50, 100, 150, 200, 250, 300, 400, 500],
    diskOptions: [10240, 20480, 30720, 40960, 51200, 61440, 71680, 81920, 92160, 102400],
    },
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
  _panelTypes: _panelTypes,
};

export { type Settings };