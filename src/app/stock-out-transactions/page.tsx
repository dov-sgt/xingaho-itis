'use client';

import React from 'react';
import { CrudPage } from '@/components/ui/crud-page';
import { formatDate } from '@/lib/format';
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

const STATUS = ['Pending', 'Approved', 'Rejected'];
const CATEGORIES = ['Computer', 'Accessories', 'Smartphone', 'Media', 'Equipment', 'Networking', 'Server', 'Others'];

export default function StockOutPage() {
  return (
    <CrudPage<Row>
      title="Stock Out"
      description="Pengeluaran barang dari gudang beserta quantity dan pemohonnya."
      icon={PackageOpen}
      endpoint="/api/stock-out-transactions"
      createFeature="transaction_stockout"
      updateFeature="transaction_stockout"
      deleteFeature="transaction_stockout"
      statusKey="status"
      statusOptions={STATUS}
      searchPlaceholder="Cari nama barang, kategori, atau pemohon..."
      emptyTitle="Belum ada pengeluaran stok"
      emptyDescription="Catat setiap pengeluaran barang agar saldo inventori selalu akurat."
      rowLabel={(r) => r.itemName}
      columns={[
        { key: 'date', header: 'Tanggal', cell: (r) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(r.date)}</span> },
        {
          key: 'itemName',
          header: 'Barang',
          cell: (r) => (
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{r.itemName}</p>
              <p className="truncate text-[10.5px] text-muted-foreground">{r.category}</p>
            </div>
          ),
        },
        { key: 'outQty', header: 'Qty', numeric: true, cell: (r) => <span className="font-bold tabular-nums text-foreground">{r.outQty}</span> },
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
      ]}
      fields={[
        { key: 'itemName', label: 'Nama Barang', type: 'text', required: true, span: 2 },
        {
          key: 'category',
          label: 'Kategori',
          type: 'select',
          required: true,
          options: CATEGORIES.map((c) => ({ value: c, label: c })),
          defaultValue: 'Others',
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
        { key: 'itemCode', label: 'Kode Barang', type: 'text' },
        { key: 'requestedBy', label: 'Diminta Oleh', type: 'text' },
        { key: 'note', label: 'Catatan', type: 'textarea', span: 3 },
      ]}
    />
  );
}