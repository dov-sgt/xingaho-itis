'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { Role } from '@/lib/rbac';
import { Users, Plus, Edit, Trash2, X, ShieldAlert } from 'lucide-react';

const DIVISIONS = ['IT', 'OPS', 'QC', 'HR'];

export default function UsersPage() {
  const { can, role, canAccess, apiFetch } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [formData, setFormData] = useState({ username: '', name: '', password: '', role: 'LEADER_OPS' as Role, division: 'IT' });
  const [errorMsg, setErrorMsg] = useState('');

  const fetchUsers = () => {
    setLoading(true);
    apiFetch('/api/users').then((res) => { if (!res.ok) throw new Error('Gagal'); return res.json(); })
      .then((data) => { setUsers(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { toast('error', 'Gagal memuat users'); setLoading(false); });
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setErrorMsg(''); setSaving(true);
    try {
      // SPV cannot create SPV or SuperAdmin
      if ((role === 'SPV_OPS' || role === 'SPV_QC' || role === 'SPV_HR') && ['SPV_OPS', 'SPV_QC', 'SPV_HR', 'SUPERADMIN'].includes(formData.role)) {
        setErrorMsg('SPV tidak dapat membuat user SPV atau SuperAdmin');
        setSaving(false);
        return;
      }
      const res = await apiFetch('/api/users', { method: editingUser ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editingUser ? { id: editingUser.id, ...formData } : formData) });
      const result = await res.json();
      if (!res.ok) { setErrorMsg(result.error); setSaving(false); return; }
      setIsModalOpen(false); toast('success', editingUser ? 'User diperbarui' : 'User ditambahkan'); fetchUsers();
    } catch (err: any) { setErrorMsg(err.message); }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus user ini?')) return;
    try {
      const res = await apiFetch(`/api/users?id=${id}`, { method: 'DELETE' });
      if (res.ok) { toast('success', 'User dihapus'); fetchUsers(); }
      else { const r = await res.json(); toast('error', r.error || 'Gagal'); }
    } catch { toast('error', 'Gagal'); }
  };

  if (!canAccess('user_management')) {
    return (<div className="p-8 bg-white rounded-2xl border border-slate-200 text-center"><ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" /><h3 className="text-base font-bold text-slate-800">Akses Ditolak</h3></div>);
  }

  const roleColors: Record<string, string> = { SUPERADMIN: 'bg-rose-50 text-rose-700', MANAGER_OPS: 'bg-amber-50 text-amber-700', SPV_OPS: 'bg-amber-50 text-amber-700', LEADER_OPS: 'bg-blue-50 text-blue-700', AGEN: 'bg-emerald-50 text-emerald-700', SPV_QC: 'bg-purple-50 text-purple-700', STAFF_QC: 'bg-cyan-50 text-cyan-700', SPV_HR: 'bg-pink-50 text-pink-700', STAFF_HR: 'bg-orange-50 text-orange-700' };

  const availableRoles: Role[] = role === 'SUPERADMIN' ? ['SUPERADMIN', 'MANAGER_OPS', 'SPV_OPS', 'LEADER_OPS', 'AGEN', 'SPV_QC', 'STAFF_QC', 'SPV_HR', 'STAFF_HR'] : role === 'SPV_OPS' ? ['LEADER_OPS', 'AGEN'] : role === 'SPV_QC' ? ['STAFF_QC'] : role === 'SPV_HR' ? ['STAFF_HR'] : ['LEADER_OPS'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold flex items-center gap-2"><Users className="w-5 h-5 text-indigo-600" />User Management</h1>
        {can('user_management', 'create') && <button onClick={() => { setEditingUser(null); setFormData({ username: '', name: '', password: '', role: 'LEADER_OPS', division: 'IT' }); setIsModalOpen(true); }} className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"><Plus className="w-4 h-4" />Tambah</button>}
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <table className="w-full text-left text-[11px]">
          <thead><tr className="bg-slate-50 border-b text-slate-400 uppercase text-[10px]"><th className="py-2 px-3">ID</th><th className="py-2 px-3">Username</th><th className="py-2 px-3">Nama</th><th className="py-2 px-3 text-center">Role</th><th className="py-2 px-3 text-center">Divisi</th><th className="py-2 px-3">Created</th><th className="py-2 px-3 text-center">Aksi</th></tr></thead>
          <tbody className="divide-y">
            {loading ? <tr><td colSpan={7} className="py-8 text-center text-slate-400">Memuat...</td></tr> :
              users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="py-2 px-3 font-mono">{u.id}</td>
                  <td className="py-2 px-3 font-mono font-bold">{u.username}</td>
                  <td className="py-2 px-3">{u.name}</td>
                  <td className="py-2 px-3 text-center"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${roleColors[u.role] || 'bg-slate-100'}`}>{u.role}</span></td>
                  <td className="py-2 px-3 text-center"><span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-semibold">{u.division || '-'}</span></td>
                  <td className="py-2 px-3 text-slate-500">{new Date(u.createdAt).toLocaleDateString('id-ID')}</td>
                  <td className="py-2 px-3 text-center">
                    <div className="flex gap-1.5 justify-center">
                      {can('user_management', 'update') && <button onClick={() => { setEditingUser(u); setFormData({ username: u.username, name: u.name, password: '', role: u.role, division: u.division || 'IT' }); setIsModalOpen(true); }} className="p-1 hover:bg-indigo-50 rounded"><Edit className="w-3 h-3" /></button>}
                      {can('user_management', 'delete') && u.username !== 'superadmin' && <button onClick={() => handleDelete(u.id)} className="p-1 hover:bg-rose-50 rounded"><Trash2 className="w-3 h-3" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <div className="flex justify-between mb-4 pb-3 border-b"><h3 className="text-sm font-bold">{editingUser ? 'Ubah User' : 'Tambah User'}</h3><button onClick={() => setIsModalOpen(false)}><X className="w-4 h-4" /></button></div>
            {errorMsg && <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-xs">{errorMsg}</div>}
            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div><label className="block font-semibold mb-1">Username</label><input type="text" required disabled={!!editingUser} value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl disabled:opacity-50" /></div>
              <div><label className="block font-semibold mb-1">Nama</label><input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl" /></div>
              <div>
                <label className="block font-semibold mb-1">Divisi</label>
                <select value={formData.division} onChange={(e) => setFormData({ ...formData, division: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl">
                  {DIVISIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Role</label>
                <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl">
                  {availableRoles.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div><label className="block font-semibold mb-1">{editingUser ? 'Password baru (kosongkan jika tidak diubah)' : 'Password (min. 6 karakter)'}</label><input type="password" required={!editingUser} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl" /></div>
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
