import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/session';
import { ok, badRequest, serverError, validationError } from '@/lib/api';
import { validateRequired, validateString, collectErrors } from '@/lib/validation';
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';

export async function GET(req: NextRequest) {
  const authError = requirePermission(req, 'user_management', 'read');
  if (authError) return authError;
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        roleId: true,
        divisionId: true,
        createdAt: true,
        role: { select: { code: true, name: true } },
        division: { select: { code: true, name: true } },
      },
      orderBy: { id: 'asc' },
    });
    return ok(users);
  } catch (error: any) { return serverError(error.message); }
}

export async function POST(req: NextRequest) {
  const authError = requirePermission(req, 'user_management', 'create');
  if (authError) return authError;
  try {
    const body = await req.json();
    const { username, name, password, roleId, divisionId } = body;
    const errors = collectErrors([
      validateRequired(username, 'Username'),
      validateString(username, 'Username', 3, 50),
      validateRequired(name, 'Nama'),
      validateRequired(password, 'Password'),
      validateString(password, 'Password', 6, 100),
      validateRequired(roleId, 'Role'),
      validateRequired(divisionId, 'Division'),
    ]);
    if (errors.length > 0) return validationError(errors);

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) return badRequest('Username sudah digunakan');

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: { username, name, password: hashedPassword, roleId: Number(roleId), divisionId: Number(divisionId) },
    });
    return ok({ id: newUser.id, username: newUser.username, name: newUser.name }, 201);
  } catch (error: any) { return serverError(error.message); }
}

export async function PUT(req: NextRequest) {
  const authError = requirePermission(req, 'user_management', 'update');
  if (authError) return authError;
  try {
    const body = await req.json();
    const { id, name, roleId, divisionId, password } = body;
    if (!id) return badRequest('ID is required');

    const data: any = {};
    if (name) data.name = name;
    if (roleId) data.roleId = Number(roleId);
    if (divisionId) data.divisionId = Number(divisionId);
    if (password) {
      if (password.length < 6) return badRequest('Password minimal 6 karakter');
      data.password = await bcrypt.hash(password, 10);
    }

    const updated = await prisma.user.update({ where: { id: Number(id) }, data });
    return ok({ id: updated.id, username: updated.username, name: updated.name });
  } catch (error: any) { return serverError(error.message); }
}

export async function DELETE(req: NextRequest) {
  const authError = requirePermission(req, 'user_management', 'delete');
  if (authError) return authError;
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return badRequest('ID is required');

    const user = await prisma.user.findUnique({ where: { id: Number(id) } });
    if (user?.username === 'superadmin') return badRequest('Tidak dapat menghapus akun SuperAdmin utama');

    await prisma.user.delete({ where: { id: Number(id) } });
    return ok({ success: true });
  } catch (error: any) { return serverError(error.message); }
}
