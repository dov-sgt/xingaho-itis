import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/session';
import { ok, badRequest, serverError, validationError } from '@/lib/api';
import { validateRequired, validateString, collectErrors } from '@/lib/validation';
import { NextRequest } from 'next/server';

const VALID_STATUSES = ['Pending', 'Ongoing', 'Done'];

export async function GET(req: NextRequest) {
  const authError = requirePermission(req, 'transaction_item', 'read');
  if (authError) return authError;
  try {
    const servis = await prisma.servisAsset.findMany({ orderBy: { id: 'desc' } });
    return ok(servis);
  } catch (error: any) { return serverError(error.message); }
}

export async function POST(req: NextRequest) {
  const authError = requirePermission(req, 'transaction_item', 'create');
  if (authError) return authError;
  try {
    const body = await req.json();
    const { date, itemName, teknisiName, createdBy } = body;
    const errors = collectErrors([
      validateRequired(date, 'Tanggal'),
      validateRequired(itemName, 'Nama Item'),
      validateString(itemName, 'Nama Item', 1, 255),
      validateRequired(teknisiName, 'Nama Teknisi'),
      validateString(teknisiName, 'Nama Teknisi', 1, 255),
    ]);
    if (errors.length > 0) return validationError(errors);

    const count = await prisma.servisAsset.count();
    const servisCode = `SVS-2026-${(count + 1).toString().padStart(4, '0')}`;

    const servis = await prisma.servisAsset.create({
      data: { servisCode, date: new Date(date), itemName, teknisiName, status: 'Pending', createdBy: createdBy || 'Staff IT' },
    });
    return ok(servis, 201);
  } catch (error: any) { return serverError(error.message); }
}

export async function PUT(req: NextRequest) {
  const authError = requirePermission(req, 'transaction_item', 'update');
  if (authError) return authError;
  try {
    const body = await req.json();
    const { id, status, itemName, teknisiName, date } = body;
    if (!id) return badRequest('ID is required');
    if (status && !VALID_STATUSES.includes(status)) return badRequest('Status tidak valid');

    const data: any = {};
    if (status) data.status = status;
    if (itemName) data.itemName = itemName;
    if (teknisiName) data.teknisiName = teknisiName;
    if (date) data.date = new Date(date);

    const updated = await prisma.servisAsset.update({ where: { id: Number(id) }, data });
    return ok(updated);
  } catch (error: any) { return serverError(error.message); }
}

export async function DELETE(req: NextRequest) {
  const authError = requirePermission(req, 'transaction_item', 'delete');
  if (authError) return authError;
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return badRequest('ID is required');
    await prisma.servisAsset.delete({ where: { id: Number(id) } });
    return ok({ success: true });
  } catch (error: any) { return serverError(error.message); }
}
