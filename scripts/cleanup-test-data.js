const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const items = await p.masterItem.deleteMany({
    where: {
      OR: [
        { namaItem: { startsWith: 'Server Uji ' } },
        { namaItem: { startsWith: 'Kabel Uji ' } },
        { namaItem: { startsWith: 'Uji Bulan Ini' } },
        { namaItem: 'Laptop Uji Harga' },
      ],
    },
  });
  const counters = await p.itemCodeCounter.deleteMany({
    where: { OR: [{ category: { in: ['NW', 'SV', 'MD'] } }, { category: 'DOC:SRV' }] },
  });
  await p.itemCategory.deleteMany({ where: { name: 'Networking' } });
  await p.vendorSubmission.deleteMany({ where: { title: { startsWith: 'Uji' } } });
  await p.damagedItem.deleteMany({ where: { note: { contains: 'Uji' } } });
  await p.stockOutTransaction.deleteMany({});
  await p.transactionItem.deleteMany({ where: { note: { contains: 'Uji' } } });
  await p.inventoryHistory.deleteMany({ where: { note: { contains: 'Uji' } } });

  const laps = await p.laptopAsset.findMany({ where: { item: 'Laptop Uji T14' }, select: { id: true } });
  for (const l of laps) await p.assetAssignmentHistory.deleteMany({ where: { assetId: l.id } });
  await p.laptopAsset.deleteMany({ where: { item: 'Laptop Uji T14' } });
  await p.servisAsset.deleteMany({ where: { serviceVendor: { contains: 'Sinar' } } });

  console.log('data uji dibersihkan:', items.count, 'item,', counters.count, 'counter');
  await p.$disconnect();
})();