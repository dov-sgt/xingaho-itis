import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/session';
import { ok, badRequest, serverError } from '@/lib/api';
import { NextRequest } from 'next/server';

const VALID_TYPES = ['headset', 'pr', 'stocks', 'laptops'];

export async function GET(req: NextRequest) {
  const authError = requirePermission(req, 'reporting', 'read');
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'headset';
    const itemName = searchParams.get('item_name') || '';
    const dateFrom = searchParams.get('date_from') || '';
    const dateTo = searchParams.get('date_to') || '';

    if (!VALID_TYPES.includes(type)) {
      return badRequest(`Report type tidak valid. Valid: ${VALID_TYPES.join(', ')}`);
    }

    if (type === 'headset') {
      const where: any = {};
      if (itemName) {
        where.OR = [
          { name: { contains: itemName } },
          { nik: { contains: itemName } },
          { vendor: { contains: itemName } },
          { project: { contains: itemName } },
        ];
      }
      if (dateFrom || dateTo) {
        where.date = {};
        if (dateFrom) where.date.gte = new Date(dateFrom);
        if (dateTo) where.date.lte = new Date(dateTo);
      }
      const data = await prisma.transactionItem.findMany({
        where,
        take: 1000,
        orderBy: { id: 'desc' },
      });
      return ok(data);
    }

    if (type === 'pr') {
      const where: any = {};
      if (itemName) {
        where.OR = [
          { itemName: { contains: itemName } },
          { itemCode: { contains: itemName } },
          { prNumber: { contains: itemName } },
        ];
      }
      if (dateFrom || dateTo) {
        where.date = {};
        if (dateFrom) where.date.gte = new Date(dateFrom);
        if (dateTo) where.date.lte = new Date(dateTo);
      }
      const data = await prisma.purchaseRequest.findMany({
        where,
        orderBy: { date: 'desc' },
      });
      return ok(data);
    }

    if (type === 'stocks') {
      const where: any = {};
      if (itemName) {
        where.OR = [
          { itemName: { contains: itemName } },
          { itemCode: { contains: itemName } },
        ];
      }
      const data = await prisma.inventoryStock.findMany({
        where,
        orderBy: { id: 'asc' },
      });
      return ok(data);
    }

    if (type === 'laptops') {
      const where: any = {};
      if (itemName) {
        where.OR = [
          { item: { contains: itemName } },
          { user: { contains: itemName } },
        ];
      }
      const data = await prisma.laptopAsset.findMany({
        where,
        orderBy: { id: 'asc' },
      });
      return ok(data);
    }

    return badRequest('Report type unknown');
  } catch (error: any) {
    return serverError(error.message);
  }
}
