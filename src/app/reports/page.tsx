'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { PageHeader, Panel, EmptyState, TableSkeleton, StatCard } from '@/components/ui/layout';
import { DataTable, Column, StatusBadge, CodeBadge, Pagination, Toolbar, SearchInput } from '@/components/ui/data-display';
import { BrandLogoForPrint } from '@/components/BrandLogo';
import { formatRupiah, formatDate, formatNumber, formatDateTime } from '@/lib/format';
import { REPORT_LABELS, REPORT_TYPES, ReportType } from '@/lib/reports';
import { REPORT_COLUMNS, ReportColumn, isMoneyColumn } from '@/lib/report-columns';
import { COMPANY_LEGAL_NAME, COPYRIGHT_TEXT } from '@/lib/config';
import { BarChart3, Printer, Download, FileSpreadsheet, Info, CalendarRange } from 'lucide-react';

/** Render satu sel sesuai tipe kolomnya. */
function renderCell(col: ReportColumn, row: any) {
  const raw = row[col.key];

  switch (col.type) {
    case 'money':
      return <span className="tabular-nums">{formatRupiah(Number(raw ?? 0))}</span>;
    case 'number':
      return <span className="tabular-nums">{formatNumber(Number(raw ?? 0))}</span>;
    case 'date':
      return <span className="whitespace-nowrap text-muted-foreground">{formatDate(raw)}</span>;
    case 'datetime':
      return <span className="whitespace-nowrap text-muted-foreground">{formatDateTime(raw)}</span>;
    case 'code':
      return raw ? <CodeBadge>{String(raw)}</CodeBadge> : <span className="text-muted-foreground">-</span>;
    case 'status':
      return <StatusBadge status={raw ?? '-'} />;
    default:
      return raw === null || raw === undefined || raw === '' ? (
        <span className="text-muted-foreground">-</span>
      ) : (
        <span className="text-foreground">{String(raw)}</span>
      );
  }
}

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
  const [exporting, setExporting] = useState(false);

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

  const cols = useMemo(() => (type ? (REPORT_COLUMNS[type] ?? []) : []), [type]);

  const tableColumns: Column<any>[] = useMemo(
    () =>
      cols.map((c) => ({
        key: c.key,
        header: c.header,
        hideOnMobile: c.hideOnMobile,
        numeric: c.type === 'money' || c.type === 'number',
        cell: (r: any) => renderCell(c, r),
      })),
    [cols],
  );

  /** Unduh lewat server supaya logo ikut tertanam di berkas .xlsx. */
  const download = async (format: 'xlsx' | 'csv') => {
    if (!type) return;
    setExporting(true);
    try {
      const qs = new URLSearchParams({ type, format });
      if (search.trim()) qs.set('search', search.trim());
      if (range.from) qs.set('date_from', range.from);
      if (range.to) qs.set('date_to', range.to);

      const res = await apiFetch(`/api/reports/export?${qs}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Gagal mengekspor laporan');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast('success', `Laporan diunduh sebagai .${format} (logo perusahaan disertakan).`);
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Kop cetak - hanya tampil saat print */}
      <div className="print-only mb-3 border-b border-black pb-2">
        <div className="flex items-center gap-3">
          <BrandLogoForPrint size={48} />
          <div>
            <p style={{ fontSize: '13pt', fontWeight: 700 }}>{COMPANY_LEGAL_NAME}</p>
            <p style={{ fontSize: '9pt' }}>{type ? REPORT_LABELS[type] : 'Laporan'}</p>
          </div>
        </div>
      </div>

      <div className="no-print space-y-5">
        <PageHeader
          icon={BarChart3}
          title="Reporting"
          description={`Rekap data sesuai divisi - ${isSuperAdmin ? 'seluruh divisi' : division ?? '-'}. Semua hasil unduhan memuat logo perusahaan.`}
          actions={
            <>
              <button className="xh-btn xh-btn-secondary" onClick={() => download('csv')} disabled={!rows.length || exporting}>
                <Download className="h-4 w-4" />
                CSV
              </button>
              <button className="xh-btn xh-btn-secondary" onClick={() => download('xlsx')} disabled={!rows.length || exporting}>
                <FileSpreadsheet className="h-4 w-4" />
                Excel + Logo
              </button>
              <button className="xh-btn xh-btn-primary" onClick={() => window.print()} disabled={!rows.length}>
                <Printer className="h-4 w-4" />
                Cetak
              </button>
            </>
          }
        />

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
              <StatCard label="Halaman" value={`${pagination.page} / ${pagination.totalPages}`} icon={CalendarRange} tone="neutral" />
              <StatCard label="Divisi" value={isSuperAdmin ? 'Semua' : (division ?? '-')} icon={BarChart3} tone="success" />
            </div>

            <Panel padded={false}>
              <Toolbar>
                <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Cari data pada laporan..." />
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    aria-label="Dari tanggal"
                    className="xh-input w-[145px]"
                    value={range.from}
                    onChange={(e) => { setRange({ ...range, from: e.target.value }); setPage(1); }}
                  />
                  <span className="text-[11.5px] text-muted-foreground">s.d.</span>
                  <input
                    type="date"
                    aria-label="Sampai tanggal"
                    className="xh-input w-[145px]"
                    value={range.to}
                    onChange={(e) => { setRange({ ...range, to: e.target.value }); setPage(1); }}
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

        <p className="print-hidden text-center text-[11px] text-muted-foreground">{COPYRIGHT_TEXT}</p>
      </div>

      <div className="print-only">
        <p style={{ fontSize: '9pt' }}>
          {type ? REPORT_LABELS[type] : 'Laporan'} - {isSuperAdmin ? 'Semua divisi' : division} - Dicetak oleh{' '}
          {user?.name ?? '-'} pada {formatDate(new Date())}
        </p>
        <p style={{ fontSize: '8pt', marginTop: '4px' }}>{COPYRIGHT_TEXT}</p>
      </div>
    </div>
  );
}