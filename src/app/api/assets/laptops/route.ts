import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAnyPermission, getAuthContext } from '@/lib/session';
import { ok, badRequest, serverError, validationError } from '@/lib/api';
import { collectErrors, validateRequired, validateString } from '@/lib/validation';
import { toInt } from '@/lib/documents';
import { generateItemCode } from '@/lib/item-code';
import { LAPTOP_DEFAULT_CATEGORY } from '@/lib/assets';

/**
 * Aset laptop (item 5).
 *
 * - POST  : buat aset laptop + kode aset otomatis + histori penugasan pertama
 * - PUT   : mutasi / ganti pengguna (menutup histori lama, membuka yang baru)
 * - GET   : daftar aset, dengan `?id=` untuk melihat histori satu aset
 */
export async function GET(req: NextRequest) {
  const authError = await requireAnyPermission(req, [
    { feature: 'inventory_type_item', action: 'read' },
    { feature: 'transaction_headset', action: 'read' },
  ]);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('search') || '').trim();
    const id = searchParams.get('id');

    // Detail satu aset + riwayat penugasannya.
    if (id) {
      const asset = await prisma.laptopAsset.findUnique({
        where: { id: toInt(id, 0) },
        include: { history: { orderBy: { startDate: 'desc' } } },
      });
      if (!asset) return badRequest('Aset tidak ditemukan');
      return ok(asset);
    }

    const where: any = {};
    if (search) {
      where.OR = [
        { item: { contains: search } },
        { user: { contains: search } },
        { assetCode: { contains: search } },
        { serialNumber: { contains: search } },
      ];
    }

    const assets = await prisma.laptopAsset.findMany({ where, orderBy: { id: 'desc' } });
    return ok(assets);
  } catch (error: any) {
    return serverError(error.message);
  }
}

/** Buat aset laptop baru. Kode aset dibuatkan server (item 3 + 5). */
export async function POST(req: NextRequest) {
  const authError = await requireAnyPermission(req, [
    { feature: 'inventory_type_item', action: 'create' },
    { feature: 'inventory_type_item', action: 'update' },
  ]);
  if (authError) return authError;

  try {
    const auth = await getAuthContext(req);
    const by = auth?.name ?? 'Staff IT';
    const body = await req.json();

    // "Assign ke" WAJIB diisi, input teks bebas (bukan pilihan dari daftar).
    const user = String(body.user ?? '').trim();
    const item = String(body.item ?? '').trim();
    const category = String(body.category ?? LAPTOP_DEFAULT_CATEGORY).trim() || LAPTOP_DEFAULT_CATEGORY;
    const serialNumber = String(body.serialNumber ?? '').trim() || null;
    const specification = String(body.specification ?? '').trim() || null;

    const errors = collectErrors([
      validateRequired(user, 'Assign ke'),
      validateString(user, 'Assign ke', 1, 255),
      validateRequired(item, 'Nama / Spesifikasi Aset'),
      validateString(item, 'Nama / Spesifikasi Aset', 1, 255),
    ]);
    if (errors.length > 0) return validationError(errors);

    const asset = await prisma.$transaction(async (tx) => {
      // Kode aset otomatis dari kategori (Computer).
      const assetCode = await generateItemCode(tx, category);

      const created = await tx.laptopAsset.create({
        data: {
          assetCode,
          category,
          item,
          user,
          status: body.status || 'Good',
          serialNumber,
          specification,
          createdBy: by,
          updatedBy: by,
        },
      });

      // Histori penugasan pertama.
      await tx.assetAssignmentHistory.create({
        data: {
          assetId: created.id,
          userName: user,
          startDate: new Date(),
          changedBy: by,
          note: 'Penugasan awal saat aset dibuat',
        },
      });

      await tx.inventoryHistory.create({
        data: {
          category,
          stock: 1,
          inQty: 1,
          outQty: 0,
          note: `[Aset Laptop] ${assetCode} - ${item} ditugaskan ke ${user}`,
          updateBy: by,
        },
      });

      return created;
    });

    return ok(asset, 201);
  } catch (error: any) {
    if (String(error?.message || '').includes('Unique constraint')) {
      return badRequest('Kode aset sudah digunakan. Silakan coba lagi.');
    }
    return serverError(error.message);
  }
}

/**
 * Mutasi / ganti pengguna (item 5).
 *
 * Satu transaksi: tutup penugasan lama (tanggal selesai), buka penugasan baru,
 * dan perbarui `LaptopAsset.user`. Tidak pernah menimpa riwayat.
 */
export async function PUT(req: NextRequest) {
  const authError = await requireAnyPermission(req, [
    { feature: 'inventory_type_item', action: 'update' },
  ]);
  if (authError) return authError;

  try {
    const auth = await getAuthContext(req);
    const by = auth?.name ?? 'Staff IT';
    const body = await req.json();

    const id = toInt(body.id, 0);
    const newUser = String(body.user ?? '').trim();
    const note = String(body.note ?? '').trim() || null;

    if (!id) return badRequest('ID wajib diisi.');
    if (!newUser) return badRequest('Nama pengguna baru wajib diisi.');

    const result = await prisma.$transaction(async (tx) => {
      const asset = await tx.laptopAsset.findUnique({ where: { id } });
      if (!asset) throw new Error('Aset tidak ditemukan.');
      if (asset.user === newUser) throw new Error('Nama pengguna baru sama dengan pengguna saat ini.');

      // Tutup penugasan aktif.
      const active = await tx.assetAssignmentHistory.findFirst({
        where: { assetId: id, endDate: null },
        orderBy: { startDate: 'desc' },
      });
      if (active) {
        await tx.assetAssignmentHistory.update({
          where: { id: active.id },
          data: { endDate: new Date() },
        });
      }

      // Buka penugasan baru.
      await tx.assetAssignmentHistory.create({
        data: {
          assetId: id,
          userName: newUser,
          startDate: new Date(),
          changedBy: by,
          note: note ?? `Mutasi dari ${asset.user}`,
        },
      });

      const updated = await tx.laptopAsset.update({
        where: { id },
        data: {
          user: newUser,
          lastMutationNote: note,
          updatedBy: by,
        },
      });

      await tx.inventoryHistory.create({
        data: {
          category: asset.category || LAPTOP_DEFAULT_CATEGORY,
          stock: 0,
          inQty: 0,
          outQty: 0,
          note: `[Mutasi Aset] ${asset.assetCode ?? id} - ${asset.item}: ${asset.user} -> ${newUser}`,
          updateBy: by,
        },
      });

      return updated;
    });

    return ok(result);
  } catch (error: any) {
    return badRequest(error.message || 'Gagal melakukan mutasi aset');
  }
}

/** Hapus aset laptop beserta histori penugasannya (cascade). */
export async function DELETE(req: NextRequest) {
  const authError = await requireAnyPermission(req, [
    { feature: 'inventory_type_item', action: 'delete' },
  ]);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return badRequest('ID is required');

    await prisma.assetAssignmentHistory.deleteMany({ where: { assetId: toInt(id, 0) } });
    await prisma.laptopAsset.delete({ where: { id: toInt(id, 0) } });
    return ok({ success: true });
  } catch (error: any) {
    return serverError(error.message);
  }
}