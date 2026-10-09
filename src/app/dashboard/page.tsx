'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { PageHeader, Panel, EmptyState, TableSkeleton, Skeleton } from '@/components/ui/layout';
import { DataTable, Column, StatusBadge, Pagination, Toolbar } from '@/components/ui/data-display';
import { formatRupiah, formatNumber, formatDateTime, formatDate } from '@/lib/format';
import { LOW_STOCK_THRESHOLD } from '@/lib/config';
import {
  LayoutDashboard, Boxes, Building2, Headphones, ShoppingCart, Truck, FileText,
  Wallet, PackageSearch, AlertTriangle, TrendingDown, RefreshCw, PackageOpen,
  CheckCircle2, Clock, Users, UserCheck, ClipboardCheck, CreditCard, CalendarOff,
  Plus, PlayCircle, HandCoins, CalendarCheck,
} from 'lucide-react';

type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

type Kpi = { key: string; label: string; value: number; tone: Tone; icon?: string; hint?: string; money?: boolean };
type SummaryRowItem = { key: string; label: string; value: number; tone: Tone; feature?: string; href?: string };
type RecentRow = {
  id: number;
  name: string;
  code?: string | null;
  sub?: string | null;
  value: string | number;
  updatedAt: string;
  isLow?: boolean;
};
type Recent = { title: string; description: string; columns: string[]; rows: RecentRow[] };
type PaginationMeta = { page: number; pageSize: number; total: number; totalPages: number };

type DashboardData = {
  division: string;
  canSwitchDivision: boolean;
  divisions: string[];
  kpis: Kpi[];
  summary: SummaryRowItem[];
  lifecycle: { label: string; value: number; tone: Tone }[];
  recent: Recent;
  pagination: PaginationMeta;
};

const DIVISION_LABEL: Record<string, string> = { IT: 'IT', OPS: 'Ops', QC: 'Quality Control', HR: 'Human Resources' };

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  boxes: Boxes,
  building: Building2,
  headphones: Headphones,
  alert: AlertTriangle,
  cart: ShoppingCart,
  wallet: Wallet,
  truck: Truck,
  trending: TrendingDown,
  users: Users,
  clipboard: ClipboardCheck,
  clock: Clock,
  credit: CreditCard,
  check: CheckCircle2,
  building2: Building2,
  progress: PlayCircle,
  plus: UserCheck,
  // Item 4: kartu Booking Asset Pending memakai ikon kalender centang.
  calendar: CalendarCheck,
};

const TONE_CLASS: Record<Tone, string> = {
  primary: 'bg-primary-subtle text-primary-subtle-foreground',
  success: 'bg-success-subtle text-success-subtle-foreground',
  warning: 'bg-warning-subtle text-warning-subtle-foreground',
  danger: 'bg-danger-subtle text-danger-subtle-foreground',
  info: 'bg-info-subtle text-info-subtle-foreground',
  neutral: 'bg-muted text-muted-foreground-strong',
};

const TONE_TEXT: Record<Tone, string> = {
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  info: 'text-info',
  neutral: 'text-muted-foreground',
};

export default function DashboardPage() {
  const { division, apiFetch, can } = useAuth();
  const { toast } = useToast();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [view, setView] = useState<string | null>(null);

  const load = useCallback(
    async (targetPage = 1, silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      try {
        const qs = new URLSearchParams({ page: String(targetPage), pageSize: '10' });
        if (view) qs.set('division', view);
        const res = await apiFetch(`/api/dashboard?${qs}`);
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Gagal memuat dashboard');
        setData(json);
      } catch (e: any) {
        toast('error', e.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [apiFetch, view, toast],
  );

  useEffect(() => {
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, view]);

  const recentColumns: Column<RecentRow>[] = useMemo(() => {
    if (!data) return [];
    const set = new Set(data.recent.columns);
    const cols: Column<RecentRow>[] = [
      {
        key: 'name',
        header: 'Nama',
        cell: (r) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{r.name}</p>
            {r.code && <p className="truncate font-mono text-[10.5px] text-muted-foreground">{r.code}</p>}
          </div>
        ),
      },
    ];
    if (set.has('sub'))
      cols.push({
        key: 'sub',
        header: data.division === 'IT' ? 'Kategori' : 'Keterangan',
        hideOnMobile: true,
        cell: (r) => <span className="line-clamp-1 text-[11.5px] text-muted-foreground">{r.sub || '-'}</span>,
      });
    if (set.has('category'))
      cols.push({ key: 'sub', header: 'Kategori', hideOnMobile: true, cell: (r) => r.sub });
    if (set.has('stock'))
      cols.push({
        key: 'value',
        header: 'Jumlah Stok',
        numeric: true,
        cell: (r) => (
          <span className={r.isLow ? 'font-bold text-danger tabular-nums' : 'font-semibold tabular-nums text-foreground'}>
            {formatNumber(Number(r.value))}
          </span>
        ),
      });
    if (set.has('value'))
      cols.push({
        key: 'value',
        header: data.division === 'OPS' ? 'Janji Bayar' : data.division === 'QC' ? 'Severity' : 'Kode',
        numeric: data.division !== 'QC',
        cell: (r) => <span className="text-[11.5px] text-muted-foreground-strong">{String(r.value)}</span>,
      });
    if (set.has('updatedAt'))
      cols.push({
        key: 'updatedAt',
        header: 'Terakhir Diperbarui',
        hideOnMobile: true,
        cell: (r) => <span className="text-[11.5px] text-muted-foreground">{formatDateTime(r.updatedAt)}</span>,
      });
    if (set.has('flag'))
      cols.push({
        key: 'flag',
        header: 'Status',
        hideOnMobile: true,
        cell: (r) =>
          data.division === 'IT'
            ? r.isLow
              ? <StatusBadge status="Stok Menipis" tone="danger" />
              : <StatusBadge status="Aman" tone="success" />
            : r.isLow
              ? <StatusBadge status="Perlu Tindak Lanjut" tone="danger" />
              : <StatusBadge status="Normal" tone="success" />,
      });
    return cols;
  }, [data]);

  const kpis = data?.kpis ?? [];
  const divCode = data?.division ?? division ?? 'IT';

  return (
    <div className="space-y-5">
      <PageHeader
        icon={LayoutDashboard}
        title={`Dashboard ${DIVISION_LABEL[divCode] ?? divCode}`}
        description="Ringkasan operasional sesuai divisi Anda. Data langsung diambil dari server."
        actions={
          <>
            {/* SuperAdmin boleh berpindah divisi */}
            {data?.canSwitchDivision && (
              <div className="flex flex-wrap gap-1.5">
                {data.divisions.map((d) => (
                  <button
                    key={d}
                    onClick={() => {
                      setView(view === d ? null : d);
                      setPage(1);
                    }}
                    className={
                      view === d ? 'xh-btn xh-btn-primary h-9 px-3 text-[12px]' : 'xh-btn xh-btn-secondary h-9 px-3 text-[12px]'
                    }
                  >
                    {DIVISION_LABEL[d] ?? d}
                  </button>
                ))}
              </div>
            )}
            <button
              className="xh-btn xh-btn-secondary"
              onClick={() => {
                setRefreshing(true);
                load(page, true);
              }}
              disabled={refreshing}
            >
              <RefreshCw className={refreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
              Muat ulang
            </button>
          </>
        }
      />

      {/* KPI per divisi */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[86px]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {kpis.map((k) => {
            const Icon = ICONS[k.icon ?? 'boxes'] ?? Boxes;
            return (
              <div key={k.key} className="surface-card flex items-start gap-3 p-4">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${TONE_CLASS[k.tone]}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {k.label}
                  </p>
                  <p className="mt-1 text-xl font-bold leading-none tabular-nums text-foreground">
                    {k.money ? formatRupiah(k.value) : formatNumber(k.value)}
                  </p>
                  {k.hint && <p className="mt-1.5 text-[11px] text-muted-foreground">{k.hint}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Ringkasan alur */}
        <Panel title="Yang Perlu Ditindaklanjuti" description="Butuh perhatian segera">
          <ul className="space-y-2">
            {(data?.summary ?? []).map((s) => {
              if (s.feature && !can(s.feature, 'read')) return null;
              const Icon = s.tone === 'danger' ? AlertTriangle : s.tone === 'warning' ? Clock : CheckCircle2;
              const body = (
                <li className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2 transition-colors hover:bg-muted">
                  <Icon className={`h-4 w-4 shrink-0 ${TONE_TEXT[s.tone]}`} />
                  <span className="min-w-0 flex-1 truncate text-[12.5px] text-muted-foreground-strong">{s.label}</span>
                  <span className="shrink-0 text-[13px] font-bold tabular-nums text-foreground">{formatNumber(s.value)}</span>
                </li>
              );
              return s.href ? (
                <Link key={s.key} href={s.href} className="block">
                  {body}
                </Link>
              ) : (
                <li key={s.key}>{body}</li>
              );
            })}
          </ul>
        </Panel>

        {/* Distribusi status */}
        <Panel title="Distribusi Status" description={divCode === 'IT' ? 'Siklus Headset' : divCode === 'OPS' ? 'Status operasional' : divCode === 'QC' ? 'Status temuan & recording' : 'Status karyawan & cuti'}>
          <ul className="space-y-2.5">
            {(data?.lifecycle ?? []).map((l) => {
              const total = (data?.lifecycle ?? []).reduce((s, x) => s + x.value, 0) || 1;
              const pct = Math.round((l.value / total) * 100);
              return (
                <li key={l.label}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="truncate text-[12px] text-muted-foreground-strong">{l.label}</span>
                    <span className="shrink-0 text-[12px] font-bold tabular-nums text-foreground">{formatNumber(l.value)}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className={`h-1.5 rounded-full ${TONE_TEXT[l.tone].replace('text-', 'bg-')}`} style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>

        {/* Akses cepat */}
        <Panel title="Akses Cepat" description="Menu yang sering digunakan">
          <div className="grid grid-cols-2 gap-2">
            {quickLinks(divCode)
              .filter((q) => can(q.feature, 'read'))
              .map((q) => (
                <Link
                  key={q.href}
                  href={q.href}
                  className="flex flex-col items-start gap-1.5 rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-primary-subtle"
                >
                  <q.icon className="h-4 w-4 text-primary" />
                  <span className="text-[11.5px] font-semibold leading-tight text-foreground">{q.label}</span>
                </Link>
              ))}
          </div>
        </Panel>
      </div>

      {/* Tabel aktivitas terbaru */}
      <Panel
        title={data?.recent.title ?? 'Aktivitas Terakhir'}
        description={data?.recent.description}
        padded={false}
        bodyClassName="p-3 sm:p-4"
      >
        {loading ? (
          <TableSkeleton rows={6} cols={4} />
        ) : !data?.recent.rows.length ? (
          <EmptyState
            icon={PackageSearch}
            title="Belum ada data"
            description="Aktivitas terbaru akan muncul di sini begitu ada transaksi pada divisi ini."
          />
        ) : (
          <>
            <DataTable columns={recentColumns} rows={data.recent.rows} rowKey={(r) => r.id} />
            <Pagination
              page={data.pagination.page}
              totalPages={data.pagination.totalPages}
              total={data.pagination.total}
              pageSize={data.pagination.pageSize}
              onPageChange={setPage}
            />
          </>
        )}
      </Panel>
    </div>
  );
}

function quickLinks(division: string) {
  const all: Record<string, { href: string; label: string; icon: React.ComponentType<{ className?: string }>; feature: string }[]> = {
    IT: [
      { href: '/transactions/items', label: 'Headset User', icon: Headphones, feature: 'transaction_headset' },
      { href: '/inventory', label: 'Inventaris & Stok', icon: PackageSearch, feature: 'inventory_type_item' },
      { href: '/transactions/purchase-requests', label: 'Purchase Request', icon: ShoppingCart, feature: 'purchase_request' },
      { href: '/transactions/delivery-orders', label: 'Delivery Order', icon: Truck, feature: 'delivery_order' },
      { href: '/transactions/vendor-submissions', label: 'Pengajuan', icon: FileText, feature: 'vendor_submission' },
      { href: '/stock-out-transactions', label: 'Stock Out', icon: PackageOpen, feature: 'transaction_stockout' },
      // Item 4: kartu "Daftar Damage" diganti "Booking Asset Pending" yang
      // langsung tertaut ke daftar booking terfilter status Pending.
      { href: '/bookings?status=Pending', label: 'Booking Asset Pending', icon: CalendarCheck, feature: 'booking' },
      { href: '/reports', label: 'Reporting', icon: FileText, feature: 'reporting' },
    ],
    OPS: [
      { href: '/nasabah', label: 'Data Nasabah', icon: Users, feature: 'transaction_stockout' },
      { href: '/remarks', label: 'Remarks', icon: ClipboardCheck, feature: 'transaction_stockout' },
      { href: '/payment-achievements', label: 'Payment Achievement', icon: CreditCard, feature: 'transaction_stockout' },
      { href: '/transactions/items', label: 'Headset User', icon: Headphones, feature: 'transaction_headset' },
      { href: '/transactions/vendor-submissions', label: 'Pengajuan', icon: FileText, feature: 'vendor_submission' },
      { href: '/reports', label: 'Reporting', icon: FileText, feature: 'reporting' },
    ],
    QC: [
      { href: '/qc/findings', label: 'QC Findings', icon: AlertTriangle, feature: 'finding' },
      { href: '/qc/recording-reviews', label: 'Recording Review', icon: Headphones, feature: 'recording_review' },
      { href: '/reports', label: 'Reporting', icon: FileText, feature: 'reporting' },
    ],
    HR: [
      { href: '/hr/employees', label: 'Employee Data', icon: Users, feature: 'user_management' },
      { href: '/hr/leave-requests', label: 'Leave Request', icon: CalendarOff, feature: 'user_management' },
      { href: '/users', label: 'User Management', icon: UserCheck, feature: 'user_management' },
      { href: '/reports', label: 'Reporting', icon: FileText, feature: 'reporting' },
    ],
  };
  return all[division] ?? [];
}