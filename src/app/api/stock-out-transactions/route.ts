import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, badRequest, serverError } from '@/lib/api';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const transactions = await prisma.stockOutTransaction.findMany({ orderBy: { id: 'desc' } });
    return ok(transactions);
  } catch (error: any) { return serverError(error.message); }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { date, category, itemCode, itemName, outQty, note, requestedBy } = body;
    if (!itemName || !outQty) return badRequest('Item Name dan Out Qty wajib diisi');
    const transaction = await prisma.stockOutTransaction.create({
      data: { date: date ? new Date(date) : new Date(), category, itemCode: itemCode || null, itemName, outQty: parseInt(outQty) || 1, note: note || null, requestedBy: requestedBy || 'Staff IT' },
    });
    return ok(transaction, 201);
  } catch (error: any) { return serverError(error.message); }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, approvedBy } = body;
    if (!id) return badRequest('ID is required');
    const updated = await prisma.stockOutTransaction.update({ where: { id: Number(id) }, data: { status, approvedBy } });
    return ok(updated);
  } catch (error: any) { return serverError(error.message); }
}
