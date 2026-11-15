'use client';

import { useState } from 'react';
import { PackageOpen } from 'lucide-react';
import { cn } from '@/lib/cn';

/** Gambar produk dengan fallback anggun bila aset belum ada atau gagal dimuat. */
export function ProductImage({
  src,
  alt,
  className,
  iconSize = 28,
}: {
  src: string | null;
  alt: string;
  className?: string;
  iconSize?: number;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-gradient-to-br from-accent/25 via-content/5 to-transparent text-content-faint',
          className
        )}
        aria-hidden
      >
        <PackageOpen size={iconSize} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn('object-cover', className)}
    />
  );
}
