'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { ShoppingCart, Plus, Search, X, ShieldAlert, CheckCircle2, Ban } from 'lucide-react';

const CATEGORIES = ['Computer', 'Accessories', 'Smartphone', 'Media', 'Equipment', 'Networking', 'Server', 'Others'];

interface MasterItem {
  id: number;
  code: string;
  typeItem: string;
  namaItem: string;
  brand: string;
}

export default function PurchaseRequestsPage() {
  const { can, role, canAccess, user, apiFetch } = useAuth();
  const { toast } = useToast();
  const [prs, setPrs] = useState<any[]>([]);
  const [summary, setSummary] = useState({ totalCount: 0, totalSpending: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [masterItems, setMasterItems] = useState<MasterItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MasterItem[]>([]);
  const [formData, setFormData] = useState({
    typeItem: 'Computer' as string,
    itemCode: '',
    itemName: '',
    qty: '1',
    biaya: '',
    diskon: '',
    totalPrice: '',
    note: ''
  });
  const [errorMsg, setErrorMsg] = useState('');

  const fetchPRs = () => {
    setLoading(true);
    const query = new URLSearchParams({ search, status: statusFilter, date_from: dateFrom, date_to: dateTo });
    apiFetch(`/api/transactions/purchase-requests?${query.toString()}`)
      .then((res) => { if (!res.ok) throw new Error('Gagal'); return res.json(); })
      .then((res) => { setPrs(res.data || []); setSummary({ totalCount: res.totalCount || 0, totalSpending: res.totalSpending || 0 }); setLoading(false); })
      .catch(() => { toast('error', 'Gagal memuat PR'); setLoading(false); });
  };

  const fetchMasterItems = () => {
    apiFetch('/api/master/items')
      .then((res) => { if (!res.ok) throw new Error('Gagal'); return res.json(); })
      .then((data) => setMasterItems(Array.isArray(data) ? data : []))
      .catch(() => {});
  };

  useEffect(() => { fetchPRs(); fetchMasterItems(); }, [statusFilter]);

  const handleCategoryChange = (category: string) => {
    setFormData({ ...formData, typeItem: category, itemCode: '', itemName: '' });
    setFilteredItems(masterItems.filter((item) => item.typeItem === category));
  };

  const handleItemSelect = (code: string) => {
    const item = masterItems.find((i) => i.code === code);
    setFormData({
      ...formData,
      itemCode: code,
      itemName: item?.namaItem || '',
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setErrorMsg(''); setSaving(true);
    try {
      const res = await apiFetch('/api/transactions/purchase-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, createdBy: user?.name, updateBy: user?.name })
      });
      const result = await res.json();
      if (!res.ok) { setErrorMsg(result.error); setSaving(false); return; }
      setIsModalOpen(false); toast('success', 'PR berhasil dibuat'); fetchPRs();
    } catch (err: any) { setErrorMsg(err.message); }
    setSaving(false);
  };

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    if (!confirm(`Ubah status menjadi "${newStatus}"?`)) return;
    try {
      const res = await apiFetch('/api/transactions/purchase-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus, updateBy: user?.name })
      });
      if (res.ok) { toast('success', 'Status diperbarui'); fetchPRs(); }
      else toast('error', 'Gagal');
    } catch { toast('error', 'Gagal'); }
  };

  if (!canAccess('purchase_request')) {
    return (<div className="p-8 bg-white rounded-2xl border border-slate-200 text-center"><ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" /><h3 className="text-base font-bold text-slate-800">Akses Ditolak</h3></div>);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-indigo-600" /><span>Purchase Request (PR)</span></h1>
          <p className="text-xs text-slate-500 mt-0.5">Pengadaan dengan biaya, diskon, dan filter tanggal</p>
        </div>
        {can('purchase_request', 'create') && (
          <button onClick={() => {
            setFormData({ typeItem: 'Computer', itemCode: '', itemName: '', qty: '1', biaya: '', diskon: '', totalPrice: '', note: '' });
            setFilteredItems(masterItems.filter((i) => i.typeItem === 'Computer'));
            setIsModalOpen(true);
          }} className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"><Plus className="w-4 h-4" />Buat PR</button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border shadow-sm"><p className="text-xs text-slate-500">Total PR</p><h4 className="text-xl font-bold">{summary.totalCount}</h4></div>
        <div className="bg-white p-4 rounded-xl border shadow-sm"><p className="text-xs text-slate-500">Total Belanja</p><h4 className="text-xl font-bold text-indigo-600">Rp {summary.totalSpending.toLocaleString('id-ID')}</h4></div>
        <div className="bg-white p-4 rounded-xl border shadow-sm"><p className="text-xs text-slate-500">Pending</p><h4 className="text-xl font-bold text-amber-600">{prs.filter((p) => p.status === 'Pending').length}</h4></div>
      </div>

      <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-wrap gap-3 items-end">
        <div className="flex gap-1.5">
          {['', 'Pending', 'Approved', 'Completed', 'Rejected'].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{s || 'Semua'}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-2 bg-slate-50 border rounded-xl text-xs" />
          <span className="text-xs text-slate-400">s/d</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-2 bg-slate-50 border rounded-xl text-xs" />
        </div>
        <button onClick={fetchPRs} className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold">Filter</button>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead><tr className="bg-slate-50 border-b text-slate-400 uppercase text-[10px]"><th className="py-3 px-4">No PR</th><th className="py-3 px-4">Tgl</th><th className="py-3 px-4">Item</th><th className="py-3 px-4">Kode</th><th className="py-3 px-4">Kategori</th><th className="py-3 px-4 text-center">Qty</th><th className="py-3 px-4">Biaya</th><th className="py-3 px-4">Diskon</th><th className="py-3 px-4">Total</th><th className="py-3 px-4 text-center">Status</th><th className="py-3 px-4">Created By</th><th className="py-3 px-4 text-center">Aksi</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={12} className="py-8 text-center text-slate-400">Memuat...</td></tr> :
                prs.length === 0 ? <tr><td colSpan={12} className="py-8 text-center text-slate-400">Tidak ada data.</td></tr> :
                  prs.map((p) => {
                    const sc: Record<string, string> = { Pending: 'bg-amber-50 text-amber-700', Approved: 'bg-blue-50 text-blue-700', Completed: 'bg-emerald-50 text-emerald-700', Rejected: 'bg-rose-50 text-rose-700' };
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-mono font-bold text-indigo-600">{p.prNumber}</td>
                        <td className="py-3 px-4 text-slate-500">{new Date(p.date).toLocaleDateString('id-ID')}</td>
                        <td className="py-3 px-4 font-semibold">{p.itemName}</td>
                        <td className="py-3 px-4 font-mono">{p.itemCode || '-'}</td>
                        <td className="py-3 px-4 text-slate-600">{p.typeItem}</td>
                        <td className="py-3 px-4 text-center font-bold">{p.qty}</td>
                        <td className="py-3 px-4">Rp {p.biaya?.toLocaleString('id-ID')}</td>
                        <td className="py-3 px-4 text-rose-600">Rp {p.diskon?.toLocaleString('id-ID')}</td>
                        <td className="py-3 px-4 font-bold">Rp {p.totalPrice?.toLocaleString('id-ID')}</td>
                        <td className="py-3 px-4 text-center"><span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${sc[p.status] || 'bg-slate-100'}`}>{p.status}</span></td>
                        <td className="py-3 px-4 text-slate-600">{p.createdBy || '-'}</td>
                        <td className="py-3 px-4 text-center">
                          {p.status === 'Pending' && can('purchase_request', 'update') && (
                            <div className="flex gap-1 justify-center">
                              <button onClick={() => handleUpdateStatus(p.id, 'Approved')} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><CheckCircle2 className="w-4 h-4" /></button>
                              <button onClick={() => handleUpdateStatus(p.id, 'Rejected')} className="p-1 text-rose-600 hover:bg-rose-50 rounded"><Ban className="w-4 h-4" /></button>
                            </div>
                          )}
                          {p.status === 'Approved' && can('purchase_request', 'update') && (
                            <button onClick={() => handleUpdateStatus(p.id, 'Completed')} className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-[11px]">Selesai</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b"><h3 className="text-sm font-bold">Buat PR Baru</h3><button onClick={() => setIsModalOpen(false)}><X className="w-4 h-4" /></button></div>
            {errorMsg && <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-xs">{errorMsg}</div>}
            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Kategori Item</label>
                <select value={formData.typeItem} onChange={(e) => handleCategoryChange(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border rounded-xl">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Kode Item (dropdown)</label>
                <select value={formData.itemCode} onChange={(e) => handleItemSelect(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border rounded-xl">
                  <option value="">-- Pilih Item --</option>
                  {filteredItems.map((item) => (
                    <option key={item.code} value={item.code}>{item.code} - {item.namaItem}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Nama Item</label>
                <input type="text" value={formData.itemName} readOnly className="w-full px-3 py-2 bg-slate-100 border rounded-xl text-slate-500" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="block font-semibold mb-1">Qty</label><input type="number" value={formData.qty} onChange={(e) => setFormData({ ...formData, qty: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl" /></div>
                <div><label className="block font-semibold mb-1">Biaya (Rp)</label><input type="number" required value={formData.biaya} onChange={(e) => setFormData({ ...formData, biaya: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl" /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="block font-semibold mb-1">Diskon (Rp)</label><input type="number" value={formData.diskon} onChange={(e) => setFormData({ ...formData, diskon: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl" /></div>
                <div><label className="block font-semibold mb-1">Total (Rp)</label><input type="number" value={formData.totalPrice} onChange={(e) => setFormData({ ...formData, totalPrice: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl" /></div>
              </div>
              <div><label className="block font-semibold mb-1">Catatan</label><textarea rows={2} value={formData.note} onChange={(e) => setFormData({ ...formData, note: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl"></textarea></div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-xl">Batal</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold disabled:opacity-50">{saving ? 'Menyimpan...' : 'Ajukan PR'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
