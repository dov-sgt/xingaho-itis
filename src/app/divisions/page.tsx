'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { PageHeader, Panel, Field, EmptyState, TableSkeleton } from '@/components/ui/layout';
import { DataTable, Column, CodeBadge, Toolbar, SearchInput } from '@/components/ui/data-display';
import { Modal, ConfirmDialog, SubmitButton } from '@/components/ui/form';
import { Network, Plus, Users, Trash2, Info } from 'lucide-react';

type Division = {
  id: number;
  code: string;
  name: string;
  _count?: { users: number };
};

export default function DivisionsPage() {
  const { can, apiFetch } = useAuth();
  const { toast } = useToast();

  const [rows, setRows] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ code: '', name: '' });
  const [editing, setEditing] = useState<Division | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState<Division | null>(null);

  const canCreate = can('division_management', 'create');
  const canUpdate = can('division_management', 'update');
  const canDelete = can('division_management', 'delete');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/divisions');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal memuat divisi');
      setRows(Array.isArray(json) ? json : []);
    } catch (e: any) {
      toast('error', e.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setForm({ code: '', name: '' });
    setEditing(null);
    setErrors({});
    setFormOpen(true);
  };

  const openEdit = (d: Division) => {
    setForm({ code: d.code, name: d.name });
    setEditing(d);
    setErrors({});
    setFormOpen(true);
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e: Record<string, string> = {};
    if (!editing && !form.code.trim()) e.code = 'Kode divisi wajib diisi.';
    if (!form.name.trim()) e.name = 'Nama divisi wajib diisi.';
    setErrors(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      const payload = editing
        ? { id: editing.id, name: form.name }
        : { code: form.code.trim().toUpperCase().replace(/\s+/g, '_'), name: form.name };
      const res = await apiFetch('/api/divisions', { method: editing ? 'PUT' : 'POST', body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan');
      toast('success', editing ? 'Divisi diperbarui.' : 'Divisi ditambahkan.');
      setFormOpen(false);
      load();
    } catch (err: any) {
      toast('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    try {
      const res = await apiFetch(`/api/divisions?id=${confirmDelete.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menghapus');
      toast('success', 'Divisi dihapus.');
      setConfirmDelete(null);
      load();
    } catch (e: any) {
      toast('error', e.message);
    }
  };

  const columns: Column<Division>[] = [
    { key: 'code', header: 'Kode', cell: (r) => <CodeBadge>{r.code}</CodeBadge> },
    { key: 'name', header: 'Nama Divisi', cell: (r) => <span className="font-semibold text-foreground">{r.name}</span> },
    {
      key: 'users',
      header: 'Pengguna',
      numeric: true,
      cell: (r) => (
        <span className="inline-flex items-center gap-1 font-bold tabular-nums text-foreground">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          {r._count?.users ?? 0}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      className: 'text-right',
      cell: (r) => (
        <div className="flex items-center justify-end gap-1">
          {canUpdate && (
            <button className="xh-btn xh-btn-ghost h-8 px-2 text-[11.5px]" onClick={() => openEdit(r)}>
              Ubah
            </button>
          )}
          {canDelete && (
            <button
              className="xh-btn xh-btn-ghost h-8 w-8 p-0 text-danger"
              title="Hapus divisi"
              onClick={() => setConfirmDelete(r)}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Network}
        title="Division Management"
        description="Kelola daftar divisi organisasi. Setiap pengguna wajib terikat pada satu divisi."
        actions={canCreate && <button className="xh-btn xh-btn-primary" onClick={openCreate}><Plus className="h-4 w-4" />Tambah Divisi</button>}
      />

      <div className="flex items-start gap-2.5 rounded-xl border border-info/25 bg-info-subtle px-3.5 py-2.5 text-[11.5px] leading-relaxed text-info-subtle-foreground">
        <Info className="mt-px h-4 w-4 shrink-0" />
        <p>
          Divisi yang masih memiliki pengguna tidak dapat dihapus. Pindahkan seluruh pengguna ke divisi lain terlebih
          dahulu melalui menu User Management.
        </p>
      </div>

      <Panel padded={false}>
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Cari kode atau nama divisi…" />
        </Toolbar>
        <div className="p-3 sm:p-4">
          {loading ? (
            <TableSkeleton rows={6} cols={4} />
          ) : (
            <DataTable
              columns={columns}
              rows={rows.filter((r) => !search.trim() || r.name.toLowerCase().includes(search.toLowerCase()) || r.code.toLowerCase().includes(search.toLowerCase()))}
              rowKey={(r) => r.id}
              empty={<EmptyState icon={Network} title="Belum ada divisi" description="Tambahkan divisi pertama untuk mengelompokkan pengguna." />}
            />
          )}
        </div>
      </Panel>

      <Modal
        open={formOpen}
        onClose={() => !saving && setFormOpen(false)}
        title={editing ? 'Ubah Divisi' : 'Tambah Divisi'}
        size="sm"
        footer={
          <>
            <button className="xh-btn xh-btn-secondary" onClick={() => setFormOpen(false)} disabled={saving}>
              Batal
            </button>
            <SubmitButton loading={saving} onClick={submit as any}>
              Simpan
            </SubmitButton>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-3">
          <Field label="Kode" required={!editing} error={errors.code} hint={editing ? 'Kode divisi tidak dapat diubah' : 'Otomatis huruf kapital, spasi menjadi underscore'}>
            <input
              className="xh-input font-mono"
              value={form.code}
              disabled={!!editing}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
              placeholder="IT"
            />
          </Field>
          <Field label="Nama Divisi" required error={errors.name}>
            <input className="xh-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="IT Division" />
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Hapus divisi?"
        message={<>Divisi <strong>{confirmDelete?.name}</strong> akan dihapus permanen.</>}
        confirmLabel="Hapus"
        onConfirm={remove}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}