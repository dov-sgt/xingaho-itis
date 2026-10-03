'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { Role } from '@/lib/rbac';
import { UserCheck, ShieldAlert, LogOut, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const { user, role, switchRole, logout } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const handleLogout = () => {
    if (!confirm('Apakah Anda yakin ingin keluar?')) return;
    logout();
    toast('success', 'Anda telah keluar dari sistem');
    router.push('/login');
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      {/* Page / System Title */}
      <div className="flex items-center space-x-3">
        <h2 className="text-sm font-semibold text-slate-800">
          Xinghao IT Information System
        </h2>
        <span className="text-slate-300">|</span>
        <span className="text-xs text-slate-500 font-medium hidden sm:inline">
          Operasional Inventaris & Perangkat IT
        </span>
      </div>

      {/* Right controls: Role switcher & profile */}
      <div className="flex items-center space-x-4">
        {/* Quick Role Simulation Switcher */}
        <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200 text-xs">
          <span className="text-slate-500 font-medium px-2 flex items-center gap-1 hidden md:flex">
            <ShieldAlert className="w-3.5 h-3.5 text-indigo-500" />
            Simulasi Role:
          </span>
          {(['SUPERADMIN', 'MANAGER_OPS', 'SPV_OPS', 'LEADER_OPS', 'AGEN', 'SPV_QC', 'STAFF_QC', 'SPV_HR', 'STAFF_HR'] as Role[]).map((r) => (
            <button
              key={r}
              onClick={() => {
                switchRole(r);
                toast('success', `Role diubah menjadi ${r}`);
                if (r === 'AGEN') {
                  router.push('/transactions/vendor-submissions');
                }
              }}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                role === r
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* User Badge */}
        <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-semibold text-slate-800 leading-tight">
              {user?.name || 'User'}
            </div>
            <div className="text-[10px] text-slate-500 capitalize">{role.toLowerCase()}</div>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          title="Keluar"
          className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
