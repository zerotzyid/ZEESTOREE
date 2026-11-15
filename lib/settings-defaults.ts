/**
 * Teks awal situs sesuai spesifikasi pemilik (prompt/PRD).
 * Nilai di bawah HANYA ditulis ke RTDB saat setup pertama (lihat lib/settings.ts).
 * Setelah tersimpan, settings di RTDB yang menjadi sumber kebenaran
 * dan seluruhnya bisa diubah dari halaman admin tanpa deploy.
 */

export type FaqItem = { id: string; q: string; a: string };

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
};