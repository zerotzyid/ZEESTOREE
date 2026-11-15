'use client';

import { useSettings } from '@/components/settings-provider';

function contactHref(value: string): string | null {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return null;
}

export function SiteFooter() {
  const { settings, assets } = useSettings();
  if (!settings) return null;
  const { contact, identity, appearance } = settings;
  const year = new Date().getFullYear();

  const links = [
    { label: 'WhatsApp', value: contact.whatsapp },
    { label: 'Telegram', value: contact.telegram },
    { label: 'Email', value: contact.email },
  ]
    .map((item) => ({ ...item, href: contactHref(item.value) }))
    .filter((item) => item.href || item.value.trim());

  return (
    <footer className="mt-16 border-t border-line/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-2">
          {assets.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/api/asset/branding/logo"
              alt={identity.storeName || 'Logo toko'}
              className="h-7 w-auto max-w-[140px] object-contain"
            />
          ) : identity.storeName ? (
            <span className="text-sm font-semibold text-content">{identity.storeName}</span>
          ) : null}
          {identity.tagline ? (
            <p className="max-w-xs text-sm text-content-muted">{identity.tagline}</p>
          ) : null}
          {appearance.footerText ? (
            <p className="max-w-xs text-sm text-content-faint">{appearance.footerText}</p>
          ) : null}
        </div>

        {links.length > 0 ? (
          <nav aria-label="Kontak" className="flex flex-col gap-2">
            {links.map((item) =>
              item.href ? (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] text-sm text-content-muted transition-colors hover:text-content"
                >
                  {item.label}
                </a>
              ) : (
                <span key={item.label} className="text-sm text-content-muted">
                  {item.label}: {item.value}
                </span>
              )
            )}
          </nav>
        ) : null}

        <p className="font-mono text-xs text-content-faint">
          © {year}
          {identity.storeName ? ` ${identity.storeName}` : ''}
        </p>
      </div>
    </footer>
  );
}
