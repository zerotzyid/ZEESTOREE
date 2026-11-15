import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { getSettings, getBrandingAssetNames, type Settings } from '@/lib/settings';
import { getSession } from '@/lib/session';
import { accentStyleRule } from '@/lib/accent';
import { DEFAULT_SETTINGS } from '@/lib/settings-defaults';
import { SettingsProvider } from '@/components/settings-provider';
import { Toaster } from '@/components/toaster';
import { MaintenanceScreen } from '@/components/maintenance-screen';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

const themeScript = `(function(){try{var t=localStorage.getItem('theme');var r=document.documentElement;if(t==='light'){r.classList.remove('dark');r.classList.add('light');}else{r.classList.add('dark');r.classList.remove('light');}}catch(e){}})();`;

async function loadInitialData(): Promise<{
  settings: Settings;
  assets: { logo: boolean; favicon: boolean; banner: boolean; donationQrLogo: boolean };
  isAdmin: boolean;
  maintenance: boolean;
  maintenanceMessage: string;
}> {
  let settings: Settings = structuredClone(DEFAULT_SETTINGS);
  let assets = { logo: false, favicon: false, banner: false, donationQrLogo: false };
  let isAdmin = false;

  try {
    settings = await getSettings();
  } catch {
    /* Firebase belum dikonfigurasi (mis. dev lokal tanpa env) — pakai teks awal. */
  }
  try {
    assets = await getBrandingAssetNames();
  } catch {
    assets = { logo: false, favicon: false, banner: false, donationQrLogo: false };
  }
  try {
    const session = await getSession();
    isAdmin = session?.role === 'admin';
  } catch {
    isAdmin = false;
  }

  const maintenance = settings.operational.maintenanceMode && !isAdmin;
  const maintenanceMessage =
    settings.operational.maintenanceMessage || settings.systemTexts.messages.maintenance;

  return { settings, assets, isAdmin, maintenance, maintenanceMessage };
}

export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await getSettings();
    const title = settings.identity.seoTitle || settings.identity.storeName || undefined;
    return {
      title,
      description: settings.identity.seoDescription || undefined,
    };
  } catch {
    return {};
  }
}

export const viewport: Viewport = {
  themeColor: '#14171d',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { settings, assets, maintenance, maintenanceMessage } = await loadInitialData();

  return (
    <html lang="id" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <style dangerouslySetInnerHTML={{ __html: accentStyleRule(settings.appearance.accent) }} />
        {assets.favicon ? <link rel="icon" href="/api/asset/branding/favicon" /> : null}
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} min-h-screen`}>
        <SettingsProvider initial={settings} initialAssets={assets}>
          {maintenance ? <MaintenanceScreen message={maintenanceMessage} /> : children}
          <Toaster />
        </SettingsProvider>
      </body>
    </html>
  );
}
