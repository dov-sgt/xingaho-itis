'use client';

import React from 'react';
import { CrudPage } from '@/components/ui/crud-page';
import { CodeBadge } from '@/components/ui/data-display';
import { formatDate } from '@/lib/format';
import { Wrench, MapPin, User2 } from 'lucide-react';

type Row = {
  id: number;
  servisCode: string;
  date: string;
  itemName: string;
  teknisiName: string;
  status: string;
  createdBy: string | null;
};

const STATUS = ['Pending', 'In Progress', 'Completed', 'Cancelled'];

export default function ServisAssetsPage() {
  return (
    <CrudPage<Row>
      title="Servis Asset"
      description="Pencatatan perbaikan dan perawatan aset oleh teknisi."
      icon={Wrench}
      endpoint="/api/servis-assets"
      createFeature="servis_asset"
      updateFeature="servis_asset"
      deleteFeature="servis_asset"
      statusKey="status"
      statusOptions={STATUS}
      searchPlaceholder="Cari kode servis, barang, atau teknisi..."
      emptyTitle="Belum ada riwayat servis"
      emptyDescription="Catat setiap perbaikan aset agar riwayat pemeliharaan dapat dilacak."
      rowLabel={(r) => r.servisCode}
      columns={[
        { key: 'servisCode', header: 'Kode', cell: (r) => <CodeBadge>{r.servisCode}</CodeBadge> },
        { key: 'date', header: 'Tanggal', cell: (r) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(r.date)}</span> },
        {
          key: 'itemName',
          header: 'Barang',
          cell: (r) => <span className="font-medium text-foreground">{r.itemName}</span>,
        },
        {
          key: 'teknisiName',
          header: 'Teknisi',
          cell: (r) => (
            <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground-strong">
              <User2 className="h-3.5 w-3.5" />
              {r.teknisiName}
            </span>
          ),
          hideOnMobile: true,
        },
      ]}
      fields={[
        { key: 'itemName', label: 'Nama Barang', type: 'text', required: true, span: 2 },
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          options: STATUS.map((s) => ({ value: s, label: s })),
          defaultValue: 'Pending',
        },
        { key: 'date', label: 'Tanggal Servis', type: 'date', required: true, defaultValue: new Date().toISOString().slice(0, 10) },
        { key: 'teknisiName', label: 'Nama Teknisi', type: 'text', required: true },
      ]}
    />
  );
}