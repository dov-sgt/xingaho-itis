'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { Calendar, Plus, Edit, Trash2, X, ShieldAlert } from 'lucide-react';

const ITEM_TYPES = ['Projector', 'Laptop', 'HP', 'Tablet', 'Camera', 'Lainnya'];

export default function BookingsPage() {
  const { can, role, canAccess, user, apiFetch } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [formData, setFormData] = useState({ borrowerName: '', itemType: 'Projector', startDate: '', startTime: '', endDate: '', endTime: '', location: '' });
  const [errorMsg, setErrorMsg] = useState('');

  const fetchBookings = () => {
    setLoading(true);
    apiFetch('/api/projector-bookings').then((res) => { if (!res.ok) throw new Error('Gagal'); return res.json(); })
      .then((data) => { setBookings(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { toast('error', 'Gagal memuat'); setLoading(false); });
  };

  useEffect(() => { fetchBookings(); }, []);

  const handleOpenAdd = () => { setEditing(null); setFormData({ borrowerName: '', itemType: 'Projector', startDate: '', startTime: '', endDate: '', endTime: '', location: '' }); setErrorMsg(''); setIsModalOpen(true); };
  const handleOpenEdit = (b: any) => { setEditing(b); setFormData({ borrowerName: b.borrowerName, itemType: b.itemType || 'Projector', startDate: b.startDate, startTime: b.startTime || '', endDate: b.endDate, endTime: b.endTime || '', location: b.location }); setErrorMsg(''); setIsModalOpen(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setErrorMsg(''); setSaving(true);
    try {
      const res = await apiFetch('/api/projector-bookings', { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing ? { id: editing.id, ...formData, createdBy: user?.name } : { ...formData, createdBy: user?.name }) });
      const result = await res.json();
      if (!res.ok) { setErrorMsg(result.error); setSaving(false); return; }
      setIsModalOpen(false); toast('success', editing ? 'Booking diperbarui' : 'Booking dibuat'); fetchBookings();
    } catch (err: any) { setErrorMsg(err.message); }
    setSaving(false);
  };

  const handleStatusChange = async (id: number, status: string) => {
    if (!confirm(`Ubah status menjadi "${status}"?`)) return;
    try {
      const res = await apiFetch('/api/projector-bookings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
      if (res.ok) { toast('success', 'Status diperbarui'); fetchBookings(); } else toast('error', 'Gagal');
    } catch { toast('error', 'Gagal'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus booking ini?')) return;
    try {
      const res = await apiFetch(`/api/projector-bookings?id=${id}`, { method: 'DELETE' });
      if (res.ok) { toast('success', 'Dihapus'); fetchBookings(); } else toast('error', 'Gagal');
    } catch { toast('error', 'Gagal'); }
  };

  if (!canAccess('transaction_item')) {
    return (<div className="p-8 bg-white rounded-2xl border border-slate-200 text-center"><ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" /><h3 className="text-base font-bold text-slate-800">Akses Ditolak</h3></div>);
  }

  const statusColors: Record<string, string> = { Pending: 'bg-amber-50 text-amber-700', Ongoing: 'bg-blue-50 text-blue-700', Done: 'bg-emerald-50 text-emerald-700' };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold flex items-center gap-2"><Calendar className="w-5 h-5 text-indigo-600" />Booking Asset</h1>
        {can('transaction_item', 'create') && <button onClick={handleOpenAdd} className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"><Plus className="w-4 h-4" />Buat Booking</button>}
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead><tr className="bg-slate-50 border-b text-slate-400 uppercase text-[10px]"><th className="py-2 px-3">Kode</th><th className="py-2 px-3">Peminjam</th><th className="py-2 px-3">Tipe</th><th className="py-2 px-3">Tgl Mulai</th><th className="py-2 px-3">Jam</th><th className="py-2 px-3">Tgl Selesai</th><th className="py-2 px-3">Jam</th><th className="py-2 px-3">Lokasi</th><th className="py-2 px-3 text-center">Status</th><th className="py-2 px-3 text-center">Aksi</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={10} className="py-8 text-center text-slate-400">Memuat...</td></tr> :
                bookings.length === 0 ? <tr><td colSpan={10} className="py-8 text-center text-slate-400">Belum ada booking.</td></tr> :
                  bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/80">
                      <td className="py-2 px-3 font-mono font-bold text-indigo-600">{b.bookingCode}</td>
                      <td className="py-2 px-3 font-semibold">{b.borrowerName}</td>
                      <td className="py-2 px-3"><span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-semibold">{b.itemType}</span></td>
                      <td className="py-2 px-3">{b.startDate}</td>
                      <td className="py-2 px-3">{b.startTime || 'Full Day'}</td>
                      <td className="py-2 px-3">{b.endDate}</td>
                      <td className="py-2 px-3">{b.endTime || 'Full Day'}</td>
                      <td className="py-2 px-3">{b.location}</td>
                      <td className="py-2 px-3 text-center">
                        {can('transaction_item', 'update') ? (
                          <select value={b.status} onChange={(e) => handleStatusChange(b.id, e.target.value)} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border-0 ${statusColors[b.status]}`}>
                            <option value="Pending">Pending</option><option value="Ongoing">Ongoing</option><option value="Done">Done</option>
                          </select>
                        ) : <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColors[b.status]}`}>{b.status}</span>}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex gap-1 justify-center">
                          {can('transaction_item', 'update') && <button onClick={() => handleOpenEdit(b)} className="p-1 hover:bg-indigo-50 rounded"><Edit className="w-3 h-3" /></button>}
                          {can('transaction_item', 'delete') && <button onClick={() => handleDelete(b.id)} className="p-1 hover:bg-rose-50 rounded"><Trash2 className="w-3 h-3" /></button>}
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
            <div className="flex justify-between mb-4 pb-3 border-b"><h3 className="text-sm font-bold">{editing ? 'Ubah Booking' : 'Buat Booking'}</h3><button onClick={() => setIsModalOpen(false)}><X className="w-4 h-4" /></button></div>
            {errorMsg && <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-xs">{errorMsg}</div>}
            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div><label className="block font-semibold mb-1">Nama Peminjam</label><input type="text" required value={formData.borrowerName} onChange={(e) => setFormData({ ...formData, borrowerName: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl" /></div>
              <div><label className="block font-semibold mb-1">Tipe Item</label><select value={formData.itemType} onChange={(e) => setFormData({ ...formData, itemType: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl">{ITEM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="block font-semibold mb-1">Tanggal Mulai</label><input type="date" required value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl" /></div>
                <div><label className="block font-semibold mb-1">Jam Mulai</label><input type="time" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl" /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="block font-semibold mb-1">Tanggal Selesai</label><input type="date" required value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl" /></div>
                <div><label className="block font-semibold mb-1">Jam Selesai</label><input type="time" value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl" /></div>
              </div>
              <p className="text-[10px] text-slate-400">Kosongkan jam untuk Full Day</p>
              <div><label className="block font-semibold mb-1">Lokasi</label><input type="text" required value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="Contoh: Ruang Meeting Lt.2" className="w-full px-3 py-2 bg-slate-50 border rounded-xl" /></div>
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
