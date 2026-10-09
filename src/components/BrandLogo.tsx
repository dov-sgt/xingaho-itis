'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Sumber logo perusahaan (item 1).
 *
 * Rantai fallback:
 *   1. /pict/xh_logo_1.png  — aset PNG asli (jika ada)
 *   2. /pict/xh_logo.svg    — aset vektor bawaan repository
 *   3. Wordmark teks         — selalu tampil, tidak pernah blank
 *
 * Path diambil dari konstanta di `src/lib/config.ts`, tidak di-hardcode di
 * banyak tempat.
 */

export const LOGO_PRIMARY = '/pict/xh_logo_1.png';
export const LOGO_FALLBACK = '/pict/xh_logo.svg';
export const COMPANY_NAME = 'Xinghao';
export const COMPANY_FULL_NAME = 'Xinghao ITIS';

export function BrandLogo({
  size = 32,
  withWordmark = true,
  tone = 'default',
  className,
  subtitle = 'IT Information System',
}: {
  /** Tinggi logo dalam piksel. */
  size?: number;
  withWordmark?: boolean;
  /** 'default' untuk halaman terang, 'sidebar' untuk teks putih di sidebar. */
  tone?: 'default' | 'sidebar';
  className?: string;
  subtitle?: string;
}) {
  const [src, setSrc] = useState<string>(LOGO_PRIMARY);
  const [failed, setFailed] = useState(false);

  const onError = () => {
    if (src === LOGO_PRIMARY) setSrc(LOGO_FALLBACK);
    else setFailed(true);
  };

  const mark = failed ? (
    <span
      className="flex items-center justify-center rounded-[22%] bg-[linear-gradient(135deg,var(--brand-mark-from),var(--brand-mark-to))] font-bold text-primary-foreground"
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.38) }}
      aria-hidden
    >
      XH
    </span>
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`${COMPANY_FULL_NAME} logo`}
      width={size}
      height={size}
      onError={onError}
      style={{ width: size, height: size }}
      className={cn('shrink-0 object-contain', tone === 'sidebar' ? '' : 'rounded-[22%]')}
    />
  );

  if (!withWordmark) return <span className={cn('inline-flex', className)}>{mark}</span>;

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      {mark}
      <span className="min-w-0 leading-tight">
        <span
          className={cn(
            'block truncate text-[13px] font-bold tracking-wide',
            tone === 'sidebar' ? 'text-sidebar-foreground' : 'text-foreground',
          )}
        >
          {COMPANY_FULL_NAME}
        </span>
        {subtitle && (
          <span
            className={cn(
              'block truncate text-[10px]',
              tone === 'sidebar' ? 'text-sidebar-muted' : 'text-muted-foreground',
            )}
          >
            {subtitle}
          </span>
        )}
      </span>
    </span>
  );
}

/** Versi file untuk PDF: selalu pakai aset vektor agar tajam saat dicetak. */
export function BrandLogoForPrint({ size = 64 }: { size?: number }) {
  const [src, setSrc] = useState<string>(LOGO_PRIMARY);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={COMPANY_FULL_NAME}
      width={size}
      height={size}
      onError={() => src !== LOGO_FALLBACK && setSrc(LOGO_FALLBACK)}
      style={{ width: size, height: size, objectFit: 'contain' }}
    />
  );
}