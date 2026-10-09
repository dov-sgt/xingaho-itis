import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAnyPermission, requireSuperAdminPermission } from '@/lib/session';
import { ok, badRequest, serverError } from '@/lib/api';
import { toInt } from '@/lib/documents';

export async function GET(req: NextRequest) {
  const authError = await requireAnyPermission(req, [
    { feature: 'division_management', action: 'read' },
    { feature: 'user_management', action: 'read' },
  ]);
  if (authError) return authError;

  try {
    const divisions = await prisma.division.findMany({
      orderBy: { id: 'asc' },
      include: { _count: { select: { users: true } } },
    });
    return ok(divisions);
  } catch (error: any) {
    return serverError(error.message);
  }
}

export async function POST(req: NextRequest) {
  const authError = await requireSuperAdminPermission(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const code = String(body.code || '').trim().toUpperCase().replace(/\s+/g, '_');
    if (!code) return badRequest('Kode divisi wajib diisi.');
    if (!body.name) return badRequest('Nama divisi wajib diisi.');

    const dup = await prisma.division.findUnique({ where: { code } });
    if (dup) return badRequest(`Kode divisi "${code}" sudah digunakan.`);

    const division = await prisma.division.create({ data: { code, name: body.name } });
    return ok({ ...division, _count: { users: 0 } }, 201);
  } catch (error: any) {
    return serverError(error.message);
  }
}

export async function PUT(req: NextRequest) {
  const authError = await requireSuperAdminPermission(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const id = toInt(body.id);
    if (!id) return badRequest('ID wajib diisi.');
    if (!body.name) return badRequest('Nama divisi wajib diisi.');

    const existing = await prisma.division.findUnique({ where: { id } });
    if (!existing) return badRequest('Divisi tidak ditemukan.');

    const division = await prisma.division.update({
      where: { id },
      data: { name: body.name },
      include: { _count: { select: { users: true } } },
    });
    return ok(division);
  } catch (error: any) {
    return serverError(error.message);
  }
}

export async function DELETE(req: NextRequest) {
  const authError = await requireSuperAdminPermission(req);
  if (authError) return authError;

  try {
    const id = toInt(new URL(req.url).searchParams.get('id'));
    if (!id) return badRequest('ID wajib diisi.');

    const division = await prisma.division.findUnique({ where: { id }, include: { _count: { select: { users: true } } } });
    if (!division) return badRequest('Divisi tidak ditemukan.');
    if (division._count.users > 0) {
      return badRequest(`Divisi masih memiliki ${division._count.users} pengguna. Pindahkan pengguna terlebih dahulu.`);
    }

    await prisma.division.delete({ where: { id } });
    return ok({ success: true });
  } catch (error: any) {
    return serverError(error.message);
  }
}