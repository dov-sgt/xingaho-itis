'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { BrandLogo } from '@/components/BrandLogo';
import { COMPANY_LEGAL_NAME } from '@/lib/config';
import { DIVISION_NAV, ADMIN_NAV, NavItem } from '@/lib/navigation';
import { ChevronDown, ChevronRight, PanelLeftClose, PanelLeft, X } from 'lucide-react';

function NavList({
  items,
  onNavigate,
}: {
  items: NavItem[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { canAccess } = useAuth();
  const visible = items.filter((i) => canAccess(i.feature));
  if (!visible.length) return null;

  return (
    <ul className="space-y-0.5">
      {visible.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.path;
        return (
          <li key={item.path}>
            <Link
              href={item.path}
              onClick={onNavigate}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4 shrink-0 transition-colors',
                  isActive ? 'text-sidebar-primary' : 'text-sidebar-muted group-hover:text-sidebar-foreground',
                )}
              />
              <span className="truncate">{item.title}</span>
              {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary" aria-hidden />}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function Section({
  label,
  children,
  open,
  onToggle,
  badge,
}: {
  label: string;
  children: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  badge?: string;
}) {
  return (
    <div className="mb-1">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-sidebar-muted/70 transition-colors hover:text-sidebar-foreground"
      >
        {open ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
        <span className="truncate">{label}</span>
        {badge && (
          <span className="ml-auto rounded-full bg-sidebar-accent px-1.5 py-px text-[9.5px] font-bold text-sidebar-muted">
            {badge}
          </span>
        )}
      </button>
      {open && <div className="mt-0.5 pl-0.5">{children}</div>}
    </div>
  );
}

export default function Sidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}) {
  const { user, isSuperAdmin, division } = useAuth();
  const divisionCode = user?.divisionCode ?? '';
  const [open, setOpen] = useState<Record<string, boolean>>({});

  // Buka otomatis section divisi milik user; semuanya tertutup by default.
  useEffect(() => {
    if (divisionCode && !isSuperAdmin) setOpen((p) => ({ ...p, [divisionCode]: true }));
    else if (isSuperAdmin) setOpen((p) => ({ ...p, IT: p.IT ?? true }));
  }, [divisionCode, isSuperAdmin]);

  const toggle = (k: string) => setOpen((p) => ({ ...p, [k]: !p[k] }));

  const sections = isSuperAdmin ? DIVISION_NAV : DIVISION_NAV.filter((d) => d.key === divisionCode);

  const content = (
    <>
      {/* Brand */}
      <div className={cn('flex h-14 shrink-0 items-center border-b border-sidebar-border', collapsed ? 'justify-center px-2' : 'gap-2.5 px-4')}>
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5" aria-label="Xinghao ITIS">
          <BrandLogo size={collapsed ? 28 : 30} withWordmark={!collapsed} tone="sidebar" />
        </Link>
        {!collapsed && (
          <button
            onClick={onToggleCollapse}
            className="ml-auto hidden h-7 w-7 items-center justify-center rounded-md text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground lg:flex"
            aria-label="Ciutkan sidebar"
            title="Ciutkan sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Identity */}
      {!collapsed && user && (
        <div className="shrink-0 border-b border-sidebar-border px-4 py-2.5">
          <p className="truncate text-[12px] font-semibold text-sidebar-foreground">{user.name}</p>
          <p className="mt-0.5 truncate text-[10.5px] text-sidebar-muted">
            {user.roleName} - {user.division}
          </p>
        </div>
      )}

      {/* Menu */}
      <nav
        aria-label="Navigasi utama"
        className={cn('hide-scrollbar min-h-0 flex-1 overflow-y-auto py-3', collapsed ? 'px-2' : 'px-2.5')}
      >
        {collapsed ? (
          <CollapsedNav items={sections.flatMap((s) => s.menus).concat(isSuperAdmin ? ADMIN_NAV : [])} onNavigate={onCloseMobile} />
        ) : (
          <>
            {sections.map((section) => (
              <Section
                key={section.key}
                label={section.label}
                open={!!open[section.key]}
                onToggle={() => toggle(section.key)}
                badge={section.key}
              >
                <NavList items={section.menus} onNavigate={onCloseMobile} />
              </Section>
            ))}

            {isSuperAdmin && (
              <Section label="Admin Settings" open={!!open.ADMIN} onToggle={() => toggle('ADMIN')}>
                <NavList items={ADMIN_NAV} onNavigate={onCloseMobile} />
              </Section>
            )}
          </>
        )}
      </nav>

      {collapsed ? (
        <button
          onClick={onToggleCollapse}
          className="hidden h-10 shrink-0 items-center justify-center border-t border-sidebar-border text-sidebar-muted transition-colors hover:text-sidebar-foreground lg:flex"
          aria-label="Perluas sidebar"
          title="Perluas sidebar"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
      ) : (
        <footer className="shrink-0 border-t border-sidebar-border px-4 py-2.5">
          <p className="truncate text-[10.5px] font-semibold text-sidebar-foreground/70">{COMPANY_LEGAL_NAME}</p>
          <p className="truncate text-[9.5px] text-sidebar-muted/60">
            (c) {new Date().getFullYear()} - Hak cipta dilindungi
          </p>
        </footer>
      )}
    </>
  );

  return (
    <>
      {/* Desktop */}
      <aside
        data-app-chrome
        className={cn(
          'hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 lg:flex',
          collapsed ? 'w-[60px]' : 'w-60',
        )}
      >
        {content}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-foreground/50 backdrop-blur-[1px]"
            onClick={onCloseMobile}
            aria-label="Tutup menu"
          />
          <aside
            data-app-chrome
            className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-xl"
          >
            <button
              onClick={onCloseMobile}
              className="absolute right-2 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-md text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
              aria-label="Tutup menu"
            >
              <X className="h-4 w-4" />
            </button>
            {content}
          </aside>
        </div>
      )}
    </>
  );
}

/** Versi rail: hanya ikon, untuk sidebar yang dicOLLapse. */
function CollapsedNav({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-0.5">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.path;
        return (
          <li key={item.path}>
            <Link
              href={item.path}
              onClick={onNavigate}
              title={item.title}
              aria-label={item.title}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex h-9 w-full items-center justify-center rounded-lg transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-primary'
                  : 'text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}