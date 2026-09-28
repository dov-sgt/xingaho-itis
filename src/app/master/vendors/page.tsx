'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import {
  Building2,
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  Phone,
  Mail,
  ShieldAlert,
  CheckCircle,
  XCircle,
} from 'lucide-react';

export default function MasterVendorsPage() {
  const { can, role, canAccess, apiFetch } = useAuth();
  const { toast } = useToast();
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<any>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    serviceType: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    status: 'Active',
  });
  const [errorMsg, setErrorMsg] = useState('');

  const fetchVendors = () => {
    setLoading(true);
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    apiFetch(`/api/master/vendors${q}`)
      .then((res) => {
        if (!res.ok) throw new Error('Gagal memuat vendors');
        return res.json();
      })
      .then((data) => {
        setVendors(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        toast('error', 'Gagal memuat data vendor');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const handleOpenAdd = () => {
    setEditingVendor(null);
    setFormData({
      code: `VND-${(vendors.length + 1).toString().padStart(3, '0')}`,
      name: '',
      serviceType: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      status: 'Active',
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (v: any) => {
    setEditingVendor(v);
    setFormData({
      code: v.code,
      name: v.name,
      serviceType: v.serviceType || '',
      contactPerson: v.contactPerson || '',
      phone: v.phone || '',
      email: v.email || '',
      address: v.address || '',
      status: v.status || 'Active',
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSaving(true);
    try {
      const url = '/api/master/vendors';
      const method = editingVendor ? 'PUT' : 'POST';
      const payload = editingVendor ? { id: editingVendor.id, ...formData } : formData;
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) { setErrorMsg(result.error || 'Gagal menyimpan vendor'); setSaving(false); return; }
      setIsModalOpen(false);
      toast('success', editingVendor ? 'Vendor berhasil diperbarui' : 'Vendor baru berhasil ditambahkan');
      fetchVendors();
    } catch (err: any) { setErrorMsg(err.message); }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus vendor ini?')) return;
    try {
      const res = await apiFetch(`/api/master/vendors?id=${id}`, { method: 'DELETE' });
      if (res.ok) { toast('success', 'Vendor berhasil dihapus'); fetchVendors(); }
      else { const result = await res.json(); toast('error', result.error || 'Gagal menghapus vendor'); }
    } catch (err) { toast('error', 'Gagal menghapus vendor'); }
  };

  const toggleStatus = async (vendor: any) => {
    const newStatus = vendor.status === 'Active' ? 'Inactive' : 'Active';
    try {
      const res = await apiFetch('/api/master/vendors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: vendor.id, status: newStatus }),
      });
      if (res.ok) {
        toast('success', `Status vendor ${vendor.name} diubah menjadi ${newStatus}`);
        fetchVendors();
      } else {
        toast('error', 'Gagal mengubah status vendor');
      }
    } catch (err) { toast('error', 'Gagal mengubah status vendor'); }
  };

  if (!canAccess('master_vendor')) {
    return (
      <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">Akses Ditolak</h3>
        <p className="text-xs text-slate-500 mt-1">Role Anda ({role}) tidak memiliki izin untuk mengakses Master Vendor.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <span>Master Vendor & Rekanan IT</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Manajemen vendor hardware, headset, dan logistik</p>
        </div>
        {can('master_vendor', 'create') && (
          <button onClick={handleOpenAdd} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5 self-start">
            <Plus className="w-4 h-4" /><span>Tambah Vendor</span>
          </button>
        )}
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchVendors()} placeholder="Cari vendor / kontak..." className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4 font-semibold">Kode</th>
                <th className="py-3 px-4 font-semibold">Nama Vendor</th>
                <th className="py-3 px-4 font-semibold">Jenis Layanan</th>
                <th className="py-3 px-4 font-semibold">Contact Person</th>
                <th className="py-3 px-4 font-semibold">Kontak</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="py-8 text-center text-slate-400">Memuat data vendor...</td></tr>
              ) : vendors.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-slate-400">Belum ada data vendor.</td></tr>
              ) : (
                vendors.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-indigo-600">{v.code}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{v.name}</td>
                    <td className="py-3 px-4 text-slate-600">{v.serviceType || '-'}</td>
                    <td className="py-3 px-4 text-slate-700">{v.contactPerson || '-'}</td>
                    <td className="py-3 px-4 space-y-1">
                      {v.phone && <div className="flex items-center gap-1.5 text-slate-600"><Phone className="w-3 h-3 text-slate-400" /><span>{v.phone}</span></div>}
                      {v.email && <div className="flex items-center gap-1.5 text-slate-600"><Mail className="w-3 h-3 text-slate-400" /><span>{v.email}</span></div>}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button onClick={() => toggleStatus(v)} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold text-[10px] border ${v.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        {v.status === 'Active' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {v.status}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        {can('master_vendor', 'update') && (
                          <button onClick={() => handleOpenEdit(v)} title="Edit" className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit className="w-3.5 h-3.5" /></button>
                        )}
                        {can('master_vendor', 'delete') && (
                          <button onClick={() => handleDelete(v.id)} title="Hapus" className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">{editingVendor ? 'Ubah Data Vendor' : 'Tambah Vendor Baru'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-4 h-4" /></button>
            </div>
            {errorMsg && <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-xs">{errorMsg}</div>}
            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kode Vendor</label>
                <input type="text" required value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Vendor</label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Jenis Layanan</label>
                <input type="text" value={formData.serviceType} onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })} placeholder="Contoh: Headset, Hardware, Software" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contact Person (PIC)</label>
                <input type="text" value={formData.contactPerson} onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Telepon</label>
                  <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status</label>
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50">Batal</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">{saving ? 'Menyimpan...' : 'Simpan Vendor'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
