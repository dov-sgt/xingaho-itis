'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { PageHeader, Panel, EmptyState, TableSkeleton } from '@/components/ui/layout';
import { DataTable, Column, Pagination, Toolbar, SearchInput, CodeBadge } from '@/components/ui/data-display';
import { StatusBadge } from '@/components/ui/data-display';
import { formatDate, formatNumber } from '@/lib/format';
import { AlertTriangle, Plus, PackagePlus, Info } from 'lucide-react';

type Damaged = {
  id: number;
  date: string;
  itemCode: string | null;
  itemName: string;
  qty: number;
  nik: string | null;
  employeeName: string | null;
  vendor: string | null;
  condition: string;
  note: string | null;
  createdBy: string | null;
};

export default function DamagedItemsPage() {
  const { can, apiFetch } = useAuth();
  const { toast } = useToast();

  const [rows, setRows] = useState<Damaged[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
  const [totalDamaged, setTotalDamaged] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const canCreate = can('transaction_headset', 'create');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), pageSize: '10' });
      if (search.trim()) qs.set('search', search.trim());
      const res = await apiFetch(`/api/damaged-items?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal memuat daftar damage');
      setRows(json.data ?? []);
      setPagination(json.pagination ?? { page, pageSize: 10, total: 0, totalPages: 1 });
      setTotalDamaged(json.totalDamaged ?? 0);
    } catch (e: any) {
      toast('error', e.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, page, search, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const columns: Column<Damaged>[] = [
    { key: 'date', header: 'Tanggal', cell: (r) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(r.date)}</span> },
    {
      key: 'item',
      header: 'Item',
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{r.itemName}</p>
          {r.itemCode && <p className="truncate"><CodeBadge>{r.itemCode}</CodeBadge></p>}
        </div>
      ),
    },
    {
      key: 'employee',
      header: 'Pengguna',
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate text-[12px] text-foreground">{r.employeeName || '-'}</p>
          <p className="truncate font-mono text-[10.5px] text-muted-foreground">{r.nik || '-'}</p>
        </div>
      ),
      hideOnMobile: true,
    },
    { key: 'qty', header: 'Qty', numeric: true, cell: (r) => <span className="font-bold tabular-nums text-danger">{formatNumber(r.qty)}</span> },
    { key: 'vendor', header: 'Vendor', cell: (r) => <span className="text-[11.5px] text-muted-foreground">{r.vendor || '-'}</span>, hideOnMobile: true },
    { key: 'condition', header: 'Kondisi', cell: (r) => <StatusBadge status={r.condition} tone="danger" /> },
    {
      key: 'note',
      header: 'Catatan',
      cell: (r) => <span className="text-[11.5px] text-muted-foreground">{r.note || '-'}</span>,
      hideOnMobile: true,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        icon={AlertTriangle}
        title="Daftar Item Damage"
        description="Semua headset yang dikembalikan dengan kondisi Damage. Item ini tidak menambah stok inventori."
      />

      <div className="flex items-start gap-2.5 rounded-xl border border-danger/25 bg-danger-subtle px-3.5 py-2.5 text-[11.5px] leading-relaxed text-danger-subtle-foreground">
        <Info className="mt-px h-4 w-4 shrink-0" />
        <p>
          Total item damage tercatat: <strong className="tabular-nums">{formatNumber(totalDamaged)}</strong> unit.
          Data bertambah otomatis setiap proses Return pada menu Headset User memilih kondisi <strong>Damage</strong>.
        </p>
      </div>

      <Panel padded={false}>
        <Toolbar>
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Cari item, kode, NIK, atau nama karyawan…" />
        </Toolbar>
        <div className="p-3 sm:p-4">
          {loading ? (
            <TableSkeleton rows={6} cols={5} />
          ) : (
            <>
              <DataTable
                columns={columns}
                rows={rows}
                rowKey={(r) => r.id}
                empty={
                  <EmptyState
                    icon={PackagePlus}
                    title="Belum ada item damage"
                    description="Bagus — belum ada headset yang dikembalikan dalam kondisi Damage. Daftar akan terisi otomatis ketika proses Return memilih kondisi Damage."
                  />
                }
              />
              <Pagination {...pagination} onPageChange={setPage} />
            </>
          )}
        </div>
      </Panel>
    </div>
  );
}