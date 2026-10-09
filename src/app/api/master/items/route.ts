import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, requireAnyPermission } from '@/lib/session';
import { ok, badRequest, serverError, validationError } from '@/lib/api';
import { collectErrors, validateRequired, validateString } from '@/lib/validation';
import { toNumber } from '@/lib/documents';
import { generateItemCode } from '@/lib/item-code';

export async function GET(req: NextRequest) {
  // Dibaca juga oleh form Pengajuan & Stock Out (butuh daftar item katalog).
  const authError = await requireAnyPermission(req, [
    { feature: 'master_item', action: 'read' },
    { feature: 'vendor_submission', action: 'read' },
    { feature: 'vendor_submission', action: 'create' },
    { feature: 'purchase_request', action: 'read' },
    { feature: 'purchase_request', action: 'create' },
    { feature: 'transaction_stockout', action: 'read' },
    { feature: 'transaction_stockout', action: 'create' },
  ]);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';

    const where: any = {};
    if (category && category !== 'All') where.typeItem = category;
    if (search) {
      where.OR = [
        { code: { contains: search } },
        { namaItem: { contains: search } },
        { brand: { contains: search } },
      ];
    }

    const items = await prisma.masterItem.findMany({ where, orderBy: { id: 'asc' } });
    // `price` ikut dikembalikan supaya form pengajuan bisa mengisi harga
    // otomatis tanpa request tambahan (item 8).
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
    // `code` OPSIONAL (item 3): kosong berarti server yang membuat sendiri
    // XHIT-<KATEGORI><YY><MM>-<URUT>. Kode yang dikirim tetap dihormati
    // supaya tidak merusak kode lama / impor dari sumber lain.
    const code = String(body.code ?? '').trim();
    const typeItem = String(body.typeItem ?? '').trim();
    const namaItem = String(body.namaItem ?? '').trim();
    const brand = body.brand ? String(body.brand).trim() : '-';
    const price = body.price === undefined || body.price === null || body.price === '' ? null : toNumber(body.price, 0);

    const errors = collectErrors([
      validateRequired(typeItem, 'Kategori'),
      validateRequired(namaItem, 'Nama Item'),
      validateString(namaItem, 'Nama Item', 1, 255),
    ]);
    if (code) validateString(code, 'Kode Item', 1, 50);
    if (price !== null && price < 0) errors.push('Harga harus berupa angka dan tidak boleh negatif');
    if (errors.length > 0) return validationError(errors);

    if (code) {
      const existing = await prisma.masterItem.findUnique({ where: { code } });
      if (existing) return badRequest('Kode Item sudah digunakan');
    }

    // Generator + create satu transaksi supaya nomor urut tidak bentrok.
    const item = await prisma.$transaction(async (tx) => {
      const finalCode = code || (await generateItemCode(tx, typeItem));
      return tx.masterItem.create({
        data: {
          code: finalCode,
          typeItem,
          namaItem,
          brand: brand || '-',
          price,
          updateBy: body.updateBy || 'IT Staff',
        },
      });
    });

    return ok(item, 201);
  } catch (error: any) {
    if (String(error?.message || '').includes('Unique constraint')) {
      return badRequest('Kode Item sudah digunakan.');
    }
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
    if (price !== undefined && price !== null && price !== '' && toNumber(price, -1) < 0) {
      errors.push('Harga harus berupa angka dan tidak boleh negatif');
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
