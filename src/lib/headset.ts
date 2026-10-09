import { prisma } from '@/lib/prisma';

/**
 * Konstanta & helper domain Headset User (item 11).
 * Dipisah dari route handler karena Next.js melarang export non-HTTP-method
 * dari file `route.ts`.
 */

/** Status yang valid pada siklus hidup item headset. */
export const VALID_STATUSES = ['Pending', 'Used', 'Reject', 'Return', 'Good', 'Damage'] as const;

/** Kondisi saat pengajuan dibuat. */
export const VALID_CONDITIONS = ['New Use', 'Exchange', 'Broken', 'Missing'] as const;

/** Kondisi saat pengembalian — wajib diisi. */
export const VALID_RETURN_CONDITIONS = ['Good', 'Damage'] as const;

export const RETURN_CONDITION_LABELS: Record<string, string> = {
  Good: 'Good (stok bertambah)',
  Damage: 'Damage (masuk daftar item damage)',
};

/**
 * Normalisasi status historis.
 * "Return" tidak lagi dipakai sebagai status akhir; ia dipetakan ke
 * Good / Damage sesuai `returnCondition`.
 */
export function normalizeHeadsetStatus(row: { status: string; returnCondition?: string | null }): string {
  if (row.status !== 'Return') return row.status;
  const cond = String(row.returnCondition || '').trim().toLowerCase();
  return cond.includes('good') ? 'Good' : 'Damage';
}

/** Katalog item kategories Accessories untuk form Pengajuan Headset (item 13). */
export async function listHeadsetCatalog(category: string) {
  return prisma.masterItem.findMany({
    where: { typeItem: category },
    orderBy: { namaItem: 'asc' },
    select: { id: true, code: true, namaItem: true, brand: true, price: true, typeItem: true },
  });
}