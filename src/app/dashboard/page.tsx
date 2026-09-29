'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import Link from 'next/link';
import {
  Boxes, Headphones, ShoppingCart, ArrowRight, PackageCheck,
  Users, CreditCard, AlertTriangle, Briefcase, CalendarOff,
  TrendingUp, CheckCircle2, Clock, XCircle,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, role, division, apiFetch } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  // IT Dashboard
  const renderITDashboard = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden border border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs bg-indigo-500/30 text-indigo-300 font-semibold px-2.5 py-0.5 rounded-full border border-indigo-500/40">IT Division</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Selamat Datang, {user?.name || 'Staff IT'}!</h1>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">Sistem Operasional Inventaris, Peminjaman Headset & Hardware, Purchase Request, dan Manajemen Vendor Xinghao.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/transactions/items" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center gap-1.5">
              <Headphones className="w-3.5 h-3.5" /><span>Headset User</span>
            </Link>
            <Link href="/inventory" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-all flex items-center gap-1.5">
              <PackageCheck className="w-3.5 h-3.5" /><span>Lihat Stok</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Master Item Terdaftar</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{kpis.totalMasterItems || 0}</h3>
            <div className="text-[11px] text-indigo-600 font-medium mt-1 flex items-center gap-1">
              <Boxes className="w-3.5 h-3.5" /><span>{kpis.totalVendors || 5} Vendor Rekanan</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><Boxes className="w-6 h-6" /></div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Headset User Aktif</p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">{kpis.activeLoans || 0} <span className="text-xs text-slate-500 font-normal">unit</span></h3>
            <div className="text-[11px] text-slate-500 mt-1">{kpis.returnedLoans || 0} Return | {kpis.rejectedLoans || 0} Reject</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center"><Headphones className="w-6 h-6" /></div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Pengajuan Vendor Pending</p>
            <h3 className="text-2xl font-bold text-rose-600 mt-1">{kpis.pendingSubmissions || 0}</h3>
            <p className="text-[11px] text-slate-500 mt-1">Menunggu review Staff IT</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center"><AlertTriangle className="w-6 h-6" /></div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Purchase Request</p>
            <h3 className="text-2xl font-bold text-indigo-600 mt-1">{kpis.totalPR || 0}</h3>
            <p className="text-[11px] text-slate-500 mt-1">{kpis.pendingPR || 0} Pending</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><ShoppingCart className="w-6 h-6" /></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800">Distribusi Kategori Item</h3>
            <Link href="/master/items" className="text-xs text-indigo-600 hover:underline">Kelola</Link>
          </div>
          <div className="space-y-3">
            {Object.entries(categoryCounts).map(([cat, count]: [string, any]) => {
              const total = kpis.totalMasterItems || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={cat}>
                  <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                    <span>{cat}</span>
                    <span className="text-slate-500 font-semibold">{count} item ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Status Stok Inventaris Terkini</h3>
              <p className="text-xs text-slate-500">Diurutkan dari yang terakhir diperbarui</p>
            </div>
            <Link href="/inventory" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
              <span>Buka Inventaris</span><ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead><tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] tracking-wider"><th className="pb-2.5 font-semibold">Nama Item</th><th className="pb-2.5 font-semibold">Kategori</th><th className="pb-2.5 font-semibold text-center">Ready</th><th className="pb-2.5 font-semibold text-center">In</th><th className="pb-2.5 font-semibold text-center">Out</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {stocks.map((stock: any) => (
                  <tr key={stock.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 font-medium text-slate-800">{stock.itemName}</td>
                    <td className="py-2.5 text-slate-500"><span className="bg-slate-100 px-2 py-0.5 rounded text-[10px]">{stock.category}</span></td>
                    <td className="py-2.5 text-center"><span className={`font-bold px-2 py-0.5 rounded-full text-xs ${stock.currentStock < 5 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'}`}>{stock.currentStock}</span></td>
                    <td className="py-2.5 text-center text-slate-600">+{stock.inStock}</td>
                    <td className="py-2.5 text-center text-slate-600">-{stock.outStock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  // Ops Dashboard
  const renderOpsDashboard = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-2xl p-6 text-white shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs bg-emerald-500/30 text-emerald-300 font-semibold px-2.5 py-0.5 rounded-full border border-emerald-500/40">Ops Division</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Selamat Datang, {user?.name}!</h1>
            <p className="text-xs text-slate-300 mt-1">Sistem Penagihan Nasabah, Payment Achievement, dan Monitoring Agen.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/nasabah" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /><span>Data Nasabah</span></Link>
            <Link href="/payment-achievements" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5" /><span>Payment Achievement</span></Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Total Nasabah</p>
          <h3 className="text-2xl font-bold text-slate-800 mt-1">{kpis.totalNasabah || 0}</h3>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Nasabah Overdue</p>
          <h3 className="text-2xl font-bold text-amber-600 mt-1">{kpis.overdueNasabah || 0}</h3>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Payment Hari Ini</p>
          <h3 className="text-2xl font-bold text-emerald-600 mt-1">Rp {((kpis.todayPayments || 0) / 1000000).toFixed(1)} Jt</h3>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Agen Aktif</p>
          <h3 className="text-2xl font-bold text-indigo-600 mt-1">{kpis.activeAgen || 0}</h3>
        </div>
      </div>
    </div>
  );

  // QC Dashboard
  const renderQCDashboard = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 rounded-2xl p-6 text-white shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs bg-purple-500/30 text-purple-300 font-semibold px-2.5 py-0.5 rounded-full border border-purple-500/40">QC Division</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Selamat Datang, {user?.name}!</h1>
            <p className="text-xs text-slate-300 mt-1">Monitoring Compliance OJK, Recording Review, dan Finding pelanggaran prosedur penagihan.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/qc/recording-reviews" className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"><Headphones className="w-3.5 h-3.5" /><span>Recording Review</span></Link>
            <Link href="/qc/findings" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /><span>Findings</span></Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Total Review</p>
          <h3 className="text-2xl font-bold text-slate-800 mt-1">{kpis.totalReviews || 0}</h3>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Compliant</p>
          <h3 className="text-2xl font-bold text-emerald-600 mt-1">{kpis.compliantReviews || 0}</h3>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Non-Compliant</p>
          <h3 className="text-2xl font-bold text-rose-600 mt-1">{kpis.nonCompliantReviews || 0}</h3>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Open Findings</p>
          <h3 className="text-2xl font-bold text-amber-600 mt-1">{kpis.openFindings || 0}</h3>
        </div>
      </div>
    </div>
  );

  // HR Dashboard
  const renderHRDashboard = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-900 via-pink-950 to-slate-900 rounded-2xl p-6 text-white shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs bg-pink-500/30 text-pink-300 font-semibold px-2.5 py-0.5 rounded-full border border-pink-500/40">HR Division</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Selamat Datang, {user?.name}!</h1>
            <p className="text-xs text-slate-300 mt-1">Sistem Employee Data, Leave Request, dan User Management.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/hr/employees" className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" /><span>Employee Data</span></Link>
            <Link href="/hr/leave-requests" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5"><CalendarOff className="w-3.5 h-3.5" /><span>Leave Request</span></Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Total Employee</p>
          <h3 className="text-2xl font-bold text-slate-800 mt-1">{kpis.totalEmployees || 0}</h3>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Active</p>
          <h3 className="text-2xl font-bold text-emerald-600 mt-1">{kpis.activeEmployees || 0}</h3>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-medium text-slate-500">On Leave</p>
          <h3 className="text-2xl font-bold text-amber-600 mt-1">{kpis.onLeaveEmployees || 0}</h3>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Pending Leave</p>
          <h3 className="text-2xl font-bold text-rose-600 mt-1">{kpis.pendingLeaveRequests || 0}</h3>
        </div>
      </div>
    </div>
  );

  // SuperAdmin sees all
  if (role === 'SUPERADMIN') {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md border border-slate-800">
          <h1 className="text-2xl font-bold tracking-tight">SuperAdmin Dashboard</h1>
          <p className="text-xs text-slate-300 mt-1">Akses semua divisi: IT, Ops, QC, HR</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/dashboard" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><Boxes className="w-5 h-5" /></div>
              <div><p className="text-sm font-bold text-slate-800">IT Dashboard</p><p className="text-[11px] text-slate-500">Inventaris & Aset</p></div>
            </div>
          </Link>
          <Link href="/dashboard" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><Users className="w-5 h-5" /></div>
              <div><p className="text-sm font-bold text-slate-800">Ops Dashboard</p><p className="text-[11px] text-slate-500">Penagihan Nasabah</p></div>
            </div>
          </Link>
          <Link href="/dashboard" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center"><AlertTriangle className="w-5 h-5" /></div>
              <div><p className="text-sm font-bold text-slate-800">QC Dashboard</p><p className="text-[11px] text-slate-500">Compliance OJK</p></div>
            </div>
          </Link>
          <Link href="/dashboard" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center"><Briefcase className="w-5 h-5" /></div>
              <div><p className="text-sm font-bold text-slate-800">HR Dashboard</p><p className="text-[11px] text-slate-500">Employee & Leave</p></div>
            </div>
          </Link>
        </div>
      </div>
    );
  }

  // Render based on division
  if (division === 'OPS') return renderOpsDashboard();
  if (division === 'QC') return renderQCDashboard();
  if (division === 'HR') return renderHRDashboard();
  return renderITDashboard(); // Default to IT
}
