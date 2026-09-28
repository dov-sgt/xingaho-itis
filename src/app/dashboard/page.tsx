'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import Link from 'next/link';
import {
  Boxes,
  Headphones,
  ShoppingCart,
  ArrowRight,
  PackageCheck,
  FileText,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, role, apiFetch } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/dashboard')
      .then((res) => {
        if (!res.ok) throw new Error('Gagal memuat dashboard');
        return res.json();
      })
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        toast('error', 'Gagal memuat data dashboard');
        setLoading(false);
      });
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

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden border border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs bg-indigo-500/30 text-indigo-300 font-semibold px-2.5 py-0.5 rounded-full border border-indigo-500/40">
                Mode: {role}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Selamat Datang, {user?.name || 'Staff IT'}!
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Sistem Operasional Inventaris, Peminjaman Headset & Hardware, Purchase Request, dan Manajemen Vendor Xinghao.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/transactions/items" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center gap-1.5">
              <Headphones className="w-3.5 h-3.5" />
              <span>Headset User</span>
            </Link>
            <Link href="/inventory" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-all flex items-center gap-1.5">
              <PackageCheck className="w-3.5 h-3.5" />
              <span>Lihat Stok Inventaris</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Master Item Terdaftar</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{kpis.totalMasterItems || 0}</h3>
            <div className="text-[11px] text-indigo-600 font-medium mt-1 flex items-center gap-1">
              <Boxes className="w-3.5 h-3.5" />
              <span>{kpis.totalVendors || 5} Vendor Rekanan</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Boxes className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Headset User Aktif</p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">{kpis.activeLoans || 0} <span className="text-xs text-slate-500 font-normal">unit</span></h3>
            <div className="text-[11px] text-slate-500 mt-1">
              {kpis.returnedLoans || 0} Return | {kpis.rejectedLoans || 0} Reject
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Headphones className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Pengajuan Vendor Pending</p>
            <h3 className="text-2xl font-bold text-rose-600 mt-1">{kpis.pendingSubmissions || 0}</h3>
            <p className="text-[11px] text-slate-500 mt-1">Menunggu review Staff IT</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Purchase Request</p>
            <h3 className="text-2xl font-bold text-indigo-600 mt-1">{kpis.totalPR || 0}</h3>
            <p className="text-[11px] text-slate-500 mt-1">{kpis.pendingPR || 0} Pending</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <ShoppingCart className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Category Distribution */}
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
          <div className="mt-6 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Status Laptop:</span>
              <div className="flex gap-2">
                <span className="text-emerald-600 font-semibold">{kpis.goodLaptops || 0} Baik</span>
                <span className="text-rose-500 font-semibold">{kpis.brokenLaptops || 0} Rusak</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stock Status - sorted by most recently updated */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Status Stok Inventaris Terkini</h3>
              <p className="text-xs text-slate-500">Diurutkan dari yang terakhir diperbarui</p>
            </div>
            <Link href="/inventory" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
              <span>Buka Inventaris</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="pb-2.5 font-semibold">Nama Item</th>
                  <th className="pb-2.5 font-semibold">Kategori</th>
                  <th className="pb-2.5 font-semibold text-center">Ready Stock</th>
                  <th className="pb-2.5 font-semibold text-center">In</th>
                  <th className="pb-2.5 font-semibold text-center">Out</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stocks.map((stock: any) => (
                  <tr key={stock.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 font-medium text-slate-800">{stock.itemName}</td>
                    <td className="py-2.5 text-slate-500">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px]">{stock.category}</span>
                    </td>
                    <td className="py-2.5 text-center">
                      <span className={`font-bold px-2 py-0.5 rounded-full text-xs ${
                        stock.currentStock < 5 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {stock.currentStock}
                      </span>
                    </td>
                    <td className="py-2.5 text-center text-slate-600">+{stock.inStock}</td>
                    <td className="py-2.5 text-center text-slate-600">-{stock.outStock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Headset User */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Headset User Terbaru</h3>
            <p className="text-xs text-slate-500">Pencatatan peminjaman headset dari pengajuan vendor</p>
          </div>
          <Link href="/transactions/items" className="text-xs text-indigo-600 hover:underline flex items-center gap-1 font-medium">
            <span>Lihat Semua ({kpis.totalTransactions})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] tracking-wider">
                <th className="pb-2.5 font-semibold">Tanggal</th>
                <th className="pb-2.5 font-semibold">NIK</th>
                <th className="pb-2.5 font-semibold">Nama</th>
                <th className="pb-2.5 font-semibold">Project</th>
                <th className="pb-2.5 font-semibold">Vendor</th>
                <th className="pb-2.5 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentTransactions.map((tx: any) => {
                const statusStyles: Record<string, string> = {
                  Used: 'bg-amber-50 text-amber-700 border-amber-200',
                  Return: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  Reject: 'bg-rose-50 text-rose-700 border-rose-200',
                };
                return (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 text-slate-500">{tx.date}</td>
                    <td className="py-2.5 font-mono text-slate-600">{tx.nik}</td>
                    <td className="py-2.5 font-semibold text-slate-800">{tx.name}</td>
                    <td className="py-2.5 text-slate-700 font-medium">{tx.project}</td>
                    <td className="py-2.5 text-slate-500">{tx.vendor}</td>
                    <td className="py-2.5 text-center">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                        statusStyles[tx.status] || 'bg-slate-100 text-slate-600'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
