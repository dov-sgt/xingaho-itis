const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Resetting database...');

  // Delete all data except User
  await prisma.transactionItem.deleteMany({});
  await prisma.stockOutTransaction.deleteMany({});
  await prisma.purchaseRequest.deleteMany({});
  await prisma.deliveryOrder.deleteMany({});
  await prisma.vendorSubmission.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.servisAsset.deleteMany({});
  await prisma.logRuangServer.deleteMany({});
  await prisma.inventoryHistory.deleteMany({});
  await prisma.inventoryStock.deleteMany({});
  await prisma.laptopAsset.deleteMany({});
  await prisma.brokenAsset.deleteMany({});
  await prisma.masterItem.deleteMany({});
  await prisma.masterVendor.deleteMany({});
  await prisma.nasabah.deleteMany({});
  await prisma.remark.deleteMany({});
  await prisma.paymentAchievement.deleteMany({});
  await prisma.recordingReview.deleteMany({});
  await prisma.finding.deleteMany({});
  await prisma.employee.deleteMany({});
  await prisma.leaveRequest.deleteMany({});
  await prisma.user.deleteMany({});

  // Create only SuperAdmin
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.create({
    data: {
      username: 'superadmin',
      name: 'Sigit SuperAdmin',
      password: hashedPassword,
      role: 'SUPERADMIN',
      division: null,
    },
  });

  console.log('Database reset complete. Only SuperAdmin user exists.');
}

main()
  .catch((e) => {
    console.error('Error during reset:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
