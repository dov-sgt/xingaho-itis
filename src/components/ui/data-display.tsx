'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* Status badge                                                        */
/* ------------------------------------------------------------------ */

export type StatusTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

const TONE_CLASS: Record<StatusTone, string> = {
  neutral: 'xh-chip-neutral',
  primary: 'xh-chip-primary',
  success: 'xh-chip-success',
  warning: 'xh-chip-warning',
  danger: 'xh-chip-danger',
  info: 'xh-chip-info',
};

/**
 * Peta status -> warna. Satu sumber kebenaran untuk seluruh aplikasi sehingga
 * "Pending" selalu kuning, "Approved" selalu hijau, dan "${...}".
 */
const STATUS_TONE_MAP: Record<string, StatusTone> = {
  // Purchase Request
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  rejected_: 'danger',
  ordered: 'info',
  completed: 'primary',
  // Delivery Order
  partial: 'warning',
  received: 'success',
  // Pengajuan
  used: 'info',
  good: 'success',
  damage: 'danger',
  return: 'warning',
  // QC
  open: 'warning',
  'in progress': 'info',
  resolved: 'success',
  // Booking / Servis
  active: 'success',
  returned: 'neutral',
  done: 'success',
  onprogress: 'info',
  // Generic
  active_: 'success',
  inactive: 'neutral',
  archived: 'neutral',
  scheduled: 'info',
  confirmed: 'success',
  cancelled: 'danger',
  draft: 'neutral',
};

export function toneForStatus(status: string | null | undefined): StatusTone {
  const key = String(status ?? '').trim().toLowerCase();
  return STATUS_TONE_MAP[key] ?? 'neutral';
}

export function StatusBadge({
  status,
  tone,
  className,
  label,
}: {
  status: string | null | undefined;
  tone?: StatusTone;
  className?: string;
  label?: string;
}) {
  const resolved = tone ?? toneForStatus(status);
  return (
    <span className={cn('xh-chip', TONE_CLASS[resolved], className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden />
      {label ?? (status ? String(status) : '-')}
    </span>
  );
}

/** Badge untuk kode permission/role, tampilan netral. */
export function CodeBadge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-muted-foreground-strong',
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Data table                                                          */
/* ------------------------------------------------------------------ */

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  /** Sel contents. */
  cell: (row: T) => React.ReactNode;
  /** Right-align + tabular numerals. */
  numeric?: boolean;
  className?: string;
  headerClassName?: string;
  /** Sembunyikan kolom ini di layar kecil (< sm). */
  hideOnMobile?: boolean;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => React.Key;
  onRowClick?: (row: T) => void;
  empty?: React.ReactNode;
  compact?: boolean;
  /** Kolom yang disembunyikan di layar kecil (< sm). */
  hideOnMobile?: string[];
  className?: string;
  maxHeight?: string;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  empty,
  compact = true,
  hideOnMobile = [],
  className,
  maxHeight,
}: DataTableProps<T>) {
  const hidden = useMemo(() => {
    const set = new Set(hideOnMobile);
    columns.forEach((c) => {
      if (c.hideOnMobile) set.add(c.key);
    });
    return set;
  }, [columns, hideOnMobile]);

  if (!rows.length) {
    return <>{empty ?? <div className="py-10 text-center text-[12.5px] text-muted-foreground">Belum ada data.</div>}</>;
  }

  return (
    <div className={cn('xh-table-wrapper', className)} style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}>
      <table className={cn('xh-table', compact && 'xh-table-compact')}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={cn(c.numeric && 'text-right', hidden.has(c.key) && 'hidden sm:table-cell', c.headerClassName)}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={rowKey(row, i)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(onRowClick && 'cursor-pointer')}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cn(
                    c.numeric && 'num',
                    hidden.has(c.key) && 'hidden sm:table-cell',
                    c.className,
                  )}
                >
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pagination                                                          */
/* ------------------------------------------------------------------ */

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total?: number;
  pageSize?: number;
  onPageChange: (p: number) => void;
}) {
  const pages = Math.max(1, totalPages);
  if (pages <= 1) {
    return total !== undefined ? (
      <p className="px-1 py-2 text-[11.5px] text-muted-foreground">
        Menampilkan <span className="font-semibold tabular-nums">{total}</span> data
      </p>
    ) : null;
  }

  const window: (number | '…')[] = [];
  const push = (n: number) => window.push(n);
  if (pages <= 7) {
    for (let i = 1; i <= pages; i++) push(i);
  } else {
    push(1);
    if (page > 3) window.push('…');
    for (let i = Math.max(2, page - 1); i <= Math.min(pages - 1, page + 1); i++) push(i);
    if (page < pages - 2) window.push('…');
    push(pages);
  }

  const btn = 'xh-btn xh-btn-sm h-8 min-w-8 px-2';

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pt-3">
      {total !== undefined && (
        <p className="text-[11.5px] text-muted-foreground">
          Menampilkan <span className="font-semibold tabular-nums">{(page - 1) * (pageSize ?? 10) + 1}</span>–
          <span className="font-semibold tabular-nums">{Math.min(page * (pageSize ?? 10), total)}</span> dari{' '}
          <span className="font-semibold tabular-nums">{total}</span> data
        </p>
      )}
      <div className="flex items-center gap-1">
        <button className={btn} disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Halaman sebelumnya">
          ‹
        </button>
        {window.map((p, i) =>
          p === '…' ? (
            <span key={`gap-${i}`} className="px-1 text-[11.5px] text-muted-foreground">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              aria-current={p === page ? 'page' : undefined}
              className={cn(btn, p === page ? 'bg-primary text-primary-foreground' : 'border border-border bg-card hover:bg-muted')}
            >
              {p}
            </button>
          ),
        )}
        <button className={btn} disabled={page >= pages} onClick={() => onPageChange(page + 1)} aria-label="Halaman berikutnya">
          ›
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Toolbar (search + filters)                                          */
/* ------------------------------------------------------------------ */

export function Toolbar({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2 border-b border-border bg-surface-raised/60 px-3 py-2.5', className)}>
      {children}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Cari…',
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn('relative min-w-[180px] flex-1', className)}>
      <svg
        className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="xh-input pl-8"
      />
    </div>
  );
}