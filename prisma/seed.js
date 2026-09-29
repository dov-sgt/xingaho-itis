const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Xinghao ITIS database...');

  // 1. Users (with hashed passwords and divisions)
  const users = [
    { username: 'superadmin', name: 'Sigit SuperAdmin', password: 'admin123', role: 'SUPERADMIN', division: null },
    { username: 'manager_ops', name: 'Budi Manager Ops', password: 'manager123', role: 'MANAGER_OPS', division: 'OPS' },
    { username: 'spv_ops', name: 'Dika SPV Ops', password: 'spvops123', role: 'SPV_OPS', division: 'OPS' },
    { username: 'leader_ops', name: 'Rian Leader Ops', password: 'leader123', role: 'LEADER_OPS', division: 'OPS' },
    { username: 'agen', name: 'Faisal Agen', password: 'agen123', role: 'AGEN', division: 'OPS' },
    { username: 'spv_qc', name: 'Sari SPV QC', password: 'spvqc123', role: 'SPV_QC', division: 'QC' },
    { username: 'staff_qc', name: 'Andi Staff QC', password: 'staffqc123', role: 'STAFF_QC', division: 'QC' },
    { username: 'spv_hr', name: 'Rina SPV HR', password: 'spvhr123', role: 'SPV_HR', division: 'HR' },
    { username: 'staff_hr', name: 'Dodi Staff HR', password: 'staffhr123', role: 'STAFF_HR', division: 'HR' },
  ];

  for (const u of users) {
    const hashedPassword = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { username: u.username },
      update: { ...u, password: hashedPassword },
      create: { ...u, password: hashedPassword },
    });
  }
  console.log('Users seeded (with hashed passwords).');

  // 2. Master Items
  const itemsFile = path.join(__dirname, 'data/master_items.json');
  if (fs.existsSync(itemsFile)) {
    const items = JSON.parse(fs.readFileSync(itemsFile, 'utf8'));
    for (const item of items) {
      await prisma.masterItem.upsert({
        where: { code: item.code },
        update: item,
        create: item,
      });
    }
    console.log(`Seeded ${items.length} master items.`);
  }

  // 3. Master Vendors
  const vendorsFile = path.join(__dirname, 'data/master_vendors.json');
  if (fs.existsSync(vendorsFile)) {
    const vendors = JSON.parse(fs.readFileSync(vendorsFile, 'utf8'));
    for (const v of vendors) {
      await prisma.masterVendor.upsert({
        where: { code: v.code },
        update: v,
        create: v,
      });
    }
    console.log(`Seeded ${vendors.length} vendors.`);
  }

  // 4. Inventory Stocks
  const stocksFile = path.join(__dirname, 'data/inventory_stocks.json');
  if (fs.existsSync(stocksFile)) {
    const stocks = JSON.parse(fs.readFileSync(stocksFile, 'utf8'));
    await prisma.inventoryStock.deleteMany({});
    for (const s of stocks) {
      await prisma.inventoryStock.create({ data: s });
    }
    console.log(`Seeded ${stocks.length} inventory stocks.`);
  }

  // 5. Laptop Assets
  const laptopsFile = path.join(__dirname, 'data/laptop_assets.json');
  if (fs.existsSync(laptopsFile)) {
    const laptops = JSON.parse(fs.readFileSync(laptopsFile, 'utf8'));
    await prisma.laptopAsset.deleteMany({});
    for (const l of laptops) {
      await prisma.laptopAsset.create({ data: l });
    }
    console.log(`Seeded ${laptops.length} laptop assets.`);
  }

  // 6. Broken Assets
  const brokenFile = path.join(__dirname, 'data/broken_assets.json');
  if (fs.existsSync(brokenFile)) {
    const broken = JSON.parse(fs.readFileSync(brokenFile, 'utf8'));
    await prisma.brokenAsset.deleteMany({});
    for (const b of broken) {
      await prisma.brokenAsset.create({ data: b });
    }
    console.log(`Seeded ${broken.length} broken asset categories.`);
  }

  // 7. Purchase Requests
  const prFile = path.join(__dirname, 'data/purchase_requests.json');
  if (fs.existsSync(prFile)) {
    const prs = JSON.parse(fs.readFileSync(prFile, 'utf8'));
    for (const p of prs) {
      await prisma.purchaseRequest.upsert({
        where: { prNumber: p.prNumber },
        update: {
          ...p,
          date: new Date(p.date),
          qty: parseInt(p.qty) || 1,
          biaya: p.biaya || 0,
          diskon: p.diskon || 0,
          createdBy: p.createdBy || 'Sigit IT',
        },
        create: {
          ...p,
          date: new Date(p.date),
          qty: parseInt(p.qty) || 1,
          biaya: p.biaya || 0,
          diskon: p.diskon || 0,
          createdBy: p.createdBy || 'Sigit IT',
        },
      });
    }
    console.log(`Seeded ${prs.length} purchase requests.`);
  }

  // 8. Delivery Orders
  const sampleDOs = [
    {
      doNumber: 'DO-2026-0001',
      prId: 1,
      vendorName: 'Swapro',
      recipient: 'Sigit IT',
      status: 'Received',
      note: '50 unit Headset H110 lengkap kardus dan segel',
      itemName: 'Headset Logitech H110',
      qtyOrdered: 50,
      qtyReceived: 50,
    },
    {
      doNumber: 'DO-2026-0002',
      prId: 2,
      vendorName: 'TBS',
      recipient: 'Budi SPV IT',
      status: 'Pending',
      note: '10 unit SSD SATA 256GB pengiriman kurir',
      itemName: 'SSD SATA 256GB',
      qtyOrdered: 10,
      qtyReceived: 0,
    },
  ];
  for (const d of sampleDOs) {
    await prisma.deliveryOrder.upsert({
      where: { doNumber: d.doNumber },
      update: d,
      create: d,
    });
  }
  console.log('Seeded delivery orders.');

  // 9. Vendor Submissions
  const sampleSubmissions = [
    {
      submissionCode: 'VND-REQ-2026-001',
      vendorName: 'Swapro',
      title: 'Pengajuan Penggantian Headset Rusak batch Sept',
      description: 'Pengajuan penggantian unit rusak fisik / speaker mati sebanyak 15 unit untuk agent project GoTo.',
      category: 'Pergantian Unit',
      proposedPrice: 1575000,
      status: 'Pending',
      adminNote: 'Menunggu verifikasi fisik oleh Staff IT',
      nik: '33407',
      karyawanName: 'Rian Swapro',
      project: 'GoTo',
    },
    {
      submissionCode: 'VND-REQ-2026-002',
      vendorName: 'TBS',
      title: 'Penawaran Pembaruan SSD & RAM PC Operasional',
      description: 'Penawaran paket upgrade 20 unit PC Win10 ke SSD 256GB + RAM 8GB untuk efisiensi sistem.',
      category: 'Penawaran Hardware',
      proposedPrice: 10420000,
      status: 'Pending',
      adminNote: 'Sedang direview oleh SPV IT',
      nik: '33408',
      karyawanName: 'Budi TBS',
      project: 'Operasional',
    },
  ];
  for (const sub of sampleSubmissions) {
    await prisma.vendorSubmission.upsert({
      where: { submissionCode: sub.submissionCode },
      update: sub,
      create: sub,
    });
  }
  console.log('Seeded vendor submissions.');

  // 10. Headset Transactions (first 500 records for fast seeding)
  const headsetFile = path.join(__dirname, 'data/transactions_headset.json');
  if (fs.existsSync(headsetFile)) {
    const rawHeadset = JSON.parse(fs.readFileSync(headsetFile, 'utf8'));
    const sliceData = rawHeadset.slice(0, 500);
    await prisma.transactionItem.deleteMany({});

    // Batch insert
    for (let i = 0; i < sliceData.length; i += 100) {
      const batch = sliceData.slice(i, i + 100);
      await prisma.transactionItem.createMany({
        data: batch,
      });
    }
    console.log(`Seeded ${sliceData.length} headset transaction records.`);
  }

  console.log('Xinghao ITIS Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
