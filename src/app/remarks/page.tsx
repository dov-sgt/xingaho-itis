'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { ClipboardCheck, Plus, Edit, X, ShieldAlert, CheckCircle } from 'lucide-react';

export default function RemarksPage() {
  const { can, role, canAccess, user, apiFetch } = useAuth();
  const { toast } = useToast();
  const [remarks, setRemarks] = useState<any[]>([]);
  const [nasabah, setNasabah] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [formData, setFormData] = useState({ nasabahId: '', agenName: '', remark: '', promiseToPay: false, promiseDate: '' });
  const [errorMsg, setErrorMsg] = useState('');

  const fetchRemarks = () => {
    setLoading(true);
    apiFetch('/api/remarks').then((res) => { if (!res.ok) throw new Error('Gagal'); return res.json(); })
      .then((data) => { setRemarks(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { toast('error', 'Gagal memuat'); setLoading(false); });
  };

  const fetchNasabah = () => {
    apiFetch('/api/nasabah').then((res) => { if (!res.ok) throw new Error('Gagal'); return res.json(); })
      .then((data) => setNasabah(Array.isArray(data) ? data : []))
      .catch(() => {});
  };

  useEffect(() => { fetchRemarks(); fetchNasabah(); }, []);

  const handleOpenAdd = () => { setEditing(null); setFormData({ nasabahId: '', agenName: user?.name || '', remark: '', promiseToPay: false, promiseDate: '' }); setErrorMsg(''); setIsModalOpen(true); };
  const handleOpenEdit = (r: any) => { setEditing(r); setFormData({ nasabahId: String(r.nasabahId), agenName: r.agenName, remark: r.remark, promiseToPay: r.promiseToPay, promiseDate: r.promiseDate ? new Date(r.promiseDate).toISOString().split('T')[0] : '' }); setErrorMsg(''); setIsModalOpen(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setErrorMsg(''); setSaving(true);
    try {
      const res = await apiFetch('/api/remarks', { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing ? { id: editing.id, ...formData } : formData) });
      const result = await res.json();
      if (!res.ok) { setErrorMsg(result.error); setSaving(false); return; }
      setIsModalOpen(false); toast('success', editing ? 'Diperbarui' : 'Remark ditambahkan'); fetchRemarks();
    } catch (err: any) { setErrorMsg(err.message); }
    setSaving(false);
  };

  if (!canAccess('transaction_item')) {
    return (<div className="p-8 bg-white rounded-2xl border border-slate-200 text-center"><ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" /><h3 className="text-base font-bold text-slate-800">Akses Ditolak</h3></div>);
  }

  const statusColors: Record<string, string> = { Pending: 'bg-amber-50 text-amber-700', Contacted: 'bg-blue-50 text-blue-700', Promised: 'bg-purple-50 text-purple-700', Paid: 'bg-emerald-50 text-emerald-700' };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2"><ClipboardCheck className="w-5 h-5 text-indigo-600" />Remarks Nasabah</h1>
          <p className="text-xs text-slate-500 mt-0.5">Catatan interaksi agen dengan nasabah</p>
        </div>
        {can('transaction_item', 'create') && <button onClick={handleOpenAdd} className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"><Plus className="w-4 h-4" />Tambah</button>}
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead><tr className="bg-slate-50 border-b text-slate-400 uppercase text-[10px]"><th className="py-2 px-3">Tgl</th><th className="py-2 px-3">Nasabah</th><th className="py-2 px-3">Agen</th><th className="py-2 px-3">Remark</th><th className="py-2 px-3 text-center">Promise</th><th className="py-2 px-3 text-center">Status</th><th className="py-2 px-3 text-center">Aksi</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={7} className="py-8 text-center text-slate-400">Memuat...</td></tr> :
                remarks.length === 0 ? <tr><td colSpan={7} className="py-8 text-center text-slate-400">Tidak ada remark.</td></tr> :
                  remarks.map((r) => {
                    const nas = nasabah.find((n) => n.id === r.nasabahId);
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/80">
                        <td className="py-2 px-3 text-slate-500">{new Date(r.date).toLocaleDateString('id-ID')}</td>
                        <td className="py-2 px-3 font-semibold">{nas?.nama || '-'}</td>
                        <td className="py-2 px-3">{r.agenName}</td>
                        <td className="py-2 px-3 text-slate-600 max-w-xs truncate">{r.remark}</td>
                        <td className="py-2 px-3 text-center">{r.promiseToPay ? <span className="text-emerald-600 font-semibold">Yes</span> : <span className="text-slate-400">No</span>}</td>
                        <td className="py-2 px-3 text-center"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColors[r.status] || 'bg-slate-100'}`}>{r.status}</span></td>
                        <td className="py-2 px-3 text-center">
                          {can('transaction_item', 'update') && <button onClick={() => handleOpenEdit(r)} className="p-1 hover:bg-indigo-50 rounded"><Edit className="w-3 h-3" /></button>}
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
            <div className="flex justify-between mb-4 pb-3 border-b"><h3 className="text-sm font-bold">{editing ? 'Ubah Remark' : 'Tambah Remark'}</h3><button onClick={() => setIsModalOpen(false)}><X className="w-4 h-4" /></button></div>
            {errorMsg && <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-xs">{errorMsg}</div>}
            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div><label className="block font-semibold mb-1">Nasabah</label><select required value={formData.nasabahId} onChange={(e) => setFormData({ ...formData, nasabahId: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl"><option value="">-- Pilih Nasabah --</option>{nasabah.map((n) => <option key={n.id} value={n.id}>{n.nama} ({n.nasabahCode})</option>)}</select></div>
              <div><label className="block font-semibold mb-1">Nama Agen</label><input type="text" required value={formData.agenName} onChange={(e) => setFormData({ ...formData, agenName: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl" /></div>
              <div><label className="block font-semibold mb-1">Remark</label><textarea rows={3} required value={formData.remark} onChange={(e) => setFormData({ ...formData, remark: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl"></textarea></div>
              <div className="flex items-center gap-2"><input type="checkbox" checked={formData.promiseToPay} onChange={(e) => setFormData({ ...formData, promiseToPay: e.target.checked })} className="rounded" /><label className="font-semibold">Promise to Pay</label></div>
              {formData.promiseToPay && <div><label className="block font-semibold mb-1">Tanggal Promise</label><input type="date" value={formData.promiseDate} onChange={(e) => setFormData({ ...formData, promiseDate: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl" /></div>}
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
