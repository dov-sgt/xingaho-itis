'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Feature, canAccessMenu } from '@/lib/rbac';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Boxes, Building2, PackageSearch, Headphones, ShoppingCart,
  Truck, FileText, Users, BarChart3, Server, PackageOpen,
  PackagePlus, Calendar, AlertTriangle, ClipboardCheck, CreditCard, Briefcase, CalendarOff, Wrench, ShieldCheck,
  ChevronDown, ChevronRight, Settings,
} from 'lucide-react';

interface MenuItem {
  title: string;
  path: string;
  feature: Feature;
  icon: React.ComponentType<{ className?: string }>;
}

const IT_MENUS: MenuItem[] = [
  { title: 'Dashboard', path: '/dashboard', feature: 'dashboard', icon: LayoutDashboard },
  { title: 'Master Inventory', path: '/master/items', feature: 'master_item', icon: Boxes },
  { title: 'Master Vendor', path: '/master/vendors', feature: 'master_vendor', icon: Building2 },
  { title: 'Inventaris & Stok', path: '/inventory', feature: 'inventory_type_item', icon: PackageSearch },
  { title: 'Stock In', path: '/stock-in', feature: 'inventory_type_item', icon: PackagePlus },
  { title: 'Headset User', path: '/transactions/items', feature: 'transaction_item', icon: Headphones },
  { title: 'Stock Out', path: '/stock-out-transactions', feature: 'transaction_item', icon: PackageOpen },
  { title: 'Booking Asset', path: '/bookings', feature: 'transaction_item', icon: Calendar },
  { title: 'Servis Asset', path: '/servis-assets', feature: 'transaction_item', icon: Wrench },
  { title: 'Purchase Request', path: '/transactions/purchase-requests', feature: 'purchase_request', icon: ShoppingCart },
  { title: 'Delivery Order', path: '/transactions/delivery-orders', feature: 'delivery_order', icon: Truck },
  { title: 'Pengajuan Vendor', path: '/transactions/vendor-submissions', feature: 'vendor_submission', icon: FileText },
  { title: 'Reporting', path: '/reports', feature: 'reporting', icon: BarChart3 },
];

const OPS_MENUS: MenuItem[] = [
  { title: 'Dashboard', path: '/dashboard', feature: 'dashboard', icon: LayoutDashboard },
  { title: 'Data Nasabah', path: '/nasabah', feature: 'transaction_item', icon: Users },
  { title: 'Remarks', path: '/remarks', feature: 'transaction_item', icon: ClipboardCheck },
  { title: 'Payment Achievement', path: '/payment-achievements', feature: 'transaction_item', icon: CreditCard },
  { title: 'Reporting', path: '/reports', feature: 'reporting', icon: BarChart3 },
];

const QC_MENUS: MenuItem[] = [
  { title: 'Dashboard', path: '/dashboard', feature: 'dashboard', icon: LayoutDashboard },
  { title: 'Recording Review', path: '/qc/recording-reviews', feature: 'transaction_item', icon: Headphones },
  { title: 'QC Findings', path: '/qc/findings', feature: 'transaction_item', icon: AlertTriangle },
  { title: 'Reporting', path: '/reports', feature: 'reporting', icon: BarChart3 },
];

const HR_MENUS: MenuItem[] = [
  { title: 'Dashboard', path: '/dashboard', feature: 'dashboard', icon: LayoutDashboard },
  { title: 'Employee Data', path: '/hr/employees', feature: 'user_management', icon: Briefcase },
  { title: 'Leave Request', path: '/hr/leave-requests', feature: 'user_management', icon: CalendarOff },
  { title: 'User Management', path: '/users', feature: 'user_management', icon: Users },
  { title: 'Reporting', path: '/reports', feature: 'reporting', icon: BarChart3 },
];

const SUPERADMIN_MENUS: MenuItem[] = [
  { title: 'User Management', path: '/users', feature: 'user_management', icon: Users },
  { title: 'Role Management', path: '/roles', feature: 'user_management', icon: ShieldCheck },
  { title: 'Division Management', path: '/divisions', feature: 'user_management', icon: Building2 },
];

const DIVISION_SECTIONS = [
  { key: 'IT', label: 'IT Division', menus: IT_MENUS },
  { key: 'OPS', label: 'Ops Division', menus: OPS_MENUS },
  { key: 'QC', label: 'QC Division', menus: QC_MENUS },
  { key: 'HR', label: 'HR Division', menus: HR_MENUS },
] as const;

export default function Sidebar() {
  const pathname = usePathname();
  const { canAccess, role, user } = useAuth();
  // All collapsed by default
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpand = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <aside className="w-60 bg-sidebar text-sidebar-foreground flex flex-col flex-shrink-0 min-h-screen border-r border-sidebar-border">
      <div className="h-14 px-4 flex items-center gap-3 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
          <Server className="h-4 w-4 text-sidebar-primary-foreground" />
        </div>
        <div>
          <h1 className="font-bold text-sm tracking-wide">XINGHAO ITIS</h1>
          <p className="text-[10px] text-sidebar-foreground/60">IT Information System</p>
        </div>
      </div>

      <div className="px-4 py-2 border-b border-sidebar-border bg-sidebar/50">
        <div className="flex items-center justify-between">
          <span className="text-xs text-sidebar-foreground/60">{role}</span>
          {user?.division && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sidebar-primary/10 text-sidebar-primary">
              {user.division}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-3 px-2">
        {/* SuperAdmin sees all divisions + admin menu */}
        {role === 'SUPERADMIN' ? (
          <>
            {DIVISION_SECTIONS.map((section) => {
              const visibleMenus = section.menus.filter((item) => canAccessMenu(role, item.feature));
              if (visibleMenus.length === 0) return null;

              const isExpanded = expanded[section.key] ?? false;

              return (
                <div key={section.key} className="mb-2">
                  <button
                    onClick={() => toggleExpand(section.key)}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-semibold text-sidebar-foreground/50 uppercase tracking-wider hover:text-sidebar-foreground transition-colors"
                  >
                    <span>{section.label}</span>
                    {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  </button>
                  {isExpanded && (
                    <div className="space-y-0.5 mt-1">
                      {visibleMenus.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.path || (item.path !== '/dashboard' && pathname.startsWith(item.path));
                        return (
                          <Link
                            key={item.path}
                            href={item.path}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors",
                              isActive
                                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            )}
                          >
                            <Icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* SuperAdmin sub-menu */}
            <div className="mb-2">
              <button
                onClick={() => toggleExpand('SUPERADMIN')}
                className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-semibold text-sidebar-foreground/50 uppercase tracking-wider hover:text-sidebar-foreground transition-colors"
              >
                <span>Admin Settings</span>
                {expanded['SUPERADMIN'] ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </button>
              {expanded['SUPERADMIN'] && (
                <div className="space-y-0.5 mt-1">
                  {SUPERADMIN_MENUS.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        href={item.path}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors",
                          isActive
                            ? "bg-sidebar-primary text-sidebar-primary-foreground"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Regular users see only their division menu */}
            {DIVISION_SECTIONS.map((section) => {
              if (user?.division !== section.key) return null;

              const visibleMenus = section.menus.filter((item) => canAccessMenu(role, item.feature));
              if (visibleMenus.length === 0) return null;

              const isExpanded = expanded[section.key] ?? false;

              return (
                <div key={section.key} className="mb-2">
                  <button
                    onClick={() => toggleExpand(section.key)}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-semibold text-sidebar-foreground/50 uppercase tracking-wider hover:text-sidebar-foreground transition-colors"
                  >
                    <span>{section.label}</span>
                    {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  </button>
                  {isExpanded && (
                    <div className="space-y-0.5 mt-1">
                      {visibleMenus.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.path || (item.path !== '/dashboard' && pathname.startsWith(item.path));
                        return (
                          <Link
                            key={item.path}
                            href={item.path}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors",
                              isActive
                                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            )}
                          >
                            <Icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>

      <div className="p-3 border-t border-sidebar-border text-[10px] text-sidebar-foreground/40">
        <div className="font-semibold text-sidebar-foreground/60">Xinghao IT Division</div>
      </div>
    </aside>
  );
}
