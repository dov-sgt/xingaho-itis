'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { PageHeader, Panel, Field, EmptyState, TableSkeleton, DescList } from '@/components/ui/layout';
import { DataTable, Column, Toolbar, SearchInput, CodeBadge } from '@/components/ui/data-display';
import { Modal, ConfirmDialog, MoneyInput, SubmitButton } from '@/components/ui/form';
import { formatRupiah } from '@/lib/format';
import { Boxes, Upload, RotateCcw, X, Info, Tags, Settings2 } from 'lucide-react';

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

type ItemCategory = {
  id: number;
  name: string;
  code: string;
  note: string | null;
  itemCount: number;
};

const EMPTY = { code: '', typeItem: '', namaItem: '', brand: '', price: 0 };

export default function MasterItemsPage() {
  const { can, apiFetch } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [rows, setRows] = useState<MasterItem[]>([]);
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ ...EMPTY });
  const [codePreview, setCodePreview] = useState('');
  const [editing, setEditing] = useState<MasterItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<MasterItem | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: number; created: number; updated: number; failed: number; errors: string[] } | null>(null);

  // --- Master kategori item (item 3) ---
  const [catOpen, setCatOpen] = useState(false);
  const [catForm, setCatForm] = useState({ id: null as number | null, name: '', code: '', note: '' });
  const [catErrors, setCatErrors] = useState<Record<string, string>>({});

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

  const loadCategories = useCallback(async () => {
    try {
      const res = await apiFetch('/api/master/item-categories?withUsage=1');
      const json = await res.json();
      if (res.ok) setCategories(Array.isArray(json) ? json : []);
    } catch {
      setCategories([]);
    }
  }, [apiFetch]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Kategori dropdown = master kategori + kategori yang sudah dipakai item.
  const categoryOptions = useMemo(() => {
    const names = new Set(categories.map((c) => c.name));
    rows.forEach((r) => r.typeItem && names.add(r.typeItem));
    return Array.from(names).filter(Boolean).sort();
  }, [categories, rows]);

  // Item 3: pratinjau kode item berikutnya.
  useEffect(() => {
    if (editing || !form.typeItem) {
      setCodePreview('');
      return;
    }
    let cancelled = false;
    apiFetch('/api/master/item-categories', {
      method: 'POST',
      body: JSON.stringify({ name: form.typeItem }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setCodePreview(d.code ?? '');
      })
      .catch(() => {
        if (!cancelled) setCodePreview('');
      });
    return () => {
      cancelled = true;
    };
  }, [apiFetch, form.typeItem, editing]);

  const openCreate = () => {
    setForm({ ...EMPTY, typeItem: categoryOptions[0] ?? 'Computer' });
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
    // Item 3: kode tidak lagi wajib saat membuat item baru.
    if (editing && !form.code.trim()) e.code = 'Kode item wajib diisi.';
    if (!form.typeItem.trim()) e.typeItem = 'Kategori wajib diisi.';
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
      toast('success', isEdit ? `Master Item ${json.code} diperbarui.` : `Master Item ${json.code} ditambahkan.`);
      setFormOpen(false);
      load();
      loadCategories();
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
      loadCategories();
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  /* ---------------- Master kategori item ---------------- */

  const openCatCreate = () => {
    setCatForm({ id: null, name: '', code: '', note: '' });
    setCatErrors({});
    setCatOpen(true);
  };

  const openCatEdit = (c: ItemCategory) => {
    setCatForm({ id: c.id, name: c.name, code: c.code, note: c.note ?? '' });
    setCatErrors({});
    setCatOpen(true);
  };

  const submitCategory = async () => {
    const e: Record<string, string> = {};
    if (!catForm.name.trim()) e.name = 'Nama kategori wajib diisi.';
    if (!/^[A-Za-z]{2}$/.test(catForm.code.trim())) e.code = 'Kode kategori harus 2 huruf (mis. AC).';
    setCatErrors(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      const res = await apiFetch('/api/master/item-categories', {
        method: 'PUT',
        body: JSON.stringify(catForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan kategori');
      toast('success', `Kategori ${json.name} (${json.code}) disimpan.`);
      setCatOpen(false);
      loadCategories();
    } catch (err: any) {
      toast('error', err.message);
    } finally {
      setSaving(false);
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
        description="Katalog barang, harga acuan, dan kategori. Harga dipakai otomatis pada form pengajuan dan purchase request."
        actions={
          <>
            {canUpdate && (
              <button className="xh-btn xh-btn-secondary" onClick={openCatCreate} title="Kelola kategori item">
                <Settings2 className="h-4 w-4" />
                Kategori Item
              </button>
            )}
            {canCreate && (
              <button className="xh-btn xh-btn-secondary" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <RotateCcw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Import Excel
              </button>
            )}
            {canCreate && (
              <button className="xh-btn xh-btn-primary" onClick={openCreate}>
                <Boxes className="h-4 w-4" />
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
          <strong>Kode item dibuat otomatis</strong> dengan format <code className="font-mono">XHIT-KODEYYMM-URUT</code>{' '}
          (contoh <code className="font-mono">XHIT-AC2610-0001</code>). Urutan direset setiap bulan. Kolom{' '}
          <strong>Harga</strong> opsional - bila diisi, harga akan otomatis terisi pada form pengajuan dan Purchase
          Request.
        </p>
      </div>

      {uploadResult && (
        <Panel
          title="Hasil Import"
          description={`${uploadResult.created} baris baru (kode digenerate), ${uploadResult.updated} diperbarui, ${uploadResult.failed} gagal.`}
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
                <li key={i}>- {e}</li>
              ))}
            </ul>
          ) : (
            <p className="text-[12px] text-success-subtle-foreground">Semua baris berhasil di-import.</p>
          )}
        </Panel>
      )}

      <Panel padded={false}>
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Cari kode, nama item, atau brand..." />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="xh-select w-[190px]" aria-label="Filter kategori">
            <option value="All">Semua kategori</option>
            {categoryOptions.map((c) => (
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
                  description="Tambahkan barang pertama sebagai acuan inventaris, purchase request, dan pengajuan."
                  action={canCreate ? <button className="xh-btn xh-btn-primary" onClick={openCreate}><Boxes className="h-4 w-4" />Tambah Item</button> : undefined}
                />
              }
            />
          )}
        </div>
      </Panel>

      {/* ---------- Form item ---------- */}
      <Modal
        open={formOpen}
        onClose={() => !saving && setFormOpen(false)}
        title={editing ? 'Ubah Master Item' : 'Tambah Master Item'}
        description={
          editing
            ? 'Kode item tidak dapat diubah setelah item dibuat.'
            : 'Kode item dibuat otomatis oleh server bila dikosongkan.'
        }
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
          <Field
            label="Kode Item"
            error={errors.code}
            htmlFor="mi-code"
            hint={editing ? 'Kode lama tidak diubah.' : codePreview ? `Akan menjadi: ${codePreview}` : 'Kosongkan untuk generate otomatis.'}
          >
            <input
              id="mi-code"
              className="xh-input font-mono"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder={codePreview || 'otomatis'}
              readOnly={!!editing}
            />
          </Field>
          <Field label="Kategori" required error={errors.typeItem} htmlFor="mi-cat">
            <select id="mi-cat" className="xh-select" value={form.typeItem} onChange={(e) => setForm({ ...form, typeItem: e.target.value })}>
              {categoryOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nama Item" required error={errors.namaItem} htmlFor="mi-name">
            <input id="mi-name" className="xh-input" value={form.namaItem} onChange={(e) => setForm({ ...form, namaItem: e.target.value })} />
          </Field>
          <Field label="Brand" htmlFor="mi-brand">
            <input id="mi-brand" className="xh-input" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
          </Field>
          <Field
            label="Harga Satuan"
            error={errors.price}
            hint="Opsional - sumber harga otomatis untuk Pengajuan dan Purchase Request"
            className="sm:col-span-2"
          >
            <MoneyInput value={form.price} onChange={(n) => setForm({ ...form, price: n })} />
          </Field>
        </form>
      </Modal>

      {/* ---------- Master kategori item (item 3) ---------- */}
      <Modal
        open={catOpen}
        onClose={() => !saving && setCatOpen(false)}
        title={catForm.id ? 'Ubah Kategori Item' : 'Tambah Kategori Item'}
        description="Kode kategori (2 huruf) dipakai sebagai bagian dari kode item otomatis."
        size="lg"
        footer={
          <>
            <button className="xh-btn xh-btn-secondary" onClick={() => setCatOpen(false)} disabled={saving}>
              Tutup
            </button>
            <SubmitButton loading={saving} onClick={submitCategory}>
              Simpan Kategori
            </SubmitButton>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Nama Kategori" required error={catErrors.name} className="sm:col-span-2">
              <input
                className="xh-input"
                value={catForm.name}
                onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                placeholder="mis. Computer"
              />
            </Field>
            <Field label="Kode (2 huruf)" required error={catErrors.code} hint="A-Z">
              <input
                className="xh-input font-mono uppercase"
                maxLength={2}
                value={catForm.code}
                onChange={(e) => setCatForm({ ...catForm, code: e.target.value.toUpperCase() })}
                placeholder="CP"
              />
            </Field>
            <Field label="Keterangan (opsional)" className="sm:col-span-3">
              <input className="xh-input" value={catForm.note} onChange={(e) => setCatForm({ ...catForm, note: e.target.value })} />
            </Field>
          </div>

          <div>
            <p className="xh-section-title mb-2">Kategori Terdaftar ({categories.length})</p>
            {categories.length === 0 ? (
              <EmptyState icon={Settings2} title="Belum ada kategori terdaftar" description="Kategori dibuat otomatis saat item pertama memakai kategori tersebut." />
            ) : (
              <div className="xh-table-wrapper max-h-64 overflow-y-auto">
                <table className="xh-table">
                  <thead>
                    <tr>
                      <th scope="col">Kategori</th>
                      <th scope="col">Kode</th>
                      <th scope="col" className="text-right">Item</th>
                      <th scope="col" className="text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((c) => (
                      <tr key={c.id}>
                        <td className="font-medium text-foreground">{c.name}</td>
                        <td><CodeBadge>{c.code}</CodeBadge></td>
                        <td className="num tabular-nums">{c.itemCount}</td>
                        <td className="text-right">
                          {canUpdate && (
                            <button className="xh-btn xh-btn-ghost h-7 w-7 p-0" title="Ubah" onClick={() => openCatEdit(c)}>
                              <Tags className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <DescList
            items={[
              { label: 'Format kode', value: <code className="font-mono text-[12px]">XHIT-[KODE][YY][MM]-[URUT]</code> },
              { label: 'Contoh', value: <code className="font-mono text-[12px]">XHIT-AC2610-0001</code> },
              { label: 'Reset urutan', value: 'Per kategori, setiap awal bulan (zona Asia/Jakarta)' },
            ]}
          />
        </div>
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