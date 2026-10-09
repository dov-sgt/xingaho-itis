'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CrudPage } from '@/components/ui/crud-page';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { CodeBadge } from '@/components/ui/data-display';
import { formatDate } from '@/lib/format';
import { SERVIS_STATUSES, SERVIS_STATUS_LABELS, SERVIS_RESOLVED_STATUSES } from '@/lib/assets';
import { Wrench, User2, PackageSearch } from 'lucide-react';

type Row = {
  id: number;
  servisCode: string;
  date: string;
  itemName: string;
  itemCode: string | null;
  category: string | null;
  teknisiName: string | null;
  serviceVendor: string | null;
  sourceQty: number;
  status: string;
  resolutionNote: string | null;
  createdBy: string | null;
};

/** Status yang bisa dipilih lewat dropdown cepat. */
const STATUS_OPTIONS = SERVIS_STATUSES.filter(
  (s) => s === 'Pending' || s === 'Dalam Servis' || SERVIS_RESOLVED_STATUSES.includes(s as any),
);

const STATUS_LABELS = SERVIS_STATUSES.map((s) => ({ value: s, label: SERVIS_STATUS_LABELS[s] ?? s }));

export default function ServisAssetsPage() {
  const { can, apiFetch } = useAuth();
  const { toast } = useToast();

  const [busy, setBusy] = useState<number | null>(null);

  /**
   * Item 2: menyelesaikan servis lewat alur yang sama dengan endpoint
   * /api/damaged-items/servis, supaya perpindahan stok tetap atomic.
   * Dropdown biasa CrudPage hanya mengubah kolom status.
   */
  const resolveServis = async (row: Row, status: string) => {
    setBusy(row.id);
    try {
      const res = await apiFetch('/api/damaged-items/servis', {
        method: 'PUT',
        body: JSON.stringify({ id: row.id, status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal memperbarui status servis');
      toast(
        'success',
        status === 'Selesai (Diperbaiki)'
          ? `${row.servisCode} selesai diperbaiki - aset kembali ke stok Ready.`
          : `${row.servisCode} ditandai tidak bisa diperbaiki.`,
      );
      window.location.reload();
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      setBusy(null);
    }
  };

  const canResolve = can('servis_asset', 'update');

  const statusControl = (r: Row) => {
    const resolved = (SERVIS_RESOLVED_STATUSES as readonly string[]).includes(r.status);
    return (
      <select
        aria-label={`Ubah status servis ${r.servisCode}`}
        value=""
        disabled={busy === r.id || resolved}
        onChange={(e) => e.target.value && resolveServis(r, e.target.value)}
        className="xh-select h-8 w-[170px] text-[11.5px]"
      >
        <option value="">{resolved ? 'Selesai' : 'Ubah status...'}</option>
        {!resolved && (
          <>
            <option value="Dalam Servis">Dalam Servis</option>
            <option value="Selesai (Diperbaiki)">Selesai (Diperbaiki)</option>
            <option value="Tidak Bisa Diperbaiki">Tidak Bisa Diperbaiki</option>
          </>
        )}
      </select>
    );
  };

  return (
    <CrudPage<Row>
      title="Servis Asset"
      description="Alur: Dalam Servis, lalu Selesai (Diperbaiki) kembali ke stok Ready, atau Tidak Bisa Diperbaiki."
      icon={Wrench}
      endpoint="/api/servis-assets"
      createFeature="servis_asset"
      updateFeature="servis_asset"
      deleteFeature="servis_asset"
      statusKey="status"
      statusOptions={STATUS_OPTIONS}
      searchPlaceholder="Cari kode servis, barang, teknisi, atau vendor servis..."
      emptyTitle="Belum ada riwayat servis"
      emptyDescription="Catat setiap perbaikan aset agar riwayat pemeliharaan dapat dilacak. Aset rusak dapat dikirim ke sini dari menu Daftar Damage."
      rowLabel={(r) => r.servisCode}
      info={
        <>
          <strong className="font-semibold">Item 2:</strong> aset dikirim ke servis dari menu{' '}
          <strong className="font-semibold">Daftar Damage</strong> dengan tombol <strong>Kirim ke Servis</strong>.
          Memilih <strong>Selesai (Diperbaiki)</strong> mengembalikan aset ke stok Ready dan mencatat histori;
          memilih <strong>Tidak Bisa Diperbaiki</strong> menahan aset di daftar rusak dengan penanda.
          {!canResolve && ' Anda tidak memiliki hak untuk menyelesaikan servis.'}
        </>
      }
      toForm={(r) => ({
        date: r.date ? String(r.date).slice(0, 10) : '',
        itemName: r.itemName,
        teknisiName: r.teknisiName ?? '',
        serviceVendor: r.serviceVendor ?? '',
        status: r.status,
      })}
      toPayload={(v) => ({
        date: v.date,
        itemName: v.itemName,
        teknisiName: v.teknisiName,
        serviceVendor: v.serviceVendor,
        status: v.status,
      })}
      columns={[
        { key: 'servisCode', header: 'Kode', cell: (r) => <CodeBadge>{r.servisCode}</CodeBadge> },
        { key: 'date', header: 'Tanggal', cell: (r) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(r.date)}</span> },
        {
          key: 'itemName',
          header: 'Barang',
          cell: (r) => (
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{r.itemName}</p>
              <p className="truncate text-[10.5px] text-muted-foreground">
                {r.itemCode ? <CodeBadge>{r.itemCode}</CodeBadge> : r.category || '-'}
              </p>
            </div>
          ),
        },
        {
          key: 'qty',
          header: 'Qty',
          numeric: true,
          cell: (r) => (
            <span className="tabular-nums text-muted-foreground-strong">{r.sourceQty > 0 ? r.sourceQty : '-'}</span>
          ),
          hideOnMobile: true,
        },
        {
          key: 'teknisiName',
          header: 'Teknisi / Vendor',
          cell: (r) => (
            <div className="min-w-0">
              <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground-strong">
                <User2 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{r.teknisiName || '-'}</span>
              </span>
              {r.serviceVendor && (
                <p className="truncate text-[10.5px] text-muted-foreground">
                  <PackageSearch className="mr-1 inline h-3 w-3" />
                  {r.serviceVendor}
                </p>
              )}
            </div>
          ),
          hideOnMobile: true,
        },
        {
          key: 'resolve',
          header: 'Penyelesaian',
          cell: (r) => (canResolve ? statusControl(r) : <span className="text-[11px] text-muted-foreground">-</span>),
        },
      ]}
      fields={[
        { key: 'itemName', label: 'Nama Barang', type: 'text', required: true, span: 2 },
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          options: STATUS_LABELS,
          defaultValue: 'Pending',
        },
        { key: 'date', label: 'Tanggal Servis', type: 'date', required: true, defaultValue: new Date().toISOString().slice(0, 10) },
        { key: 'teknisiName', label: 'Nama Teknisi', type: 'text', hint: 'Opsional - boleh diisi nanti.' },
        { key: 'serviceVendor', label: 'Vendor / Penyedia Servis', type: 'text', hint: 'Opsional.' },
      ]}
    />
  );
}