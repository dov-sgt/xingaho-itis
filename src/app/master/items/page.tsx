'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { PageHeader, Panel, Field, EmptyState, TableSkeleton } from '@/components/ui/layout';
import { DataTable, Column, Toolbar, SearchInput, CodeBadge } from '@/components/ui/data-display';
import { Modal, ConfirmDialog, MoneyInput, SubmitButton } from '@/components/ui/form';
import { formatRupiah } from '@/lib/format';
import { Boxes, Plus, Upload, RotateCcw, FileSpreadsheet, X, Info, Tags } from 'lucide-react';

type MasterItem = {
  id: number;
  code: string;
  typeItem: string;
  namaItem: string;
  brand: string;
  price: number | null;
  updateAt: string;
  updateBy: string | null;
};

/** Kategori katalog. `Accessories` dipakai form Pengajuan Headset (item 13). */
const CATEGORIES = ['Computer', 'Accessories', 'Smartphone', 'Media', 'Equipment', 'Networking', 'Server', 'Others'];

const EMPTY = { code: '', typeItem: 'Computer', namaItem: '', brand: '', price: 0 };

export default function MasterItemsPage() {
  const { can, apiFetch } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [rows, setRows] = useState<MasterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ ...EMPTY });
  const [editing, setEditing] = useState<MasterItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<MasterItem | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

  const canCreate = can('master_item', 'create');
  const canUpdate = can('master_item', 'update');
  const canDelete = can('master_item', 'delete');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (search.trim()) qs.set('search', search.trim());
      if (category !== 'All') qs.set('category', category);
      const res = await apiFetch(`/api/master/items?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal memuat Master Item');
      setRows(Array.isArray(json) ? json : []);
    } catch (e: any) {
      toast('error', e.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, search, category, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setForm({ ...EMPTY });
    setEditing(null);
    setErrors({});
    setFormOpen(true);
  };

  const openEdit = (item: MasterItem) => {
    setForm({
      code: item.code,
      typeItem: item.typeItem,
      namaItem: item.namaItem,
      brand: item.brand,
      price: item.price ?? 0,
    });
    setEditing(item);
    setErrors({});
    setFormOpen(true);
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e: Record<string, string> = {};
    if (!form.code.trim()) e.code = 'Kode item wajib diisi.';
    if (!form.namaItem.trim()) e.namaItem = 'Nama item wajib diisi.';
    if (form.price < 0) e.price = 'Harga tidak boleh negatif.';
    setErrors(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      const isEdit = !!editing;
      const res = await apiFetch('/api/master/items', {
        method: isEdit ? 'PUT' : 'POST',
        body: JSON.stringify(isEdit ? { id: editing.id, ...form } : form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.details?.join(', ') || 'Gagal menyimpan');
      toast('success', isEdit ? 'Master Item diperbarui.' : 'Master Item ditambahkan.');
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
      const res = await apiFetch(`/api/master/items?id=${confirmDelete.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menghapus');
      toast('success', `${confirmDelete.namaItem} dihapus.`);
      setConfirmDelete(null);
      load();
    } catch (e: any) {
      toast('error', e.message);
    }
  };

  const upload = async (file: File) => {
    setUploading(true);
    setUploadResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await apiFetch('/api/master/items/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal mengunggah');
      setUploadResult(json);
      toast(json.failed ? 'warning' : 'success', `Import selesai: ${json.success} berhasil, ${json.failed} gagal.`);
      load();
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const columns: Column<MasterItem>[] = [
    { key: 'code', header: 'Kode', cell: (r) => <CodeBadge>{r.code}</CodeBadge> },
    {
      key: 'namaItem',
      header: 'Nama Item',
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{r.namaItem}</p>
          <p className="truncate text-[10.5px] text-muted-foreground">{r.brand}</p>
        </div>
      ),
    },
    { key: 'typeItem', header: 'Kategori', cell: (r) => <span className="text-[11.5px] text-muted-foreground-strong">{r.typeItem}</span> },
    {
      // Item 12: kolom Price
      key: 'price',
      header: 'Harga',
      numeric: true,
      cell: (r) =>
        r.price == null ? (
          <span className="text-[11.5px] italic text-muted-foreground">belum diisi</span>
        ) : (
          <span className="font-semibold tabular-nums text-foreground">{formatRupiah(r.price)}</span>
        ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      className: 'text-right',
      cell: (r) => (
        <div className="flex items-center justify-end gap-1">
          {canUpdate && (
            <button className="xh-btn xh-btn-ghost h-8 w-8 p-0" title="Ubah" onClick={() => openEdit(r)}>
              <Tags className="h-4 w-4" />
            </button>
          )}
          {canDelete && (
            <button className="xh-btn xh-btn-ghost h-8 w-8 p-0 text-danger" title="Hapus" onClick={() => setConfirmDelete(r)}>
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Boxes}
        title="Master Inventory"
        description="Katalog barang dan harga acuan. Harga dipakai otomatis pada form Pengajuan kategori Headset."
        actions={
          <>
            {canCreate && (
              <button className="xh-btn xh-btn-secondary" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <RotateCcw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Import Excel
              </button>
            )}
            {canCreate && (
              <button className="xh-btn xh-btn-primary" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Tambah Item
              </button>
            )}
          </>
        }
      />

      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
        }}
      />

      <div className="flex items-start gap-2.5 rounded-xl border border-info/25 bg-info-subtle px-3.5 py-2.5 text-[11.5px] leading-relaxed text-info-subtle-foreground">
        <Info className="mt-px h-4 w-4 shrink-0" />
        <p>
          Kolom <strong>Harga</strong> bersifat opsional. Item berkategori <strong>Accessories</strong> yang memiliki
          harga akan otomatis mengisi kolom harga pada form Pengajuan kategori Headset.
        </p>
      </div>

      {uploadResult && (
        <Panel
          title="Hasil Import"
          description={`${uploadResult.success} baris berhasil, ${uploadResult.failed} baris gagal.`}
          actions={
            <button className="xh-btn xh-btn-ghost xh-btn-sm" onClick={() => setUploadResult(null)}>
              <X className="h-3.5 w-3.5" />
              Tutup
            </button>
          }
        >
          {uploadResult.errors.length ? (
            <ul className="max-h-40 space-y-1 overflow-y-auto scrollbar-thin text-[11.5px] text-danger-subtle-foreground">
              {uploadResult.errors.map((e, i) => (
                <li key={i}>• {e}</li>
              ))}
            </ul>
          ) : (
            <p className="text-[12px] text-success-subtle-foreground">Semua baris berhasil di-import.</p>
          )}
        </Panel>
      )}

      <Panel padded={false}>
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Cari kode, nama item, atau brand…" />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="xh-select w-[190px]" aria-label="Filter kategori">
            <option value="All">Semua kategori</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
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
                  icon={Boxes}
                  title="Belum ada Master Item"
                  description="Tambahkan barang pertama sebagai acuan inventaris, purchase request, dan pengajuan headset."
                  action={canCreate ? <button className="xh-btn xh-btn-primary" onClick={openCreate}><Plus className="h-4 w-4" />Tambah Item</button> : undefined}
                />
              }
            />
          )}
        </div>
      </Panel>

      <Modal
        open={formOpen}
        onClose={() => !saving && setFormOpen(false)}
        title={editing ? 'Ubah Master Item' : 'Tambah Master Item'}
        description="Harga bersifat opsional — biarkan 0 bila belum ada acuan harga."
        footer={
          <>
            <button className="xh-btn xh-btn-secondary" onClick={() => setFormOpen(false)} disabled={saving}>
              Batal
            </button>
            <SubmitButton loading={saving} onClick={submit as any}>
              {editing ? 'Simpan Perubahan' : 'Tambah Item'}
            </SubmitButton>
          </>
        }
      >
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <Field label="Kode Item" required error={errors.code} htmlFor="mi-code">
            <input id="mi-code" className="xh-input font-mono" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="mis. ACC-0001" />
          </Field>
          <Field label="Kategori" required htmlFor="mi-cat">
            <select id="mi-cat" className="xh-select" value={form.typeItem} onChange={(e) => setForm({ ...form, typeItem: e.target.value })}>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Nama Item" required error={errors.namaItem} htmlFor="mi-name">
            <input id="mi-name" className="xh-input" value={form.namaItem} onChange={(e) => setForm({ ...form, namaItem: e.target.value })} />
          </Field>
          <Field label="Brand" htmlFor="mi-brand">
            <input id="mi-brand" className="xh-input" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
          </Field>
          <Field label="Harga Satuan" error={errors.price} hint="Opsional · sumber harga otomatis untuk Pengajuan Headset" className="sm:col-span-2">
            <MoneyInput value={form.price} onChange={(n) => setForm({ ...form, price: n })} />
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Hapus Master Item?"
        message={`${confirmDelete?.namaItem} (${confirmDelete?.code}) akan dihapus permanen dari katalog.`}
        confirmLabel="Hapus"
        onConfirm={remove}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}