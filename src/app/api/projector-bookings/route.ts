import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, badRequest, serverError } from '@/lib/api';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const bookings = await prisma.booking.findMany({ orderBy: { id: 'desc' } });
    return ok(bookings);
  } catch (error: any) { return serverError(error.message); }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { borrowerName, startDate, startTime, endDate, endTime, location } = body;
    if (!borrowerName || !startDate) return badRequest('Nama peminjam dan tanggal mulai wajib diisi');
    const count = await prisma.booking.count();
    const bookingCode = `BKG-2026-${(count + 1).toString().padStart(4, '0')}`;
    const booking = await prisma.booking.create({
      data: { bookingCode, borrowerName, itemType: 'Projector', startDate, startTime: startTime || null, endDate: endDate || null, endTime: endTime || null, location: location || null, status: 'Pending' },
    });
    return ok(booking, 201);
  } catch (error: any) { return serverError(error.message); }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status } = body;
    if (!id) return badRequest('ID is required');
    const updated = await prisma.booking.update({ where: { id: Number(id) }, data: { status } });
    return ok(updated);
  } catch (error: any) { return serverError(error.message); }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return badRequest('ID is required');
    await prisma.booking.delete({ where: { id: Number(id) } });
    return ok({ success: true });
  } catch (error: any) { return serverError(error.message); }
}
