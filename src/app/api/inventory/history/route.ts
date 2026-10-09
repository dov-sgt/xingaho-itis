import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/session';
import { ok, serverError } from '@/lib/api';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const authError = await requirePermission(req, 'inventory_type_item', 'read');
  if (authError) return authError;

  try {
    const history = await prisma.inventoryHistory.findMany({
      orderBy: { id: 'desc' },
      take: 200,
    });
    return ok(history);
  } catch (error: any) {
    return serverError(error.message);
  }
}
