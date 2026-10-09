import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, requireAnyPermission } from '@/lib/session';
import { ok, badRequest, serverError, validationError } from '@/lib/api';
import { collectErrors, validateRequired, validateString } from '@/lib/validation';
import { toNumber } from '@/lib/documents';

export async function GET(req: NextRequest) {
  // Dibaca juga oleh form Pengajuan (butuh daftar item katalog Headset).
  const authError = await requireAnyPermission(req, [
    { feature: 'master_item', action: 'read' },
    { feature: 'vendor_submission', action: 'read' },
    { feature: 'vendor_submission', action: 'create' },
    { feature: 'purchase_request', action: 'read' },
  ]);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';

    const where: any = {};
    if (category) where.typeItem = category;
    if (search) {
      where.OR = [
        { code: { contains: search } },
        { namaItem: { contains: search } },
        { brand: { contains: search } },
      ];
    }

    const items = await prisma.masterItem.findMany({ where, orderBy: { id: 'asc' } });
    return ok(items);
  } catch (error: any) {
    return serverError(error.message);
  }
}

export async function POST(req: NextRequest) {
  const authError = await requirePermission(req, 'master_item', 'create');
  if (authError) return authError;

  try {
    const body = await req.json();
    const { code, typeItem, namaItem, brand, price, updateBy } = body;

    const errors = collectErrors([
      validateRequired(code, 'Kode Item'),
      validateString(code, 'Kode Item', 1, 50),
      validateRequired(typeItem, 'Kategori'),
      validateRequired(namaItem, 'Nama Item'),
      validateString(namaItem, 'Nama Item', 1, 255),
    ]);
    // Harga opsional, tapi bila diisi harus angka >= 0 (item 12).
    if (price !== undefined && price !== null && price !== '') {
      if (toNumber(price, -1) < 0) errors.push('Harga harus berupa angka dan tidak boleh negatif');
    }
    if (errors.length > 0) return validationError(errors);

    const existing = await prisma.masterItem.findUnique({ where: { code } });
    if (existing) return badRequest('Kode Item sudah digunakan');

    const item = await prisma.masterItem.create({
      data: {
        code,
        typeItem,
        namaItem,
        brand: brand || '-',
        price: price === undefined || price === null || price === '' ? null : toNumber(price, 0),
        updateBy: updateBy || 'IT Staff',
      },
    });
    return ok(item, 201);
  } catch (error: any) {
    return serverError(error.message);
  }
}

export async function PUT(req: NextRequest) {
  const authError = await requirePermission(req, 'master_item', 'update');
  if (authError) return authError;

  try {
    const body = await req.json();
    const { id, code, typeItem, namaItem, brand, price, updateBy } = body;

    const errors = collectErrors([
      validateRequired(id, 'ID'),
      validateRequired(code, 'Kode Item'),
      validateRequired(namaItem, 'Nama Item'),
    ]);
    if (price !== undefined && price !== null && price !== '') {
      if (toNumber(price, -1) < 0) errors.push('Harga harus berupa angka dan tidak boleh negatif');
    }
    if (errors.length > 0) return validationError(errors);

    const item = await prisma.masterItem.update({
      where: { id: toNumber(id, 0) },
      data: {
        code,
        typeItem,
        namaItem,
        brand,
        price: price === undefined ? undefined : price === null || price === '' ? null : toNumber(price, 0),
        updateAt: new Date(),
        updateBy: updateBy || 'IT Staff',
      },
    });
    return ok(item);
  } catch (error: any) {
    return serverError(error.message);
  }
}

export async function DELETE(req: NextRequest) {
  const authError = await requirePermission(req, 'master_item', 'delete');
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return badRequest('ID is required');
    await prisma.masterItem.delete({ where: { id: toNumber(id, 0) } });
    return ok({ success: true });
  } catch (error: any) {
    return serverError(error.message);
  }
}