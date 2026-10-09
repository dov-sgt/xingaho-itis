import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/session';
import { ok, badRequest, notFound, serverError, validationError } from '@/lib/api';
import { validateRequired, validateInt, validateString, collectErrors } from '@/lib/validation';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const authError = await requirePermission(req, 'inventory_type_item', 'read');
  if (authError) return authError;

  try {
    const stocks = await prisma.inventoryStock.findMany({
      orderBy: { updatedAt: 'desc' },
    });
    const laptops = await prisma.laptopAsset.findMany({
      orderBy: { id: 'asc' },
    });
    const brokenAssets = await prisma.brokenAsset.findMany({
      orderBy: { id: 'asc' },
    });

    return ok({ stocks, laptops, brokenAssets });
  } catch (error: any) {
    return serverError(error.message);
  }
}

export async function POST(req: NextRequest) {
  const authError = await requirePermission(req, 'inventory_type_item', 'update');
  if (authError) return authError;

  try {
    const body = await req.json();
    const { action } = body;

    // 1. Add Junk / Broken Asset
    if (action === 'add_junk') {
      const { itemType, qty, brokenCount, note } = body;

      const errors = collectErrors([
        validateRequired(itemType, 'Tipe Item'),
        validateString(itemType, 'Tipe Item', 1, 100),
        validateInt(qty, 'Quantity', 0),
        validateInt(brokenCount, 'Broken Count', 0),
      ]);

      if (errors.length > 0) return validationError(errors);

      const junk = await prisma.brokenAsset.create({
        data: {
          itemType,
          qty: parseInt(qty, 10),
          brokenCount: parseInt(brokenCount, 10),
          note,
        },
      });

      return ok(junk, 201);
    }

    // 2. Stock IN (only from Delivery Order that is Received)
    if (action === 'stock_in') {
      const { stockId, qty, note, user } = body;

      const errors = collectErrors([
        validateRequired(stockId, 'Stock ID'),
        validateInt(qty, 'Quantity', 1),
      ]);

      if (errors.length > 0) return validationError(errors);

      const numQty = parseInt(qty, 10);
      const current = await prisma.inventoryStock.findUnique({ where: { id: Number(stockId) } });
      if (!current) {
        return notFound('Item stok tidak ditemukan');
      }

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

      return ok(updated);
    }

    // 3. Stock Out (from Headset User / Transaction Item)
    if (action === 'stock_out') {
      const { stockId, qty, note, user } = body;

      const errors = collectErrors([
        validateRequired(stockId, 'Stock ID'),
        validateInt(qty, 'Quantity', 1),
      ]);

      if (errors.length > 0) return validationError(errors);

      const numQty = parseInt(qty, 10);
      const current = await prisma.inventoryStock.findUnique({ where: { id: Number(stockId) } });
      if (!current) {
        return notFound('Item stok tidak ditemukan');
      }

      if (current.currentStock < numQty) {
        return badRequest(`Stok tidak mencukupi (Tersisa: ${current.currentStock})`);
      }

      const updated = await prisma.inventoryStock.update({
        where: { id: Number(stockId) },
        data: {
          currentStock: current.currentStock - numQty,
          outStock: current.outStock + numQty,
          note: note || current.note,
          updatedAt: new Date(),
        },
      });

      // Record history
      await prisma.inventoryHistory.create({
        data: {
          category: current.category,
          stock: current.currentStock - numQty,
          inQty: 0,
          outQty: numQty,
          note: `[OUT] ${current.itemName}: ${note || '-'}`,
          updateBy: user || 'Staff IT',
        },
      });

      return ok(updated);
    }

    // 4. Laptop Add / Update
    if (action === 'laptop_save') {
      const { id, item, user, status } = body;

      const errors = collectErrors([
        validateRequired(item, 'Item Laptop'),
        validateString(item, 'Item Laptop', 1, 255),
      ]);

      if (errors.length > 0) return validationError(errors);

      if (id) {
        const updated = await prisma.laptopAsset.update({
          where: { id: Number(id) },
          data: { item, user, status },
        });
        return ok(updated);
      } else {
        const created = await prisma.laptopAsset.create({
          data: {
            item,
            user: user || 'Empty',
            status: status || 'Good',
          },
        });
        return ok(created, 201);
      }
    }

    // 5. Broken Asset Update
    if (action === 'broken_update') {
      const { id, qty, brokenCount, note } = body;

      const errors = collectErrors([
        validateRequired(id, 'ID'),
        validateInt(qty, 'Quantity', 0),
        validateInt(brokenCount, 'Broken Count', 0),
      ]);

      if (errors.length > 0) return validationError(errors);

      const updated = await prisma.brokenAsset.update({
        where: { id: Number(id) },
        data: {
          qty: parseInt(qty, 10),
          brokenCount: parseInt(brokenCount, 10),
          note,
        },
      });
      return ok(updated);
    }

    return badRequest('Action invalid');
  } catch (error: any) {
    return serverError(error.message);
  }
}
