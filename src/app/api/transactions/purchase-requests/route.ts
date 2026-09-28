import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/session';
import { ok, badRequest, notFound, serverError, validationError } from '@/lib/api';
import { validateRequired, validateString, validateNumber, collectErrors } from '@/lib/validation';
import { NextRequest } from 'next/server';

const VALID_STATUSES = ['Pending', 'Approved', 'Ordered', 'Completed', 'Rejected'];

export async function GET(req: NextRequest) {
  const authError = requirePermission(req, 'purchase_request', 'read');
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const dateFrom = searchParams.get('date_from') || '';
    const dateTo = searchParams.get('date_to') || '';

    const where: any = {};
    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return badRequest(`Status tidak valid. Valid: ${VALID_STATUSES.join(', ')}`);
      }
      where.status = status;
    }
    if (search) {
      where.OR = [
        { prNumber: { contains: search } },
        { itemName: { contains: search } },
        { note: { contains: search } },
        { itemCode: { contains: search } },
      ];
    }
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }

    const prs = await prisma.purchaseRequest.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    const summary = await prisma.purchaseRequest.aggregate({
      _sum: { totalPrice: true },
      _count: { id: true },
    });

    return ok({
      data: prs,
      totalCount: summary._count.id,
      totalSpending: summary._sum.totalPrice || 0,
    });
  } catch (error: any) {
    return serverError(error.message);
  }
}

export async function POST(req: NextRequest) {
  const authError = requirePermission(req, 'purchase_request', 'create');
  if (authError) return authError;

  try {
    const body = await req.json();
    const { typeItem, itemCode, itemName, note, qty, biaya, diskon, totalPrice, details, updateBy, createdBy } = body;

    const errors = collectErrors([
      validateRequired(itemName, 'Nama Item'),
      validateString(itemName, 'Nama Item', 1, 255),
      validateNumber(biaya, 'Biaya', 0),
      validateNumber(diskon, 'Diskon', 0),
    ]);

    if (errors.length > 0) return validationError(errors);

    const count = await prisma.purchaseRequest.count();
    const prNumber = `PR-2026-${(count + 1).toString().padStart(4, '0')}`;

    const pr = await prisma.purchaseRequest.create({
      data: {
        prNumber,
        date: new Date(),
        typeItem: typeItem || 'Computer',
        itemCode: itemCode || null,
        itemName,
        biaya: parseFloat(biaya) || 0,
        qty: parseInt(qty) || 1,
        diskon: parseFloat(diskon) || 0,
        totalPrice: parseFloat(totalPrice) || 0,
        note: note || `Pengadaan IT: ${itemName}`,
        details: details || '-',
        status: 'Pending',
        createdBy: createdBy || 'SuperAdmin IT',
      },
    });

    return ok(pr, 201);
  } catch (error: any) {
    return serverError(error.message);
  }
}

export async function PUT(req: NextRequest) {
  const authError = requirePermission(req, 'purchase_request', 'update');
  if (authError) return authError;

  try {
    const body = await req.json();
    const { id, status, note, updateBy } = body;

    if (!id) return badRequest('ID is required');

    if (status && !VALID_STATUSES.includes(status)) {
      return badRequest(`Status tidak valid. Valid: ${VALID_STATUSES.join(', ')}`);
    }

    const updated = await prisma.purchaseRequest.update({
      where: { id: Number(id) },
      data: {
        status,
        note: note || undefined,
        updateAt: new Date(),
        updateBy: updateBy || 'SPV/SuperAdmin',
      },
    });

    return ok(updated);
  } catch (error: any) {
    return serverError(error.message);
  }
}
