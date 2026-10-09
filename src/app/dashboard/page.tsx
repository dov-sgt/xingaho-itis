'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { PageHeader, StatCard, Panel, EmptyState, TableSkeleton, Skeleton } from '@/components/ui/layout';
import { DataTable, Column, Pagination, Toolbar } from '@/components/ui/data-display';
import { StatusBadge } from '@/components/ui/data-display';
import { formatRupiah, formatNumber, formatDateTime } from '@/lib/format';
import { LOW_STOCK_THRESHOLD } from '@/lib/config';
import {
  LayoutDashboard, Boxes, Building2, Headphones, ShoppingCart, Truck, FileText,
  Wallet, PackageSearch, AlertTriangle, TrendingDown, RefreshCw, PackageOpen, CheckCircle2, Clock,
} from 'lucide-react';

type Row = {
  id: number;
  itemCode: string | null;
  itemName: string;
  category: string;
  currentStock: number;
  updatedAt: string;
  isLowStock: boolean;
};

type DashboardData = {
  kpis: Record<string, number>;
  recentStocks: Row[];
  stocksPagination: { page: number; pageSize: number; total: number; totalPages: number };
};

export default function DashboardPage() {
  const { user, division, isSuperAdmin, apiFetch, can } = useAuth();
  const { toast } = useToast();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (targetPage = 1, silent = false) => {
      if (!silent) setLoading(true);
      try {
        const res = await apiFetch(`/api/dashboard?page=${targetPage}&pageSize=${LOW_STOCK_THRESHOLD}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Gagal memuat dashboard');
        }
        setData(await res.json());
      } catch (e: any) {
        toast('error', e.message || 'Gagal memuat data dashboard');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [apiFetch, toast],
  );

  useEffect(() => {
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const k = data?.kpis ?? {};
  const scopeLabel = isSuperAdmin ? 'Semua Divisi' : division ?? '-';

  const stockColumns: Column<Row>[] = [
    {
      key: 'item',
      header: 'Nama Item',
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{r.itemName}</p>
          {r.itemCode && <p className="truncate font-mono text-[10.5px] text-muted-foreground">{r.itemCode}</p>}
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Kategori',
      cell: (r) => <span className="text-muted-foreground">{r.category || '-'}</span>,
      hideOnMobile: true,
    },
    {
      key: 'stock',
      header: 'Jumlah Stok',
      numeric: true,
      cell: (r) => (
        // Item 10: stok < 10 ditampilkan merah & tebal.
        <span
          className={
            r.currentStock < LOW_STOCK_THRESHOLD
              ? 'font-bold text-danger tabular-nums'
              : 'font-semibold text-foreground tabular-nums'
          }
        >
          {formatNumber(r.currentStock)}
        </span>
      ),
    },
    {
      key: 'updatedAt',
      header: 'Terakhir Diperbarui',
      cell: (r) => <span className="text-[11.5px] text-muted-foreground">{formatDateTime(r.updatedAt)}</span>,
      hideOnMobile: true,
    },
    {
      key: 'flag',
      header: 'Status',
      cell: (r) =>
        r.currentStock < LOW_STOCK_THRESHOLD ? (
          <StatusBadge status="Stok Menipis" tone="danger" />
        ) : (
          <StatusBadge status="Aman" tone="success" />
        ),
      hideOnMobile: true,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        icon={LayoutDashboard}
        title={`Dashboard ${isSuperAdmin ? 'IT' : (division ?? '')}`}
        description={`Ringkasan operasional â€” ${scopeLabel}. Data diperbarui otomatis dari server.`}
        actions={
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
        }
      />

      {/* ---- KPI row ---- */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[86px]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Master Item" value={formatNumber(k.totalMasterItems)} icon={Boxes} tone="primary" />
          <StatCard label="Vendor" value={formatNumber(k.totalVendors)} icon={Building2} tone="info" />
          <StatCard
            label="Headset Digunakan"
            value={formatNumber(k.activeLoans)}
            hint={`Deposit ${formatRupiah(k.totalActiveDeposit)}`}
            icon={Headphones}
            tone="info"
          />
          <StatCard
            label="Item Damage"
            value={formatNumber(k.damagedLoans)}
            hint="Tidak menambah stok"
            icon={AlertTriangle}
            tone="danger"
          />
          <StatCard
            label="Purchase Request"
            value={formatNumber(k.totalPR)}
            hint={`${formatNumber(k.pendingPR)} menunggu approval`}
            icon={ShoppingCart}
            tone="primary"
          />
          <StatCard
            label="Nilai Pengadaan"
            value={formatRupiah(k.totalSpending)}
            icon={Wallet}
            tone="success"
          />
          <StatCard
            label="Delivery Order Berjalan"
            value={formatNumber(k.openDeliveries)}
            hint="Pending / Partial"
            icon={Truck}
            tone="warning"
          />
          <StatCard
            label="Stok Menipis"
            value={formatNumber(k.lowStockCount)}
            hint={`Stok < ${LOW_STOCK_THRESHOLD}`}
            icon={TrendingDown}
            tone="danger"
          />
        </div>
      )}

      {/* ---- Status summary ---- */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Alur Pengajuan" description="Status Pengajuan yang perlu ditindaklanjuti">
          <ul className="space-y-2">
            <SummaryRow
              icon={Clock}
              label="Menunggu approval"
              value={formatNumber(k.pendingSubmissions)}
              tone="warning"
              href="/transactions/vendor-submissions"
              visible={can('vendor_submission', 'read')}
            />
            <SummaryRow
              icon={ShoppingCart}
              label="Purchase Request pending"
              value={formatNumber(k.pendingPR)}
              tone="primary"
              href="/transactions/purchase-requests"
              visible={can('purchase_request', 'read')}
            />
            <SummaryRow
              icon={Truck}
              label="Delivery Order berjalan"
              value={formatNumber(k.openDeliveries)}
              tone="info"
              href="/transactions/delivery-orders"
              visible={can('delivery_order', 'read')}
            />
          </ul>
        </Panel>

        <Panel title="Siklus Headset" description="Distribusi status item peminjaman">
          <ul className="space-y-2">
            <SummaryRow icon={FileText} label="Pending" value={formatNumber(k.pendingLoans)} tone="warning" visible />
            <SummaryRow icon={Headphones} label="Used (dipakai)" value={formatNumber(k.activeLoans)} tone="info" visible />
            <SummaryRow icon={CheckCircle2} label="Good (dikembalikan)" value={formatNumber(k.goodLoans)} tone="success" visible />
            <SummaryRow icon={AlertTriangle} label="Damage" value={formatNumber(k.damagedLoans)} tone="danger" visible />
          </ul>
        </Panel>

        <Panel title="Akses Cepat">
          <div className="grid grid-cols-2 gap-2">
            {can('transaction_headset', 'read') && (
              <QuickLink href="/transactions/items" icon={Headphones} label="Headset User" />
            )}
            {can('inventory_type_item', 'read') && (
              <QuickLink href="/inventory" icon={PackageSearch} label="Inventaris & Stok" />
            )}
            {can('transaction_stockout', 'read') && (
              <QuickLink href="/stock-out-transactions" icon={PackageOpen} label="Stock Out" />
            )}
            {can('purchase_request', 'read') && (
              <QuickLink href="/transactions/purchase-requests" icon={ShoppingCart} label="Purchase Request" />
            )}
          </div>
        </Panel>
      </div>

      {/* ---- Item 10: tabel 10 transaksi terakhir ---- */}
      <Panel
        title="Transaksi Terakhir"
        description={`10 item yang paling baru bergerak beserta jumlah stoknya (stok di bawah ${LOW_STOCK_THRESHOLD} ditandai merah).`}
        padded={false}
        bodyClassName="p-3 sm:p-4"
      >
        {loading ? (
          <TableSkeleton rows={6} cols={4} />
        ) : !data?.recentStocks.length ? (
          <EmptyState
            icon={PackageSearch}
            title="Belum ada data stok"
            description="Tambahkan barang melalui Master Inventory atau penerimaan Delivery Order untuk melihat transaksi terakhir di sini."
          />
        ) : (
          <>
            <DataTable
              columns={stockColumns}
              rows={data.recentStocks}
              rowKey={(r) => r.id}
            />
            <Pagination
              page={data.stocksPagination.page}
              totalPages={data.stocksPagination.totalPages}
              total={data.stocksPagination.total}
              pageSize={data.stocksPagination.pageSize}
              onPageChange={setPage}
            />
          </>
        )}
      </Panel>
    </div>
  );
}

function SummaryRow({
  icon: Icon,
  label,
  value,
  tone,
  href,
  visible = true,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  href?: string;
  visible?: boolean;
}) {
  if (!visible) return null;
  const tones: Record<string, string> = {
    primary: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
    info: 'text-info',
  };
  const inner = (
    <li className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2 transition-colors hover:bg-muted">
      <Icon className={`h-4 w-4 shrink-0 ${tones[tone]}`} />
      <span className="min-w-0 flex-1 truncate text-[12.5px] text-muted-foreground-strong">{label}</span>
      <span className="shrink-0 text-[13px] font-bold tabular-nums text-foreground">{value}</span>
    </li>
  );
  return href ? (
    <Link href={href} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}

function QuickLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-start gap-1.5 rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-primary-subtle"
    >
      <Icon className="h-4 w-4 text-primary" />
      <span className="text-[11.5px] font-semibold leading-tight text-foreground">{label}</span>
    </Link>
  );
}