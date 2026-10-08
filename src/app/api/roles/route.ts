import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/session';
import { ok, badRequest, serverError, validationError } from '@/lib/api';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const authError = requirePermission(req, 'user_management', 'read');
  if (authError) return authError;
  try {
    const roles = await prisma.role.findMany({ orderBy: { id: 'asc' } });
    return ok(roles);
  } catch (error: any) { return serverError(error.message); }
}

export async function POST(req: NextRequest) {
  const authError = requirePermission(req, 'user_management', 'create');
  if (authError) return authError;
  try {
    const body = await req.json();
    const { code, name, description, permissions } = body;
    if (!code || !name) return badRequest('Code dan Name wajib diisi');
    const role = await prisma.role.create({
      data: { code, name, description: description || null, permissions },
    });
    return ok(role, 201);
  } catch (error: any) { return serverError(error.message); }
}

export async function PUT(req: NextRequest) {
  const authError = requirePermission(req, 'user_management', 'update');
  if (authError) return authError;
  try {
    const body = await req.json();
    const { id, code, name, description, permissions } = body;
    if (!id) return badRequest('ID is required');
    const role = await prisma.role.update({
      where: { id: Number(id) },
      data: { code, name, description, permissions },
    });
    return ok(role);
  } catch (error: any) { return serverError(error.message); }
}

export async function DELETE(req: NextRequest) {
  const authError = requirePermission(req, 'user_management', 'delete');
  if (authError) return authError;
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return badRequest('ID is required');
    await prisma.role.delete({ where: { id: Number(id) } });
    return ok({ success: true });
  } catch (error: any) { return serverError(error.message); }
}
