'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { Headphones, Search, X, ChevronLeft, ChevronRight, ShieldAlert, CheckCircle, XCircle, RotateCcw } from 'lucide-react';

export default function HeadsetUserPage() {
  const { can, role, canAccess, user, apiFetch } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Review Modal
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [reviewAction, setReviewAction] = useState<'Approved' | 'Reject'>('Approved');
  const [depositValue, setDepositValue] = useState('');

  // Return Modal
  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const [returnTarget, setReturnTarget] = useState<any>(null);
  const [returnCondition, setReturnCondition] = useState('Good Condition');
  const [returnPrice, setReturnPrice] = useState('');
  const [returnNote, setReturnNote] = useState('');

  const fetchTransactions = () => {
    setLoading(true);
    const query = new URLSearchParams({ page: String(page), limit: '25', search, status: statusFilter });
    apiFetch(`/api/transactions/items?${query.toString()}`)
      .then((res) => { if (!res.ok) throw new Error('Gagal'); return res.json(); })
      .then((res) => { setTransactions(res.data || []); setPagination(res.pagination || { total: 0, totalPages: 1 }); setLoading(false); })
      .catch(() => { toast('error', 'Gagal memuat data'); setLoading(false); });
  };

  const fetchPendingSubmissions = () => {
    apiFetch('/api/transactions/vendor-submissions?status=Pending')
      .then((res) => { if (!res.ok) return []; return res.json(); })
      .then((data) => setSubmissions(Array.isArray(data) ? data : []))
      .catch(() => {});
  };

  useEffect(() => { fetchTransactions(); fetchPendingSubmissions(); }, [page, statusFilter]);

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await apiFetch('/api/transactions/vendor-submissions', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selected.id, status: reviewAction, adminNote: `${reviewAction} oleh ${user?.name}` }) });
      if (reviewAction === 'Approved') {
        await apiFetch('/api/transactions/items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: selected.date ? new Date(selected.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0], nik: selected.nik, name: selected.karyawanName, vendor: selected.vendorName, project: selected.project, deposit: parseFloat(depositValue) || 100000, status: 'Used', condition: selected.headsetStatus || 'New Use', vendorSubmissionId: selected.id, updatedBy: user?.name }) });
      }
      setIsReviewOpen(false); toast('success', reviewAction === 'Approved' ? 'Disetujui, headset Used' : 'Ditolak');
      fetchTransactions(); fetchPendingSubmissions();
    } catch (err: any) { toast('error', err.message || 'Gagal'); }
    setSaving(false);
  };

  const handleReturn = async () => {
    setSaving(true);
    try {
      const res = await apiFetch('/api/transactions/items', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: returnTarget.id, status: 'Return', returnCondition, returnPrice: returnPrice ? parseFloat(returnPrice) : null, returnNote: returnNote || null, updatedBy: user?.name }) });
      if (res.ok) { toast('success', 'Headset returned'); setIsReturnOpen(false); fetchTransactions(); }
      else { const r = await res.json(); toast('error', r.error || 'Gagal'); }
    } catch { toast('error', 'Gagal'); }
    setSaving(false);
  };

  if (!canAccess('transaction_item')) {
    return (<div className="p-8 bg-white rounded-2xl border border-slate-200 text-center"><ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" /><h3 className="text-base font-bold text-slate-800">Akses Ditolak</h3><p className="text-xs text-slate-500 mt-1">Role {role} tidak punya akses.</p></div>);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Headphones className="w-5 h-5 text-indigo-600" /><span>Headset User</span></h1>
        <p className="text-xs text-slate-500 mt-0.5">Pengajuan dari vendor → Staff approve/reject → Approve dengan nilai deposit</p>
      </div>

      {submissions.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <h3 className="text-sm font-bold text-amber-800 mb-3">Pengajuan Vendor Pending ({submissions.length})</h3>
          <div className="space-y-2">
            {submissions.map((sub) => (
              <div key={sub.id} className="bg-white rounded-xl border border-amber-100 p-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800">{sub.title}</div>
                  <div className="text-[11px] text-slate-500">{sub.vendorName} | NIK: {sub.nik} | {sub.karyawanName} | Project: {sub.project}</div>
                </div>
                <button onClick={() => { setSelected(sub); setReviewAction('Approved'); setDepositValue('100000'); setIsReviewOpen(true); }} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg">Review</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex gap-1.5 flex-wrap">
          {['', 'Pending', 'Used', 'Reject', 'Return'].map((s) => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{s || 'Semua'}</button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); fetchTransactions(); }} className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari..." className="w-full pl-9 pr-4 py-2 bg-slate-50 border rounded-xl text-xs" />
        </form>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead><tr className="bg-slate-50 border-b text-slate-400 uppercase text-[10px]"><th className="py-2 px-3">ID</th><th className="py-2 px-3">Tgl</th><th className="py-2 px-3">NIK</th><th className="py-2 px-3">Nama</th><th className="py-2 px-3">Project</th><th className="py-2 px-3">Vendor</th><th className="py-2 px-3">Deposit</th><th className="py-2 px-3 text-center">Status</th><th className="py-2 px-3 text-center">Aksi</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={9} className="py-8 text-center text-slate-400">Memuat...</td></tr> :
                transactions.length === 0 ? <tr><td colSpan={9} className="py-8 text-center text-slate-400">Tidak ada data.</td></tr> :
                  transactions.map((tx) => {
                    const sc: Record<string, string> = { Used: 'bg-amber-50 text-amber-700', Return: 'bg-emerald-50 text-emerald-700', Reject: 'bg-rose-50 text-rose-700', Pending: 'bg-slate-100 text-slate-600' };
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/80">
                        <td className="py-2 px-3 text-slate-400 font-mono">#{tx.id}</td>
                        <td className="py-2 px-3 text-slate-500 whitespace-nowrap">{tx.date}</td>
                        <td className="py-2 px-3 font-mono text-indigo-600">{tx.nik}</td>
                        <td className="py-2 px-3 font-semibold">{tx.name}</td>
                        <td className="py-2 px-3">{tx.project}</td>
                        <td className="py-2 px-3 text-slate-600">{tx.vendor}</td>
                        <td className="py-2 px-3">Rp {tx.deposit?.toLocaleString('id-ID')}</td>
                        <td className="py-2 px-3 text-center"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sc[tx.status] || 'bg-slate-100'}`}>{tx.status}</span></td>
                        <td className="py-2 px-3 text-center">
                          {tx.status === 'Used' && (
                            <button onClick={() => { setReturnTarget(tx); setReturnCondition('Good Condition'); setReturnPrice(''); setReturnNote(''); setIsReturnOpen(true); }} className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-[10px] border border-emerald-200 flex items-center gap-1"><RotateCcw className="w-3 h-3" />Return</button>
                          )}
                          {tx.status !== 'Used' && tx.status !== 'Return' && (
                            <button onClick={() => { if (confirm('Aktifkan kembali?')) { apiFetch('/api/transactions/items', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: tx.id, status: 'Used', updatedBy: user?.name }) }).then(() => fetchTransactions()); } }} className="px-2 py-1 bg-amber-50 text-amber-700 rounded text-[10px] border border-amber-200">Aktifkan</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
        <div className="p-3 bg-slate-50 border-t flex items-center justify-between text-xs">
          <span>Total: {pagination.total}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="p-1.5 rounded-lg border bg-white disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
            <span className="font-semibold py-1.5">{page} / {pagination.totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={page >= pagination.totalPages} className="p-1.5 rounded-lg border bg-white disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {isReviewOpen && selected && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="text-sm font-bold mb-4">Review Pengajuan {selected.submissionCode}</h3>
            <div className="p-3 bg-slate-50 rounded-xl mb-4 text-xs">
              <div className="font-bold text-slate-800">{selected.title}</div>
              <div className="text-slate-600 mt-2 font-semibold">Vendor: {selected.vendorName}</div>
              <div className="text-slate-500 mt-1">NIK: {selected.nik || '-'}</div>
              <div className="text-slate-500">Nama Karyawan: {selected.karyawanName || '-'}</div>
              <div className="text-slate-500">Project: {selected.project || '-'}</div>
              <div className="text-slate-500">Estimasi: Rp {selected.proposedPrice?.toLocaleString('id-ID')}</div>
            </div>
            <form onSubmit={handleReview} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Keputusan</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setReviewAction('Approved')} className={`flex-1 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1 ${reviewAction === 'Approved' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200'}`}><CheckCircle className="w-4 h-4" />Approve</button>
                  <button type="button" onClick={() => setReviewAction('Reject')} className={`flex-1 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1 ${reviewAction === 'Reject' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-slate-50 border-slate-200'}`}><XCircle className="w-4 h-4" />Reject</button>
                </div>
              </div>
              {reviewAction === 'Approved' && (
                <div><label className="block font-semibold mb-1">Nilai Deposit (Rp)</label><input type="number" value={depositValue} onChange={(e) => setDepositValue(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border rounded-xl" /></div>
              )}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <button type="button" onClick={() => setIsReviewOpen(false)} className="px-4 py-2 border rounded-xl">Batal</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold disabled:opacity-50">{saving ? 'Memproses...' : reviewAction === 'Approved' ? 'Approve & Buat Used' : 'Reject'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {isReturnOpen && returnTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="text-sm font-bold mb-4">Return Headset - {returnTarget.name}</h3>
            <div className="p-3 bg-slate-50 rounded-xl mb-4 text-xs">
              <div className="font-semibold">{returnTarget.vendor} | {returnTarget.nik}</div>
              <div className="text-slate-500">Project: {returnTarget.project}</div>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Kondisi Headset</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setReturnCondition('Good Condition')} className={`flex-1 py-2 rounded-xl border text-xs font-semibold ${returnCondition === 'Good Condition' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200'}`}>Good Condition</button>
                  <button type="button" onClick={() => setReturnCondition('Damaged/Missing')} className={`flex-1 py-2 rounded-xl border text-xs font-semibold ${returnCondition === 'Damaged/Missing' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-slate-50 border-slate-200'}`}>Damaged/Missing</button>
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Harga Headset (opsional)</label>
                <input type="number" value={returnPrice} onChange={(e) => setReturnPrice(e.target.value)} placeholder="Contoh: 150000" className="w-full px-3 py-2 bg-slate-50 border rounded-xl" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Note (opsional)</label>
                <textarea rows={2} value={returnNote} onChange={(e) => setReturnNote(e.target.value)} placeholder="Catatan return..." className="w-full px-3 py-2 bg-slate-50 border rounded-xl"></textarea>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <button type="button" onClick={() => setIsReturnOpen(false)} className="px-4 py-2 border rounded-xl">Batal</button>
                <button onClick={handleReturn} disabled={saving} className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold disabled:opacity-50">{saving ? 'Memproses...' : 'Submit Return'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
