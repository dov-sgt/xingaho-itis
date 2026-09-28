'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { DoorOpen, Plus, Edit, Trash2, X, ShieldAlert } from 'lucide-react';

export default function LogRuangServerPage() {
  const { can, role, canAccess, user, apiFetch } = useAuth();
  const { toast } = useToast();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [formData, setFormData] = useState({ date: '', nama: '', jamMasuk: '', jamKeluar: '', keperluan: '' });
  const [errorMsg, setErrorMsg] = useState('');

  const fetchLogs = () => {
    setLoading(true);
    apiFetch('/api/log-ruang-server').then((res) => { if (!res.ok) throw new Error('Gagal'); return res.json(); })
      .then((data) => { setLogs(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { toast('error', 'Gagal memuat'); setLoading(false); });
  };

  useEffect(() => { fetchLogs(); }, []);

  const handleOpenAdd = () => { setEditing(null); setFormData({ date: new Date().toISOString().split('T')[0], nama: '', jamMasuk: '', jamKeluar: '', keperluan: '' }); setErrorMsg(''); setIsModalOpen(true); };
  const handleOpenEdit = (l: any) => { setEditing(l); setFormData({ date: l.date ? new Date(l.date).toISOString().split('T')[0] : '', nama: l.nama, jamMasuk: l.jamMasuk, jamKeluar: l.jamKeluar || '', keperluan: l.keperluan }); setErrorMsg(''); setIsModalOpen(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setErrorMsg(''); setSaving(true);
    try {
      const res = await apiFetch('/api/log-ruang-server', { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing ? { id: editing.id, ...formData } : formData) });
      const result = await res.json();
      if (!res.ok) { setErrorMsg(result.error); setSaving(false); return; }
      setIsModalOpen(false); toast('success', editing ? 'Diperbarui' : 'Log dibuat'); fetchLogs();
    } catch (err: any) { setErrorMsg(err.message); }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus log ini?')) return;
    try {
      const res = await apiFetch(`/api/log-ruang-server?id=${id}`, { method: 'DELETE' });
      if (res.ok) { toast('success', 'Dihapus'); fetchLogs(); } else toast('error', 'Gagal');
    } catch { toast('error', 'Gagal'); }
  };

  if (!canAccess('transaction_item')) {
    return (<div className="p-8 bg-white rounded-2xl border border-slate-200 text-center"><ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" /><h3 className="text-base font-bold text-slate-800">Akses Ditolak</h3></div>);
  }

  const canEdit = ['SPV', 'SUPERADMIN'].includes(role);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold flex items-center gap-2"><DoorOpen className="w-5 h-5 text-indigo-600" />Log Ruang Server</h1>
        {canEdit && <button onClick={handleOpenAdd} className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"><Plus className="w-4 h-4" />Tambah Log</button>}
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead><tr className="bg-slate-50 border-b text-slate-400 uppercase text-[10px]"><th className="py-2 px-3">ID</th><th className="py-2 px-3">Tanggal</th><th className="py-2 px-3">Nama</th><th className="py-2 px-3">Jam Masuk</th><th className="py-2 px-3">Jam Keluar</th><th className="py-2 px-3">Keperluan</th><th className="py-2 px-3 text-center">Aksi</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={7} className="py-8 text-center text-slate-400">Memuat...</td></tr> :
                logs.length === 0 ? <tr><td colSpan={7} className="py-8 text-center text-slate-400">Belum ada log.</td></tr> :
                  logs.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/80">
                      <td className="py-2 px-3 font-mono font-bold text-indigo-600">{l.logCode}</td>
                      <td className="py-2 px-3">{new Date(l.date).toLocaleDateString('id-ID')}</td>
                      <td className="py-2 px-3 font-semibold">{l.nama}</td>
                      <td className="py-2 px-3">{l.jamMasuk}</td>
                      <td className="py-2 px-3">{l.jamKeluar || '-'}</td>
                      <td className="py-2 px-3">{l.keperluan}</td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex gap-1 justify-center">
                          {canEdit && <button onClick={() => handleOpenEdit(l)} className="p-1 hover:bg-indigo-50 rounded"><Edit className="w-3 h-3" /></button>}
                          {canEdit && <button onClick={() => handleDelete(l.id)} className="p-1 hover:bg-rose-50 rounded"><Trash2 className="w-3 h-3" /></button>}
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
            <div className="flex justify-between mb-4 pb-3 border-b"><h3 className="text-sm font-bold">{editing ? 'Ubah Log' : 'Tambah Log Ruang Server'}</h3><button onClick={() => setIsModalOpen(false)}><X className="w-4 h-4" /></button></div>
            {errorMsg && <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-xs">{errorMsg}</div>}
            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div><label className="block font-semibold mb-1">Tanggal</label><input type="date" required value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl" /></div>
              <div><label className="block font-semibold mb-1">Nama</label><input type="text" required value={formData.nama} onChange={(e) => setFormData({ ...formData, nama: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="block font-semibold mb-1">Jam Masuk</label><input type="time" required value={formData.jamMasuk} onChange={(e) => setFormData({ ...formData, jamMasuk: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl" /></div>
                <div><label className="block font-semibold mb-1">Jam Keluar</label><input type="time" value={formData.jamKeluar} onChange={(e) => setFormData({ ...formData, jamKeluar: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl" /></div>
              </div>
              <div><label className="block font-semibold mb-1">Keperluan</label><textarea rows={2} required value={formData.keperluan} onChange={(e) => setFormData({ ...formData, keperluan: e.target.value })} placeholder="Contoh: Maintenance server, cek AC, dll" className="w-full px-3 py-2 bg-slate-50 border rounded-xl"></textarea></div>
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
