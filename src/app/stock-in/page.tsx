'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { PackagePlus, Plus, X, ShieldAlert } from 'lucide-react';

interface StockItem {
  id: number;
  itemCode: string | null;
  itemName: string;
  category: string;
  currentStock: number;
  inStock: number;
  outStock: number;
  note: string | null;
  updatedAt: string;
}

export default function StockInPage() {
  const { can, role, canAccess, user, apiFetch } = useAuth();
  const { toast } = useToast();
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockItem | null>(null);
  const [qty, setQty] = useState('1');
  const [note, setNote] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchStocks = () => {
    setLoading(true);
    apiFetch('/api/inventory')
      .then((res) => { if (!res.ok) throw new Error('Gagal'); return res.json(); })
      .then((data) => { setStocks(data.stocks || []); setLoading(false); })
      .catch(() => { toast('error', 'Gagal memuat stok'); setLoading(false); });
  };

  useEffect(() => { fetchStocks(); }, []);

  const handleOpenModal = (stock: StockItem) => {
    setSelectedStock(stock);
    setQty('1');
    setNote('');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSaving(true);
    try {
      const res = await apiFetch('/api/stock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockId: selectedStock?.id, qty, note, user: user?.name }),
      });
      const result = await res.json();
      if (!res.ok) { setErrorMsg(result.error || 'Gagal'); setSaving(false); return; }
      setIsModalOpen(false);
      toast('success', `Stock in ${qty} unit berhasil - Stok bertambah`);
      fetchStocks();
    } catch (err: any) { setErrorMsg(err.message); }
    setSaving(false);
  };

  if (!canAccess('inventory_type_item')) {
    return (<div className="p-8 bg-white rounded-2xl border border-slate-200 text-center"><ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" /><h3 className="text-base font-bold text-slate-800">Akses Ditolak</h3><p className="text-xs text-slate-500 mt-1">Role {role} tidak punya akses.</p></div>);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2"><PackagePlus className="w-5 h-5 text-emerald-600" /><span>Stock In</span></h1>
        <p className="text-xs text-slate-500 mt-0.5">Catat barang masuk — stok otomatis bertambah</p>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead><tr className="bg-slate-50 border-b text-slate-400 uppercase text-[10px]"><th className="py-2 px-3">Kode</th><th className="py-2 px-3">Nama Item</th><th className="py-2 px-3">Kategori</th><th className="py-2 px-3 text-center">Ready Stock</th><th className="py-2 px-3 text-center">Total In</th><th className="py-2 px-3 text-center">Total Out</th><th className="py-2 px-3 text-center">Aksi</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={7} className="py-8 text-center text-slate-400">Memuat...</td></tr> :
                stocks.length === 0 ? <tr><td colSpan={7} className="py-8 text-center text-slate-400">Tidak ada stok.</td></tr> :
                  stocks.map((stock) => (
                    <tr key={stock.id} className="hover:bg-slate-50/80">
                      <td className="py-2 px-3 font-mono text-indigo-600">{stock.itemCode || '-'}</td>
                      <td className="py-2 px-3 font-semibold">{stock.itemName}</td>
                      <td className="py-2 px-3 text-slate-500">{stock.category}</td>
                      <td className="py-2 px-3 text-center"><span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${stock.currentStock < 5 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'}`}>{stock.currentStock}</span></td>
                      <td className="py-2 px-3 text-center text-emerald-600 font-semibold">+{stock.inStock}</td>
                      <td className="py-2 px-3 text-center text-amber-600 font-semibold">-{stock.outStock}</td>
                      <td className="py-2 px-3 text-center">
                        {can('inventory_type_item', 'update') && (
                          <button onClick={() => handleOpenModal(stock)} className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded text-[10px] border border-emerald-200 flex items-center gap-1"><Plus className="w-3 h-3" />Stock In</button>
                        )}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && selectedStock && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b">
              <h3 className="text-sm font-bold">Stock In — {selectedStock.itemName}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            {errorMsg && <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-xs">{errorMsg}</div>}
            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border">
                <div className="font-bold text-slate-800">{selectedStock.itemName}</div>
                <div className="text-slate-500 text-[11px]">Stok saat ini: <span className="font-bold text-indigo-600">{selectedStock.currentStock}</span> unit</div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Quantity Masuk</label>
                <input type="number" min="1" required value={qty} onChange={(e) => setQty(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border rounded-xl" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Catatan</label>
                <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Contoh: Pengadaan baru dari DO-2026-0001" className="w-full px-3 py-2 bg-slate-50 border rounded-xl"></textarea>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-xl">Batal</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold disabled:opacity-50">{saving ? 'Memproses...' : 'Simpan Stock In'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
