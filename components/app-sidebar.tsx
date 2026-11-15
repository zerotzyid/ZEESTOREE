'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { Route } from 'next';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { LogOut, Menu, X, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/cn';

export type SidebarNavItem = {
  href: Route;
  label: string;
  icon: LucideIcon;
  badge?: string | null;
};

type Props = {
  title: string;
  titleHref: Route;
  username: string;
  rootHref: Route;
  nav: readonly SidebarNavItem[];
};

function isActive(pathname: string, href: Route, rootHref: Route): boolean {
  if (href === rootHref) return pathname === rootHref;
  if (href === '/nomor-virtual') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavList({
  pathname,
  nav,
  rootHref,
  onNavigate,
}: {
  pathname: string;
  nav: readonly SidebarNavItem[];
  rootHref: Route;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1" aria-label="Navigasi">
      {nav.map((item) => {
        const active = isActive(pathname, item.href, rootHref);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative inline-flex min-h-[44px] items-center gap-2.5 whitespace-nowrap rounded-xl px-3.5 text-sm transition-colors',
              active
                ? 'bg-accent-soft font-medium text-accent'
                : 'text-content-muted hover:bg-content/5 hover:text-content'
            )}
          >
            {active ? (
              <span
                aria-hidden
                className="absolute inset-y-2 -left-0.5 hidden w-0.5 rounded-full bg-accent md:block"
              />
            ) : null}
            <item.icon aria-hidden size={17} />
            <span className="truncate">{item.label}</span>
            {item.badge ? (
              <span className="ml-auto rounded-full bg-content/10 px-1.5 py-0.5 font-mono text-[9px] uppercase text-content-faint">
                {item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppSidebar({ title, titleHref, username, rootHref, nav }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const logout = async () => {
    setOpen(false);
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

  const accountCard = (
    <div className="flex items-center gap-2.5 rounded-2xl border border-line/60 bg-content/5 p-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold uppercase text-accent">
        {username.charAt(0)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-content" title={username}>
          {username}
        </span>
        <span className="block text-xs text-content-faint">Akun Anda</span>
      </span>
    </div>
  );

  const footerBlock = (
    <div className="flex flex-col gap-3">
      {accountCard}
      <div className="hidden md:block">
        <ThemeToggle />
      </div>
      <button
        type="button"
        onClick={() => void logout()}
        className="inline-flex min-h-[44px] items-center gap-2.5 rounded-xl px-3.5 text-sm text-content-muted transition-colors hover:bg-content/5 hover:text-content"
      >
        <LogOut aria-hidden size={17} />
        Keluar
      </button>
    </div>
  );

  const slide = reduceMotion
    ? { initial: false as const, animate: { x: 0 }, exit: { x: 0 } }
    : { initial: { x: '-100%' }, animate: { x: 0 }, exit: { x: '-100%' } };

  return (
    <>
      {/* Desktop: sidebar tetap */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-4 border-r border-line/60 bg-surface-raised/50 p-4 backdrop-blur-xl md:flex">
        <Link
          href={titleHref}
          className="flex min-h-[44px] items-center gap-2 rounded-xl px-1 text-base font-semibold text-content"
        >
          {title}
        </Link>
        <NavList pathname={pathname} nav={nav} rootHref={rootHref} />
        <div className="mt-auto">{footerBlock}</div>
      </aside>

      {/* Mobile: bar atas dengan tombol sidebar */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-line/60 bg-surface/90 px-4 backdrop-blur-xl md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Buka sidebar navigasi"
          className="inline-flex min-h-[40px] items-center gap-2 rounded-xl px-2.5 text-sm font-medium text-content transition-colors hover:bg-content/5"
        >
          <Menu aria-hidden size={19} />
          <span className="truncate">{title}</span>
        </button>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold uppercase text-accent">
            {username.charAt(0)}
          </span>
        </div>
      </div>

      {/* Mobile: laci sidebar */}
      <AnimatePresence>
        {open ? (
          <>
            <motion.button
              type="button"
              aria-label="Tutup sidebar"
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 flex w-[85vw] max-w-[300px] flex-col gap-4 overflow-y-auto border-r border-line/60 bg-surface-raised p-4 shadow-2xl md:hidden"
              {...slide}
              transition={{ type: 'tween', duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            >
              <div className="flex items-center justify-between gap-2">
                <Link
                  href={titleHref}
                  onClick={() => setOpen(false)}
                  className="truncate text-base font-semibold text-content"
                >
                  {title}
                </Link>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Tutup sidebar"
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-content-muted transition-colors hover:bg-content/5"
                >
                  <X aria-hidden size={18} />
                </button>
              </div>
              <NavList
                pathname={pathname}
                nav={nav}
                rootHref={rootHref}
                onNavigate={() => setOpen(false)}
              />
              <div className="mt-auto">{footerBlock}</div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
