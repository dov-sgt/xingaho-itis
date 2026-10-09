'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { PageHeader, Panel, Field, EmptyState, TableSkeleton, StatCard } from '@/components/ui/layout';
import { DataTable, Column, Pagination, Toolbar, SearchInput } from '@/components/ui/data-display';
import { Modal, NumberInput, SubmitButton } from '@/components/ui/form';
import { formatNumber, formatDateTime } from '@/lib/format';
import { ArrowDownToLine, PackageSearch, TrendingUp, Info } from 'lucide-react';

type History = {
  id: number;
  date: string;
  category: string;
  stock: number;
  inQty: number;
  outQty: number;
  note: string | null;
  updateBy: string | null;
};

type Stock = { id: number; itemName: string; itemCode: string | null; category: string; currentStock: number };

export default function StockInPage() {
  const { can, apiFetch } = useAuth();
  const { toast } = useToast();

  const [rows, setRows] = useState<History[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [stocks, setStocks] = useState<Stock[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ stockId: '', qty: 1, note: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const canUpdate = can('inventory_type_item', 'update');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), pageSize: '10' });
      if (search.trim()) qs.set('search', search.trim());
      const res = await apiFetch(`/api/stock-in?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal memuat riwayat stock in');
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
    apiFetch('/api/inventory')
      .then((r) => r.json())
      .then((d) => setStocks(d.stocks ?? []))
      .catch(() => setStocks([]));
  }, [apiFetch]);

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e: Record<string, string> = {};
    if (!form.stockId) e.stockId = 'Pilih barang.';
    if (form.qty < 1) e.qty = 'Qty minimal 1.';
    setErrors(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      const res = await apiFetch('/api/stock-in', {
        method: 'POST',
        body: JSON.stringify({ stockId: Number(form.stockId), qty: form.qty, note: form.note || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan');
      toast('success', 'Penerimaan stok tersimpan.');
      setFormOpen(false);
      setForm({ stockId: '', qty: 1, note: '' });
      setPage(1);
      load();
    } catch (err: any) {
      toast('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<History>[] = [
    { key: 'date', header: 'Waktu', cell: (r) => <span className="whitespace-nowrap text-[11.5px] text-muted-foreground">{formatDateTime(r.date)}</span> },
    { key: 'category', header: 'Kategori', cell: (r) => <span className="text-[11.5px] text-muted-foreground-strong">{r.category}</span>, hideOnMobile: true },
    { key: 'note', header: 'Keterangan', cell: (r) => <span className="text-[11.5px] text-muted-foreground-strong">{r.note || '-'}</span> },
    {
      key: 'inQty',
      header: 'Masuk',
      numeric: true,
      cell: (r) => <span className="font-bold tabular-nums text-success">+{formatNumber(r.inQty)}</span>,
    },
    { key: 'stock', header: 'Saldo', numeric: true, cell: (r) => <span className="font-bold tabular-nums text-foreground">{formatNumber(r.stock)}</span> },
    { key: 'updateBy', header: 'Oleh', cell: (r) => <span className="text-[11.5px] text-muted-foreground">{r.updateBy || '-'}</span>, hideOnMobile: true },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        icon={ArrowDownToLine}
        title="Stock In"
        description="Penerimaan barang ke gudang. Setiap penerimaan langsung menambah ready stock."
        actions={
          canUpdate && (
            <button className="xh-btn xh-btn-primary" onClick={() => setFormOpen(true)}>
              <ArrowDownToLine className="h-4 w-4" />
              Catat Penerimaan
            </button>
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Total Riwayat" value={formatNumber(pagination.total)} icon={TrendingUp} tone="primary" />
        <StatCard label="Total Unit Masuk" value={formatNumber(rows.reduce((s, r) => s + r.inQty, 0))} hint="Pada halaman ini" icon={ArrowDownToLine} tone="success" />
        <StatCard label="Jenis Barang" value={formatNumber(stocks.length)} icon={PackageSearch} tone="info" />
      </div>

      <div className="flex items-start gap-2.5 rounded-xl border border-info/25 bg-info-subtle px-3.5 py-2.5 text-[11.5px] leading-relaxed text-info-subtle-foreground">
        <Info className="mt-px h-4 w-4 shrink-0" />
        <p>
          Setiap penerimaan berjalan dalam <strong>satu transaksi database</strong>: ready stock bertambah dan histori
          tercatat bersamaan, sehingga tidak pernah ada selisih antara saldo dan riwayat.
        </p>
      </div>

      <Panel padded={false}>
        <Toolbar>
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Cari keterangan penerimaan..." />
        </Toolbar>
        <div className="p-3 sm:p-4">
          {loading ? (
            <TableSkeleton rows={8} cols={5} />
          ) : (
            <>
              <DataTable
                columns={columns}
                rows={rows}
                rowKey={(r) => r.id}
                empty={
                  <EmptyState
                    icon={ArrowDownToLine}
                    title="Belum ada penerimaan stok"
                    description="Catat penerimaan barang pertama, atau tunggu Delivery Order berstatus Received yang otomatis menambah stok."
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
        title="Catat Penerimaan Stok"
        size="sm"
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
        <div className="space-y-3.5">
          <Field label="Barang" required error={errors.stockId}>
            <select className="xh-select" value={form.stockId} onChange={(e) => setForm({ ...form, stockId: e.target.value })}>
              <option value="">- Pilih barang -</option>
              {stocks.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.itemName} (stok {formatNumber(s.currentStock)})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Qty Masuk" required error={errors.qty}>
            <NumberInput value={form.qty} min={1} onChange={(n) => setForm({ ...form, qty: n })} />
          </Field>
          <Field label="Catatan">
            <textarea className="xh-input min-h-[72px] py-2" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}