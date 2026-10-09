'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { PageHeader, Panel, Field, EmptyState, TableSkeleton } from '@/components/ui/layout';
import { DataTable, Column, CodeBadge, Toolbar, SearchInput } from '@/components/ui/data-display';
import { Modal, ConfirmDialog, SubmitButton } from '@/components/ui/form';
import { ACTIONS, ACTION_LABELS, FEATURES, Feature, PermissionMap, canAccessMenuIn } from '@/lib/rbac';
import { ShieldCheck, Plus, Users, Trash2, Check, Info, KeyRound } from 'lucide-react';

type Role = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  permissions: PermissionMap;
  _count?: { users: number };
};

const FEATURE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  master_item: 'Master Inventory',
  master_vendor: 'Master Vendor',
  inventory_type_item: 'Inventaris & Stok',
  transaction_headset: 'Headset User',
  transaction_stockout: 'Stock Out',
  purchase_request: 'Purchase Request',
  delivery_order: 'Delivery Order',
  vendor_submission: 'Pengajuan',
  booking: 'Booking Asset',
  servis_asset: 'Servis Asset',
  log_ruang_server: 'Log Ruang Server',
  recording_review: 'Recording Review',
  finding: 'QC Findings',
  employee_data: 'Employee Data',
  leave_request: 'Leave Request',
  user_management: 'User Management',
  division_management: 'Division Management',
  role_management: 'Role Management',
  reporting: 'Reporting',
};

const EMPTY = { code: '', name: '', description: '' };

export default function RolesPage() {
  const { can, isSuperAdmin, apiFetch } = useAuth();
  const { toast } = useToast();

  const [rows, setRows] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [matrixOpen, setMatrixOpen] = useState<Role | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [permissions, setPermissions] = useState<PermissionMap>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Role | null>(null);

  const canCreate = can('role_management', 'create');
  const canUpdate = can('role_management', 'update');
  const canDelete = can('role_management', 'delete');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/roles');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal memuat role');
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q));
  }, [rows, search]);

  const openMatrix = (r: Role) => {
    setMatrixOpen(r);
    setPermissions({ ...(r.permissions ?? {}) });
  };

  const toggle = (feature: Feature, action: string) => {
    setPermissions((prev) => {
      const current = Array.isArray(prev[feature]) ? [...(prev[feature] as string[])] : [];
      const next = current.includes(action) ? current.filter((a) => a !== action) : [...current, action];
      return { ...prev, [feature]: next } as PermissionMap;
    });
  };

  const setFeatureAll = (feature: Feature, value: boolean) => {
    setPermissions((prev) => ({ ...prev, [feature]: value ? [...ACTIONS] : [] } as PermissionMap));
  };

  const savePermissions = async () => {
    if (!matrixOpen) return;
    setSaving(true);
    try {
      const res = await apiFetch('/api/roles', {
        method: 'PUT',
        body: JSON.stringify({ id: matrixOpen.id, permissions }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan permission');
      toast('success', `Permission untuk ${matrixOpen.name} disimpan.`);
      setMatrixOpen(null);
      load();
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const createRole = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e: Record<string, string> = {};
    if (!form.code.trim()) e.code = 'Kode role wajib diisi.';
    if (!form.name.trim()) e.name = 'Nama role wajib diisi.';
    setErrors(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      const res = await apiFetch('/api/roles', {
        method: 'POST',
        body: JSON.stringify({ ...form, code: form.code.trim().toUpperCase().replace(/\s+/g, '_'), permissions: {} }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal membuat role');
      toast('success', `Role ${json.name} dibuat. Atur izinnya melalui tombol Atur Izin.`);
      setCreateOpen(false);
      setForm({ ...EMPTY });
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
      const res = await apiFetch(`/api/roles?id=${confirmDelete.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menghapus');
      toast('success', `Role ${confirmDelete.name} dihapus.`);
      setConfirmDelete(null);
      load();
    } catch (e: any) {
      toast('error', e.message);
    }
  };

  const columns: Column<Role>[] = [
    {
      key: 'name',
      header: 'Role',
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{r.name}</p>
          {r.description && <p className="truncate text-[10.5px] text-muted-foreground">{r.description}</p>}
        </div>
      ),
    },
    { key: 'code', header: 'Kode', cell: (r) => <CodeBadge>{r.code}</CodeBadge> },
    {
      key: 'modules',
      header: 'Modul Terakses',
      numeric: true,
      cell: (r) => {
        const n = FEATURES.filter((f) => canAccessMenuIn(r.permissions, f)).length;
        return <span className="font-bold tabular-nums text-foreground">{n}</span>;
      },
    },
    {
      key: 'actions',
      header: 'Aksi',
      className: 'text-right',
      cell: (r) => (
        <div className="flex items-center justify-end gap-1">
          {canUpdate && (
            <button className="xh-btn xh-btn-secondary xh-btn-sm" onClick={() => openMatrix(r)}>
              <KeyRound className="h-3.5 w-3.5" />
              Atur Izin
            </button>
          )}
          {canDelete && r.code !== 'SUPERADMIN' && (
            <button className="xh-btn xh-btn-ghost h-8 w-8 p-0 text-danger" title="Hapus role" onClick={() => setConfirmDelete(r)}>
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
        icon={ShieldCheck}
        title="Role Management"
        description="Kelola role beserta izin per modul. Izin disimpan di database dan langsung berlaku pada seluruh API."
        actions={canCreate && <button className="xh-btn xh-btn-primary" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />Tambah Role</button>}
      />

      <div className="flex items-start gap-2.5 rounded-xl border border-info/25 bg-info-subtle px-3.5 py-2.5 text-[11.5px] leading-relaxed text-info-subtle-foreground">
        <Info className="mt-px h-4 w-4 shrink-0" />
        <p>
          Role <strong>SUPERADMIN</strong> otomatis memiliki akses penuh tanpa perlu mencentang. Perubahan izin
          langsung diterapkan pada server — menu yang hilang di sidebar akan ditolak API-nya juga dengan 403.
        </p>
      </div>

      <Panel padded={false}>
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Cari nama atau kode role…" />
        </Toolbar>
        <div className="p-3 sm:p-4">
          {loading ? (
            <TableSkeleton rows={8} cols={4} />
          ) : (
            <DataTable
              columns={columns}
              rows={filtered}
              rowKey={(r) => r.id}
              empty={<EmptyState icon={ShieldCheck} title="Belum ada role" description="Buat role pertama, lalu tentukan izin per modulnya." />}
            />
          )}
        </div>
      </Panel>

      {/* ---- Matrix izin ---- */}
      <Modal
        open={!!matrixOpen}
        onClose={() => !saving && setMatrixOpen(null)}
        title={`Izin Role · ${matrixOpen?.name ?? ''}`}
        description="Centang izin yang dimiliki role pada setiap modul."
        size="xl"
        footer={
          <>
            <button className="xh-btn xh-btn-secondary" onClick={() => setMatrixOpen(null)} disabled={saving}>
              Batal
            </button>
            <SubmitButton loading={saving} onClick={savePermissions}>
              Simpan Izin
            </SubmitButton>
          </>
        }
      >
        <div className="xh-table-wrapper">
          <table className="xh-table">
            <thead>
              <tr>
                <th scope="col" className="w-[42%]">
                  Modul
                </th>
                {ACTIONS.map((a) => (
                  <th key={a} scope="col" className="text-center">
                    {ACTION_LABELS[a]}
                  </th>
                ))}
                <th scope="col" className="text-center">
                  Semua
                </th>
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((f) => {
                const list = Array.isArray(permissions[f]) ? (permissions[f] as string[]) : [];
                const all = ACTIONS.every((a) => list.includes(a));
                return (
                  <tr key={f}>
                    <td>
                      <span className="font-medium text-foreground">{FEATURE_LABELS[f] ?? f}</span>
                    </td>
                    {ACTIONS.map((a) => (
                      <td key={a} className="num">
                        <input
                          type="checkbox"
                          aria-label={`${ACTION_LABELS[a]} ${FEATURE_LABELS[f] ?? f}`}
                          className="h-4 w-4 accent-[hsl(var(--primary))]"
                          checked={list.includes(a)}
                          onChange={() => toggle(f, a)}
                        />
                      </td>
                    ))}
                    <td className="num">
                      <input
                        type="checkbox"
                        aria-label={`Semua izin ${FEATURE_LABELS[f] ?? f}`}
                        className="h-4 w-4 accent-[hsl(var(--primary))]"
                        checked={all}
                        onChange={(e) => setFeatureAll(f, e.target.checked)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Modal>

      {/* ---- Buat role ---- */}
      <Modal
        open={createOpen}
        onClose={() => !saving && setCreateOpen(false)}
        title="Tambah Role"
        description="Kode role akan otomatis menjadi huruf kapital dengan underscore."
        size="sm"
        footer={
          <>
            <button className="xh-btn xh-btn-secondary" onClick={() => setCreateOpen(false)} disabled={saving}>
              Batal
            </button>
            <SubmitButton loading={saving} onClick={createRole as any}>
              Buat Role
            </SubmitButton>
          </>
        }
      >
        <form onSubmit={createRole} className="space-y-3">
          <Field label="Kode Role" required error={errors.code} hint="Contoh: OPS_SPV → tersimpan sebagai OPS_SPV">
            <input
              className="xh-input font-mono"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
              placeholder="IT_SPV"
            />
          </Field>
          <Field label="Nama Role" required error={errors.name}>
            <input className="xh-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="IT Supervisor" />
          </Field>
          <Field label="Deskripsi">
            <textarea className="xh-input min-h-[70px] py-2" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Hapus role?"
        message={
          <>
            Role <strong>{confirmDelete?.name}</strong> akan dihapus. Role yang masih dipakai pengguna tidak dapat
            dihapus.
          </>
        }
        confirmLabel="Hapus"
        onConfirm={remove}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}