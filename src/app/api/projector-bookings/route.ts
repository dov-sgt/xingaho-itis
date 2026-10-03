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
    const bookings = await prisma.booking.findMany({ orderBy: { id: 'desc' } });
    return ok(bookings);
  } catch (error: any) { return serverError(error.message); }
}

export async function POST(req: NextRequest) {
  const authError = requirePermission(req, 'transaction_item', 'create');
  if (authError) return authError;
  try {
    const body = await req.json();
    const { borrowerName, startDate, startTime, endDate, endTime, location, createdBy } = body;
    const errors = collectErrors([
      validateRequired(borrowerName, 'Nama Peminjam'),
      validateString(borrowerName, 'Nama Peminjam', 1, 255),
      validateRequired(startDate, 'Tanggal Mulai'),
      validateRequired(endDate, 'Tanggal Selesai'),
      validateRequired(location, 'Lokasi'),
      validateString(location, 'Lokasi', 1, 255),
    ]);
    if (errors.length > 0) return validationError(errors);

    const count = await prisma.booking.count();
    const bookingCode = `PRJ-2026-${(count + 1).toString().padStart(4, '0')}`;

    const booking = await prisma.booking.create({
      data: { bookingCode, borrowerName, startDate, startTime: startTime || null, endDate, endTime: endTime || null, location, status: 'Pending', createdBy: createdBy || 'Staff IT' },
    });
    return ok(booking, 201);
  } catch (error: any) { return serverError(error.message); }
}

export async function PUT(req: NextRequest) {
  const authError = requirePermission(req, 'transaction_item', 'update');
  if (authError) return authError;
  try {
    const body = await req.json();
    const { id, status, borrowerName, startDate, startTime, endDate, endTime, location } = body;
    if (!id) return badRequest('ID is required');
    if (status && !VALID_STATUSES.includes(status)) return badRequest(`Status tidak valid. Valid: ${VALID_STATUSES.join(', ')}`);

    const data: any = {};
    if (status) data.status = status;
    if (borrowerName) data.borrowerName = borrowerName;
    if (startDate) data.startDate = startDate;
    if (startTime !== undefined) data.startTime = startTime || null;
    if (endDate) data.endDate = endDate;
    if (endTime !== undefined) data.endTime = endTime || null;
    if (location) data.location = location;

    const updated = await prisma.booking.update({ where: { id: Number(id) }, data });
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
    await prisma.booking.delete({ where: { id: Number(id) } });
    return ok({ success: true });
  } catch (error: any) { return serverError(error.message); }
}
