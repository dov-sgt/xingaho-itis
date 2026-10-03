'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { Wrench, Plus, Edit, Trash2, X, ShieldAlert } from 'lucide-react';

export default function ServisAssetsPage() {
  const { can, role, canAccess, user, apiFetch } = useAuth();
  const { toast } = useToast();
  const [servis, setServis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [formData, setFormData] = useState({ date: '', itemName: '', teknisiName: '' });
  const [errorMsg, setErrorMsg] = useState('');

  const fetchServis = () => {
    setLoading(true);
    apiFetch('/api/servis-assets').then((res) => { if (!res.ok) throw new Error('Gagal'); return res.json(); })
      .then((data) => { setServis(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { toast('error', 'Gagal memuat'); setLoading(false); });
  };

  useEffect(() => { fetchServis(); }, []);

  const handleOpenAdd = () => { setEditing(null); setFormData({ date: new Date().toISOString().split('T')[0], itemName: '', teknisiName: '' }); setErrorMsg(''); setIsModalOpen(true); };
  const handleOpenEdit = (s: any) => { setEditing(s); setFormData({ date: s.date ? new Date(s.date).toISOString().split('T')[0] : '', itemName: s.itemName, teknisiName: s.teknisiName }); setErrorMsg(''); setIsModalOpen(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setErrorMsg(''); setSaving(true);
    try {
      const res = await apiFetch('/api/servis-assets', { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing ? { id: editing.id, ...formData, createdBy: user?.name } : { ...formData, createdBy: user?.name }) });
      const result = await res.json();
      if (!res.ok) { setErrorMsg(result.error); setSaving(false); return; }
      setIsModalOpen(false); toast('success', editing ? 'Diperbarui' : 'Servis asset dibuat'); fetchServis();
    } catch (err: any) { setErrorMsg(err.message); }
    setSaving(false);
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      const res = await apiFetch('/api/servis-assets', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
      if (res.ok) { toast('success', 'Status diperbarui'); fetchServis(); } else toast('error', 'Gagal');
    } catch { toast('error', 'Gagal'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus servis ini?')) return;
    try {
      const res = await apiFetch(`/api/servis-assets?id=${id}`, { method: 'DELETE' });
      if (res.ok) { toast('success', 'Dihapus'); fetchServis(); } else toast('error', 'Gagal');
    } catch { toast('error', 'Gagal'); }
  };

  if (!canAccess('transaction_item')) {
    return (<div className="p-8 bg-white rounded-2xl border border-slate-200 text-center"><ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" /><h3 className="text-base font-bold text-slate-800">Akses Ditolak</h3></div>);
  }

  const statusColors: Record<string, string> = { Pending: 'bg-amber-50 text-amber-700', Ongoing: 'bg-blue-50 text-blue-700', Done: 'bg-emerald-50 text-emerald-700' };
  const canEdit = ['SPV_OPS', 'MANAGER_OPS', 'SUPERADMIN'].includes(role);
  const canCreate = ['SPV_OPS', 'MANAGER_OPS', 'LEADER_OPS', 'SUPERADMIN'].includes(role);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold flex items-center gap-2"><Wrench className="w-5 h-5 text-indigo-600" />Servis Asset</h1>
        {canCreate && <button onClick={handleOpenAdd} className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"><Plus className="w-4 h-4" />Tambah</button>}
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead><tr className="bg-slate-50 border-b text-slate-400 uppercase text-[10px]"><th className="py-2 px-3">ID</th><th className="py-2 px-3">Tanggal</th><th className="py-2 px-3">Nama Item</th><th className="py-2 px-3">Teknisi (Vendor)</th><th className="py-2 px-3 text-center">Status</th><th className="py-2 px-3 text-center">Aksi</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={6} className="py-8 text-center text-slate-400">Memuat...</td></tr> :
                servis.length === 0 ? <tr><td colSpan={6} className="py-8 text-center text-slate-400">Belum ada servis.</td></tr> :
                  servis.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/80">
                      <td className="py-2 px-3 font-mono font-bold text-indigo-600">{s.servisCode}</td>
                      <td className="py-2 px-3">{new Date(s.date).toLocaleDateString('id-ID')}</td>
                      <td className="py-2 px-3 font-semibold">{s.itemName}</td>
                      <td className="py-2 px-3">{s.teknisiName}</td>
                      <td className="py-2 px-3 text-center">
                        {canEdit ? (
                          <select value={s.status} onChange={(e) => handleStatusChange(s.id, e.target.value)} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border-0 ${statusColors[s.status]}`}>
                            <option value="Pending">Pending</option><option value="Ongoing">Ongoing</option><option value="Done">Done</option>
                          </select>
                        ) : <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColors[s.status]}`}>{s.status}</span>}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex gap-1 justify-center">
                          {canEdit && <button onClick={() => handleOpenEdit(s)} className="p-1 hover:bg-indigo-50 rounded"><Edit className="w-3 h-3" /></button>}
                          {canEdit && <button onClick={() => handleDelete(s.id)} className="p-1 hover:bg-rose-50 rounded"><Trash2 className="w-3 h-3" /></button>}
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
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <div className="flex justify-between mb-4 pb-3 border-b"><h3 className="text-sm font-bold">{editing ? 'Ubah Servis' : 'Tambah Servis Asset'}</h3><button onClick={() => setIsModalOpen(false)}><X className="w-4 h-4" /></button></div>
            {errorMsg && <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-xs">{errorMsg}</div>}
            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div><label className="block font-semibold mb-1">Tanggal</label><input type="date" required value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl" /></div>
              <div><label className="block font-semibold mb-1">Nama Item</label><input type="text" required value={formData.itemName} onChange={(e) => setFormData({ ...formData, itemName: e.target.value })} placeholder="Contoh: Laptop Asus Core i3" className="w-full px-3 py-2 bg-slate-50 border rounded-xl" /></div>
              <div><label className="block font-semibold mb-1">Nama Teknisi (Vendor)</label><input type="text" required value={formData.teknisiName} onChange={(e) => setFormData({ ...formData, teknisiName: e.target.value })} placeholder="Contoh: Rian (Swapro)" className="w-full px-3 py-2 bg-slate-50 border rounded-xl" /></div>
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
