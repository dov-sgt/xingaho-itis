/**
 * Probe cepat untuk memeriksa skema & data saat pengembangan.
 * Jalankan:  node scripts/db-probe.js tables
 *           node scripts/db-probe.js columns DamagedItem
 *           node scripts/db-probe.js count laptopAsset
 */
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const [cmd, arg] = process.argv.slice(2);

  if (cmd === 'tables') {
    const rows = await p.$queryRawUnsafe(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%' ORDER BY name",
    );
    rows.forEach((r) => console.log(r.name));
  } else if (cmd === 'columns') {
    const rows = await p.$queryRawUnsafe(`PRAGMA table_info(${arg})`);
    rows.forEach((r) => console.log(`${r.name.padEnd(22)} ${r.type}${r.notnull ? ' NOT NULL' : ''}`));
  } else if (cmd === 'count') {
    const n = await p[arg].count();
    console.log(`${arg} = ${n}`);
  } else {
    console.log('Perintah: tables | columns <Table> | count <model>');
  }

  await p.$disconnect();
})();