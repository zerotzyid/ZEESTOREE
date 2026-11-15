'use client';

import { Clock, Gauge, ReceiptText, Server, ShoppingCart, User, Wallet, ArrowLeftRight } from 'lucide-react';
import { useSettings } from '@/components/settings-provider';
import { AppSidebar } from '@/components/app-sidebar';

export function DashboardSidebar({ username }: { username: string }) {
  const { settings } = useSettings();
  const menu = settings?.systemTexts.menu;

  const nav = [
    { href: '/dashboard' as const, label: menu?.dashboard ?? 'Dashboard', icon: Gauge },
    { href: '/katalog' as const, label: menu?.products ?? 'Katalog', icon: ShoppingCart },
    { href: '/dashboard/orders' as const, label: menu?.orders ?? 'Riwayat pesanan', icon: ReceiptText },
    { href: '/dashboard/panels' as const, label: 'Panel Saya', icon: Server },
    {
      href: '/dashboard/transactions' as const,
      label: menu?.transactions ?? 'Riwayat transaksi',
      icon: ArrowLeftRight,
    },
    { href: '/dashboard/deposit' as const, label: menu?.deposit ?? 'Deposit', icon: Wallet },
    { href: '/dashboard/profile' as const, label: menu?.profile ?? 'Profil', icon: User },
    {
      href: '/nomor-virtual' as const,
      label: menu?.nokos ?? 'Nomor Virtual',
      icon: Clock,
      badge: settings?.systemTexts.messages.comingSoonNokos ?? 'Segera hadir',
    },
  ];

  return (
    <AppSidebar
      title={settings?.identity.storeName || 'Dashboard'}
      titleHref="/"
      username={username}
      rootHref="/dashboard"
      nav={nav}
    />
  );
}
