import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/session';
import { ok, badRequest, serverError, validationError } from '@/lib/api';
import { validateRequired, collectErrors } from '@/lib/validation';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const authError = requirePermission(req, 'transaction_item', 'read');
  if (authError) return authError;
  try {
    const logs = await prisma.logRuangServer.findMany({ orderBy: { id: 'desc' } });
    return ok(logs);
  } catch (error: any) { return serverError(error.message); }
}

export async function POST(req: NextRequest) {
  const authError = requirePermission(req, 'transaction_item', 'create');
  if (authError) return authError;
  try {
    const body = await req.json();
    const { date, nama, jamMasuk, jamKeluar, keperluan, location } = body;
    const errors = collectErrors([
      validateRequired(date, 'Tanggal'),
      validateRequired(nama, 'Nama'),
      validateRequired(jamMasuk, 'Jam Masuk'),
      validateRequired(keperluan, 'Keperluan'),
    ]);
    if (errors.length > 0) return validationError(errors);

    const count = await prisma.logRuangServer.count();
    const logCode = `LOG-2026-${(count + 1).toString().padStart(4, '0')}`;

    const log = await prisma.logRuangServer.create({
      data: { logCode, date: new Date(date), nama, jamMasuk, jamKeluar: jamKeluar || null, keperluan, location: location || null },
    });
    return ok(log, 201);
  } catch (error: any) { return serverError(error.message); }
}

export async function PUT(req: NextRequest) {
  const authError = requirePermission(req, 'transaction_item', 'update');
  if (authError) return authError;
  try {
    const body = await req.json();
    const { id, date, nama, jamMasuk, jamKeluar, keperluan, location } = body;
    if (!id) return badRequest('ID is required');

    const data: any = {};
    if (date) data.date = new Date(date);
    if (nama) data.nama = nama;
    if (jamMasuk) data.jamMasuk = jamMasuk;
    if (jamKeluar !== undefined) data.jamKeluar = jamKeluar || null;
    if (keperluan) data.keperluan = keperluan;
    if (location !== undefined) data.location = location || null;

    const updated = await prisma.logRuangServer.update({ where: { id: Number(id) }, data });
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
    await prisma.logRuangServer.delete({ where: { id: Number(id) } });
    return ok({ success: true });
  } catch (error: any) { return serverError(error.message); }
}
