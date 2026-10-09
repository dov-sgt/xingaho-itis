/**
 * Definisi format import Headset User.
 *
 * Dipakai oleh DUA tempat sekaligus supaya template yang diunduh (item 7) dan
 * importer (`POST /api/transactions/items/upload`) tidak pernah berbeda:
 *
 *   - `HEADSET_IMPORT_COLUMNS` : nama kolom (dipakai sebagai header Excel)
 *   - `HEADSET_IMPORT_FIELDS`  : alias yang boleh dipakai pada file Excel,
 *                                 persisted ke database sebagai kolom apa
 */

export const HEADSET_IMPORT_COLUMNS = [
  'date',
  'nik',
  'name',
  'vendor',
  'project',
  'deposit',
  'condition',
  'employeeCategory',
  'note',
] as const;

export type HeadsetImportColumn = (typeof HEADSET_IMPORT_COLUMNS)[number];

/** Alias header yang diterima importer (bahasa Indonesia + nama kolom). */
export const HEADSET_IMPORT_FIELDS: Record<HeadsetImportColumn, string[]> = {
  date: ['date', 'tanggal'],
  nik: ['nik'],
  name: ['name', 'nama', 'nama karyawan', 'namakaryawan'],
  vendor: ['vendor'],
  project: ['project', 'proyek'],
  deposit: ['deposit'],
  condition: ['condition', 'kondisi'],
  employeeCategory: ['employeecategory', 'kategori karyawan', 'kategori'],
  note: ['note', 'catatan'],
};

export const HEADSET_IMPORT_DEFAULTS = {
  date: new Date().toISOString().slice(0, 10),
  vendor: 'Swapro',
  project: 'GoTo',
  deposit: 100000,
  condition: 'New Use',
  employeeCategory: 'New Employee',
  note: '-',
} as const;

/** Baca nilai sel berdasarkan daftar alias, sudah di-normalize (lowercase, trimmed). */
export function pickCell(row: Record<string, unknown>, column: HeadsetImportColumn): string | undefined {
  const keys = Object.keys(row);
  for (const alias of HEADSET_IMPORT_FIELDS[column]) {
    const target = alias.toLowerCase();
    const hit = keys.find((k) => k.toLowerCase().trim() === target);
    if (hit) {
      const v = row[hit];
      if (v === undefined || v === null || v === '') return undefined;
      return String(v).trim();
    }
  }
  return undefined;
}