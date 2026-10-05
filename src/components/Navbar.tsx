'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { LogOut, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const { user, role, logout } = useAuth();
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
      <div className="flex items-center space-x-3">
        <h2 className="text-sm font-semibold text-slate-800">
          Xinghao IT Information System
        </h2>
        <span className="text-slate-300">|</span>
        <span className="text-xs text-slate-500 font-medium hidden sm:inline">
          {role === 'SUPERADMIN' ? 'All Divisions' : `${user?.division || 'IT'} Division`}
        </span>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200 text-xs">
          <span className="text-slate-500 font-medium px-2 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
            {role}
          </span>
        </div>

        <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-semibold text-slate-800 leading-tight">
              {user?.name || 'User'}
            </div>
            <div className="text-[10px] text-slate-500">{user?.division || 'IT'}</div>
          </div>
        </div>

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
