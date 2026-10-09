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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const stocks = data?.stocks || [];
  const categoryCounts = data?.categoryCounts || {};
  const recentTransactions = data?.recentTransactions || [];

  // Division picker for SuperAdmin
  if (role === 'SUPERADMIN') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pilih divisi untuk melihat dashboard
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {DIVISIONS.map((div) => {
            const Icon = div.icon;
            const colors: Record<string, string> = {
              indigo: 'bg-indigo-50 text-indigo-600',
              emerald: 'bg-emerald-50 text-emerald-600',
              purple: 'bg-purple-50 text-purple-600',
              pink: 'bg-pink-50 text-pink-600',
            };
            return (
              <button
                key={div.key}
                onClick={() => setSelectedDivision(div.key)}
                className={`p-6 rounded-xl border transition-all text-left ${
                  selectedDivision === div.key
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : 'border-border hover:border-muted-foreground/30 bg-card'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg ${colors[div.color]} flex items-center justify-center mb-3`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">{div.label}</h3>
                <p className="text-xs text-muted-foreground mt-1">Lihat dashboard {div.label}</p>
              </button>
            );
          })}
        </div>

        {/* Show selected division dashboard */}
        {selectedDivision === 'IT' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-card p-5 rounded-xl border border-border">
                <p className="text-xs font-medium text-muted-foreground">Master Item</p>
                <h3 className="text-2xl font-bold text-foreground mt-1">{kpis.totalMasterItems || 0}</h3>
              </div>
              <div className="bg-card p-5 rounded-xl border border-border">
                <p className="text-xs font-medium text-muted-foreground">Headset User Aktif</p>
                <h3 className="text-2xl font-bold text-amber-600 mt-1">{kpis.activeLoans || 0}</h3>
              </div>
              <div className="bg-card p-5 rounded-xl border border-border">
                <p className="text-xs font-medium text-muted-foreground">Pengajuan Vendor Pending</p>
                <h3 className="text-2xl font-bold text-destructive mt-1">{kpis.pendingSubmissions || 0}</h3>
              </div>
              <div className="bg-card p-5 rounded-xl border border-border">
                <p className="text-xs font-medium text-muted-foreground">Purchase Request</p>
                <h3 className="text-2xl font-bold text-primary mt-1">{kpis.totalPR || 0}</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-card p-6 rounded-xl border border-border lg:col-span-1">
                <h3 className="text-sm font-semibold text-foreground mb-4">Kategori Item</h3>
                <div className="space-y-3">
                  {Object.entries(categoryCounts).map(([cat, count]: [string, any]) => {
                    const total = kpis.totalMasterItems || 1;
                    const pct = Math.round((count / total) * 100);
                    return (
                      <div key={cat}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">{cat}</span>
                          <span className="text-muted-foreground">{count} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5">
                          <div className="bg-primary h-1.5 rounded-full" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="bg-card p-6 rounded-xl border border-border lg:col-span-2">
                <h3 className="text-sm font-semibold text-foreground mb-4">Transaksi Terbaru</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="pb-2 font-medium text-muted-foreground">Tanggal</th>
                        <th className="pb-2 font-medium text-muted-foreground">NIK</th>
                        <th className="pb-2 font-medium text-muted-foreground">Nama</th>
                        <th className="pb-2 font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {recentTransactions.slice(0, 5).map((tx: any) => (
                        <tr key={tx.id}>
                          <td className="py-2 text-muted-foreground">{tx.date}</td>
                          <td className="py-2 text-muted-foreground">{tx.nik}</td>
                          <td className="py-2 text-foreground">{tx.name}</td>
                          <td className="py-2">
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                              {tx.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedDivision === 'OPS' && (
          <div className="space-y-6">
            <div className="bg-card p-6 rounded-xl border border-border">
              <h3 className="text-sm font-semibold text-foreground mb-4">Operasional</h3>
              <p className="text-xs text-muted-foreground">Data operasional akan ditampilkan di sini.</p>
            </div>
          </div>
        )}

        {selectedDivision === 'QC' && (
          <div className="space-y-6">
            <div className="bg-card p-6 rounded-xl border border-border">
              <h3 className="text-sm font-semibold text-foreground mb-4">Quality Control</h3>
              <p className="text-xs text-muted-foreground">Data QC akan ditampilkan di sini.</p>
            </div>
          </div>
        )}

        {selectedDivision === 'HR' && (
          <div className="space-y-6">
            <div className="bg-card p-6 rounded-xl border border-border">
              <h3 className="text-sm font-semibold text-foreground mb-4">Human Resources</h3>
              <p className="text-xs text-muted-foreground">Data HR akan ditampilkan di sini.</p>
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
        <div className="bg-card p-6 rounded-xl border border-border">
          <h3 className="text-sm font-semibold text-foreground mb-4">Operasional</h3>
          <p className="text-xs text-muted-foreground">Data operasional akan ditampilkan di sini.</p>
        </div>
      </div>
    );
  }

  if (division === 'QC') {
    return (
      <div className="space-y-6">
        <div className="bg-card p-6 rounded-xl border border-border">
          <h3 className="text-sm font-semibold text-foreground mb-4">Quality Control</h3>
          <p className="text-xs text-muted-foreground">Data QC akan ditampilkan di sini.</p>
        </div>
      </div>
    );
  }

  if (division === 'HR') {
    return (
      <div className="space-y-6">
        <div className="bg-card p-6 rounded-xl border border-border">
          <h3 className="text-sm font-semibold text-foreground mb-4">Human Resources</h3>
          <p className="text-xs text-muted-foreground">Data HR akan ditampilkan di sini.</p>
        </div>
      </div>
    );
  }

  // Default: IT Dashboard
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">IT Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Inventaris, Headset User, & Purchase Request</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card p-5 rounded-xl border border-border">
          <p className="text-xs font-medium text-muted-foreground">Master Item</p>
          <h3 className="text-2xl font-bold text-foreground mt-1">{kpis.totalMasterItems || 0}</h3>
        </div>
        <div className="bg-card p-5 rounded-xl border border-border">
          <p className="text-xs font-medium text-muted-foreground">Headset User Aktif</p>
          <h3 className="text-2xl font-bold text-amber-600 mt-1">{kpis.activeLoans || 0}</h3>
        </div>
        <div className="bg-card p-5 rounded-xl border border-border">
          <p className="text-xs font-medium text-muted-foreground">Pengajuan Vendor Pending</p>
          <h3 className="text-2xl font-bold text-destructive mt-1">{kpis.pendingSubmissions || 0}</h3>
        </div>
        <div className="bg-card p-5 rounded-xl border border-border">
          <p className="text-xs font-medium text-muted-foreground">Purchase Request</p>
          <h3 className="text-2xl font-bold text-primary mt-1">{kpis.totalPR || 0}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-xl border border-border lg:col-span-1">
          <h3 className="text-sm font-semibold text-foreground mb-4">Kategori Item</h3>
          <div className="space-y-3">
            {Object.entries(categoryCounts).map(([cat, count]: [string, any]) => {
              const total = kpis.totalMasterItems || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={cat}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{cat}</span>
                    <span className="text-muted-foreground">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div className="bg-primary h-1.5 rounded-full" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="bg-card p-6 rounded-xl border border-border lg:col-span-2">
          <h3 className="text-sm font-semibold text-foreground mb-4">Transaksi Terbaru</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-2 font-medium text-muted-foreground">Tanggal</th>
                  <th className="pb-2 font-medium text-muted-foreground">NIK</th>
                  <th className="pb-2 font-medium text-muted-foreground">Nama</th>
                  <th className="pb-2 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentTransactions.slice(0, 5).map((tx: any) => (
                  <tr key={tx.id}>
                    <td className="py-2 text-muted-foreground">{tx.date}</td>
                    <td className="py-2 text-muted-foreground">{tx.nik}</td>
                    <td className="py-2 text-foreground">{tx.name}</td>
                    <td className="py-2">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        {tx.status}
                      </span>
                    </td>
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
