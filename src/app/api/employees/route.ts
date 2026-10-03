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
    const employees = await prisma.employee.findMany({ orderBy: { id: 'desc' } });
    return ok(employees);
  } catch (error: any) { return serverError(error.message); }
}

export async function POST(req: NextRequest) {
  const authError = requirePermission(req, 'user_management', 'create');
  if (authError) return authError;
  try {
    const body = await req.json();
    const { nik, name, department, position, joinDate, phone, email } = body;
    const errors = collectErrors([
      validateRequired(nik, 'NIK'), validateRequired(name, 'Nama'),
      validateRequired(department, 'Department'), validateRequired(position, 'Position'),
    ]);
    if (errors.length > 0) return validationError(errors);

    const count = await prisma.employee.count();
    const employeeCode = `EMP-2026-${(count + 1).toString().padStart(4, '0')}`;

    const employee = await prisma.employee.create({
      data: { employeeCode, nik, name, department, position, joinDate: new Date(joinDate), phone: phone || null, email: email || null },
    });
    return ok(employee, 201);
  } catch (error: any) { return serverError(error.message); }
}

export async function PUT(req: NextRequest) {
  const authError = requirePermission(req, 'user_management', 'update');
  if (authError) return authError;
  try {
    const body = await req.json();
    const { id, nik, name, department, position, joinDate, status, phone, email } = body;
    if (!id) return badRequest('ID is required');
    const data: any = {};
    if (nik) data.nik = nik;
    if (name) data.name = name;
    if (department) data.department = department;
    if (position) data.position = position;
    if (joinDate) data.joinDate = new Date(joinDate);
    if (status) data.status = status;
    if (phone !== undefined) data.phone = phone;
    if (email !== undefined) data.email = email;
    const updated = await prisma.employee.update({ where: { id: Number(id) }, data });
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
    await prisma.employee.delete({ where: { id: Number(id) } });
    return ok({ success: true });
  } catch (error: any) { return serverError(error.message); }
}
