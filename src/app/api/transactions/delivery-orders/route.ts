import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/session';
import { ok, badRequest, notFound, serverError, validationError } from '@/lib/api';
import { validateRequired, validateInt, validateString, collectErrors } from '@/lib/validation';
import { NextRequest } from 'next/server';

const VALID_STATUSES = ['Pending', 'Received', 'Partial'];

export async function GET(req: NextRequest) {
  const authError = requirePermission(req, 'delivery_order', 'read');
  if (authError) return authError;

  try {
    const dos = await prisma.deliveryOrder.findMany({
      orderBy: { id: 'desc' },
    });
    return ok(dos);
  } catch (error: any) {
    return serverError(error.message);
  }
}

// No POST - DOs are created from approved PRs only

// PUT - only for receiving (Received / Partial)
export async function PUT(req: NextRequest) {
  const authError = requirePermission(req, 'delivery_order', 'update');
  if (authError) return authError;

  try {
    const body = await req.json();
    const { id, status, qtyReceived, note, recipient } = body;

    if (!id) return badRequest('ID is required');

    if (status && !VALID_STATUSES.includes(status)) {
      return badRequest(`Status tidak valid. Valid: ${VALID_STATUSES.join(', ')}`);
    }

    const doOrder = await prisma.deliveryOrder.findUnique({ where: { id: Number(id) } });
    if (!doOrder) return notFound('Delivery order tidak ditemukan');

    const numQtyReceived = qtyReceived !== undefined ? parseInt(qtyReceived) : doOrder.qtyReceived;

    if (numQtyReceived > doOrder.qtyOrdered) {
      return badRequest(`Qty received tidak boleh lebih dari qty ordered (${doOrder.qtyOrdered})`);
    }

    // Determine status based on qty received
    let newStatus = status;
    if (!newStatus) {
      if (numQtyReceived === doOrder.qtyOrdered) {
        newStatus = 'Received';
      } else if (numQtyReceived > 0) {
        newStatus = 'Partial';
      } else {
        newStatus = 'Pending';
      }
    }

    const updated = await prisma.deliveryOrder.update({
      where: { id: Number(id) },
      data: {
        status: newStatus,
        qtyReceived: numQtyReceived,
        note: note || undefined,
        recipient: recipient || undefined,
        receivedAt: newStatus === 'Received' || newStatus === 'Partial' ? new Date() : undefined,
      },
    });

    // If fully received, add to inventory stock
    if (newStatus === 'Received' && doOrder.itemCode) {
      const stock = await prisma.inventoryStock.findUnique({ where: { itemCode: doOrder.itemCode } });
      if (stock) {
        await prisma.inventoryStock.update({
          where: { id: stock.id },
          data: {
            currentStock: stock.currentStock + numQtyReceived,
            inStock: stock.inStock + numQtyReceived,
            updatedAt: new Date(),
          },
        });

        await prisma.inventoryHistory.create({
          data: {
            category: stock.category,
            stock: stock.currentStock + numQtyReceived,
            inQty: numQtyReceived,
            outQty: 0,
            note: `[DO Received] ${doOrder.itemName}: ${numQtyReceived} unit`,
            updateBy: recipient || 'Staff IT',
          },
        });
      }
    }

    return ok(updated);
  } catch (error: any) {
    return serverError(error.message);
  }
}
