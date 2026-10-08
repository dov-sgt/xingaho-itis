import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/session';
import { ok, badRequest, serverError } from '@/lib/api';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const authError = requirePermission(req, 'user_management', 'read');
  if (authError) return authError;
  try {
    const divisions = await prisma.division.findMany({ orderBy: { id: 'asc' } });
    return ok(divisions);
  } catch (error: any) { return serverError(error.message); }
}

export async function POST(req: NextRequest) {
  const authError = requirePermission(req, 'user_management', 'create');
  if (authError) return authError;
  try {
    const body = await req.json();
    const { code, name } = body;
    if (!code || !name) return badRequest('Code dan Name wajib diisi');
    const division = await prisma.division.create({ data: { code, name } });
    return ok(division, 201);
  } catch (error: any) { return serverError(error.message); }
}

export async function PUT(req: NextRequest) {
  const authError = requirePermission(req, 'user_management', 'update');
  if (authError) return authError;
  try {
    const body = await req.json();
    const { id, code, name } = body;
    if (!id) return badRequest('ID is required');
    const division = await prisma.division.update({
      where: { id: Number(id) },
      data: { code, name },
    });
    return ok(division);
  } catch (error: any) { return serverError(error.message); }
}

export async function DELETE(req: NextRequest) {
  const authError = requirePermission(req, 'user_management', 'delete');
  if (authError) return authError;
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return badRequest('ID is required');
    await prisma.division.delete({ where: { id: Number(id) } });
    return ok({ success: true });
  } catch (error: any) { return serverError(error.message); }
}
