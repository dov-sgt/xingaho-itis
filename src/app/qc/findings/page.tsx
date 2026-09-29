'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { AlertTriangle, Plus, Edit, Trash2, X, ShieldAlert, CheckCircle2, XCircle } from 'lucide-react';

export default function FindingsPage() {
  const { can, role, canAccess, apiFetch } = useAuth();
  const { toast } = useToast();
  const [findings, setFindings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [formData, setFormData] = useState({ agenName: '', findingType: 'Language', severity: 'Medium', description: '', evidence: '' });
  const [errorMsg, setErrorMsg] = useState('');

  const fetchFindings = () => {
    setLoading(true);
    apiFetch('/api/findings').then((res) => { if (!res.ok) throw new Error('Gagal'); return res.json(); })
      .then((data) => { setFindings(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { toast('error', 'Gagal memuat'); setLoading(false); });
  };

  useEffect(() => { fetchFindings(); }, []);

  const handleOpenAdd = () => { setEditing(null); setFormData({ agenName: '', findingType: 'Language', severity: 'Medium', description: '', evidence: '' }); setErrorMsg(''); setIsModalOpen(true); };
  const handleOpenEdit = (f: any) => { setEditing(f); setFormData({ agenName: f.agenName, findingType: f.findingType, severity: f.severity, description: f.description, evidence: f.evidence || '' }); setErrorMsg(''); setIsModalOpen(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setErrorMsg(''); setSaving(true);
    try {
      const res = await apiFetch('/api/findings', { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing ? { id: editing.id, ...formData } : formData) });
      const result = await res.json();
      if (!res.ok) { setErrorMsg(result.error); setSaving(false); return; }
      setIsModalOpen(false); toast('success', editing ? 'Diperbarui' : 'Finding dibuat'); fetchFindings();
    } catch (err: any) { setErrorMsg(err.message); }
    setSaving(false);
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      const res = await apiFetch('/api/findings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
      if (res.ok) { toast('success', 'Status diperbarui'); fetchFindings(); } else toast('error', 'Gagal');
    } catch { toast('error', 'Gagal'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus finding ini?')) return;
    try {
      const res = await apiFetch(`/api/findings?id=${id}`, { method: 'DELETE' });
      if (res.ok) { toast('success', 'Dihapus'); fetchFindings(); } else toast('error', 'Gagal');
    } catch { toast('error', 'Gagal'); }
  };

  if (!canAccess('transaction_item')) {
    return (<div className="p-8 bg-white rounded-2xl border border-slate-200 text-center"><ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" /><h3 className="text-base font-bold text-slate-800">Akses Ditolak</h3></div>);
  }

  const severityColors: Record<string, string> = { Low: 'bg-blue-50 text-blue-700', Medium: 'bg-amber-50 text-amber-700', High: 'bg-orange-50 text-orange-700', Critical: 'bg-rose-50 text-rose-700' };
  const statusColors: Record<string, string> = { Open: 'bg-rose-50 text-rose-700', 'In Progress': 'bg-amber-50 text-amber-700', Resolved: 'bg-emerald-50 text-emerald-700', Escalated: 'bg-purple-50 text-purple-700' };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-rose-600" />QC Findings</h1>
          <p className="text-xs text-slate-500 mt-0.5">Finding pelanggaran prosedur & etika penagihan OJK</p>
        </div>
        {can('transaction_item', 'create') && <button onClick={handleOpenAdd} className="px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"><Plus className="w-4 h-4" />Buat Finding</button>}
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead><tr className="bg-slate-50 border-b text-slate-400 uppercase text-[10px]"><th className="py-2 px-3">Kode</th><th className="py-2 px-3">Tgl</th><th className="py-2 px-3">Agen</th><th className="py-2 px-3">Tipe</th><th className="py-2 px-3 text-center">Severity</th><th className="py-2 px-3">Deskripsi</th><th className="py-2 px-3 text-center">Status</th><th className="py-2 px-3 text-center">Aksi</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={8} className="py-8 text-center text-slate-400">Memuat...</td></tr> :
                findings.length === 0 ? <tr><td colSpan={8} className="py-8 text-center text-slate-400">Tidak ada finding.</td></tr> :
                  findings.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50/80">
                      <td className="py-2 px-3 font-mono font-bold text-indigo-600">{f.findingCode}</td>
                      <td className="py-2 px-3 text-slate-500">{new Date(f.date).toLocaleDateString('id-ID')}</td>
                      <td className="py-2 px-3 font-semibold">{f.agenName}</td>
                      <td className="py-2 px-3">{f.findingType}</td>
                      <td className="py-2 px-3 text-center"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${severityColors[f.severity] || 'bg-slate-100'}`}>{f.severity}</span></td>
                      <td className="py-2 px-3 text-slate-600 max-w-xs truncate">{f.description}</td>
                      <td className="py-2 px-3 text-center">
                        {can('transaction_item', 'update') ? (
                          <select value={f.status} onChange={(e) => handleStatusChange(f.id, e.target.value)} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border-0 ${statusColors[f.status] || 'bg-slate-100'}`}>
                            <option value="Open">Open</option><option value="In Progress">In Progress</option><option value="Resolved">Resolved</option><option value="Escalated">Escalated</option>
                          </select>
                        ) : <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColors[f.status] || 'bg-slate-100'}`}>{f.status}</span>}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex gap-1 justify-center">
                          {can('transaction_item', 'update') && <button onClick={() => handleOpenEdit(f)} className="p-1 hover:bg-indigo-50 rounded"><Edit className="w-3 h-3" /></button>}
                          {can('transaction_item', 'delete') && <button onClick={() => handleDelete(f.id)} className="p-1 hover:bg-rose-50 rounded"><Trash2 className="w-3 h-3" /></button>}
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
            <div className="flex justify-between mb-4 pb-3 border-b"><h3 className="text-sm font-bold">{editing ? 'Ubah Finding' : 'Buat Finding'}</h3><button onClick={() => setIsModalOpen(false)}><X className="w-4 h-4" /></button></div>
            {errorMsg && <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-xs">{errorMsg}</div>}
            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div><label className="block font-semibold mb-1">Nama Agen</label><input type="text" required value={formData.agenName} onChange={(e) => setFormData({ ...formData, agenName: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl" /></div>
              <div><label className="block font-semibold mb-1">Tipe Finding</label><select value={formData.findingType} onChange={(e) => setFormData({ ...formData, findingType: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl"><option>Language</option><option>Procedure</option><option>Ethics</option><option>Other</option></select></div>
              <div><label className="block font-semibold mb-1">Severity</label><select value={formData.severity} onChange={(e) => setFormData({ ...formData, severity: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl"><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></div>
              <div><label className="block font-semibold mb-1">Deskripsi</label><textarea rows={3} required value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl"></textarea></div>
              <div><label className="block font-semibold mb-1">Evidence (link recording/dokumen)</label><input type="text" value={formData.evidence} onChange={(e) => setFormData({ ...formData, evidence: e.target.value })} placeholder="https://..." className="w-full px-3 py-2 bg-slate-50 border rounded-xl" /></div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-xl">Batal</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-rose-600 text-white rounded-xl font-semibold disabled:opacity-50">{saving ? 'Menyimpan...' : 'Simpan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
