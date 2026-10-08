import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, badRequest, serverError } from '@/lib/api';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const agenName = searchParams.get('agenName') || '';
    const dateFrom = searchParams.get('date_from') || '';
    const dateTo = searchParams.get('date_to') || '';
    const where: any = {};
    if (agenName) where.agenName = { contains: agenName };
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }
    const achievements = await prisma.paymentAchievement.findMany({ where, orderBy: { id: 'desc' } });
    return ok(achievements);
  } catch (error: any) { return serverError(error.message); }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agenName, date, amount } = body;
    if (!agenName || !amount) return badRequest('Nama agen dan jumlah wajib diisi');
    const achievement = await prisma.paymentAchievement.create({
      data: { agenName, date: date ? new Date(date) : new Date(), amount: parseFloat(amount) || 0 },
    });
    return ok(achievement, 201);
  } catch (error: any) { return serverError(error.message); }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status } = body;
    if (!id) return badRequest('ID is required');
    const updated = await prisma.paymentAchievement.update({ where: { id: Number(id) }, data: { status } });
    return ok(updated);
  } catch (error: any) { return serverError(error.message); }
}
