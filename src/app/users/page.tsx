'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { PageHeader, Panel, Field, EmptyState, TableSkeleton, DescList } from '@/components/ui/layout';
import { DataTable, Column, CodeBadge, Toolbar, SearchInput } from '@/components/ui/data-display';
import { Modal, ConfirmDialog, SubmitButton } from '@/components/ui/form';
import { Users, Plus, Building2, ShieldCheck, Eye, EyeOff, KeyRound, Info } from 'lucide-react';

type User = {
  id: number;
  username: string;
  name: string;
  roleId: number;
  divisionId: number;
  role: { code: string; name: string };
  division: { code: string; name: string };
};

type Role = { id: number; code: string; name: string; description: string | null };
type Division = { id: number; code: string; name: string };

const EMPTY = { username: '', name: '', password: '', roleId: '', divisionId: '' };

export default function UsersPage() {
  const { can, apiFetch } = useAuth();
  const { toast } = useToast();

  const [rows, setRows] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [editing, setEditing] = useState<User | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [detail, setDetail] = useState<User | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null);

  const canCreate = can('user_management', 'create');
  const canUpdate = can('user_management', 'update');
  const canDelete = can('user_management', 'delete');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, r, d] = await Promise.all([
        apiFetch(`/api/users${search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ''}`),
        apiFetch('/api/roles'),
        apiFetch('/api/divisions'),
      ]);
      if (!u.ok) throw new Error((await u.json().catch(() => ({}))).error || 'Gagal memuat pengguna');
      setRows(await u.json());
      if (r.ok) setRoles(await r.json());
      if (d.ok) setDivisions(await d.json());
    } catch (e: any) {
      toast('error', e.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, search, toast]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const openCreate = () => {
    setForm({ ...EMPTY, divisionId: divisions[0] ? String(divisions[0].id) : '', roleId: roles[0] ? String(roles[0].id) : '' });
    setEditing(null);
    setErrors({});
    setFormOpen(true);
  };

  const openEdit = (u: User) => {
    setForm({
      username: u.username,
      name: u.name,
      password: '',
      roleId: String(u.roleId),
      divisionId: String(u.divisionId),
    });
    setEditing(u);
    setErrors({});
    setFormOpen(true);
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e: Record<string, string> = {};
    if (!editing) {
      if (form.username.trim().length < 3) e.username = 'Username minimal 3 karakter.';
      if (form.password.length < 6) e.password = 'Password minimal 6 karakter.';
    } else if (form.password && form.password.length < 6) {
      e.password = 'Password minimal 6 karakter.';
    }
    if (!form.name.trim()) e.name = 'Nama wajib diisi.';
    if (!form.roleId) e.roleId = 'Role wajib dipilih.';
    if (!form.divisionId) e.divisionId = 'Divisi wajib dipilih.';
    setErrors(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      const payload: any = {
        name: form.name,
        roleId: Number(form.roleId),
        divisionId: Number(form.divisionId),
      };
      if (!editing) payload.username = form.username.trim();
      if (form.password) payload.password = form.password;

      const res = await apiFetch('/api/users', {
        method: editing ? 'PUT' : 'POST',
        body: JSON.stringify(editing ? { id: editing.id, ...payload } : payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.details?.join(', ') || 'Gagal menyimpan');
      toast('success', editing ? 'Pengguna diperbarui.' : 'Pengguna berhasil dibuat.');
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
      const res = await apiFetch(`/api/users?id=${confirmDelete.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menghapus');
      toast('success', 'Pengguna dihapus.');
      setConfirmDelete(null);
      load();
    } catch (e: any) {
      toast('error', e.message);
    }
  };

  const columns: Column<User>[] = [
    { key: 'username', header: 'Username', cell: (r) => <span className="font-mono text-[11.5px] font-semibold text-foreground">{r.username}</span> },
    { key: 'name', header: 'Nama', cell: (r) => <span className="font-medium text-foreground">{r.name}</span> },
    {
      key: 'role',
      header: 'Role',
      cell: (r) => (
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          <span className="text-[12px] text-muted-foreground-strong">{r.role.name}</span>
        </span>
      ),
    },
    {
      key: 'division',
      header: 'Divisi',
      cell: (r) => (
        <span className="inline-flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[12px] text-muted-foreground-strong">{r.division.name}</span>
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: 'actions',
      header: 'Aksi',
      className: 'text-right',
      cell: (r) => (
        <div className="flex items-center justify-end gap-1">
          <button className="xh-btn xh-btn-ghost h-8 px-2 text-[11.5px]" onClick={() => setDetail(r)}>
            <Eye className="h-3.5 w-3.5" />
            Detail
          </button>
          {canUpdate && (
            <button className="xh-btn xh-btn-ghost h-8 px-2 text-[11.5px]" onClick={() => openEdit(r)}>
              Ubah
            </button>
          )}
          {canDelete && r.username !== 'superadmin' && (
            <button className="xh-btn xh-btn-ghost h-8 px-2 text-[11.5px] text-danger" onClick={() => setConfirmDelete(r)}>
              Hapus
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Users}
        title="User Management"
        description="Setiap pengguna wajib punya satu divisi dan satu role. Role menentukan modul yang dapat diakses."
        actions={canCreate && <button className="xh-btn xh-btn-primary" onClick={openCreate}><Plus className="h-4 w-4" />Tambah Pengguna</button>}
      />

      <div className="flex items-start gap-2.5 rounded-xl border border-info/25 bg-info-subtle px-3.5 py-2.5 text-[11.5px] leading-relaxed text-info-subtle-foreground">
        <Info className="mt-px h-4 w-4 shrink-0" />
        <p>
          Divisi menentukan menu mana yang terlihat, sedangkan role menentukan izin (create / read / update / delete)
          pada tiap modul. Keduanya dapat dikelola pada menu Role Management dan Division Management.
        </p>
      </div>

      <Panel padded={false}>
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Cari username atau nama…" />
        </Toolbar>
        <div className="p-3 sm:p-4">
          {loading ? (
            <TableSkeleton rows={8} cols={5} />
          ) : (
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(r) => r.id}
              empty={
                <EmptyState
                  icon={Users}
                  title="Belum ada pengguna"
                  description="Tambahkan pengguna pertama dengan memilih divisi dan role yang sesuai."
                />
              }
            />
          )}
        </div>
      </Panel>

      <Modal
        open={formOpen}
        onClose={() => !saving && setFormOpen(false)}
        title={editing ? 'Ubah Pengguna' : 'Tambah Pengguna'}
        description="Divisi dan role wajib dipilih agar hak akses dapat dihitung dengan benar."
        footer={
          <>
            <button className="xh-btn xh-btn-secondary" onClick={() => setFormOpen(false)} disabled={saving}>
              Batal
            </button>
            <SubmitButton loading={saving} onClick={submit as any}>
              {editing ? 'Simpan Perubahan' : 'Buat Pengguna'}
            </SubmitButton>
          </>
        }
      >
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <Field label="Username" required error={errors.username} hint={editing ? 'Username tidak dapat diubah' : undefined}>
            <input className="xh-input font-mono" value={form.username} disabled={!!editing} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </Field>
          <Field label="Nama Lengkap" required error={errors.name}>
            <input className="xh-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Divisi" required error={errors.divisionId}>
            <select className="xh-select" value={form.divisionId} onChange={(e) => setForm({ ...form, divisionId: e.target.value })}>
              <option value="">— Pilih divisi —</option>
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Role" required error={errors.roleId}>
            <select className="xh-select" value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })}>
              <option value="">— Pilih role —</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.code})
                </option>
              ))}
            </select>
          </Field>
          <Field
            label={editing ? 'Password Baru' : 'Password'}
            required={!editing}
            error={errors.password}
            hint={editing ? 'Kosongkan bila tidak ingin mengganti password' : undefined}
            className="sm:col-span-2"
          >
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type={showPassword ? 'text' : 'password'}
                className="xh-input pl-9 pr-10"
                value={form.password}
                autoComplete="new-password"
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={editing ? 'Kosongkan bila tidak diubah' : 'Minimal 6 karakter'}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>
        </form>
      </Modal>

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title="Detail Pengguna"
        size="sm"
        footer={<button className="xh-btn xh-btn-secondary" onClick={() => setDetail(null)}>Tutup</button>}
      >
        {detail && (
          <DescList
            items={[
              { label: 'Username', value: <CodeBadge>{detail.username}</CodeBadge> },
              { label: 'Nama', value: detail.name },
              { label: 'Role', value: `${detail.role.name} (${detail.role.code})` },
              { label: 'Divisi', value: `${detail.division.name} (${detail.division.code})` },
              { label: 'ID', value: detail.id },
            ]}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Hapus pengguna?"
        message={
          <>
            Akun <strong>{confirmDelete?.username}</strong> ({confirmDelete?.name}) akan dihapus permanen beserta
            sesinya.
          </>
        }
        confirmLabel="Hapus"
        onConfirm={remove}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}