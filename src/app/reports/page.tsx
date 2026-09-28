'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import * as XLSX from 'xlsx';
import { BarChart3, Download, Printer, FileSpreadsheet, Headphones, ShoppingCart, PackageSearch, Laptop, Search, ShieldAlert } from 'lucide-react';

export default function ReportsPage() {
  const { role, canAccess, apiFetch } = useAuth();
  const { toast } = useToast();
  const [reportType, setReportType] = useState<'headset' | 'pr' | 'stocks' | 'laptops'>('headset');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchReportData = () => {
    setLoading(true);
    const query = new URLSearchParams({ type: reportType, item_name: search, date_from: dateFrom, date_to: dateTo });
    apiFetch(`/api/reports?${query.toString()}`)
      .then((res) => { if (!res.ok) throw new Error('Gagal'); return res.json(); })
      .then((resData) => { setData(Array.isArray(resData) ? resData : []); setLoading(false); })
      .catch(() => { toast('error', 'Gagal memuat laporan'); setLoading(false); });
  };

  useEffect(() => { fetchReportData(); }, [reportType]);

  const handleExportExcel = () => {
    if (!data.length) { toast('warning', 'Tidak ada data untuk diekspor'); return; }
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Laporan_${reportType}`);
    XLSX.writeFile(wb, `Xinghao_ITIS_Laporan_${reportType}_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast('success', 'Berhasil diekspor ke Excel');
  };

  const handlePrint = () => { window.print(); };

  const filteredData = data.filter((item) => {
    if (!search) return true;
    return JSON.stringify(item).toLowerCase().includes(search.toLowerCase());
  });

  if (!canAccess('reporting')) {
    return (<div className="p-8 bg-white rounded-2xl border border-slate-200 text-center"><ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" /><h3 className="text-base font-bold text-slate-800">Akses Ditolak</h3></div>);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-indigo-600" /><span>Reporting & Rekapitulasi</span></h1>
          <p className="text-xs text-slate-500 mt-0.5">Filter berdasarkan nama item dan range tanggal</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportExcel} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"><FileSpreadsheet className="w-4 h-4" />Excel</button>
          <button onClick={handlePrint} className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"><Printer className="w-4 h-4" />Cetak</button>
        </div>
      </div>

      <div className="flex border-b space-x-2">
        {(['headset', 'pr', 'stocks', 'laptops'] as const).map((t) => (
          <button key={t} onClick={() => setReportType(t)} className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 ${reportType === t ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}>
            {t === 'headset' && <Headphones className="w-4 h-4" />}
            {t === 'pr' && <ShoppingCart className="w-4 h-4" />}
            {t === 'stocks' && <PackageSearch className="w-4 h-4" />}
            {t === 'laptops' && <Laptop className="w-4 h-4" />}
            <span>{t === 'headset' ? 'Headset' : t === 'pr' ? 'PR' : t === 'stocks' ? 'Stocks' : 'Laptops'}</span>
          </button>
        ))}
      </div>

      <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-semibold mb-1">Filter Nama Item</label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama item..." className="w-64 pl-9 pr-4 py-2 bg-slate-50 border rounded-xl text-xs" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">Dari Tanggal</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-2 bg-slate-50 border rounded-xl text-xs" />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">Sampai Tanggal</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-2 bg-slate-50 border rounded-xl text-xs" />
        </div>
        <button onClick={fetchReportData} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold">Filter</button>
        <span className="text-xs text-slate-500 ml-auto">Total: <strong>{filteredData.length}</strong> baris</span>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-100 z-10">
              <tr className="border-b text-slate-500 uppercase text-[10px]">
                {reportType === 'headset' && <><th className="py-3 px-4">ID</th><th className="py-3 px-4">Tanggal</th><th className="py-3 px-4">NIK</th><th className="py-3 px-4">Nama</th><th className="py-3 px-4">Project</th><th className="py-3 px-4">Vendor</th><th className="py-3 px-4 text-center">Status</th></>}
                {reportType === 'pr' && <><th className="py-3 px-4">No PR</th><th className="py-3 px-4">Tanggal</th><th className="py-3 px-4">Item</th><th className="py-3 px-4">Kode</th><th className="py-3 px-4">Kategori</th><th className="py-3 px-4 text-center">Qty</th><th className="py-3 px-4">Biaya</th><th className="py-3 px-4">Diskon</th><th className="py-3 px-4">Total</th><th className="py-3 px-4 text-center">Status</th></>}
                {reportType === 'stocks' && <><th className="py-3 px-4">Nama Item</th><th className="py-3 px-4">Kode</th><th className="py-3 px-4">Kategori</th><th className="py-3 px-4 text-center">Ready</th><th className="py-3 px-4 text-center">In</th><th className="py-3 px-4 text-center">Out</th></>}
                {reportType === 'laptops' && <><th className="py-3 px-4">No</th><th className="py-3 px-4">Model</th><th className="py-3 px-4">PIC</th><th className="py-3 px-4 text-center">Status</th></>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={10} className="py-12 text-center text-slate-400">Memuat data laporan...</td></tr> :
                filteredData.length === 0 ? <tr><td colSpan={10} className="py-12 text-center text-slate-400">Tidak ada data.</td></tr> :
                  filteredData.map((row, idx) => (
                    <tr key={row.id || idx} className="hover:bg-slate-50">
                      {reportType === 'headset' && <><td className="py-2.5 px-4 font-mono text-slate-400">#{row.id}</td><td className="py-2.5 px-4">{row.date}</td><td className="py-2.5 px-4 font-mono">{row.nik}</td><td className="py-2.5 px-4 font-semibold">{row.name}</td><td className="py-2.5 px-4">{row.project}</td><td className="py-2.5 px-4">{row.vendor}</td><td className="py-2.5 px-4 text-center">{row.status}</td></>}
                      {reportType === 'pr' && <><td className="py-2.5 px-4 font-mono font-bold text-indigo-600">{row.prNumber}</td><td className="py-2.5 px-4">{new Date(row.date).toLocaleDateString('id-ID')}</td><td className="py-2.5 px-4">{row.itemName}</td><td className="py-2.5 px-4 font-mono">{row.itemCode || '-'}</td><td className="py-2.5 px-4">{row.typeItem}</td><td className="py-2.5 px-4 text-center">{row.qty}</td><td className="py-2.5 px-4">Rp {row.biaya?.toLocaleString('id-ID')}</td><td className="py-2.5 px-4 text-rose-600">Rp {row.diskon?.toLocaleString('id-ID')}</td><td className="py-2.5 px-4 font-bold">Rp {row.totalPrice?.toLocaleString('id-ID')}</td><td className="py-2.5 px-4 text-center">{row.status}</td></>}
                      {reportType === 'stocks' && <><td className="py-2.5 px-4 font-semibold">{row.itemName}</td><td className="py-2.5 px-4 font-mono">{row.itemCode}</td><td className="py-2.5 px-4">{row.category}</td><td className="py-2.5 px-4 text-center font-bold text-emerald-600">{row.currentStock}</td><td className="py-2.5 px-4 text-center">{row.inStock}</td><td className="py-2.5 px-4 text-center">{row.outStock}</td></>}
                      {reportType === 'laptops' && <><td className="py-2.5 px-4 font-mono">{idx + 1}</td><td className="py-2.5 px-4">{row.item}</td><td className="py-2.5 px-4">{row.user}</td><td className="py-2.5 px-4 text-center">{row.status}</td></>}
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
