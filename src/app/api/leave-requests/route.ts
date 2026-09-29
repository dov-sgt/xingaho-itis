import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/session';
import { ok, badRequest, serverError, validationError } from '@/lib/api';
import { validateRequired, validateString, collectErrors } from '@/lib/validation';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const authError = requirePermission(req, 'user_management', 'read');
  if (authError) return authError;
  try {
    const leaves = await prisma.leaveRequest.findMany({ orderBy: { id: 'desc' } });
    return ok(leaves);
  } catch (error: any) { return serverError(error.message); }
}

export async function POST(req: NextRequest) {
  const authError = requirePermission(req, 'user_management', 'create');
  if (authError) return authError;
  try {
    const body = await req.json();
    const { employeeId, leaveType, startDate, endDate, reason } = body;
    const errors = collectErrors([
      validateRequired(employeeId, 'Employee'), validateRequired(leaveType, 'Tipe Cuti'),
      validateRequired(startDate, 'Tanggal Mulai'), validateRequired(endDate, 'Tanggal Selesai'),
      validateRequired(reason, 'Alasan'),
    ]);
    if (errors.length > 0) return validationError(errors);

    const count = await prisma.leaveRequest.count();
    const requestCode = `LVE-2026-${(count + 1).toString().padStart(4, '0')}`;

    const leave = await prisma.leaveRequest.create({
      data: { requestCode, employeeId: Number(employeeId), leaveType, startDate: new Date(startDate), endDate: new Date(endDate), reason },
    });
    return ok(leave, 201);
  } catch (error: any) { return serverError(error.message); }
}

export async function PUT(req: NextRequest) {
  const authError = requirePermission(req, 'user_management', 'update');
  if (authError) return authError;
  try {
    const body = await req.json();
    const { id, status, approvedBy } = body;
    if (!id) return badRequest('ID is required');
    if (status && !['Pending', 'Approved', 'Rejected'].includes(status)) return badRequest('Status tidak valid');
    const data: any = {};
    if (status) data.status = status;
    if (approvedBy) data.approvedBy = approvedBy;
    const updated = await prisma.leaveRequest.update({ where: { id: Number(id) }, data });
    return ok(updated);
  } catch (error: any) { return serverError(error.message); }
}

export async function DELETE(req: NextRequest) {
  const authError = requirePermission(req, 'user_management', 'delete');
  if (authError) return authError;
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return badRequest('ID is required');
    await prisma.leaveRequest.delete({ where: { id: Number(id) } });
    return ok({ success: true });
  } catch (error: any) { return serverError(error.message); }
}
