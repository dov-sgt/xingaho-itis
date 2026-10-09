'use client';

import React from 'react';
import { CrudPage } from '@/components/ui/crud-page';
import { CodeBadge, StatusBadge } from '@/components/ui/data-display';
import { formatDate } from '@/lib/format';
import { COMPLIANCE_OPTIONS, toOptions } from '@/lib/options';
import { Headphones, ExternalLink, User2, Timer } from 'lucide-react';

type Row = {
  id: number;
  reviewCode: string;
  date: string;
  agenName: string;
  nasabahName: string | null;
  recordingUrl: string | null;
  duration: string | null;
  reviewedBy: string;
  compliance: string;
  notes: string | null;
};

const COMPLIANCE_TONE: Record<string, 'success' | 'danger' | 'warning'> = {
  Compliant: 'success',
  'Non-Compliant': 'danger',
  'Need Review': 'warning',
};

export default function RecordingReviewsPage() {
  return (
    <CrudPage<Row>
      title="Recording Review"
      description="Audit rekaman panggilan beserta hasil review compliance-nya."
      icon={Headphones}
      endpoint="/api/recording-reviews"
      searchPlaceholder="Cari kode review, agen, nasabah, atau reviewer…"
      emptyTitle="Belum ada recording review"
      emptyDescription="Catat rekaman yang telah direview beserta kesimpulan compliance-nya."
      rowLabel={(r) => r.reviewCode}
      columns={[
        { key: 'reviewCode', header: 'Kode', cell: (r) => <CodeBadge>{r.reviewCode}</CodeBadge>, hideOnMobile: true },
        { key: 'date', header: 'Tanggal', cell: (r) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(r.date)}</span> },
        {
          key: 'agenName',
          header: 'Agen',
          cell: (r) => (
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{r.agenName}</p>
              <p className="truncate text-[10.5px] text-muted-foreground">{r.nasabahName ? `Nasabah: ${r.nasabahName}` : '-'}</p>
            </div>
          ),
        },
        {
          key: 'duration',
          header: 'Durasi',
          cell: (r) => (
            <span className="flex items-center gap-1 whitespace-nowrap text-[11.5px] text-muted-foreground">
              <Timer className="h-3 w-3" />
              {r.duration || '-'}
            </span>
          ),
          hideOnMobile: true,
        },
        { key: 'reviewedBy', header: 'Reviewer', cell: (r) => <span className="text-[12px] text-muted-foreground-strong">{r.reviewedBy}</span> },
        {
          key: 'compliance',
          header: 'Compliance',
          cell: (r) => <StatusBadge status={r.compliance} tone={COMPLIANCE_TONE[r.compliance] ?? 'neutral'} />,
        },
        {
          key: 'recordingUrl',
          header: 'Recording',
          cell: (r) =>
            r.recordingUrl ? (
              <a
                href={r.recordingUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                Buka
              </a>
            ) : (
              <span className="text-[11.5px] italic text-muted-foreground">-</span>
            ),
          hideOnMobile: true,
        },
      ]}
      fields={[
        { key: 'agenName', label: 'Nama Agen', type: 'text', required: true, span: 2 },
        { key: 'compliance', label: 'Compliance', type: 'select', required: true, options: toOptions(COMPLIANCE_OPTIONS) },
        { key: 'date', label: 'Tanggal', type: 'date', defaultValue: new Date().toISOString().slice(0, 10) },
        { key: 'nasabahName', label: 'Nama Nasabah', type: 'text' },
        { key: 'duration', label: 'Durasi', type: 'text', placeholder: 'mis. 04:32' },
        { key: 'reviewedBy', label: 'Nama Reviewer', type: 'text', required: true },
        { key: 'recordingUrl', label: 'Link Recording', type: 'text', span: 3, placeholder: 'https://… (opsional)' },
        { key: 'notes', label: 'Catatan Review', type: 'textarea', span: 3 },
      ]}
      info={
        <>
          Hasil review ditandai dengan warna: <strong>Compliant</strong> hijau, <strong>Non-Compliant</strong> merah,
          dan <strong>Need Review</strong> kuning.
        </>
      }
    />
  );
}