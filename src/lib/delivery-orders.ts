import { prisma } from '@/lib/prisma';
import { nextNumber, toInt, toNumber, deliveryDedupeKey } from './documents';

export type PrForDeliverySync = {
  id: number;
  prNumber: string;
  typeItem: string;
  requesterName: string | null;
  createdBy: string | null;
  items: { itemCode: string | null; itemName: string; qty: number; price: number }[];
  /** Fallback untuk PR lama yang belum punya baris item. */
  itemCode: string | null;
  itemName: string;
  qty: number;
  biaya: number;
};

/**
 * Membuat Delivery Order untuk setiap item Purchase Request yang disetujui (item 6).
 *
 * Idempoten: kolom `dedupeKey` ("<prId>:<kode item>") punya constraint UNIQUE dan
 * diimplementasikan lewat `upsert`, sehingga approve ulang / refresh / klik
 * ganda tidak pernah menghasilkan Delivery Order duplikat.
 */
export async function syncDeliveryOrdersForPr(pr: PrForDeliverySync): Promise<string[]> {
  const lines: { itemCode: string | null; itemName: string; qty: number; price: number }[] = pr.items.length
    ? pr.items.map((i) => ({ itemCode: i.itemCode, itemName: i.itemName, qty: i.qty, price: i.price }))
    : [{ itemCode: pr.itemCode, itemName: pr.itemName, qty: pr.qty, price: pr.biaya }];

  const processed: string[] = [];

  for (const line of lines) {
    const dedupeKey = deliveryDedupeKey(pr.id, line.itemCode, line.itemName);
    const qty = Math.max(1, toInt(line.qty, 1));
    const price = toNumber(line.price, 0);

    const existing = await prisma.deliveryOrder.findUnique({ where: { dedupeKey } });
    if (existing) {
      processed.push(existing.doNumber);
      continue;
    }

    const doNumber = await nextNumber('deliveryOrder', 'DO', 4);

    await prisma.deliveryOrder.upsert({
      where: { dedupeKey },
      update: {},
      create: {
        doNumber,
        dedupeKey,
        prId: pr.id,
        prNumber: pr.prNumber,
        vendorName: pr.typeItem || 'Internal',
        itemCode: line.itemCode ?? null,
        itemName: line.itemName,
        qtyOrdered: qty,
        qtyReceived: 0,
        price,
        totalValue: price * qty,
        date: new Date(),
        recipient: pr.requesterName || pr.createdBy || '-',
        status: 'Pending',
        note: `Otomatis dari Purchase Request ${pr.prNumber}`,
      },
    });

    processed.push(doNumber);
  }

  return processed;
}