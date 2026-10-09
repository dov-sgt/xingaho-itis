'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { RotateCcw, Home, TriangleAlert } from 'lucide-react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[Xinghao ITIS] Kesalahan aplikasi:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-danger-subtle text-danger-subtle-foreground">
        <TriangleAlert className="h-7 w-7" />
      </span>
      <p className="mt-6 text-[56px] font-bold leading-none tracking-tight text-danger">500</p>
      <h1 className="mt-2 text-xl font-bold tracking-tight text-foreground">Terjadi kesalahan pada sistem</h1>
      <p className="mt-2 max-w-md text-[13px] text-muted-foreground">
        Permintaan Anda tidak dapat diproses. Coba muat ulang halaman. bila masalah berlanjut, hubungi SuperAdmin
        dan sertakan detail error di bawah ini.
      </p>
      {error.digest && (
        <p className="mt-3 rounded-md border border-border bg-muted px-3 py-1.5 font-mono text-[11px] text-muted-foreground">
          Kode error: {error.digest}
        </p>
      )}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <button onClick={reset} className="xh-btn xh-btn-primary">
          <RotateCcw className="h-4 w-4" />
          Coba Lagi
        </button>
        <Link href="/dashboard" className="xh-btn xh-btn-secondary">
          <Home className="h-4 w-4" />
          Ke Dashboard
        </Link>
      </div>
    </div>
  );
}