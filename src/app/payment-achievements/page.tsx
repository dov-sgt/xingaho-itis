'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { CreditCard, Plus, X, ShieldAlert, CheckCircle2, XCircle } from 'lucide-react';

export default function PaymentAchievementsPage() {
  const { can, role, canAccess, user, apiFetch } = useAuth();
  const { toast } = useToast();
  const [achievements, setAchievements] = useState<any[]>([]);
  const [nasabah, setNasabah] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ agenName: '', nasabahId: '', nasabahName: '', amount: '', paymentMethod: '' });
  const [errorMsg, setErrorMsg] = useState('');

  const fetchAchievements = () => {
    setLoading(true);
    apiFetch('/api/payment-achievements').then((res) => { if (!res.ok) throw new Error('Gagal'); return res.json(); })
      .then((data) => { setAchievements(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { toast('error', 'Gagal memuat'); setLoading(false); });
  };

  const fetchNasabah = () => {
    apiFetch('/api/nasabah').then((res) => { if (!res.ok) throw new Error('Gagal'); return res.json(); })
      .then((data) => setNasabah(Array.isArray(data) ? data : []))
      .catch(() => {});
  };

  useEffect(() => { fetchAchievements(); fetchNasabah(); }, []);

  const handleOpenAdd = () => { setFormData({ agenName: user?.name || '', nasabahId: '', nasabahName: '', amount: '', paymentMethod: '' }); setErrorMsg(''); setIsModalOpen(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setErrorMsg(''); setSaving(true);
    try {
      const res = await apiFetch('/api/payment-achievements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      const result = await res.json();
      if (!res.ok) { setErrorMsg(result.error); setSaving(false); return; }
      setIsModalOpen(false); toast('success', 'Payment achievement dicatat'); fetchAchievements();
    } catch (err: any) { setErrorMsg(err.message); }
    setSaving(false);
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      const res = await apiFetch('/api/payment-achievements', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status, notedBy: user?.name }) });
      if (res.ok) { toast('success', 'Status diperbarui'); fetchAchievements(); } else toast('error', 'Gagal');
    } catch { toast('error', 'Gagal'); }
  };

  if (!canAccess('transaction_item')) {
    return (<div className="p-8 bg-white rounded-2xl border border-slate-200 text-center"><ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" /><h3 className="text-base font-bold text-slate-800">Akses Ditolak</h3></div>);
  }

  const canApprove = ['MANAGER_OPS', 'SPV_OPS', 'SUPERADMIN'].includes(role);
  const statusColors: Record<string, string> = { Pending: 'bg-amber-50 text-amber-700', Confirmed: 'bg-emerald-50 text-emerald-700', Rejected: 'bg-rose-50 text-rose-700' };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2"><CreditCard className="w-5 h-5 text-emerald-600" />Payment Achievement</h1>
          <p className="text-xs text-slate-500 mt-0.5">Pencapaian payment oleh agen</p>
        </div>
        {can('transaction_item', 'create') && <button onClick={handleOpenAdd} className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"><Plus className="w-4 h-4" />Catat Payment</button>}
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead><tr className="bg-slate-50 border-b text-slate-400 uppercase text-[10px]"><th className="py-2 px-3">Tgl</th><th className="py-2 px-3">Agen</th><th className="py-2 px-3">Nasabah</th><th className="py-2 px-3">Jumlah</th><th className="py-2 px-3">Method</th><th className="py-2 px-3 text-center">Status</th><th className="py-2 px-3 text-center">Aksi</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={7} className="py-8 text-center text-slate-400">Memuat...</td></tr> :
                achievements.length === 0 ? <tr><td colSpan={7} className="py-8 text-center text-slate-400">Tidak ada data.</td></tr> :
                  achievements.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/80">
                      <td className="py-2 px-3 text-slate-500">{new Date(a.date).toLocaleDateString('id-ID')}</td>
                      <td className="py-2 px-3 font-semibold">{a.agenName}</td>
                      <td className="py-2 px-3">{a.nasabahName}</td>
                      <td className="py-2 px-3 font-bold">Rp {a.amount?.toLocaleString('id-ID')}</td>
                      <td className="py-2 px-3">{a.paymentMethod || '-'}</td>
                      <td className="py-2 px-3 text-center"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColors[a.status] || 'bg-slate-100'}`}>{a.status}</span></td>
                      <td className="py-2 px-3 text-center">
                        {a.status === 'Pending' && canApprove && (
                          <div className="flex gap-1 justify-center">
                            <button onClick={() => handleStatusChange(a.id, 'Confirmed')} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><CheckCircle2 className="w-4 h-4" /></button>
                            <button onClick={() => handleStatusChange(a.id, 'Rejected')} className="p-1 text-rose-600 hover:bg-rose-50 rounded"><XCircle className="w-4 h-4" /></button>
                          </div>
                        )}
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
            <div className="flex justify-between mb-4 pb-3 border-b"><h3 className="text-sm font-bold">Catat Payment Achievement</h3><button onClick={() => setIsModalOpen(false)}><X className="w-4 h-4" /></button></div>
            {errorMsg && <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-xs">{errorMsg}</div>}
            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div><label className="block font-semibold mb-1">Nama Agen</label><input type="text" required value={formData.agenName} onChange={(e) => setFormData({ ...formData, agenName: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl" /></div>
              <div><label className="block font-semibold mb-1">Nasabah</label><select value={formData.nasabahId} onChange={(e) => { const nas = nasabah.find((n) => n.id === Number(e.target.value)); setFormData({ ...formData, nasabahId: e.target.value, nasabahName: nas?.nama || '' }); }} className="w-full px-3 py-2 bg-slate-50 border rounded-xl"><option value="">-- Pilih Nasabah --</option>{nasabah.map((n) => <option key={n.id} value={n.id}>{n.nama} ({n.nasabahCode})</option>)}</select></div>
              <div><label className="block font-semibold mb-1">Jumlah (Rp)</label><input type="number" required value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl" /></div>
              <div><label className="block font-semibold mb-1">Payment Method</label><select value={formData.paymentMethod} onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl"><option value="">-- Pilih --</option><option>Cash</option><option>Transfer</option><option>VA</option><option>QRIS</option><option>Lainnya</option></select></div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-xl">Batal</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold disabled:opacity-50">{saving ? 'Menyimpan...' : 'Simpan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
