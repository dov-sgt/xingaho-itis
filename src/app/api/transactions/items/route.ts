import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, getAuthContext } from '@/lib/session';
import { ok, badRequest, serverError, validationError } from '@/lib/api';
import { collectErrors, validateRequired } from '@/lib/validation';
import { toInt, toNumber, isNegative } from '@/lib/documents';
import { VALID_STATUSES, VALID_CONDITIONS, VALID_RETURN_CONDITIONS } from '@/lib/headset';

/**
 * Siklus hidup item Headset (item 11):
 *
 *   Pending  -> disetujui            -> Used
 *   Used     -> Return + kondisi Good   -> Good    (stok bertambah)
 *   Used     -> Return + kondisi Damage -> Damage  (masuk daftar damage, stok tidak bertambah)
 *   Pending  -> Reject                   -> Reject
 *
 * "Return" dipertahankan sebagai nilai historis di database; saat dibaca ia
 * dinormalisasi menjadi Good / Damage sesuai `returnCondition`.
 */

export async function GET(req: NextRequest) {
  const authError = await requirePermission(req, 'transaction_headset', 'read');
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const page = Math.max(1, toInt(searchParams.get('page'), 1));
    const pageSize = Math.min(200, Math.max(1, toInt(searchParams.get('pageSize'), 50)));

    const where: any = {};
    if (status) {
      if (!(VALID_STATUSES as readonly string[]).includes(status)) {
        return badRequest(`Status tidak valid. Valid: ${VALID_STATUSES.join(', ')}`);
      }
      where.status = status;
    }
    if (search) {
      where.OR = [
        { nik: { contains: search } },
        { name: { contains: search } },
        { project: { contains: search } },
        { vendor: { contains: search } },
        { itemName: { contains: search } },
        { itemCode: { contains: search } },
      ];
    }

    const [transactions, total] = await Promise.all([
      prisma.transactionItem.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.transactionItem.count({ where }),
    ]);

    return ok({
      data: transactions,
      pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    });
  } catch (error: any) {
    return serverError(error.message);
  }
}

export async function POST(req: NextRequest) {
  const authError = await requirePermission(req, 'transaction_headset', 'create');
  if (authError) return authError;

  try {
    const auth = await getAuthContext(req);
    const body = await req.json();
    const {
      date, employeeCategory, nik, name, condition, vendor, deposit,
      note, project, itemCode, itemName, vendorSubmissionId,
    } = body;

    const errors = collectErrors([
      validateRequired(nik, 'NIK'),
      validateRequired(name, 'Nama'),
    ]);
    if (isNegative(deposit)) errors.push('Deposit tidak boleh negatif');
    if (condition && !(VALID_CONDITIONS as readonly string[]).includes(condition)) {
      errors.push(`Kondisi tidak valid. Valid: ${VALID_CONDITIONS.join(', ')}`);
    }
    if (errors.length > 0) return validationError(errors);

    const transaction = await prisma.transactionItem.create({
      data: {
        date: date || new Date().toISOString().slice(0, 10),
        employeeCategory: employeeCategory || 'New Employee',
        nik: String(nik),
        name: String(name),
        condition: condition || 'New Use',
        vendor: vendor || 'Swapro',
        deposit: toNumber(deposit, 100000),
        note: note || '-',
        project: project || 'GoTo',
        // Pengajuan selalu mulai sebagai Pending; hanya approval yang mengubah ke Used.
        status: 'Pending',
        itemCode: itemCode || null,
        itemName: itemName || null,
        vendorSubmissionId: vendorSubmissionId ? toInt(vendorSubmissionId) : null,
        updatedBy: auth?.name ?? 'Staff IT',
      },
    });

    return ok(transaction, 201);
  } catch (error: any) {
    return serverError(error.message);
  }
}

export async function PUT(req: NextRequest) {
  const authError = await requirePermission(req, 'transaction_headset', 'update');
  if (authError) return authError;

  try {
    const auth = await getAuthContext(req);
    const body = await req.json();
    const {
      id, status, condition, note, deposit, vendorSubmissionId,
      returnCondition, returnPrice, returnNote, itemCode, itemName,
    } = body;

    if (!id) return badRequest('ID is required');

    const current = await prisma.transactionItem.findUnique({ where: { id: toInt(id) } });
    if (!current) return badRequest('Data headset tidak ditemukan');

    if (status && !(VALID_STATUSES as readonly string[]).includes(status)) {
      return badRequest(`Status tidak valid. Valid: ${VALID_STATUSES.join(', ')}`);
    }
    if (condition && !(VALID_CONDITIONS as readonly string[]).includes(condition)) {
      return badRequest(`Kondisi tidak valid. Valid: ${VALID_CONDITIONS.join(', ')}`);
    }
    if (returnCondition && !(VALID_RETURN_CONDITIONS as readonly string[]).includes(returnCondition)) {
      return badRequest(`Kondisi pengembalian wajib diisi dengan salah satu: ${VALID_RETURN_CONDITIONS.join(', ')}`);
    }

    // ---------- Aksi Return: wajib memilih kondisi, satu transaksi atomik ----------
    const isReturn =
      status === 'Return' ||
      status === 'Good' ||
      status === 'Damage' ||
      (!!returnCondition && current.status === 'Used');

    if (isReturn) {
      const conditionFinal = (returnCondition || status) as 'Good' | 'Damage';
      if (!['Good', 'Damage'].includes(conditionFinal)) {
        return badRequest('Pengembalian wajib menyertakan kondisi: Good atau Damage.');
      }
      if (current.status !== 'Used') {
        return badRequest(`Hanya item berstatus "Used" yang dapat dikembalikan (status saat ini: ${current.status}).`);
      }

      const targetItemCode = current.itemCode || itemCode || null;
      const targetItemName = current.itemName || itemName || null;

      // Atomic: update status + (tambah stok | catat damage) berjalan dalam satu transaksi.
      const updated = await prisma.$transaction(async (tx) => {
        if (conditionFinal === 'Good') {
          // Kondisi Good -> stok bertambah pada tipe/kategori Headset.
          if (targetItemCode) {
            const stock = await tx.inventoryStock.findUnique({ where: { itemCode: targetItemCode } });
            if (stock) {
              await tx.inventoryStock.update({
                where: { id: stock.id },
                data: {
                  currentStock: stock.currentStock + 1,
                  inStock: stock.inStock + 1,
                  updatedAt: new Date(),
                },
              });
              await tx.inventoryHistory.create({
                data: {
                  category: stock.category || 'Headset',
                  stock: stock.currentStock + 1,
                  inQty: 1,
                  outQty: 0,
                  note: `[Headset Return - Good] ${current.nik} · ${current.name}: 1 unit`,
                  updateBy: auth?.name ?? 'Staff IT',
                },
              });
            }
          }
        } else {
          // Kondisi Damage -> masuk daftar item damage, stok TIDAK bertambah.
          await tx.damagedItem.create({
            data: {
              itemCode: targetItemCode,
              itemName: targetItemName || 'Headset',
              qty: 1,
              nik: current.nik,
              employeeName: current.name,
              condition: 'Damage',
              vendor: current.vendor,
              note: returnNote || null,
              sourceTransactionId: current.id,
              createdBy: auth?.name ?? 'Staff IT',
            },
          });
        }

        return tx.transactionItem.update({
          where: { id: current.id },
          data: {
            status: conditionFinal,
            returnCondition: conditionFinal,
            returnPrice: toNumber(returnPrice, 0),
            returnNote: returnNote || null,
            returnedAt: new Date(),
            updatedAt: new Date(),
            updatedBy: auth?.name ?? 'Staff IT',
          },
        });
      });

      return ok(updated);
    }

    // ---------- Update biasa / approve ----------
    const data: any = { updatedAt: new Date(), updatedBy: auth?.name ?? 'Staff IT' };
    if (status) data.status = status;
    if (condition) data.condition = condition;
    if (note) data.note = note;
    if (deposit !== undefined) data.deposit = toNumber(deposit, 0);
    if (vendorSubmissionId !== undefined) data.vendorSubmissionId = vendorSubmissionId ? toInt(vendorSubmissionId) : null;
    if (returnNote !== undefined) data.returnNote = returnNote;
    if (itemCode !== undefined) data.itemCode = itemCode || null;
    if (itemName !== undefined) data.itemName = itemName || null;

    // Approve -> Used (item 11: dipakai saat pengajuan disetujui)
    if (status === 'Used') {
      data.approvedBy = auth?.name ?? 'System';
      data.approvedAt = new Date();
    }

    const updated = await prisma.transactionItem.update({ where: { id: toInt(id) }, data });
    return ok(updated);
  } catch (error: any) {
    return serverError(error.message);
  }
}

export async function DELETE(req: NextRequest) {
  const authError = await requirePermission(req, 'transaction_headset', 'delete');
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return badRequest('ID is required');

    const tx = await prisma.transactionItem.findUnique({ where: { id: toInt(id) } });
    if (tx && tx.status === 'Used') {
      return badRequest('Item berstatus "Used" tidak dapat dihapus. Kembalikan terlebih dahulu (Good/Damage).');
    }

    await prisma.transactionItem.delete({ where: { id: toInt(id) } });
    return ok({ success: true });
  } catch (error: any) {
    return serverError(error.message);
  }
}
