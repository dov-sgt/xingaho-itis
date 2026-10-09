'use client';

import React from 'react';
import { CrudPage } from '@/components/ui/crud-page';
import { CodeBadge } from '@/components/ui/data-display';
import { formatDate } from '@/lib/format';
import { EMPLOYEE_STATUSES, toOptions } from '@/lib/options';
import { Briefcase, Mail, Phone, Building2 } from 'lucide-react';

type Row = {
  id: number;
  employeeCode: string;
  nik: string;
  name: string;
  department: string;
  position: string;
  joinDate: string;
  status: string;
  phone: string | null;
  email: string | null;
};

export default function EmployeesPage() {
  return (
    <CrudPage<Row>
      title="Data Karyawan"
      description="Data induk karyawan HR: identitas, departemen, posisi, dan status kepegawaian."
      icon={Briefcase}
      endpoint="/api/employees"
      createFeature="employee_data"
      updateFeature="employee_data"
      deleteFeature="employee_data"
      statusKey="status"
      statusOptions={EMPLOYEE_STATUSES}
      searchPlaceholder="Cari kode, NIK, nama, atau departemen…"
      emptyTitle="Belum ada data karyawan"
      emptyDescription="Tambahkan data karyawan agar pengajuan cuti dan laporan HR dapat dibuat."
      rowLabel={(r) => r.name}
      columns={[
        { key: 'employeeCode', header: 'Kode', cell: (r) => <CodeBadge>{r.employeeCode}</CodeBadge>, hideOnMobile: true },
        { key: 'nik', header: 'NIK', cell: (r) => <span className="font-mono text-[11.5px] text-muted-foreground-strong">{r.nik}</span> },
        {
          key: 'name',
          header: 'Nama',
          cell: (r) => <span className="font-medium text-foreground">{r.name}</span>,
        },
        {
          key: 'department',
          header: 'Departemen',
          cell: (r) => (
            <span className="flex items-center gap-1 text-[12px] text-muted-foreground-strong">
              <Building2 className="h-3.5 w-3.5" />
              {r.department}
            </span>
          ),
        },
        { key: 'position', header: 'Posisi', cell: (r) => <span className="text-[12px] text-muted-foreground">{r.position}</span> },
        { key: 'joinDate', header: 'Masuk', cell: (r) => <span className="whitespace-nowrap text-[11.5px] text-muted-foreground">{formatDate(r.joinDate)}</span>, hideOnMobile: true },
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
      ]}
      fields={[
        { key: 'name', label: 'Nama Lengkap', type: 'text', required: true, span: 2 },
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          options: toOptions(EMPLOYEE_STATUSES),
          defaultValue: 'Active',
        },
        { key: 'nik', label: 'NIK', type: 'text', required: true },
        { key: 'department', label: 'Departemen', type: 'text', required: true },
        { key: 'position', label: 'Posisi', type: 'text', required: true },
        { key: 'joinDate', label: 'Tanggal Masuk', type: 'date', required: true },
        { key: 'phone', label: 'Telepon', type: 'text', placeholder: 'mis. 0812xxxxxxx' },
        { key: 'email', label: 'Email', type: 'text', placeholder: 'nama@perusahaan.com' },
      ]}
    />
  );
}