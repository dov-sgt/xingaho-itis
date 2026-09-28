'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { PackageSearch, Laptop, ArrowDownLeft, ArrowUpRight, AlertOctagon, Plus, Edit, X, ShieldAlert, History } from 'lucide-react';

export default function InventoryPage() {
  const { can, role, canAccess, user, apiFetch } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'stocks' | 'laptops' | 'broken' | 'history'>('stocks');
  const [data, setData] = useState<{ stocks: any[]; laptops: any[]; brokenAssets: any[]; history: any[] }>({ stocks: [], laptops: [], brokenAssets: [], history: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Junk Modal
  const [isJunkModalOpen, setIsJunkModalOpen] = useState(false);
  const [junkType, setJunkType] = useState('');
  const [junkQty, setJunkQty] = useState('1');
  const [junkNote, setJunkNote] = useState('');

  // Stock Mutation Modal
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<any>(null);
  const [mutationType, setMutationType] = useState<'IN' | 'OUT'>('IN');
  const [mutationQty, setMutationQty] = useState('1');
  const [mutationNote, setMutationNote] = useState('');

  // Laptop Modal
  const [isLaptopModalOpen, setIsLaptopModalOpen] = useState(false);
  const [editingLaptop, setEditingLaptop] = useState<any>(null);
  const [laptopItem, setLaptopItem] = useState('');
  const [laptopUser, setLaptopUser] = useState('');
  const [laptopStatus, setLaptopStatus] = useState('Good');

  const [errorMsg, setErrorMsg] = useState('');

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      apiFetch('/api/inventory').then((res) => { if (!res.ok) throw new Error('Gagal memuat data'); return res.json(); }),
      apiFetch('/api/inventory/history').then((res) => { if (!res.ok) return []; return res.json(); }),
    ]).then(([inv, hist]) => {
      setData({ stocks: inv.stocks || [], laptops: inv.laptops || [], brokenAssets: inv.brokenAssets || [], history: Array.isArray(hist) ? hist : [] });
      setLoading(false);
    }).catch((err) => { console.error(err); toast('error', 'Gagal memuat data'); setLoading(false); });
  };

  useEffect(() => { fetchData(); }, []);

  const handleAddJunk = async (e: React.FormEvent) => {
    e.preventDefault(); setErrorMsg(''); setSaving(true);
    try {
      const res = await apiFetch('/api/inventory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add_junk', itemType: junkType, qty: junkQty, brokenCount: junkQty, note: junkNote }) });
      const result = await res.json();
      if (!res.ok) { setErrorMsg(result.error || 'Gagal menambah junk'); setSaving(false); return; }
      setIsJunkModalOpen(false); setJunkType(''); setJunkQty('1'); setJunkNote('');
      toast('success', 'Junk/broken asset berhasil ditambahkan'); fetchData();
    } catch (err: any) { setErrorMsg(err.message); }
    setSaving(false);
  };

  const handleStockMutation = async (e: React.FormEvent) => {
    e.preventDefault(); setErrorMsg(''); setSaving(true);
    try {
      const action = mutationType === 'IN' ? 'stock_in' : 'stock_out';
      const res = await apiFetch('/api/inventory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, stockId: selectedStock.id, qty: mutationQty, note: mutationNote, user: user?.name }) });
      const result = await res.json();
      if (!res.ok) { setErrorMsg(result.error || 'Gagal mutasi stok'); setSaving(false); return; }
      setIsStockModalOpen(false); toast('success', `Mutasi ${mutationType} berhasil`); fetchData();
    } catch (err: any) { setErrorMsg(err.message); }
    setSaving(false);
  };

  const handleSaveLaptop = async (e: React.FormEvent) => {
    e.preventDefault(); setErrorMsg(''); setSaving(true);
    try {
      const res = await apiFetch('/api/inventory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'laptop_save', id: editingLaptop?.id, item: laptopItem, user: laptopUser, status: laptopStatus }) });
      const result = await res.json();
      if (!res.ok) { setErrorMsg(result.error || 'Gagal menyimpan'); setSaving(false); return; }
      setIsLaptopModalOpen(false); toast('success', 'Laptop tersimpan'); fetchData();
    } catch (err: any) { setErrorMsg(err.message); }
    setSaving(false);
  };

  if (!canAccess('inventory_type_item')) {
    return (<div className="p-8 bg-white rounded-2xl border border-slate-200 text-center"><ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" /><h3 className="text-base font-bold text-slate-800">Akses Ditolak</h3><p className="text-xs text-slate-500 mt-1">Role Anda ({role}) tidak memiliki akses.</p></div>);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2"><PackageSearch className="w-5 h-5 text-indigo-600" /><span>Inventaris & Stok Perangkat IT</span></h1>
          <p className="text-xs text-slate-500 mt-0.5">IN dari Delivery Order (Received), OUT dari Headset User</p>
        </div>
        {activeTab === 'broken' && can('inventory_type_item', 'create') && (
          <button onClick={() => { setJunkType(''); setJunkQty('1'); setJunkNote(''); setIsJunkModalOpen(true); }} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-1.5 self-start">
            <Plus className="w-4 h-4" /><span>Tambah Junk</span>
          </button>
        )}
        {activeTab === 'laptops' && can('inventory_type_item', 'create') && (
          <button onClick={() => { setEditingLaptop(null); setLaptopItem(''); setLaptopUser(''); setLaptopStatus('Good'); setIsLaptopModalOpen(true); }} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-1.5 self-start">
            <Plus className="w-4 h-4" /><span>Tambah Laptop</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-2">
        {(['stocks', 'laptops', 'broken', 'history'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-3 px-4 text-xs font-bold transition-all flex items-center gap-2 ${activeTab === tab ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}>
            {tab === 'stocks' && <><PackageSearch className="w-4 h-4" /><span>Rekap Stok ({data.stocks.length})</span></>}
            {tab === 'laptops' && <><Laptop className="w-4 h-4" /><span>Laptop ({data.laptops.length})</span></>}
            {tab === 'broken' && <><AlertOctagon className="w-4 h-4" /><span>Junk ({data.brokenAssets.length})</span></>}
            {tab === 'history' && <><History className="w-4 h-4" /><span>Riwayat Mutasi</span></>}
          </button>
        ))}
      </div>

      {/* Tab 1: Stocks - NO manual mutation, only view */}
      {activeTab === 'stocks' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-3 bg-blue-50 border-b border-blue-100 text-xs text-blue-800">
            <strong>Aturan:</strong> Stock IN otomatis dari Delivery Order (Received). Stock OUT otomatis dari Headset User & Stock Out Transaction.
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead><tr className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase text-[10px] tracking-wider"><th className="py-3 px-4 font-semibold">Nama Item</th><th className="py-3 px-4 font-semibold">Kode</th><th className="py-3 px-4 font-semibold">Kategori</th><th className="py-3 px-4 font-semibold text-center">Ready</th><th className="py-3 px-4 font-semibold text-center text-emerald-600">In</th><th className="py-3 px-4 font-semibold text-center text-amber-600">Out</th><th className="py-3 px-4 font-semibold">Update Terakhir</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {data.stocks.map((stock) => (
                  <tr key={stock.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-bold text-slate-800">{stock.itemName}</td>
                    <td className="py-3 px-4 font-mono text-indigo-600">{stock.itemCode || '-'}</td>
                    <td className="py-3 px-4 text-slate-500">{stock.category}</td>
                    <td className="py-3 px-4 text-center"><span className={`font-bold px-2.5 py-1 rounded-full text-xs ${stock.currentStock < 5 ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>{stock.currentStock}</span></td>
                    <td className="py-3 px-4 text-center font-semibold text-emerald-600">+{stock.inStock}</td>
                    <td className="py-3 px-4 text-center font-semibold text-amber-600">-{stock.outStock}</td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">{new Date(stock.updatedAt).toLocaleDateString('id-ID')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Laptops */}
      {activeTab === 'laptops' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead><tr className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase text-[10px] tracking-wider"><th className="py-3 px-4 font-semibold">No</th><th className="py-3 px-4 font-semibold">Item</th><th className="py-3 px-4 font-semibold">PIC</th><th className="py-3 px-4 font-semibold text-center">Status</th>{can('inventory_type_item', 'update') && <th className="py-3 px-4 font-semibold text-center">Aksi</th>}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {data.laptops.map((lap, idx) => (
                  <tr key={lap.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{lap.item}</td>
                    <td className="py-3 px-4 text-slate-700">{lap.user}</td>
                    <td className="py-3 px-4 text-center"><span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">{lap.status}</span></td>
                    {can('inventory_type_item', 'update') && <td className="py-3 px-4 text-center"><button onClick={() => { setEditingLaptop(lap); setLaptopItem(lap.item); setLaptopUser(lap.user); setLaptopStatus(lap.status); setIsLaptopModalOpen(true); }} className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit className="w-3.5 h-3.5" /></button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Junk / Broken */}
      {activeTab === 'broken' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.brokenAssets.map((item) => (
            <div key={item.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center"><AlertOctagon className="w-5 h-5" /></div>
                  <div><h4 className="text-sm font-bold text-slate-800">{item.itemType}</h4><p className="text-xs text-slate-500">{item.note || 'Barang rusak / kanibal'}</p></div>
                </div>
                <div className="text-right"><span className="text-xl font-bold text-rose-600">{item.qty}</span><span className="text-xs text-slate-400 block">Unit</span></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 4: History */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead><tr className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase text-[10px] tracking-wider"><th className="py-3 px-4 font-semibold">Tanggal</th><th className="py-3 px-4 font-semibold">Kategori</th><th className="py-3 px-4 font-semibold text-center">Stok Akhir</th><th className="py-3 px-4 font-semibold text-center text-emerald-600">In</th><th className="py-3 px-4 font-semibold text-center text-amber-600">Out</th><th className="py-3 px-4 font-semibold">Catatan</th><th className="py-3 px-4 font-semibold">Oleh</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {data.history.length > 0 ? data.history.map((h: any) => (
                  <tr key={h.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 text-slate-500">{new Date(h.date).toLocaleDateString('id-ID')}</td>
                    <td className="py-3 px-4 text-slate-700">{h.category}</td>
                    <td className="py-3 px-4 text-center font-bold">{h.stock}</td>
                    <td className="py-3 px-4 text-center text-emerald-600 font-semibold">+{h.inQty}</td>
                    <td className="py-3 px-4 text-center text-amber-600 font-semibold">-{h.outQty}</td>
                    <td className="py-3 px-4 text-slate-500 text-[11px] max-w-xs truncate">{h.note || '-'}</td>
                    <td className="py-3 px-4 text-slate-600">{h.updateBy || '-'}</td>
                  </tr>
                )) : <tr><td colSpan={7} className="py-8 text-center text-slate-400">Belum ada riwayat mutasi.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Junk Modal */}
      {isJunkModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Tambah Junk / Broken Asset</h3>
              <button onClick={() => setIsJunkModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-4 h-4" /></button>
            </div>
            {errorMsg && <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-xs">{errorMsg}</div>}
            <form onSubmit={handleAddJunk} className="space-y-3 text-xs">
              <div><label className="block font-semibold text-slate-700 mb-1">Tipe Item</label><input type="text" required value={junkType} onChange={(e) => setJunkType(e.target.value)} placeholder="Contoh: CPU, Monitor, HDD" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              <div><label className="block font-semibold text-slate-700 mb-1">Quantity</label><input type="number" min="1" required value={junkQty} onChange={(e) => setJunkQty(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              <div><label className="block font-semibold text-slate-700 mb-1">Catatan</label><textarea rows={2} value={junkNote} onChange={(e) => setJunkNote(e.target.value)} placeholder="Keterangan kerusakan..." className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"></textarea></div>
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsJunkModalOpen(false)} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50">Batal</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">{saving ? 'Menyimpan...' : 'Tambah Junk'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Laptop Modal */}
      {isLaptopModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">{editingLaptop ? 'Ubah Laptop' : 'Tambah Laptop'}</h3>
              <button onClick={() => setIsLaptopModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSaveLaptop} className="space-y-3 text-xs">
              <div><label className="block font-semibold text-slate-700 mb-1">Item</label><input type="text" required value={laptopItem} onChange={(e) => setLaptopItem(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              <div><label className="block font-semibold text-slate-700 mb-1">PIC</label><input type="text" required value={laptopUser} onChange={(e) => setLaptopUser(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              <div><label className="block font-semibold text-slate-700 mb-1">Status</label><select value={laptopStatus} onChange={(e) => setLaptopStatus(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"><option value="Good">Good</option><option value="New">New</option><option value="Broken">Broken</option></select></div>
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsLaptopModalOpen(false)} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50">Batal</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">{saving ? 'Menyimpan...' : 'Simpan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
