/**
 * Konstanta & helper domain aset rusak + servis (item 1, 2, 6).
 *
 * Dipisah dari route handler karena Next.js hanya mengizinkan export HTTP
 * method dari file `route.ts`.
 */

import { prisma } from '@/lib/prisma';

/**
 * Siklus status aset rusak.
 * Hanya 'Rusak' dan 'Tidak Bisa Diperbaiki' yang dihitung sebagai jumlah aset
 * rusak - 'Dalam Servis' sudah dipindah keluar (item 2), 'Selesai' sudah kembali
 * ke stok Good.
 */
export const DAMAGED_STATUSES = [
  'Rusak',
  'Dalam Servis',
  'Selesai',
  'Tidak Bisa Diperbaiki',
] as const;

export type DamagedStatus = (typeof DAMAGED_STATUSES)[number];

/** Status yang TETAP dihitung sebagai jumlah aset rusak. */
export const DAMAGED_ACTIVE_STATUSES: DamagedStatus[] = ['Rusak', 'Tidak Bisa Diperbaiki'];

/**
 * Status servis. 'Dalam Servis' -> 'Selesai (Diperbaiki)' atau
 * 'Tidak Bisa Diperbaiki'. Status lama (Pending / In Progress / Completed /
 * Cancelled) tetap dibaca agar baris lama tidak rusak.
 */
export const SERVIS_STATUSES = [
  'Pending',
  'Dalam Servis',
  'Selesai (Diperbaiki)',
  'Tidak Bisa Diperbaiki',
  'In Progress',
  'Completed',
  'Cancelled',
] as const;

/** Status servis yang menutup siklus aset rusak. */
export const SERVIS_RESOLVED_STATUSES = ['Selesai (Diperbaiki)', 'Tidak Bisa Diperbaiki'] as const;

/** Label status servis yang rapi untuk badge. */
export const SERVIS_STATUS_LABELS: Record<string, string> = {
  Pending: 'Menunggu',
  'Dalam Servis': 'Dalam Servis',
  'Selesai (Diperbaiki)': 'Selesai (Diperbaiki)',
  'Tidak Bisa Diperbaiki': 'Tidak Bisa Diperbaiki',
  'In Progress': 'Dikerjakan',
  Completed: 'Selesai',
  Cancelled: 'Dibatalkan',
};

/** Kode aset cadangan saat laptop dibuat tanpa kategori terdaftar. */
export const LAPTOP_DEFAULT_CATEGORY = 'Computer';

/**
 * Tambah qty ke stok Ready dan catat histori (dipakai saat headset dikembalikan
 * Good, DO diterima, dan aset rusak selesai diperbaiki).
 * `tx` wajib transaksi pemanggil supaya operasi tetap atomic.
 */
export async function addStock(
  tx: any,
  args: { itemCode: string | null; itemName: string; category: string; qty: number; note: string; by: string },
) {
  const { itemCode, itemName, category, qty, note, by } = args;
  if (qty <= 0) return null;

  const existing = itemCode
    ? await tx.inventoryStock.findUnique({ where: { itemCode } })
    : null;

  const target =
    existing ??
    (await tx.inventoryStock.create({
      data: {
        itemCode: itemCode ?? null,
        itemName,
        category,
        currentStock: 0,
        inStock: 0,
        outStock: 0,
        note: 'Dibuat otomatis saat penerimaan aset',
      },
    }));

  await tx.inventoryStock.update({
    where: { id: target.id },
    data: {
      currentStock: target.currentStock + qty,
      inStock: target.inStock + qty,
      updatedAt: new Date(),
    },
  });

  await tx.inventoryHistory.create({
    data: {
      category: target.category || category,
      stock: target.currentStock + qty,
      inQty: qty,
      outQty: 0,
      note,
      updateBy: by,
    },
  });

  return target;
}

/**
 * Ringkasan aset rusak per kategori + total (item 1).
 *
 * Dihitung dari query agregat - bukan counter terpisah - sehingga tidak bisa
 * tidak sinkron dengan daftar.
 *
 * `inServis` diambil dari `ServisAsset` yang masih berstatus 'Dalam Servis',
 * BUKAN dari `DamagedItem`. Alasannya: saat aset dikirim sebagian, DamagedItem
 * hanya menyimpan sisanya, sedangkan qty yang benar-benar sedang diservis ada
 * di record ServisAsset (`sourceQty`).
 */
export async function damagedSummary() {
  const active = DAMAGED_ACTIVE_STATUSES as unknown as string[];

  const [total, byCategory, inServisAgg, selesaiAgg] = await Promise.all([
    prisma.damagedItem.aggregate({ where: { status: { in: active } }, _sum: { qty: true } }),
    prisma.damagedItem.groupBy({
      by: ['category'],
      where: { status: { in: active } },
      _sum: { qty: true },
      _count: { _all: true },
    }),
    prisma.servisAsset.aggregate({
      where: { status: 'Dalam Servis' },
      _sum: { sourceQty: true },
    }),
    prisma.servisAsset.aggregate({ where: { status: 'Selesai (Diperbaiki)' }, _sum: { sourceQty: true } }),
  ]);

  return {
    total: total._sum.qty ?? 0,
    inServis: inServisAgg._sum.sourceQty ?? 0,
    selesai: selesaiAgg._sum.sourceQty ?? 0,
    byCategory: byCategory
      .map((c) => ({
        category: c.category || 'Tanpa Kategori',
        qty: c._sum.qty ?? 0,
        records: c._count._all,
      }))
      .sort((a, b) => b.qty - a.qty),
  };
}