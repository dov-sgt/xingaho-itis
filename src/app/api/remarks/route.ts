import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, getAuthContext } from '@/lib/session';
import { ok, badRequest, serverError } from '@/lib/api';
import { toInt } from '@/lib/documents';

const db = prisma as unknown as Record<string, any>;

/**
 * Catatan follow-up nasabah (divisi Ops).
 * Remarks ikut terhapus bersama nasabah (cascade) agar tidak ada catatan yatim.
 */
export async function GET(req: NextRequest) {
  const authError = await requirePermission(req, 'transaction_stockout', 'read');
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('search') || '').trim();
    const nasabahId = searchParams.get('nasabahId');
    const page = Math.max(1, toInt(searchParams.get('page'), 1));
    const pageSize = Math.min(200, Math.max(1, toInt(searchParams.get('pageSize'), 10)));

    const where: any = {};
    if (nasabahId) where.nasabahId = toInt(nasabahId);
    if (search) {
      where.OR = ['remark', 'agenName', 'nasabah.nama', 'nasabah.nik'].map((f) => ({ [f]: { contains: search } }));
    }

    const [data, total] = await Promise.all([
      db.remark.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { nasabah: { select: { id: true, nik: true, nama: true } } },
      }),
      db.remark.count({ where }),
    ]);

    return ok({ data, pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } });
  } catch (error: any) {
    return serverError(error.message);
  }
}

export async function POST(req: NextRequest) {
  const authError = await requirePermission(req, 'transaction_stockout', 'create');
  if (authError) return authError;

  try {
    const auth = await getAuthContext(req);
    const body = await req.json();
    if (!body.nasabahId) return badRequest('Nasabah wajib dipilih.');
    if (!body.remark || String(body.remark).trim() === '') return badRequest('Isi remark wajib diisi.');

    const nasabah = await prisma.nasabah.findUnique({ where: { id: toInt(body.nasabahId) } });
    if (!nasabah) return badRequest('Nasabah tidak ditemukan.');

    const created = await prisma.remark.create({
      data: {
        nasabahId: nasabah.id,
        agenName: body.agenName || null,
        remark: String(body.remark).trim(),
        promiseToPay: !!body.promiseToPay,
        promiseDate: body.promiseDate ? new Date(body.promiseDate) : null,
        createdBy: auth?.name ?? null,
      },
      include: { nasabah: { select: { id: true, nik: true, nama: true } } },
    });

    return ok(created, 201);
  } catch (error: any) {
    return serverError(error.message);
  }
}

export async function PUT(req: NextRequest) {
  const authError = await requirePermission(req, 'transaction_stockout', 'update');
  if (authError) return authError;

  try {
    const body = await req.json();
    const id = toInt(body.id);
    if (!id) return badRequest('ID wajib diisi.');
    if (body.remark !== undefined && String(body.remark).trim() === '') return badRequest('Isi remark tidak boleh kosong.');

    const updated = await db.remark.update({
      where: { id },
      data: {
        ...(body.remark !== undefined ? { remark: String(body.remark).trim() } : {}),
        ...(body.agenName !== undefined ? { agenName: body.agenName || null } : {}),
        ...(body.promiseToPay !== undefined ? { promiseToPay: !!body.promiseToPay } : {}),
        ...(body.promiseDate !== undefined ? { promiseDate: body.promiseDate ? new Date(body.promiseDate) : null } : {}),
      },
      include: { nasabah: { select: { id: true, nik: true, nama: true } } },
    });

    return ok(updated);
  } catch (error: any) {
    return serverError(error.message);
  }
}

export async function DELETE(req: NextRequest) {
  const authError = await requirePermission(req, 'transaction_stockout', 'delete');
  if (authError) return authError;

  try {
    const id = toInt(new URL(req.url).searchParams.get('id'));
    if (!id) return badRequest('ID wajib diisi.');
    await prisma.remark.delete({ where: { id } });
    return ok({ success: true });
  } catch (error: any) {
    return serverError(error.message);
  }
}