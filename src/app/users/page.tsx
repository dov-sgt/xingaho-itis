'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { Role } from '@/lib/rbac';
import { Users, Plus, Edit, Trash2, X, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface User {
  id: number;
  username: string;
  name: string;
  roleId: number;
  divisionId: number;
  role: { code: string; name: string };
  division: { code: string; name: string };
  createdAt: string;
}

interface RoleOption {
  id: number;
  code: string;
  name: string;
}

interface DivisionOption {
  id: number;
  code: string;
  name: string;
}

export default function UsersPage() {
  const { can, role, canAccess, apiFetch } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [divisions, setDivisions] = useState<DivisionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    password: '',
    roleId: '',
    divisionId: '',
  });
  const [errorMsg, setErrorMsg] = useState('');

  const fetchUsers = () => {
    setLoading(true);
    apiFetch('/api/users')
      .then((res) => {
        if (!res.ok) throw new Error('Gagal memuat users');
        return res.json();
      })
      .then((data) => {
        setUsers(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        toast('error', 'Gagal memuat data user');
        setLoading(false);
      });
  };

  const fetchRoles = () => {
    apiFetch('/api/roles')
      .then((res) => {
        if (!res.ok) throw new Error('Gagal memuat roles');
        return res.json();
      })
      .then((data) => {
        setRoles(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error(err);
      });
  };

  const fetchDivisions = () => {
    apiFetch('/api/divisions')
      .then((res) => {
        if (!res.ok) throw new Error('Gagal memuat divisions');
        return res.json();
      })
      .then((data) => {
        setDivisions(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error(err);
      });
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
    fetchDivisions();
  }, []);

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormData({ username: '', name: '', password: '', roleId: '', divisionId: '' });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (u: User) => {
    setEditingUser(u);
    setFormData({
      username: u.username,
      name: u.name,
      password: '',
      roleId: String(u.roleId),
      divisionId: String(u.divisionId),
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSaving(true);
    try {
      const url = '/api/users';
      const method = editingUser ? 'PUT' : 'POST';
      const payload = editingUser
        ? { id: editingUser.id, ...formData, roleId: Number(formData.roleId), divisionId: Number(formData.divisionId) }
        : { ...formData, roleId: Number(formData.roleId), divisionId: Number(formData.divisionId) };

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) {
        setErrorMsg(result.error || 'Gagal menyimpan user');
        setSaving(false);
        return;
      }

      setIsModalOpen(false);
      toast('success', editingUser ? 'User diperbarui' : 'User ditambahkan');
      fetchUsers();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus user ini?')) return;
    try {
      const res = await apiFetch(`/api/users?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast('success', 'User dihapus');
        fetchUsers();
      } else {
        const r = await res.json();
        toast('error', r.error || 'Gagal menghapus user');
      }
    } catch (err) {
      toast('error', 'Gagal menghapus user');
    }
  };

  if (!canAccess('user_management')) {
    return (
      <div className="p-8 bg-background rounded-xl border border-border text-center">
        <ShieldAlert className="w-12 h-12 text-destructive mx-auto mb-3" />
        <h3 className="text-base font-bold text-foreground">Akses Ditolak</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Role {role} tidak memiliki akses ke halaman ini.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Kelola user, role, dan divisi</p>
        </div>
        {can('user_management', 'create') && (
          <Button onClick={handleOpenAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah User
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Daftar User</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 px-3 font-medium text-muted-foreground">ID</th>
                  <th className="py-2 px-3 font-medium text-muted-foreground">Username</th>
                  <th className="py-2 px-3 font-medium text-muted-foreground">Nama</th>
                  <th className="py-2 px-3 font-medium text-muted-foreground">Role</th>
                  <th className="py-2 px-3 font-medium text-muted-foreground">Divisi</th>
                  <th className="py-2 px-3 font-medium text-muted-foreground">Created</th>
                  <th className="py-2 px-3 font-medium text-muted-foreground text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      Memuat...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      Tidak ada user.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/50">
                      <td className="py-2 px-3 font-mono text-foreground">{u.id}</td>
                      <td className="py-2 px-3 font-mono font-semibold text-foreground">{u.username}</td>
                      <td className="py-2 px-3 text-foreground">{u.name}</td>
                      <td className="py-2 px-3">
                        <Badge variant="secondary">{u.role.name}</Badge>
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">{u.division.name}</td>
                      <td className="py-2 px-3 text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString('id-ID')}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex gap-1.5 justify-center">
                          {can('user_management', 'update') && (
                            <button
                              onClick={() => handleOpenEdit(u)}
                              className="p-1.5 hover:bg-accent rounded"
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                          )}
                          {can('user_management', 'delete') && (
                            <button
                              onClick={() => handleDelete(u.id)}
                              className="p-1.5 hover:bg-destructive/10 rounded"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsModalOpen(false)} />
          <div className="relative z-50 w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
            <div className="flex justify-between mb-4 pb-3 border-b border-border">
              <h3 className="text-sm font-bold text-foreground">
                {editingUser ? 'Ubah User' : 'Tambah User'}
              </h3>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-2.5 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Contoh: staff_rani"
                />
              </div>
              <div>
                <Label htmlFor="name">Nama Lengkap</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nama lengkap"
                />
              </div>
              <div>
                <Label htmlFor="division">Divisi</Label>
                <select
                  id="division"
                  value={formData.divisionId}
                  onChange={(e) => setFormData({ ...formData, divisionId: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">-- Pilih Divisi --</option>
                  {divisions.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  value={formData.roleId}
                  onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">-- Pilih Role --</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="password">
                  {editingUser ? 'Password baru (kosongkan jika tidak diubah)' : 'Password'}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Min. 6 karakter"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
