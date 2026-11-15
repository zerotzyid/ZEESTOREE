'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Route } from 'next';
import {
  ArrowUpRight,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSettings } from '@/components/settings-provider';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Session } from '@/lib/session';

export function SiteHeader({ session }: { session: Session | null }) {
  const { settings, assets } = useSettings();
  const router = useRouter();

  if (!settings) return null;
  const storeName = settings.identity.storeName;
  const menu = settings.systemTexts.menu;
  const nokosBadge = 'Segera hadir';

  const navLinks = [
    { href: '/', label: menu.home, badge: null },
    { href: '/#katalog', label: menu.products, badge: null },
    { href: '/#faq', label: menu.faq, badge: null },
    { href: '/donasi', label: menu.donasi ?? 'Donasi', badge: null },
    { href: '/nomor-virtual', label: menu.nokos, badge: nokosBadge },
  ] as const;

  const logout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (!res.ok) throw new Error('Gagal keluar.');
      toast.success('Anda telah keluar.');
      router.push('/');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal keluar.');
    }
  };

  const go = (href: Route) => {
    router.push(href);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-surface/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="flex min-h-[44px] shrink-0 items-center gap-2.5 rounded-xl px-1 text-content"
          aria-label={storeName ? `Beranda ${storeName}` : 'Beranda'}
        >
          {assets.logo ? (
            <img
              src="/api/asset/branding/logo"
              alt={storeName || 'Logo toko'}
              className="h-8 w-auto max-w-[140px] object-contain"
            />
          ) : storeName ? (
            <span className="truncate text-base font-semibold">{storeName}</span>
          ) : null}
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle />

          {session ? (
            /* Dropdown akun (desktop & mobile) */
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-line/60 pl-1.5 pr-3 text-sm text-content-muted transition-colors hover:text-content"
                  aria-label="Menu akun"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold uppercase text-accent">
                    {session.username.charAt(0)}
                  </span>
                  <span className="hidden max-w-[120px] truncate md:inline">
                    {session.username}
                  </span>
                  <ChevronDown aria-hidden size={14} className="opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>{session.username}</DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => go(session.role === 'admin' ? '/admin' : '/dashboard')}>
                  {session.role === 'admin' ? (
                    <ShieldCheck aria-hidden size={16} />
                  ) : (
                    <LayoutDashboard aria-hidden size={16} />
                  )}
                  {session.role === 'admin' ? 'Panel admin' : menu.dashboard}
                  <ArrowUpRight aria-hidden size={13} className="ml-auto opacity-60" />
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => go('/dashboard/transactions')}>
                  {menu.transactions}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => void logout()}>
                  <LogOut aria-hidden size={16} />
                  Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden items-center gap-1.5 sm:flex">
              <Link
                href="/login"
                className="inline-flex min-h-[44px] items-center rounded-full px-4 text-sm text-content-muted transition-colors hover:text-content"
              >
                {menu.login}
              </Link>
              <Link
                href="/register"
                className="btn-accent inline-flex min-h-[44px] items-center rounded-full px-5 text-sm font-medium"
              >
                {menu.register}
              </Link>
            </div>
          )}

          {/* Dropdown navigasi situs (landing) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-line/60 px-3.5 text-sm text-content-muted transition-colors hover:text-content"
                aria-label="Buka menu navigasi"
              >
                <Menu aria-hidden size={17} />
                <span className="hidden sm:inline">Menu</span>
                <ChevronDown aria-hidden size={14} className="opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64">
              <DropdownMenuLabel>Navigasi</DropdownMenuLabel>
              {navLinks.map((link) => (
                <DropdownMenuItem key={link.href} onSelect={() => go(link.href)}>
                  {link.label}
                  {link.badge ? (
                    <span className="ml-auto rounded-full bg-accent-soft px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-accent">
                      {link.badge}
                    </span>
                  ) : null}
                </DropdownMenuItem>
              ))}

              {!session ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="sm:hidden" onSelect={() => go('/login')}>
                    {menu.login}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="sm:hidden" onSelect={() => go('/register')}>
                    {menu.register}
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
