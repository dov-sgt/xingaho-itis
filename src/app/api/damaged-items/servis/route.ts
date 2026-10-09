import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAnyPermission, getAuthContext } from '@/lib/session';
import { ok, badRequest, serverError } from '@/lib/api';
import { toInt, nextScopedNumber } from '@/lib/documents';
import { SERVIS_STATUSES } from '@/lib/assets';

/**
 * Alur "Kirim ke Servis" (item 2).
 *
 * POST - pindahkan aset rusak ke Servis Asset.
 *   - qty boleh sebagian; sisanya tetap berstatus rusak
 *   - jumlah aset rusak berkurang, jumlah dalam servis bertambah
 *   - satu transaksi Prisma supaya tidak mungkin tercatat separuh
 *
 * PUT - ubah status servis.
 *   - 'Selesai (Diperbaiki)'  -> aset kembali ke stok Ready (+ histori)
 *   - 'Tidak Bisa Diperbaiki' -> aset tetap di daftar rusak dengan penanda
 *   - 'Dalam Servis'          -> hanya mengubah status
 */
export async function POST(req: NextRequest) {
  const authError = await requireAnyPermission(req, [
    { feature: 'transaction_headset', action: 'update' },
    { feature: 'inventory_type_item', action: 'update' },
    { feature: 'servis_asset', action: 'create' },
  ]);
  if (authError) return authError;

  try {
    const auth = await getAuthContext(req);
    const by = auth?.name ?? 'Staff IT';
    const body = await req.json();

    const damagedId = toInt(body.damagedId, 0);
    const qty = toInt(body.qty, 0);
    const damageNote = String(body.note ?? '').trim() || null;
    const serviceVendor = String(body.serviceVendor ?? '').trim() || null;
    const teknisiName = String(body.teknisiName ?? '').trim() || null;

    if (!damagedId) return badRequest('Data aset rusak wajib dipilih.');
    if (qty < 1) return badRequest('Qty minimal 1.');

    const result = await prisma.$transaction(async (tx) => {
      const damaged = await tx.damagedItem.findUnique({ where: { id: damagedId } });
      if (!damaged) throw new Error('Data aset rusak tidak ditemukan.');
      if (damaged.status === 'Dalam Servis') throw new Error('Aset ini sudah masuk proses servis.');
      if (qty > damaged.qty) {
        throw new Error(`Qty tidak boleh melebihi jumlah tercatat (${damaged.qty}).`);
      }

      // Sisa yang tidak dikirim tetap berstatus rusak.
      const remainder = damaged.qty - qty;
      await tx.damagedItem.update({
        where: { id: damagedId },
        data: {
          qty: remainder,
          status: remainder === 0 ? 'Dalam Servis' : 'Rusak',
          servisQty: qty,
          updatedBy: by,
        },
      });

      const servisCode = await nextScopedNumber(tx, 'SRV', 'SRV', 3);

      const servis = await tx.servisAsset.create({
        data: {
          servisCode,
          date: body.date ? new Date(body.date) : new Date(),
          itemName: damaged.itemName,
          itemCode: damaged.itemCode,
          category: damaged.category,
          status: 'Dalam Servis',
          teknisiName,
          serviceVendor,
          sourceDamageId: damagedId,
          sourceQty: qty,
          resolutionNote: damageNote,
          createdBy: by,
        },
      });

      // Jejak bahwa qty aset keluar dari daftar damage menuju servis.
      await tx.inventoryHistory.create({
        data: {
          category: damaged.category || 'Aset Rusak',
          stock: 0,
          inQty: 0,
          outQty: qty,
          note: `[Kirim ke Servis] ${servisCode} - ${damaged.itemName}: ${qty} unit`,
          updateBy: by,
        },
      });

      return { servis, remainder };
    });

    return ok(result, 201);
  } catch (error: any) {
    return badRequest(error.message || 'Gagal mengirim aset ke servis');
  }
}

export async function PUT(req: NextRequest) {
  const authError = await requireAnyPermission(req, [
    { feature: 'servis_asset', action: 'update' },
    { feature: 'transaction_headset', action: 'update' },
    { feature: 'inventory_type_item', action: 'update' },
  ]);
  if (authError) return authError;

  try {
    const auth = await getAuthContext(req);
    const by = auth?.name ?? 'Staff IT';
    const body = await req.json();

    const id = toInt(body.id, 0);
    const status = String(body.status ?? '').trim();
    const teknisiName = body.teknisiName !== undefined ? String(body.teknisiName).trim() : undefined;
    const resolutionNote = String(body.resolutionNote ?? '').trim() || null;

    if (!id) return badRequest('ID wajib diisi.');
    if (!SERVIS_STATUSES.includes(status as any)) {
      return badRequest(`Status harus salah satu dari: ${SERVIS_STATUSES.join(', ')}.`);
    }

    const result = await prisma.$transaction(async (tx) => {
      const servis = await tx.servisAsset.findUnique({ where: { id } });
      if (!servis) throw new Error('Data servis tidak ditemukan.');

      const repaired = status === 'Selesai (Diperbaiki)';
      const unrepairable = status === 'Tidak Bisa Diperbaiki';
      const resolved = repaired || unrepairable;

      await tx.servisAsset.update({
        where: { id },
        data: {
          status,
          ...(teknisiName !== undefined ? { teknisiName: teknisiName || null } : {}),
          resolutionNote: resolutionNote ?? servis.resolutionNote,
          ...(resolved && !servis.resolvedAt ? { resolvedAt: new Date() } : {}),
        },
      });

      const damaged = servis.sourceDamageId
        ? await tx.damagedItem.findUnique({ where: { id: servis.sourceDamageId } })
        : null;

      if (damaged && repaired) {
        const qty = servis.sourceQty > 0 ? servis.sourceQty : damaged.qty;
        const itemCode = servis.itemCode ?? damaged.itemCode;
        const category = servis.category || damaged.category || 'Others';

        const existing = itemCode ? await tx.inventoryStock.findUnique({ where: { itemCode } }) : null;
        const target =
          existing ??
          (await tx.inventoryStock.create({
            data: {
              itemCode: itemCode ?? null,
              itemName: servis.itemName,
              category,
              currentStock: 0,
              inStock: 0,
              outStock: 0,
              note: 'Dibuat otomatis saat aset rusak selesai diperbaiki',
            },
          }));

        await tx.inventoryStock.update({
          where: { id: target.id },
          data: {
            currentStock: target.currentStock + qty,
            inStock: target.inStock + qty,
            updatedAt: new Date(),
          },
        });
        await tx.inventoryHistory.create({
          data: {
            category: target.category || category,
            stock: target.currentStock + qty,
            inQty: qty,
            outQty: 0,
            note: `[Servis Selesai] ${servis.servisCode} - ${servis.itemName}: ${qty} unit kembali ke stok`,
            updateBy: by,
          },
        });

        await tx.damagedItem.update({
          where: { id: damaged.id },
          data: { status: 'Selesai', qty: 0, resolvedAt: new Date(), updatedBy: by },
        });
      } else if (damaged && unrepairable) {
        // Tetap dihitung sebagai aset rusak, ditandai tidak bisa diperbaiki.
        await tx.damagedItem.update({
          where: { id: damaged.id },
          data: { status: 'Tidak Bisa Diperbaiki', resolvedAt: new Date(), updatedBy: by },
        });
      }

      return { id, status, restoredToStock: Boolean(damaged && repaired) };
    });

    return ok(result);
  } catch (error: any) {
    return badRequest(error.message || 'Gagal mengubah status servis');
  }
}