import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/session';
import { ok, badRequest, notFound, serverError } from '@/lib/api';
import { toInt, toNumber, isNegative } from '@/lib/documents';
import { syncDeliveryOrdersForPr } from '@/lib/delivery-orders';

const VALID_STATUSES = ['Pending', 'Received', 'Partial'];

export async function GET(req: NextRequest) {
  const authError = await requirePermission(req, 'delivery_order', 'read');
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    const where: any = {};
    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return badRequest(`Status tidak valid. Valid: ${VALID_STATUSES.join(', ')}`);
      }
      where.status = status;
    }
    if (search) {
      where.OR = [
        { doNumber: { contains: search } },
        { prNumber: { contains: search } },
        { itemName: { contains: search } },
        { vendorName: { contains: search } },
        { recipient: { contains: search } },
      ];
    }

    const [dos, total] = await Promise.all([
      prisma.deliveryOrder.findMany({ where, orderBy: { id: 'desc' } }),
      prisma.deliveryOrder.count({ where }),
    ]);

    return ok({ data: dos, total });
  } catch (error: any) {
    return serverError(error.message);
  }
}

/**
 * POST - membuat Delivery Order.
 *
 * Dua jalur yang didukung:
 *  1. Dari PR yang sudah Approved (`prId`) - memakai helper yang sama dengan
 *     alur approve, jadi idempoten dan tidak pernah duplikat.
 *  2. Manual (tanpa `prId`) - tetap butuh izin `delivery_order:create`.
 */
export async function POST(req: NextRequest) {
  const authError = await requirePermission(req, 'delivery_order', 'create');
  if (authError) return authError;

  try {
    const body = await req.json();

    // Jalur 1: dari PR Approved
    if (body?.prId) {
      const pr = await prisma.purchaseRequest.findUnique({
        where: { id: toInt(body.prId) },
        include: { items: { orderBy: { sortOrder: 'asc' } } },
      });
      if (!pr) return notFound('Purchase Request tidak ditemukan');
      if (pr.status !== 'Approved' && pr.status !== 'Ordered' && pr.status !== 'Completed') {
        return badRequest(`Purchase Request harus berstatus Approved sebelum dibuat Delivery Order (saat ini: ${pr.status}).`);
      }
      const created = await syncDeliveryOrdersForPr(pr);
      const dos = await prisma.deliveryOrder.findMany({ where: { prId: pr.id }, orderBy: { id: 'asc' } });
      return ok({ created, data: dos }, 201);
    }

    // Jalur 2: manual
    const { vendorName, itemCode, itemName, qtyOrdered, recipient, note, price, date } = body;
    if (!itemName) return badRequest('Nama Item wajib diisi');
    if (!recipient) return badRequest('Penerima wajib diisi');
    if (toInt(qtyOrdered, 0) < 1) return badRequest('Qty minimal 1');
    if (isNegative(price)) return badRequest('Harga tidak boleh negatif');

    const count = await prisma.deliveryOrder.count();
    const doNumber = `DO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const created = await prisma.deliveryOrder.create({
      data: {
        doNumber,
        dedupeKey: `manual:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
        prId: null,
        prNumber: null,
        vendorName: vendorName || 'Internal',
        itemCode: itemCode || null,
        itemName,
        qtyOrdered: toInt(qtyOrdered, 1),
        qtyReceived: 0,
        price: toNumber(price, 0),
        totalValue: toNumber(price, 0) * toInt(qtyOrdered, 1),
        date: date ? new Date(date) : new Date(),
        recipient,
        status: 'Pending',
        note: note || 'Delivery Order manual',
      },
    });

    return ok(created, 201);
  } catch (error: any) {
    return serverError(error.message);
  }
}

/** PUT - hanya untuk penerimaan barang (Received / Partial). */
export async function PUT(req: NextRequest) {
  const authError = await requirePermission(req, 'delivery_order', 'update');
  if (authError) return authError;

  try {
    const body = await req.json();
    const { id, status, qtyReceived, note, recipient } = body;

    if (!id) return badRequest('ID is required');
    if (status && !VALID_STATUSES.includes(status)) {
      return badRequest(`Status tidak valid. Valid: ${VALID_STATUSES.join(', ')}`);
    }

    const doOrder = await prisma.deliveryOrder.findUnique({ where: { id: toInt(id) } });
    if (!doOrder) return notFound('Delivery order tidak ditemukan');

    const numQtyReceived = qtyReceived !== undefined ? toInt(qtyReceived, doOrder.qtyReceived) : doOrder.qtyReceived;

    if (numQtyReceived < 0) return badRequest('Qty received tidak boleh negatif');
    if (numQtyReceived > doOrder.qtyOrdered) {
      return badRequest(`Qty received tidak boleh lebih dari qty ordered (${doOrder.qtyOrdered})`);
    }

    let newStatus = status;
    if (!newStatus) {
      if (numQtyReceived === doOrder.qtyOrdered) newStatus = 'Received';
      else if (numQtyReceived > 0) newStatus = 'Partial';
      else newStatus = 'Pending';
    }

    // Atomic: status DO + penambahan stok + riwayat stok dalam satu transaksi.
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.deliveryOrder.update({
        where: { id: doOrder.id },
        data: {
          status: newStatus,
          qtyReceived: numQtyReceived,
          note: note || undefined,
          recipient: recipient || undefined,
          receivedAt: newStatus === 'Received' || newStatus === 'Partial' ? new Date() : undefined,
        },
      });

      if (newStatus === 'Received' && doOrder.itemCode) {
        const stock = await tx.inventoryStock.findUnique({ where: { itemCode: doOrder.itemCode } });
        // Buat baris stok bila item ini belum pernah masuk inventori.
        const target =
          stock ??
          (await tx.inventoryStock.create({
            data: {
              itemCode: doOrder.itemCode,
              itemName: doOrder.itemName,
              category: 'Others',
              currentStock: 0,
              inStock: 0,
              outStock: 0,
              note: 'Dibuat otomatis saat Delivery Order diterima',
            },
          }));

        await tx.inventoryStock.update({
          where: { id: target.id },
          data: {
            currentStock: target.currentStock + doOrder.qtyOrdered,
            inStock: target.inStock + doOrder.qtyOrdered,
            updatedAt: new Date(),
          },
        });
        await tx.inventoryHistory.create({
          data: {
            category: target.category,
            stock: target.currentStock + doOrder.qtyOrdered,
            inQty: doOrder.qtyOrdered,
            outQty: 0,
            note: `[DO Received] ${doOrder.doNumber} - ${doOrder.itemName}: ${doOrder.qtyOrdered} unit`,
            updateBy: recipient || 'Staff IT',
          },
        });
      }

      // Tandai PR selesai bila semua item-nya sudah diterima.
      if (doOrder.prId && newStatus === 'Received') {
        const siblings = await tx.deliveryOrder.findMany({ where: { prId: doOrder.prId } });
        if (siblings.every((d) => d.status === 'Received')) {
          await tx.purchaseRequest.update({
            where: { id: doOrder.prId },
            data: { status: 'Completed', updateAt: new Date() },
          });
        }
      }

      return result;
    });

    return ok(updated);
  } catch (error: any) {
    return serverError(error.message);
  }
}