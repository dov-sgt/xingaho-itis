import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, getAuthContext } from '@/lib/session';
import { ok, badRequest, serverError, validationError } from '@/lib/api';
import { collectErrors, validateRequired } from '@/lib/validation';
import { computePrTotals, nextNumber, toInt, toNumber, isNegative, PrLineInput } from '@/lib/documents';
import { syncDeliveryOrdersForPr } from '@/lib/delivery-orders';

const VALID_STATUSES = ['Pending', 'Approved', 'Rejected', 'Ordered', 'Completed'];

const VALID_TRANSITIONS: Record<string, string[]> = {
  Pending: ['Approved', 'Rejected'],
  Approved: ['Ordered', 'Completed', 'Rejected'],
  Rejected: ['Pending'],
  Ordered: ['Completed'],
  Completed: [],
};

export async function GET(req: NextRequest) {
  const authError = await requirePermission(req, 'purchase_request', 'read');
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const dateFrom = searchParams.get('date_from') || '';
    const dateTo = searchParams.get('date_to') || '';
    const page = Math.max(1, toInt(searchParams.get('page'), 1));
    const pageSize = Math.min(200, Math.max(1, toInt(searchParams.get('pageSize'), 25)));

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
        { requesterName: { contains: search } },
      ];
    }
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }

    const [prs, total, summary] = await Promise.all([
      prisma.purchaseRequest.findMany({
        where,
        orderBy: { id: 'desc' },
        include: { items: { orderBy: { sortOrder: 'asc' } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.purchaseRequest.count({ where }),
      prisma.purchaseRequest.aggregate({ _sum: { grandTotal: true, totalPrice: true }, _count: { id: true } }),
    ]);

    return ok({
      data: prs,
      pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
      summary: {
        totalCount: summary._count.id,
        totalSpending: summary._sum.grandTotal ?? summary._sum.totalPrice ?? 0,
      },
    });
  } catch (error: any) {
    return serverError(error.message);
  }
}

export async function POST(req: NextRequest) {
  const authError = await requirePermission(req, 'purchase_request', 'create');
  if (authError) return authError;

  try {
    const auth = await getAuthContext(req);
    const body = await req.json();

    const {
      typeItem,
      itemCode,
      itemName,
      note,
      details,
      qty,
      biaya,
      diskon,
      shipmentCost,
      createdBy,
      requesterName,
      items: rawItems,
    } = body;

    // Baris item: gunakan `items` bila dikirim, jika tidak fall back ke field legacy.
    const rawLines: PrLineInput[] = Array.isArray(rawItems) && rawItems.length
      ? rawItems
      : [{ itemCode, itemName, qty: toInt(qty, 1), price: toNumber(biaya, 0), note: null }];

    const errors = collectErrors([
      ...rawLines.map((l, i) => validateRequired(l.itemName, `Nama Item baris ${i + 1}`)),
      validateRequired(typeItem, 'Kategori'),
    ]);

    if (rawLines.some((l) => toNumber(l.price, -1) < 0)) {
      errors.push('Harga tidak boleh negatif');
    }
    if (rawLines.some((l) => toInt(l.qty, 0) < 1)) {
      errors.push('Qty minimal 1');
    }
    if (isNegative(shipmentCost)) errors.push('Shipment Cost tidak boleh negatif');
    if (isNegative(diskon)) errors.push('Discount tidak boleh negatif');

    if (errors.length > 0) return validationError(errors);

    const totals = computePrTotals(rawLines, toNumber(shipmentCost, 0), toNumber(diskon, 0));
    const first = totals.lines[0];

    const prNumber = await nextNumber('purchaseRequest', 'PR', 4);

    const pr = await prisma.purchaseRequest.create({
      data: {
        prNumber,
        date: new Date(),
        typeItem: typeItem || 'Computer',
        itemCode: first.itemCode ?? itemCode ?? null,
        itemName: totals.lines.map((l) => l.itemName).join(', '),
        biaya: totals.lines[0]?.price ?? 0,
        qty: totals.lines.reduce((s, l) => s + l.qty, 0),
        diskon: totals.diskon,
        shipmentCost: totals.shipmentCost,
        totalPrice: totals.totalPrice,
        grandTotal: totals.grandTotal,
        note: note || null,
        details: details || '-',
        status: 'Pending',
        requesterName: requesterName || auth?.name || null,
        createdBy: createdBy || auth?.name || null,
        items: {
          create: totals.lines.map((l, i) => ({
            itemCode: l.itemCode ?? null,
            itemName: l.itemName,
            qty: l.qty,
            price: l.price,
            totalPrice: l.totalPrice,
            note: l.note ?? null,
            sortOrder: i,
          })),
        },
      },
      include: { items: true },
    });

    return ok(pr, 201);
  } catch (error: any) {
    return serverError(error.message);
  }
}

export async function PUT(req: NextRequest) {
  const authError = await requirePermission(req, 'purchase_request', 'update');
  if (authError) return authError;

  try {
    const auth = await getAuthContext(req);
    const body = await req.json();
    const { id, status, note, updateBy, details, requesterName } = body;

    if (!id) return badRequest('ID is required');

    const current = await prisma.purchaseRequest.findUnique({
      where: { id: toInt(id) },
      include: { items: true },
    });
    if (!current) return badRequest('Purchase Request tidak ditemukan');

    if (status && !VALID_STATUSES.includes(status)) {
      return badRequest(`Status tidak valid. Valid: ${VALID_STATUSES.join(', ')}`);
    }
    if (status && status !== current.status && !(VALID_TRANSITIONS[current.status] || []).includes(status)) {
      return badRequest(
        `Status tidak dapat diubah dari "${current.status}" menjadi "${status}". Transisi yang diizinkan: ${
          (VALID_TRANSITIONS[current.status] || []).join(', ') || '(tidak ada)'
        }.`,
      );
    }

    const updated = await prisma.purchaseRequest.update({
      where: { id: toInt(id) },
      data: {
        ...(status ? { status } : {}),
        ...(note !== undefined ? { note } : {}),
        ...(details !== undefined ? { details } : {}),
        ...(requesterName !== undefined ? { requesterName } : {}),
        ...(status === 'Approved'
          ? { approvedBy: auth?.name ?? updateBy ?? 'System', approvedAt: new Date() }
          : {}),
        updateAt: new Date(),
        updateBy: updateBy || auth?.name || 'System',
      },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });

    // Item 6: PR Approved -> otomatis muncul di Delivery Order.
    let deliveryOrders: string[] = [];
    if (status === 'Approved') {
      deliveryOrders = await syncDeliveryOrdersForPr(updated);
    }

    return ok({ ...updated, deliveryOrders });
  } catch (error: any) {
    return serverError(error.message);
  }
}

export async function DELETE(req: NextRequest) {
  const authError = await requirePermission(req, 'purchase_request', 'delete');
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return badRequest('ID is required');

    const prId = toInt(id);
    // Delivery Order yang sudah dibuat tidak ikut terhapus (onDelete: SetNull)
    // agar riwayat pengiriman tidak hilang.
    await prisma.purchaseRequest.delete({ where: { id: prId } });
    return ok({ success: true });
  } catch (error: any) {
    return serverError(error.message);
  }
}