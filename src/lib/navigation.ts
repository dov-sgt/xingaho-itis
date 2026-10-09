import {
  LayoutDashboard, Boxes, Building2, PackageSearch, Headphones, ShoppingCart,
  Truck, FileText, Users, BarChart3, PackageOpen,
  PackagePlus, Calendar, AlertTriangle, ClipboardCheck, CreditCard, Briefcase, CalendarOff, Wrench, ShieldCheck, Network, MapPin, SlidersHorizontal,
} from 'lucide-react';
import type React from 'react';
import type { Feature } from './rbac';

export interface NavItem {
  title: string;
  path: string;
  feature: Feature;
  icon: React.ComponentType<{ className?: string }>;
}

/**
 * Satu sumber kebenaran untuk navigasi. Sidebar, breadcrumb, dan RouteGuard
 * semuanya membaca dari sini sehingga menu yang tampil selalu punya fitur
 * permission yang sama dengan yang divalidasi backend.
 *
 * Item 8: "Pengajuan Vendor" sudah diubah menjadi "Pengajuan".
 */
export const IT_NAV: NavItem[] = [
  { title: 'Dashboard', path: '/dashboard', feature: 'dashboard', icon: LayoutDashboard },
  { title: 'Master Inventory', path: '/master/items', feature: 'master_item', icon: Boxes },
  { title: 'Master Vendor', path: '/master/vendors', feature: 'master_vendor', icon: Building2 },
  { title: 'Inventaris & Stok', path: '/inventory', feature: 'inventory_type_item', icon: PackageSearch },
  { title: 'Stock In', path: '/stock-in', feature: 'inventory_type_item', icon: PackagePlus },
  { title: 'Headset User', path: '/transactions/items', feature: 'transaction_headset', icon: Headphones },
  { title: 'Daftar Damage', path: '/damaged-items', feature: 'transaction_headset', icon: AlertTriangle },
  { title: 'Stock Out', path: '/stock-out-transactions', feature: 'transaction_stockout', icon: PackageOpen },
  { title: 'Purchase Request', path: '/transactions/purchase-requests', feature: 'purchase_request', icon: ShoppingCart },
  { title: 'Delivery Order', path: '/transactions/delivery-orders', feature: 'delivery_order', icon: Truck },
  { title: 'Pengajuan', path: '/transactions/vendor-submissions', feature: 'vendor_submission', icon: FileText },
  { title: 'Booking Asset', path: '/bookings', feature: 'booking', icon: Calendar },
  { title: 'Servis Asset', path: '/servis-assets', feature: 'servis_asset', icon: Wrench },
  { title: 'Log Ruang Server', path: '/log-ruang-server', feature: 'log_ruang_server', icon: MapPin },
  { title: 'Reporting', path: '/reports', feature: 'reporting', icon: BarChart3 },
];

export const OPS_NAV: NavItem[] = [
  { title: 'Dashboard', path: '/dashboard', feature: 'dashboard', icon: LayoutDashboard },
  { title: 'Data Nasabah', path: '/nasabah', feature: 'transaction_stockout', icon: Users },
  { title: 'Remarks', path: '/remarks', feature: 'transaction_stockout', icon: ClipboardCheck },
  { title: 'Payment Achievement', path: '/payment-achievements', feature: 'transaction_stockout', icon: CreditCard },
  { title: 'Headset User', path: '/transactions/items', feature: 'transaction_headset', icon: Headphones },
  { title: 'Pengajuan', path: '/transactions/vendor-submissions', feature: 'vendor_submission', icon: FileText },
  { title: 'Reporting', path: '/reports', feature: 'reporting', icon: BarChart3 },
];

export const QC_NAV: NavItem[] = [
  { title: 'Dashboard', path: '/dashboard', feature: 'dashboard', icon: LayoutDashboard },
  { title: 'Recording Review', path: '/qc/recording-reviews', feature: 'recording_review', icon: Headphones },
  { title: 'QC Findings', path: '/qc/findings', feature: 'finding', icon: AlertTriangle },
  { title: 'Reporting', path: '/reports', feature: 'reporting', icon: BarChart3 },
];

export const HR_NAV: NavItem[] = [
  { title: 'Dashboard', path: '/dashboard', feature: 'dashboard', icon: LayoutDashboard },
  { title: 'Employee Data', path: '/hr/employees', feature: 'user_management', icon: Briefcase },
  { title: 'Leave Request', path: '/hr/leave-requests', feature: 'user_management', icon: CalendarOff },
  { title: 'User Management', path: '/users', feature: 'user_management', icon: Users },
  { title: 'Reporting', path: '/reports', feature: 'reporting', icon: BarChart3 },
];

export const ADMIN_NAV: NavItem[] = [
  { title: 'User Management', path: '/users', feature: 'user_management', icon: Users },
  { title: 'Role Management', path: '/roles', feature: 'role_management', icon: ShieldCheck },
  { title: 'Division Management', path: '/divisions', feature: 'division_management', icon: Network },
];

export const DIVISION_NAV: { key: string; label: string; menus: NavItem[] }[] = [
  { key: 'IT', label: 'IT Division', menus: IT_NAV },
  { key: 'OPS', label: 'Ops Division', menus: OPS_NAV },
  { key: 'QC', label: 'QC Division', menus: QC_NAV },
  { key: 'HR', label: 'HR Division', menus: HR_NAV },
];

/** Semua item nav milik user SuperAdmin (union semua divisi). */
export const ALL_NAV: NavItem[] = DIVISION_NAV.flatMap((d) => d.menus);

/**
 * Title halaman untuk path tertentu — dipakai breadcrumb/topbar.
 */
export function titleForPath(pathname: string): string {
  const all = [...ALL_NAV, ...ADMIN_NAV];
  const exact = all.find((i) => i.path === pathname);
  if (exact) return exact.title;
  const nested = all
    .filter((i) => i.path !== '/' && pathname.startsWith(i.path))
    .sort((a, b) => b.path.length - a.path.length)[0];
  if (nested) return nested.title;
  const last = pathname.split('/').filter(Boolean).pop() || 'Dashboard';
  return last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, ' ');
}