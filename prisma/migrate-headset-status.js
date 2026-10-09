/**
 * Migrasi data status Headset lama -> status baru (item 11).
 *
 * PEMETAAN:
 *   Pending  -> Pending   (tidak berubah)
 *   Used     -> Used      (tidak berubah)
 *   Reject   -> Reject    (tidak berubah)
 *   Return   -> Good      bila returnCondition = "Good Condition" atau kosong,
 *                         Damage bila returnCondition = "Damaged/Missing"
 *   Good     -> Good      (data lama yang kebetulan sudah memakai nilai baru)
 *   Damage   -> Damage
 *
 * Item berstatus `Return` yang dipetakan menjadi `Damage` juga dicatat ke tabel
 * `DamagedItem` agar masuk "daftar item damage".
 *
 * Jalankan sekali setelah deploy:
 *   node prisma/migrate-headset-status.js
 *
 * Aman diulang: hanya baris berstatus "Return" yang diproses, dan setelah
 * diproses statusnya sudah bukan "Return".
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const RETURN_TO_GOOD = ['good condition', 'good', ''];

async function main() {
  console.log('Memigrasi status Headset lama (Return -> Good / Damage)...');

  const legacy = await prisma.transactionItem.findMany({ where: { status: 'Return' } });
  console.log(`  ditemukan ${legacy.length} baris berstatus "Return"`);

  let toGood = 0;
  let toDamage = 0;

  for (const tx of legacy) {
    const cond = String(tx.returnCondition || '').trim().toLowerCase();
    const finalStatus = RETURN_TO_GOOD.includes(cond) ? 'Good' : 'Damage';

    await prisma.transactionItem.update({
      where: { id: tx.id },
      data: {
        status: finalStatus,
        returnCondition: finalStatus,
        returnedAt: tx.returnedAt || new Date(),
        updatedBy: 'Migrasi Status Headset',
      },
    });

    if (finalStatus === 'Damage') {
      // Cegah duplikat saat script dijalankan ulang.
      const exists = await prisma.damagedItem.findFirst({
        where: { sourceTransactionId: tx.id },
      });
      if (!exists) {
        await prisma.damagedItem.create({
          data: {
            itemCode: tx.itemCode,
            itemName: tx.itemName || 'Headset',
            qty: 1,
            nik: tx.nik,
            employeeName: tx.name,
            vendor: tx.vendor,
            condition: 'Damage',
            note: 'Migrasi dari status Return/Damaged',
            sourceTransactionId: tx.id,
            createdBy: 'Migrasi Status Headset',
          },
        });
      }
      toDamage++;
    } else {
      toGood++;
    }
  }

  // Lengkapi baris lama tanpa itemCode/itemName agar pengembalian ke depan
  // bisa mengembalikan stok dengan benar.
  await prisma.transactionItem.updateMany({
    where: { itemCode: null },
    data: { itemName: 'Headset' },
  });

  console.log(`\nSelesai. Dipetakan ke Good: ${toGood}, ke Damage: ${toDamage}.`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });