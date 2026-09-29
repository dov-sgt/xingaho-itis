'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { Headphones, Plus, Edit, X, ShieldAlert, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';

export default function RecordingReviewsPage() {
  const { can, role, canAccess, apiFetch } = useAuth();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [formData, setFormData] = useState({ agenName: '', nasabahName: '', recordingUrl: '', duration: '', reviewedBy: '', compliance: 'Compliant', notes: '' });
  const [errorMsg, setErrorMsg] = useState('');

  const fetchReviews = () => {
    setLoading(true);
    apiFetch('/api/recording-reviews').then((res) => { if (!res.ok) throw new Error('Gagal'); return res.json(); })
      .then((data) => { setReviews(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { toast('error', 'Gagal memuat'); setLoading(false); });
  };

  useEffect(() => { fetchReviews(); }, []);

  const handleOpenAdd = () => { setEditing(null); setFormData({ agenName: '', nasabahName: '', recordingUrl: '', duration: '', reviewedBy: '', compliance: 'Compliant', notes: '' }); setErrorMsg(''); setIsModalOpen(true); };
  const handleOpenEdit = (r: any) => { setEditing(r); setFormData({ agenName: r.agenName, nasabahName: r.nasabahName || '', recordingUrl: r.recordingUrl || '', duration: r.duration || '', reviewedBy: r.reviewedBy, compliance: r.compliance, notes: r.notes || '' }); setErrorMsg(''); setIsModalOpen(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setErrorMsg(''); setSaving(true);
    try {
      const res = await apiFetch('/api/recording-reviews', { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing ? { id: editing.id, ...formData } : formData) });
      const result = await res.json();
      if (!res.ok) { setErrorMsg(result.error); setSaving(false); return; }
      setIsModalOpen(false); toast('success', editing ? 'Diperbarui' : 'Review dibuat'); fetchReviews();
    } catch (err: any) { setErrorMsg(err.message); }
    setSaving(false);
  };

  if (!canAccess('transaction_item')) {
    return (<div className="p-8 bg-white rounded-2xl border border-slate-200 text-center"><ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" /><h3 className="text-base font-bold text-slate-800">Akses Ditolak</h3></div>);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Headphones className="w-5 h-5 text-indigo-600" />Recording Review</h1>
          <p className="text-xs text-slate-500 mt-0.5">Review recording telp agen — compliance OJK</p>
        </div>
        {can('transaction_item', 'create') && <button onClick={handleOpenAdd} className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"><Plus className="w-4 h-4" />Buat Review</button>}
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead><tr className="bg-slate-50 border-b text-slate-400 uppercase text-[10px]"><th className="py-2 px-3">Kode</th><th className="py-2 px-3">Tgl</th><th className="py-2 px-3">Agen</th><th className="py-2 px-3">Nasabah</th><th className="py-2 px-3">Recording</th><th className="py-2 px-3">Reviewer</th><th className="py-2 px-3 text-center">Compliance</th><th className="py-2 px-3 text-center">Aksi</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={8} className="py-8 text-center text-slate-400">Memuat...</td></tr> :
                reviews.length === 0 ? <tr><td colSpan={8} className="py-8 text-center text-slate-400">Tidak ada review.</td></tr> :
                  reviews.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80">
                      <td className="py-2 px-3 font-mono font-bold text-indigo-600">{r.reviewCode}</td>
                      <td className="py-2 px-3 text-slate-500">{new Date(r.date).toLocaleDateString('id-ID')}</td>
                      <td className="py-2 px-3 font-semibold">{r.agenName}</td>
                      <td className="py-2 px-3">{r.nasabahName || '-'}</td>
                      <td className="py-2 px-3">
                        {r.recordingUrl ? (
                          <a href={r.recordingUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline flex items-center gap-1"><ExternalLink className="w-3 h-3" />Link</a>
                        ) : '-'}
                      </td>
                      <td className="py-2 px-3">{r.reviewedBy}</td>
                      <td className="py-2 px-3 text-center">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${r.compliance === 'Compliant' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                          {r.compliance === 'Compliant' ? <CheckCircle2 className="w-3 h-3 inline" /> : <XCircle className="w-3 h-3 inline" />}
                          {r.compliance}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        {can('transaction_item', 'update') && <button onClick={() => handleOpenEdit(r)} className="p-1 hover:bg-indigo-50 rounded"><Edit className="w-3 h-3" /></button>}
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
            <div className="flex justify-between mb-4 pb-3 border-b"><h3 className="text-sm font-bold">{editing ? 'Ubah Review' : 'Buat Recording Review'}</h3><button onClick={() => setIsModalOpen(false)}><X className="w-4 h-4" /></button></div>
            {errorMsg && <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-xs">{errorMsg}</div>}
            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div><label className="block font-semibold mb-1">Nama Agen</label><input type="text" required value={formData.agenName} onChange={(e) => setFormData({ ...formData, agenName: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl" /></div>
              <div><label className="block font-semibold mb-1">Nama Nasabah</label><input type="text" value={formData.nasabahName} onChange={(e) => setFormData({ ...formData, nasabahName: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl" /></div>
              <div><label className="block font-semibold mb-1">Link Recording</label><input type="text" value={formData.recordingUrl} onChange={(e) => setFormData({ ...formData, recordingUrl: e.target.value })} placeholder="https://recording-server/..." className="w-full px-3 py-2 bg-slate-50 border rounded-xl" /></div>
              <div><label className="block font-semibold mb-1">Durasi</label><input type="text" value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: e.target.value })} placeholder="Contoh: 05:30" className="w-full px-3 py-2 bg-slate-50 border rounded-xl" /></div>
              <div><label className="block font-semibold mb-1">Reviewer</label><input type="text" required value={formData.reviewedBy} onChange={(e) => setFormData({ ...formData, reviewedBy: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl" /></div>
              <div><label className="block font-semibold mb-1">Compliance</label><select value={formData.compliance} onChange={(e) => setFormData({ ...formData, compliance: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl"><option value="Compliant">Compliant</option><option value="Non-Compliant">Non-Compliant</option></select></div>
              <div><label className="block font-semibold mb-1">Notes</label><textarea rows={2} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl"></textarea></div>
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
