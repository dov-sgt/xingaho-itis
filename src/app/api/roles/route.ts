import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdminPermission, requireAnyPermission } from '@/lib/session';
import { ok, badRequest, serverError } from '@/lib/api';
import { toInt } from '@/lib/documents';
import { FEATURES } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  const authError = await requireAnyPermission(req, [
    { feature: 'role_management', action: 'read' },
    { feature: 'user_management', action: 'read' },
  ]);
  if (authError) return authError;

  try {
    const roles = await prisma.role.findMany({ orderBy: { id: 'asc' } });
    return ok(roles.map((r) => ({ ...r, permissions: coerce(r.permissions) })));
  } catch (error: any) {
    return serverError(error.message);
  }
}

function coerce(raw: unknown): Record<string, string[]> {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      return coerce(JSON.parse(raw));
    } catch {
      return {};
    }
  }
  if (typeof raw === 'object') {
    const out: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (Array.isArray(v)) out[k] = v.map(String);
    }
    return out;
  }
  return {};
}

export async function POST(req: NextRequest) {
  const authError = await requireSuperAdminPermission(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const code = String(body.code || '').trim().toUpperCase().replace(/\s+/g, '_');
    if (!code || !body.name) return badRequest('Code dan nama role wajib diisi.');

    const dup = await prisma.role.findUnique({ where: { code } });
    if (dup) return badRequest(`Kode role "${code}" sudah digunakan.`);

    // Hanya izinkan feature yang dikenal.
    const permissions: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(body.permissions ?? {})) {
      if ((FEATURES as readonly string[]).includes(k) && Array.isArray(v)) permissions[k] = v.map(String);
    }

    const role = await prisma.role.create({
      data: { code, name: body.name, description: body.description || null, permissions },
    });
    return ok({ ...role, permissions: coerce(role.permissions) }, 201);
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

    const existing = await prisma.role.findUnique({ where: { id } });
    if (!existing) return badRequest('Role tidak ditemukan.');

    const data: any = {};
    if (body.name) data.name = body.name;
    if (body.description !== undefined) data.description = body.description || null;
    if (body.permissions) {
      const permissions: Record<string, string[]> = {};
      for (const [k, v] of Object.entries(body.permissions)) {
        if ((FEATURES as readonly string[]).includes(k) && Array.isArray(v)) permissions[k] = v.map(String);
      }
      data.permissions = permissions;
    }

    const updated = await prisma.role.update({ where: { id }, data });
    return ok({ ...updated, permissions: coerce(updated.permissions) });
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

    const role = await prisma.role.findUnique({ where: { id }, include: { _count: { select: { users: true } } } });
    if (!role) return badRequest('Role tidak ditemukan.');
    if (role.code === 'SUPERADMIN') return badRequest('Role SUPERADMIN tidak dapat dihapus.');
    if (role._count.users > 0) {
      return badRequest(`Role masih digunakan oleh ${role._count.users} pengguna. Pindahkan pengguna terlebih dahulu.`);
    }

    await prisma.role.delete({ where: { id } });
    return ok({ success: true });
  } catch (error: any) {
    return serverError(error.message);
  }
}