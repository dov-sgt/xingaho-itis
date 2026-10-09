import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Sumber nomor dokumen. Menghindari balapan saat dua user membuat dokumen
 * di detik yang sama dengan mengambil counter berdasarkan jumlah baris.
 */
export async function nextNumber(
  model: 'purchaseRequest' | 'deliveryOrder' | 'vendorSubmission' | 'transactionItem',
  prefix: string,
  pad: number,
): Promise<string> {
  const year = new Date().getFullYear();
  const count = await (prisma[model] as any).count();
  let n = count + 1;

  // Hindari nomor duplikat bila ada bari yang sudah terhapus.
  // (max 20 kali percobaan - cukup untuk kondisi realistis)
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = `${prefix}-${year}-${String(n).padStart(pad, '0')}`;
    const clash =
      model === 'purchaseRequest'
        ? await prisma.purchaseRequest.findUnique({ where: { prNumber: candidate } })
        : model === 'deliveryOrder'
          ? await prisma.deliveryOrder.findUnique({ where: { doNumber: candidate } })
          : model === 'vendorSubmission'
            ? await prisma.vendorSubmission.findUnique({ where: { submissionCode: candidate } })
            : null;
    if (!clash) return candidate;
    n += 1;
  }
  return `${prefix}-${year}-${Date.now()}`;
}

/** Normalisasi input angka dari client (menerima "1.234,50" maupun 1234.5). */
export function toNumber(value: unknown, fallback = 0): number {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  const cleaned = String(value)
    .replace(/[^\d,.-]/g, '')
    .replace(/,(?=\d{3}(\D|$))/g, '.')
    .replace(/,/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : fallback;
}

export function toInt(value: unknown, fallback = 0): number {
  const n = Math.trunc(toNumber(value, fallback));
  return Number.isFinite(n) ? n : fallback;
}

/** Kunci idempotensi Delivery Order: satu DO per item per PR. */
export function deliveryDedupeKey(prId: number, itemCode?: string | null, itemName?: string | null): string {
  return `${prId}:${itemCode || itemName || 'item'}`;
}

export type PrLineInput = {
  itemCode?: string | null;
  itemName: string;
  qty: number;
  price: number;
  note?: string | null;
};

/**
 * Hitung ulang seluruh angka Purchase Request **di server**.
 * Nilai dari client tidak pernah dipercaya untuk total.
 */
export function computePrTotals(lines: PrLineInput[], shipmentCost: number, discount: number) {
  const safeLines = lines.map((l) => {
    const qty = Math.max(1, toInt(l.qty, 1));
    const price = Math.max(0, toNumber(l.price, 0));
    return { ...l, qty, price, totalPrice: round2(qty * price) };
  });
  const totalPrice = round2(safeLines.reduce((s, l) => s + l.totalPrice, 0));
  const shipment = Math.max(0, toNumber(shipmentCost, 0));
  const disc = Math.max(0, toNumber(discount, 0));
  const grandTotal = round2(totalPrice + shipment - disc);
  return { lines: safeLines, totalPrice, shipmentCost: shipment, diskon: disc, grandTotal };
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * True HANYA jika nilai benar-benar terisi DAN negatif.
 * Nilai kosong / undefined dianggap "tidak diisi", bukan negatif - inilah
 * perbedaan penting dari memakai `toNumber(v, -1) < 0`.
 */
export function isNegative(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return false;
  return toNumber(value, 0) < 0;
}