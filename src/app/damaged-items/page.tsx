'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { PageHeader, Panel, Field, EmptyState, TableSkeleton, StatCard } from '@/components/ui/layout';
import { DataTable, Column, Pagination, Toolbar, SearchInput, CodeBadge, StatusBadge } from '@/components/ui/data-display';
import { Modal, NumberInput, SubmitButton } from '@/components/ui/form';
import { formatDate, formatNumber } from '@/lib/format';
import { DAMAGED_STATUSES } from '@/lib/assets';
import { AlertTriangle, PackagePlus, Info, Wrench, Trash2, Plus } from 'lucide-react';

type Damaged = {
  id: number;
  date: string;
  itemCode: string | null;
  itemName: string;
  qty: number;
  nik: string | null;
  employeeName: string | null;
  vendor: string | null;
  condition: string;
  note: string | null;
  category: string | null;
  status: string;
  createdBy: string | null;
};

type Summary = {
  total: number;
  inServis: number;
  selesai: number;
  byCategory: { category: string; qty: number; records: number }[];
};

export default function DamagedItemsPage() {
  const { can, apiFetch } = useAuth();
  const { toast } = useToast();

  const [rows, setRows] = useState<Damaged[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
  const [totalDamaged, setTotalDamaged] = useState(0);
  const [summary, setSummary] = useState<Summary>({ total: 0, inServis: 0, selesai: 0, byCategory: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  // --- Kirim ke Servis (item 2) ---
  const [servisOpen, setServisOpen] = useState<Damaged | null>(null);
  const [servisForm, setServisForm] = useState({ qty: 1, note: '', serviceVendor: '', teknisiName: '' });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const canUpdate = can('transaction_headset', 'update') || can('inventory_type_item', 'update');
  const canDelete = can('transaction_headset', 'delete') || can('inventory_type_item', 'delete');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), pageSize: '10' });
      if (search.trim()) qs.set('search', search.trim());
      if (status) qs.set('status', status);
      const res = await apiFetch(`/api/damaged-items?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal memuat daftar damage');
      setRows(json.data ?? []);
      setPagination(json.pagination ?? { page, pageSize: 10, total: 0, totalPages: 1 });
      setTotalDamaged(json.totalDamaged ?? 0);
      setSummary(json.summary ?? { total: 0, inServis: 0, selesai: 0, byCategory: [] });
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

  /* ---------------- Kirim ke Servis ---------------- */

  const openServis = (row: Damaged) => {
    setServisOpen(row);
    setServisForm({ qty: row.qty, note: '', serviceVendor: row.vendor ?? '', teknisiName: '' });
    setErrors({});
  };

  const submitServis = async () => {
    if (!servisOpen) return;
    if (servisForm.qty < 1) {
      setErrors({ qty: 'Jumlah minimal 1.' });
      return;
    }
    if (servisForm.qty > servisOpen.qty) {
      setErrors({ qty: `Tidak boleh melebihi ${servisOpen.qty} unit.` });
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch('/api/damaged-items/servis', {
        method: 'POST',
        body: JSON.stringify({
          damagedId: servisOpen.id,
          qty: servisForm.qty,
          note: servisForm.note || null,
          serviceVendor: servisForm.serviceVendor || null,
          teknisiName: servisForm.teknisiName || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal mengirim aset ke servis');
      toast('success', `Aset dikirim ke servis ${json.servis?.servisCode ?? ''}. Status: Dalam Servis.`);
      setServisOpen(null);
      setPage(1);
      load();
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: Damaged) => {
    try {
      const res = await apiFetch(`/api/damaged-items?id=${row.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menghapus');
      toast('success', 'Catatan aset rusak dihapus.');
      load();
    } catch (e: any) {
      toast('error', e.message);
    }
  };

  const columns: Column<Damaged>[] = [
    { key: 'date', header: 'Tanggal', cell: (r) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(r.date)}</span> },
    {
      key: 'item',
      header: 'Item',
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{r.itemName}</p>
          <p className="truncate text-[10.5px] text-muted-foreground">
            {r.itemCode ? <CodeBadge>{r.itemCode}</CodeBadge> : r.category || '-'}
          </p>
        </div>
      ),
    },
    { key: 'category', header: 'Kategori', cell: (r) => <span className="text-[11.5px] text-muted-foreground-strong">{r.category || '-'}</span>, hideOnMobile: true },
    {
      key: 'employee',
      header: 'Pengguna',
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate text-[12px] text-foreground">{r.employeeName || '-'}</p>
          <p className="truncate font-mono text-[10.5px] text-muted-foreground">{r.nik || '-'}</p>
        </div>
      ),
      hideOnMobile: true,
    },
    { key: 'qty', header: 'Qty', numeric: true, cell: (r) => <span className="font-bold tabular-nums text-danger">{formatNumber(r.qty)}</span> },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => (
        <StatusBadge
          status={r.status}
          tone={r.status === 'Tidak Bisa Diperbaiki' ? 'danger' : r.status === 'Dalam Servis' ? 'warning' : 'neutral'}
        />
      ),
    },
    { key: 'note', header: 'Catatan', cell: (r) => <span className="text-[11.5px] text-muted-foreground">{r.note || '-'}</span>, hideOnMobile: true },
    {
      key: 'actions',
      header: 'Aksi',
      className: 'text-right',
      cell: (r) => (
        <div className="flex items-center justify-end gap-1">
          {/* Item 2: kirim aset rusak yang bisa diperbaiki ke Servis Asset. */}
          {canUpdate && r.status === 'Rusak' && r.qty > 0 && (
            <button
              className="xh-btn xh-btn-ghost h-8 w-8 p-0 text-primary"
              title="Kirim ke Servis"
              onClick={() => openServis(r)}
            >
              <Wrench className="h-4 w-4" />
            </button>
          )}
          {canDelete && r.status !== 'Dalam Servis' && (
            <button className="xh-btn xh-btn-ghost h-8 w-8 p-0 text-danger" title="Hapus catatan" onClick={() => remove(r)}>
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
        icon={AlertTriangle}
        title="Daftar Item Damage"
        description="Sumber tunggal jumlah aset rusak. Aset yang masih bisa diperbaiki dapat dikirim ke Servis Asset."
      />

      {/* Item 1: total aset rusak dihitung dari data, bukan counter. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Aset Rusak" value={formatNumber(summary.total)} icon={AlertTriangle} tone="danger" hint="Rusak + tidak bisa diperbaiki" />
        <StatCard label="Dalam Servis" value={formatNumber(summary.inServis)} icon={Wrench} tone="warning" hint="Sudah dikirim ke servis" />
        <StatCard label="Sudah Diperbaiki" value={formatNumber(summary.selesai)} icon={PackagePlus} tone="success" hint="Kembali ke stok Ready" />
        <StatCard label="Halaman Ini" value={formatNumber(totalDamaged)} icon={Plus} tone="neutral" hint="Sesuai filter aktif" />
      </div>

      {summary.byCategory.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {summary.byCategory.map((c) => (
            <span key={c.category} className="xh-chip">
              {c.category}: <strong className="tabular-nums">{formatNumber(c.qty)}</strong>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-start gap-2.5 rounded-xl border border-info/25 bg-info-subtle px-3.5 py-2.5 text-[11.5px] leading-relaxed text-info-subtle-foreground">
        <Info className="mt-px h-4 w-4 shrink-0" />
        <p>
          Aset rusak bertambah otomatis setiap proses Return pada menu Headset User memilih kondisi{' '}
          <strong>Damage</strong>, dan dari pencatatan manual di menu <strong>Inventaris &amp; Stok</strong>. Aset
          yang dikirim ke servis berpindah status menjadi <strong>Dalam Servis</strong> sehingga tidak lagi dihitung
          sebagai aset rusak.
        </p>
      </div>

      <Panel padded={false}>
        <Toolbar>
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Cari item, kode, NIK, nama karyawan, atau kategori..." />
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="xh-select w-[180px]"
            aria-label="Filter status"
          >
            <option value="">Semua status</option>
            {DAMAGED_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
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
                    icon={PackagePlus}
                    title="Belum ada aset rusak"
                    description="Bagus - belum ada aset yang tercatat rusak. Daftar akan terisi otomatis saat proses Return memilih kondisi Damage, atau saat aset rusak dicatat manual di Inventaris & Stok."
                  />
                }
              />
              <Pagination {...pagination} onPageChange={setPage} />
            </>
          )}
        </div>
      </Panel>

      {/* ---------- Kirim ke Servis ---------- */}
      <Modal
        open={!!servisOpen}
        onClose={() => !saving && setServisOpen(null)}
        title="Kirim ke Servis"
        description="Jumlah aset rusak berkurang dan berpindah menjadi aset dalam servis."
        size="sm"
        footer={
          <>
            <button className="xh-btn xh-btn-secondary" onClick={() => setServisOpen(null)} disabled={saving}>
              Batal
            </button>
            <SubmitButton loading={saving} onClick={submitServis}>
              Kirim ke Servis
            </SubmitButton>
          </>
        }
      >
        {servisOpen && (
          <div className="space-y-3.5">
            <div className="rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-[12px] text-muted-foreground-strong">
              <p>
                <span className="text-muted-foreground">Item</span> - {servisOpen.itemName}
              </p>
              <p>
                <span className="text-muted-foreground">Kategori</span> - {servisOpen.category || '-'}
              </p>
              <p>
                <span className="text-muted-foreground">Tercatat rusak</span> - {formatNumber(servisOpen.qty)} unit
              </p>
              {servisOpen.note && (
                <p>
                  <span className="text-muted-foreground">Catatan</span> - {servisOpen.note}
                </p>
              )}
            </div>
            <Field
              label="Jumlah dikirim"
              required
              error={errors.qty}
              hint="Boleh sebagian. Sisa unit tetap tercatat sebagai aset rusak."
            >
              <NumberInput
                value={servisForm.qty}
                min={1}
                onChange={(n) => setServisForm({ ...servisForm, qty: n })}
              />
            </Field>
            <Field label="Vendor / Penyedia Servis (opsional)">
              <input
                className="xh-input"
                value={servisForm.serviceVendor}
                onChange={(e) => setServisForm({ ...servisForm, serviceVendor: e.target.value })}
                placeholder="mis. PT Sinar Service"
              />
            </Field>
            <Field label="Nama Teknisi (opsional)">
              <input
                className="xh-input"
                value={servisForm.teknisiName}
                onChange={(e) => setServisForm({ ...servisForm, teknisiName: e.target.value })}
              />
            </Field>
            <Field label="Catatan Kerusakan (opsional)">
              <textarea
                className="xh-input min-h-[72px] py-2"
                value={servisForm.note}
                onChange={(e) => setServisForm({ ...servisForm, note: e.target.value })}
                placeholder="Gejala kerusakan..."
              />
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}