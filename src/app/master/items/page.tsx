'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { Boxes, Plus, Search, Edit, Trash2, X, ShieldAlert, Upload, FileSpreadsheet } from 'lucide-react';

const CATEGORIES = ['Computer', 'Accessories', 'Smartphone', 'Media', 'Equipment', 'Networking', 'Server', 'Others'];

export default function MasterItemsPage() {
  const { can, role, canAccess, apiFetch } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({ code: '', typeItem: 'Computer', namaItem: '', brand: '' });
  const [errorMsg, setErrorMsg] = useState('');

  // Upload state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);

  const fetchItems = () => {
    setLoading(true);
    const catQuery = category !== 'All' ? `category=${category}&` : '';
    const searchQuery = search ? `search=${encodeURIComponent(search)}` : '';
    apiFetch(`/api/master/items?${catQuery}${searchQuery}`)
      .then((res) => { if (!res.ok) throw new Error('Gagal'); return res.json(); })
      .then((data) => { setItems(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { toast('error', 'Gagal memuat items'); setLoading(false); });
  };

  useEffect(() => { fetchItems(); }, [category]);

  const handleSearchSubmit = (e: React.FormEvent) => { e.preventDefault(); fetchItems(); };

  const handleOpenAddModal = () => {
    setEditingItem(null);
    // Auto-generate code based on category
    const prefix = getCategoryPrefix(formData.typeItem);
    const count = items.filter((i) => i.typeItem === formData.typeItem).length;
    const newCode = `${prefix}-2026-${(count + 1).toString().padStart(4, '0')}`;
    setFormData({ code: newCode, typeItem: 'Computer', namaItem: '', brand: '' });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: any) => {
    setEditingItem(item);
    setFormData({ code: item.code, typeItem: item.typeItem, namaItem: item.namaItem, brand: item.brand });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleCategoryChange = (cat: string) => {
    const prefix = getCategoryPrefix(cat);
    const count = items.filter((i) => i.typeItem === cat).length;
    const newCode = `${prefix}-2026-${(count + 1).toString().padStart(4, '0')}`;
    setFormData({ ...formData, typeItem: cat, code: newCode });
  };

  const getCategoryPrefix = (cat: string) => {
    const prefixes: Record<string, string> = {
      Computer: 'XHPC', Accessories: 'XHAC', Smartphone: 'XHSP',
      Media: 'XHMD', Equipment: 'XHEQ', Networking: 'XHNW',
      Server: 'XHSV', Others: 'XHOT'
    };
    return prefixes[cat] || 'XHXX';
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setErrorMsg(''); setSaving(true);
    try {
      const url = '/api/master/items';
      const method = editingItem ? 'PUT' : 'POST';
      const payload = editingItem ? { id: editingItem.id, ...formData } : formData;
      const res = await apiFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await res.json();
      if (!res.ok) { setErrorMsg(result.error || 'Gagal menyimpan'); setSaving(false); return; }
      setIsModalOpen(false);
      toast('success', editingItem ? 'Item diperbarui' : 'Item ditambahkan');
      fetchItems();
    } catch (err: any) { setErrorMsg(err.message); }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus item ini?')) return;
    try {
      const res = await apiFetch(`/api/master/items?id=${id}`, { method: 'DELETE' });
      if (res.ok) { toast('success', 'Item dihapus'); fetchItems(); }
      else { const r = await res.json(); toast('error', r.error || 'Gagal'); }
    } catch { toast('error', 'Gagal'); }
  };

  // Upload handler
  const handleUpload = async () => {
    if (!uploadFile) { toast('warning', 'Pilih file dulu'); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      const res = await apiFetch('/api/master/items/upload', { method: 'POST', body: formData });
      const result = await res.json();
      if (res.ok) {
        setUploadResult(result);
        toast('success', `Upload selesai: ${result.success} sukses, ${result.failed} gagal`);
        fetchItems();
      } else {
        toast('error', result.error || 'Upload gagal');
      }
    } catch (err: any) { toast('error', err.message); }
    setUploading(false);
  };

  if (!canAccess('master_item')) {
    return (<div className="p-8 bg-white rounded-2xl border border-slate-200 text-center"><ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" /><h3 className="text-base font-bold text-slate-800">Akses Ditolak</h3></div>);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Boxes className="w-5 h-5 text-indigo-600" /><span>Master Inventory</span></h1>
          <p className="text-xs text-slate-500 mt-0.5">Kode item auto-generate berdasarkan kategori</p>
        </div>
        <div className="flex gap-2">
          {role === 'SUPERADMIN' && (
            <button onClick={() => { setUploadFile(null); setUploadResult(null); setIsUploadOpen(true); }} className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"><Upload className="w-4 h-4" />Import Excel</button>
          )}
          {can('master_item', 'create') && (
            <button onClick={handleOpenAddModal} className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"><Plus className="w-4 h-4" />Tambah Item</button>
          )}
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {['All', ...CATEGORIES].map((cat) => (
            <button key={cat} onClick={() => setCategory(cat)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${category === cat ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{cat}</button>
          ))}
        </div>
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari..." className="w-full pl-9 pr-4 py-2 bg-slate-50 border rounded-xl text-xs" />
        </form>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead><tr className="bg-slate-50 border-b text-slate-400 uppercase text-[10px]"><th className="py-2 px-3">ID</th><th className="py-2 px-3">Kode</th><th className="py-2 px-3">Tipe</th><th className="py-2 px-3">Nama Item</th><th className="py-2 px-3">Brand</th><th className="py-2 px-3 text-center">Aksi</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={6} className="py-8 text-center text-slate-400">Memuat...</td></tr> :
                items.length === 0 ? <tr><td colSpan={6} className="py-8 text-center text-slate-400">Tidak ada item.</td></tr> :
                  items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80">
                      <td className="py-2 px-3 text-slate-400 font-mono">{item.id}</td>
                      <td className="py-2 px-3 font-mono font-semibold text-indigo-600">{item.code}</td>
                      <td className="py-2 px-3"><span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px]">{item.typeItem}</span></td>
                      <td className="py-2 px-3 font-semibold">{item.namaItem}</td>
                      <td className="py-2 px-3 text-slate-600">{item.brand || '-'}</td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex gap-1.5 justify-center">
                          {can('master_item', 'update') && <button onClick={() => handleOpenEditModal(item)} className="p-1 hover:bg-indigo-50 rounded"><Edit className="w-3 h-3" /></button>}
                          {can('master_item', 'delete') && <button onClick={() => handleDelete(item.id)} className="p-1 hover:bg-rose-50 rounded"><Trash2 className="w-3 h-3" /></button>}
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between mb-4 pb-3 border-b"><h3 className="text-sm font-bold">{editingItem ? 'Ubah Item' : 'Tambah Item'}</h3><button onClick={() => setIsModalOpen(false)}><X className="w-4 h-4" /></button></div>
            {errorMsg && <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-xs">{errorMsg}</div>}
            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Kategori Item</label>
                <select value={formData.typeItem} onChange={(e) => handleCategoryChange(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border rounded-xl">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Kode Item (auto-generate)</label>
                <input type="text" value={formData.code} readOnly className="w-full px-3 py-2 bg-slate-100 border rounded-xl text-slate-500" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Nama Item</label>
                <input type="text" required value={formData.namaItem} onChange={(e) => setFormData({ ...formData, namaItem: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Brand</label>
                <input type="text" value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl" />
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-xl">Batal</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold disabled:opacity-50">{saving ? 'Menyimpan...' : 'Simpan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Excel Modal - SuperAdmin Only */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b">
              <h3 className="text-sm font-bold flex items-center gap-2"><FileSpreadsheet className="w-4 h-4 text-emerald-600" />Import Excel Master Inventory</h3>
              <button onClick={() => setIsUploadOpen(false)}><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border">
                <p className="font-semibold mb-1">Format Excel (.xlsx):</p>
                <p className="text-slate-500">code | typeItem | namaItem | brand</p>
                <p className="text-slate-400 text-[10px] mt-1">Baris pertama = header. Baris kedua mulai data.</p>
              </div>
              <div>
                <label className="block font-semibold mb-1">Pilih File Excel</label>
                <input type="file" accept=".xlsx,.xls" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} className="w-full px-3 py-2 bg-slate-50 border rounded-xl" />
              </div>
              {uploadResult && (
                <div className="p-3 rounded-xl border">
                  <div className="font-semibold mb-2">Hasil Upload:</div>
                  <div className="flex gap-4">
                    <span className="text-emerald-600 font-bold">{uploadResult.success} sukses</span>
                    <span className="text-rose-600 font-bold">{uploadResult.failed} gagal</span>
                  </div>
                  {uploadResult.errors.length > 0 && (
                    <div className="mt-2 max-h-32 overflow-y-auto">
                      {uploadResult.errors.slice(0, 10).map((err: string, i: number) => (
                        <p key={i} className="text-rose-600 text-[10px]">{err}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <button type="button" onClick={() => setIsUploadOpen(false)} className="px-4 py-2 border rounded-xl">Batal</button>
                <button onClick={handleUpload} disabled={uploading} className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold disabled:opacity-50">{uploading ? 'Uploading...' : 'Upload'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
