import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/session';
import { ok, badRequest, serverError, validationError } from '@/lib/api';
import { validateRequired, validateString, validateNumber, collectErrors } from '@/lib/validation';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const authError = requirePermission(req, 'transaction_item', 'read');
  if (authError) return authError;
  try {
    const { searchParams } = new URL(req.url);
    const agenName = searchParams.get('agenName') || '';
    const dateFrom = searchParams.get('date_from') || '';
    const dateTo = searchParams.get('date_to') || '';
    const where: any = {};
    if (agenName) where.agenName = { contains: agenName };
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }
    const achievements = await prisma.paymentAchievement.findMany({ where, orderBy: { id: 'desc' } });
    return ok(achievements);
  } catch (error: any) { return serverError(error.message); }
}

export async function POST(req: NextRequest) {
  const authError = requirePermission(req, 'transaction_item', 'create');
  if (authError) return authError;
  try {
    const body = await req.json();
    const { agenName, nasabahId, nasabahName, amount, paymentMethod } = body;
    const errors = collectErrors([
      validateRequired(agenName, 'Nama Agen'),
      validateRequired(nasabahName, 'Nama Nasabah'),
      validateNumber(amount, 'Jumlah', 1),
    ]);
    if (errors.length > 0) return validationError(errors);

    const achievement = await prisma.paymentAchievement.create({
      data: { agenName, nasabahId: nasabahId ? Number(nasabahId) : null, nasabahName, amount: parseFloat(amount) || 0, paymentMethod: paymentMethod || null },
    });
    return ok(achievement, 201);
  } catch (error: any) { return serverError(error.message); }
}

export async function PUT(req: NextRequest) {
  const authError = requirePermission(req, 'transaction_item', 'update');
  if (authError) return authError;
  try {
    const body = await req.json();
    const { id, status, notedBy } = body;
    if (!id) return badRequest('ID is required');
    if (status && !['Pending', 'Confirmed', 'Rejected'].includes(status)) return badRequest('Status tidak valid');
    const data: any = {};
    if (status) data.status = status;
    if (notedBy) data.notedBy = notedBy;
    const updated = await prisma.paymentAchievement.update({ where: { id: Number(id) }, data });
    return ok(updated);
  } catch (error: any) { return serverError(error.message); }
}
