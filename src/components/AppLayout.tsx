'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';

const COLLAPSE_KEY = 'itis_sidebar_collapsed';

function Splash({ label = 'Memuat sistem…' }: { label?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-border border-t-primary" aria-hidden />
      <p className="text-[12.5px] text-muted-foreground">{label}</p>
    </div>
  );
}

function Forbidden() {
  const { user } = useAuth();
  const router = useRouter();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-danger-subtle text-danger-subtle-foreground">
        <Lock className="h-7 w-7" />
      </span>
      <h1 className="text-xl font-bold text-foreground">403 — Akses Ditolak</h1>
      <p className="mt-2 max-w-md text-[13px] text-muted-foreground">
        Akun <span className="font-semibold text-foreground">{user?.name}</span> (
        {user?.roleName}) tidak memiliki izin untuk membuka halaman ini. Hubungi SuperAdmin bila Anda merasa
        ini adalah kekeliruan.
      </p>
      <div className="mt-5 flex gap-2">
        <button className="xh-btn xh-btn-secondary" onClick={() => router.back()}>
          Kembali
        </button>
        <button className="xh-btn xh-btn-primary" onClick={() => router.push('/dashboard')}>
          Ke Dashboard
        </button>
      </div>
    </div>
  );
}

function LayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, canAccess } = useAuth();
  const { theme } = useApp();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  // Dark mode — apply sebelum paint berikutnya agar tidak berkedip.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1');
    } catch {
      /* ignore */
    }
  }, []);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  // Guard: belum login -> /login
  useEffect(() => {
    if (!loading && !user && pathname !== '/login') router.replace('/login');
  }, [loading, user, pathname, router]);

  // Halaman login tidak boleh di-cache oleh browser agar sesi lama tidak "ditemukan" lagi.
  useEffect(() => {
    if (pathname === '/login' && typeof window !== 'undefined') window.history.replaceState(null, '', '/login');
  }, [pathname]);

  // Sudah login tapi masih di /login -> dashboard
  useEffect(() => {
    if (!loading && user && pathname === '/login') router.replace('/dashboard');
  }, [loading, user, pathname, router]);

  // Tutup drawer setiap pindah halaman
  useEffect(() => {
    setMobileNav(false);
  }, [pathname]);

  if (loading) return <Splash />;
  if (pathname === '/login') {
    return !user ? <>{children}</> : <Splash label="Mengalihkan ke dashboard…" />;
  }
  if (!user) return <Splash label="Mengalihkan ke halaman login…" />;

  // Guard sisi-klien per halaman. Backend tetap menjadi pengawal sesungguhnya
  // (setiap API route memvalidasi ulang lewat requirePermission).
  const requiredFeature = requiredFeatureFor(pathname);
  if (requiredFeature && !canAccess(requiredFeature)) return <Forbidden />;

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
        mobileOpen={mobileNav}
        onCloseMobile={() => setMobileNav(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Navbar onOpenMobileNav={() => setMobileNav(true)} />
        <main className={cn('min-h-0 flex-1 overflow-y-auto scrollbar-thin')}>
          <div className="mx-auto w-full max-w-[1400px] px-3 py-4 sm:px-5 sm:py-5 lg:px-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

/** Peta path -> feature permission yang dibutuhkan untuk membuka halaman. */
function requiredFeatureFor(pathname: string): string | null {
  if (pathname.startsWith('/users')) return 'user_management';
  if (pathname.startsWith('/roles')) return 'role_management';
  if (pathname.startsWith('/divisions')) return 'division_management';
  if (pathname.startsWith('/master/items')) return 'master_item';
  if (pathname.startsWith('/master/vendors')) return 'master_vendor';
  if (pathname.startsWith('/inventory') || pathname.startsWith('/stock-in')) return 'inventory_type_item';
  if (pathname.startsWith('/transactions/items') || pathname.startsWith('/damaged-items')) return 'transaction_headset';
  if (pathname.startsWith('/transactions/purchase-requests')) return 'purchase_request';
  if (pathname.startsWith('/transactions/delivery-orders')) return 'delivery_order';
  if (pathname.startsWith('/transactions/vendor-submissions')) return 'vendor_submission';
  if (pathname.startsWith('/stock-out-transactions')) return 'transaction_stockout';
  if (pathname.startsWith('/bookings')) return 'booking';
  if (pathname.startsWith('/servis-assets')) return 'servis_asset';
  if (pathname.startsWith('/log-ruang-server')) return 'log_ruang_server';
  if (pathname.startsWith('/qc/recording-reviews')) return 'recording_review';
  if (pathname.startsWith('/qc/findings')) return 'finding';
  if (pathname.startsWith('/hr/')) return 'user_management';
  if (pathname.startsWith('/reports')) return 'reporting';
  return null;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LayoutInner>{children}</LayoutInner>
    </AuthProvider>
  );
}