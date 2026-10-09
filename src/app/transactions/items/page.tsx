'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { PageHeader, Panel, Field, EmptyState, TableSkeleton, DescList } from '@/components/ui/layout';
import { DataTable, Column, StatusBadge, Pagination, Toolbar, SearchInput } from '@/components/ui/data-display';
import { Modal, ConfirmDialog, MoneyInput, NumberInput, SubmitButton } from '@/components/ui/form';
import { formatRupiah, formatDate, formatNumber } from '@/lib/format';
import { VALID_CONDITIONS, VALID_RETURN_CONDITIONS, RETURN_CONDITION_LABELS } from '@/lib/headset';
import {
  Headphones, Plus, Download, Upload, Undo2, Check, X, Trash2,
  FileSpreadsheet, RotateCcw, Info, AlertTriangle, Loader2,
} from 'lucide-react';

type Tx = {
  id: number;
  date: string;
  employeeCategory: string;
  nik: string;
  name: string;
  condition: string;
  vendor: string;
  deposit: number;
  note: string | null;
  project: string | null;
  status: string;
  itemCode: string | null;
  itemName: string | null;
  returnCondition: string | null;
  returnNote: string | null;
  returnedAt: string | null;
  approvedBy: string | null;
  updatedAt: string;
};

const STATUS_TABS = ['Semua', 'Pending', 'Used', 'Good', 'Damage', 'Reject'] as const;

const EMPTY = {
  date: new Date().toISOString().slice(0, 10),
  employeeCategory: 'New Employee',
  nik: '',
  name: '',
  condition: 'New Use',
  vendor: 'Swapro',
  project: 'GoTo',
  deposit: 100000,
  note: '',
};

export default function TransactionItemsPage() {
  const { can, apiFetch, user } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [rows, setRows] = useState<Tx[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('Semua');
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ ...EMPTY });

  const [detail, setDetail] = useState<Tx | null>(null);
  const [returnOpen, setReturnOpen] = useState<Tx | null>(null);
  const [returnForm, setReturnForm] = useState({ condition: '', note: '', price: 0 });
  const [returnBusy, setReturnBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Tx | null>(null);
  // Item 10: sebelum approve/reject harus tampilkan ringkasan detail dulu.
  const [decision, setDecision] = useState<{ tx: Tx; action: 'approve' | 'reject' } | null>(null);
  const [decisionBusy, setDecisionBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

  const canCreate = can('transaction_headset', 'create');
  const canUpdate = can('transaction_headset', 'update');
  const canDelete = can('transaction_headset', 'delete');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), pageSize: '10' });
      if (search.trim()) qs.set('search', search.trim());
      if (status && status !== 'Semua') qs.set('status', status);

      const res = await apiFetch(`/api/transactions/items?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal memuat data headset');

      setRows(json.data ?? []);
      setPagination(json.pagination ?? { page: 1, pageSize: 10, total: 0, totalPages: 1 });
    } catch (e: any) {
      toast('error', e.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, page, search, status, toast]);

  useEffect(() => {
    load();
  }, [load]);

  // ---------- Item 7: unduh template import ----------
  const downloadTemplate = async (format: 'xlsx' | 'csv') => {
    try {
      const res = await apiFetch(`/api/transactions/items/template?format=${format}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Gagal membuat template');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `template-import-headset-user.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast('success', `Template .${format} berhasil diunduh.`);
    } catch (e: any) {
      toast('error', e.message);
    }
  };

  // ---------- Import ----------
  const upload = async (file: File) => {
    setUploading(true);
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await apiFetch('/api/transactions/items/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal mengunggah file');

      setImportResult(json);
      toast(json.failed ? 'warning' : 'success', `Import selesai: ${json.success} berhasil, ${json.failed} gagal.`);
      load();
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  // ---------- Approve -> Used ----------
  const applyDecision = async () => {
    if (!decision) return;
    const { tx, action } = decision;
    const nextStatus = action === 'approve' ? 'Used' : 'Reject';
    setDecisionBusy(true);
    try {
      const res = await apiFetch('/api/transactions/items', {
        method: 'PUT',
        body: JSON.stringify({ id: tx.id, status: nextStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan perubahan');
      toast(
        'success',
        action === 'approve'
          ? `${tx.nik} disetujui - status menjadi Used.`
          : `Pengajuan ${tx.nik} ditolak.`,
      );
      if (detail?.id === tx.id) setDetail({ ...tx, status: nextStatus });
      setDecision(null);
      load();
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      setDecisionBusy(false);
    }
  };

  // ---------- Item 11: Return dengan kondisi wajib ----------
  const openReturn = (tx: Tx) => {
    setReturnOpen(tx);
    setReturnForm({ condition: '', note: '', price: tx.deposit ?? 0 });
    setErrors({});
  };

  const submitReturn = async () => {
    if (!returnOpen) return;
    if (!returnForm.condition) {
      setErrors({ condition: 'Kondisi pengembalian wajib dipilih (Good atau Damage).' });
      return;
    }
    setReturnBusy(true);
    try {
      const res = await apiFetch('/api/transactions/items', {
        method: 'PUT',
        body: JSON.stringify({
          id: returnOpen.id,
          returnCondition: returnForm.condition,
          returnPrice: returnForm.price,
          returnNote: returnForm.note || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal memproses pengembalian');

      toast(
        'success',
        returnForm.condition === 'Good'
          ? 'Pengembalian diproses - stok Headset bertambah.'
          : 'Pengembalian diproses - item dicatat sebagai Damage (stok tidak bertambah).',
      );
      setReturnOpen(null);
      setDetail(null);
      load();
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      setReturnBusy(false);
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    try {
      const res = await apiFetch(`/api/transactions/items?id=${confirmDelete.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menghapus');
      toast('success', 'Data headset dihapus.');
      setConfirmDelete(null);
      load();
    } catch (e: any) {
      toast('error', e.message);
    }
  };

  const create = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e: Record<string, string> = {};
    if (!form.nik.trim()) e.nik = 'NIK wajib diisi.';
    if (!form.name.trim()) e.name = 'Nama wajib diisi.';
    setErrors(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      const res = await apiFetch('/api/transactions/items', { method: 'POST', body: JSON.stringify(form) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.details?.join(', ') || 'Gagal menyimpan');
      toast('success', 'Pengajuan headset berhasil dibuat.');
      setFormOpen(false);
      setForm({ ...EMPTY });
      setPage(1);
      load();
    } catch (err: any) {
      toast('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Tx>[] = [
    {
      key: 'nik',
      header: 'NIK',
      cell: (r) => (
        <button onClick={() => setDetail(r)} className="text-left font-mono text-[11.5px] font-semibold text-primary hover:underline">
          {r.nik}
        </button>
      ),
    },
    {
      key: 'name',
      header: 'Nama',
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{r.name}</p>
          <p className="truncate text-[10.5px] text-muted-foreground">
            {[r.project, r.vendor].filter(Boolean).join(' - ') || '-'}
          </p>
        </div>
      ),
    },
    { key: 'date', header: 'Tanggal', cell: (r) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(r.date)}</span>, hideOnMobile: true },
    {
      key: 'item',
      header: 'Item',
      cell: (r) => <span className="text-[11.5px] text-muted-foreground">{r.itemName || '-'}</span>,
      hideOnMobile: true,
    },
    { key: 'deposit', header: 'Deposit', numeric: true, cell: (r) => <span className="tabular-nums">{formatRupiah(r.deposit)}</span>, hideOnMobile: true },
    { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions',
      header: 'Aksi',
      className: 'text-right',
      cell: (r) => (
        <div className="flex items-center justify-end gap-1">
          {canUpdate && r.status === 'Pending' && (
            <>
              <button className="xh-btn xh-btn-ghost h-8 w-8 p-0 text-success" title="Setujui (Used)" onClick={() => setDecision({ tx: r, action: 'approve' })}>
                <Check className="h-4 w-4" />
              </button>
              <button className="xh-btn xh-btn-ghost h-8 w-8 p-0 text-danger" title="Tolak" onClick={() => setDecision({ tx: r, action: 'reject' })}>
                <X className="h-4 w-4" />
              </button>
            </>
          )}
          {canUpdate && r.status === 'Used' && (
            <button className="xh-btn xh-btn-ghost h-8 w-8 p-0 text-primary" title="Return / Kembalikan" onClick={() => openReturn(r)}>
              <Undo2 className="h-4 w-4" />
            </button>
          )}
          {canDelete && r.status !== 'Used' && (
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
        icon={Headphones}
        title="Headset User"
        description="Siklus peminjaman headset: Pending -> Used -> Good (stok bertambah) atau Damage (masuk daftar damage)."
        actions={
          <>
            {/* Item 7 */}
            <button className="xh-btn xh-btn-secondary" onClick={() => downloadTemplate('xlsx')} title="Unduh template Excel (.xlsx)">
              <FileSpreadsheet className="h-4 w-4" />
              Download Template
            </button>
            {canCreate && (
              <button className="xh-btn xh-btn-secondary" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <RotateCcw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Import
              </button>
            )}
            {canCreate && (
              <button className="xh-btn xh-btn-primary" onClick={() => { setForm({ ...EMPTY }); setErrors({}); setFormOpen(true); }}>
                <Plus className="h-4 w-4" />
                Pengajuan Headset
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

      {/* Info alur */}
      <div className="flex items-start gap-2.5 rounded-xl border border-info/25 bg-info-subtle px-3.5 py-2.5 text-[11.5px] leading-relaxed text-info-subtle-foreground">
        <Info className="mt-px h-4 w-4 shrink-0" />
        <p>
          <strong>Used</strong> saat pengajuan disetujui - <strong>Return</strong> wajib memilih kondisi.{' '}
          <strong>Good</strong> menambah stok Headset, <strong>Damage</strong> masuk Daftar Damage tanpa menambah
          stok. Status <strong>Used</strong> tidak dapat dihapus sebelum dikembalikan.
        </p>
      </div>

      {importResult && (
        <Panel
          title="Hasil Import"
          description={`${importResult.success} baris berhasil, ${importResult.failed} baris gagal.`}
          actions={
            <button className="xh-btn xh-btn-ghost xh-btn-sm" onClick={() => setImportResult(null)}>
              <X className="h-3.5 w-3.5" />
              Tutup
            </button>
          }
        >
          {importResult.errors.length > 0 ? (
            <ul className="max-h-40 space-y-1 overflow-y-auto scrollbar-thin text-[11.5px] text-danger-subtle-foreground">
              {importResult.errors.map((e, i) => (
                <li key={i}>- {e}</li>
              ))}
            </ul>
          ) : (
            <p className="text-[12px] text-success-subtle-foreground">Semua baris berhasil di-import.</p>
          )}
        </Panel>
      )}

      {/* Tab status */}
      <div className="flex flex-wrap gap-1.5">
        {STATUS_TABS.map((t) => (
          <button
            key={t}
            onClick={() => {
              setStatus(t);
              setPage(1);
            }}
            className={
              status === t
                ? 'xh-btn xh-btn-primary h-8 px-3 text-[11.5px]'
                : 'xh-btn xh-btn-secondary h-8 px-3 text-[11.5px]'
            }
          >
            {t}
          </button>
        ))}
      </div>

      <Panel padded={false}>
        <Toolbar>
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Cari NIK, nama, vendor, atau project..." />
        </Toolbar>
        <div className="p-3 sm:p-4">
          {loading ? (
            <TableSkeleton rows={6} cols={6} />
          ) : (
            <>
              <DataTable
                columns={columns}
                rows={rows}
                rowKey={(r) => r.id}
                empty={
                  <EmptyState
                    icon={Headphones}
                    title="Belum ada data headset"
                    description="Buat pengajuan headset baru, atau unduh template Excel untuk mengimpor banyak data sekaligus."
                    action={
                      canCreate ? (
                        <div className="flex gap-2">
                          <button className="xh-btn xh-btn-secondary" onClick={() => downloadTemplate('xlsx')}>
                            <Download className="h-4 w-4" />
                            Download Template
                          </button>
                          <button className="xh-btn xh-btn-primary" onClick={() => setFormOpen(true)}>
                            <Plus className="h-4 w-4" />
                            Pengajuan Headset
                          </button>
                        </div>
                      ) : undefined
                    }
                  />
                }
              />
              <Pagination {...pagination} onPageChange={setPage} />
            </>
          )}
        </div>
      </Panel>

      {/* ---------- Form ---------- */}
      <Modal
        open={formOpen}
        onClose={() => !saving && setFormOpen(false)}
        title="Pengajuan Headset"
        description="Pengajuan baru selalu berstatus Pending hingga disetujui."
        footer={
          <>
            <button className="xh-btn xh-btn-secondary" onClick={() => setFormOpen(false)} disabled={saving}>
              Batal
            </button>
            <SubmitButton loading={saving} onClick={create as any}>
              Simpan Pengajuan
            </SubmitButton>
          </>
        }
      >
        <form onSubmit={create} className="grid gap-3 sm:grid-cols-2">
          <Field label="NIK" required error={errors.nik}>
            <input className="xh-input" value={form.nik} onChange={(e) => setForm({ ...form, nik: e.target.value })} placeholder="Nomor induk karyawan" />
          </Field>
          <Field label="Nama Karyawan" required error={errors.name}>
            <input className="xh-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama lengkap" />
          </Field>
          <Field label="Tanggal">
            <input type="date" className="xh-input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label="Kategori Karyawan">
            <select className="xh-select" value={form.employeeCategory} onChange={(e) => setForm({ ...form, employeeCategory: e.target.value })}>
              <option>New Employee</option>
              <option>Existing Employee</option>
            </select>
          </Field>
          <Field label="Kondisi">
            <select className="xh-select" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
              {VALID_CONDITIONS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Vendor">
            <input className="xh-input" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
          </Field>
          <Field label="Project">
            <input className="xh-input" value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} />
          </Field>
          <Field label="Deposit" hint="Nominal Rupiah">
            <MoneyInput value={form.deposit} onChange={(n) => setForm({ ...form, deposit: n })} />
          </Field>
          <Field label="Catatan" className="sm:col-span-2">
            <textarea className="xh-input min-h-[72px] py-2" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </Field>
        </form>
      </Modal>

      {/* ---------- Return (kondisi wajib) ---------- */}
      <Modal
        open={!!returnOpen}
        onClose={() => !returnBusy && setReturnOpen(null)}
        title="Kembalikan Headset"
        description="Kondisi pengembalian wajib dipilih dan menentukan perlakuan stok."
        size="sm"
        footer={
          <>
            <button className="xh-btn xh-btn-secondary" onClick={() => setReturnOpen(null)} disabled={returnBusy}>
              Batal
            </button>
            <SubmitButton loading={returnBusy} onClick={submitReturn}>
              Proses Pengembalian
            </SubmitButton>
          </>
        }
      >
        <div className="space-y-4">
          {returnOpen && (
            <div className="rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-[12px] text-muted-foreground-strong">
              <p><span className="text-muted-foreground">NIK</span> - <span className="font-mono">{returnOpen.nik}</span></p>
              <p><span className="text-muted-foreground">Nama</span> - {returnOpen.name}</p>
              <p><span className="text-muted-foreground">Item</span> - {returnOpen.itemName || 'Headset'}</p>
            </div>
          )}

          <Field label="Kondisi Pengembalian" required error={errors.condition}>
            <div className="grid gap-2">
              {VALID_RETURN_CONDITIONS.map((c) => (
                <label
                  key={c}
                  className={
                    returnForm.condition === c
                      ? 'flex cursor-pointer items-start gap-2.5 rounded-lg border border-primary bg-primary-subtle px-3 py-2.5'
                      : 'flex cursor-pointer items-start gap-2.5 rounded-lg border border-border px-3 py-2.5 transition-colors hover:bg-muted'
                  }
                >
                  <input
                    type="radio"
                    name="returnCondition"
                    value={c}
                    checked={returnForm.condition === c}
                    onChange={() => setReturnForm({ ...returnForm, condition: c })}
                    className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]"
                  />
                  <span className="min-w-0">
                    <span className="block text-[12.5px] font-semibold text-foreground">{c}</span>
                    <span className="block text-[11px] text-muted-foreground">{RETURN_CONDITION_LABELS[c]}</span>
                  </span>
                </label>
              ))}
            </div>
          </Field>

          {returnForm.condition === 'Damage' && (
            <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-subtle px-3 py-2.5 text-[11.5px] text-warning-subtle-foreground">
              <AlertTriangle className="mt-px h-4 w-4 shrink-0" />
              <p>Item akan dicatat pada <strong>Daftar Damage</strong> dan <strong>tidak menambah</strong> stok inventori.</p>
            </div>
          )}

          <Field label="Nilai Kompensasi" hint="Opsional - diisi bila ada potongan deposit">
            <MoneyInput value={returnForm.price} onChange={(n) => setReturnForm({ ...returnForm, price: n })} />
          </Field>

          <Field label="Catatan Pengembalian">
            <textarea
              className="xh-input min-h-[72px] py-2"
              value={returnForm.note}
              onChange={(e) => setReturnForm({ ...returnForm, note: e.target.value })}
              placeholder="Kondisi fisik, kelengkapan aksesori, dll."
            />
          </Field>
        </div>
      </Modal>

      {/* ---------- Detail ---------- */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title="Detail Headset User"
        size="lg"
        footer={
          detail && (
            <>
              <button className="xh-btn xh-btn-secondary" onClick={() => setDetail(null)}>
                Tutup
              </button>
              {canUpdate && detail.status === 'Pending' && (
                <button className="xh-btn xh-btn-primary" onClick={() => { setDecision({ tx: detail, action: 'approve' }); }}>
                  Setujui (Used)
                </button>
              )}
              {canUpdate && detail.status === 'Used' && (
                <button className="xh-btn xh-btn-primary" onClick={() => openReturn(detail)}>
                  <Undo2 className="h-4 w-4" />
                  Return
                </button>
              )}
            </>
          )
        }
      >
        {detail && (
          <div className="space-y-4">
            <DescList
              items={[
                { label: 'NIK', value: <span className="font-mono">{detail.nik}</span> },
                { label: 'Nama', value: detail.name },
                { label: 'Status', value: <StatusBadge status={detail.status} /> },
                { label: 'Tanggal', value: formatDate(detail.date) },
                { label: 'Kategori Karyawan', value: detail.employeeCategory },
                { label: 'Item', value: detail.itemName || '-' },
                { label: 'Kondisi', value: detail.condition },
                { label: 'Vendor', value: detail.vendor },
                { label: 'Project', value: detail.project || '-' },
                { label: 'Deposit', value: formatRupiah(detail.deposit) },
                { label: 'Disetujui oleh', value: detail.approvedBy || '-' },
                { label: 'Dikembalikan', value: detail.returnedAt ? formatDate(detail.returnedAt) : '-' },
              ]}
            />
            {detail.note && <p className="text-[12px] text-muted-foreground">Catatan: {detail.note}</p>}
            {detail.returnNote && (
              <p className="text-[12px] text-muted-foreground">Catatan return: {detail.returnNote}</p>
            )}
          </div>
        )}
      </Modal>

      {/* ---------- Item 10: popup konfirmasi detail sebelum submit ---------- */}
      <Modal
        open={!!decision}
        onClose={() => !decisionBusy && setDecision(null)}
        title={decision?.action === 'approve' ? 'Konfirmasi Persetujuan' : 'Konfirmasi Penolakan'}
        description={
          decision?.action === 'approve'
            ? 'Periksa detail berikut. Status akan diubah menjadi Used dan headset langsung tercatat dipakai.'
            : 'Periksa detail berikut. Status akan diubah menjadi Reject.'
        }
        size="md"
        footer={
          <>
            <button className="xh-btn xh-btn-secondary" onClick={() => setDecision(null)} disabled={decisionBusy}>
              Batal
            </button>
            <button
              className={decision?.action === 'approve' ? 'xh-btn xh-btn-primary' : 'xh-btn xh-btn-danger'}
              onClick={applyDecision}
              disabled={decisionBusy}
            >
              {decisionBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {decision?.action === 'approve' ? 'Ya, Setujui' : 'Ya, Tolak'}
            </button>
          </>
        }
      >
        {decision && (
          <div className="space-y-4">
            <DescList
              items={[
                { label: 'NIK', value: <span className="font-mono">{decision.tx.nik}</span> },
                { label: 'Nama', value: decision.tx.name },
                { label: 'Status saat ini', value: <StatusBadge status={decision.tx.status} /> },
                { label: 'Tanggal pengajuan', value: formatDate(decision.tx.date) },
                { label: 'Kategori karyawan', value: decision.tx.employeeCategory },
                { label: 'Item', value: decision.tx.itemName || 'Headset' },
                { label: 'Kode item', value: decision.tx.itemCode || '-' },
                { label: 'Kondisi', value: decision.tx.condition },
                { label: 'Vendor', value: decision.tx.vendor || '-' },
                { label: 'Project', value: decision.tx.project || '-' },
                { label: 'Deposit', value: formatRupiah(decision.tx.deposit) },
                { label: 'Catatan', value: decision.tx.note || '-' },
              ]}
            />
            <div
              className={
                decision.action === 'approve'
                  ? 'flex items-start gap-2.5 rounded-xl border border-info/25 bg-info-subtle px-3.5 py-2.5 text-[11.5px] leading-relaxed text-info-subtle-foreground'
                  : 'flex items-start gap-2.5 rounded-xl border border-danger/25 bg-danger-subtle px-3.5 py-2.5 text-[11.5px] leading-relaxed text-danger-subtle-foreground'
              }
            >
              <Info className="mt-px h-4 w-4 shrink-0" />
              <p>
                {decision.action === 'approve'
                  ? 'Setelah disetujui, item berstatus Used dan dapat dikembalikan lewat tombol Return dengan memilih kondisi Good atau Damage.'
                  : 'Pengajuan yang ditolak tidak dapat diproses lagi. Data tetap tersimpan sebagai riwayat dengan status Reject.'}
              </p>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Hapus data headset?"
        message={`Data ${confirmDelete?.nik} - ${confirmDelete?.name} akan dihapus permanen.`}
        confirmLabel="Hapus"
        onConfirm={remove}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}