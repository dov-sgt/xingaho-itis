'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { PageHeader, Panel, Field, EmptyState, TableSkeleton, DescList } from '@/components/ui/layout';
import { DataTable, Column, StatusBadge, CodeBadge, Toolbar, SearchInput } from '@/components/ui/data-display';
import { Modal, ConfirmDialog, MoneyInput, SubmitButton } from '@/components/ui/form';
import { formatRupiah, formatDate } from '@/lib/format';
import { HEADSET_ITEM_CATEGORY } from '@/lib/config';
import { FileText, Plus, Info, Eye, Trash2, Check, X, PackageSearch } from 'lucide-react';

type Submission = {
  id: number;
  submissionCode: string;
  date: string;
  vendorName: string;
  nik: string | null;
  karyawanName: string | null;
  project: string | null;
  title: string;
  description: string | null;
  category: string;
  proposedPrice: number;
  status: string;
  adminNote: string | null;
  namaPembuat: string | null;
  itemCode: string | null;
  itemName: string | null;
  priceSnapshot: number | null;
  approvedAt: string | null;
};

type CatalogItem = { code: string; namaItem: string; brand: string; price: number | null; typeItem: string };

const CATEGORIES = ['Headset', 'Laptop', 'Aksesoris', 'Printer', 'Lainnya'];

/** Kategori Headset mewajibkan pemilihan item katalog (item 13). */
const requiresItem = (c: string) => c.trim().toLowerCase() === 'headset';

export default function VendorSubmissionsPage() {
  const { can, apiFetch, user } = useAuth();
  const { toast } = useToast();

  const [rows, setRows] = useState<Submission[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    namaPembuat: '',
    vendorName: '',
    title: '',
    description: '',
    category: 'Headset',
    itemCode: '',
    proposedPrice: 0,
    nik: '',
    karyawanName: '',
    project: '',
  });

  const [detail, setDetail] = useState<Submission | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<Submission | null>(null);
  const [busy, setBusy] = useState(false);

  const canCreate = can('vendor_submission', 'create');
  const canUpdate = can('vendor_submission', 'update');
  const canDelete = can('vendor_submission', 'delete');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (search.trim()) qs.set('search', search.trim());
      if (status) qs.set('status', status);

      const res = await apiFetch(`/api/transactions/vendor-submissions?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal memuat pengajuan');
      setRows(Array.isArray(json) ? json : (json.data ?? []));
    } catch (e: any) {
      toast('error', e.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, search, status, toast]);

  useEffect(() => {
    load();
  }, [load]);

  // Katalog item kategori Accessories (item 13).
  useEffect(() => {
    apiFetch(`/api/master/items?category=${encodeURIComponent(HEADSET_ITEM_CATEGORY)}`)
      .then((r) => r.json())
      .then((d) => setCatalog(Array.isArray(d) ? d : []))
      .catch(() => setCatalog([]));
  }, [apiFetch]);

  const openCreate = () => {
    setForm({
      namaPembuat: user?.name ?? '',
      vendorName: 'Swapro',
      title: '',
      description: '',
      category: 'Headset',
      itemCode: '',
      proposedPrice: 0,
      nik: '',
      karyawanName: '',
      project: '',
    });
    setErrors({});
    setFormOpen(true);
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e: Record<string, string> = {};
    if (!form.namaPembuat.trim()) e.namaPembuat = 'Nama Pembuat wajib diisi.';
    if (!form.vendorName.trim()) e.vendorName = 'Vendor wajib diisi.';
    if (!form.title.trim()) e.title = 'Judul pengajuan wajib diisi.';
    // Item 13: validasi Headset tanpa item terpilih ditolak.
    if (requiresItem(form.category) && !form.itemCode) {
      e.itemCode = `Kategori Headset wajib memilih Nama Item dari kategori ${HEADSET_ITEM_CATEGORY}.`;
    }
    setErrors(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      const res = await apiFetch('/api/transactions/vendor-submissions', {
        method: 'POST',
        body: JSON.stringify({ ...form, itemCode: form.itemCode || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.details?.join(', ') || 'Gagal menyimpan');

      toast('success', `Pengajuan ${json.submissionCode} berhasil dibuat.`);
      setFormOpen(false);
      load();
    } catch (err: any) {
      toast('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const decide = async (s: Submission, next: 'Approved' | 'Rejected') => {
    setBusy(true);
    try {
      const res = await apiFetch('/api/transactions/vendor-submissions', {
        method: 'PUT',
        body: JSON.stringify({ id: s.id, status: next, adminNote: adminNote || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal memproses pengajuan');

      toast(
        'success',
        next === 'Approved'
          ? `Pengajuan disetujui${json.transactionItemId ? ' â€” headset tercatat dengan status Used.' : '.'}`
          : 'Pengajuan ditolak.',
      );
      setDetail(null);
      setAdminNote('');
      load();
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    try {
      const res = await apiFetch(`/api/transactions/vendor-submissions?id=${confirmDelete.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menghapus');
      toast('success', 'Pengajuan dihapus.');
      setConfirmDelete(null);
      load();
    } catch (e: any) {
      toast('error', e.message);
    }
  };

  const selectedItem = catalog.find((c) => c.code === form.itemCode) ?? null;

  const columns: Column<Submission>[] = [
    {
      key: 'code',
      header: 'No. Pengajuan',
      cell: (r) => (
        <button onClick={() => setDetail(r)} className="text-left font-mono text-[11.5px] font-semibold text-primary hover:underline">
          {r.submissionCode}
        </button>
      ),
    },
    {
      key: 'title',
      header: 'Judul',
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{r.title}</p>
          <p className="truncate text-[10.5px] text-muted-foreground">{r.itemName || r.description || '-'}</p>
        </div>
      ),
    },
    {
      key: 'namaPembuat',
      header: 'Nama Pembuat',
      cell: (r) => <span className="text-[12px] text-muted-foreground-strong">{r.namaPembuat || '-'}</span>,
    },
    { key: 'category', header: 'Kategori', cell: (r) => <CodeBadge>{r.category}</CodeBadge>, hideOnMobile: true },
    {
      key: 'price',
      header: 'Estimasi',
      numeric: true,
      cell: (r) => <span className="tabular-nums">{formatRupiah(r.proposedPrice)}</span>,
      hideOnMobile: true,
    },
    { key: 'date', header: 'Tanggal', cell: (r) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(r.date)}</span>, hideOnMobile: true },
    { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions',
      header: 'Aksi',
      className: 'text-right',
      cell: (r) => (
        <div className="flex items-center justify-end gap-1">
          <button className="xh-btn xh-btn-ghost h-8 w-8 p-0" title="Lihat detail" onClick={() => { setDetail(r); setAdminNote(r.adminNote ?? ''); }}>
            <Eye className="h-4 w-4" />
          </button>
          {canUpdate && r.status === 'Pending' && (
            <>
              <button className="xh-btn xh-btn-ghost h-8 w-8 p-0 text-success" title="Setujui" onClick={() => decide(r, 'Approved')}>
                <Check className="h-4 w-4" />
              </button>
              <button className="xh-btn xh-btn-ghost h-8 w-8 p-0 text-danger" title="Tolak" onClick={() => decide(r, 'Rejected')}>
                <X className="h-4 w-4" />
              </button>
            </>
          )}
          {canDelete && (
            <button className="xh-btn xh-btn-ghost h-8 w-8 p-0 text-danger" title="Hapus" onClick={() => setConfirmDelete(r)}>
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
        icon={FileText}
        title="Pengajuan"
        description="Pengajuan equipment ke vendor. Untuk kategori Headset, pilih item katalog agar harga terisi otomatis."
        actions={
          canCreate && (
            <button className="xh-btn xh-btn-primary" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Buat Pengajuan
            </button>
          )
        }
      />

      <Panel padded={false}>
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Cari nomor, judul, atau nama pembuatâ€¦" />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="xh-select w-[170px]" aria-label="Filter status">
            <option value="">Semua status</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </Toolbar>
        <div className="p-3 sm:p-4">
          {loading ? (
            <TableSkeleton rows={6} cols={6} />
          ) : (
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(r) => r.id}
              empty={
                <EmptyState
                  icon={FileText}
                  title="Belum ada pengajuan"
                  description="Buat pengajuan equipment pertama. Pengajuan yang disetujui akan otomatis tercatat pada Headset User dengan status Used."
                  action={canCreate ? <button className="xh-btn xh-btn-primary" onClick={openCreate}><Plus className="h-4 w-4" />Buat Pengajuan</button> : undefined}
                />
              }
            />
          )}
        </div>
      </Panel>

      {/* ---------- Form ---------- */}
      <Modal
        open={formOpen}
        onClose={() => !saving && setFormOpen(false)}
        title="Buat Pengajuan"
        description="Nama Pembuat wajib diisi. Untuk kategori Headset, pilih item dari kategori Accessories."
        size="lg"
        footer={
          <>
            <button className="xh-btn xh-btn-secondary" onClick={() => setFormOpen(false)} disabled={saving}>
              Batal
            </button>
            <SubmitButton loading={saving} onClick={submit as any}>
              Simpan Pengajuan
            </SubmitButton>
          </>
        }
      >
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <Field label="Nama Pembuat" required error={errors.namaPembuat} htmlFor="vs-nama">
            <input
              id="vs-nama"
              className="xh-input"
              value={form.namaPembuat}
              onChange={(e) => setForm({ ...form, namaPembuat: e.target.value })}
              placeholder="Nama lengkap pembuat pengajuan"
            />
          </Field>
          <Field label="Kategori" required htmlFor="vs-cat">
            <select id="vs-cat" className="xh-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value, itemCode: '' })}>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>

          {/* Item 13 */}
          {requiresItem(form.category) && (
            <Field
              label="Nama Item"
              required
              error={errors.itemCode}
              htmlFor="vs-item"
              hint={catalog.length === 0 ? `Belum ada item berkategori ${HEADSET_ITEM_CATEGORY} di Master Inventory.` : `Hanya menampilkan item kategori ${HEADSET_ITEM_CATEGORY}.`}
              className="sm:col-span-2"
            >
              <select
                id="vs-item"
                className="xh-select"
                value={form.itemCode}
                onChange={(e) => {
                  const it = catalog.find((c) => c.code === e.target.value);
                  setForm({
                    ...form,
                    itemCode: e.target.value,
                    // Harga terisi otomatis dari Master Item dan read-only.
                    proposedPrice: it?.price ?? 0,
                  });
                }}
              >
                <option value="">â€” Pilih item{catalog.length === 0 ? ' (katalog kosong)' : ''} â€”</option>
                {catalog.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.namaItem} Â· {c.brand} Â· {c.code}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <Field
            label="Harga"
            htmlFor="vs-price"
            hint={
              requiresItem(form.category)
                ? selectedItem && selectedItem.price == null
                  ? 'Item ini belum memiliki harga di Master Inventory â€” isi manual atau lengkapi harga master item.'
                  : selectedItem
                    ? 'Terisi otomatis dari Master Inventory (hanya-baca).'
                    : 'Pilih item terlebih dahulu untuk mengisi harga otomatis.'
                : 'Estimasi biaya pengajuan.'
            }
          >
            {requiresItem(form.category) && selectedItem ? (
              <div className="relative">
                <MoneyInput value={form.proposedPrice} onChange={() => {}} />
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase text-muted-foreground">
                  read-only
                </span>
              </div>
            ) : (
              <MoneyInput value={form.proposedPrice} onChange={(n) => setForm({ ...form, proposedPrice: n })} />
            )}
          </Field>

          <Field label="Vendor" required error={errors.vendorName}>
            <input className="xh-input" value={form.vendorName} onChange={(e) => setForm({ ...form, vendorName: e.target.value })} />
          </Field>
          <Field label="Judul Pengajuan" required error={errors.title} className="sm:col-span-2">
            <input className="xh-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Contoh: Pengajuan Headset Karyawan Baru" />
          </Field>
          <Field label="NIK" htmlFor="vs-nik">
            <input id="vs-nik" className="xh-input" value={form.nik} onChange={(e) => setForm({ ...form, nik: e.target.value })} />
          </Field>
          <Field label="Nama Karyawan">
            <input className="xh-input" value={form.karyawanName} onChange={(e) => setForm({ ...form, karyawanName: e.target.value })} />
          </Field>
          <Field label="Project">
            <input className="xh-input" value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} />
          </Field>
          <Field label="Deskripsi" className="sm:col-span-2">
            <textarea className="xh-input min-h-[80px] py-2" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>

          {requiresItem(form.category) && catalog.length === 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-subtle px-3 py-2.5 text-[11.5px] text-warning-subtle-foreground sm:col-span-2">
              <Info className="mt-px h-4 w-4 shrink-0" />
              <p className="flex-1">
                Master Inventory belum memiliki item berkategori <strong>{HEADSET_ITEM_CATEGORY}</strong>. Tambahkan
                item beserta harga pada menu Master Inventory agar harga dapat terisi otomatis.
              </p>
              <button className="xh-btn xh-btn-secondary xh-btn-sm shrink-0" onClick={() => window.location.assign('/master/items')}>
                <PackageSearch className="h-3.5 w-3.5" />
                Master Item
              </button>
            </div>
          )}
        </form>
      </Modal>

      {/* ---------- Detail ---------- */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? `Pengajuan ${detail.submissionCode}` : ''}
        size="lg"
        footer={
          detail && (
            <>
              <button className="xh-btn xh-btn-secondary" onClick={() => setDetail(null)}>
                Tutup
              </button>
              {canUpdate && detail.status === 'Pending' && (
                <>
                  <button className="xh-btn xh-btn-danger" onClick={() => decide(detail, 'Rejected')} disabled={busy}>
                    Tolak
                  </button>
                  <button className="xh-btn xh-btn-primary" onClick={() => decide(detail, 'Approved')} disabled={busy}>
                    <Check className="h-4 w-4" />
                    Setujui
                  </button>
                </>
              )}
            </>
          )
        }
      >
        {detail && (
          <div className="space-y-4">
            <DescList
              items={[
                { label: 'Nomor', value: <CodeBadge>{detail.submissionCode}</CodeBadge> },
                { label: 'Status', value: <StatusBadge status={detail.status} /> },
                { label: 'Tanggal', value: formatDate(detail.date) },
                { label: 'Nama Pembuat', value: detail.namaPembuat || '-' },
                { label: 'Judul', value: detail.title },
                { label: 'Kategori', value: detail.category },
                { label: 'Vendor', value: detail.vendorName },
                { label: 'Item dipilih', value: detail.itemName ? `${detail.itemName}${detail.itemCode ? ` (${detail.itemCode})` : ''}` : '-' },
                { label: 'Estimasi Biaya', value: formatRupiah(detail.proposedPrice) },
                { label: 'NIK', value: detail.nik || '-' },
                { label: 'Karyawan', value: detail.karyawanName || '-' },
                { label: 'Project', value: detail.project || '-' },
              ]}
            />
            {detail.description && detail.description !== '-' && (
              <div>
                <p className="xh-section-title mb-1">Deskripsi</p>
                <p className="text-[12.5px] text-muted-foreground-strong">{detail.description}</p>
              </div>
            )}
            {canUpdate && detail.status === 'Pending' && (
              <Field label="Catatan Admin" hint="Disimpan bersama keputusan persetujuan">
                <textarea className="xh-input min-h-[72px] py-2" value={adminNote} onChange={(e) => setAdminNote(e.target.value)} />
              </Field>
            )}
            {detail.adminNote && (
              <div>
                <p className="xh-section-title mb-1">Catatan Admin</p>
                <p className="text-[12.5px] text-muted-foreground-strong">{detail.adminNote}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Hapus pengajuan?"
        message={`Pengajuan ${confirmDelete?.submissionCode} akan dihapus permanen.`}
        confirmLabel="Hapus"
        onConfirm={remove}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}