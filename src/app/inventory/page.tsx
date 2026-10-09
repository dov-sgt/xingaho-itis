'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { PageHeader, Panel, Field, EmptyState, TableSkeleton, StatCard } from '@/components/ui/layout';
import { DataTable, Column, StatusBadge, Pagination, Toolbar, SearchInput, CodeBadge } from '@/components/ui/data-display';
import { Modal, NumberInput, SubmitButton } from '@/components/ui/form';
import { formatNumber, formatDateTime } from '@/lib/format';
import { LOW_STOCK_THRESHOLD } from '@/lib/config';
import {
  PackageSearch, Laptop, Wrench, TrendingUp, TrendingDown, ArrowDownToLine, ArrowUpFromLine,
} from 'lucide-react';

type Stock = {
  id: number;
  itemCode: string | null;
  itemName: string;
  category: string;
  currentStock: number;
  inStock: number;
  outStock: number;
  note: string | null;
  updatedAt: string;
};

type Laptop = { id: number; item: string; user: string; status: string; date: string };
type Broken = { id: number; itemType: string; qty: number; brokenCount: number; note: string | null; date: string };
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

type Tab = 'stok' | 'histori' | 'laptop' | 'broken';

export default function InventoryPage() {
  const { can, apiFetch } = useAuth();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>('stok');
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [laptops, setLaptops] = useState<Laptop[]>([]);
  const [broken, setBroken] = useState<Broken[]>([]);
  const [history, setHistory] = useState<History[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [inOpen, setInOpen] = useState(false);
  const [outOpen, setOutOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [movement, setMovement] = useState({ stockId: '', qty: 1, note: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const canUpdate = can('inventory_type_item', 'update');
  const canReadHistory = can('inventory_type_item', 'read');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/inventory');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal memuat data inventaris');
      setStocks(json.stocks ?? []);
      setLaptops(json.laptops ?? []);
      setBroken(json.brokenAssets ?? []);

      if (canReadHistory) {
        const h = await apiFetch('/api/inventory/history');
        if (h.ok) setHistory(await h.json());
      }
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, canReadHistory, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return stocks;
    return stocks.filter(
      (s) =>
        s.itemName.toLowerCase().includes(q) ||
        (s.itemCode ?? '').toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q),
    );
  }, [stocks, search]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const totals = useMemo(
    () => ({
      totalItems: stocks.length,
      totalQty: stocks.reduce((s, r) => s + r.currentStock, 0),
      lowStock: stocks.filter((s) => s.currentStock < LOW_STOCK_THRESHOLD).length,
      inTotal: stocks.reduce((s, r) => s + r.inStock, 0),
      outTotal: stocks.reduce((s, r) => s + r.outStock, 0),
    }),
    [stocks],
  );

  const submitMovement = async (direction: 'in' | 'out') => {
    if (!movement.stockId) {
      setErrors({ stockId: 'Pilih barang.' });
      return;
    }
    if (movement.qty < 1) {
      setErrors({ qty: 'Qty minimal 1.' });
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const res = await apiFetch('/api/inventory', {
        method: 'POST',
        body: JSON.stringify({ stockId: Number(movement.stockId), qty: movement.qty, note: movement.note || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan pergerakan stok');
      toast('success', direction === 'in' ? 'Penerimaan stok tersimpan.' : 'Pengeluaran stok tersimpan.');
      setInOpen(false);
      setOutOpen(false);
      setMovement({ stockId: '', qty: 1, note: '' });
      load();
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const stockColumns: Column<Stock>[] = [
    {
      key: 'item',
      header: 'Barang',
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{r.itemName}</p>
          {r.itemCode && <p className="truncate"><CodeBadge>{r.itemCode}</CodeBadge></p>}
        </div>
      ),
    },
    { key: 'category', header: 'Kategori', cell: (r) => <span className="text-[11.5px] text-muted-foreground-strong">{r.category}</span>, hideOnMobile: true },
    {
      key: 'currentStock',
      header: 'Ready Stock',
      numeric: true,
      cell: (r) => (
        <span className={r.currentStock < LOW_STOCK_THRESHOLD ? 'font-bold text-danger tabular-nums' : 'font-bold tabular-nums text-foreground'}>
          {formatNumber(r.currentStock)}
        </span>
      ),
    },
    { key: 'inStock', header: 'Total Masuk', numeric: true, cell: (r) => <span className="tabular-nums text-success">{formatNumber(r.inStock)}</span>, hideOnMobile: true },
    { key: 'outStock', header: 'Total Keluar', numeric: true, cell: (r) => <span className="tabular-nums text-muted-foreground">{formatNumber(r.outStock)}</span>, hideOnMobile: true },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => (r.currentStock < LOW_STOCK_THRESHOLD ? <StatusBadge status="Stok Menipis" tone="danger" /> : <StatusBadge status="Aman" tone="success" />),
    },
    {
      key: 'updatedAt',
      header: 'Diperbarui',
      cell: (r) => <span className="whitespace-nowrap text-[11px] text-muted-foreground">{formatDateTime(r.updatedAt)}</span>,
      hideOnMobile: true,
    },
  ];

  const historyColumns: Column<History>[] = [
    { key: 'date', header: 'Waktu', cell: (r) => <span className="whitespace-nowrap text-[11.5px] text-muted-foreground">{formatDateTime(r.date)}</span> },
    { key: 'category', header: 'Kategori', cell: (r) => <CodeBadge>{r.category}</CodeBadge>, hideOnMobile: true },
    { key: 'note', header: 'Keterangan', cell: (r) => <span className="text-[11.5px] text-muted-foreground-strong">{r.note || '-'}</span> },
    {
      key: 'inQty',
      header: 'Masuk',
      numeric: true,
      cell: (r) => <span className="font-semibold tabular-nums text-success">{r.inQty ? `+${r.inQty}` : '—'}</span>,
    },
    {
      key: 'outQty',
      header: 'Keluar',
      numeric: true,
      cell: (r) => <span className="font-semibold tabular-nums text-danger">{r.outQty ? `−${r.outQty}` : '—'}</span>,
    },
    { key: 'stock', header: 'Saldo', numeric: true, cell: (r) => <span className="font-bold tabular-nums text-foreground">{formatNumber(r.stock)}</span> },
    { key: 'updateBy', header: 'Oleh', cell: (r) => <span className="text-[11.5px] text-muted-foreground">{r.updateBy || '-'}</span>, hideOnMobile: true },
  ];

  const TABS: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'stok', label: 'Stok Barang', icon: PackageSearch },
    { key: 'histori', label: 'Histori Pergerakan', icon: TrendingUp },
    { key: 'laptop', label: 'Aset Laptop', icon: Laptop },
    { key: 'broken', label: 'Aset Rusak', icon: Wrench },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        icon={PackageSearch}
        title="Inventaris & Stok"
        description="Pantau ready stock, histori pergerakan, serta kondisi aset laptop dan aset rusak."
        actions={
          canUpdate && (
            <>
              <button className="xh-btn xh-btn-secondary" onClick={() => setOutOpen(true)}>
                <ArrowUpFromLine className="h-4 w-4" />
                Pengeluaran
              </button>
              <button className="xh-btn xh-btn-primary" onClick={() => setInOpen(true)}>
                <ArrowDownToLine className="h-4 w-4" />
                Penerimaan
              </button>
            </>
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Jenis Barang" value={formatNumber(totals.totalItems)} icon={PackageSearch} tone="primary" />
        <StatCard label="Total Unit" value={formatNumber(totals.totalQty)} icon={Laptop} tone="info" />
        <StatCard label="Stok Menipis" value={formatNumber(totals.lowStock)} hint={`Stok < ${LOW_STOCK_THRESHOLD}`} icon={TrendingDown} tone="danger" />
        <StatCard label="Total Masuk" value={formatNumber(totals.inTotal)} icon={ArrowDownToLine} tone="success" />
        <StatCard label="Total Keluar" value={formatNumber(totals.outTotal)} icon={ArrowUpFromLine} tone="warning" />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              setPage(1);
            }}
            className={tab === t.key ? 'xh-btn xh-btn-primary h-9 px-3 text-[12px]' : 'xh-btn xh-btn-secondary h-9 px-3 text-[12px]'}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      <Panel padded={false}>
        {tab === 'stok' && (
          <>
            <Toolbar>
              <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Cari nama barang, kode, atau kategori…" />
            </Toolbar>
            <div className="p-3 sm:p-4">
              {loading ? (
                <TableSkeleton rows={8} cols={6} />
              ) : (
                <>
                  <DataTable
                    columns={stockColumns}
                    rows={paged}
                    rowKey={(r) => r.id}
                    empty={
                      <EmptyState
                        icon={PackageSearch}
                        title="Belum ada data stok"
                        description="Data stok terbentuk otomatis dari Master Inventory dan penerimaan Delivery Order."
                      />
                    }
                  />
                  <Pagination page={page} totalPages={totalPages} total={filtered.length} pageSize={pageSize} onPageChange={setPage} />
                </>
              )}
            </div>
          </>
        )}

        {tab === 'histori' && (
          <div className="p-3 sm:p-4">
            {loading ? (
              <TableSkeleton rows={8} cols={6} />
            ) : (
              <DataTable
                columns={historyColumns}
                rows={history.slice(0, 100)}
                rowKey={(r) => r.id}
                empty={<EmptyState icon={TrendingUp} title="Belum ada histori" description="Setiap penerimaan dan pengeluaran stok akan tercatat di sini." />}
              />
            )}
          </div>
        )}

        {tab === 'laptop' && (
          <div className="p-3 sm:p-4">
            {loading ? (
              <TableSkeleton rows={6} cols={4} />
            ) : (
              <DataTable
                columns={[
                  { key: 'item', header: 'Spesifikasi', cell: (r: Laptop) => <span className="font-medium text-foreground">{r.item}</span> },
                  { key: 'user', header: 'PIC / User', cell: (r: Laptop) => r.user },
                  { key: 'status', header: 'Kondisi', cell: (r: Laptop) => <StatusBadge status={r.status} /> },
                  { key: 'date', header: 'Tanggal', cell: (r: Laptop) => <span className="text-muted-foreground">{formatDateTime(r.date)}</span>, hideOnMobile: true },
                ]}
                rows={laptops}
                rowKey={(r) => r.id}
                empty={<EmptyState icon={Laptop} title="Belum ada aset laptop" description="Data laptop yang dipinjam karyawan akan tampil di sini." />}
              />
            )}
          </div>
        )}

        {tab === 'broken' && (
          <div className="p-3 sm:p-4">
            {loading ? (
              <TableSkeleton rows={6} cols={4} />
            ) : (
              <DataTable
                columns={[
                  { key: 'itemType', header: 'Jenis Barang', cell: (r: Broken) => <span className="font-medium text-foreground">{r.itemType}</span> },
                  { key: 'qty', header: 'Qty', numeric: true, cell: (r: Broken) => <span className="tabular-nums">{formatNumber(r.qty)}</span> },
                  { key: 'brokenCount', header: 'Rusak', numeric: true, cell: (r: Broken) => <span className="font-bold tabular-nums text-danger">{formatNumber(r.brokenCount)}</span> },
                  { key: 'note', header: 'Keterangan', cell: (r: Broken) => <span className="text-[11.5px] text-muted-foreground">{r.note || '-'}</span> },
                  { key: 'date', header: 'Tanggal', cell: (r: Broken) => <span className="whitespace-nowrap text-muted-foreground">{formatDateTime(r.date)}</span>, hideOnMobile: true },
                ]}
                rows={broken}
                rowKey={(r) => r.id}
                empty={<EmptyState icon={Wrench} title="Belum ada aset rusak" description="Pencatatan aset rusak akan membantu planning penggantian." />}
              />
            )}
          </div>
        )}
      </Panel>

      {/* Pergerakan stok */}
      <Modal
        open={inOpen || outOpen}
        onClose={() => {
          if (saving) return;
          setInOpen(false);
          setOutOpen(false);
        }}
        title={inOpen ? 'Penerimaan Stok' : 'Pengeluaran Stok'}
        description={inOpen ? 'Stok bertambah dan tercatat di histori pergerakan.' : 'Stok berkurang dan tercatat di histori pergerakan.'}
        size="sm"
        footer={
          <>
            <button
              className="xh-btn xh-btn-secondary"
              onClick={() => {
                setInOpen(false);
                setOutOpen(false);
              }}
              disabled={saving}
            >
              Batal
            </button>
            <SubmitButton loading={saving} onClick={() => submitMovement(inOpen ? 'in' : 'out')}>
              {inOpen ? 'Simpan Penerimaan' : 'Simpan Pengeluaran'}
            </SubmitButton>
          </>
        }
      >
        <div className="space-y-3.5">
          <Field label="Barang" required error={errors.stockId}>
            <select className="xh-select" value={movement.stockId} onChange={(e) => setMovement({ ...movement, stockId: e.target.value })}>
              <option value="">— Pilih barang —</option>
              {stocks.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.itemName} (stok {formatNumber(s.currentStock)})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Qty" required error={errors.qty}>
            <NumberInput value={movement.qty} min={1} onChange={(n) => setMovement({ ...movement, qty: n })} />
          </Field>
          <Field label="Catatan">
            <textarea
              className="xh-input min-h-[72px] py-2"
              value={movement.note}
              onChange={(e) => setMovement({ ...movement, note: e.target.value })}
              placeholder="Alasan atau keterangan pergerakan…"
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}