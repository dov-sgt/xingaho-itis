'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/Toast';
import Link from 'next/link';
import {
  Boxes, Headphones, ShoppingCart, ArrowRight, PackageCheck,
  Users, CreditCard, AlertTriangle, Briefcase, CalendarOff,
  LayoutDashboard, Settings,
} from 'lucide-react';

const DIVISIONS = [
  { key: 'IT', label: 'IT', color: 'indigo', icon: Boxes },
  { key: 'OPS', label: 'Ops', color: 'emerald', icon: Users },
  { key: 'QC', label: 'QC', color: 'purple', icon: AlertTriangle },
  { key: 'HR', label: 'HR', color: 'pink', icon: Briefcase },
];

export default function DashboardPage() {
  const { user, role, division, apiFetch } = useAuth();
  const { lang } = useApp();
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDivision, setSelectedDivision] = useState<string>(division || 'IT');

  useEffect(() => {
    apiFetch('/api/dashboard')
      .then((res) => {
        if (!res.ok) throw new Error('Gagal memuat dashboard');
        return res.json();
      })
      .then((res) => { setData(res); setLoading(false); })
      .catch((err) => { console.error(err); toast('error', 'Gagal memuat data dashboard'); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const stocks = data?.stocks || [];
  const categoryCounts = data?.categoryCounts || {};
  const recentTransactions = data?.recentTransactions || [];

  // SuperAdmin division picker
  if (role === 'SUPERADMIN') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Pilih divisi untuk melihat dashboard</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {DIVISIONS.map((div) => {
            const Icon = div.icon;
            const colors: Record<string, string> = {
              indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
              emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
              purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
              pink: 'bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400',
            };
            return (
              <button
                key={div.key}
                onClick={() => setSelectedDivision(div.key)}
                className={`p-6 rounded-xl border transition-all text-left ${
                  selectedDivision === div.key
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg ${colors[div.color]} flex items-center justify-center mb-3`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{div.label}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {div.key === 'IT' && 'Inventaris & Aset'}
                  {div.key === 'OPS' && 'Penagihan Nasabah'}
                  {div.key === 'QC' && 'Compliance OJK'}
                  {div.key === 'HR' && 'Employee & Leave'}
                </p>
              </button>
            );
          })}
        </div>

        {/* Show selected division dashboard */}
        {selectedDivision === 'IT' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Master Item</p>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{kpis.totalMasterItems || 0}</h3>
              </div>
              <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Headset User Aktif</p>
                <h3 className="text-2xl font-bold text-amber-600 mt-1">{kpis.activeLoans || 0}</h3>
              </div>
              <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Pengajuan Vendor Pending</p>
                <h3 className="text-2xl font-bold text-rose-600 mt-1">{kpis.pendingSubmissions || 0}</h3>
              </div>
              <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Purchase Request</p>
                <h3 className="text-2xl font-bold text-indigo-600 mt-1">{kpis.totalPR || 0}</h3>
              </div>
            </div>
          </div>
        )}

        {selectedDivision === 'OPS' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Nasabah</p>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{kpis.totalNasabah || 0}</h3>
            </div>
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Overdue</p>
              <h3 className="text-2xl font-bold text-amber-600 mt-1">{kpis.overdueNasabah || 0}</h3>
            </div>
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Payment Hari Ini</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">Rp {((kpis.todayPayments || 0) / 1000000).toFixed(1)} Jt</h3>
            </div>
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Agen Aktif</p>
              <h3 className="text-2xl font-bold text-indigo-600 mt-1">{kpis.activeAgen || 0}</h3>
            </div>
          </div>
        )}

        {selectedDivision === 'QC' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Review</p>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{kpis.totalReviews || 0}</h3>
            </div>
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Compliant</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">{kpis.compliantReviews || 0}</h3>
            </div>
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Non-Compliant</p>
              <h3 className="text-2xl font-bold text-rose-600 mt-1">{kpis.nonCompliantReviews || 0}</h3>
            </div>
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Open Findings</p>
              <h3 className="text-2xl font-bold text-amber-600 mt-1">{kpis.openFindings || 0}</h3>
            </div>
          </div>
        )}

        {selectedDivision === 'HR' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Employee</p>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{kpis.totalEmployees || 0}</h3>
            </div>
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Active</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">{kpis.activeEmployees || 0}</h3>
            </div>
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">On Leave</p>
              <h3 className="text-2xl font-bold text-amber-600 mt-1">{kpis.onLeaveEmployees || 0}</h3>
            </div>
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Pending Leave</p>
              <h3 className="text-2xl font-bold text-rose-600 mt-1">{kpis.pendingLeaveRequests || 0}</h3>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Non-SuperAdmin: show their division dashboard
  if (division === 'OPS') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Ops Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Penagihan Nasabah & Payment Achievement</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Nasabah</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{kpis.totalNasabah || 0}</h3>
          </div>
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Overdue</p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">{kpis.overdueNasabah || 0}</h3>
          </div>
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Payment Hari Ini</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">Rp {((kpis.todayPayments || 0) / 1000000).toFixed(1)} Jt</h3>
          </div>
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Agen Aktif</p>
            <h3 className="text-2xl font-bold text-indigo-600 mt-1">{kpis.activeAgen || 0}</h3>
          </div>
        </div>
      </div>
    );
  }

  if (division === 'QC') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">QC Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Compliance OJK & Recording Review</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Review</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{kpis.totalReviews || 0}</h3>
          </div>
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Compliant</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">{kpis.compliantReviews || 0}</h3>
          </div>
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Non-Compliant</p>
            <h3 className="text-2xl font-bold text-rose-600 mt-1">{kpis.nonCompliantReviews || 0}</h3>
          </div>
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Open Findings</p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">{kpis.openFindings || 0}</h3>
          </div>
        </div>
      </div>
    );
  }

  if (division === 'HR') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">HR Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Employee Data & Leave Request</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Employee</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{kpis.totalEmployees || 0}</h3>
          </div>
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Active</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">{kpis.activeEmployees || 0}</h3>
          </div>
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">On Leave</p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">{kpis.onLeaveEmployees || 0}</h3>
          </div>
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Pending Leave</p>
            <h3 className="text-2xl font-bold text-rose-600 mt-1">{kpis.pendingLeaveRequests || 0}</h3>
          </div>
        </div>
      </div>
    );
  }

  // Default: IT Dashboard
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">IT Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Inventaris, Headset User, & Purchase Request</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Master Item</p>
          <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{kpis.totalMasterItems || 0}</h3>
        </div>
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Headset User Aktif</p>
          <h3 className="text-2xl font-bold text-amber-600 mt-1">{kpis.activeLoans || 0}</h3>
        </div>
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Pengajuan Vendor Pending</p>
          <h3 className="text-2xl font-bold text-rose-600 mt-1">{kpis.pendingSubmissions || 0}</h3>
        </div>
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Purchase Request</p>
          <h3 className="text-2xl font-bold text-indigo-600 mt-1">{kpis.totalPR || 0}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 lg:col-span-1">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4">Kategori Item</h3>
          <div className="space-y-3">
            {Object.entries(categoryCounts).map(([cat, count]: [string, any]) => {
              const total = kpis.totalMasterItems || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={cat}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600 dark:text-slate-400">{cat}</span>
                    <span className="text-slate-500 dark:text-slate-400">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                    <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4">Stok Terkini</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="pb-2 font-medium text-slate-500 dark:text-slate-400">Item</th>
                  <th className="pb-2 font-medium text-slate-500 dark:text-slate-400 text-center">Ready</th>
                  <th className="pb-2 font-medium text-slate-500 dark:text-slate-400 text-center">In</th>
                  <th className="pb-2 font-medium text-slate-500 dark:text-slate-400 text-center">Out</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {stocks.slice(0, 8).map((stock: any) => (
                  <tr key={stock.id}>
                    <td className="py-2 font-medium text-slate-800 dark:text-slate-100">{stock.itemName}</td>
                    <td className="py-2 text-center">
                      <span className={`font-bold px-2 py-0.5 rounded-full text-xs ${stock.currentStock < 5 ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600'}`}>
                        {stock.currentStock}
                      </span>
                    </td>
                    <td className="py-2 text-center text-slate-600 dark:text-slate-400">+{stock.inStock}</td>
                    <td className="py-2 text-center text-slate-600 dark:text-slate-400">-{stock.outStock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
