'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { Shield, Plus, Edit, Trash2, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

const ALL_FEATURES = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'master_item', label: 'Master Item' },
  { key: 'master_vendor', label: 'Master Vendor' },
  { key: 'inventory_type_item', label: 'Inventory & Stok' },
  { key: 'transaction_headset', label: 'Transaction Headset' },
  { key: 'transaction_stockout', label: 'Stock Out' },
  { key: 'purchase_request', label: 'Purchase Request' },
  { key: 'delivery_order', label: 'Delivery Order' },
  { key: 'vendor_submission', label: 'Vendor Submission' },
  { key: 'booking', label: 'Booking Asset' },
  { key: 'servis_asset', label: 'Servis Asset' },
  { key: 'log_ruang_server', label: 'Log Ruang Server' },
  { key: 'recording_review', label: 'Recording Review' },
  { key: 'finding', label: 'Finding' },
  { key: 'user_management', label: 'User Management' },
  { key: 'reporting', label: 'Reporting' },
];

const ACTIONS = ['create', 'read', 'update', 'delete'] as const;

interface Role {
  id: number;
  code: string;
  name: string;
  description: string | null;
  permissions: Record<string, string[]>;
}

export default function RolesPage() {
  const { can, role, canAccess, apiFetch } = useAuth();
  const { toast } = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    permissions: {} as Record<string, string[]>,
  });
  const [errorMsg, setErrorMsg] = useState('');

  const fetchRoles = () => {
    setLoading(true);
    apiFetch('/api/roles')
      .then((res) => {
        if (!res.ok) throw new Error('Gagal memuat roles');
        return res.json();
      })
      .then((data) => {
        setRoles(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        toast('error', 'Gagal memuat data role');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleOpenAdd = () => {
    setEditingRole(null);
    setFormData({ code: '', name: '', description: '', permissions: {} });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (r: Role) => {
    setEditingRole(r);
    setFormData({
      code: r.code,
      name: r.name,
      description: r.description || '',
      permissions: { ...r.permissions },
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleTogglePermission = (feature: string, action: string) => {
    setFormData((prev) => {
      const current = prev.permissions[feature] || [];
      const updated = current.includes(action)
        ? current.filter((a) => a !== action)
        : [...current, action];
      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          [feature]: updated,
        },
      };
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSaving(true);
    try {
      const url = '/api/roles';
      const method = editingRole ? 'PUT' : 'POST';
      const payload = editingRole
        ? { id: editingRole.id, ...formData }
        : formData;

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) {
        setErrorMsg(result.error || 'Gagal menyimpan role');
        setSaving(false);
        return;
      }

      setIsModalOpen(false);
      toast('success', editingRole ? 'Role diperbarui' : 'Role ditambahkan');
      fetchRoles();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus role ini?')) return;
    try {
      const res = await apiFetch(`/api/roles?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast('success', 'Role dihapus');
        fetchRoles();
      } else {
        const r = await res.json();
        toast('error', r.error || 'Gagal menghapus role');
      }
    } catch (err) {
      toast('error', 'Gagal menghapus role');
    }
  };

  if (!canAccess('user_management')) {
    return (
      <div className="p-8 bg-background rounded-xl border border-border text-center">
        <Shield className="w-12 h-12 text-destructive mx-auto mb-3" />
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
          <h1 className="text-2xl font-bold text-foreground">Role Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola role dan permission per menu
          </p>
        </div>
        {can('user_management', 'create') && (
          <Button onClick={handleOpenAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah Role
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Daftar Role</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 px-3 font-medium text-muted-foreground">Kode</th>
                  <th className="py-2 px-3 font-medium text-muted-foreground">Nama</th>
                  <th className="py-2 px-3 font-medium text-muted-foreground">Deskripsi</th>
                  <th className="py-2 px-3 font-medium text-muted-foreground text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-muted-foreground">
                      Memuat...
                    </td>
                  </tr>
                ) : roles.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-muted-foreground">
                      Tidak ada role.
                    </td>
                  </tr>
                ) : (
                  roles.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/50">
                      <td className="py-2 px-3 font-mono font-semibold text-foreground">{r.code}</td>
                      <td className="py-2 px-3 text-foreground">{r.name}</td>
                      <td className="py-2 px-3 text-muted-foreground">{r.description || '-'}</td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex gap-1 justify-center">
                          {can('user_management', 'update') && (
                            <button
                              onClick={() => handleOpenEdit(r)}
                              className="p-1 hover:bg-accent rounded"
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                          )}
                          {can('user_management', 'delete') && (
                            <button
                              onClick={() => handleDelete(r.id)}
                              className="p-1 hover:bg-destructive/10 rounded"
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
          <div className="relative z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border bg-background p-6 shadow-lg">
            <div className="flex justify-between mb-4 pb-3 border-b border-border">
              <h3 className="text-sm font-bold text-foreground">
                {editingRole ? 'Ubah Role' : 'Tambah Role'}
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

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="code">Kode Role</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="Contoh: IT_MANAGER"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Nama Role</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: IT Manager"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Deskripsi</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Deskripsi role..."
                />
              </div>

              <div className="space-y-2">
                <Label>Permission per Menu</Label>
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-muted border-b border-border">
                        <th className="py-2 px-3 font-medium text-muted-foreground">Menu</th>
                        {ACTIONS.map((action) => (
                          <th key={action} className="py-2 px-3 font-medium text-muted-foreground text-center">
                            {action.charAt(0).toUpperCase() + action.slice(1)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {ALL_FEATURES.map((feature) => (
                        <tr key={feature.key} className="hover:bg-muted/50">
                          <td className="py-2 px-3 text-foreground">{feature.label}</td>
                          {ACTIONS.map((action) => (
                            <td key={action} className="py-2 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={(formData.permissions[feature.key] || []).includes(action)}
                                onChange={() => handleTogglePermission(feature.key, action)}
                                className="rounded border-input"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
