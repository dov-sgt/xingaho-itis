'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

/**
 * Root `/`.
 * AppLayout sudah menangani pengalihan ke /login atau /dashboard; halaman ini
 * hanya menjadi placeholder agar tidak terjadi render kosong.
 */
export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? '/dashboard' : '/login');
  }, [loading, user, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-border border-t-primary" aria-hidden />
      <p className="text-[12.5px] text-muted-foreground">Mengalihkan…</p>
    </div>
  );
}