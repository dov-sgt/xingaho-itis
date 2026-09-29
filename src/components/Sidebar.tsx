'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Feature } from '@/lib/rbac';
import {
  LayoutDashboard,
  Boxes,
  Building2,
  PackageSearch,
  Headphones,
  ShoppingCart,
  Truck,
  FileText,
  Users,
  BarChart3,
  Server,
  ShieldCheck,
  PackageOpen,
  PackagePlus,
  Wrench,
  DoorOpen,
  Calendar,
  AlertTriangle,
  UserCheck,
  CreditCard,
  ClipboardCheck,
} from 'lucide-react';

interface MenuItem {
  title: string;
  path: string;
  feature: Feature;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const MENU_ITEMS: MenuItem[] = [
  { title: 'Dashboard', path: '/dashboard', feature: 'dashboard', icon: LayoutDashboard },
  { title: 'Master Inventory', path: '/master/items', feature: 'master_item', icon: Boxes },
  { title: 'Master Vendor', path: '/master/vendors', feature: 'master_vendor', icon: Building2 },
  { title: 'Inventaris & Stok', path: '/inventory', feature: 'inventory_type_item', icon: PackageSearch },
  { title: 'Stock In', path: '/stock-in', feature: 'inventory_type_item', icon: PackagePlus },
  { title: 'Headset User', path: '/transactions/items', feature: 'transaction_item', icon: Headphones },
  { title: 'Stock Out', path: '/stock-out-transactions', feature: 'transaction_item', icon: PackageOpen },
  { title: 'Booking Asset', path: '/bookings', feature: 'transaction_item', icon: Calendar },
  { title: 'Servis Asset', path: '/servis-assets', feature: 'transaction_item', icon: Wrench },
  { title: 'Log Ruang Server', path: '/log-ruang-server', feature: 'transaction_item', icon: DoorOpen },
  { title: 'Purchase Request', path: '/transactions/purchase-requests', feature: 'purchase_request', icon: ShoppingCart },
  { title: 'Delivery Order', path: '/transactions/delivery-orders', feature: 'delivery_order', icon: Truck },
  { title: 'Pengajuan Vendor', path: '/transactions/vendor-submissions', feature: 'vendor_submission', icon: FileText },
  { title: 'Data Nasabah', path: '/nasabah', feature: 'transaction_item', icon: Users },
  { title: 'Remarks', path: '/remarks', feature: 'transaction_item', icon: ClipboardCheck },
  { title: 'Payment Achievement', path: '/payment-achievements', feature: 'transaction_item', icon: CreditCard },
  { title: 'Recording Review', path: '/qc/recording-reviews', feature: 'transaction_item', icon: Headphones },
  { title: 'QC Findings', path: '/qc/findings', feature: 'transaction_item', icon: AlertTriangle },
  { title: 'User Management', path: '/users', feature: 'user_management', icon: Users },
  { title: 'Reporting', path: '/reports', feature: 'reporting', icon: BarChart3 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { canAccess, role } = useAuth();
  const accessibleMenus = MENU_ITEMS.filter((item) => canAccess(item.feature));

  const roleColors: Record<string, string> = {
    SUPERADMIN: 'bg-rose-500/10 text-rose-600 border-rose-200',
    MANAGER_OPS: 'bg-amber-500/10 text-amber-600 border-amber-200',
    SPV_OPS: 'bg-amber-500/10 text-amber-600 border-amber-200',
    LEADER_OPS: 'bg-blue-500/10 text-blue-600 border-blue-200',
    AGEN: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
    SPV_QC: 'bg-purple-500/10 text-purple-600 border-purple-200',
    STAFF_QC: 'bg-cyan-500/10 text-cyan-600 border-cyan-200',
  };

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col flex-shrink-0 min-h-screen border-r border-slate-800">
      <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-500/30">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-wide text-white leading-tight">XINGHAO ITIS</h1>
            <p className="text-[11px] text-slate-400 font-medium">IT Information System</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-3 border-b border-slate-800/60 bg-slate-950/40">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            Hak Akses:
          </span>
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${roleColors[role] || 'bg-slate-800 text-slate-300'}`}>
            {role}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Menu Operasional</div>
        {accessibleMenus.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path || (item.path !== '/dashboard' && pathname.startsWith(item.path));
          return (
            <Link key={item.path} href={item.path} className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${isActive ? 'bg-indigo-600 text-white font-semibold shadow-sm' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.title}</span>
              </div>
              {item.badge && <span className="bg-indigo-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{item.badge}</span>}
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-slate-800 text-[11px] text-slate-400 bg-slate-950/50">
        <div className="text-slate-300 font-semibold">Xinghao IT Division</div>
        <div className="text-[10px]">Ubuntu Server /var/www/xinghao/itis</div>
      </div>
    </aside>
  );
}
