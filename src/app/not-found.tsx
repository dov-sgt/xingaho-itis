import Link from 'next/link';
import { BrandLogo } from '@/components/BrandLogo';
import { SearchX, ArrowLeft, Home } from 'lucide-react';
import { COMPANY_LEGAL_NAME, COPYRIGHT_TEXT } from '@/lib/config';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <BrandLogo size={44} withWordmark={false} />
      <p className="mt-8 text-[64px] font-bold leading-none tracking-tight text-primary">404</p>
      <h1 className="mt-2 text-xl font-bold tracking-tight text-foreground">Halaman tidak ditemukan</h1>
      <p className="mt-2 max-w-md text-[13px] text-muted-foreground">
        Alamat yang Anda tuju tidak tersedia atau sudah dipindahkan. Periksa kembali tautan Anda.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Link href="/dashboard" className="xh-btn xh-btn-primary">
          <Home className="h-4 w-4" />
          Ke Dashboard
        </Link>
        <Link href="/login" className="xh-btn xh-btn-secondary">
          <ArrowLeft className="h-4 w-4" />
          Halaman Login
        </Link>
      </div>
      <div className="mt-10 space-y-1 text-center">
        <p className="flex items-center justify-center gap-2 text-[11.5px] font-semibold text-foreground">
          <BrandLogo size={18} withWordmark={false} />
          {COMPANY_LEGAL_NAME}
        </p>
        <p className="text-[10.5px] text-muted-foreground">{COPYRIGHT_TEXT}</p>
      </div>
    </div>
  );
}