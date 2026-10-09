import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, getAuthContext } from '@/lib/session';
import { ok, badRequest, serverError } from '@/lib/api';
import { toInt } from '@/lib/documents';

/**
 * Daftar item Headset berstatus Damage setelah pengembalian (item 11).
 * Damage tidak menambah stok inventori - hanya tercatat di sini.
 */
export async function GET(req: NextRequest) {
  const authError = await requirePermission(req, 'transaction_headset', 'read');
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const page = Math.max(1, toInt(searchParams.get('page'), 1));
    const pageSize = Math.min(200, Math.max(1, toInt(searchParams.get('pageSize'), 25)));

    const where: any = {};
    if (search) {
      where.OR = [
        { itemName: { contains: search } },
        { itemCode: { contains: search } },
        { nik: { contains: search } },
        { employeeName: { contains: search } },
      ];
    }

    const [data, total, sumQty] = await Promise.all([
      prisma.damagedItem.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.damagedItem.count({ where }),
      prisma.damagedItem.aggregate({ where, _sum: { qty: true } }),
    ]);

    return ok({
      data,
      pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
      totalDamaged: sumQty._sum.qty ?? 0,
    });
  } catch (error: any) {
    return serverError(error.message);
  }
}

export async function POST(req: NextRequest) {
  const authError = await requirePermission(req, 'transaction_headset', 'create');
  if (authError) return authError;

  try {
    const auth = await getAuthContext(req);
    const body = await req.json();
    const { itemCode, itemName, qty, nik, employeeName, vendor, note } = body;

    if (!itemName) return badRequest('Nama item wajib diisi');
    if (toInt(qty, 0) < 1) return badRequest('Qty minimal 1');

    const created = await prisma.damagedItem.create({
      data: {
        itemCode: itemCode || null,
        itemName,
        qty: toInt(qty, 1),
        nik: nik || null,
        employeeName: employeeName || null,
        vendor: vendor || null,
        condition: 'Damage',
        note: note || 'Pencatatan damage manual',
        createdBy: auth?.name ?? 'Staff IT',
      },
    });

    return ok(created, 201);
  } catch (error: any) {
    return serverError(error.message);
  }
}