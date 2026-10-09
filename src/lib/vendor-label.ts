import { prisma } from '@/lib/prisma';

/**
 * Resolusi label vendor (item 9).
 *
 * Beberapa kolom historis menyimpan KODE vendor (mis. 'VND-001') alih-alih
 * nama. Laporan harus menampilkan NAMA vendor, dengan fallback ke nilai asal
 * bila nama tidak ditemukan supaya baris tidak pernah kosong.
 *
 * Dicocokkan dua arah: kode -> nama, dan nama -> nama (case-insensitive),
 * karena tidak semua sumber mengisi kolom dengan bentuk yang sama.
 */
export async function buildVendorNameMap(): Promise<Map<string, string>> {
  const vendors = await prisma.masterVendor.findMany({ select: { code: true, name: true } });
  const map = new Map<string, string>();
  for (const v of vendors) {
    const key = String(v.code ?? '').trim();
    const name = String(v.name ?? '').trim();
    if (key && name) map.set(key.toUpperCase(), name);
    if (name) map.set(name.toUpperCase(), name);
  }
  return map;
}

/** Ubah satu nilai vendor mentah menjadi nama vendor bila bisa ditemukan. */
export function resolveVendorLabel(raw: unknown, map: Map<string, string>): string {
  const value = String(raw ?? '').trim();
  if (!value) return '-';
  return map.get(value.toUpperCase()) ?? value;
}

/**
 * Terapkan pemetaan vendor pada sekumpulan baris laporan.
 * `field` adalah nama kolom yang berisi vendor (mis. 'vendorName', 'vendor').
 */
export async function withVendorNames<T extends Record<string, any>>(
  rows: T[],
  field: string,
): Promise<T[]> {
  if (rows.length === 0) return rows;
  const map = await buildVendorNameMap();
  return rows.map((row) => {
    if (row[field] === undefined) return row;
    return { ...row, [field]: resolveVendorLabel(row[field], map) };
  });
}