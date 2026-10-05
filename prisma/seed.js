const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Only create SuperAdmin
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { username: 'superadmin' },
    update: { password: hashedPassword, role: 'SUPERADMIN', division: null },
    create: {
      username: 'superadmin',
      name: 'Sigit SuperAdmin',
      password: hashedPassword,
      role: 'SUPERADMIN',
      division: null,
    },
  });

  console.log('Seed complete. Only SuperAdmin user exists.');
  console.log('Username: superadmin');
  console.log('Password: admin123');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
