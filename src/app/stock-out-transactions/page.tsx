'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { PackageOpen, Plus, ShieldAlert, CheckCircle2, XCircle, Search, X } from 'lucide-react';

interface MasterItem {
  id: number;
  code: string;
  typeItem: string;
  namaItem: string;
  brand: string;
}

const CATEGORIES = ['Computer', 'Accessories', 'Smartphone', 'Media', 'Equipment', 'Networking', 'Server', 'Others'];

export default function StockOutTransactionsPage() {
  const { can, role, canAccess, user, apiFetch } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [masterItems, setMasterItems] = useState<MasterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form state
  const [formCategory, setFormCategory] = useState('Computer');
  const [formItemCode, setFormItemCode] = useState('');
  const [formItemName, setFormItemName] = useState('');
  const [filteredItems, setFilteredItems] = useState<MasterItem[]>([]);
  const [itemSearch, setItemSearch] = useState('');
  const [outQty, setOutQty] = useState('1');
  const [note, setNote] = useState('');

  const fetchTransactions = () => {
    setLoading(true);
    apiFetch('/api/stock-out-transactions')
      .then((res) => { if (!res.ok) throw new Error('Gagal'); return res.json(); })
      .then((data) => { setTransactions(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { toast('error', 'Gagal memuat'); setLoading(false); });
  };

  const fetchMasterItems = () => {
    apiFetch('/api/master/items')
      .then((res) => { if (!res.ok) throw new Error('Gagal'); return res.json(); })
      .then((data) => setMasterItems(Array.isArray(data) ? data : []))
      .catch(() => {});
  };

  useEffect(() => { fetchTransactions(); fetchMasterItems(); }, []);

  const handleCategoryChange = (category: string) => {
    setFormCategory(category);
    setFormItemCode('');
    setFormItemName('');
    setItemSearch('');
    setFilteredItems(masterItems.filter((item) => item.typeItem === category));
  };

  const handleItemSelect = (code: string) => {
    const item = masterItems.find((i) => i.code === code);
    setFormItemCode(code);
    setFormItemName(item?.namaItem || '');
    setItemSearch(item?.namaItem || '');
  };

  const handleItemSearch = (search: string) => {
    setItemSearch(search);
    if (!search) {
      setFilteredItems(masterItems.filter((item) => item.typeItem === formCategory));
    } else {
      setFilteredItems(masterItems.filter((item) => item.typeItem === formCategory && item.namaItem.toLowerCase().includes(search.toLowerCase())));
    }
  };

  const handleOpenModal = () => {
    setFormCategory('Computer');
    setFormItemCode('');
    setFormItemName('');
    setItemSearch('');
    setFilteredItems(masterItems.filter((item) => item.typeItem === 'Computer'));
    setOutQty('1');
    setNote('');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSaving(true);
    try {
      const res = await apiFetch('/api/stock-out-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: new Date().toISOString().split('T')[0],
          category: formCategory,
          itemCode: formItemCode,
          itemName: formItemName,
          outQty,
          note,
          requestedBy: user?.name,
        }),
      });
      const result = await res.json();
      if (!res.ok) { setErrorMsg(result.error); setSaving(false); return; }
      setIsModalOpen(false);
      toast('success', 'Stock out request dibuat, menunggu approval SPV/SuperAdmin');
      fetchTransactions();
    } catch (err: any) { setErrorMsg(err.message); }
    setSaving(false);
  };

  const handleApprove = async (id: number, action: 'Approved' | 'Rejected') => {
    if (!confirm(`${action} transaksi ini?`)) return;
    setSaving(true);
    try {
      const res = await apiFetch('/api/stock-out-transactions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: action, approvedBy: user?.name }),
      });
      if (res.ok) {
        toast('success', action === 'Approved' ? 'Approved - Stock langsung berkurang' : 'Rejected');
        fetchTransactions();
      } else {
        const r = await res.json();
        toast('error', r.error || 'Gagal');
      }
    } catch { toast('error', 'Gagal'); }
    setSaving(false);
  };

  if (!canAccess('transaction_item')) {
    return (<div className="p-8 bg-white rounded-2xl border border-slate-200 text-center"><ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" /><h3 className="text-base font-bold text-slate-800">Akses Ditolak</h3><p className="text-xs text-slate-500 mt-1">Role {role} tidak punya akses.</p></div>);
  }

  const canApprove = ['SPV_OPS', 'MANAGER_OPS', 'SUPERADMIN'].includes(role);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2"><PackageOpen className="w-5 h-5 text-indigo-600" /><span>Stock Out Transaction</span></h1>
          <p className="text-xs text-slate-500 mt-0.5">Staff buat request → SPV/SuperAdmin approve → Stock langsung berkurang</p>
        </div>
        {can('transaction_item', 'create') && <button onClick={handleOpenModal} className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"><Plus className="w-4 h-4" />Buat Request</button>}
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead><tr className="bg-slate-50 border-b text-slate-400 uppercase text-[10px]"><th className="py-2 px-3">Tgl</th><th className="py-2 px-3">Kategori</th><th className="py-2 px-3">Item</th><th className="py-2 px-3 text-center">Out Qty</th><th className="py-2 px-3">Note</th><th className="py-2 px-3">Req By</th><th className="py-2 px-3 text-center">Status</th><th className="py-2 px-3 text-center">Aksi</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={8} className="py-8 text-center text-slate-400">Memuat...</td></tr> :
                transactions.length === 0 ? <tr><td colSpan={8} className="py-8 text-center text-slate-400">Belum ada transaksi.</td></tr> :
                  transactions.map((tx) => {
                    const sc: Record<string, string> = { Approved: 'bg-emerald-50 text-emerald-700', Pending: 'bg-amber-50 text-amber-700', Rejected: 'bg-rose-50 text-rose-700' };
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/80">
                        <td className="py-2 px-3 text-slate-500">{new Date(tx.date).toLocaleDateString('id-ID')}</td>
                        <td className="py-2 px-3">{tx.category}</td>
                        <td className="py-2 px-3 font-semibold">{tx.itemName}</td>
                        <td className="py-2 px-3 text-center font-bold">{tx.outQty}</td>
                        <td className="py-2 px-3 text-slate-500 text-[10px] max-w-[200px] truncate">{tx.note || '-'}</td>
                        <td className="py-2 px-3">{tx.requestedBy}</td>
                        <td className="py-2 px-3 text-center"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sc[tx.status] || 'bg-slate-100'}`}>{tx.status}</span></td>
                        <td className="py-2 px-3 text-center">
                          {tx.status === 'Pending' && canApprove && (
                            <div className="flex gap-1 justify-center">
                              <button onClick={() => handleApprove(tx.id, 'Approved')} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded" title="Approve"><CheckCircle2 className="w-4 h-4" /></button>
                              <button onClick={() => handleApprove(tx.id, 'Rejected')} className="p-1 text-rose-600 hover:bg-rose-50 rounded" title="Reject"><XCircle className="w-4 h-4" /></button>
                            </div>
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
            <div className="flex items-center justify-between mb-4 pb-3 border-b">
              <h3 className="text-sm font-bold">Stock Out Request</h3>
              <button onClick={() => setIsModalOpen(false)}><X className="w-4 h-4" /></button>
            </div>
            {errorMsg && <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-xs">{errorMsg}</div>}
            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Kategori Item</label>
                <select value={formCategory} onChange={(e) => handleCategoryChange(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border rounded-xl">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Kode Item (dropdown)</label>
                <select value={formItemCode} onChange={(e) => handleItemSelect(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border rounded-xl">
                  <option value="">-- Pilih Item --</option>
                  {filteredItems.map((item) => (
                    <option key={item.code} value={item.code}>{item.code} - {item.namaItem}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Nama Item (auto-fill)</label>
                <input type="text" value={formItemName} readOnly className="w-full px-3 py-2 bg-slate-100 border rounded-xl text-slate-500" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Out Qty</label>
                <input type="number" min="1" required value={outQty} onChange={(e) => setOutQty(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border rounded-xl" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Note</label>
                <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border rounded-xl"></textarea>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-xl">Batal</button>
                <button type="submit" disabled={saving || !formItemCode} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold disabled:opacity-50">{saving ? 'Mengirim...' : 'Kirim Request'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
