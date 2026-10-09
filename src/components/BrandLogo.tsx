'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Sumber logo perusahaan (item 1).
 *
 * Rantai fallback — dipakai berurutan, yang pertama berhasil menang:
 *   1. /pict/xh_logo_1.png  — aset PNG asli, bila perusahaan mengunggahkannya
 *   2. /pict/xh_logo.svg    — aset vektor bawaan repository
 *   3. <LogoMark />          — SVG inline (tidak butuh request sama sekali)
 *   4. wordmark teks         — selalu tampil, tidak pernah kosong
 *
 * Semua path diambil dari konstanta di `src/lib/config.ts`, tidak di-hardcode
 * di banyak tempat.
 *
 * Logo TIDAK memakai token tema: logo adalah aset merek, warnanya sama di
light & dark mode.
 */

export const LOGO_PRIMARY = '/pict/xh_logo_1.png';
export const LOGO_FALLBACK = '/pict/xh_logo.svg';
export const COMPANY_NAME = 'Xinghao';
export const COMPANY_FULL_NAME = 'Xinghao ITIS';

/** Logo sebagai komponen React — tidak bergantung pada file statis. */
export function LogoMark({
  size = 32,
  className,
  rounded = true,
}: {
  size?: number;
  className?: string;
  rounded?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 256 256"
      width={size}
      height={size}
      role="img"
      aria-label={`${COMPANY_FULL_NAME} logo`}
      className={cn('shrink-0 object-contain', rounded && 'rounded-[22%]', className)}
    >
      <defs>
        <linearGradient id="xh-brand-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(var(--brand-mark-from))" />
          <stop offset="55%" stopColor="hsl(243 75% 51%)" />
          <stop offset="100%" stopColor="hsl(var(--brand-mark-to))" />
        </linearGradient>
      </defs>
      <rect x="8" y="8" width="240" height="240" rx="56" fill="url(#xh-brand-g)" />
      <path d="M40 168a96 96 0 0 1 176 0" fill="none" stroke="hsl(0 0% 100% / 0.22)" strokeWidth="8" strokeLinecap="round" />
      <circle cx="128" cy="46" r="9" fill="hsl(0 0% 100% / 0.55)" />
      <path d="M74 92 L118 132 L74 172" fill="none" stroke="hsl(0 0% 100%)" strokeWidth="17" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M134 92 V172 M182 92 V172 M134 132 H182" fill="none" stroke="hsl(0 0% 100%)" strokeWidth="17" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

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
  // null = belum mencoba, '' = inline fallback, path = file statis
  const [src, setSrc] = useState<string | null>(null);
  const [useInline, setUseInline] = useState(false);

  // Deteksi apakah aset PNG benar-benar ada (HEAD request sekali saat mount).
  // Ini mencegah gambar kosong bila ada file placeholder yang tidak valid.
  useEffect(() => {
    let cancelled = false;
    fetch(LOGO_PRIMARY, { method: 'HEAD', cache: 'no-store' })
      .then((r) => {
        if (cancelled) return;
        if (r.ok) setSrc(LOGO_PRIMARY);
        else setUseInline(true);
      })
      .catch(() => !cancelled && setUseInline(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const onError = () => {
    if (src === LOGO_PRIMARY) setSrc(LOGO_FALLBACK);
    else setUseInline(true);
  };

  let mark: React.ReactNode;
  if (src && !useInline) {
    mark = (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={`${COMPANY_FULL_NAME} logo`}
        width={size}
        height={size}
        onError={onError}
        style={{ width: size, height: size }}
        className="shrink-0 rounded-[22%] object-contain"
      />
    );
  } else if (src === LOGO_FALLBACK && !useInline) {
    mark = (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={LOGO_FALLBACK}
        alt={`${COMPANY_FULL_NAME} logo`}
        width={size}
        height={size}
        onError={onError}
        style={{ width: size, height: size }}
        className="shrink-0 rounded-[22%] object-contain"
      />
    );
  } else {
    mark = <LogoMark size={size} />;
  }

  if (!withWordmark) {
    return <span className={cn('inline-flex', className)}>{mark}</span>;
  }

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

/** Versi logo untuk PDF: memakai SVG inline agar tajam & tidak gagal saat dicetak. */
export function BrandLogoForPrint({ size = 64 }: { size?: number }) {
  return <LogoMark size={size} />;
}