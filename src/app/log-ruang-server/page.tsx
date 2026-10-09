'use client';

import React from 'react';
import { CrudPage } from '@/components/ui/crud-page';
import { CodeBadge } from '@/components/ui/data-display';
import { formatDate } from '@/lib/format';
import { Server, MapPin, LogIn, LogOut, User2 } from 'lucide-react';

type Row = {
  id: number;
  logCode: string;
  date: string;
  nama: string;
  jamMasuk: string;
  jamKeluar: string | null;
  keperluan: string;
  location: string;
};

export default function LogRuangServerPage() {
  return (
    <CrudPage<Row>
      title="Log Ruang Server"
      description="Pencatatan orang yang masuk dan keluar ruang server beserta keperluan."
      icon={Server}
      endpoint="/api/log-ruang-server"
      createFeature="log_ruang_server"
      updateFeature="log_ruang_server"
      deleteFeature="log_ruang_server"
      searchPlaceholder="Cari nama, keperluan, atau lokasi…"
      emptyTitle="Belum ada log ruang server"
      emptyDescription="Setiap kunjungan ke ruang server harus dicatat lengkap dengan jam masuk dan keluar."
      rowLabel={(r) => r.logCode}
      columns={[
        { key: 'logCode', header: 'Kode', cell: (r) => <CodeBadge>{r.logCode}</CodeBadge>, hideOnMobile: true },
        { key: 'date', header: 'Tanggal', cell: (r) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(r.date)}</span> },
        {
          key: 'nama',
          header: 'Nama',
          cell: (r) => (
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <User2 className="h-3.5 w-3.5 text-muted-foreground" />
              {r.nama}
            </span>
          ),
        },
        {
          key: 'time',
          header: 'Jam',
          cell: (r) => (
            <span className="flex items-center gap-2 whitespace-nowrap text-[11.5px]">
              <span className="flex items-center gap-1 text-success">
                <LogIn className="h-3 w-3" />
                {r.jamMasuk}
              </span>
              <span className="text-muted-foreground">→</span>
              <span className="flex items-center gap-1 text-muted-foreground-strong">
                <LogOut className="h-3 w-3" />
                {r.jamKeluar ?? '-'}
              </span>
            </span>
          ),
        },
        {
          key: 'location',
          header: 'Lokasi',
          cell: (r) => (
            <span className="flex items-center gap-1 text-[11.5px] text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {r.location || '-'}
            </span>
          ),
          hideOnMobile: true,
        },
        { key: 'keperluan', header: 'Keperluan', cell: (r) => <span className="text-[11.5px] text-muted-foreground-strong">{r.keperluan}</span> },
      ]}
      fields={[
        { key: 'nama', label: 'Nama', type: 'text', required: true, span: 2 },
        { key: 'location', label: 'Lokasi', type: 'text', placeholder: 'mis. Lantai 3 — Ruang Server A', hint: 'Isi bebas, boleh berupa lokasi spesifik' },
        { key: 'date', label: 'Tanggal', type: 'date', required: true, defaultValue: new Date().toISOString().slice(0, 10) },
        { key: 'jamMasuk', label: 'Jam Masuk', type: 'text', required: true, placeholder: 'mis. 14:30' },
        { key: 'jamKeluar', label: 'Jam Keluar', type: 'text', placeholder: 'Kosongkan bila belum keluar' },
        { key: 'keperluan', label: 'Keperluan', type: 'textarea', required: true, span: 3 },
      ]}
      info={
        <>
          <strong>Lokasi</strong> diisi bebas (teks), bukan dari daftar tetap, agar dapat mencatat lokasi spesifik seperti
          lantai atau nama ruang. Jam keluar boleh dikosongkan selama kunjungan masih berlangsung.
        </>
      }
    />
  );
}