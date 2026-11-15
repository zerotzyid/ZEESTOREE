'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { Settings } from '@/lib/settings-defaults';
import { applyAccent } from '@/lib/accent';

type SettingsContextValue = {
  settings: Settings | null;
  assets: { logo: boolean; favicon: boolean; banner: boolean };
  loading: boolean;
  refresh: () => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

const POLL_MS = 5000;

export function SettingsProvider({
  initial,
  initialAssets,
  children,
}: {
  initial: Settings;
  initialAssets: { logo: boolean; favicon: boolean; banner: boolean };
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState<Settings>(initial);
  const [assets, setAssets] = useState(initialAssets);
  const [loading, setLoading] = useState(false);
  const firstRun = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/settings', { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as Settings & {
        assets?: { logo: boolean; favicon: boolean; banner: boolean };
      };
      const { assets: nextAssets, ...nextSettings } = data;
      setSettings(nextSettings);
      if (nextAssets) setAssets(nextAssets);
    } catch {
      /* polling gagal — coba lagi di siklus berikutnya */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    applyAccent(settings.appearance.accent);
    if (firstRun.current) {
      firstRun.current = false;
    }
  }, [settings.appearance.accent]);

  useEffect(() => {
    const id = setInterval(() => {
      void refresh();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  return (
    <SettingsContext.Provider value={{ settings, assets, loading, refresh }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings harus dipakai di dalam SettingsProvider.');
  return ctx;
}
