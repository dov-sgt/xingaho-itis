'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { BrandLogo } from '@/components/BrandLogo';
import { titleForPath } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import { LogOut, Sun, Moon, Globe, Menu, ChevronDown, User2, ShieldCheck, Building2 } from 'lucide-react';

export default function Navbar({ onOpenMobileNav }: { onOpenMobileNav?: () => void }) {
  const { user, logout, isSuperAdmin } = useAuth();
  const { theme, toggleTheme, lang, toggleLang } = useApp();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const pageTitle = titleForPath(pathname || '/dashboard');

  return (
    <header
      data-app-chrome
      className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/85 px-3 backdrop-blur-md sm:px-4"
    >
      <button
        onClick={onOpenMobileNav}
        className="xh-btn xh-btn-ghost h-9 w-9 p-0 lg:hidden"
        aria-label="Buka menu navigasi"
      >
        <Menu className="h-4.5 w-4.5" />
      </button>

      <div className="hidden lg:block">
        <BrandLogo size={26} withWordmark={false} />
      </div>

      {/* Breadcrumb-ish page title */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-bold tracking-tight text-foreground">{pageTitle}</p>
        <p className="hidden truncate text-[10.5px] text-muted-foreground sm:block">
          {isSuperAdmin ? 'SuperAdmin - akses semua divisi' : `${user?.roleName ?? '-'} - ${user?.division ?? '-'}`}
        </p>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Language */}
        <button
          onClick={toggleLang}
          title={lang === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}
          aria-label="Ganti bahasa"
          className="xh-btn xh-btn-ghost h-9 px-2.5"
        >
          <Globe className="h-4 w-4" />
          <span className="text-[11.5px] font-bold">{lang.toUpperCase()}</span>
        </button>

        {/* Theme */}
        <button
          onClick={toggleTheme}
          title={theme === 'light' ? 'Mode gelap' : 'Mode terang'}
          aria-label={theme === 'light' ? 'Aktifkan mode gelap' : 'Aktifkan mode terang'}
          className="xh-btn xh-btn-ghost h-9 w-9 p-0"
        >
          {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex h-9 items-center gap-2 rounded-lg border border-border bg-card pl-1.5 pr-2 text-left transition-colors hover:bg-muted"
          >
            <span className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-md bg-primary-subtle text-[10.5px] font-bold text-primary-subtle-foreground">
              {(user?.name || 'U').slice(0, 1).toUpperCase()}
            </span>
            <span className="hidden max-w-[120px] truncate text-[12px] font-semibold text-foreground sm:block">
              {user?.name ?? 'Pengguna'}
            </span>
            <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', menuOpen && 'rotate-180')} />
          </button>

          {menuOpen && (
            <>
              <button className="fixed inset-0 z-40 cursor-default" onClick={() => setMenuOpen(false)} aria-hidden tabIndex={-1} />
              <div
                role="menu"
                className="absolute right-0 z-50 mt-1.5 w-64 overflow-hidden rounded-xl border border-border bg-overlay shadow-lg animate-slide-up"
              >
                <div className="border-b border-border px-3.5 py-3">
                  <p className="truncate text-[13px] font-bold text-foreground">{user?.name}</p>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">@{user?.username}</p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <span className="xh-chip xh-chip-primary">
                      <ShieldCheck className="h-3 w-3" />
                      {user?.roleName ?? '-'}
                    </span>
                    <span className="xh-chip xh-chip-neutral">
                      <Building2 className="h-3 w-3" />
                      {user?.division ?? '-'}
                    </span>
                  </div>
                </div>
                <div className="p-1.5">
                  <p className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[11.5px] text-muted-foreground">
                    <User2 className="h-3.5 w-3.5" />
                    ID pengguna: {user?.id ?? '-'}
                  </p>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setConfirmLogout(true);
                    }}
                    className="mt-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[12.5px] font-semibold text-danger transition-colors hover:bg-danger-subtle"
                  >
                    <LogOut className="h-4 w-4" />
                    Keluar
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {confirmLogout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-sm rounded-xl border border-border bg-overlay p-5 shadow-xl animate-slide-up">
            <p className="text-[14px] font-bold text-foreground">Keluar dari sistem?</p>
            <p className="mt-1.5 text-[12.5px] text-muted-foreground">
              Sesi Anda akan dihapus dan Anda perlu login kembali untuk mengakses sistem.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button className="xh-btn xh-btn-secondary" onClick={() => setConfirmLogout(false)}>
                Batal
              </button>
              <button
                className="xh-btn xh-btn-danger"
                onClick={async () => {
                  setConfirmLogout(false);
                  await logout();
                }}
              >
                Ya, keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}