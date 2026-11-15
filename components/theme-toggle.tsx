'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useSettings } from '@/components/settings-provider';
import { Button } from '@/components/ui/button';

function readTheme(): 'dark' | 'light' {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.classList.contains('light') && !document.documentElement.classList.contains('dark')
    ? 'light'
    : document.documentElement.classList.contains('dark')
      ? 'dark'
      : 'light';
}

export function ThemeToggle() {
  const { settings } = useSettings();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTheme(readTheme());
  }, []);

  if (!settings?.appearance.themeToggleEnabled) return null;

  const next = theme === 'dark' ? 'light' : 'dark';

  const toggle = () => {
    const root = document.documentElement;
    if (next === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
    try {
      localStorage.setItem('theme', next);
    } catch {
      /* localStorage bisa tidak tersedia */
    }
    setTheme(next);
    window.dispatchEvent(new CustomEvent('themechange', { detail: next }));
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={mounted ? `Aktifkan mode ${next === 'dark' ? 'gelap' : 'terang'}` : 'Ganti tema'}
      title={next === 'dark' ? 'Mode gelap' : 'Mode terang'}
    >
      {theme === 'dark' ? <Sun aria-hidden size={18} /> : <Moon aria-hidden size={18} />}
    </Button>
  );
}
