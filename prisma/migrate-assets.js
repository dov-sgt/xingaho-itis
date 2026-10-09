/**
 * Migrasi data tahap 2 (item 1, 2, 3, 5).
 *
 * IDEMPOTEN - aman dijalankan berkali-kali.
 *
 * 1. Seed `ItemCategory` dengan kode kategori default untuk kategori yang
 *    sudah dipakai di Master Inventory (item 3).
 * 2. Backfill `BrokenAsset` -> `DamagedItem` (item 1).
 *    Tabel `BrokenAsset` tidak lagi dipakai sebagai sumber jumlah aset rusak.
 *    Baris yang sudah punya padanan dicatat lewat `note` berisi penanda,
 *    jadi tidak akan terduplikasi saat dijalankan ulang.
 * 3. Backfill `AssetAssignmentHistory` untuk laptop lama (item 5).
 *    Laptop yang belum punya histori akan mendapat satu penugasan awal.
 *
 * Jalankan:  npm run migrate:assets
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/** Kode kategori default (harus sama dengan DEFAULT_CATEGORY_CODES). */
const CATEGORY_CODES = {
  Computer: 'CP',
  Accessories: 'AC',
  Aksesoris: 'AK',
  Smartphone: 'SP',
  Media: 'MD',
  Equipment: 'EQ',
  Networking: 'NW',
  Server: 'SV',
  Others: 'OT',
  Headset: 'HS',
  Printer: 'PR',
  Laptop: 'LP',
  Lainnya: 'LN',
};

const BACKFILL_MARK = '[migrasi:tahap2]';

async function seedCategories() {
  // Kumpulkan kategori dari semua sumber yang sudah dipakai.
  const used = new Set([
    ...Object.keys(CATEGORY_CODES),
    ...(await prisma.masterItem.findMany({ select: { typeItem: true } })).map((i) => i.typeItem),
    ...(await prisma.inventoryStock.findMany({ select: { category: true } })).map((s) => s.category),
  ]);

  let created = 0;
  let skipped = 0;

  for (const name of Array.from(used).filter(Boolean).sort()) {
    const existing = await prisma.itemCategory.findUnique({ where: { name } });
    if (existing) {
      skipped++;
      continue;
    }

    // Kode harus unik. Kalau kode default sudah dipakai kategori lain,
    // tambahkan angka sampai bebas.
    const base = (CATEGORY_CODES[name] || 'OT').toUpperCase();
    let code = base;
    let suffix = 0;
    while (await prisma.itemCategory.findUnique({ where: { code } })) {
      suffix += 1;
      code = `${base.slice(0, 1)}${suffix}`;
    }

    await prisma.itemCategory.create({ data: { name, code } });
    created++;
  }

  console.log(`  ItemCategory: ${created} dibuat, ${skipped} sudah ada.`);
}

async function backfillBrokenAssets() {
  const legacy = await prisma.brokenAsset.findMany();
  if (legacy.length === 0) {
    console.log('  BrokenAsset: tidak ada data untuk dimigrasi.');
    return;
  }

  // Lewati baris yang sudah pernah dimigrasi (dicek lewat penanda di note).
  const existingMarks = await prisma.damagedItem.findMany({
    where: { note: { contains: BACKFILL_MARK } },
    select: { note: true },
  });
  const alreadyDone = new Set(
    existingMarks
      .map((d) => (d.note || '').match(/legacyBrokenAsset=(\d+)/)?.[1])
      .filter(Boolean),
  );

  let moved = 0;
  for (const b of legacy) {
    if (alreadyDone.has(String(b.id))) continue;

    // brokenCount = jumlah benar-benar rusak; fallback ke qty.
    const qty = b.brokenCount > 0 ? b.brokenCount : b.qty > 0 ? b.qty : 1;

    await prisma.damagedItem.create({
      data: {
        itemName: b.itemType,
        qty,
        category: b.itemType,
        condition: 'Damage',
        status: 'Rusak',
        note: `${BACKFILL_MARK} legacyBrokenAsset=${b.id} ${b.note || ''}`.trim(),
        createdBy: 'Migrasi Tahap 2',
        updatedBy: 'Migrasi Tahap 2',
        date: b.date,
      },
    });
    moved++;
  }

  console.log(`  DamagedItem: ${moved} baris BrokenAsset dimigrasi (${alreadyDone.size} sudah pernah dipindah).`);
}

async function backfillLaptopHistory() {
  const laptops = await prisma.laptopAsset.findMany({
    include: { history: { select: { id: true } } },
  });

  let added = 0;
  for (const l of laptops) {
    if (l.history.length > 0) continue;
    await prisma.assetAssignmentHistory.create({
      data: {
        assetId: l.id,
        userName: l.user,
        startDate: l.date,
        changedBy: 'Migrasi Tahap 2',
        note: 'Penugasan awal (hasil migrasi dari data lama)',
      },
    });
    added++;
  }

  console.log(`  AssetAssignmentHistory: ${added} penugasan awal dibuat untuk laptop lama.`);
}

async function main() {
  console.log('Migrasi Tahap 2: aset rusak, servis, kode item, histori laptop...');
  await seedCategories();
  await backfillBrokenAssets();
  await backfillLaptopHistory();
  console.log('Migrasi selesai.');
}

main()
  .catch((e) => {
    console.error('Migrasi gagal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });