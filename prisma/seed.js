const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // IT Division users
  const users = [
    { username: 'superadmin', name: 'Sigit SuperAdmin', password: 'admin123', role: 'SUPERADMIN', division: null },
    { username: 'spv_it', name: 'Budi SPV IT', password: 'spv123', role: 'SPV_OPS', division: 'IT' },
    { username: 'staff_it', name: 'Dika Staff IT', password: 'staff123', role: 'LEADER_OPS', division: 'IT' },
  ];

  for (const u of users) {
    const hashedPassword = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { username: u.username },
      update: { ...u, password: hashedPassword },
      create: { ...u, password: hashedPassword },
    });
  }

  console.log('Seed complete.');
  console.log('IT Division:');
  console.log('  superadmin / admin123 (SuperAdmin)');
  console.log('  spv_it / spv123 (SPV IT)');
  console.log('  staff_it / staff123 (Staff IT)');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
