'use client';

import React from 'react';
import { CrudPage } from '@/components/ui/crud-page';
import { CodeBadge } from '@/components/ui/data-display';
import { formatDate, formatRupiah } from '@/lib/format';
import { Calendar, MapPin, Clock, User2 } from 'lucide-react';

type Row = {
  id: number;
  bookingCode: string;
  borrowerName: string;
  itemType: string;
  startDate: string;
  startTime: string | null;
  endDate: string | null;
  endTime: string | null;
  location: string | null;
  status: string;
  createdAt: string;
};

const STATUS_OPTIONS = ['Pending', 'Confirmed', 'Cancelled', 'Completed'];

export default function ProjectorBookingsPage() {
  return (
    <CrudPage<Row>
      title="Booking Projector"
      description="Peminjaman projector oleh seluruh divisi. Status dipantau oleh admin aset."
      icon={Calendar}
      endpoint="/api/projector-bookings"
      createFeature="booking"
      updateFeature="booking"
      deleteFeature="booking"
      statusKey="status"
      statusOptions={STATUS_OPTIONS}
      searchPlaceholder="Cari kode booking, peminjam, atau lokasi…"
      emptyTitle="Belum ada booking projector"
      emptyDescription="Catat peminjaman projector agar tidak terjadi bentrok jadwal."
      rowLabel={(r) => r.bookingCode}
      columns={[
        {
          key: 'bookingCode',
          header: 'Kode',
          cell: (r) => <CodeBadge>{r.bookingCode}</CodeBadge>,
        },
        {
          key: 'borrowerName',
          header: 'Peminjam',
          cell: (r) => (
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{r.borrowerName}</p>
              <p className="truncate text-[10.5px] text-muted-foreground">{r.itemType}</p>
            </div>
          ),
        },
        {
          key: 'schedule',
          header: 'Jadwal',
          cell: (r) => (
            <div className="min-w-0 text-[11.5px] text-muted-foreground">
              <p className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(r.startDate)}
                {r.endDate && r.endDate !== r.startDate ? ` – ${formatDate(r.endDate)}` : ''}
              </p>
              <p className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {r.startTime ?? '-'}
                {r.endTime ? ` – ${r.endTime}` : ''}
              </p>
            </div>
          ),
          hideOnMobile: true,
        },
        {
          key: 'location',
          header: 'Lokasi',
          cell: (r) => (
            <span className="flex items-center gap-1 text-[11.5px] text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {r.location || '-'}
            </span>
          ),
          hideOnMobile: true,
        },
      ]}
      fields={[
        { key: 'borrowerName', label: 'Nama Peminjam', type: 'text', required: true, span: 2 },
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          options: STATUS_OPTIONS.map((s) => ({ value: s, label: s })),
          defaultValue: 'Pending',
        },
        { key: 'startDate', label: 'Tanggal Mulai', type: 'date', required: true },
        { key: 'startTime', label: 'Jam Mulai', type: 'text', placeholder: 'mis. 09:00' },
        { key: 'endDate', label: 'Tanggal Selesai', type: 'date', hint: 'Kosongkan bila hanya satu hari' },
        { key: 'endTime', label: 'Jam Selesai', type: 'text', placeholder: 'mis. 17:00' },
        { key: 'location', label: 'Lokasi', type: 'text', span: 3, placeholder: 'mis. Ruang Meeting Lt. 3' },
      ]}
      info={
        <>
          Setiap booking otomatis mendapat kode berurutan. Status <strong>Pending</strong> berarti menunggu
          persetujuan admin aset.
        </>
      }
    />
  );
}