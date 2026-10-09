import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, getAuthContext } from '@/lib/session';
import { ok, badRequest, notFound, serverError, validationError } from '@/lib/api';
import { validateRequired, validateInt, collectErrors } from '@/lib/validation';
import { toInt } from '@/lib/documents';

/**
 * Stock In - penerimaan barang yang menambah ready stock.
 * Per movements: update stok + catat histori dilakukan dalam SATU transaksi
 * database agar tidak ada keadaan setengah jalan.
 */
export async function GET(req: NextRequest) {
  const authError = await requirePermission(req, 'inventory_type_item', 'read');
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('search') || '').trim();
    const page = Math.max(1, toInt(searchParams.get('page'), 1));
    const pageSize = Math.min(200, Math.max(1, toInt(searchParams.get('pageSize'), 10)));

    const where: any = { inQty: { gt: 0 } };
    if (search) where.note = { contains: search };

    const [history, total] = await Promise.all([
      prisma.inventoryHistory.findMany({ where, orderBy: { id: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.inventoryHistory.count({ where }),
    ]);

    return ok({ data: history, pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } });
  } catch (error: any) {
    return serverError(error.message);
  }
}

export async function POST(req: NextRequest) {
  const authError = await requirePermission(req, 'inventory_type_item', 'update');
  if (authError) return authError;

  try {
    const auth = await getAuthContext(req);
    const body = await req.json();
    const { stockId, qty, note } = body;

    const errors = collectErrors([validateRequired(stockId, 'Barang'), validateInt(qty, 'Qty', 1)]);
    if (errors.length > 0) return validationError(errors);

    const numQty = parseInt(String(qty), 10);
    const current = await prisma.inventoryStock.findUnique({ where: { id: toInt(stockId) } });
    if (!current) return notFound('Barang tidak ditemukan');

    const updated = await prisma.$transaction(async (tx) => {
      const stock = await tx.inventoryStock.update({
        where: { id: current.id },
        data: {
          currentStock: current.currentStock + numQty,
          inStock: current.inStock + numQty,
          note: note || current.note,
          updatedAt: new Date(),
        },
      });
      await tx.inventoryHistory.create({
        data: {
          category: current.category,
          stock: stock.currentStock,
          inQty: numQty,
          outQty: 0,
          note: `[Stock In] ${current.itemName}: ${note || '-'}`,
          updateBy: auth?.name ?? 'Staff IT',
        },
      });
      return stock;
    });

    return ok(updated, 201);
  } catch (error: any) {
    return serverError(error.message);
  }
}