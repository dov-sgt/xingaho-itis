'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { normalizeFeature, featureForEndpoint } from '@/lib/rbac';
import { useToast } from '@/components/Toast';
import { PageHeader, Panel, Field, EmptyState, TableSkeleton } from '@/components/ui/layout';
import { DataTable, Column, StatusBadge, Pagination, Toolbar, SearchInput, CodeBadge } from '@/components/ui/data-display';
import { Modal, ConfirmDialog, MoneyInput, NumberInput, SubmitButton } from '@/components/ui/form';
import { formatDateTime } from '@/lib/format';
import { Plus, Eye, Pencil, Trash2, RefreshCw, Info } from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Tipe                                                                */
/* ------------------------------------------------------------------ */

export type FieldType = 'text' | 'textarea' | 'number' | 'money' | 'date' | 'select' | 'switch';

export interface CrudField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  hint?: string;
  /** Lebar kolom pada grid form (1-3 dari total 3). */
  span?: 1 | 2 | 3;
  /** Kolom tidak boleh diubah saat edit (mis. kode dokumen). */
  immutableOnEdit?: boolean;
  /** Kolom ini tidak ikut dikirim ke server. */
  serverOnly?: boolean;
  defaultValue?: any;
  /**
   * Render kustom (item 7). Dipakai untuk field yang bergantung pada field
   * lain, mis. dropdown item yang isinya difilter oleh kategori terpilih.
   * Bila diisi, `type` tetap dipakai untuk validasi dasar.
   */
  render?: (ctx: CrudFieldRenderContext) => React.ReactNode;
}

export interface CrudFieldRenderContext {
  value: any;
  /** Perbarui nilai field ini. */
  set: (value: any) => void;
  /** Nilai seluruh form saat ini. */
  values: Record<string, any>;
  /** Perbarui beberapa field sekaligus (mis. reset field lain). */
  patch: (changes: Record<string, any>) => void;
  disabled: boolean;
}

export interface CrudColumn<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  numeric?: boolean;
  hideOnMobile?: boolean;
  className?: string;
}

/* ------------------------------------------------------------------ */
/* Komponen                                                            */
/* ------------------------------------------------------------------ */

export interface CrudPageProps<T extends { id: number }> {
  title: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  endpoint: string;
  /** Kunci permission untuk create. Default: <endpoint> create. */
  createFeature?: string;
  updateFeature?: string;
  deleteFeature?: string;
  columns: CrudColumn<T>[];
  fields: CrudField[];
  /** Kolom yang menampilkan badge status. */
  statusKey?: string;
  statusOptions?: string[];
  searchPlaceholder?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: React.ComponentType<{ className?: string }>;
  info?: React.ReactNode;
  headerActions?: React.ReactNode;
  /** Transformasi nilai sebelum dikirim ke server. */
  toPayload?: (values: Record<string, any>, editing: T | null) => Record<string, any>;
  /** Transformasi row server -> nilai form saat edit. */
  toForm?: (row: T) => Record<string, any>;
  /** Kolom hanya tampil di detail, tidak di form. */
  detailFields?: CrudColumn<T>[];
  /** Label unik di header tabel. */
  rowLabel?: (row: T) => string;
  pageSize?: number;
  /** Nonaktifkan pagination bila endpoint tidak mendukungnya. */
  simpleList?: boolean;
  /**
   * Filter status awal, biasanya dari query string. Dipakai dashboard yang
   * menautkan daftar terfilter (item 4), mis. `/bookings?status=Pending`.
   */
  initialStatus?: string;
}

export function CrudPage<T extends { id: number }>({
  title,
  description,
  icon,
  endpoint,
  createFeature,
  updateFeature,
  deleteFeature,
  columns,
  fields,
  statusKey,
  statusOptions = [],
  searchPlaceholder = 'Cari...',
  emptyTitle = 'Belum ada data',
  emptyDescription,
  emptyIcon,
  info,
  headerActions,
  toPayload,
  toForm,
  detailFields,
  rowLabel,
  pageSize = 10,
  simpleList = false,
  initialStatus = '',
}: CrudPageProps<T>) {
  const { can, apiFetch } = useAuth();
  const { toast } = useToast();

  // Feature key WAJIB ada di peta ENDPOINT_FEATURE. Kalau tidak, fallback ke
  // segment path URL - perilaku lama yang pernah membuat tombol aksi tersembunyi
  // karena nama feature tidak pernah cocok dengan permission.
  const baseFeature =
    createFeature ?? featureForEndpoint(endpoint) ?? normalizeFeature(endpoint.replace(/^\/api\//, '').split('/')[0]);
  const createF = baseFeature;
  const updateF = updateFeature ?? createF;
  const deleteF = deleteFeature ?? createF;

  const canCreate = can(createF, 'create');
  const canUpdate = can(updateF, 'update');
  const canDelete = can(deleteF, 'delete');

  const [rows, setRows] = useState<T[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(initialStatus);
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [values, setValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [detail, setDetail] = useState<T | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<T | null>(null);

  const defaults = useMemo(() => {
    const o: Record<string, any> = {};
    fields.forEach((f) => {
      o[f.key] = f.defaultValue ?? (f.type === 'money' || f.type === 'number' ? 0 : '');
    });
    return o;
  }, [fields]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (!simpleList) {
        qs.set('page', String(page));
        qs.set('pageSize', String(pageSize));
      }
      if (search.trim()) qs.set('search', search.trim());
      if (status && statusKey) qs.set('status', status);

      const res = await apiFetch(`${endpoint}?${qs}`);
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || json?.details?.join(', ') || `Gagal memuat ${endpoint}`);

      if (Array.isArray(json)) {
        setRows(json);
        setPagination((p) => ({ ...p, total: json.length, totalPages: 1 }));
      } else {
        setRows(json?.data ?? []);
        if (json?.pagination) setPagination(json.pagination);
        else setPagination((p) => ({ ...p, total: (json?.data ?? []).length, totalPages: 1 }));
      }
    } catch (e: any) {
      toast('error', e.message);
      setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiFetch, endpoint, page, search, status, simpleList]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const openCreate = () => {
    setValues({ ...defaults });
    setEditing(null);
    setErrors({});
    setFormOpen(true);
  };

  const openEdit = (row: T) => {
    setValues(toForm ? { ...defaults, ...toForm(row) } : { ...defaults, ...(row as any) });
    setEditing(row);
    setErrors({});
    setFormOpen(true);
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    fields.forEach((f) => {
      const v = values[f.key];
      if (f.required && (v === '' || v === null || v === undefined)) {
        e[f.key] = `${f.label} wajib diisi.`;
      }
      if ((f.type === 'number' || f.type === 'money') && v !== '' && Number(v) < 0) {
        e[f.key] = `${f.label} tidak boleh negatif.`;
      }
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = toPayload ? toPayload(values, editing) : values;
      const res = await apiFetch(endpoint, {
        method: editing ? 'PUT' : 'POST',
        body: JSON.stringify(editing ? { id: editing.id, ...payload } : payload),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || json?.details?.join(', ') || 'Gagal menyimpan');
      toast('success', editing ? `${title} diperbarui.` : `${title} ditambahkan.`);
      setFormOpen(false);
      setPage(1);
      load();
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    try {
      const res = await apiFetch(`${endpoint}?id=${confirmDelete.id}`, { method: 'DELETE' });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || 'Gagal menghapus');
      toast('success', `${title} dihapus.`);
      setConfirmDelete(null);
      setDetail(null);
      load();
    } catch (e: any) {
      toast('error', e.message);
    }
  };

  const allColumns: Column<T>[] = useMemo(() => {
    const cols: Column<T>[] = [...columns];
    if (statusKey) {
      cols.push({
        key: '__status',
        header: 'Status',
        cell: (r: any) => <StatusBadge status={r[statusKey]} />,
      });
    }
    cols.push({
      key: '__actions',
      header: 'Aksi',
      className: 'text-right',
      cell: (r) => (
        <div className="flex items-center justify-end gap-1">
          <button className="xh-btn xh-btn-ghost h-8 w-8 p-0" title="Lihat detail" onClick={() => setDetail(r)}>
            <Eye className="h-4 w-4" />
          </button>
          {canUpdate && (
            <button className="xh-btn xh-btn-ghost h-8 w-8 p-0" title="Ubah" onClick={() => openEdit(r)}>
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {canDelete && (
            <button
              className="xh-btn xh-btn-ghost h-8 w-8 p-0 text-danger"
              title="Hapus"
              onClick={() => setConfirmDelete(r)}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    });
    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, statusKey, canUpdate, canDelete]);

  const renderInput = (f: CrudField) => {
    const v = values[f.key];
    const set = (nv: any) => setValues((p) => ({ ...p, [f.key]: nv }));
    const disabled = !!editing && !!f.immutableOnEdit;

    // Render kustom (item 7): field yang isinya bergantung pada field lain.
    if (f.render) {
      return f.render({
        value: v,
        set,
        values,
        patch: (changes) => setValues((p) => ({ ...p, ...changes })),
        disabled,
      });
    }

    switch (f.type) {
      case 'money':
        return <MoneyInput value={Number(v) || 0} onChange={set} disabled={disabled} />;
      case 'number':
        return <NumberInput value={Number(v) || 0} onChange={set} disabled={disabled} />;
      case 'textarea':
        return (
          <textarea
            className="xh-input min-h-[80px] py-2"
            value={v ?? ''}
            placeholder={f.placeholder}
            disabled={disabled}
            onChange={(e) => set(e.target.value)}
          />
        );
      case 'date':
        return (
          <input
            type="date"
            className="xh-input"
            value={v ? String(v).slice(0, 10) : ''}
            disabled={disabled}
            onChange={(e) => set(e.target.value)}
          />
        );
      case 'select':
        return (
          <select className="xh-select" value={v ?? ''} disabled={disabled} onChange={(e) => set(e.target.value)}>
            {!f.required && <option value="">- Tidak diisi -</option>}
            {(f.options ?? []).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        );
      case 'switch':
        return (
          <label className="flex h-9 cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[hsl(var(--primary))]"
              checked={!!v}
              disabled={disabled}
              onChange={(e) => set(e.target.checked)}
            />
            <span className="text-[12.5px] text-muted-foreground-strong">{v ? 'Aktif' : 'Tidak aktif'}</span>
          </label>
        );
      default:
        return (
          <input
            className="xh-input"
            value={v ?? ''}
            placeholder={f.placeholder}
            disabled={disabled}
            onChange={(e) => set(e.target.value)}
          />
        );
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        icon={icon}
        title={title}
        description={description}
        actions={
          <>
            {headerActions}
            <button
              className="xh-btn xh-btn-secondary"
              onClick={() => {
                setRefreshing(true);
                load();
              }}
              disabled={refreshing}
              aria-label="Muat ulang data"
            >
              <RefreshCw className={refreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            </button>
            {canCreate && (
              <button className="xh-btn xh-btn-primary" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Tambah
              </button>
            )}
          </>
        }
      />

      {info && (
        <div className="flex items-start gap-2.5 rounded-xl border border-info/25 bg-info-subtle px-3.5 py-2.5 text-[11.5px] leading-relaxed text-info-subtle-foreground">
          <Info className="mt-px h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1">{info}</div>
        </div>
      )}

      <Panel padded={false}>
        <Toolbar>
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder={searchPlaceholder} />
          {statusKey && statusOptions.length > 0 && (
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="xh-select w-[170px]"
              aria-label="Filter status"
            >
              <option value="">Semua status</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
        </Toolbar>
        <div className="p-3 sm:p-4">
          {loading ? (
            <TableSkeleton rows={8} cols={Math.min(6, columns.length + 1)} />
          ) : (
            <>
              <DataTable
                columns={allColumns}
                rows={rows}
                rowKey={(r) => r.id}
                empty={
                  <EmptyState
                    icon={emptyIcon ?? icon}
                    title={emptyTitle}
                    description={emptyDescription}
                    action={canCreate ? <button className="xh-btn xh-btn-primary" onClick={openCreate}><Plus className="h-4 w-4" />Tambah</button> : undefined}
                  />
                }
              />
              {!simpleList && <Pagination {...pagination} onPageChange={setPage} />}
            </>
          )}
        </div>
      </Panel>

      {/* ---------- Form ---------- */}
      <Modal
        open={formOpen}
        onClose={() => !saving && setFormOpen(false)}
        title={editing ? `Ubah ${title}` : `Tambah ${title}`}
        size="lg"
        footer={
          <>
            <button className="xh-btn xh-btn-secondary" onClick={() => setFormOpen(false)} disabled={saving}>
              Batal
            </button>
            <SubmitButton loading={saving} onClick={submit as any}>
              {editing ? 'Simpan Perubahan' : 'Simpan'}
            </SubmitButton>
          </>
        }
      >
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-3">
          {fields.map((f) => (
            <Field
              key={f.key}
              label={f.label}
              required={f.required}
              error={errors[f.key]}
              hint={f.hint}
              className={f.span === 3 ? 'sm:col-span-3' : f.span === 2 ? 'sm:col-span-2' : ''}
            >
              {renderInput(f)}
            </Field>
          ))}
        </form>
      </Modal>

      {/* ---------- Detail ---------- */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail && rowLabel ? `${title} - ${rowLabel(detail)}` : title}
        size="lg"
        footer={
          <button className="xh-btn xh-btn-secondary" onClick={() => setDetail(null)}>
            Tutup
          </button>
        }
      >
        {detail && (
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            {(detailFields ?? columns).map((c) => (
              <div key={c.key} className="min-w-0">
                <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {typeof c.header === 'string' ? c.header : c.key}
                </dt>
                <dd className="mt-0.5 break-words text-[13px] font-medium text-foreground">{c.cell(detail)}</dd>
              </div>
            ))}
            <div className="min-w-0">
              <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">Diperbarui</dt>
              <dd className="mt-0.5 text-[13px] font-medium text-foreground">
                {formatDateTime((detail as any).updatedAt ?? (detail as any).createdAt)}
              </dd>
            </div>
          </dl>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        title={`Hapus ${title}?`}
        message={
          <>
            Data {rowLabel && confirmDelete ? <strong>{rowLabel(confirmDelete)}</strong> : 'ini'} akan dihapus permanen.
            Tindakan ini tidak dapat dibatalkan.
          </>
        }
        confirmLabel="Hapus"
        onConfirm={remove}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

export { CodeBadge };