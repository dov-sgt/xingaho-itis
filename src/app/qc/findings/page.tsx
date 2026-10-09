'use client';

import React from 'react';
import { CrudPage } from '@/components/ui/crud-page';
import { CodeBadge } from '@/components/ui/data-display';
import { formatDate } from '@/lib/format';
import { FINDING_TYPES, SEVERITIES, FINDING_STATUSES, toOptions } from '@/lib/options';
import { AlertTriangle, User2, Paperclip } from 'lucide-react';

type Row = {
  id: number;
  findingCode: string;
  date: string;
  agenName: string;
  findingType: string;
  severity: string;
  description: string;
  evidence: string | null;
  status: string;
  resolvedBy: string | null;
  resolutionNote: string | null;
};

const SEVERITY_TONE: Record<string, 'neutral' | 'warning' | 'danger' | 'info'> = {
  Low: 'neutral',
  Medium: 'warning',
  High: 'danger',
  Critical: 'danger',
};

export default function FindingsPage() {
  return (
    <CrudPage<Row>
      title="QC Findings"
      description="Temuan quality control terhadap agen beserta severity dan tindakruhunya."
      icon={AlertTriangle}
      endpoint="/api/findings"
      createFeature="finding"
      updateFeature="finding"
      deleteFeature="finding"
      statusKey="status"
      statusOptions={FINDING_STATUSES}
      searchPlaceholder="Cari kode temuan, agen, atau deskripsi..."
      emptyTitle="Belum ada temuan QC"
      emptyDescription="Temuan yang dicatat di sini menjadi bahan evaluasi kualitas layanan agen."
      rowLabel={(r) => r.findingCode}
      columns={[
        { key: 'findingCode', header: 'Kode', cell: (r) => <CodeBadge>{r.findingCode}</CodeBadge>, hideOnMobile: true },
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
        { key: 'findingType', header: 'Tipe', cell: (r) => <CodeBadge>{r.findingType}</CodeBadge>, hideOnMobile: true },
        {
          key: 'severity',
          header: 'Severity',
          cell: (r) => (
            <span className={r.severity === 'Critical' || r.severity === 'High' ? 'xh-chip xh-chip-danger' : 'xh-chip xh-chip-warning'}>
              {r.severity}
            </span>
          ),
        },
        { key: 'description', header: 'Deskripsi', cell: (r) => <span className="line-clamp-2 text-[11.5px] text-muted-foreground-strong">{r.description}</span> },
      ]}
      fields={[
        { key: 'agenName', label: 'Nama Agen', type: 'text', required: true, span: 2 },
        { key: 'severity', label: 'Severity', type: 'select', required: true, options: toOptions(SEVERITIES), defaultValue: 'Medium' },
        { key: 'findingType', label: 'Tipe Temuan', type: 'select', required: true, options: toOptions(FINDING_TYPES) },
        { key: 'date', label: 'Tanggal', type: 'date', defaultValue: new Date().toISOString().slice(0, 10) },
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          options: toOptions(FINDING_STATUSES),
          defaultValue: 'Open',
        },
        { key: 'description', label: 'Deskripsi Temuan', type: 'textarea', required: true, span: 3 },
        { key: 'evidence', label: 'Bukti / Link', type: 'text', span: 3, placeholder: 'URL atau referensi bukti (opsional)' },
        { key: 'resolvedBy', label: 'Ditangani Oleh', type: 'text', span: 2 },
        { key: 'resolutionNote', label: 'Catatan Penyelesaian', type: 'text', span: 1 },
      ]}
      info={
        <>
          Temuan dengan severity <strong>High</strong> atau <strong>Critical</strong> ditandai merah. Setelah diselesaikan,
          ubah status menjadi <strong>Resolved</strong> dan isi penangan.
        </>
      }
    />
  );
}