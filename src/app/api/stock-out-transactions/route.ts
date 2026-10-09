import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, getAuthContext } from '@/lib/session';
import { ok, badRequest, serverError } from '@/lib/api';
import { toInt } from '@/lib/documents';
import { collectErrors, validateRequired, validateString } from '@/lib/validation';

/**
 * Stock Out bertingkat (item 7).
 *
 * Alur form: pilih KATEGORI dulu, lalu ITEM yang hanya dari kategori tersebut.
 *
 * Validasi server:
 *   - kategori & item wajib dipilih
 *   - item harus benar-benar milik kategori yang dipilih
 *   - qty keluar tidak boleh melebihi stok Ready
 *
 * Stok Ready dikurangi saat pengajuan disetujui (status Approved), sehingga
 * pengajuan Pending tidak memblokir stok dan yang ditolak tidak pernah
 * mengurangi stok.
 */
const STATUS = ['Pending', 'Approved', 'Rejected'];

function validate(body: any, isUpdate = false): string[] {
  const e: string[] = [];
  e.push(
    ...collectErrors([
      validateRequired(body.category, 'Kategori'),
      validateString(body.category, 'Kategori', 1, 60),
      validateRequired(body.itemCode, 'Item'),
    ]),
  );
  // Saat membuat, nama barang diambil dari baris stok berdasarkan kode item -
  // client tidak perlu mengirimnya. Saat mengedit, nama tetap wajib agar data
  // tidak pernah kosong.
  if (isUpdate) e.push(...collectErrors([validateRequired(body.itemName, 'Nama Barang')]));
  if (toInt(body.outQty, 0) < 1) e.push('Qty minimal 1.');
  if (body.status && !STATUS.includes(body.status)) {
    e.push(`Status harus salah satu dari: ${STATUS.join(', ')}.`);
  }
  return e;
}

/** Nama pemohon: dari form, atau dari sesi bila form tidak mengirimnya. */
function requestedByOf(body: any, by: string | undefined): string {
  const fromBody = typeof body.requestedBy === 'string' ? body.requestedBy.trim() : '';
  if (fromBody) return fromBody;
  const fromSession = by?.trim();
  if (fromSession) return fromSession;
  throw new Error('Nama pemohon wajib diisi.');
}

/** Stok Ready untuk sebuah kode item, atau null bila tidak terdaftar. */
function findStock(itemCode: unknown) {
  const code = typeof itemCode === 'string' ? itemCode.trim() : '';
  if (!code) return Promise.resolve(null);
  return prisma.inventoryStock.findUnique({ where: { itemCode: code } });
}

export async function GET(req: NextRequest) {
  const authError = await requirePermission(req, 'transaction_stockout', 'read');
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('search') || '').trim();
    const status = searchParams.get('status') || '';
    const page = Math.max(1, toInt(searchParams.get('page'), 1));
    const pageSize = Math.min(200, Math.max(1, toInt(searchParams.get('pageSize'), 25)));

    const where: any = {};
    if (search) {
      where.OR = [
        { itemName: { contains: search } },
        { category: { contains: search } },
        { note: { contains: search } },
        { requestedBy: { contains: search } },
        { itemCode: { contains: search } },
      ];
    }
    if (status) {
      if (!STATUS.includes(status)) return badRequest(`Status harus salah satu dari: ${STATUS.join(', ')}.`);
      where.status = status;
    }

    const [data, total] = await Promise.all([
      prisma.stockOutTransaction.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.stockOutTransaction.count({ where }),
    ]);

    return ok({
      data,
      pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    });
  } catch (error: any) {
    return serverError(error.message);
  }
}

export async function POST(req: NextRequest) {
  const authError = await requirePermission(req, 'transaction_stockout', 'create');
  if (authError) return authError;

  try {
    const auth = await getAuthContext(req);
    const by = auth?.name ?? 'Staff IT';
    const body = await req.json();

    const errors = validate(body);
    if (errors.length) return badRequest(errors.join(' - '));

    const stock = await findStock(body.itemCode);
    if (!stock) return badRequest('Item tidak ditemukan pada daftar stok.');

    // Item harus milik kategori yang dipilih.
    if (stock.category !== body.category) {
      return badRequest(`Item ${stock.itemName} bukan milik kategori ${body.category}.`);
    }

    const outQty = toInt(body.outQty, 1);
    if (outQty > stock.currentStock) {
      return badRequest(
        `Qty melebihi stok tersedia. Stok ${stock.itemName} tinggal ${stock.currentStock} unit.`,
      );
    }

    const created = await prisma.stockOutTransaction.create({
      data: {
        date: body.date ? new Date(body.date) : new Date(),
        category: body.category,
        itemCode: stock.itemCode,
        itemName: stock.itemName,
        outQty,
        note: body.note || null,
        status: body.status || 'Pending',
        requestedBy: requestedByOf(body, by),
      },
    });

    return ok(created, 201);
  } catch (error: any) {
    return badRequest(error.message || 'Gagal menyimpan pengeluaran stok');
  }
}

export async function PUT(req: NextRequest) {
  const authError = await requirePermission(req, 'transaction_stockout', 'update');
  if (authError) return authError;

  try {
    const auth = await getAuthContext(req);
    const by = auth?.name ?? 'Staff IT';
    const body = await req.json();

    const id = toInt(body.id, 0);
    if (!id) return badRequest('ID wajib diisi.');

    const current = await prisma.stockOutTransaction.findUnique({ where: { id } });
    if (!current) return badRequest('Data tidak ditemukan.');

    // Ubah isi (bukan hanya status) juga divalidasi.
    const editingContent =
      body.itemCode !== undefined || body.category !== undefined || body.outQty !== undefined;
    if (editingContent) {
      const merged = { ...current, ...body };
      const errors = validate(merged, true);
      if (errors.length) return badRequest(errors.join(' - '));
    }

    const nextStatus = body.status || current.status;

    // Pengajuan disetujui -> kurangi stok Ready dalam satu transaksi.
    if (nextStatus === 'Approved' && current.status !== 'Approved') {
      const updated = await prisma.$transaction(async (tx) => {
        const stock = await tx.inventoryStock.findUnique({ where: { itemCode: current.itemCode } });
        if (!stock) throw new Error('Item tidak ditemukan pada daftar stok.');
        if (current.outQty > stock.currentStock) {
          throw new Error(
            `Stok tidak cukup untuk disetujui. Stok ${stock.itemName} tinggal ${stock.currentStock} unit, pengajuan ${current.outQty} unit.`,
          );
        }

        await tx.inventoryStock.update({
          where: { id: stock.id },
          data: {
            currentStock: stock.currentStock - current.outQty,
            outStock: stock.outStock + current.outQty,
            updatedAt: new Date(),
          },
        });
        await tx.inventoryHistory.create({
          data: {
            category: stock.category,
            stock: stock.currentStock - current.outQty,
            inQty: 0,
            outQty: current.outQty,
            note: `[Stock Out Approved] ${stock.itemName}: ${current.outQty} unit`,
            updateBy: by,
          },
        });

        return tx.stockOutTransaction.update({
          where: { id },
          data: { status: 'Approved', approvedBy: by },
        });
      });
      return ok({ ...updated, stockReduced: true });
    }

    // Edit biasa / ubah status lain: stok tidak tersentuh.
    const patch: any = {};
    if (body.date) patch.date = new Date(body.date);
    if (body.category) patch.category = body.category;
    if (body.itemCode) patch.itemCode = body.itemCode;
    if (body.itemName) patch.itemName = body.itemName;
    if (body.outQty !== undefined) patch.outQty = toInt(body.outQty, 1);
    if (body.note !== undefined) patch.note = body.note || null;
    if (body.status) patch.status = body.status;
    if (body.approvedBy !== undefined) patch.approvedBy = body.approvedBy || null;
    if (body.requestedBy !== undefined) patch.requestedBy = requestedByOf(body, by);

    const updated = await prisma.stockOutTransaction.update({ where: { id }, data: patch });
    return ok({ ...updated, stockReduced: false });
  } catch (error: any) {
    return badRequest(error.message || 'Gagal menyimpan perubahan');
  }
}

export async function DELETE(req: NextRequest) {
  const authError = await requirePermission(req, 'transaction_stockout', 'delete');
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return badRequest('ID is required');
    await prisma.stockOutTransaction.delete({ where: { id: toInt(id, 0) } });
    return ok({ success: true });
  } catch (error: any) {
    return serverError(error.message);
  }
}