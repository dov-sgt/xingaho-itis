import { buildCrudHandlers, nextCode } from '@/lib/crud-route';
import { SERVIS_STATUSES } from '@/lib/assets';

/**
 * CRUD Servis Asset (item 2).
 *
 * Status mengikuti alur: Dalam Servis -> Selesai (Diperbaiki) / Tidak Bisa
 * Diperbaiki. Status lama (Pending / In Progress / Completed / Cancelled)
 * tetap diterima agar baris lama tidak rusak.
 *
 * Pembuatan dari tombol "Kirim ke Servis" memakai endpoint
 * POST /api/damaged-items/servis supaya perpindahan aset atomic.
 */
const STATUS = SERVIS_STATUSES;

const handlers = buildCrudHandlers({
  model: 'servisAsset',
  feature: 'servis_asset',
  searchFields: ['servisCode', 'itemName', 'teknisiName', 'serviceVendor', 'category'],
  statusField: 'status',
  dateField: 'date',
  validate: (body) => {
    const e: string[] = [];
    if (!body.itemName) e.push('Nama barang wajib diisi.');
    // teknisiName opsional (item 2) - aset dari Daftar Damage belum tentu
    // sudah punya teknisi.
    if (body.status && !STATUS.includes(body.status)) e.push(`Status harus salah satu dari: ${STATUS.join(', ')}.`);
    return e;
  },
  toCreate: async (body, auth) => ({
    servisCode: await nextCode('servisAsset', 'SRV'),
    date: body.date ? new Date(body.date) : new Date(),
    itemName: body.itemName,
    teknisiName: body.teknisiName ? String(body.teknisiName).trim() : null,
    status: body.status || 'Pending',
    category: body.category || null,
    itemCode: body.itemCode || null,
    serviceVendor: body.serviceVendor || null,
    createdBy: body.createdBy || auth?.name || null,
  }),
  toUpdate: (body) => ({
    ...(body.date ? { date: new Date(body.date) } : {}),
    itemName: body.itemName,
    teknisiName: body.teknisiName ? String(body.teknisiName).trim() : null,
    serviceVendor: body.serviceVendor ?? null,
    ...(body.status ? { status: body.status } : {}),
  }),
});

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;