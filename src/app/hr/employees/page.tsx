'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { Briefcase, Plus, Edit, Trash2, X, ShieldAlert } from 'lucide-react';

export default function EmployeesPage() {
  const { can, role, canAccess, apiFetch } = useAuth();
  const { toast } = useToast();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [formData, setFormData] = useState({ nik: '', name: '', department: '', position: '', joinDate: '', phone: '', email: '' });
  const [errorMsg, setErrorMsg] = useState('');

  const fetchEmployees = () => {
    setLoading(true);
    apiFetch('/api/employees').then((res) => { if (!res.ok) throw new Error('Gagal'); return res.json(); })
      .then((data) => { setEmployees(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { toast('error', 'Gagal memuat'); setLoading(false); });
  };

  useEffect(() => { fetchEmployees(); }, []);

  const handleOpenAdd = () => { setEditing(null); setFormData({ nik: '', name: '', department: '', position: '', joinDate: '', phone: '', email: '' }); setErrorMsg(''); setIsModalOpen(true); };
  const handleOpenEdit = (e: any) => { setEditing(e); setFormData({ nik: e.nik, name: e.name, department: e.department, position: e.position, joinDate: e.joinDate ? new Date(e.joinDate).toISOString().split('T')[0] : '', phone: e.phone || '', email: e.email || '' }); setErrorMsg(''); setIsModalOpen(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setErrorMsg(''); setSaving(true);
    try {
      const res = await apiFetch('/api/employees', { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing ? { id: editing.id, ...formData } : formData) });
      const result = await res.json();
      if (!res.ok) { setErrorMsg(result.error); setSaving(false); return; }
      setIsModalOpen(false); toast('success', editing ? 'Diperbarui' : 'Employee ditambahkan'); fetchEmployees();
    } catch (err: any) { setErrorMsg(err.message); }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus employee ini?')) return;
    try {
      const res = await apiFetch(`/api/employees?id=${id}`, { method: 'DELETE' });
      if (res.ok) { toast('success', 'Dihapus'); fetchEmployees(); } else toast('error', 'Gagal');
    } catch { toast('error', 'Gagal'); }
  };

  if (!canAccess('user_management')) {
    return (<div className="p-8 bg-white rounded-2xl border border-slate-200 text-center"><ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" /><h3 className="text-base font-bold text-slate-800">Akses Ditolak</h3></div>);
  }

  const statusColors: Record<string, string> = { Active: 'bg-emerald-50 text-emerald-700', Inactive: 'bg-slate-100 text-slate-600', Resign: 'bg-rose-50 text-rose-700' };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold flex items-center gap-2"><Briefcase className="w-5 h-5 text-indigo-600" />Employee Data</h1>
        {can('user_management', 'create') && <button onClick={handleOpenAdd} className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"><Plus className="w-4 h-4" />Tambah</button>}
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead><tr className="bg-slate-50 border-b text-slate-400 uppercase text-[10px]"><th className="py-2 px-3">Code</th><th className="py-2 px-3">NIK</th><th className="py-2 px-3">Nama</th><th className="py-2 px-3">Department</th><th className="py-2 px-3">Position</th><th className="py-2 px-3">Join Date</th><th className="py-2 px-3 text-center">Status</th><th className="py-2 px-3 text-center">Aksi</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={8} className="py-8 text-center text-slate-400">Memuat...</td></tr> :
                employees.length === 0 ? <tr><td colSpan={8} className="py-8 text-center text-slate-400">Tidak ada data.</td></tr> :
                  employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/80">
                      <td className="py-2 px-3 font-mono font-bold text-indigo-600">{emp.employeeCode}</td>
                      <td className="py-2 px-3 font-mono">{emp.nik}</td>
                      <td className="py-2 px-3 font-semibold">{emp.name}</td>
                      <td className="py-2 px-3">{emp.department}</td>
                      <td className="py-2 px-3">{emp.position}</td>
                      <td className="py-2 px-3">{new Date(emp.joinDate).toLocaleDateString('id-ID')}</td>
                      <td className="py-2 px-3 text-center"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColors[emp.status] || 'bg-slate-100'}`}>{emp.status}</span></td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex gap-1.5 justify-center">
                          {can('user_management', 'update') && <button onClick={() => handleOpenEdit(emp)} className="p-1 hover:bg-indigo-50 rounded"><Edit className="w-3 h-3" /></button>}
                          {can('user_management', 'delete') && <button onClick={() => handleDelete(emp.id)} className="p-1 hover:bg-rose-50 rounded"><Trash2 className="w-3 h-3" /></button>}
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
            <div className="flex justify-between mb-4 pb-3 border-b"><h3 className="text-sm font-bold">{editing ? 'Ubah Employee' : 'Tambah Employee'}</h3><button onClick={() => setIsModalOpen(false)}><X className="w-4 h-4" /></button></div>
            {errorMsg && <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-xs">{errorMsg}</div>}
            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div><label className="block font-semibold mb-1">NIK</label><input type="text" required value={formData.nik} onChange={(e) => setFormData({ ...formData, nik: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl" /></div>
              <div><label className="block font-semibold mb-1">Nama</label><input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="block font-semibold mb-1">Department</label><input type="text" required value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl" /></div>
                <div><label className="block font-semibold mb-1">Position</label><input type="text" required value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl" /></div>
              </div>
              <div><label className="block font-semibold mb-1">Join Date</label><input type="date" required value={formData.joinDate} onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="block font-semibold mb-1">Phone</label><input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl" /></div>
                <div><label className="block font-semibold mb-1">Email</label><input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl" /></div>
              </div>
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
