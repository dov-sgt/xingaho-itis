'use client';

import React from 'react';
import { CrudPage } from '@/components/ui/crud-page';
import { formatRupiah } from '@/lib/format';
import { Users, UserCheck, Phone, CalendarClock } from 'lucide-react';

type Row = {
  id: number;
  nik: string;
  nama: string;
  telepon: string | null;
  pinjol: number;
  jatuhTempo: string | null;
  assignedTo: string | null;
  status: string;
};

const STATUS = ['Aktif', 'Nonaktif', 'Lunas'];

export default function NasabahPage() {
  return (
    <CrudPage<Row>
      title="Data Nasabah"
      description="Data induk nasabah beserta pinjol dan jatuh tempo. Digunakan sebagai acuan follow-up Remarks."
      icon={Users}
      endpoint="/api/nasabah"
      statusKey="status"
      statusOptions={STATUS}
      searchPlaceholder="Cari NIK, nama, telepon, atau PIC…"
      emptyTitle="Belum ada data nasabah"
      emptyDescription="Tambahkan nasabah agar follow-up dan pencatatan remark dapat dilakukan."
      rowLabel={(r) => r.nama}
      columns={[
        { key: 'nik', header: 'NIK', cell: (r) => <span className="font-mono text-[11.5px] font-semibold text-foreground">{r.nik}</span> },
        { key: 'nama', header: 'Nama', cell: (r) => <span className="font-medium text-foreground">{r.nama}</span> },
        {
          key: 'telepon',
          header: 'Telepon',
          cell: (r) => (
            <span className="flex items-center gap-1 text-[11.5px] text-muted-foreground">
              <Phone className="h-3 w-3" />
              {r.telepon || '-'}
            </span>
          ),
          hideOnMobile: true,
        },
        { key: 'pinjol', header: 'Pinjol', numeric: true, cell: (r) => <span className="font-semibold tabular-nums">{formatRupiah(r.pinjol)}</span> },
        {
          key: 'jatuhTempo',
          header: 'Jatuh Tempo',
          cell: (r) => (
            <span className="flex items-center gap-1 whitespace-nowrap text-[11.5px] text-muted-foreground">
              <CalendarClock className="h-3 w-3" />
              {r.jatuhTempo || '-'}
            </span>
          ),
          hideOnMobile: true,
        },
        {
          key: 'assignedTo',
          header: 'PIC',
          cell: (r) => (
            <span className="flex items-center gap-1 text-[11.5px] text-muted-foreground-strong">
              <UserCheck className="h-3 w-3" />
              {r.assignedTo || '-'}
            </span>
          ),
          hideOnMobile: true,
        },
      ]}
      fields={[
        { key: 'nama', label: 'Nama Nasabah', type: 'text', required: true, span: 2 },
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          options: STATUS.map((s) => ({ value: s, label: s })),
          defaultValue: 'Aktif',
        },
        { key: 'nik', label: 'NIK', type: 'text', required: true, immutableOnEdit: true },
        { key: 'telepon', label: 'Telepon', type: 'text', placeholder: 'mis. 0812xxxxxxx' },
        { key: 'pinjol', label: 'Pinjol', type: 'money', hint: 'Dalam Rupiah' },
        { key: 'jatuhTempo', label: 'Jatuh Tempo', type: 'text', placeholder: 'mis. 2026-03-31' },
        { key: 'assignedTo', label: 'Ditangani Oleh (PIC)', type: 'text', span: 3 },
      ]}
    />
  );
}