'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { CalendarOff, Plus, X, ShieldAlert, CheckCircle2, XCircle } from 'lucide-react';

export default function LeaveRequestsPage() {
  const { can, role, canAccess, user, apiFetch } = useAuth();
  const { toast } = useToast();
  const [leaves, setLeaves] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ employeeId: '', leaveType: 'Annual', startDate: '', endDate: '', reason: '' });
  const [errorMsg, setErrorMsg] = useState('');

  const fetchLeaves = () => {
    setLoading(true);
    apiFetch('/api/leave-requests').then((res) => { if (!res.ok) throw new Error('Gagal'); return res.json(); })
      .then((data) => { setLeaves(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { toast('error', 'Gagal memuat'); setLoading(false); });
  };

  const fetchEmployees = () => {
    apiFetch('/api/employees').then((res) => { if (!res.ok) throw new Error('Gagal'); return res.json(); })
      .then((data) => setEmployees(Array.isArray(data) ? data : []))
      .catch(() => {});
  };

  useEffect(() => { fetchLeaves(); fetchEmployees(); }, []);

  const handleOpenAdd = () => { setFormData({ employeeId: '', leaveType: 'Annual', startDate: '', endDate: '', reason: '' }); setErrorMsg(''); setIsModalOpen(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setErrorMsg(''); setSaving(true);
    try {
      const res = await apiFetch('/api/leave-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      const result = await res.json();
      if (!res.ok) { setErrorMsg(result.error); setSaving(false); return; }
      setIsModalOpen(false); toast('success', 'Leave request dibuat'); fetchLeaves();
    } catch (err: any) { setErrorMsg(err.message); }
    setSaving(false);
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      const res = await apiFetch('/api/leave-requests', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status, approvedBy: user?.name }) });
      if (res.ok) { toast('success', 'Status diperbarui'); fetchLeaves(); } else toast('error', 'Gagal');
    } catch { toast('error', 'Gagal'); }
  };

  if (!canAccess('user_management')) {
    return (<div className="p-8 bg-white rounded-2xl border border-slate-200 text-center"><ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" /><h3 className="text-base font-bold text-slate-800">Akses Ditolak</h3></div>);
  }

  const canApprove = ['SPV_HR', 'SUPERADMIN'].includes(role);
  const statusColors: Record<string, string> = { Pending: 'bg-amber-50 text-amber-700', Approved: 'bg-emerald-50 text-emerald-700', Rejected: 'bg-rose-50 text-rose-700' };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold flex items-center gap-2"><CalendarOff className="w-5 h-5 text-indigo-600" />Leave Request</h1>
        {can('user_management', 'create') && <button onClick={handleOpenAdd} className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"><Plus className="w-4 h-4" />Buat Request</button>}
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead><tr className="bg-slate-50 border-b text-slate-400 uppercase text-[10px]"><th className="py-2 px-3">Code</th><th className="py-2 px-3">Employee</th><th className="py-2 px-3">Tipe</th><th className="py-2 px-3">Dari</th><th className="py-2 px-3">Sampai</th><th className="py-2 px-3">Alasan</th><th className="py-2 px-3 text-center">Status</th><th className="py-2 px-3 text-center">Aksi</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={8} className="py-8 text-center text-slate-400">Memuat...</td></tr> :
                leaves.length === 0 ? <tr><td colSpan={8} className="py-8 text-center text-slate-400">Tidak ada data.</td></tr> :
                  leaves.map((l) => {
                    const emp = employees.find((e) => e.id === l.employeeId);
                    return (
                      <tr key={l.id} className="hover:bg-slate-50/80">
                        <td className="py-2 px-3 font-mono font-bold text-indigo-600">{l.requestCode}</td>
                        <td className="py-2 px-3 font-semibold">{emp?.name || '-'}</td>
                        <td className="py-2 px-3">{l.leaveType}</td>
                        <td className="py-2 px-3">{new Date(l.startDate).toLocaleDateString('id-ID')}</td>
                        <td className="py-2 px-3">{new Date(l.endDate).toLocaleDateString('id-ID')}</td>
                        <td className="py-2 px-3 text-slate-600 max-w-xs truncate">{l.reason}</td>
                        <td className="py-2 px-3 text-center"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColors[l.status] || 'bg-slate-100'}`}>{l.status}</span></td>
                        <td className="py-2 px-3 text-center">
                          {l.status === 'Pending' && canApprove && (
                            <div className="flex gap-1 justify-center">
                              <button onClick={() => handleStatusChange(l.id, 'Approved')} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><CheckCircle2 className="w-4 h-4" /></button>
                              <button onClick={() => handleStatusChange(l.id, 'Rejected')} className="p-1 text-rose-600 hover:bg-rose-50 rounded"><XCircle className="w-4 h-4" /></button>
                            </div>
                          )}
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
            <div className="flex justify-between mb-4 pb-3 border-b"><h3 className="text-sm font-bold">Buat Leave Request</h3><button onClick={() => setIsModalOpen(false)}><X className="w-4 h-4" /></button></div>
            {errorMsg && <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-xs">{errorMsg}</div>}
            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div><label className="block font-semibold mb-1">Employee</label><select required value={formData.employeeId} onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl"><option value="">-- Pilih Employee --</option>{employees.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.employeeCode})</option>)}</select></div>
              <div><label className="block font-semibold mb-1">Tipe Cuti</label><select value={formData.leaveType} onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl"><option>Annual</option><option>Sick</option><option>Personal</option><option>Other</option></select></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="block font-semibold mb-1">Dari Tanggal</label><input type="date" required value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl" /></div>
                <div><label className="block font-semibold mb-1">Sampai Tanggal</label><input type="date" required value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl" /></div>
              </div>
              <div><label className="block font-semibold mb-1">Alasan</label><textarea rows={2} required value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl"></textarea></div>
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
