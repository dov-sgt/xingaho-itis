'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { PageHeader, Panel, Field, EmptyState, TableSkeleton } from '@/components/ui/layout';
import { DataTable, Column, StatusBadge, Pagination, Toolbar, SearchInput } from '@/components/ui/data-display';
import { Modal, ConfirmDialog, SubmitButton } from '@/components/ui/form';
import { formatDateTime, formatDate } from '@/lib/format';
import { ClipboardCheck, Plus, HandCoins, CalendarClock, User2, Info } from 'lucide-react';

type Remark = {
  id: number;
  nasabahId: number;
  agenName: string | null;
  remark: string;
  promiseToPay: boolean;
  promiseDate: string | null;
  createdBy: string | null;
  createdAt: string;
  nasabah: { id: number; nik: string; nama: string };
};

type NasabahOption = { id: number; nik: string; nama: string };

const EMPTY = { nasabahId: '', agenName: '', remark: '', promiseToPay: false, promiseDate: '' };

export default function RemarksPage() {
  const { can, user, apiFetch } = useAuth();
  const { toast } = useToast();

  const [rows, setRows] = useState<Remark[]>([]);
  const [nasabah, setNasabah] = useState<NasabahOption[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [editing, setEditing] = useState<Remark | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState<Remark | null>(null);

  const canCreate = can('transaction_stockout', 'create');
  const canUpdate = can('transaction_stockout', 'update');
  const canDelete = can('transaction_stockout', 'delete');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), pageSize: '10' });
      if (search.trim()) qs.set('search', search.trim());
      const res = await apiFetch(`/api/remarks?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal memuat remarks');
      setRows(json.data ?? []);
      setPagination(json.pagination ?? { page, pageSize: 10, total: 0, totalPages: 1 });
    } catch (e: any) {
      toast('error', e.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, page, search, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    apiFetch('/api/nasabah')
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : (d.data ?? []);
        setNasabah(list.map((n: any) => ({ id: n.id, nik: n.nik, nama: n.nama })));
      })
      .catch(() => setNasabah([]));
  }, [apiFetch]);

  const openCreate = () => {
    setForm({ ...EMPTY, agenName: user?.name ?? '' });
    setEditing(null);
    setErrors({});
    setFormOpen(true);
  };

  const openEdit = (r: Remark) => {
    setForm({
      nasabahId: String(r.nasabahId),
      agenName: r.agenName ?? '',
      remark: r.remark,
      promiseToPay: r.promiseToPay,
      promiseDate: r.promiseDate ? r.promiseDate.slice(0, 10) : '',
    });
    setEditing(r);
    setErrors({});
    setFormOpen(true);
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e: Record<string, string> = {};
    if (!editing && !form.nasabahId) e.nasabahId = 'Nasabah wajib dipilih.';
    if (!form.remark.trim()) e.remark = 'Isi remark wajib diisi.';
    if (form.promiseToPay && !form.promiseDate) e.promiseDate = 'Tentukan tanggal janji bayar.';
    setErrors(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      const res = await apiFetch('/api/remarks', {
        method: editing ? 'PUT' : 'POST',
        body: JSON.stringify(editing ? { id: editing.id, ...form } : form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan');
      toast('success', editing ? 'Remark diperbarui.' : 'Remark ditambahkan.');
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
      const res = await apiFetch(`/api/remarks?id=${confirmDelete.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menghapus');
      toast('success', 'Remark dihapus.');
      setConfirmDelete(null);
      load();
    } catch (e: any) {
      toast('error', e.message);
    }
  };

  const columns: Column<Remark>[] = [
    { key: 'createdAt', header: 'Waktu', cell: (r) => <span className="whitespace-nowrap text-[11.5px] text-muted-foreground">{formatDateTime(r.createdAt)}</span> },
    {
      key: 'nasabah',
      header: 'Nasabah',
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{r.nasabah?.nama ?? '-'}</p>
          <p className="truncate font-mono text-[10.5px] text-muted-foreground">{r.nasabah?.nik ?? '-'}</p>
        </div>
      ),
    },
    { key: 'remark', header: 'Remark', cell: (r) => <span className="line-clamp-2 text-[11.5px] text-muted-foreground-strong">{r.remark}</span> },
    {
      key: 'promise',
      header: 'Janji Bayar',
      cell: (r) =>
        r.promiseToPay ? (
          <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-success">
            <HandCoins className="h-3.5 w-3.5" />
            {r.promiseDate ? formatDate(r.promiseDate) : 'Ya'}
          </span>
        ) : (
          <span className="text-[11.5px] text-muted-foreground">-</span>
        ),
      hideOnMobile: true,
    },
    {
      key: 'agenName',
      header: 'Agen',
      cell: (r) => (
        <span className="flex items-center gap-1 text-[11.5px] text-muted-foreground">
          <User2 className="h-3 w-3" />
          {r.agenName || '-'}
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
          {canUpdate && (
            <button className="xh-btn xh-btn-ghost h-8 px-2 text-[11.5px]" onClick={() => openEdit(r)}>
              Ubah
            </button>
          )}
          {canDelete && (
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
        icon={ClipboardCheck}
        title="Remarks"
        description="Catatan hasil kontak nasabah beserta janji bayar bila ada."
        actions={canCreate && <button className="xh-btn xh-btn-primary" onClick={openCreate}><Plus className="h-4 w-4" />Tambah Remark</button>}
      />

      <div className="flex items-start gap-2.5 rounded-xl border border-info/25 bg-info-subtle px-3.5 py-2.5 text-[11.5px] leading-relaxed text-info-subtle-foreground">
        <Info className="mt-px h-4 w-4 shrink-0" />
        <p>
          Setiap remark terikat pada satu nasabah. Menghapus nasabah akan ikut menghapus seluruh remark-nya.
        </p>
      </div>

      <Panel padded={false}>
        <Toolbar>
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Cari remark, agen, atau nama nasabah..." />
        </Toolbar>
        <div className="p-3 sm:p-4">
          {loading ? (
            <TableSkeleton rows={6} cols={5} />
          ) : (
            <>
              <DataTable
                columns={columns}
                rows={rows}
                rowKey={(r) => r.id}
                empty={
                  <EmptyState
                    icon={ClipboardCheck}
                    title="Belum ada remark"
                    description="Tambahkan catatan kontak nasabah. Pastikan data nasabah sudah tersedia lebih dulu."
                    action={canCreate ? <button className="xh-btn xh-btn-primary" onClick={openCreate}><Plus className="h-4 w-4" />Tambah Remark</button> : undefined}
                  />
                }
              />
              <Pagination {...pagination} onPageChange={setPage} />
            </>
          )}
        </div>
      </Panel>

      <Modal
        open={formOpen}
        onClose={() => !saving && setFormOpen(false)}
        title={editing ? 'Ubah Remark' : 'Tambah Remark'}
        description="Pilih nasabah, isi catatan, dan tandai janji bayar bila ada."
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
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <Field label="Nasabah" required={!editing} error={errors.nasabahId} className="sm:col-span-2">
            <select
              className="xh-select"
              value={form.nasabahId}
              disabled={!!editing}
              onChange={(e) => setForm({ ...form, nasabahId: e.target.value })}
            >
              <option value="">- Pilih nasabah -</option>
              {nasabah.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.nama} - {n.nik}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nama Agen" className="sm:col-span-2">
            <input className="xh-input" value={form.agenName} onChange={(e) => setForm({ ...form, agenName: e.target.value })} />
          </Field>
          <Field label="Remark" required error={errors.remark} className="sm:col-span-2">
            <textarea className="xh-input min-h-[96px] py-2" value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} placeholder="Hasil kontak, keluhan, atau tindak lanjut..." />
          </Field>
          <Field label="Ada Janji Bayar?">
            <label className="flex h-9 cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[hsl(var(--primary))]"
                checked={form.promiseToPay}
                onChange={(e) => setForm({ ...form, promiseToPay: e.target.checked })}
              />
              <span className="text-[12.5px] text-muted-foreground-strong">
                {form.promiseToPay ? 'Ya, ada janji bayar' : 'Tidak ada janji bayar'}
              </span>
            </label>
          </Field>
          {form.promiseToPay && (
            <Field label="Tanggal Janji Bayar" required error={errors.promiseDate}>
              <input type="date" className="xh-input" value={form.promiseDate} onChange={(e) => setForm({ ...form, promiseDate: e.target.value })} />
            </Field>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Hapus remark?"
        message={<>Catatan untuk nasabah <strong>{confirmDelete?.nasabah?.nama}</strong> akan dihapus permanen.</>}
        confirmLabel="Hapus"
        onConfirm={remove}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}