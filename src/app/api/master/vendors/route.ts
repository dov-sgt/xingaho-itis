import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/session';
import { ok, badRequest, notFound, serverError, validationError } from '@/lib/api';
import { validateRequired, validateString, validateEmail, collectErrors } from '@/lib/validation';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';

    const where: any = {};
    if (search) {
      where.OR = [
        { code: { contains: search } },
        { name: { contains: search } },
        { contactPerson: { contains: search } },
        { serviceType: { contains: search } },
      ];
    }

    const vendors = await prisma.masterVendor.findMany({
      where,
      orderBy: { id: 'asc' },
    });

    return ok(vendors);
  } catch (error: any) {
    return serverError(error.message);
  }
}

export async function POST(req: NextRequest) {
  const authError = requirePermission(req, 'master_vendor', 'create');
  if (authError) return authError;

  try {
    const body = await req.json();
    const { code, name, serviceType, contactPerson, phone, email, address, status } = body;

    const errors = collectErrors([
      validateRequired(code, 'Kode Vendor'),
      validateString(code, 'Kode Vendor', 1, 50),
      validateRequired(name, 'Nama Vendor'),
      validateString(name, 'Nama Vendor', 1, 255),
      validateEmail(email, 'Email'),
    ]);

    if (errors.length > 0) return validationError(errors);

    const vendor = await prisma.masterVendor.create({
      data: {
        code,
        name,
        serviceType,
        contactPerson,
        phone,
        email,
        address,
        status: status || 'Active',
      },
    });

    return ok(vendor, 201);
  } catch (error: any) {
    return serverError(error.message);
  }
}

export async function PUT(req: NextRequest) {
  const authError = requirePermission(req, 'master_vendor', 'update');
  if (authError) return authError;

  try {
    const body = await req.json();
    const { id, code, name, serviceType, contactPerson, phone, email, address, status } = body;

    const errors = collectErrors([
      validateRequired(id, 'ID'),
      validateRequired(code, 'Kode Vendor'),
      validateRequired(name, 'Nama Vendor'),
      validateEmail(email, 'Email'),
    ]);

    if (errors.length > 0) return validationError(errors);

    const vendor = await prisma.masterVendor.update({
      where: { id: Number(id) },
      data: {
        code,
        name,
        serviceType,
        contactPerson,
        phone,
        email,
        address,
        status,
      },
    });

    return ok(vendor);
  } catch (error: any) {
    return serverError(error.message);
  }
}

export async function DELETE(req: NextRequest) {
  const authError = requirePermission(req, 'master_vendor', 'delete');
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return badRequest('ID is required');

    await prisma.masterVendor.delete({
      where: { id: Number(id) },
    });

    return ok({ success: true });
  } catch (error: any) {
    return serverError(error.message);
  }
}
