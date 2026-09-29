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
    const nasabah = await prisma.nasabah.findMany({ orderBy: { id: 'desc' } });
    return ok(nasabah);
  } catch (error: any) { return serverError(error.message); }
}

export async function POST(req: NextRequest) {
  const authError = requirePermission(req, 'transaction_item', 'create');
  if (authError) return authError;
  try {
    const body = await req.json();
    const { nama, nik, phone, email, alamat, loanAmount, dueDate, assignedTo } = body;
    const errors = collectErrors([
      validateRequired(nama, 'Nama Nasabah'),
      validateString(nama, 'Nama Nasabah', 1, 255),
      validateRequired(phone, 'Telepon'),
      validateNumber(loanAmount, 'Jumlah Pinjaman', 0),
    ]);
    if (errors.length > 0) return validationError(errors);

    const count = await prisma.nasabah.count();
    const nasabahCode = `NSB-2026-${(count + 1).toString().padStart(4, '0')}`;

    const nasabah = await prisma.nasabah.create({
      data: { nasabahCode, nama, nik: nik || null, phone, email: email || null, alamat: alamat || null, loanAmount: parseFloat(loanAmount) || 0, dueDate: dueDate ? new Date(dueDate) : null, assignedTo: assignedTo || null },
    });
    return ok(nasabah, 201);
  } catch (error: any) { return serverError(error.message); }
}

export async function PUT(req: NextRequest) {
  const authError = requirePermission(req, 'transaction_item', 'update');
  if (authError) return authError;
  try {
    const body = await req.json();
    const { id, nama, nik, phone, email, alamat, loanAmount, dueDate, status, assignedTo } = body;
    if (!id) return badRequest('ID is required');

    const data: any = {};
    if (nama) data.nama = nama;
    if (nik !== undefined) data.nik = nik;
    if (phone) data.phone = phone;
    if (email !== undefined) data.email = email;
    if (alamat !== undefined) data.alamat = alamat;
    if (loanAmount !== undefined) data.loanAmount = parseFloat(loanAmount) || 0;
    if (dueDate) data.dueDate = new Date(dueDate);
    if (status) data.status = status;
    if (assignedTo !== undefined) data.assignedTo = assignedTo;

    const updated = await prisma.nasabah.update({ where: { id: Number(id) }, data });
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
    await prisma.nasabah.delete({ where: { id: Number(id) } });
    return ok({ success: true });
  } catch (error: any) { return serverError(error.message); }
}
