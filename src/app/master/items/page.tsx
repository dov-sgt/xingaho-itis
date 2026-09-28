'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import {
  Boxes,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  X,
  Check,
  ShieldAlert,
} from 'lucide-react';

const CATEGORIES = [
  'All',
  'Computer',
  'Accessories',
  'Smartphone',
  'Media',
  'Equipment',
  'Networking',
  'Server',
  'Others',
];

export default function MasterItemsPage() {
  const { can, role, canAccess, apiFetch } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [saving, setSaving] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({
    code: '',
    typeItem: 'Computer',
    namaItem: '',
    brand: '',
  });
  const [errorMsg, setErrorMsg] = useState('');

  const fetchItems = () => {
    setLoading(true);
    const catQuery = category !== 'All' ? `category=${category}&` : '';
    const searchQuery = search ? `search=${encodeURIComponent(search)}` : '';
    apiFetch(`/api/master/items?${catQuery}${searchQuery}`)
      .then((res) => {
        if (!res.ok) throw new Error('Gagal memuat items');
        return res.json();
      })
      .then((data) => {
        setItems(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        toast('error', 'Gagal memuat data master item');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchItems();
  }, [category]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchItems();
  };

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormData({
      code: `XHPC-2026-${(items.length + 1).toString().padStart(4, '0')}`,
      typeItem: 'Computer',
      namaItem: '',
      brand: '',
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: any) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      typeItem: item.typeItem,
      namaItem: item.namaItem,
      brand: item.brand,
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSaving(true);

    try {
      const url = '/api/master/items';
      const method = editingItem ? 'PUT' : 'POST';
      const payload = editingItem ? { id: editingItem.id, ...formData } : formData;

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) {
        setErrorMsg(result.error || 'Gagal menyimpan item');
        setSaving(false);
        return;
      }

      setIsModalOpen(false);
      toast('success', editingItem ? 'Item berhasil diperbarui' : 'Item baru berhasil ditambahkan');
      fetchItems();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus master item ini?')) return;

    try {
      const res = await apiFetch(`/api/master/items?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast('success', 'Item berhasil dihapus');
        fetchItems();
      } else {
        const result = await res.json();
        toast('error', result.error || 'Gagal menghapus item');
      }
    } catch (err) {
      toast('error', 'Gagal menghapus item');
    }
  };

  if (!canAccess('master_item')) {
    return (
      <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">Akses Ditolak</h3>
        <p className="text-xs text-slate-500 mt-1">
          Role Anda ({role}) tidak memiliki izin untuk mengakses Master Item.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Boxes className="w-5 h-5 text-indigo-600" />
            <span>Master Item Perangkat & Aset</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar 31 item master standar operasional IT Xinghao
          </p>
        </div>

        {can('master_item', 'create') && (
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5 self-start"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Master Item</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-2xl">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                category === cat
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kode / nama item..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4 font-semibold">ID</th>
                <th className="py-3 px-4 font-semibold">Kode Item</th>
                <th className="py-3 px-4 font-semibold">Tipe Item</th>
                <th className="py-3 px-4 font-semibold">Nama Item</th>
                <th className="py-3 px-4 font-semibold">Brand / Merk</th>
                {(can('master_item', 'update') || can('master_item', 'delete')) && (
                  <th className="py-3 px-4 font-semibold text-center">Aksi</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Memuat data master item...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Tidak ada item yang sesuai filter.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-slate-400 font-mono">{item.id}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-indigo-600">
                      {item.code}
                    </td>
                    <td className="py-3 px-4">
                      <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full text-[11px] font-medium">
                        {item.typeItem}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{item.namaItem}</td>
                    <td className="py-3 px-4 text-slate-600">{item.brand || '-'}</td>
                    {(can('master_item', 'update') || can('master_item', 'delete')) && (
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          {can('master_item', 'update') && (
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              title="Edit"
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {can('master_item', 'delete') && (
                            <button
                              onClick={() => handleDelete(item.id)}
                              title="Hapus"
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">
                {editingItem ? 'Ubah Master Item' : 'Tambah Master Item Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kode Item</label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="Contoh: XHPC-2026-0001"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kategori / Tipe Item</label>
                <select
                  value={formData.typeItem}
                  onChange={(e) => setFormData({ ...formData, typeItem: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Item</label>
                <input
                  type="text"
                  required
                  value={formData.namaItem}
                  onChange={(e) => setFormData({ ...formData, namaItem: e.target.value })}
                  placeholder="Contoh: Laptop Asus Core I3"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Brand / Merk</label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  placeholder="Contoh: Asus / Logitech / Dell"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
