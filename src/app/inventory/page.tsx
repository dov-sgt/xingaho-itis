'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { PageHeader, Panel, Field, EmptyState, TableSkeleton, StatCard, DescList } from '@/components/ui/layout';
import { DataTable, Column, StatusBadge, Pagination, Toolbar, SearchInput, CodeBadge } from '@/components/ui/data-display';
import { Modal, NumberInput, SubmitButton } from '@/components/ui/form';
import { formatNumber, formatDateTime, formatDate } from '@/lib/format';
import { LOW_STOCK_THRESHOLD } from '@/lib/config';
import { DAMAGED_STATUSES } from '@/lib/assets';
import {
  PackageSearch, Laptop, Wrench, TrendingUp, TrendingDown, ArrowDownToLine, ArrowUpFromLine,
  Plus, UserCheck, History, Trash2,
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

/** Aset laptop (item 5). */
type Laptop = {
  id: number;
  assetCode: string | null;
  category: string | null;
  item: string;
  user: string;
  status: string;
  date: string;
  serialNumber: string | null;
  specification: string | null;
};

/** Ringkasan aset rusak (item 1) - agregat dari DamagedItem. */
type DamagedSummary = {
  total: number;
  inServis: number;
  selesai: number;
  byCategory: { category: string; qty: number; records: number }[];
};

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

type Assignment = {
  id: number;
  assetId: number;
  userName: string;
  startDate: string;
  endDate: string | null;
  changedBy: string | null;
  note: string | null;
};

type Tab = 'stok' | 'histori' | 'laptop' | 'rusak';

export default function InventoryPage() {
  const { can, apiFetch, user } = useAuth();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>('stok');
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [laptops, setLaptops] = useState<Laptop[]>([]);
  const [damaged, setDamaged] = useState<DamagedSummary>({ total: 0, inServis: 0, selesai: 0, byCategory: [] });
  const [history, setHistory] = useState<History[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [inOpen, setInOpen] = useState(false);
  const [outOpen, setOutOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [movement, setMovement] = useState({ stockId: '', qty: 1, note: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // --- Modal Tambah Aset (item 5: Laptop, item 6: Aset Rusak) ---
  const [addOpen, setAddOpen] = useState(false);
  const [addMode, setAddMode] = useState<'laptop' | 'rusak'>('laptop');
  const [laptopForm, setLaptopForm] = useState({
    item: '',
    user: '',
    category: 'Computer',
    serialNumber: '',
    specification: '',
  });
  const [damagedForm, setDamagedForm] = useState({ category: '', qty: 1, note: '' });

  // --- Mutasi laptop (item 5) ---
  const [mutateOpen, setMutateOpen] = useState<Laptop | null>(null);
  const [mutateForm, setMutateForm] = useState({ user: '', note: '' });

  // --- Histori aset (item 5) ---
  const [historyOpen, setHistoryOpen] = useState<Laptop | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const canUpdate = can('inventory_type_item', 'update');
  const canCreate = can('inventory_type_item', 'create');
  const canReadHistory = can('inventory_type_item', 'read');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/inventory');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal memuat data inventaris');
      setStocks(json.stocks ?? []);
      setLaptops(json.laptops ?? []);
      setDamaged(json.damagedSummary ?? { total: 0, inServis: 0, selesai: 0, byCategory: [] });

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

  /* ---------------- Pergerakan stok ---------------- */

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
        body: JSON.stringify({
          action: direction === 'in' ? 'stock_in' : 'stock_out',
          stockId: Number(movement.stockId),
          qty: movement.qty,
          note: movement.note || null,
          user: user?.name,
        }),
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

  /* ---------------- Tambah Laptop (item 5) ---------------- */

  const submitLaptop = async () => {
    const e: Record<string, string> = {};
    if (!laptopForm.item.trim()) e.item = 'Nama / spesifikasi aset wajib diisi.';
    if (!laptopForm.user.trim()) e.user = 'Assign ke wajib diisi.';
    setErrors(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      const res = await apiFetch('/api/assets/laptops', {
        method: 'POST',
        body: JSON.stringify(laptopForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.details?.join(', ') || 'Gagal menyimpan aset laptop');
      toast('success', `Aset laptop ${json.assetCode} dibuat dan ditugaskan ke ${laptopForm.user}.`);
      closeAdd();
      load();
    } catch (err: any) {
      toast('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  /* ---------------- Tambah Aset Rusak (item 6) ---------------- */

  const submitDamaged = async () => {
    const e: Record<string, string> = {};
    if (!damagedForm.category.trim()) e.damagedCategory = 'Kategori wajib diisi.';
    if (damagedForm.qty < 1) e.damagedQty = 'Jumlah minimal 1.';
    setErrors(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      const res = await apiFetch('/api/damaged-items', {
        method: 'POST',
        body: JSON.stringify({
          category: damagedForm.category,
          qty: damagedForm.qty,
          note: damagedForm.note || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan aset rusak');
      toast('success', `${damagedForm.qty} unit aset rusak ${damagedForm.category} dicatat.`);
      closeAdd();
      load();
    } catch (err: any) {
      toast('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const closeAdd = () => {
    setAddOpen(false);
    setLaptopForm({ item: '', user: '', category: 'Computer', serialNumber: '', specification: '' });
    setDamagedForm({ category: '', qty: 1, note: '' });
    setErrors({});
  };

  /* ---------------- Mutasi & histori laptop (item 5) ---------------- */

  const openMutate = (l: Laptop) => {
    setMutateOpen(l);
    setMutateForm({ user: '', note: '' });
    setErrors({});
  };

  const submitMutate = async () => {
    if (!mutateForm.user.trim()) {
      setErrors({ mutateUser: 'Nama pengguna baru wajib diisi.' });
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch('/api/assets/laptops', {
        method: 'PUT',
        body: JSON.stringify({ id: mutateOpen?.id, user: mutateForm.user, note: mutateForm.note }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal melakukan mutasi');
      toast('success', `Aset ${mutateOpen?.assetCode} kini ditugaskan ke ${mutateForm.user}.`);
      setMutateOpen(null);
      load();
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const openHistory = async (l: Laptop) => {
    setHistoryOpen(l);
    try {
      const res = await apiFetch(`/api/assets/laptops?id=${l.id}`);
      const json = await res.json();
      if (res.ok) setAssignments(json.history ?? []);
    } catch {
      setAssignments([]);
    }
  };

  const removeLaptop = async (l: Laptop) => {
    try {
      const res = await apiFetch(`/api/assets/laptops?id=${l.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menghapus');
      toast('success', `Aset ${l.assetCode ?? l.item} dihapus beserta histori penugasannya.`);
      load();
    } catch (e: any) {
      toast('error', e.message);
    }
  };

  /* ---------------- Kolom tabel ---------------- */

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
      cell: (r) => <span className="font-semibold tabular-nums text-success">{r.inQty ? `+${r.inQty}` : '-'}</span>,
    },
    {
      key: 'outQty',
      header: 'Keluar',
      numeric: true,
      cell: (r) => <span className="font-semibold tabular-nums text-danger">{r.outQty ? `-${r.outQty}` : '-'}</span>,
    },
    { key: 'stock', header: 'Saldo', numeric: true, cell: (r) => <span className="font-bold tabular-nums text-foreground">{formatNumber(r.stock)}</span> },
    { key: 'updateBy', header: 'Oleh', cell: (r) => <span className="text-[11.5px] text-muted-foreground">{r.updateBy || '-'}</span>, hideOnMobile: true },
  ];

  const TABS: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'stok', label: 'Stok Barang', icon: PackageSearch },
    { key: 'histori', label: 'Histori Pergerakan', icon: TrendingUp },
    { key: 'laptop', label: 'Aset Laptop', icon: Laptop },
    { key: 'rusak', label: 'Aset Rusak', icon: Wrench },
  ];

  const closeMovement = () => {
    setInOpen(false);
    setOutOpen(false);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        icon={PackageSearch}
        title="Inventaris & Stok"
        description="Pantau ready stock, histori pergerakan, aset laptop beserta riwayat penugasannya, dan jumlah aset rusak."
        actions={
          <>
            {canUpdate && (
              <>
                <button className="xh-btn xh-btn-secondary" onClick={() => setOutOpen(true)}>
                  <ArrowUpFromLine className="h-4 w-4" />
                  Pengeluaran
                </button>
                <button className="xh-btn xh-btn-secondary" onClick={() => setInOpen(true)}>
                  <ArrowDownToLine className="h-4 w-4" />
                  Penerimaan
                </button>
              </>
            )}
            {(canCreate || canUpdate) && (
              <button className="xh-btn xh-btn-primary" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4" />
                Tambah Aset
              </button>
            )}
          </>
        }
      />

      {/* Item 1: total aset rusak ikut ditampilkan di Inventaris & Stok. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <StatCard label="Jenis Barang" value={formatNumber(totals.totalItems)} icon={PackageSearch} tone="primary" />
        <StatCard label="Stok Ready" value={formatNumber(totals.totalQty)} icon={Laptop} tone="info" />
        <StatCard label="Stok Menipis" value={formatNumber(totals.lowStock)} hint={`Stok < ${LOW_STOCK_THRESHOLD}`} icon={TrendingDown} tone="danger" />
        <StatCard label="Aset Rusak" value={formatNumber(damaged.total)} icon={Wrench} tone="danger" hint="Tidak masuk stok Ready" />
        <StatCard label="Dalam Servis" value={formatNumber(damaged.inServis)} icon={TrendingUp} tone="warning" hint="Sedang diperbaiki" />
        <StatCard label="Aset Laptop" value={formatNumber(laptops.length)} icon={UserCheck} tone="success" hint={`${laptops.length} unit`} />
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
            {t.key === 'rusak' && damaged.total > 0 && (
              <span className="ml-1.5 rounded-full bg-danger-subtle px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-danger-subtle-foreground">
                {formatNumber(damaged.total)}
              </span>
            )}
          </button>
        ))}
      </div>

      <Panel padded={false}>
        {tab === 'stok' && (
          <>
            <Toolbar>
              <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Cari nama barang, kode, atau kategori..." />
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
                        description="Data stok terbentuk otomatis dari Master Inventory, penerimaan Delivery Order, dan aset rusak yang selesai diperbaiki."
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
              <TableSkeleton rows={6} cols={5} />
            ) : (
              <DataTable
                columns={[
                  {
                    key: 'item',
                    header: 'Aset',
                    cell: (r: Laptop) => (
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{r.item}</p>
                        <p className="truncate">
                          {r.assetCode ? <CodeBadge>{r.assetCode}</CodeBadge> : <span className="text-[10.5px] text-muted-foreground">Tanpa kode</span>}
                        </p>
                      </div>
                    ),
                  },
                  {
                    key: 'user',
                    header: 'Assign ke',
                    cell: (r: Laptop) => (
                      <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground-strong">
                        <UserCheck className="h-3.5 w-3.5" />
                        {r.user}
                      </span>
                    ),
                  },
                  { key: 'serialNumber', header: 'Serial', cell: (r: Laptop) => <span className="font-mono text-[11px] text-muted-foreground">{r.serialNumber || '-'}</span>, hideOnMobile: true },
                  { key: 'status', header: 'Kondisi', cell: (r: Laptop) => <StatusBadge status={r.status} /> },
                  { key: 'date', header: 'Tanggal', cell: (r: Laptop) => <span className="text-muted-foreground">{formatDateTime(r.date)}</span>, hideOnMobile: true },
                  {
                    key: 'actions',
                    header: 'Aksi',
                    className: 'text-right',
                    cell: (r: Laptop) => (
                      <div className="flex items-center justify-end gap-1">
                        <button className="xh-btn xh-btn-ghost h-8 w-8 p-0" title="Histori penugasan" onClick={() => openHistory(r)}>
                          <History className="h-4 w-4" />
                        </button>
                        {canUpdate && (
                          <button className="xh-btn xh-btn-ghost h-8 w-8 p-0" title="Mutasi / ganti pengguna" onClick={() => openMutate(r)}>
                            <UserCheck className="h-4 w-4" />
                          </button>
                        )}
                        {can('inventory_type_item', 'delete') && (
                          <button className="xh-btn xh-btn-ghost h-8 w-8 p-0 text-danger" title="Hapus aset" onClick={() => removeLaptop(r)}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ),
                  },
                ]}
                rows={laptops}
                rowKey={(r) => r.id}
                empty={<EmptyState icon={Laptop} title="Belum ada aset laptop" description="Gunakan tombol Tambah Aset untuk membuat aset laptop dan menetapkannya ke pengguna." />}
              />
            )}
          </div>
        )}

        {tab === 'rusak' && (
          <div className="p-3 sm:p-4">
            <p className="mb-3 text-[12px] text-muted-foreground-strong">
              Total aset rusak <strong className="tabular-nums">{formatNumber(damaged.total)}</strong> unit
              {damaged.inServis > 0 && <> - <strong className="tabular-nums">{formatNumber(damaged.inServis)}</strong> unit sedang dalam servis</>}.
              Angka dihitung dari daftar aset rusak, bukan counter terpisah. Kirim aset yang masih bisa diperbaiki lewat
              menu <strong className="font-semibold">Daftar Damage</strong>.
            </p>

            {damaged.byCategory.length > 0 && (
              <div className="mb-4">
                <p className="xh-section-title mb-2">Ringkasan per Kategori</p>
                <div className="xh-table-wrapper">
                  <table className="xh-table">
                    <thead>
                      <tr>
                        <th scope="col">Kategori</th>
                        <th scope="col" className="text-right">Jumlah Rusak</th>
                        <th scope="col" className="text-right">Catatan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {damaged.byCategory.map((c) => (
                        <tr key={c.category}>
                          <td className="font-medium text-foreground">{c.category}</td>
                          <td className="num font-bold tabular-nums text-danger">{formatNumber(c.qty)}</td>
                          <td className="num text-muted-foreground">{formatNumber(c.records)} catatan</td>
                        </tr>
                      ))}
                      <tr className="border-t-2">
                        <td className="font-bold text-foreground">TOTAL</td>
                        <td className="num font-bold tabular-nums text-danger">{formatNumber(damaged.total)}</td>
                        <td />
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {damaged.byCategory.length === 0 && (
              <EmptyState icon={Wrench} title="Tidak ada aset rusak" description="Semua aset dalam kondisi baik. Pencatatan aset rusak dan pengiriman ke servis tersedia di menu Daftar Damage." />
            )}
          </div>
        )}
      </Panel>

      {/* ---------- Pergerakan stok ---------- */}
      <Modal
        open={inOpen || outOpen}
        onClose={() => !saving && closeMovement()}
        title={inOpen ? 'Penerimaan Stok' : 'Pengeluaran Stok'}
        description={inOpen ? 'Stok bertambah dan tercatat di histori pergerakan.' : 'Stok berkurang dan tercatat di histori pergerakan.'}
        size="sm"
        footer={
          <>
            <button className="xh-btn xh-btn-secondary" onClick={closeMovement} disabled={saving}>
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
              <option value="">- Pilih barang -</option>
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
              placeholder="Alasan atau keterangan pergerakan..."
            />
          </Field>
        </div>
      </Modal>

      {/* ---------- Tambah Aset: Laptop (item 5) / Aset Rusak (item 6) ---------- */}
      <Modal
        open={addOpen}
        onClose={() => !saving && closeAdd()}
        title="Tambah Aset"
        description="Buat aset laptop yang langsung ditugaskan ke pengguna, atau catat aset rusak per kategori."
        size="lg"
        footer={
          <>
            <button className="xh-btn xh-btn-secondary" onClick={closeAdd} disabled={saving}>
              Batal
            </button>
            <SubmitButton loading={saving} onClick={addMode === 'laptop' ? submitLaptop : submitDamaged}>
              {addMode === 'laptop' ? 'Simpan Aset Laptop' : 'Simpan Aset Rusak'}
            </SubmitButton>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            <button
              className={addMode === 'laptop' ? 'xh-btn xh-btn-primary h-9 px-3 text-[12px]' : 'xh-btn xh-btn-secondary h-9 px-3 text-[12px]'}
              onClick={() => { setAddMode('laptop'); setErrors({}); }}
            >
              <Laptop className="h-4 w-4" />
              Aset Laptop
            </button>
            <button
              className={addMode === 'rusak' ? 'xh-btn xh-btn-primary h-9 px-3 text-[12px]' : 'xh-btn xh-btn-secondary h-9 px-3 text-[12px]'}
              onClick={() => { setAddMode('rusak'); setErrors({}); }}
            >
              <Wrench className="h-4 w-4" />
              Aset Rusak
            </button>
          </div>

          {addMode === 'laptop' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nama / Spesifikasi Aset" required error={errors.item} className="sm:col-span-2">
                <input
                  className="xh-input"
                  value={laptopForm.item}
                  onChange={(e) => setLaptopForm({ ...laptopForm, item: e.target.value })}
                  placeholder="mis. Laptop Lenovo ThinkPad T14"
                />
              </Field>
              <Field
                label="Assign ke"
                required
                error={errors.user}
                hint="Input teks bebas - ketik nama siapa pun."
              >
                <input
                  className="xh-input"
                  list="known-users"
                  value={laptopForm.user}
                  onChange={(e) => setLaptopForm({ ...laptopForm, user: e.target.value })}
                  placeholder="mis. Budi Santoso"
                />
                <datalist id="known-users">
                  {laptops.map((l) => (
                    <option key={l.id} value={l.user} />
                  ))}
                </datalist>
              </Field>
              <Field label="Kategori" hint="Kode aset dibuat otomatis dari kategori ini.">
                <input
                  className="xh-input"
                  value={laptopForm.category}
                  onChange={(e) => setLaptopForm({ ...laptopForm, category: e.target.value })}
                  placeholder="Computer"
                />
              </Field>
              <Field label="Serial Number (opsional)">
                <input
                  className="xh-input font-mono"
                  value={laptopForm.serialNumber}
                  onChange={(e) => setLaptopForm({ ...laptopForm, serialNumber: e.target.value })}
                />
              </Field>
              <Field label="Spesifikasi (opsional)" className="sm:col-span-2">
                <input
                  className="xh-input"
                  value={laptopForm.specification}
                  onChange={(e) => setLaptopForm({ ...laptopForm, specification: e.target.value })}
                  placeholder="mis. i5 / 16GB / 512GB"
                />
              </Field>
            </div>
          )}

          {addMode === 'rusak' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Kategori" required error={errors.damagedCategory} hint="Wajib diisi. Tidak ada kode aset.">
                <input
                  className="xh-input"
                  value={damagedForm.category}
                  onChange={(e) => setDamagedForm({ ...damagedForm, category: e.target.value })}
                  placeholder="mis. Computer, Printer, Headset"
                  list="known-categories"
                />
                <datalist id="known-categories">
                  {Array.from(new Set(stocks.map((s) => s.category))).map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </Field>
              <Field label="Jumlah" required error={errors.damagedQty}>
                <NumberInput value={damagedForm.qty} min={1} onChange={(n) => setDamagedForm({ ...damagedForm, qty: n })} />
              </Field>
              <Field label="Catatan (opsional)" className="sm:col-span-2">
                <textarea
                  className="xh-input min-h-[80px] py-2"
                  value={damagedForm.note}
                  onChange={(e) => setDamagedForm({ ...damagedForm, note: e.target.value })}
                  placeholder="Keterangan kerusakan..."
                />
              </Field>
              <p className="text-[11.5px] leading-relaxed text-muted-foreground sm:col-span-2">
                Pencatatan ini menambah jumlah aset rusak dan tidak menambah stok Ready. Aset yang masih bisa
                diperbaiki dapat dikirim ke Servis Asset dari menu <strong className="font-semibold">Daftar Damage</strong>.
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* ---------- Mutasi laptop (item 5) ---------- */}
      <Modal
        open={!!mutateOpen}
        onClose={() => !saving && setMutateOpen(null)}
        title="Mutasi / Ganti Pengguna"
        description="Penugasan lama ditutup dan penugasan baru dibuat. Riwayat tidak pernah ditimpa."
        size="sm"
        footer={
          <>
            <button className="xh-btn xh-btn-secondary" onClick={() => setMutateOpen(null)} disabled={saving}>
              Batal
            </button>
            <SubmitButton loading={saving} onClick={submitMutate}>
              Simpan Mutasi
            </SubmitButton>
          </>
        }
      >
        <div className="space-y-3.5">
          {mutateOpen && (
            <DescList
              items={[
                { label: 'Kode Aset', value: mutateOpen.assetCode || '-' },
                { label: 'Aset', value: mutateOpen.item },
                { label: 'Pengguna Saat Ini', value: mutateOpen.user },
              ]}
            />
          )}
          <Field label="Pengguna Baru" required error={errors.mutateUser} hint="Input teks bebas.">
            <input
              className="xh-input"
              value={mutateForm.user}
              onChange={(e) => setMutateForm({ ...mutateForm, user: e.target.value })}
              placeholder="Nama pengguna baru"
            />
          </Field>
          <Field label="Catatan Mutasi (opsional)">
            <textarea
              className="xh-input min-h-[72px] py-2"
              value={mutateForm.note}
              onChange={(e) => setMutateForm({ ...mutateForm, note: e.target.value })}
              placeholder="Alasan perpindahan aset..."
            />
          </Field>
        </div>
      </Modal>

      {/* ---------- Histori penugasan (item 5) ---------- */}
      <Modal
        open={!!historyOpen}
        onClose={() => setHistoryOpen(null)}
        title={historyOpen ? `Histori - ${historyOpen.assetCode ?? historyOpen.item}` : 'Histori'}
        description="Seluruh riwayat pengguna aset, dari yang terbaru."
        size="lg"
        footer={
          <button className="xh-btn xh-btn-secondary" onClick={() => setHistoryOpen(null)}>
            Tutup
          </button>
        }
      >
        {historyOpen && (
          <div className="space-y-4">
            <DescList
              items={[
                { label: 'Kode Aset', value: historyOpen.assetCode || '-' },
                { label: 'Aset', value: historyOpen.item },
                { label: 'Kategori', value: historyOpen.category || '-' },
                { label: 'Pengguna Saat Ini', value: historyOpen.user },
                { label: 'Serial Number', value: historyOpen.serialNumber || '-' },
              ]}
            />
            <div>
              <p className="xh-section-title mb-2">Riwayat Penugasan ({assignments.length})</p>
              {assignments.length === 0 ? (
                <EmptyState icon={History} title="Belum ada histori" description="Setiap mutasi pengguna akan tercatat di sini." />
              ) : (
                <ol className="space-y-2">
                  {assignments.map((a) => {
                    const active = !a.endDate;
                    return (
                      <li
                        key={a.id}
                        className={
                          active
                            ? 'rounded-lg border border-success/30 bg-success-subtle px-3 py-2.5'
                            : 'rounded-lg border border-border bg-card px-3 py-2.5'
                        }
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[12.5px] font-semibold text-foreground">{a.userName}</span>
                          {active ? (
                            <StatusBadge status="Aktif" tone="success" />
                          ) : (
                            <StatusBadge status="Selesai" tone="neutral" />
                          )}
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {formatDate(a.startDate)}
                          {a.endDate ? ` s.d. ${formatDate(a.endDate)}` : ' - berjalan'}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          Diubah oleh: {a.changedBy || '-'}
                          {a.note ? ` - ${a.note}` : ''}
                        </p>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}