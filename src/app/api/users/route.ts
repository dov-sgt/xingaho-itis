import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/session';
import { ok, badRequest, serverError, validationError } from '@/lib/api';
import { validateRequired, validateString, collectErrors } from '@/lib/validation';
import { toInt } from '@/lib/documents';
import bcrypt from 'bcryptjs';

const SAFE_SELECT = {
  id: true,
  username: true,
  name: true,
  roleId: true,
  divisionId: true,
  createdAt: true,
  role: { select: { code: true, name: true } },
  division: { select: { code: true, name: true } },
} as const;

export async function GET(req: NextRequest) {
  const authError = await requirePermission(req, 'user_management', 'read');
  if (authError) return authError;

  try {
    const search = (new URL(req.url).searchParams.get('search') || '').trim();
    const users = await prisma.user.findMany({
      where: search
        ? { OR: [{ username: { contains: search } }, { name: { contains: search } }] }
        : undefined,
      select: SAFE_SELECT,
      orderBy: { id: 'asc' },
    });
    return ok(users);
  } catch (error: any) {
    return serverError(error.message);
  }
}

export async function POST(req: NextRequest) {
  const authError = await requirePermission(req, 'user_management', 'create');
  if (authError) return authError;

  try {
    const body = await req.json();
    const { username, name, password, roleId, divisionId } = body;

    const errors = collectErrors([
      validateRequired(username, 'Username'),
      validateString(username, 'Username', 3, 50),
      validateRequired(name, 'Nama'),
      validateString(name, 'Nama', 2, 100),
      validateRequired(password, 'Password'),
      validateString(password, 'Password', 6, 100),
      validateRequired(roleId, 'Role'),
      validateRequired(divisionId, 'Divisi'),
    ]);
    if (errors.length > 0) return validationError(errors);

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) return badRequest('Username sudah digunakan.');

    const [role, division] = await Promise.all([
      prisma.role.findUnique({ where: { id: toInt(roleId) } }),
      prisma.division.findUnique({ where: { id: toInt(divisionId) } }),
    ]);
    if (!role) return badRequest('Role tidak ditemukan.');
    if (!division) return badRequest('Divisi tidak ditemukan.');

    const created = await prisma.user.create({
      data: {
        username,
        name,
        password: await bcrypt.hash(password, 10),
        roleId: role.id,
        divisionId: division.id,
      },
      select: SAFE_SELECT,
    });
    return ok(created, 201);
  } catch (error: any) {
    return serverError(error.message);
  }
}

export async function PUT(req: NextRequest) {
  const authError = await requirePermission(req, 'user_management', 'update');
  if (authError) return authError;

  try {
    const body = await req.json();
    const { id, name, roleId, divisionId, password } = body;
    if (!id) return badRequest('ID wajib diisi.');

    const current = await prisma.user.findUnique({ where: { id: toInt(id) } });
    if (!current) return badRequest('Pengguna tidak ditemukan.');

    const data: any = {};
    if (name !== undefined) {
      const e = validateString(name, 'Nama', 2, 100) ?? validateRequired(name, 'Nama');
      if (e) return badRequest(e);
      data.name = name;
    }
    if (roleId) {
      const role = await prisma.role.findUnique({ where: { id: toInt(roleId) } });
      if (!role) return badRequest('Role tidak ditemukan.');
      data.roleId = role.id;
    }
    if (divisionId) {
      const division = await prisma.division.findUnique({ where: { id: toInt(divisionId) } });
      if (!division) return badRequest('Divisi tidak ditemukan.');
      data.divisionId = division.id;
    }
    if (password) {
      const e = validateString(password, 'Password', 6, 100);
      if (e) return badRequest(e);
      data.password = await bcrypt.hash(password, 10);
    }

    const updated = await prisma.user.update({ where: { id: toInt(id) }, data, select: SAFE_SELECT });
    return ok(updated);
  } catch (error: any) {
    return serverError(error.message);
  }
}

export async function DELETE(req: NextRequest) {
  const authError = await requirePermission(req, 'user_management', 'delete');
  if (authError) return authError;

  try {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return badRequest('ID wajib diisi.');

    const user = await prisma.user.findUnique({ where: { id: toInt(id) } });
    if (!user) return badRequest('Pengguna tidak ditemukan.');
    if (user.username === 'superadmin') return badRequest('Akun SuperAdmin utama tidak dapat dihapus.');

    await prisma.user.delete({ where: { id: toInt(id) } });
    return ok({ success: true });
  } catch (error: any) {
    return serverError(error.message);
  }
}