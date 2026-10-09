'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CrudPage, CrudColumn } from '@/components/ui/crud-page';
import { useAuth } from '@/context/AuthContext';
import { CodeBadge } from '@/components/ui/data-display';
import { formatDate, formatNumber } from '@/lib/format';
import { PackageOpen, User2 } from 'lucide-react';

type Row = {
  id: number;
  date: string;
  category: string;
  itemCode: string | null;
  itemName: string;
  outQty: number;
  note: string | null;
  status: string;
  requestedBy: string | null;
  approvedBy: string | null;
};

/** Barang yang punya stok Ready. */
type StockItem = {
  id: number;
  itemCode: string | null;
  itemName: string;
  category: string;
  currentStock: number;
};

const STATUS = ['Pending', 'Approved', 'Rejected'];

export default function StockOutPage() {
  const { apiFetch } = useAuth();

  const [stocks, setStocks] = useState<StockItem[]>([]);

  const loadStocks = useCallback(async () => {
    try {
      const res = await apiFetch('/api/inventory');
      const json = await res.json();
      if (!res.ok) return;
      setStocks((json.stocks ?? []).filter((s: StockItem) => !!s.itemCode));
    } catch {
      // Form tetap bisa dibuka; hanya daftar item yang kosong.
    }
  }, [apiFetch]);

  useEffect(() => {
    loadStocks();
  }, [loadStocks]);

  // Kategori yang hanya muncul di daftar stok Ready.
  const categories = useMemo(
    () => Array.from(new Set(stocks.map((s) => s.category))).sort(),
    [stocks],
  );

  const columns: CrudColumn<Row>[] = [
    { key: 'date', header: 'Tanggal', cell: (r) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(r.date)}</span> },
    {
      key: 'itemName',
      header: 'Barang',
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{r.itemName}</p>
          <p className="truncate text-[10.5px] text-muted-foreground">
            {r.itemCode ? <CodeBadge>{r.itemCode}</CodeBadge> : r.category}
          </p>
        </div>
      ),
    },
    { key: 'category', header: 'Kategori', cell: (r) => <span className="text-[11.5px] text-muted-foreground-strong">{r.category}</span>, hideOnMobile: true },
    { key: 'outQty', header: 'Qty', numeric: true, cell: (r) => <span className="font-bold tabular-nums text-foreground">{formatNumber(r.outQty)}</span> },
    {
      key: 'requestedBy',
      header: 'Pemohon',
      cell: (r) => (
        <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground-strong">
          <User2 className="h-3.5 w-3.5" />
          {r.requestedBy || '-'}
        </span>
      ),
      hideOnMobile: true,
    },
    { key: 'note', header: 'Catatan', cell: (r) => <span className="text-[11.5px] text-muted-foreground">{r.note || '-'}</span>, hideOnMobile: true },
  ];

  return (
    <CrudPage<Row>
      title="Stock Out"
      description="Pilih kategori, lalu barang yang tersedia. Qty tidak boleh melebihi stok Ready; stok berkurang saat pengajuan disetujui."
      icon={PackageOpen}
      endpoint="/api/stock-out-transactions"
      createFeature="transaction_stockout"
      updateFeature="transaction_stockout"
      deleteFeature="transaction_stockout"
      statusKey="status"
      statusOptions={STATUS}
      searchPlaceholder="Cari nama barang, kategori, kode, atau pemohon..."
      emptyTitle="Belum ada pengeluaran stok"
      emptyDescription="Catat setiap pengeluaran barang agar saldo inventori selalu akurat."
      rowLabel={(r) => r.itemName}
      info={
        stocks.length === 0 ? (
          <>
            Belum ada barang dengan stok Ready. Data stok terbentuk otomatis dari Master Inventory, penerimaan
            Delivery Order, dan aset rusak yang selesai diperbaiki.
          </>
        ) : (
          <>
            <strong className="font-semibold">Item 7:</strong> kategori dipilih lebih dulu, lalu dropdown barang hanya
            berisi barang dari kategori tersebut. Stok Ready yang tersedia:{' '}
            <strong className="font-semibold tabular-nums">
              {formatNumber(stocks.reduce((s, x) => s + x.currentStock, 0))}
            </strong>{' '}
            unit dari {formatNumber(stocks.length)} jenis barang.
          </>
        )
      }
      toForm={(r) => ({
        date: r.date ? String(r.date).slice(0, 10) : '',
        category: r.category,
        itemCode: r.itemCode ?? '',
        itemName: r.itemName,
        outQty: r.outQty,
        status: r.status,
        note: r.note ?? '',
        requestedBy: r.requestedBy ?? '',
      })}
      toPayload={(v) => ({
        date: v.date,
        category: v.category,
        itemCode: v.itemCode,
        itemName: v.itemName,
        outQty: v.outQty,
        status: v.status,
        note: v.note,
        requestedBy: v.requestedBy,
      })}
      columns={columns}
      fields={[
        {
          // Langkah 1: kategori harus dipilih lebih dulu.
          key: 'category',
          label: 'Kategori',
          type: 'select',
          required: true,
          span: 2,
          defaultValue: '',
          options: categories.map((c) => ({ value: c, label: c })),
          // Ganti kategori harus mereset barang yang dipilih.
          render: ({ value, set, patch }) => (
            <select
              className="xh-select"
              value={value ?? ''}
              onChange={(e) => {
                set(e.target.value);
                patch({ itemCode: '', itemName: '' });
              }}
            >
              <option value="">
                {categories.length === 0 ? '- Belum ada barang berstok -' : '- Pilih kategori -'}
              </option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          ),
          hint:
            categories.length === 0
              ? 'Belum ada barang berstok. Tambahkan stok terlebih dahulu.'
              : 'Pilih kategori terlebih dahulu untuk melihat daftar barang.',
        },
        {
          // Langkah 2: barang difilter oleh kategori terpilih + pencarian.
          key: 'itemCode',
          label: 'Barang',
          type: 'select',
          required: true,
          span: 2,
          defaultValue: '',
          render: ({ value, patch, values }) => {
            const category = String(values.category ?? '');
            const pool = category ? stocks.filter((s) => s.category === category) : [];
            const selected = pool.find((s) => s.itemCode === value) ?? null;

            const pick = (s: StockItem | null) => {
              // Kode + nama barang dikirim bersamaan supaya server selalu punya
              // nama yang konsisten dengan kode yang dipilih.
              patch({ itemCode: s?.itemCode ?? '', itemName: s?.itemName ?? '' });
            };

            return (
              <>
                <input
                  type="search"
                  className="xh-input mb-2"
                  placeholder="Cari kode atau nama barang, lalu klik hasil..."
                  aria-label="Cari barang"
                  disabled={!category}
                  onChange={(e) => {
                    const q = e.target.value.trim().toLowerCase();
                    if (!q) return;
                    const hit = pool.find(
                      (s) => s.itemCode!.toLowerCase().includes(q) || s.itemName.toLowerCase().includes(q),
                    );
                    if (hit) pick(hit);
                  }}
                />
                <select
                  className="xh-select"
                  value={value ?? ''}
                  disabled={!category || pool.length === 0}
                  onChange={(e) => pick(pool.find((s) => s.itemCode === e.target.value) ?? null)}
                >
                  <option value="">
                    {!category
                      ? '- Pilih kategori dulu -'
                      : pool.length === 0
                        ? '- Tidak ada barang pada kategori ini -'
                        : '- Pilih barang -'}
                  </option>
                  {pool.map((s) => (
                    <option key={s.id} value={s.itemCode!}>
                      {s.itemCode} - {s.itemName} (stok {formatNumber(s.currentStock)})
                    </option>
                  ))}
                </select>
                {selected && (
                  <p className="mt-1.5 text-[11.5px] text-muted-foreground">
                    {selected.itemName} - stok tersedia:{' '}
                    <strong
                      className={
                        selected.currentStock === 0
                          ? 'font-bold text-danger'
                          : 'font-semibold tabular-nums text-foreground'
                      }
                    >
                      {formatNumber(selected.currentStock)}
                    </strong>{' '}
                    unit
                  </p>
                )}
              </>
            );
          },
        },
        {
          // Terisi otomatis dari dropdown barang, tidak dirender sebagai input.
          key: 'itemName',
          label: 'Nama Barang',
          type: 'text',
          required: true,
          serverOnly: true,
          defaultValue: '',
          render: () => null,
        },
        { key: 'outQty', label: 'Qty', type: 'number', required: true, defaultValue: 1 },
        { key: 'date', label: 'Tanggal', type: 'date', defaultValue: new Date().toISOString().slice(0, 10) },
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          options: STATUS.map((s) => ({ value: s, label: s })),
          defaultValue: 'Pending',
        },
        { key: 'requestedBy', label: 'Diminta Oleh', type: 'text', hint: 'Kosongkan untuk memakai nama Anda.' },
        { key: 'note', label: 'Catatan', type: 'textarea', span: 3 },
      ]}
    />
  );
}