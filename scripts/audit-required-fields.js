/**
 * Audit "wajib vs nullable": memastikan setiap route `buildCrudHandlers`
 * tidak pernah mengirim `null` ke kolom Prisma yang tidak boleh null.
 *
 * Bug yang dicegah:
 *   StockOutTransaction.requestedBy  -> `body.requestedBy || null` -> HTTP 500
 *   Booking.endDate / Booking.location -> `|| null` -> HTTP 500
 *
 * Kolom dianggap perlu-periksa bila:
 *   - tipe-nya primitive (bukan `?`, bukan `[]`, bukan relasi)
 *   - tidak punya `@default(`
 *   - route mengirim `|| null` / `?? null` untuk kolom itu
 *
 * Jalankan:  node scripts/audit-required-fields.js
 * Exit 1 bila ada ketidakcocokan -> dipakai sebagai gerbang build.
 */

const fs = require('fs');
const path = require('path');

const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

/** Kumpulkan model Prisma -> nama kolom wajib (tanpa default). */
function requiredColumns(model) {
  const pascal = model[0].toUpperCase() + model.slice(1);
  const re = new RegExp('model\\s+' + pascal + '\\s*\\{([\\s\\S]*?)\\n\\}');
  const block = re.exec(schema);
  if (!block) return null;

  const cols = [];
  for (const line of block[1].split(/\r?\n/)) {
    // Tangkap tanda `?` pada tipe (String?, Int?, [X]?, relasi).
    const m = /^\s{2}(\w+)\s+(\??[\w.]+)(\?)?\s*(@.*)?$/.exec(line);
    if (!m) continue;
    const [, name, type, qmark, attrs] = m;
    if (attrs && /@default\(/.test(attrs)) continue;
    if (type === 'DateTime' || type === 'Json' || type === 'Bytes') continue;
    cols.push({ name, nullable: Boolean(qmark) });
  }
  return cols;
}

function walkRoutes(dir, acc = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (f !== 'node_modules') walkRoutes(p, acc);
    } else if (f === 'route.ts') acc.push(p);
  }
  return acc;
}

const problems = [];

for (const file of walkRoutes('src/app/api')) {
  const text = fs.readFileSync(file, 'utf8');
  const modelMatch = /model:\s*'(\w+)'/.exec(text);
  if (!modelMatch) continue;

  const model = modelMatch[1];
  const cols = requiredColumns(model);
  if (!cols) continue;

  const lines = text.split(/\r?\n/);

  for (const col of cols) {
    if (col.nullable) continue;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Hanya baris yang benar-benar meng-assign kolom ini.
      const assigns = new RegExp('^\\s*' + col.name + '\\s*:').test(line);
      if (!assigns) continue;
      // Baris yangPADATAN dengan null (bukan yang memanggil helper validasi).
      if (/(\|\||\?\?)\s*null\b/.test(line) || /:\s*null\s*[,}]/.test(line)) {
        problems.push(
          `${file}:${i + 1}  ->  ${model}.${col.name} (wajib, tapi route mengirim null)`,
        );
      }
    }
  }
}

console.log('=== Kolom wajib yang bisa menerima null ===');
if (!problems.length) console.log('  (bersih)');
problems.forEach((p) => console.log('  ' + p));

if (problems.length > 0) {
  console.error(`\nGAGAL: ${problems.length} kolom wajib masih bisa menerima null.`);
  process.exit(1);
}