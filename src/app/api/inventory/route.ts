import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/session';
import { ok, badRequest, notFound, serverError, validationError } from '@/lib/api';
import { validateRequired, validateInt, collectErrors } from '@/lib/validation';
import { damagedSummary } from '@/lib/assets';

/**
 * Inventaris & Stok.
 *
 * Item 1: `damaged` + `damagedSummary` (agregat DamagedItem) menjadi sumber
 * tunggal jumlah aset rusak. `brokenAssets` dikembalikan kosong supaya tidak
 * ada dua sumber kebenaran - data lamanya sudah dimigrasikan ke DamagedItem.
 *
 * Item 5: aset laptop dibuat lewat /api/assets/laptops (bukan lagi lewat
 * action `laptop_save` di sini) supaya penomoran kode aset dan histori
 * penugasan selalu tercatat.
 */
export async function GET(req: NextRequest) {
  const authError = await requirePermission(req, 'inventory_type_item', 'read');
  if (authError) return authError;

  try {
    const [stocks, laptops, damaged] = await Promise.all([
      prisma.inventoryStock.findMany({ orderBy: { updatedAt: 'desc' } }),
      prisma.laptopAsset.findMany({ orderBy: { id: 'desc' } }),
      damagedSummary(),
    ]);

    return ok({ stocks, laptops, damaged, damagedSummary: damaged, brokenAssets: [] });
  } catch (error: any) {
    return serverError(error.message);
  }
}

export async function POST(req: NextRequest) {
  const authError = await requirePermission(req, 'inventory_type_item', 'update');
  if (authError) return authError;

  try {
    const body = await req.json();
    // Older client tidak mengirim `action`; standarnya 'stock_in' agar tombol
    // Penerimaan pada halaman Inventaris tetap bekerja.
    const action = body.action || 'stock_in';

    const { stockId, qty, note, user } = body;

    const errors = collectErrors([validateRequired(stockId, 'Barang'), validateInt(qty, 'Qty', 1)]);
    if (errors.length > 0) return validationError(errors);

    const numQty = parseInt(String(qty), 10);
    const current = await prisma.inventoryStock.findUnique({ where: { id: Number(stockId) } });
    if (!current) return notFound('Item stok tidak ditemukan');

    if (action === 'stock_in') {
      const updated = await prisma.inventoryStock.update({
        where: { id: current.id },
        data: {
          currentStock: current.currentStock + numQty,
          inStock: current.inStock + numQty,
          note: note || current.note,
          updatedAt: new Date(),
        },
      });

      await prisma.inventoryHistory.create({
        data: {
          category: current.category,
          stock: current.currentStock + numQty,
          inQty: numQty,
          outQty: 0,
          note: `[Penerimaan] ${current.itemName}: ${numQty} unit. ${note || '-'}`.trim(),
          updateBy: user || 'Staff IT',
        },
      });

      return ok(updated);
    }

    if (action === 'stock_out') {
      if (current.currentStock < numQty) {
        return badRequest(
          `Stok tidak mencukupi (tersisa: ${current.currentStock} unit, diminta: ${numQty} unit).`,
        );
      }

      const updated = await prisma.inventoryStock.update({
        where: { id: current.id },
        data: {
          currentStock: current.currentStock - numQty,
          outStock: current.outStock + numQty,
          note: note || current.note,
          updatedAt: new Date(),
        },
      });

      await prisma.inventoryHistory.create({
        data: {
          category: current.category,
          stock: current.currentStock - numQty,
          inQty: 0,
          outQty: numQty,
          note: `[Pengeluaran] ${current.itemName}: ${numQty} unit. ${note || '-'}`.trim(),
          updateBy: user || 'Staff IT',
        },
      });

      return ok(updated);
    }

    return badRequest('Action invalid');
  } catch (error: any) {
    return serverError(error.message);
  }
}