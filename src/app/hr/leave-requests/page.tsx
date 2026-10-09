'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CrudPage } from '@/components/ui/crud-page';
import { CodeBadge, StatusBadge } from '@/components/ui/data-display';
import { formatDate } from '@/lib/format';
import { LEAVE_TYPES, LEAVE_STATUSES, toOptions } from '@/lib/options';
import { CalendarOff, User2, CalendarDays } from 'lucide-react';

type Row = {
  id: number;
  requestCode: string;
  employeeId: number;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  approvedBy: string | null;
};

type EmployeeOption = { id: number; name: string; department: string };

export default function LeaveRequestsPage() {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);

  const loadEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/employees', { credentials: 'same-origin' });
      if (!res.ok) return;
      const json = await res.json();
      const list = Array.isArray(json) ? json : (json.data ?? []);
      setEmployees(
        list.map((e: any) => ({ id: e.id, name: e.name, department: e.department })),
      );
    } catch {
      setEmployees([]);
    }
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const employeeName = (id: number) => employees.find((e) => e.id === id)?.name ?? `Karyawan #${id}`;

  return (
    <CrudPage<Row>
      title="Leave Request"
      description="Pengajuan cuti dan izin karyawan. Persetujuan dicatat beserta nama pemberi izin."
      icon={CalendarOff}
      endpoint="/api/leave-requests"
      createFeature="user_management"
      updateFeature="user_management"
      deleteFeature="user_management"
      statusKey="status"
      statusOptions={LEAVE_STATUSES}
      searchPlaceholder="Cari kode, alasan, atau tipe cuti…"
      emptyTitle="Belum ada pengajuan cuti"
      emptyDescription="Pengajuan cuti karyawan akan tampil di sini lengkap dengan rentang tanggalnya."
      rowLabel={(r) => r.requestCode}
      columns={[
        { key: 'requestCode', header: 'Kode', cell: (r) => <CodeBadge>{r.requestCode}</CodeBadge>, hideOnMobile: true },
        {
          key: 'employee',
          header: 'Karyawan',
          cell: (r) => (
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <User2 className="h-3.5 w-3.5 text-muted-foreground" />
              {employeeName(r.employeeId)}
            </span>
          ),
        },
        { key: 'leaveType', header: 'Tipe', cell: (r) => <StatusBadge status={r.leaveType} tone="info" /> },
        {
          key: 'period',
          header: 'Periode',
          cell: (r) => (
            <span className="flex items-center gap-1 whitespace-nowrap text-[11.5px] text-muted-foreground">
              <CalendarDays className="h-3 w-3" />
              {formatDate(r.startDate)} – {formatDate(r.endDate)}
            </span>
          ),
          hideOnMobile: true,
        },
        { key: 'reason', header: 'Alasan', cell: (r) => <span className="text-[11.5px] text-muted-foreground-strong">{r.reason}</span> },
      ]}
      fields={[
        {
          key: 'employeeId',
          label: 'Karyawan',
          type: 'select',
          required: true,
          span: 2,
          options: employees.map((e) => ({ value: String(e.id), label: `${e.name} — ${e.department}` })),
        },
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          options: toOptions(LEAVE_STATUSES),
          defaultValue: 'Pending',
        },
        { key: 'leaveType', label: 'Tipe Cuti', type: 'select', required: true, options: toOptions(LEAVE_TYPES) },
        { key: 'startDate', label: 'Tanggal Mulai', type: 'date', required: true },
        { key: 'endDate', label: 'Tanggal Selesai', type: 'date', required: true },
        { key: 'reason', label: 'Alasan', type: 'textarea', required: true, span: 3 },
        { key: 'approvedBy', label: 'Disetujui Oleh', type: 'text', span: 3, hint: 'Diisi saat status diubah menjadi Approved' },
      ]}
      info={
        <>
          Setelah pengajuan disetujui, isikan kolom <strong>Disetujui Oleh</strong> dan ubah status menjadi{' '}
          <strong>Approved</strong>. Rentang tanggal akan otomatis tervalidasi (tanggal selesai ≥ tanggal mulai).
        </>
      }
    />
  );
}