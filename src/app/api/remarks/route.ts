import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/session';
import { ok, badRequest, serverError, validationError } from '@/lib/api';
import { validateRequired, validateString, collectErrors } from '@/lib/validation';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const authError = requirePermission(req, 'transaction_item', 'read');
  if (authError) return authError;
  try {
    const { searchParams } = new URL(req.url);
    const nasabahId = searchParams.get('nasabahId');
    const where: any = {};
    if (nasabahId) where.nasabahId = Number(nasabahId);
    const remarks = await prisma.remark.findMany({ where, orderBy: { id: 'desc' } });
    return ok(remarks);
  } catch (error: any) { return serverError(error.message); }
}

export async function POST(req: NextRequest) {
  const authError = requirePermission(req, 'transaction_item', 'create');
  if (authError) return authError;
  try {
    const body = await req.json();
    const { nasabahId, agenName, remark, promiseToPay, promiseDate } = body;
    const errors = collectErrors([
      validateRequired(nasabahId, 'Nasabah'),
      validateRequired(agenName, 'Nama Agen'),
      validateRequired(remark, 'Remark'),
    ]);
    if (errors.length > 0) return validationError(errors);

    const remarkRecord = await prisma.remark.create({
      data: { nasabahId: Number(nasabahId), agenName, remark, promiseToPay: promiseToPay || false, promiseDate: promiseDate ? new Date(promiseDate) : null },
    });
    return ok(remarkRecord, 201);
  } catch (error: any) { return serverError(error.message); }
}

export async function PUT(req: NextRequest) {
  const authError = requirePermission(req, 'transaction_item', 'update');
  if (authError) return authError;
  try {
    const body = await req.json();
    const { id, remark, promiseToPay, promiseDate, status } = body;
    if (!id) return badRequest('ID is required');
    const data: any = {};
    if (remark) data.remark = remark;
    if (promiseToPay !== undefined) data.promiseToPay = promiseToPay;
    if (promiseDate) data.promiseDate = new Date(promiseDate);
    if (status) data.status = status;
    const updated = await prisma.remark.update({ where: { id: Number(id) }, data });
    return ok(updated);
  } catch (error: any) { return serverError(error.message); }
}
