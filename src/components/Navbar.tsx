'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/Toast';
import { LogOut, ShieldCheck, Sun, Moon, Globe } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const { user, role, logout } = useAuth();
  const { theme, toggleTheme, lang, toggleLang } = useApp();
  const { toast } = useToast();
  const router = useRouter();

  const handleLogout = () => {
    if (!confirm('Apakah Anda yakin ingin keluar?')) return;
    logout();
    toast('success', 'Anda telah keluar dari sistem');
    router.push('/login');
  };

  return (
    <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Xinghao ITIS
        </h1>
        <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
          {role === 'SUPERADMIN' ? 'All Divisions' : `${user?.division || 'IT'} Division`}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Language Toggle */}
        <button
          onClick={toggleLang}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={lang === 'id' ? 'Switch to English' : 'Ganti ke Indonesia'}
        >
          <Globe className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={theme === 'light' ? 'Dark mode' : 'Light mode'}
        >
          {theme === 'light' ? (
            <Moon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          ) : (
            <Sun className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          )}
        </button>

        {/* Role Badge */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg px-2 py-1 border border-slate-200 dark:border-slate-700">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-500 mr-1.5" />
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
            {role}
          </span>
        </div>

        {/* User */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">
          <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300 hidden sm:inline">
            {user?.name || 'User'}
          </span>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          title="Keluar"
          className="p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
        >
          <LogOut className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        </button>
      </div>
    </header>
  );
}
