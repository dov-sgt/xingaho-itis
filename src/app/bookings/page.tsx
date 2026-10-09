'use client';

import React, { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { CrudPage } from '@/components/ui/crud-page';
import { CodeBadge } from '@/components/ui/data-display';
import { formatDate } from '@/lib/format';
import { BOOKING_STATUSES, toOptions } from '@/lib/options';
import { Calendar, Clock, MapPin } from 'lucide-react';

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
};

const ITEM_TYPES = ['Projector', 'Laptop', 'Monitor', 'Keyboard', 'Mouse', 'Headset', 'Lainnya'];

export default function BookingsPage() {
  // Item 4: dashboard menautkan ke `/bookings?status=Pending`, jadi filter
  // status dari query string langsung dipakai.
  return (
    <Suspense fallback={null}>
      <BookingsInner />
    </Suspense>
  );
}

function BookingsInner() {
  const searchParams = useSearchParams();
  const initialStatus = useMemo(() => {
    const s = searchParams.get('status') ?? '';
    return BOOKING_STATUSES.includes(s as any) ? s : '';
  }, [searchParams]);

  return (
    <CrudPage<Row>
      title="Booking Asset"
      description="Peminjaman aset internal (projector, laptop, periferal) antar divisi."
      icon={Calendar}
      endpoint="/api/bookings"
      createFeature="booking"
      updateFeature="booking"
      deleteFeature="booking"
      statusKey="status"
      statusOptions={BOOKING_STATUSES}
      initialStatus={initialStatus}
      searchPlaceholder="Cari kode booking, peminjam, aset, atau lokasi..."
      emptyTitle="Belum ada booking aset"
      emptyDescription="Catat peminjaman aset agar tidak terjadi bentrok jadwal antar divisi."
      rowLabel={(r) => r.bookingCode}
      columns={[
        { key: 'bookingCode', header: 'Kode', cell: (r) => <CodeBadge>{r.bookingCode}</CodeBadge> },
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
                {r.endDate && r.endDate !== r.startDate ? ` - ${formatDate(r.endDate)}` : ''}
              </p>
              <p className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {r.startTime ?? '-'}
                {r.endTime ? ` - ${r.endTime}` : ''}
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
          key: 'itemType',
          label: 'Aset',
          type: 'select',
          required: true,
          options: ITEM_TYPES.map((t) => ({ value: t, label: t })),
          defaultValue: 'Projector',
        },
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          options: toOptions(BOOKING_STATUSES),
          defaultValue: 'Pending',
        },
        { key: 'startDate', label: 'Tanggal Mulai', type: 'date', required: true },
        { key: 'startTime', label: 'Jam Mulai', type: 'text', placeholder: 'mis. 09:00' },
        { key: 'endDate', label: 'Tanggal Selesai', type: 'date', hint: 'Kosongkan bila hanya satu hari' },
        { key: 'endTime', label: 'Jam Selesai', type: 'text', placeholder: 'mis. 17:00' },
        { key: 'location', label: 'Lokasi', type: 'text', span: 3, placeholder: 'mis. Ruang Meeting Lt. 3' },
      ]}
    />
  );
}