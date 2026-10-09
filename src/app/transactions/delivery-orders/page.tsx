'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { PageHeader, Panel, Field, EmptyState, TableSkeleton, DescList } from '@/components/ui/layout';
import { DataTable, Column, StatusBadge, Pagination, Toolbar, SearchInput, CodeBadge } from '@/components/ui/data-display';
import { Modal, MoneyInput, NumberInput, SubmitButton } from '@/components/ui/form';
import { formatRupiah, formatDate, formatNumber } from '@/lib/format';
import { Truck, PackageCheck, Plus, Info, Eye, ShoppingCart, CheckCheck } from 'lucide-react';

type Do = {
  id: number;
  doNumber: string;
  prId: number | null;
  prNumber: string | null;
  vendorName: string;
  itemCode: string | null;
  itemName: string;
  qtyOrdered: number;
  qtyReceived: number;
  price: number;
  totalValue: number;
  date: string;
  recipient: string;
  status: string;
  note: string | null;
};

const STATUS_OPTIONS = ['Pending', 'Partial', 'Received'];

export default function DeliveryOrdersPage() {
  const { can, apiFetch } = useAuth();
  const { toast } = useToast();

  const [rows, setRows] = useState<Do[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const [detail, setDetail] = useState<Do | null>(null);
  const [receiveOpen, setReceiveOpen] = useState<Do | null>(null);
  const [receiveForm, setReceiveForm] = useState({ qtyReceived: 0, recipient: '', note: '' });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const canUpdate = can('delivery_order', 'update');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), pageSize: '10' });
      if (search.trim()) qs.set('search', search.trim());
      if (status) qs.set('status', status);
      const res = await apiFetch(`/api/transactions/delivery-orders?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal memuat Delivery Order');
      setRows(json.data ?? []);
      setPagination(json.pagination ?? { page, pageSize: 10, total: (json.data ?? []).length, totalPages: 1 });
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

  const openReceive = (d: Do) => {
    setReceiveOpen(d);
    setReceiveForm({ qtyReceived: d.qtyReceived, recipient: d.recipient, note: d.note ?? '' });
    setErrors({});
  };

  const submitReceive = async () => {
    if (!receiveOpen) return;
    const e: Record<string, string> = {};
    if (receiveForm.qtyReceived < 0) e.qty = 'Qty tidak boleh negatif.';
    if (receiveForm.qtyReceived > receiveOpen.qtyOrdered) e.qty = `Qty maksimal ${receiveOpen.qtyOrdered}.`;
    setErrors(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      const res = await apiFetch('/api/transactions/delivery-orders', {
        method: 'PUT',
        body: JSON.stringify({ id: receiveOpen.id, ...receiveForm }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan penerimaan');
      toast('success', `Penerimaan ${receiveOpen.doNumber} tersimpan. Stok diperbarui otomatis bila status Received.`);
      setReceiveOpen(null);
      setDetail(null);
      load();
    } catch (err: any) {
      toast('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Do>[] = [
    {
      key: 'doNumber',
      header: 'No. DO',
      cell: (r) => (
        <button onClick={() => setDetail(r)} className="text-left font-mono text-[11.5px] font-semibold text-primary hover:underline">
          {r.doNumber}
        </button>
      ),
    },
    {
      key: 'prNumber',
      header: 'No. PR',
      cell: (r) => (r.prNumber ? <CodeBadge>{r.prNumber}</CodeBadge> : <span className="text-[11.5px] italic text-muted-foreground">manual</span>),
      hideOnMobile: true,
    },
    {
      key: 'item',
      header: 'Item',
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{r.itemName}</p>
          <p className="truncate text-[10.5px] text-muted-foreground">{r.vendorName}</p>
        </div>
      ),
    },
    {
      key: 'qty',
      header: 'Diterima / Dipesan',
      numeric: true,
      cell: (r) => (
        <span className="tabular-nums">
          <span className={r.qtyReceived >= r.qtyOrdered ? 'font-bold text-success' : 'font-semibold text-foreground'}>
            {formatNumber(r.qtyReceived)}
          </span>
          <span className="text-muted-foreground"> / {formatNumber(r.qtyOrdered)}</span>
        </span>
      ),
    },
    { key: 'totalValue', header: 'Nilai', numeric: true, cell: (r) => <span className="tabular-nums">{formatRupiah(r.totalValue || r.price * r.qtyOrdered)}</span>, hideOnMobile: true },
    { key: 'date', header: 'Tanggal', cell: (r) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(r.date)}</span>, hideOnMobile: true },
    { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions',
      header: 'Aksi',
      className: 'text-right',
      cell: (r) => (
        <div className="flex items-center justify-end gap-1">
          {canUpdate && r.status !== 'Received' && (
            <button className="xh-btn xh-btn-ghost h-8 w-8 p-0 text-success" title="Terima barang" onClick={() => openReceive(r)}>
              <CheckCheck className="h-4 w-4" />
            </button>
          )}
          <button className="xh-btn xh-btn-ghost h-8 w-8 p-0" title="Lihat detail" onClick={() => setDetail(r)}>
            <Eye className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Truck}
        title="Delivery Order"
        description="Delivery Order dibuat otomatis setiap Purchase Request disetujui. Catat penerimaan barang di sini."
      />

      <div className="flex items-start gap-2.5 rounded-xl border border-info/25 bg-info-subtle px-3.5 py-2.5 text-[11.5px] leading-relaxed text-info-subtle-foreground">
        <Info className="mt-px h-4 w-4 shrink-0" />
        <p>
          Setiap Purchase Request berstatus <strong>Approved</strong> otomatis menghasilkan satu Delivery Order per
          item, tanpa duplikat meski disetujui berkali-kali. Saat DO berstatus <strong>Received</strong>, stok
          inventori bertambah otomatis dan Purchase Request ditandai selesai bila seluruh item sudah diterima.
        </p>
      </div>

      <Panel padded={false}>
        <Toolbar>
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Cari nomor DO, nomor PR, item, atau penerima…" />
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
                    icon={Truck}
                    title="Belum ada Delivery Order"
                    description="Delivery Order akan muncul otomatis setelah ada Purchase Request yang disetujui."
                    action={
                      can('purchase_request', 'read') ? (
                        <a className="xh-btn xh-btn-secondary" href="/transactions/purchase-requests">
                          <ShoppingCart className="h-4 w-4" />
                          Lihat Purchase Request
                        </a>
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

      {/* Detail */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? `Delivery Order ${detail.doNumber}` : ''}
        size="lg"
        footer={
          detail && (
            <>
              <button className="xh-btn xh-btn-secondary" onClick={() => setDetail(null)}>
                Tutup
              </button>
              {canUpdate && detail.status !== 'Received' && (
                <button className="xh-btn xh-btn-primary" onClick={() => openReceive(detail)}>
                  <PackageCheck className="h-4 w-4" />
                  Catat Penerimaan
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
                { label: 'No. DO', value: <CodeBadge>{detail.doNumber}</CodeBadge> },
                { label: 'Status', value: <StatusBadge status={detail.status} /> },
                { label: 'Tanggal', value: formatDate(detail.date) },
                { label: 'No. PR', value: detail.prNumber || 'Delivery Order manual' },
                { label: 'Item', value: detail.itemName },
                { label: 'Kode Item', value: detail.itemCode || '-' },
                { label: 'Vendor', value: detail.vendorName },
                { label: 'Penerima', value: detail.recipient },
                { label: 'Qty dipesan', value: formatNumber(detail.qtyOrdered) },
                { label: 'Qty diterima', value: formatNumber(detail.qtyReceived) },
                { label: 'Harga satuan', value: formatRupiah(detail.price) },
                { label: 'Nilai', value: formatRupiah(detail.totalValue || detail.price * detail.qtyOrdered) },
              ]}
            />
            {detail.note && <p className="text-[12px] text-muted-foreground">Catatan: {detail.note}</p>}
          </div>
        )}
      </Modal>

      {/* Terima barang */}
      <Modal
        open={!!receiveOpen}
        onClose={() => !saving && setReceiveOpen(null)}
        title="Catat Penerimaan Barang"
        description="Qty diterima yang sama dengan qty pesanan akan menutup Delivery Order dan menambah stok."
        size="sm"
        footer={
          <>
            <button className="xh-btn xh-btn-secondary" onClick={() => setReceiveOpen(null)} disabled={saving}>
              Batal
            </button>
            <SubmitButton loading={saving} onClick={submitReceive}>
              Simpan Penerimaan
            </SubmitButton>
          </>
        }
      >
        {receiveOpen && (
          <div className="space-y-3.5">
            <div className="rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-[12px] text-muted-foreground-strong">
              <p><span className="text-muted-foreground">Item</span> · {receiveOpen.itemName}</p>
              <p><span className="text-muted-foreground">Qty dipesan</span> · {formatNumber(receiveOpen.qtyOrdered)}</p>
            </div>
            <Field label="Qty diterima" required error={errors.qty}>
              <NumberInput
                value={receiveForm.qtyReceived}
                min={0}
                max={receiveOpen.qtyOrdered}
                onChange={(n) => setReceiveForm({ ...receiveForm, qtyReceived: n })}
              />
            </Field>
            <Field label="Penerima" htmlFor="do-recv">
              <input id="do-recv" className="xh-input" value={receiveForm.recipient} onChange={(e) => setReceiveForm({ ...receiveForm, recipient: e.target.value })} />
            </Field>
            <Field label="Catatan" htmlFor="do-note">
              <textarea id="do-note" className="xh-input min-h-[70px] py-2" value={receiveForm.note} onChange={(e) => setReceiveForm({ ...receiveForm, note: e.target.value })} />
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}