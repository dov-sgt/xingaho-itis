import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/session';
import { ok, badRequest, serverError } from '@/lib/api';
import { toInt } from '@/lib/documents';
import { VENDOR_STATUSES } from '@/lib/options';

const db = prisma as unknown as Record<string, any>;

export async function GET(req: NextRequest) {
  const authError = await requirePermission(req, 'master_vendor', 'read');
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('search') || '').trim();
    const status = searchParams.get('status') || '';
    const page = Math.max(1, toInt(searchParams.get('page'), 1));
    const pageSize = Math.min(200, Math.max(1, toInt(searchParams.get('pageSize'), 10)));

    const where: any = {};
    if (search) {
      where.OR = ['code', 'name', 'contactPerson', 'serviceType', 'email', 'city'].map((f) => ({
        [f]: { contains: search },
      }));
    }
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      db.masterVendor.findMany({ where, orderBy: { id: 'asc' }, skip: (page - 1) * pageSize, take: pageSize }),
      db.masterVendor.count({ where }),
    ]);

    return ok({ data, pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } });
  } catch (error: any) {
    return serverError(error.message);
  }
}

function validate(body: any, isUpdate: boolean): string[] {
  const e: string[] = [];
  if (!isUpdate && !body.code) e.push('Kode vendor wajib diisi.');
  if (!body.name) e.push('Nama vendor wajib diisi.');
  if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email))) e.push('Format email tidak valid.');
  if (body.status && !VENDOR_STATUSES.includes(body.status)) {
    e.push(`Status harus salah satu dari: ${VENDOR_STATUSES.join(', ')}.`);
  }
  return e;
}

export async function POST(req: NextRequest) {
  const authError = await requirePermission(req, 'master_vendor', 'create');
  if (authError) return authError;

  try {
    const body = await req.json();
    const errors = validate(body, false);
    if (errors.length) return badRequest(errors.join(' - '));

    const dup = await prisma.masterVendor.findUnique({ where: { code: body.code } });
    if (dup) return badRequest('Kode vendor sudah digunakan.');

    const vendor = await prisma.masterVendor.create({
      data: {
        code: body.code,
        name: body.name,
        serviceType: body.serviceType || null,
        contactPerson: body.contactPerson || null,
        phone: body.phone || null,
        email: body.email || null,
        address: body.address || null,
        status: body.status || 'Active',
      },
    });
    return ok(vendor, 201);
  } catch (error: any) {
    return serverError(error.message);
  }
}

export async function PUT(req: NextRequest) {
  const authError = await requirePermission(req, 'master_vendor', 'update');
  if (authError) return authError;

  try {
    const body = await req.json();
    if (!body.id) return badRequest('ID wajib diisi.');
    const errors = validate(body, true);
    if (errors.length) return badRequest(errors.join(' - '));

    const existing = await prisma.masterVendor.findUnique({ where: { id: toInt(body.id) } });
    if (!existing) return badRequest('Vendor tidak ditemukan.');

    const vendor = await prisma.masterVendor.update({
      where: { id: toInt(body.id) },
      data: {
        ...(body.code && body.code !== existing.code ? { code: body.code } : {}),
        name: body.name,
        serviceType: body.serviceType ?? null,
        contactPerson: body.contactPerson ?? null,
        phone: body.phone ?? null,
        email: body.email ?? null,
        address: body.address ?? null,
        ...(body.status ? { status: body.status } : {}),
      },
    });
    return ok(vendor);
  } catch (error: any) {
    return serverError(error.message);
  }
}

export async function DELETE(req: NextRequest) {
  const authError = await requirePermission(req, 'master_vendor', 'delete');
  if (authError) return authError;

  try {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return badRequest('ID wajib diisi.');
    await prisma.masterVendor.delete({ where: { id: toInt(id) } });
    return ok({ success: true });
  } catch (error: any) {
    return serverError(error.message);
  }
}