import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAnyPermission, getAuthContext } from '@/lib/session';
import { ok, badRequest, serverError } from '@/lib/api';
import { toInt } from '@/lib/documents';
import {
  DAMAGED_ACTIVE_STATUSES,
  DAMAGED_STATUSES,
  damagedSummary,
} from '@/lib/assets';

/**
 * Daftar aset rusak - sumber tunggal untuk "jumlah aset rusak" (item 1).
 *
 * Berisi hasil Return kondisi Damage, pencatatan manual dari Inventaris & Stok
 * (item 6), dan hasil "Kirim ke Servis" (item 2).
 *
 * Yang dihitung sebagai aset rusak hanya status 'Rusak' dan
 * 'Tidak Bisa Diperbaiki' - aset yang sudah 'Dalam Servis' dipindah keluar
 * dari hitungan, dan 'Selesai' sudah kembali ke stok Good.
 */
export async function GET(req: NextRequest) {
  // Aset rusak bisa dibaca dari menu Daftar Damage maupun Inventaris & Stok.
  const authError = await requireAnyPermission(req, [
    { feature: 'transaction_headset', action: 'read' },
    { feature: 'inventory_type_item', action: 'read' },
  ]);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('search') || '').trim();
    const status = (searchParams.get('status') || '').trim();
    const page = Math.max(1, toInt(searchParams.get('page'), 1));
    const pageSize = Math.min(200, Math.max(1, toInt(searchParams.get('pageSize'), 25)));

    const where: any = {};
    if (status && DAMAGED_STATUSES.includes(status as any)) {
      where.status = status;
    } else if (!status) {
      // Tampilan daftarDamage default: tampilkan semua kecuali yang sudah selesai.
      where.status = { not: 'Selesai' };
    }
    if (search) {
      where.OR = [
        { itemName: { contains: search } },
        { itemCode: { contains: search } },
        { nik: { contains: search } },
        { employeeName: { contains: search } },
        { category: { contains: search } },
      ];
    }

    const [data, total, sumQty, summary] = await Promise.all([
      prisma.damagedItem.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.damagedItem.count({ where }),
      prisma.damagedItem.aggregate({ where, _sum: { qty: true } }),
      damagedSummary(),
    ]);

    return ok({
      data,
      pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
      totalDamaged: sumQty._sum.qty ?? 0,
      summary,
    });
  } catch (error: any) {
    return serverError(error.message);
  }
}

/**
 * Buat aset rusak (item 6).
 *
 * Dipakai tombol "Tambah Aset Rusak" di Inventaris & Stok. Field wajib hanya
 * kategori + jumlah - TIDAK ada kode aset.
 */
export async function POST(req: NextRequest) {
  const authError = await requireAnyPermission(req, [
    { feature: 'transaction_headset', action: 'create' },
    { feature: 'inventory_type_item', action: 'create' },
    { feature: 'inventory_type_item', action: 'update' },
  ]);
  if (authError) return authError;

  try {
    const auth = await getAuthContext(req);
    const body = await req.json();

    const category = String(body.category ?? '').trim();
    const qty = toInt(body.qty, 0);
    const note = String(body.note ?? '').trim();
    const itemCode = String(body.itemCode ?? '').trim() || null;
    const itemName = String(body.itemName ?? '').trim() || category;
    const vendor = String(body.vendor ?? '').trim() || null;

    if (!category) return badRequest('Kategori wajib diisi');
    if (qty < 1) return badRequest('Qty minimal 1');

    const created = await prisma.damagedItem.create({
      data: {
        itemCode,
        itemName,
        qty,
        category,
        status: 'Rusak',
        condition: 'Damage',
        vendor,
        note: note || 'Pencatatan aset rusak manual',
        createdBy: auth?.name ?? 'Staff IT',
        updatedBy: auth?.name ?? 'Staff IT',
      },
    });

    return ok(created, 201);
  } catch (error: any) {
    return serverError(error.message);
  }
}

/** Hapus catatan aset rusak (hanya yang belum diproses servis). */
export async function DELETE(req: NextRequest) {
  const authError = await requireAnyPermission(req, [
    { feature: 'transaction_headset', action: 'delete' },
    { feature: 'inventory_type_item', action: 'delete' },
  ]);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return badRequest('ID is required');

    const existing = await prisma.damagedItem.findUnique({ where: { id: toInt(id, 0) } });
    if (!existing) return badRequest('Data tidak ditemukan');
    if (existing.status === 'Dalam Servis') {
      return badRequest('Aset sedang dalam servis dan tidak bisa dihapus.');
    }

    await prisma.damagedItem.delete({ where: { id: toInt(id, 0) } });
    return ok({ success: true });
  } catch (error: any) {
    return serverError(error.message);
  }
}