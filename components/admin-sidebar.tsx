'use client';

import { BarChart3, Home, Package, QrCode, ReceiptText, ScrollText, Server, Settings, Users, Ticket } from 'lucide-react';
import { useSettings } from '@/components/settings-provider';
import { AppSidebar } from '@/components/app-sidebar';

export function AdminSidebar({ username }: { username: string }) {
  const { settings } = useSettings();

  const nav = [
    { href: '/admin' as const, label: 'Ringkasan', icon: Home },
    { href: '/admin/stats' as const, label: 'Statistik', icon: BarChart3 },
    { href: '/admin/products' as const, label: 'Produk', icon: Package },
    { href: '/admin/orders' as const, label: 'Order', icon: ReceiptText },
    { href: '/admin/users' as const, label: 'Pengguna', icon: Users },
    { href: '/admin/panels' as const, label: 'Panel', icon: Server },
    { href: '/admin/vouchers' as const, label: 'Voucher', icon: Ticket },
    { href: '/admin/logs' as const, label: 'Log Aktivitas', icon: ScrollText },
    { href: '/admin/settings' as const, label: 'Pengaturan Situs', icon: Settings },
    { href: '/admin/pixpayz' as const, label: 'Pembayaran', icon: QrCode },
  ];

  return (
    <AppSidebar
      title={settings?.identity.storeName || 'Admin'}
      titleHref="/"
      username={username}
      rootHref="/admin"
      nav={nav}
    />
  );
}
