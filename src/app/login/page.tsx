'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { Role } from '@/lib/rbac';
import { Server, Lock, User, ArrowRight, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();
  const { toast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) {
      setError('Masukkan username');
      return;
    }

    setLoading(true);
    // Simulate login (demo mode - no real auth)
    setTimeout(() => {
      login(username);
      toast('success', `Login berhasil sebagai ${username}`);
      router.push('/dashboard');
      setLoading(false);
    }, 500);
  };

  const handleQuickLogin = (role: Role, user: string) => {
    login(user, role);
    toast('success', `Login berhasil sebagai ${role}`);
    if (role === 'VENDOR') {
      router.push('/transactions/vendor-submissions');
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 border border-slate-100">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-indigo-600 rounded-xl mx-auto flex items-center justify-center text-white shadow-lg shadow-indigo-500/40 mb-4">
            <Server className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">XINGHAO ITIS</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            IT Information System Staff & Operasional
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="superadmin / spv / staff / vendor"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{loading ? 'Memproses...' : 'Masuk ke Sistem'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3 text-center flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
            Quick Demo Login (Pilih Role):
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleQuickLogin('SUPERADMIN', 'superadmin')}
              className="p-2.5 rounded-lg border border-rose-200 bg-rose-50/50 hover:bg-rose-100/70 text-left transition-colors"
            >
              <div className="text-xs font-bold text-rose-700">SuperAdmin</div>
              <div className="text-[10px] text-rose-600/70">Akses penuh CRUD</div>
            </button>
            <button
              onClick={() => handleQuickLogin('SPV', 'spv')}
              className="p-2.5 rounded-lg border border-amber-200 bg-amber-50/50 hover:bg-amber-100/70 text-left transition-colors"
            >
              <div className="text-xs font-bold text-amber-700">SPV IT</div>
              <div className="text-[10px] text-amber-600/70">Supervisi & Approval</div>
            </button>
            <button
              onClick={() => handleQuickLogin('STAFF', 'staff')}
              className="p-2.5 rounded-lg border border-blue-200 bg-blue-50/50 hover:bg-blue-100/70 text-left transition-colors"
            >
              <div className="text-xs font-bold text-blue-700">Staff IT</div>
              <div className="text-[10px] text-blue-600/70">Operasional Transaksi</div>
            </button>
            <button
              onClick={() => handleQuickLogin('VENDOR', 'vendor')}
              className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/70 text-left transition-colors"
            >
              <div className="text-xs font-bold text-emerald-700">Vendor</div>
              <div className="text-[10px] text-emerald-600/70">Pengajuan Vendor</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
