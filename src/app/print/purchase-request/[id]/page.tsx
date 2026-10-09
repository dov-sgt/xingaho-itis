'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { BrandLogoForPrint, COMPANY_FULL_NAME } from '@/components/BrandLogo';
import { APP_DESCRIPTION, COMPANY_LEGAL_NAME, COMPANY_TAGLINE, COPYRIGHT_TEXT } from '@/lib/config';
import { formatRupiah, formatDate, formatNumber } from '@/lib/format';
import { Printer, ArrowLeft } from 'lucide-react';

type PrItem = { itemName: string; qty: number; price: number; totalPrice: number };
type Pr = {
  prNumber: string;
  date: string;
  typeItem: string;
  itemName: string;
  qty: number;
  biaya: number;
  diskon: number;
  shipmentCost: number;
  totalPrice: number;
  grandTotal: number;
  note: string | null;
  details: string | null;
  status: string;
  requesterName: string | null;
  createdBy: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  items: PrItem[];
};

/**
 * Dokumen Purchase Request siap cetak (item 5).
 * Layout A4, angka rata kanan, format Rupiah, logo + area tanda tangan.
 * Gunakan "Cetak / Simpan sebagai PDF" pada dialog cetak browser.
 */
export default function PurchaseRequestPrintPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { apiFetch } = useAuth();
  const [pr, setPr] = useState<Pr | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch(`/api/transactions/purchase-requests?page=1&pageSize=200&search=${params.id}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Gagal memuat data');
        const found = (json.data ?? []).find((r: Pr) => r.prNumber === params.id);
        if (!found) throw new Error(`Purchase Request "${params.id}" tidak ditemukan.`);
        if (!cancelled) setPr(found);
      } catch (e: any) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiFetch, params.id]);

  useEffect(() => {
    if (pr) document.title = `${pr.prNumber} — ${COMPANY_FULL_NAME}`;
  }, [pr]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-[13px] text-muted-foreground">
        Menyiapkan dokumen…
      </div>
    );
  }

  if (error || !pr) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background p-6 text-center">
        <p className="text-[14px] font-bold text-foreground">Dokumen tidak tersedia</p>
        <p className="max-w-md text-[12.5px] text-muted-foreground">{error}</p>
        <button className="xh-btn xh-btn-secondary" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </button>
      </div>
    );
  }

  const lines = pr.items?.length
    ? pr.items
    : [{ itemName: pr.itemName, qty: pr.qty, price: pr.biaya, totalPrice: pr.totalPrice }];

  return (
    <div className="min-h-screen bg-surface-sunken py-6 print:bg-white print:py-0">
      {/* Kontrol (tidak ikut dicetak) */}
      <div className="no-print mx-auto mb-4 flex max-w-[820px] items-center justify-between px-4">
        <button className="xh-btn xh-btn-secondary" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </button>
        <button className="xh-btn xh-btn-primary" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Cetak / Simpan PDF
        </button>
      </div>

      {/* Dokumen A4 */}
      <article
        className="print-area mx-auto bg-white px-10 py-9 text-[#111] shadow-lg print:shadow-none"
        style={{ width: '210mm', minHeight: '297mm' }}
      >
        {/* Header */}
        <header className="flex items-start gap-4 border-b-2 border-[#111] pb-4">
          <BrandLogoForPrint size={54} />
          <div className="min-w-0 flex-1">
            <h1 className="text-[17pt] font-bold uppercase leading-tight tracking-wide">{COMPANY_LEGAL_NAME}</h1>
            <p className="mt-0.5 text-[9pt] text-[#444]">{COMPANY_TAGLINE}</p>
            <p className="mt-0.5 text-[8.5pt] text-[#666]">
              Divisi Information Technology &amp; Operasional
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[8pt] font-bold uppercase tracking-widest text-[#666]">Dokumen</p>
            <p className="text-[12pt] font-bold leading-tight">Purchase Request</p>
            <p className="mt-0.5 font-mono text-[9pt]">{pr.prNumber}</p>
          </div>
        </header>

        {/* Meta */}
        <section className="print-break-avoid mt-5 grid grid-cols-2 gap-x-8 gap-y-2 text-[9.5pt]">
          <MetaRow label="Tanggal" value={formatDate(pr.date)} />
          <MetaRow label="Status" value={pr.status} />
          <MetaRow label="Pemohon" value={pr.requesterName || pr.createdBy || '-'} />
          <MetaRow label="Disetujui oleh" value={pr.approvedBy || '-'} />
          <MetaRow label="Kategori" value={pr.typeItem} />
          <MetaRow label="Tanggal Approved" value={pr.approvedAt ? formatDate(pr.approvedAt) : '-'} />
        </section>

        {/* Tabel item */}
        <table className="print-table mt-6">
          <thead>
            <tr>
              <th style={{ width: '5%' }}>No</th>
              <th style={{ width: '48%' }}>Nama Barang</th>
              <th className="num" style={{ width: '12%' }}>
                Qty
              </th>
              <th className="num" style={{ width: '17.5%' }}>
                Harga Satuan
              </th>
              <th className="num" style={{ width: '17.5%' }}>
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.map((it, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{it.itemName}</td>
                <td className="num">{formatNumber(it.qty)}</td>
                <td className="num">{formatRupiah(it.price)}</td>
                <td className="num">{formatRupiah(it.totalPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Ringkasan biaya */}
        <section className="print-break-avoid mt-4 flex justify-end">
          <dl className="w-[260px] space-y-1 text-[9.5pt]">
            <div className="flex justify-between border-b border-dotted border-[#999] pb-1">
              <dt>Total Price</dt>
              <dd className="tabular-nums">{formatRupiah(pr.totalPrice)}</dd>
            </div>
            <div className="flex justify-between border-b border-dotted border-[#999] pb-1">
              <dt>Shipment Cost</dt>
              <dd className="tabular-nums">{formatRupiah(pr.shipmentCost)}</dd>
            </div>
            <div className="flex justify-between border-b border-dotted border-[#999] pb-1">
              <dt>Discount</dt>
              <dd className="tabular-nums">− {formatRupiah(pr.diskon)}</dd>
            </div>
            <div className="flex justify-between pt-1 text-[11pt] font-bold">
              <dt>Grand Total</dt>
              <dd className="tabular-nums">{formatRupiah(pr.grandTotal || pr.totalPrice)}</dd>
            </div>
          </dl>
        </section>

        {pr.note && (
          <section className="print-break-avoid mt-5 text-[9.5pt]">
            <p className="font-bold">Catatan</p>
            <p className="mt-0.5">{pr.note}</p>
          </section>
        )}

        {pr.details && pr.details !== '-' && (
          <section className="print-break-avoid mt-3 text-[9.5pt]">
            <p className="font-bold">Detail / Spesifikasi</p>
            <p className="mt-0.5 whitespace-pre-line">{pr.details}</p>
          </section>
        )}

        {/* Tanda tangan */}
        <section className="print-break-avoid mt-14 grid grid-cols-3 gap-6 text-center text-[9.5pt]">
          <SignatureBlock role="Pemohon" name={pr.requesterName || pr.createdBy || '-'} />
          <SignatureBlock role="Atasan / Approver" name={pr.approvedBy || '-'} />
          <SignatureBlock role="Penerima Barang" name="-" />
        </section>

        <footer className="mt-10 border-t border-[#ccc] pt-2 text-center text-[8pt] leading-relaxed text-[#777]">
          Dicetak dari sistem {COMPANY_FULL_NAME} pada {formatDate(new Date())} · Nomor {pr.prNumber}
          <br />
          {COPYRIGHT_TEXT}
        </footer>
      </article>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-[110px] shrink-0 text-[#666]">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function SignatureBlock({ role, name }: { role: string; name: string }) {
  return (
    <div>
      <p className="font-bold">{role}</p>
      <p className="mt-10 border-b border-[#111] pb-1">{name}</p>
      <p className="mt-1 text-[8pt] text-[#666]">Nama &amp; Tanda Tangan</p>
    </div>
  );
}