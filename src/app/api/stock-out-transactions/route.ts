import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/session';
import { ok, badRequest, notFound, serverError, validationError } from '@/lib/api';
import { validateRequired, validateString, validateInt, collectErrors } from '@/lib/validation';
import { NextRequest } from 'next/server';

const VALID_STATUSES = ['Pending', 'Approved', 'Rejected'];

// GET - list all stock out transactions
export async function GET(req: NextRequest) {
  const authError = requirePermission(req, 'transaction_item', 'read');
  if (authError) return authError;

  try {
    const transactions = await prisma.stockOutTransaction.findMany({
      orderBy: { id: 'desc' },
    });
    return ok(transactions);
  } catch (error: any) {
    return serverError(error.message);
  }
}

// POST - create new stock out request (Staff can create)
export async function POST(req: NextRequest) {
  const authError = requirePermission(req, 'transaction_item', 'create');
  if (authError) return authError;

  try {
    const body = await req.json();
    const { date, category, itemCode, itemName, outQty, note, requestedBy } = body;

    const errors = collectErrors([
      validateRequired(date, 'Tanggal'),
      validateRequired(category, 'Kategori'),
      validateString(category, 'Kategori', 1, 100),
      validateRequired(itemName, 'Nama Item'),
      validateString(itemName, 'Nama Item', 1, 255),
      validateInt(outQty, 'Out Qty', 1),
    ]);

    if (errors.length > 0) return validationError(errors);

    const transaction = await prisma.stockOutTransaction.create({
      data: {
        date: new Date(date),
        category,
        itemCode: itemCode || null,
        itemName,
        outQty: parseInt(outQty, 10),
        note: note || '-',
        status: 'Pending',
        requestedBy: requestedBy || 'Staff IT',
      },
    });

    return ok(transaction, 201);
  } catch (error: any) {
    return serverError(error.message);
  }
}

// PUT - approve/reject (only SPV/SuperAdmin)
export async function PUT(req: NextRequest) {
  const authError = requirePermission(req, 'transaction_item', 'update');
  if (authError) return authError;

  try {
    const body = await req.json();
    const { id, status, approvedBy } = body;

    if (!id) return badRequest('ID is required');

    if (status && !VALID_STATUSES.includes(status)) {
      return badRequest(`Status tidak valid. Valid: ${VALID_STATUSES.join(', ')}`);
    }

    const transaction = await prisma.stockOutTransaction.findUnique({ where: { id: Number(id) } });
    if (!transaction) return notFound('Transaksi tidak ditemukan');

    const updated = await prisma.stockOutTransaction.update({
      where: { id: Number(id) },
      data: {
        status: status || undefined,
        approvedBy: approvedBy || undefined,
      },
    });

    // If approved, directly reduce stock
    if (status === 'Approved') {
      const stock = await prisma.inventoryStock.findFirst({
        where: { itemName: transaction.itemName },
      });

      if (stock) {
        if (stock.currentStock < transaction.outQty) {
          return badRequest(`Stok tidak mencukupi (Tersisa: ${stock.currentStock})`);
        }

        await prisma.inventoryStock.update({
          where: { id: stock.id },
          data: {
            currentStock: stock.currentStock - transaction.outQty,
            outStock: stock.outStock + transaction.outQty,
            updatedAt: new Date(),
          },
        });

        await prisma.inventoryHistory.create({
          data: {
            category: transaction.category,
            stock: stock.currentStock - transaction.outQty,
            inQty: 0,
            outQty: transaction.outQty,
            note: `[Stock Out] ${transaction.itemName}: ${transaction.note}`,
            updateBy: approvedBy || 'SPV/SuperAdmin',
          },
        });
      }
    }

    return ok(updated);
  } catch (error: any) {
    return serverError(error.message);
  }
}
