'use client';

import React from 'react';
import { CrudPage } from '@/components/ui/crud-page';
import { formatDate, formatRupiah } from '@/lib/format';
import { CreditCard, Wallet, User2 } from 'lucide-react';

type Row = {
  id: number;
  agenName: string;
  date: string;
  amount: number;
  status: string;
};

const STATUS = ['Pending', 'Approved', 'Paid', 'Rejected'];

export default function PaymentAchievementsPage() {
  return (
    <CrudPage<Row>
      title="Payment Achievement"
      description="Pencapaian pembayaran agen beserta nominalnya."
      icon={CreditCard}
      endpoint="/api/payment-achievements"
      createFeature="transaction_stockout"
      updateFeature="transaction_stockout"
      deleteFeature="transaction_stockout"
      statusKey="status"
      statusOptions={STATUS}
      searchPlaceholder="Cari nama agen..."
      emptyTitle="Belum ada data pencapaian pembayaran"
      emptyDescription="Catat pencapaian pembayaran agen untuk monitoring."
      rowLabel={(r) => r.agenName}
      columns={[
        { key: 'date', header: 'Tanggal', cell: (r) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(r.date)}</span> },
        {
          key: 'agenName',
          header: 'Agen',
          cell: (r) => (
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <User2 className="h-3.5 w-3.5 text-muted-foreground" />
              {r.agenName}
            </span>
          ),
        },
        {
          key: 'amount',
          header: 'Nominal',
          numeric: true,
          cell: (r) => <span className="font-bold tabular-nums text-foreground">{formatRupiah(r.amount)}</span>,
        },
      ]}
      fields={[
        { key: 'agenName', label: 'Nama Agen', type: 'text', required: true, span: 2 },
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          options: STATUS.map((s) => ({ value: s, label: s })),
          defaultValue: 'Pending',
        },
        { key: 'date', label: 'Tanggal', type: 'date', defaultValue: new Date().toISOString().slice(0, 10) },
        { key: 'amount', label: 'Nominal', type: 'money', required: true, hint: 'Masukkan dalam Rupiah' },
      ]}
      info={
        <>
          Nominal disimpan sebagai angka (bukan teks) sehingga dapat dijumlahkan dan dilaporkan. Tampilkan selalu dalam
          format <strong>Rupiah</strong>.
        </>
      }
    />
  );
}