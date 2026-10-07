'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/Toast';
import Link from 'next/link';
import {
  Boxes, Headphones, ShoppingCart, PackageCheck,
  Users, CreditCard, AlertTriangle, Briefcase, CalendarOff,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const stocks = data?.stocks || [];
  const categoryCounts = data?.categoryCounts || {};

  if (role === 'SUPERADMIN') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Pilih divisi untuk melihat dashboard</p>
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
                <p className="text-xs text-muted-foreground mt-1">
                  {div.key === 'IT' && 'Inventaris & Aset'}
                  {div.key === 'OPS' && 'Penagihan Nasabah'}
                  {div.key === 'QC' && 'Compliance OJK'}
                  {div.key === 'HR' && 'Employee & Leave'}
                </p>
              </button>
            );
          })}
        </div>

        {selectedDivision === 'IT' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Master Item</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-foreground">{kpis.totalMasterItems || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Headset User Aktif</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-amber-600">{kpis.activeLoans || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Pengajuan Vendor Pending</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-destructive">{kpis.pendingSubmissions || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Purchase Request</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-primary">{kpis.totalPR || 0}</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="text-sm">Kategori Item</CardTitle>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-sm">Stok Terkini</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="pb-2 font-medium text-muted-foreground">Item</th>
                          <th className="pb-2 font-medium text-muted-foreground text-center">Ready</th>
                          <th className="pb-2 font-medium text-muted-foreground text-center">In</th>
                          <th className="pb-2 font-medium text-muted-foreground text-center">Out</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {stocks.slice(0, 8).map((stock: any) => (
                          <tr key={stock.id}>
                            <td className="py-2 font-medium text-foreground">{stock.itemName}</td>
                            <td className="py-2 text-center">
                              <Badge variant={stock.currentStock < 5 ? 'destructive' : 'secondary'}>
                                {stock.currentStock}
                              </Badge>
                            </td>
                            <td className="py-2 text-center text-muted-foreground">+{stock.inStock}</td>
                            <td className="py-2 text-center text-muted-foreground">-{stock.outStock}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {selectedDivision === 'OPS' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Total Nasabah</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">{kpis.totalNasabah || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Overdue</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-amber-600">{kpis.overdueNasabah || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Payment Hari Ini</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-emerald-600">Rp {((kpis.todayPayments || 0) / 1000000).toFixed(1)} Jt</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Agen Aktif</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">{kpis.activeAgen || 0}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {selectedDivision === 'QC' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Total Review</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">{kpis.totalReviews || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Compliant</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-emerald-600">{kpis.compliantReviews || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Non-Compliant</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-destructive">{kpis.nonCompliantReviews || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Open Findings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-amber-600">{kpis.openFindings || 0}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {selectedDivision === 'HR' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Total Employee</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">{kpis.totalEmployees || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Active</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-emerald-600">{kpis.activeEmployees || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">On Leave</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-amber-600">{kpis.onLeaveEmployees || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Pending Leave</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-destructive">{kpis.pendingLeaveRequests || 0}</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  }

  if (division === 'OPS') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ops Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Penagihan Nasabah & Payment Achievement</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Total Nasabah</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{kpis.totalNasabah || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Overdue</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-600">{kpis.overdueNasabah || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Payment Hari Ini</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-emerald-600">Rp {((kpis.todayPayments || 0) / 1000000).toFixed(1)} Jt</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Agen Aktif</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">{kpis.activeAgen || 0}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (division === 'QC') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">QC Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Compliance OJK & Recording Review</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Total Review</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{kpis.totalReviews || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Compliant</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-emerald-600">{kpis.compliantReviews || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Non-Compliant</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-destructive">{kpis.nonCompliantReviews || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Open Findings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-600">{kpis.openFindings || 0}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (division === 'HR') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">HR Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Employee Data & Leave Request</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Total Employee</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{kpis.totalEmployees || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-emerald-600">{kpis.activeEmployees || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">On Leave</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-600">{kpis.onLeaveEmployees || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Pending Leave</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-destructive">{kpis.pendingLeaveRequests || 0}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">IT Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Inventaris, Headset User, & Purchase Request</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Master Item</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{kpis.totalMasterItems || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Headset User Aktif</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">{kpis.activeLoans || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Pengajuan Vendor Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{kpis.pendingSubmissions || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Purchase Request</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{kpis.totalPR || 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Kategori Item</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Stok Terkini</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-2 font-medium text-muted-foreground">Item</th>
                    <th className="pb-2 font-medium text-muted-foreground text-center">Ready</th>
                    <th className="pb-2 font-medium text-muted-foreground text-center">In</th>
                    <th className="pb-2 font-medium text-muted-foreground text-center">Out</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stocks.slice(0, 8).map((stock: any) => (
                    <tr key={stock.id}>
                      <td className="py-2 font-medium text-foreground">{stock.itemName}</td>
                      <td className="py-2 text-center">
                        <Badge variant={stock.currentStock < 5 ? 'destructive' : 'secondary'}>
                          {stock.currentStock}
                        </Badge>
                      </td>
                      <td className="py-2 text-center text-muted-foreground">+{stock.inStock}</td>
                      <td className="py-2 text-center text-muted-foreground">-{stock.outStock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
