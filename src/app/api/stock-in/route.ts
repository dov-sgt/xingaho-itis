import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/session';
import { ok, badRequest, notFound, serverError, validationError } from '@/lib/api';
import { validateRequired, validateString, validateInt, collectErrors } from '@/lib/validation';
import { NextRequest } from 'next/server';

// GET - list all stock in records
export async function GET(req: NextRequest) {
  const authError = requirePermission(req, 'inventory_type_item', 'read');
  if (authError) return authError;
  try {
    const history = await prisma.inventoryHistory.findMany({
      where: { inQty: { gt: 0 } },
      orderBy: { id: 'desc' },
      take: 100,
    });
    return ok(history);
  } catch (error: any) { return serverError(error.message); }
}

// POST - create stock in (adds to inventory)
export async function POST(req: NextRequest) {
  const authError = requirePermission(req, 'inventory_type_item', 'update');
  if (authError) return authError;
  try {
    const body = await req.json();
    const { stockId, qty, note, user } = body;

    const errors = collectErrors([
      validateRequired(stockId, 'Stock ID'),
      validateInt(qty, 'Quantity', 1),
    ]);
    if (errors.length > 0) return validationError(errors);

    const numQty = parseInt(qty, 10);
    const current = await prisma.inventoryStock.findUnique({ where: { id: Number(stockId) } });
    if (!current) return notFound('Item stok tidak ditemukan');

    // Update stock
    const updated = await prisma.inventoryStock.update({
      where: { id: Number(stockId) },
      data: {
        currentStock: current.currentStock + numQty,
        inStock: current.inStock + numQty,
        note: note || current.note,
        updatedAt: new Date(),
      },
    });

    // Record history
    await prisma.inventoryHistory.create({
      data: {
        category: current.category,
        stock: current.currentStock + numQty,
        inQty: numQty,
        outQty: 0,
        note: `[IN] ${current.itemName}: ${note || '-'}`,
        updateBy: user || 'Staff IT',
      },
    });

    return ok(updated, 201);
  } catch (error: any) { return serverError(error.message); }
}
