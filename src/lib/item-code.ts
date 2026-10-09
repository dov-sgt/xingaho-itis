/**
 * Generator kode item otomatis (item 3).
 *
 * FORMAT KODE
 *   XHIT-<KODE KATEGORI 2 KARAKTER><YY><MM>-<NOMOR URUT>
 *   contoh: XHIT-AC2610-0001
 *     XHIT  prefix tetap
 *     AC    kode kategori (dari tabel ItemCategory)
 *     26    tahun 2 digit (Asia/Jakarta)
 *     10    bulan 2 digit (Asia/Jakarta)
 *     0001  nomor urut, reset ke 1 tiap kategori + bulan
 *
 * KENAPA AMAN DARI DUPLIKAT
 *   Nomor urut diambil dari tabel `ItemCodeCounter` yang di-INCREMENT di dalam
 *   transaksi yang sama dengan pembuatan item. Karena itu:
 *     - import 50 baris sekaligus tetap berurutan (satu transaksi per batch),
 *     - dua request bersamaan tidak bisa mendapat nomor yang sama,
 *     - `MasterItem.code` punya unique constraint sebagai pengaman terakhir.
 *
 * CATATAN: kode item lama TIDAK pernah diubah - hanya item baru.
 */

import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/** Prefix seluruh kode item. */
export const ITEM_CODE_PREFIX = 'XHIT';

/**
 * Jumlah digit nomor urut. Ubah ke 3 bila ingin `XHIT-AC2610-001`.
 * Dipisah sebagai konstanta agar mudah diganti.
 */
export const ITEM_CODE_SEQ_DIGITS = 4;

/** Panjang kode kategori item. */
export const ITEM_CATEGORY_CODE_LENGTH = 2;

/**
 * Kode kategori default untuk kategori yang sudah dipakai di aplikasi.
 * Dipakai saat sebuah kategori belum terdaftar di tabel ItemCategory.
 */
export const DEFAULT_CATEGORY_CODES: Record<string, string> = {
  Computer: 'CP',
  Accessories: 'AC',
  Aksesoris: 'AK',
  Smartphone: 'SP',
  Media: 'MD',
  Equipment: 'EQ',
  Networking: 'NW',
  Server: 'SV',
  Others: 'OT',
  Headset: 'HS',
  Printer: 'PR',
  Laptop: 'LP',
  Lainnya: 'LN',
};

/** Zona waktu Indonesia untuk menentukan tahun & bulan kode item. */
export const ITEM_CODE_TIMEZONE = 'Asia/Jakarta';

export const DEFAULT_CATEGORY_CODE = 'OT';

function pad(value: number, length: number): string {
  return String(value).padStart(length, '0');
}

/** Tahun (2 digit) + bulan (2 digit) menurut zona waktu Asia/Jakarta. */
export function itemCodePeriod(date: Date = new Date()): { yy: string; mm: string; period: string } {
  // 'en-CA' menghasilkan format YYYY-MM-DD, jadi mudah dipotong.
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ITEM_CODE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '01';
  const year = get('year');
  const month = get('month');

  return {
    yy: year.slice(-2),
    mm: month,
    period: `${year.slice(-2)}${month}`,
  };
}

/** Rakit kode dari komponen-komponennya (fungsi murni, mudah diuji). */
export function formatItemCode(
  categoryCode: string,
  sequence: number,
  date: Date = new Date(),
): string {
  const { yy, mm } = itemCodePeriod(date);
  const code = categoryCode.toUpperCase().slice(0, ITEM_CATEGORY_CODE_LENGTH);
  return `${ITEM_CODE_PREFIX}-${code}${yy}${mm}-${pad(sequence, ITEM_CODE_SEQ_DIGITS)}`;
}

/**
 * Ambil (atau buat) 2 huruf kode kategori dari nama kategori.
 * Dijalankan di dalam transaksi item.
 */
export async function resolveCategoryCode(
  tx: Prisma.TransactionClient | PrismaClient,
  categoryName: string,
): Promise<string> {
  const name = categoryName.trim();
  const existing = await tx.itemCategory.findUnique({ where: { name } });
  if (existing) return existing.code;

  const preferred = DEFAULT_CATEGORY_CODES[name];
  // Kode kategori harus unik; kalau bentrok tambahkan angka sampai bebas.
  let code = preferred ?? DEFAULT_CATEGORY_CODE;
  let suffix = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const taken = await tx.itemCategory.findUnique({ where: { code } });
    if (!taken) break;
    suffix += 1;
    const base = (preferred ?? DEFAULT_CATEGORY_CODE).slice(0, ITEM_CATEGORY_CODE_LENGTH - 1);
    code = `${base}${suffix}`;
  }

  await tx.itemCategory.create({ data: { name, code } });
  return code;
}

/** Client transaksi yang diterima helper ini. */
type Tx = Prisma.TransactionClient;

/**
 * Ambil nomor urut berikutnya untuk kategori + periode, lalu naikkan counter.
 * WAJIB dipanggil di dalam `prisma.$transaction`.
 */
async function nextSequence(tx: Tx, categoryCode: string, period: string): Promise<number> {
  const row = await tx.itemCodeCounter.upsert({
    where: { category_period: { category: categoryCode, period } },
    // Baris baru mulai dari 1.
    create: { category: categoryCode, period, lastNumber: 1 },
    // Baris yang sudah ada naikkan 1 dalam satu operasi atomik.
    update: { lastNumber: { increment: 1 } },
    select: { lastNumber: true },
  });
  return row.lastNumber;
}

/**
 * Buat kode item berikutnya untuk sebuah kategori.
 *
 * `date` bisa diisi untuk menguji reset bulanan (mis.'import dengan tanggal
 * simulasi bulan depan'), default-nya waktu sekarang zona Asia/Jakarta.
 */
export async function generateItemCode(
  tx: Tx,
  categoryName: string,
  date: Date = new Date(),
): Promise<string> {
  const categoryCode = await resolveCategoryCode(tx, categoryName);
  const { period } = itemCodePeriod(date);
  const seq = await nextSequence(tx, categoryCode, period);
  return formatItemCode(categoryCode, seq, date);
}

/**
 * Dipakai di luar transaksi (hanya untuk pratinjau di form).
 * Tidak menaikkan counter, jadi angka yang tampil bersifat estimasi.
 */
export async function previewItemCode(categoryName: string): Promise<string> {
  const category = await prisma.itemCategory.findUnique({ where: { name: categoryName } });
  const code = category?.code ?? DEFAULT_CATEGORY_CODES[categoryName] ?? DEFAULT_CATEGORY_CODE;
  const { period } = itemCodePeriod();
  const counter = await prisma.itemCodeCounter.findUnique({
    where: { category_period: { category: code, period } },
  });
  return formatItemCode(code, (counter?.lastNumber ?? 0) + 1);
}