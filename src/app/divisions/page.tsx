'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { Plus, Edit, Trash2, X, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Division {
  id: number;
  code: string;
  name: string;
  createdAt: string;
}

export default function DivisionsPage() {
  const { can, role, canAccess, apiFetch } = useAuth();
  const { toast } = useToast();
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDivision, setEditingDivision] = useState<Division | null>(null);
  const [formData, setFormData] = useState({ code: '', name: '' });
  const [errorMsg, setErrorMsg] = useState('');

  const fetchDivisions = () => {
    setLoading(true);
    apiFetch('/api/divisions')
      .then((res) => {
        if (!res.ok) throw new Error('Gagal memuat divisions');
        return res.json();
      })
      .then((data) => {
        setDivisions(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        toast('error', 'Gagal memuat data division');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDivisions();
  }, []);

  const handleOpenAdd = () => {
    setEditingDivision(null);
    setFormData({ code: '', name: '' });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (d: Division) => {
    setEditingDivision(d);
    setFormData({ code: d.code, name: d.name });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSaving(true);
    try {
      const url = '/api/divisions';
      const method = editingDivision ? 'PUT' : 'POST';
      const payload = editingDivision ? { id: editingDivision.id, ...formData } : formData;

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) {
        setErrorMsg(result.error || 'Gagal menyimpan division');
        setSaving(false);
        return;
      }

      setIsModalOpen(false);
      toast('success', editingDivision ? 'Division diperbarui' : 'Division ditambahkan');
      fetchDivisions();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus division ini?')) return;
    try {
      const res = await apiFetch(`/api/divisions?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast('success', 'Division dihapus');
        fetchDivisions();
      } else {
        const r = await res.json();
        toast('error', r.error || 'Gagal menghapus division');
      }
    } catch (err) {
      toast('error', 'Gagal menghapus division');
    }
  };

  if (!canAccess('user_management')) {
    return (
      <div className="p-8 bg-background rounded-xl border border-border text-center">
        <Building2 className="w-12 h-12 text-destructive mx-auto mb-3" />
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
          <h1 className="text-2xl font-bold text-foreground">Division Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola divisi perusahaan (IT, OPS, QC, HR, Finance, Marketing, dll)
          </p>
        </div>
        {can('user_management', 'create') && (
          <Button onClick={handleOpenAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah Division
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Daftar Division</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 px-3 font-medium text-muted-foreground">ID</th>
                  <th className="py-2 px-3 font-medium text-muted-foreground">Kode</th>
                  <th className="py-2 px-3 font-medium text-muted-foreground">Nama Division</th>
                  <th className="py-2 px-3 font-medium text-muted-foreground">Created</th>
                  <th className="py-2 px-3 font-medium text-muted-foreground text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      Memuat...
                    </td>
                  </tr>
                ) : divisions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      Tidak ada division.
                    </td>
                  </tr>
                ) : (
                  divisions.map((d) => (
                    <tr key={d.id} className="hover:bg-muted/50">
                      <td className="py-2 px-3 font-mono text-foreground">{d.id}</td>
                      <td className="py-2 px-3 font-mono font-semibold text-foreground">{d.code}</td>
                      <td className="py-2 px-3 text-foreground">{d.name}</td>
                      <td className="py-2 px-3 text-muted-foreground">
                        {new Date(d.createdAt).toLocaleDateString('id-ID')}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex gap-1.5 justify-center">
                          {can('user_management', 'update') && (
                            <button
                              onClick={() => handleOpenEdit(d)}
                              className="p-1 hover:bg-accent rounded"
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                          )}
                          {can('user_management', 'delete') && (
                            <button
                              onClick={() => handleDelete(d.id)}
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
          <div className="relative z-50 w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
            <div className="flex justify-between mb-4 pb-3 border-b border-border">
              <h3 className="text-sm font-bold text-foreground">
                {editingDivision ? 'Ubah Division' : 'Tambah Division'}
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
                <Label htmlFor="code">Kode Division</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="Contoh: IT, OPS, QC, HR"
                />
              </div>
              <div>
                <Label htmlFor="name">Nama Division</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: IT Division"
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
