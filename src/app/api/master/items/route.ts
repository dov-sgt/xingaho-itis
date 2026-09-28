import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/session';
import { ok, badRequest, serverError, validationError } from '@/lib/api';
import { validateRequired, validateString, collectErrors } from '@/lib/validation';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';

    const where: any = {};
    if (category) { where.typeItem = category; }
    if (search) {
      where.OR = [
        { code: { contains: search } },
        { namaItem: { contains: search } },
        { brand: { contains: search } },
      ];
    }

    const items = await prisma.masterItem.findMany({ where, orderBy: { id: 'asc' } });
    return ok(items);
  } catch (error: any) { return serverError(error.message); }
}

export async function POST(req: NextRequest) {
  const authError = requirePermission(req, 'master_item', 'create');
  if (authError) return authError;
  try {
    const body = await req.json();
    const { code, typeItem, namaItem, brand, updateBy } = body;
    const errors = collectErrors([
      validateRequired(code, 'Code'), validateString(code, 'Code', 1, 50),
      validateRequired(typeItem, 'Type Item'), validateRequired(namaItem, 'Nama Item'),
      validateString(namaItem, 'Nama Item', 1, 255),
    ]);
    if (errors.length > 0) return validationError(errors);
    const existing = await prisma.masterItem.findUnique({ where: { code } });
    if (existing) return badRequest('Kode Item sudah digunakan');
    const item = await prisma.masterItem.create({ data: { code, typeItem, namaItem, brand: brand || '-', updateBy: updateBy || 'IT Staff' } });
    return ok(item, 201);
  } catch (error: any) { return serverError(error.message); }
}

export async function PUT(req: NextRequest) {
  const authError = requirePermission(req, 'master_item', 'update');
  if (authError) return authError;
  try {
    const body = await req.json();
    const { id, code, typeItem, namaItem, brand, updateBy } = body;
    const errors = collectErrors([validateRequired(id, 'ID'), validateRequired(code, 'Code'), validateRequired(namaItem, 'Nama Item')]);
    if (errors.length > 0) return validationError(errors);
    const item = await prisma.masterItem.update({ where: { id: Number(id) }, data: { code, typeItem, namaItem, brand, updateAt: new Date(), updateBy: updateBy || 'IT Staff' } });
    return ok(item);
  } catch (error: any) { return serverError(error.message); }
}

export async function DELETE(req: NextRequest) {
  const authError = requirePermission(req, 'master_item', 'delete');
  if (authError) return authError;
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return badRequest('ID is required');
    await prisma.masterItem.delete({ where: { id: Number(id) } });
    return ok({ success: true });
  } catch (error: any) { return serverError(error.message); }
}
