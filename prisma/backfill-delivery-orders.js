/**
 * Backfill Delivery Order untuk Purchase Request lama yang sudah Approved
 * tetapi belum punya Delivery Order (item 6).
 *
 * Jalankan sekali setelah deploy:
 *   node prisma/backfill-delivery-orders.js
 *
 * Aman diulang: memakai dedupeKey UNIQUE "<prId>:<itemCode|nama>", jadi
 * eksekusi kedua tidak membuat duplikat.
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function dedupeKey(prId, itemCode, itemName) {
  return `${prId}:${itemCode || itemName || 'item'}`;
}

async function main() {
  console.log('Mencari Purchase Request Approved tanpa Delivery Order...');

  const prs = await prisma.purchaseRequest.findMany({
    where: { status: { in: ['Approved', 'Ordered', 'Completed'] } },
    include: { items: { orderBy: { sortOrder: 'asc' } } },
  });

  let created = 0;
  let skipped = 0;
  let dosCounter = await prisma.deliveryOrder.count();

  for (const pr of prs) {
    const lines = pr.items.length
      ? pr.items.map((i) => ({ itemCode: i.itemCode, itemName: i.itemName, qty: i.qty, price: i.price }))
      : [{ itemCode: pr.itemCode, itemName: pr.itemName, qty: pr.qty, price: pr.biaya }];

    for (const line of lines) {
      const key = dedupeKey(pr.id, line.itemCode, line.itemName);
      const existing = await prisma.deliveryOrder.findUnique({ where: { dedupeKey: key } });
      if (existing) {
        skipped++;
        continue;
      }

      dosCounter++;
      const qty = Math.max(1, parseInt(line.qty, 10) || 1);
      const price = parseFloat(line.price) || 0;

      await prisma.deliveryOrder.create({
        data: {
          doNumber: `DO-${new Date().getFullYear()}-${String(dosCounter).padStart(4, '0')}`,
          dedupeKey: key,
          prId: pr.id,
          prNumber: pr.prNumber,
          vendorName: pr.typeItem || 'Internal',
          itemCode: line.itemCode || null,
          itemName: line.itemName,
          qtyOrdered: qty,
          qtyReceived: 0,
          price,
          totalValue: price * qty,
          date: pr.date,
          recipient: pr.requesterName || pr.createdBy || '-',
          status: 'Pending',
          note: `Backfill otomatis dari Purchase Request ${pr.prNumber}`,
        },
      });
      created++;
      console.log(`  + ${pr.prNumber} -> DO untuk "${line.itemName}" (${qty} unit)`);
    }
  }

  console.log(`\nSelesai. Dibuat: ${created}, dilewati (sudah ada): ${skipped}.`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });