'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { FileText, Plus, ShieldAlert, X, Edit, Trash2 } from 'lucide-react';

export default function VendorSubmissionsPage() {
  const { can, role, canAccess, user, apiFetch } = useAuth();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubmission, setEditingSubmission] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Filters
  const [searchVendor, setSearchVendor] = useState('');
  const [searchProject, setSearchProject] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [formData, setFormData] = useState({
    vendorName: '', title: '', description: '', category: 'Pengajuan Headset',
    proposedPrice: '', nik: '', karyawanName: '', project: '', date: ''
  });

  const fetchSubmissions = () => {
    setLoading(true);
    const query = new URLSearchParams({
      vendorName: searchVendor,
      project: searchProject,
      status: statusFilter,
      date_from: dateFrom,
      date_to: dateTo,
    });
    apiFetch(`/api/transactions/vendor-submissions?${query.toString()}`)
      .then((res) => { if (!res.ok) throw new Error('Gagal'); return res.json(); })
      .then((data) => { setSubmissions(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { toast('error', 'Gagal memuat'); setLoading(false); });
  };

  useEffect(() => { fetchSubmissions(); }, [statusFilter]);

  const handleOpenAdd = () => {
    setEditingSubmission(null);
    setFormData({
      vendorName: role === 'VENDOR' ? user?.name || '' : '',
      title: '', description: '', category: 'Pengajuan Headset',
      proposedPrice: '', nik: '', karyawanName: '', project: '', date: ''
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sub: any) => {
    setEditingSubmission(sub);
    setFormData({
      vendorName: sub.vendorName || '',
      title: sub.title || '',
      description: sub.description || '',
      category: sub.category || 'Pengajuan Headset',
      proposedPrice: String(sub.proposedPrice || ''),
      nik: sub.nik || '',
      karyawanName: sub.karyawanName || '',
      project: sub.project || '',
      date: sub.date ? new Date(sub.date).toISOString().split('T')[0] : ''
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setErrorMsg(''); setSaving(true);
    try {
      const url = '/api/transactions/vendor-submissions';
      const method = editingSubmission ? 'PUT' : 'POST';
      const payload = editingSubmission
        ? { id: editingSubmission.id, ...formData, date: formData.date || new Date().toISOString() }
        : { ...formData, date: formData.date || new Date().toISOString() };

      const res = await apiFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await res.json();
      if (!res.ok) { setErrorMsg(result.error); setSaving(false); return; }
      setIsModalOpen(false);
      toast('success', editingSubmission ? 'Pengajuan diperbarui' : 'Pengajuan berhasil dikirim');
      fetchSubmissions();
    } catch (err: any) { setErrorMsg(err.message); }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus pengajuan ini?')) return;
    try {
      const res = await apiFetch(`/api/transactions/vendor-submissions?id=${id}`, { method: 'DELETE' });
      if (res.ok) { toast('success', 'Pengajuan dihapus'); fetchSubmissions(); }
      else { const r = await res.json(); toast('error', r.error || 'Gagal'); }
    } catch { toast('error', 'Gagal'); }
  };

  if (!canAccess('vendor_submission')) {
    return (<div className="p-8 bg-white rounded-2xl border border-slate-200 text-center"><ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" /><h3 className="text-base font-bold text-slate-800">Akses Ditolak</h3><p className="text-xs text-slate-500 mt-1">Role {role} tidak punya akses.</p></div>);
  }

  const canEdit = (sub: any) => {
    if (role === 'VENDOR') return sub.status === 'Pending';
    return can('vendor_submission', 'update');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2"><FileText className="w-5 h-5 text-indigo-600" /><span>Pengajuan Vendor</span></h1>
          <p className="text-xs text-slate-500 mt-0.5">Vendor mengajukan headset ke IT. Staff/SPV review di halaman Headset User.</p>
        </div>
        {can('vendor_submission', 'create') && (
          <button onClick={handleOpenAdd} className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"><Plus className="w-4 h-4" />Ajukan</button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-semibold mb-1">Nama Vendor</label>
          <input type="text" value={searchVendor} onChange={(e) => setSearchVendor(e.target.value)} placeholder="Cari vendor..." className="px-3 py-2 bg-slate-50 border rounded-xl text-xs w-40" />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">Project</label>
          <input type="text" value={searchProject} onChange={(e) => setSearchProject(e.target.value)} placeholder="Cari project..." className="px-3 py-2 bg-slate-50 border rounded-xl text-xs w-40" />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 bg-slate-50 border rounded-xl text-xs w-32">
            <option value="">Semua</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">Dari Tanggal</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-2 bg-slate-50 border rounded-xl text-xs" />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">Sampai Tanggal</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-2 bg-slate-50 border rounded-xl text-xs" />
        </div>
        <button onClick={fetchSubmissions} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold">Filter</button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead><tr className="bg-slate-50 border-b text-slate-400 uppercase text-[10px]"><th className="py-3 px-4">Kode</th><th className="py-3 px-4">Tgl</th><th className="py-3 px-4">Vendor</th><th className="py-3 px-4">NIK</th><th className="py-3 px-4">Nama</th><th className="py-3 px-4">Project</th><th className="py-3 px-4">Judul</th><th className="py-3 px-4">Estimasi</th><th className="py-3 px-4 text-center">Status</th><th className="py-3 px-4 text-center">Aksi</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={10} className="py-8 text-center text-slate-400">Memuat...</td></tr> :
                submissions.length === 0 ? <tr><td colSpan={10} className="py-8 text-center text-slate-400">Tidak ada data.</td></tr> :
                  submissions.map((sub) => {
                    const sc: Record<string, string> = { Pending: 'bg-amber-50 text-amber-700', Approved: 'bg-emerald-50 text-emerald-700', Rejected: 'bg-rose-50 text-rose-700' };
                    return (
                      <tr key={sub.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-mono font-bold text-indigo-600">{sub.submissionCode}</td>
                        <td className="py-3 px-4 text-slate-500">{new Date(sub.date).toLocaleDateString('id-ID')}</td>
                        <td className="py-3 px-4 font-bold">{sub.vendorName}</td>
                        <td className="py-3 px-4 font-mono">{sub.nik || '-'}</td>
                        <td className="py-3 px-4">{sub.karyawanName || '-'}</td>
                        <td className="py-3 px-4">{sub.project || '-'}</td>
                        <td className="py-3 px-4 font-semibold">{sub.title}</td>
                        <td className="py-3 px-4">Rp {sub.proposedPrice?.toLocaleString('id-ID')}</td>
                        <td className="py-3 px-4 text-center"><span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${sc[sub.status] || 'bg-slate-100'}`}>{sub.status}</span></td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex gap-1.5 justify-center">
                            {canEdit(sub) && <button onClick={() => handleOpenEdit(sub)} title="Edit" className="p-1.5 hover:bg-indigo-50 rounded"><Edit className="w-3.5 h-3.5" /></button>}
                            {can('vendor_submission', 'delete') && <button onClick={() => handleDelete(sub.id)} title="Hapus" className="p-1.5 hover:bg-rose-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-3 border-b"><h3 className="text-sm font-bold">{editingSubmission ? 'Ubah Pengajuan' : 'Ajukan Headset ke IT'}</h3><button onClick={() => setIsModalOpen(false)}><X className="w-4 h-4" /></button></div>
            {errorMsg && <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-xs">{errorMsg}</div>}
            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div><label className="block font-semibold mb-1">Tanggal</label><input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl" /></div>
              <div><label className="block font-semibold mb-1">Nama Vendor</label><input type="text" required value={formData.vendorName} onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="block font-semibold mb-1">NIK</label><input type="text" value={formData.nik} onChange={(e) => setFormData({ ...formData, nik: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl" /></div>
                <div><label className="block font-semibold mb-1">Nama Karyawan</label><input type="text" value={formData.karyawanName} onChange={(e) => setFormData({ ...formData, karyawanName: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl" /></div>
              </div>
              <div><label className="block font-semibold mb-1">Project</label><input type="text" value={formData.project} onChange={(e) => setFormData({ ...formData, project: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl" /></div>
              <div><label className="block font-semibold mb-1">Judul Pengajuan</label><input type="text" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl" /></div>
              <div><label className="block font-semibold mb-1">Kategori</label><select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl"><option>Pengajuan Headset</option><option>Pergantian Unit</option><option>Penawaran Hardware</option><option>Maintenance</option></select></div>
              <div><label className="block font-semibold mb-1">Estimasi Biaya (Rp)</label><input type="number" value={formData.proposedPrice} onChange={(e) => setFormData({ ...formData, proposedPrice: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl" /></div>
              <div><label className="block font-semibold mb-1">Deskripsi</label><textarea rows={2} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl"></textarea></div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-xl">Batal</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold disabled:opacity-50">{saving ? 'Mengirim...' : editingSubmission ? 'Simpan Perubahan' : 'Kirim Pengajuan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
