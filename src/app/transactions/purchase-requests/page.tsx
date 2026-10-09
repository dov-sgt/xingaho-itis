'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { PageHeader, Panel, Field, EmptyState, TableSkeleton, DescList } from '@/components/ui/layout';
import { DataTable, Column, StatusBadge, Pagination, Toolbar, SearchInput, CodeBadge } from '@/components/ui/data-display';
import { Modal, ConfirmDialog, MoneyInput, NumberInput, SubmitButton } from '@/components/ui/form';
import { formatRupiah, formatDate, formatNumber } from '@/lib/format';
import { round2 } from '@/lib/documents';
import { ShoppingCart, Plus, Printer, Trash2, X, CheckCircle2, Eye, FileText, TrendingUp, Package } from 'lucide-react';

type PrItem = {
  id?: number;
  itemCode?: string | null;
  itemName: string;
  qty: number;
  price: number;
  totalPrice: number;
};

type Pr = {
  id: number;
  prNumber: string;
  date: string;
  typeItem: string;
  itemCode: string | null;
  itemName: string;
  biaya: number;
  qty: number;
  diskon: number;
  shipmentCost: number;
  totalPrice: number;
  grandTotal: number;
  note: string | null;
  details: string | null;
  status: string;
  requesterName: string | null;
  createdBy: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  items: PrItem[];
};

type CatalogItem = { code: string; namaItem: string; brand: string; price: number | null; typeItem: string };

const EMPTY_LINE: PrItem = { itemName: '', qty: 1, price: 0, totalPrice: 0 };

const STATUS_OPTIONS = ['Pending', 'Approved', 'Rejected', 'Ordered', 'Completed'];

const CATEGORY_OPTIONS = ['Computer', 'Headset', 'Printer', 'Aksesoris', 'Lainnya'];

const TRANSITIONS: Record<string, string[]> = {
  Pending: ['Approved', 'Rejected'],
  Approved: ['Ordered', 'Completed', 'Rejected'],
  Rejected: ['Pending'],
  Ordered: ['Completed'],
  Completed: [],
};

export default function PurchaseRequestsPage() {
  const { can, apiFetch, user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [rows, setRows] = useState<Pr[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
  const [summary, setSummary] = useState({ totalCount: 0, totalSpending: 0 });
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    typeItem: 'Computer',
    requesterName: '',
    note: '',
    details: '',
    shipmentCost: 0,
    diskon: 0,
  });
  const [lines, setLines] = useState<PrItem[]>([{ ...EMPTY_LINE }]);

  const [detail, setDetail] = useState<Pr | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Pr | null>(null);
  const [busyStatus, setBusyStatus] = useState<number | null>(null);

  const canCreate = can('purchase_request', 'create');
  const canUpdate = can('purchase_request', 'update');
  const canDelete = can('purchase_request', 'delete');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), pageSize: '10' });
      if (search.trim()) qs.set('search', search.trim());
      if (status) qs.set('status', status);

      const res = await apiFetch(`/api/transactions/purchase-requests?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal memuat Purchase Request');

      setRows(json.data ?? []);
      setPagination(json.pagination ?? { page: 1, pageSize: 10, total: 0, totalPages: 1 });
      setSummary(json.summary ?? { totalCount: 0, totalSpending: 0 });
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

  useEffect(() => {
    if (!formOpen) return;
    apiFetch('/api/master/items')
      .then((r) => r.json())
      .then((d) => setCatalog(Array.isArray(d) ? d : []))
      .catch(() => setCatalog([]));
  }, [formOpen, apiFetch]);

  // Kalkulasi realtime di form (server tetap menghitung ulang saat menyimpan).
  const totals = useMemo(() => {
    const lines_ = lines.map((l) => ({ ...l, totalPrice: round2(Math.max(1, l.qty) * Math.max(0, l.price)) }));
    const totalPrice = round2(lines_.reduce((s, l) => s + l.totalPrice, 0));
    const grandTotal = round2(totalPrice + Math.max(0, form.shipmentCost) - Math.max(0, form.diskon));
    return { lines: lines_, totalPrice, grandTotal };
  }, [lines, form.shipmentCost, form.diskon]);

  const resetForm = () => {
    setForm({ typeItem: 'Computer', requesterName: user?.name ?? '', note: '', details: '', shipmentCost: 0, diskon: 0 });
    setLines([{ ...EMPTY_LINE }]);
    setErrors({});
  };

  const openCreate = () => {
    resetForm();
    setFormOpen(true);
  };

  const setLine = (i: number, patch: Partial<PrItem>) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.requesterName.trim()) e.requesterName = 'Nama pemohon wajib diisi.';
    if (lines.length === 0) e.lines = 'Minimal satu baris item.';
    lines.forEach((l, i) => {
      if (!l.itemName.trim()) e[`line-${i}`] = 'Nama item wajib diisi.';
      if (l.qty < 1) e[`qty-${i}`] = 'Qty minimal 1.';
      if (l.price < 0) e[`price-${i}`] = 'Harga tidak boleh negatif.';
    });
    if (form.shipmentCost < 0) e.shipmentCost = 'Shipment Cost tidak boleh negatif.';
    if (form.diskon < 0) e.diskon = 'Discount tidak boleh negatif.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const res = await apiFetch('/api/transactions/purchase-requests', {
        method: 'POST',
        body: JSON.stringify({
          typeItem: form.typeItem,
          requesterName: form.requesterName.trim(),
          note: form.note || null,
          details: form.details || null,
          shipmentCost: form.shipmentCost,
          diskon: form.diskon,
          items: totals.lines.map((l) => ({
            itemCode: l.itemCode ?? null,
            itemName: l.itemName.trim(),
            qty: l.qty,
            price: l.price,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.details?.join(', ') || 'Gagal menyimpan');

      toast('success', `Purchase Request ${json.prNumber} berhasil dibuat.`);
      setFormOpen(false);
      setPage(1);
      load();
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (pr: Pr, next: string) => {
    setBusyStatus(pr.id);
    try {
      const res = await apiFetch('/api/transactions/purchase-requests', {
        method: 'PUT',
        body: JSON.stringify({ id: pr.id, status: next }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal mengubah status');

      if (next === 'Approved' && json.deliveryOrders?.length) {
        toast('success', `${pr.prNumber} disetujui. Delivery Order dibuat: ${json.deliveryOrders.join(', ')}.`);
      } else {
        toast('success', `Status ${pr.prNumber} diubah menjadi ${next}.`);
      }
      if (detail?.id === pr.id) setDetail({ ...pr, status: next });
      load();
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      setBusyStatus(null);
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    try {
      const res = await apiFetch(`/api/transactions/purchase-requests?id=${confirmDelete.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menghapus');
      toast('success', `${confirmDelete.prNumber} dihapus.`);
      setConfirmDelete(null);
      setDetail(null);
      load();
    } catch (e: any) {
      toast('error', e.message);
    }
  };

  const columns: Column<Pr>[] = [
    {
      key: 'prNumber',
      header: 'No. PR',
      cell: (r) => (
        <button
          onClick={() => setDetail(r)}
          className="text-left font-semibold text-primary hover:underline"
        >
          {r.prNumber}
        </button>
      ),
    },
    { key: 'date', header: 'Tanggal', cell: (r) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(r.date)}</span> },
    {
      key: 'itemName',
      header: 'Item',
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{r.itemName}</p>
          <p className="truncate text-[10.5px] text-muted-foreground">{r.requesterName || r.createdBy || '-'}</p>
        </div>
      ),
    },
    { key: 'qty', header: 'Qty', numeric: true, cell: (r) => formatNumber(r.qty), hideOnMobile: true },
    {
      key: 'totalPrice',
      header: 'Total Price',
      numeric: true,
      cell: (r) => <span className="tabular-nums">{formatRupiah(r.totalPrice)}</span>,
      hideOnMobile: true,
    },
    {
      key: 'grandTotal',
      header: 'Grand Total',
      numeric: true,
      cell: (r) => <span className="font-bold tabular-nums text-foreground">{formatRupiah(r.grandTotal || r.totalPrice)}</span>,
    },
    { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions',
      header: 'Aksi',
      cell: (r) => (
        <div className="flex items-center justify-end gap-1">
          {canUpdate && (TRANSITIONS[r.status] ?? []).length > 0 && (
            <select
              aria-label={`Ubah status ${r.prNumber}`}
              value=""
              onChange={(e) => e.target.value && changeStatus(r, e.target.value)}
              disabled={busyStatus === r.id}
              className="xh-select h-8 w-[104px] text-[11.5px]"
            >
              <option value="">Ubahâ€¦</option>
              {(TRANSITIONS[r.status] ?? []).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
          <button className="xh-btn xh-btn-ghost h-8 w-8 p-0" title="Lihat detail" onClick={() => setDetail(r)}>
            <Eye className="h-4 w-4" />
          </button>
          <button className="xh-btn xh-btn-ghost h-8 w-8 p-0" title="Cetak PDF" onClick={() => openPrint(r)}>
            <Printer className="h-4 w-4" />
          </button>
          {canDelete && r.status === 'Pending' && (
            <button className="xh-btn xh-btn-ghost h-8 w-8 p-0 text-danger" title="Hapus" onClick={() => setConfirmDelete(r)}>
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
      className: 'text-right',
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        icon={ShoppingCart}
        title="Purchase Request"
        description="Pengadaan barang: harga satuan, shipment cost, discount, dan grand total dihitung otomatis."
        actions={
          canCreate && (
            <button className="xh-btn xh-btn-primary" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Buat Purchase Request
            </button>
          )
        }
      />

      {/* Ringkasan */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat label="Total PR" value={formatNumber(summary.totalCount)} icon={FileText} />
        <MiniStat label="Nilai Pengadaan" value={formatRupiah(summary.totalSpending)} icon={TrendingUp} />
        <MiniStat label="Pending" value={formatNumber(rows.filter((r) => r.status === 'Pending').length)} icon={ShoppingCart} />
        <MiniStat label="Approved" value={formatNumber(rows.filter((r) => r.status === 'Approved').length)} icon={CheckCircle2} />
      </div>

      <Panel padded={false}>
        <Toolbar>
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Cari nomor PR, item, atau pemohonâ€¦" />
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="xh-select w-[170px]" aria-label="Filter status">
            <option value="">Semua status</option>
            {STATUS_OPTIONS.map((s) => (
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
                    icon={ShoppingCart}
                    title="Belum ada Purchase Request"
                    description="Buat purchase request pertama untuk mulai mencatat pengajuan pengadaan barang."
                    action={canCreate ? <button className="xh-btn xh-btn-primary" onClick={openCreate}><Plus className="h-4 w-4" />Buat PR</button> : undefined}
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
        title="Buat Purchase Request"
        description="Tambahkan baris item, atur biaya kirim dan discount. Grand total dihitung otomatis."
        size="xl"
        footer={
          <>
            <button className="xh-btn xh-btn-secondary" onClick={() => setFormOpen(false)} disabled={saving}>
              Batal
            </button>
            <SubmitButton loading={saving} onClick={submit as any}>
              Simpan Purchase Request
            </SubmitButton>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Kategori" required>
              <select className="xh-select" value={form.typeItem} onChange={(e) => setForm({ ...form, typeItem: e.target.value })}>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Nama Pemohon" required error={errors.requesterName} htmlFor="pr-requester">
              <input
                id="pr-requester"
                className="xh-input"
                value={form.requesterName}
                onChange={(e) => setForm({ ...form, requesterName: e.target.value })}
                placeholder="Nama lengkap pemohon"
              />
            </Field>
            <Field label="Catatan" htmlFor="pr-note">
              <input id="pr-note" className="xh-input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Opsional" />
            </Field>
          </div>

          {/* Baris item */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="xh-section-title">Rincian Item</p>
              <button type="button" className="xh-btn xh-btn-secondary xh-btn-sm" onClick={() => setLines((p) => [...p, { ...EMPTY_LINE }])}>
                <Plus className="h-3.5 w-3.5" />
                Tambah Baris
              </button>
            </div>

            <div className="space-y-2">
              {lines.map((line, i) => (
                <div key={i} className="rounded-lg border border-border bg-surface-raised p-3">
                  <div className="grid gap-2 sm:grid-cols-12">
                    <div className="sm:col-span-5">
                      <Field label={`Nama Item ${i + 1}`} required error={errors[`line-${i}`]}>
                        <input
                          list="pr-catalog"
                          className="xh-input"
                          value={line.itemName}
                          onChange={(e) => {
                            const match = catalog.find((c) => c.namaItem === e.target.value);
                            setLine(i, { itemName: e.target.value, itemCode: match?.code ?? null, price: match?.price ?? line.price });
                          }}
                          placeholder="Ketik atau pilih dari Master Inventory"
                        />
                        <datalist id="pr-catalog">
                          {catalog.map((c) => (
                            <option key={c.code} value={c.namaItem}>
                              {c.code} â€” {c.brand}
                            </option>
                          ))}
                        </datalist>
                      </Field>
                    </div>
                    <div className="sm:col-span-2">
                      <Field label="Qty" required error={errors[`qty-${i}`]}>
                        <NumberInput value={line.qty} min={1} onChange={(n) => setLine(i, { qty: n })} />
                      </Field>
                    </div>
                    <div className="sm:col-span-4">
                      <Field label="Harga Satuan" required error={errors[`price-${i}`]}>
                        <MoneyInput value={line.price} onChange={(n) => setLine(i, { price: n })} />
                      </Field>
                    </div>
                    <div className="flex items-end sm:col-span-1">
                      <button
                        type="button"
                        className="xh-btn xh-btn-ghost h-9 w-9 p-0 text-danger"
                        onClick={() => setLines((p) => (p.length === 1 ? p : p.filter((_, idx) => idx !== i)))}
                        disabled={lines.length === 1}
                        aria-label={`Hapus baris ${i + 1}`}
                        title="Hapus baris"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-right text-[11.5px] text-muted-foreground">
                    Total Price baris ini:{' '}
                    <span className="font-bold tabular-nums text-foreground">
                      {formatRupiah(round2(line.qty * line.price))}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Ringkasan biaya â€” sticky */}
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <Field label="Detail / Spesifikasi" htmlFor="pr-details" className="self-start">
              <textarea
                id="pr-details"
                className="xh-input h-auto min-h-[92px] py-2"
                value={form.details}
                onChange={(e) => setForm({ ...form, details: e.target.value })}
                placeholder="Spesifikasi teknis atau keterangan tambahanâ€¦"
              />
            </Field>

            <div className="rounded-xl border border-primary/25 bg-primary-subtle/50 p-4">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-primary-subtle-foreground">
                Ringkasan Biaya
              </p>
              <dl className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[12px] text-muted-foreground-strong">Total Price</dt>
                  <dd className="text-[13px] font-semibold tabular-nums text-foreground">{formatRupiah(totals.totalPrice)}</dd>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Shipment Cost" error={errors.shipmentCost}>
                    <MoneyInput value={form.shipmentCost} onChange={(n) => setForm({ ...form, shipmentCost: n })} />
                  </Field>
                  <Field label="Discount" error={errors.diskon}>
                    <MoneyInput value={form.diskon} onChange={(n) => setForm({ ...form, diskon: n })} />
                  </Field>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-primary/20 pt-2">
                  <dt className="text-[12.5px] font-bold text-foreground">Grand Total</dt>
                  <dd className="text-lg font-bold tabular-nums text-primary-subtle-foreground">{formatRupiah(totals.grandTotal)}</dd>
                </div>
                <p className="text-[10.5px] leading-relaxed text-muted-foreground">
                  Grand Total = Total Price + Shipment Cost âˆ’ Discount. Nilai final dihitung ulang oleh server saat
                  disimpan.
                </p>
              </dl>
            </div>
          </div>
        </form>
      </Modal>

      {/* ---------- Detail ---------- */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? `Purchase Request ${detail.prNumber}` : ''}
        description="Rincian dokumen, rincian biaya, dan status persetujuan."
        size="xl"
        footer={
          detail && (
            <>
              <button className="xh-btn xh-btn-secondary" onClick={() => setDetail(null)}>
                Tutup
              </button>
              <button className="xh-btn xh-btn-primary" onClick={() => openPrint(detail)}>
                <Printer className="h-4 w-4" />
                Cetak PDF
              </button>
            </>
          )
        }
      >
        {detail && (
          <div className="space-y-5">
            <DescList
              items={[
                { label: 'Nomor PR', value: <CodeBadge>{detail.prNumber}</CodeBadge> },
                { label: 'Tanggal', value: formatDate(detail.date) },
                { label: 'Status', value: <StatusBadge status={detail.status} /> },
                { label: 'Kategori', value: detail.typeItem },
                { label: 'Pemohon', value: detail.requesterName || detail.createdBy || '-' },
                { label: 'Disetujui oleh', value: detail.approvedBy || '-' },
              ]}
            />

            <div>
              <p className="xh-section-title mb-2">Rincian Item</p>
              <div className="xh-table-wrapper">
                <table className="xh-table">
                  <thead>
                    <tr>
                      <th scope="col">Item</th>
                      <th scope="col" className="text-right">Qty</th>
                      <th scope="col" className="text-right">Harga Satuan</th>
                      <th scope="col" className="text-right">Total Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detail.items?.length
                      ? detail.items
                      : [{ itemName: detail.itemName, qty: detail.qty, price: detail.biaya, totalPrice: detail.totalPrice }]
                    ).map((it, i) => (
                      <tr key={i}>
                        <td className="font-medium text-foreground">{it.itemName}</td>
                        <td className="num">{formatNumber(it.qty)}</td>
                        <td className="num">{formatRupiah(it.price)}</td>
                        <td className="num font-semibold">{formatRupiah(it.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="ml-auto max-w-sm space-y-1.5 rounded-lg border border-border bg-surface-raised p-3.5">
              <SummaryRow label="Total Price" value={formatRupiah(detail.totalPrice)} />
              <SummaryRow label="Shipment Cost" value={formatRupiah(detail.shipmentCost)} />
              <SummaryRow label="Discount" value={`âˆ’ ${formatRupiah(detail.diskon)}`} />
              <div className="mt-1.5 flex items-center justify-between border-t border-border pt-2">
                <span className="text-[12.5px] font-bold text-foreground">Grand Total</span>
                <span className="text-[15px] font-bold tabular-nums text-primary">{formatRupiah(detail.grandTotal || detail.totalPrice)}</span>
              </div>
            </div>

            {detail.note && (
              <div>
                <p className="xh-section-title mb-1">Catatan</p>
                <p className="text-[12.5px] text-muted-foreground-strong">{detail.note}</p>
              </div>
            )}
            {detail.details && detail.details !== '-' && (
              <div>
                <p className="xh-section-title mb-1">Detail</p>
                <p className="text-[12.5px] text-muted-foreground-strong">{detail.details}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Hapus Purchase Request?"
        message={
          <>
            Purchase Request <strong>{confirmDelete?.prNumber}</strong> akan dihapus permanen. Delivery Order yang sudah
            dibuat dari PR ini tetap tersimpan sebagai riwayat.
          </>
        }
        confirmLabel="Hapus"
        onConfirm={remove}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );

  function openPrint(pr: Pr) {
    router.push(`/print/purchase-request/${pr.id}`);
  }
}

function MiniStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="surface-card flex items-center gap-3 p-3.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-subtle text-primary-subtle-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="truncate text-[15px] font-bold tabular-nums text-foreground">{value}</p>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[12px] text-muted-foreground-strong">{label}</span>
      <span className="text-[12.5px] font-semibold tabular-nums text-foreground">{value}</span>
    </div>
  );
}