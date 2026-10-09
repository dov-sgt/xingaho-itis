'use client';

import React from 'react';
import { CrudPage } from '@/components/ui/crud-page';
import { CodeBadge } from '@/components/ui/data-display';
import { VENDOR_STATUSES, toOptions } from '@/lib/options';
import { Building2, Phone, Mail, MapPin, UserRound } from 'lucide-react';

type Row = {
  id: number;
  code: string;
  name: string;
  serviceType: string | null;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  status: string;
};

export default function VendorsPage() {
  return (
    <CrudPage<Row>
      title="Master Vendor"
      description="Daftar vendor pemasok beserta kontak dan jenis layanan."
      icon={Building2}
      endpoint="/api/master/vendors"
      createFeature="master_vendor"
      updateFeature="master_vendor"
      deleteFeature="master_vendor"
      statusKey="status"
      statusOptions={VENDOR_STATUSES}
      searchPlaceholder="Cari kode, nama vendor, atau kontak..."
      emptyTitle="Belum ada vendor"
      emptyDescription="Tambahkan vendor sebagai acuan untuk Pengajuan dan Purchase Request."
      rowLabel={(r) => r.name}
      columns={[
        { key: 'code', header: 'Kode', cell: (r) => <CodeBadge>{r.code}</CodeBadge>, hideOnMobile: true },
        {
          key: 'name',
          header: 'Nama Vendor',
          cell: (r) => (
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{r.name}</p>
              {r.serviceType && <p className="truncate text-[10.5px] text-muted-foreground">{r.serviceType}</p>}
            </div>
          ),
        },
        {
          key: 'contactPerson',
          header: 'Narahubung',
          cell: (r) => (
            <span className="flex items-center gap-1 text-[12px] text-muted-foreground-strong">
              <UserRound className="h-3.5 w-3.5" />
              {r.contactPerson || '-'}
            </span>
          ),
          hideOnMobile: true,
        },
        {
          key: 'contact',
          header: 'Kontak',
          hideOnMobile: true,
          cell: (r) => (
            <div className="min-w-0 text-[11px] text-muted-foreground">
              {r.phone && (
                <p className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {r.phone}
                </p>
              )}
              {r.email && (
                <p className="flex items-center gap-1 truncate">
                  <Mail className="h-3 w-3" />
                  {r.email}
                </p>
              )}
              {!r.phone && !r.email && '-'}
            </div>
          ),
        },
        {
          key: 'address',
          header: 'Alamat',
          hideOnMobile: true,
          cell: (r) => (
            <span className="flex items-start gap-1 text-[11px] text-muted-foreground">
              <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
              <span className="line-clamp-2">{r.address || '-'}</span>
            </span>
          ),
        },
      ]}
      fields={[
        { key: 'name', label: 'Nama Vendor', type: 'text', required: true, span: 2 },
        { key: 'code', label: 'Kode Vendor', type: 'text', required: true, immutableOnEdit: true },
        { key: 'serviceType', label: 'Jenis Layanan', type: 'text', placeholder: 'mis. Sewa perangkat IT' },
        { key: 'contactPerson', label: 'Narahubung', type: 'text' },
        { key: 'phone', label: 'Telepon', type: 'text', placeholder: 'mis. 021-xxxxxxx' },
        { key: 'email', label: 'Email', type: 'text', placeholder: 'nama@vendor.com' },
        { key: 'address', label: 'Alamat', type: 'textarea', span: 3 },
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          options: toOptions(VENDOR_STATUSES),
          defaultValue: 'Active',
        },
      ]}
    />
  );
}
