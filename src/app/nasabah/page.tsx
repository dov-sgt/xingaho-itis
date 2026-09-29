'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { Users, Plus, Edit, Trash2, X, ShieldAlert, Phone, MapPin } from 'lucide-react';

export default function NasabahPage() {
  const { can, role, canAccess, apiFetch } = useAuth();
  const { toast } = useToast();
  const [nasabah, setNasabah] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [formData, setFormData] = useState({ nama: '', nik: '', phone: '', email: '', alamat: '', loanAmount: '', dueDate: '', assignedTo: '' });
  const [errorMsg, setErrorMsg] = useState('');

  const fetchNasabah = () => {
    setLoading(true);
    apiFetch('/api/nasabah').then((res) => { if (!res.ok) throw new Error('Gagal'); return res.json(); })
      .then((data) => { setNasabah(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { toast('error', 'Gagal memuat'); setLoading(false); });
  };

  useEffect(() => { fetchNasabah(); }, []);

  const handleOpenAdd = () => { setEditing(null); setFormData({ nama: '', nik: '', phone: '', email: '', alamat: '', loanAmount: '', dueDate: '', assignedTo: '' }); setErrorMsg(''); setIsModalOpen(true); };
  const handleOpenEdit = (n: any) => { setEditing(n); setFormData({ nama: n.nama, nik: n.nik || '', phone: n.phone, email: n.email || '', alamat: n.alamat || '', loanAmount: String(n.loanAmount || ''), dueDate: n.dueDate ? new Date(n.dueDate).toISOString().split('T')[0] : '', assignedTo: n.assignedTo || '' }); setErrorMsg(''); setIsModalOpen(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setErrorMsg(''); setSaving(true);
    try {
      const res = await apiFetch('/api/nasabah', { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing ? { id: editing.id, ...formData } : formData) });
      const result = await res.json();
      if (!res.ok) { setErrorMsg(result.error); setSaving(false); return; }
      setIsModalOpen(false); toast('success', editing ? 'Diperbarui' : 'Nasabah ditambahkan'); fetchNasabah();
    } catch (err: any) { setErrorMsg(err.message); }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus nasabah ini?')) return;
    try {
      const res = await apiFetch(`/api/nasabah?id=${id}`, { method: 'DELETE' });
      if (res.ok) { toast('success', 'Dihapus'); fetchNasabah(); } else toast('error', 'Gagal');
    } catch { toast('error', 'Gagal'); }
  };

  if (!canAccess('transaction_item')) {
    return (<div className="p-8 bg-white rounded-2xl border border-slate-200 text-center"><ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" /><h3 className="text-base font-bold text-slate-800">Akses Ditolak</h3></div>);
  }

  const statusColors: Record<string, string> = { Active: 'bg-emerald-50 text-emerald-700', Overdue: 'bg-amber-50 text-amber-700', Paid: 'bg-blue-50 text-blue-700', Default: 'bg-rose-50 text-rose-700' };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Users className="w-5 h-5 text-indigo-600" />Data Nasabah</h1>
          <p className="text-xs text-slate-500 mt-0.5">Kelola data nasabah penagihan</p>
        </div>
        {can('transaction_item', 'create') && <button onClick={handleOpenAdd} className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"><Plus className="w-4 h-4" />Tambah</button>}
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead><tr className="bg-slate-50 border-b text-slate-400 uppercase text-[10px]"><th className="py-2 px-3">Kode</th><th className="py-2 px-3">Nama</th><th className="py-2 px-3">Telepon</th><th className="py-2 px-3">Pinjaman</th><th className="py-2 px-3">Jatuh Tempo</th><th className="py-2 px-3">Assigned To</th><th className="py-2 px-3 text-center">Status</th><th className="py-2 px-3 text-center">Aksi</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={8} className="py-8 text-center text-slate-400">Memuat...</td></tr> :
                nasabah.length === 0 ? <tr><td colSpan={8} className="py-8 text-center text-slate-400">Tidak ada data.</td></tr> :
                  nasabah.map((n) => (
                    <tr key={n.id} className="hover:bg-slate-50/80">
                      <td className="py-2 px-3 font-mono font-bold text-indigo-600">{n.nasabahCode}</td>
                      <td className="py-2 px-3 font-semibold">{n.nama}</td>
                      <td className="py-2 px-3">{n.phone}</td>
                      <td className="py-2 px-3">Rp {n.loanAmount?.toLocaleString('id-ID')}</td>
                      <td className="py-2 px-3">{n.dueDate ? new Date(n.dueDate).toLocaleDateString('id-ID') : '-'}</td>
                      <td className="py-2 px-3">{n.assignedTo || '-'}</td>
                      <td className="py-2 px-3 text-center"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColors[n.status] || 'bg-slate-100'}`}>{n.status}</span></td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex gap-1.5 justify-center">
                          {can('transaction_item', 'update') && <button onClick={() => handleOpenEdit(n)} className="p-1 hover:bg-indigo-50 rounded"><Edit className="w-3 h-3" /></button>}
                          {can('transaction_item', 'delete') && <button onClick={() => handleDelete(n.id)} className="p-1 hover:bg-rose-50 rounded"><Trash2 className="w-3 h-3" /></button>}
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between mb-4 pb-3 border-b"><h3 className="text-sm font-bold">{editing ? 'Ubah Nasabah' : 'Tambah Nasabah'}</h3><button onClick={() => setIsModalOpen(false)}><X className="w-4 h-4" /></button></div>
            {errorMsg && <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-xs">{errorMsg}</div>}
            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div><label className="block font-semibold mb-1">Nama Nasabah</label><input type="text" required value={formData.nama} onChange={(e) => setFormData({ ...formData, nama: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="block font-semibold mb-1">NIK</label><input type="text" value={formData.nik} onChange={(e) => setFormData({ ...formData, nik: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl" /></div>
                <div><label className="block font-semibold mb-1">Telepon</label><input type="text" required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl" /></div>
              </div>
              <div><label className="block font-semibold mb-1">Email</label><input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl" /></div>
              <div><label className="block font-semibold mb-1">Alamat</label><textarea rows={2} value={formData.alamat} onChange={(e) => setFormData({ ...formData, alamat: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl"></textarea></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="block font-semibold mb-1">Jumlah Pinjaman (Rp)</label><input type="number" value={formData.loanAmount} onChange={(e) => setFormData({ ...formData, loanAmount: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl" /></div>
                <div><label className="block font-semibold mb-1">Jatuh Tempo</label><input type="date" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl" /></div>
              </div>
              <div><label className="block font-semibold mb-1">Assigned To (Agen)</label><input type="text" value={formData.assignedTo} onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })} placeholder="Nama agen" className="w-full px-3 py-2 bg-slate-50 border rounded-xl" /></div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-xl">Batal</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold disabled:opacity-50">{saving ? 'Menyimpan...' : 'Simpan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
