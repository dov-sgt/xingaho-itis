'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { PageHeader, Panel, EmptyState, TableSkeleton, StatCard } from '@/components/ui/layout';
import { DataTable, Column, StatusBadge, CodeBadge, Pagination, Toolbar, SearchInput } from '@/components/ui/data-display';
import { formatRupiah, formatDate, formatNumber } from '@/lib/format';
import { REPORT_LABELS, REPORT_TYPES, ReportType } from '@/lib/reports';
import { BarChart3, Printer, Download, FileSpreadsheet, Info, CalendarRange } from 'lucide-react';

/** Definisi kolom per jenis laporan — dipakai untuk merender + ekspor. */
type Col = { key: string; header: string; render: (r: any) => React.ReactNode; numeric?: boolean };

const COLUMNS: Record<ReportType, Col[]> = {
  headset: [
    { key: 'date', header: 'Tanggal', render: (r) => formatDate(r.date) },
    { key: 'nik', header: 'NIK', render: (r) => <span className="font-mono text-[11.5px]">{r.nik}</span> },
    { key: 'name', header: 'Nama', render: (r) => r.name },
    { key: 'vendor', header: 'Vendor', render: (r) => r.vendor },
    { key: 'project', header: 'Project', render: (r) => r.project || '-' },
    { key: 'itemName', header: 'Item', render: (r) => r.itemName || '-' },
    { key: 'deposit', header: 'Deposit', render: (r) => formatRupiah(r.deposit), numeric: true },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ],
  damaged: [
    { key: 'date', header: 'Tanggal', render: (r) => formatDate(r.date) },
    { key: 'itemName', header: 'Item', render: (r) => r.itemName },
    { key: 'itemCode', header: 'Kode', render: (r) => (r.itemCode ? <CodeBadge>{r.itemCode}</CodeBadge> : '-') },
    { key: 'qty', header: 'Qty', render: (r) => formatNumber(r.qty), numeric: true },
    { key: 'employeeName', header: 'Pengguna', render: (r) => r.employeeName || '-' },
    { key: 'nik', header: 'NIK', render: (r) => <span className="font-mono text-[11.5px]">{r.nik || '-'}</span> },
    { key: 'condition', header: 'Kondisi', render: (r) => <StatusBadge status={r.condition} tone="danger" /> },
    { key: 'note', header: 'Catatan', render: (r) => r.note || '-' },
  ],
  stocks: [
    { key: 'itemName', header: 'Nama Item', render: (r) => r.itemName },
    { key: 'itemCode', header: 'Kode', render: (r) => (r.itemCode ? <CodeBadge>{r.itemCode}</CodeBadge> : '-') },
    { key: 'category', header: 'Kategori', render: (r) => r.category || '-' },
    { key: 'currentStock', header: 'Ready Stock', render: (r) => <span className="font-bold tabular-nums">{formatNumber(r.currentStock)}</span>, numeric: true },
    { key: 'inStock', header: 'Total Masuk', render: (r) => formatNumber(r.inStock), numeric: true },
    { key: 'outStock', header: 'Total Keluar', render: (r) => formatNumber(r.outStock), numeric: true },
  ],
  purchase_request: [
    { key: 'prNumber', header: 'No. PR', render: (r) => <CodeBadge>{r.prNumber}</CodeBadge> },
    { key: 'date', header: 'Tanggal', render: (r) => formatDate(r.date) },
    { key: 'itemName', header: 'Item', render: (r) => r.itemName },
    { key: 'qty', header: 'Qty', render: (r) => formatNumber(r.qty), numeric: true },
    { key: 'shipmentCost', header: 'Shipment', render: (r) => formatRupiah(r.shipmentCost), numeric: true },
    { key: 'diskon', header: 'Discount', render: (r) => formatRupiah(r.diskon), numeric: true },
    { key: 'grandTotal', header: 'Grand Total', render: (r) => <span className="font-bold tabular-nums">{formatRupiah(r.grandTotal || r.totalPrice)}</span>, numeric: true },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ],
  delivery_order: [
    { key: 'doNumber', header: 'No. DO', render: (r) => <CodeBadge>{r.doNumber}</CodeBadge> },
    { key: 'prNumber', header: 'No. PR', render: (r) => r.prNumber || 'Manual' },
    { key: 'itemName', header: 'Item', render: (r) => r.itemName },
    { key: 'qtyOrdered', header: 'Dipesan', render: (r) => formatNumber(r.qtyOrdered), numeric: true },
    { key: 'qtyReceived', header: 'Diterima', render: (r) => formatNumber(r.qtyReceived), numeric: true },
    { key: 'recipient', header: 'Penerima', render: (r) => r.recipient },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ],
  submission: [
    { key: 'submissionCode', header: 'No.', render: (r) => <CodeBadge>{r.submissionCode}</CodeBadge> },
    { key: 'date', header: 'Tanggal', render: (r) => formatDate(r.date) },
    { key: 'title', header: 'Judul', render: (r) => r.title },
    { key: 'namaPembuat', header: 'Nama Pembuat', render: (r) => r.namaPembuat || '-' },
    { key: 'category', header: 'Kategori', render: (r) => r.category },
    { key: 'proposedPrice', header: 'Estimasi', render: (r) => formatRupiah(r.proposedPrice), numeric: true },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ],
  laptops: [
    { key: 'item', header: 'Spesifikasi', render: (r) => r.item },
    { key: 'user', header: 'PIC / User', render: (r) => r.user },
    { key: 'status', header: 'Kondisi', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'date', header: 'Tanggal', render: (r) => formatDate(r.date) },
  ],
  employees: [
    { key: 'employeeCode', header: 'Kode', render: (r) => <CodeBadge>{r.employeeCode}</CodeBadge> },
    { key: 'nik', header: 'NIK', render: (r) => <span className="font-mono text-[11.5px]">{r.nik}</span> },
    { key: 'name', header: 'Nama', render: (r) => r.name },
    { key: 'department', header: 'Departemen', render: (r) => r.department },
    { key: 'position', header: 'Posisi', render: (r) => r.position },
    { key: 'joinDate', header: 'Masuk', render: (r) => formatDate(r.joinDate) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ],
  leave_requests: [
    { key: 'requestCode', header: 'Kode', render: (r) => <CodeBadge>{r.requestCode}</CodeBadge> },
    { key: 'leaveType', header: 'Tipe', render: (r) => r.leaveType },
    { key: 'startDate', header: 'Mulai', render: (r) => formatDate(r.startDate) },
    { key: 'endDate', header: 'Selesai', render: (r) => formatDate(r.endDate) },
    { key: 'reason', header: 'Alasan', render: (r) => r.reason },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ],
  findings: [
    { key: 'findingCode', header: 'Kode', render: (r) => <CodeBadge>{r.findingCode}</CodeBadge> },
    { key: 'date', header: 'Tanggal', render: (r) => formatDate(r.date) },
    { key: 'agenName', header: 'Agen', render: (r) => r.agenName },
    { key: 'findingType', header: 'Tipe', render: (r) => <CodeBadge>{r.findingType}</CodeBadge> },
    { key: 'severity', header: 'Severity', render: (r) => <StatusBadge status={r.severity} tone={r.severity === 'High' || r.severity === 'Critical' ? 'danger' : 'warning'} /> },
    { key: 'description', header: 'Deskripsi', render: (r) => r.description },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ],
  recording_reviews: [
    { key: 'reviewCode', header: 'Kode', render: (r) => <CodeBadge>{r.reviewCode}</CodeBadge> },
    { key: 'date', header: 'Tanggal', render: (r) => formatDate(r.date) },
    { key: 'agenName', header: 'Agen', render: (r) => r.agenName },
    { key: 'nasabahName', header: 'Nasabah', render: (r) => r.nasabahName || '-' },
    { key: 'reviewedBy', header: 'Reviewer', render: (r) => r.reviewedBy },
    { key: 'compliance', header: 'Compliance', render: (r) => <StatusBadge status={r.compliance} tone={r.compliance === 'Compliant' ? 'success' : r.compliance === 'Non-Compliant' ? 'danger' : 'warning'} /> },
  ],
};

export default function ReportsPage() {
  const { user, division, isSuperAdmin, apiFetch } = useAuth();
  const { toast } = useToast();

  const [available, setAvailable] = useState<ReportType[]>([]);
  const [type, setType] = useState<ReportType | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 25, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [range, setRange] = useState({ from: '', to: '' });

  // Katalog laporan mengikuti divisi user (dari server, bukan hardcode di client).
  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch('/api/reports');
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Gagal memuat daftar laporan');
        const types: ReportType[] = json.types ?? [];
        setAvailable(types);
        if (types.length) setType(types[0]);
      } catch (e: any) {
        toast('error', e.message);
      } finally {
        setLoadingCatalog(false);
      }
    })();
  }, [apiFetch, toast]);

  const load = useCallback(async () => {
    if (!type) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({ type, page: String(page), pageSize: '25' });
      if (search.trim()) qs.set('search', search.trim());
      if (range.from) qs.set('date_from', range.from);
      if (range.to) qs.set('date_to', range.to);

      const res = await apiFetch(`/api/reports?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal memuat laporan');
      setRows(json.data ?? []);
      setPagination(json.pagination ?? { page: 1, pageSize: 25, total: 0, totalPages: 1 });
    } catch (e: any) {
      toast('error', e.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, type, page, search, range.from, range.to, toast]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const cols = type ? COLUMNS[type] : [];
  const tableColumns: Column<any>[] = useMemo(
    () => cols.map((c) => ({ key: c.key, header: c.header, cell: c.render, numeric: c.numeric })),
    [cols],
  );

  const exportCsv = () => {
    if (!rows.length || !type) return;
    const header = cols.map((c) => c.header).join(',');
    const body = rows
      .map((r) =>
        cols
          .map((c) => {
            const raw = r[c.key];
            const v = raw === null || raw === undefined ? '' : String(raw);
            return `"${v.replace(/"/g, '""')}"`;
          })
          .join(','),
      )
      .join('\n');
    const blob = new Blob([`﻿${header}\n${body}\n`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('success', 'Laporan diekspor ke CSV.');
  };

  return (
    <div className="space-y-5">
      <PageHeader
        icon={BarChart3}
        title="Reporting"
        description={`Rekap data sesuai divisi — ${isSuperAdmin ? 'seluruh divisi' : division ?? '-'} . Gunakan filter dan cetak langsung dari browser.`}
        actions={
          <>
            <button className="xh-btn xh-btn-secondary" onClick={exportCsv} disabled={!rows.length}>
              <Download className="h-4 w-4" />
              Ekspor CSV
            </button>
            <button className="xh-btn xh-btn-primary" onClick={() => window.print()} disabled={!rows.length}>
              <Printer className="h-4 w-4" />
              Cetak
            </button>
          </>
        }
      />

      {/* Pilih jenis laporan */}
      <Panel title="Pilih Laporan" description="Hanya laporan yang sesuai divisi Anda yang ditampilkan.">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {REPORT_TYPES.filter((t) => available.includes(t)).map((t) => (
            <button
              key={t}
              onClick={() => {
                setType(t);
                setPage(1);
              }}
              className={
                type === t
                  ? 'rounded-lg border border-primary bg-primary-subtle px-3 py-2.5 text-left text-[12px] font-semibold text-primary-subtle-foreground'
                  : 'rounded-lg border border-border bg-card px-3 py-2.5 text-left text-[12px] font-medium text-muted-foreground-strong transition-colors hover:bg-muted'
              }
            >
              {REPORT_LABELS[t]}
            </button>
          ))}
        </div>
      </Panel>

      {type && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Jenis Laporan" value={available.length} icon={FileSpreadsheet} tone="primary" />
            <StatCard label="Total Data" value={formatNumber(pagination.total)} icon={BarChart3} tone="info" />
            <StatCard
              label="Halaman"
              value={`${pagination.page} / ${pagination.totalPages}`}
              icon={CalendarRange}
              tone="neutral"
            />
            <StatCard label="Divisi" value={isSuperAdmin ? 'Semua' : (division ?? '-')} icon={BarChart3} tone="success" />
          </div>

          <Panel padded={false}>
            <Toolbar>
              <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Cari data pada laporan…" />
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  aria-label="Dari tanggal"
                  className="xh-input w-[145px]"
                  value={range.from}
                  onChange={(e) => {
                    setRange({ ...range, from: e.target.value });
                    setPage(1);
                  }}
                />
                <span className="text-[11.5px] text-muted-foreground">s.d.</span>
                <input
                  type="date"
                  aria-label="Sampai tanggal"
                  className="xh-input w-[145px]"
                  value={range.to}
                  onChange={(e) => {
                    setRange({ ...range, to: e.target.value });
                    setPage(1);
                  }}
                />
              </div>
            </Toolbar>
            <div className="p-3 sm:p-4">
              {loading ? (
                <TableSkeleton rows={8} cols={Math.min(7, cols.length)} />
              ) : (
                <>
                  <DataTable
                    columns={tableColumns}
                    rows={rows}
                    rowKey={(r, i) => r.id ?? i}
                    empty={
                      <EmptyState
                        icon={FileSpreadsheet}
                        title="Tidak ada data"
                        description="Belum ada data untuk laporan ini pada rentang filter yang dipilih."
                      />
                    }
                  />
                  <Pagination {...pagination} onPageChange={setPage} />
                </>
              )}
            </div>
          </Panel>
        </>
      )}

      {!loadingCatalog && !available.length && (
        <Panel>
          <div className="flex items-start gap-2.5 text-[12.5px] text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Belum ada laporan yang tersedia untuk divisi Anda. Hubungi SuperAdmin bila akses ini diperlukan.</p>
          </div>
        </Panel>
      )}

      {/* Header cetak — hanya tampil saat print */}
      <div className="print-only mb-3">
        <p style={{ fontSize: '12pt', fontWeight: 700 }}>{type ? REPORT_LABELS[type] : 'Laporan'} — Xinghao ITIS</p>
        <p style={{ fontSize: '9pt' }}>
          Dicetak oleh {user?.name ?? '-'} pada {formatDate(new Date())}
        </p>
      </div>
    </div>
  );
}