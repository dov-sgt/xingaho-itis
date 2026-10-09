/**
 * Verifikasi end-to-end: semua dokumen unduhan memuat logo perusahaan.
 * Jalankan:  node scripts/verify-exports.js
 */

const XLSX = require('xlsx');
const zlib = require('zlib');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3005';

function lastIndexOfSig(b, sig) {
  for (let i = b.length - sig.length; i >= 0; i--) {
    let ok = true;
    for (let j = 0; j < sig.length; j++) if (b[i + j] !== sig[j]) { ok = false; break; }
    if (ok) return i;
  }
  return -1;
}

function zipParts(buf) {
  const eocd = lastIndexOfSig(buf, [0x50, 0x4b, 0x05, 0x06]);
  if (eocd < 0) throw new Error('EOCD tidak ditemukan');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const parts = {};
  for (let i = 0; i < count; i++) {
    const nl = buf.readUInt16LE(p + 28);
    const el = buf.readUInt16LE(p + 30);
    const cl = buf.readUInt16LE(p + 32);
    const compSize = buf.readUInt32LE(p + 20);
    const method = buf.readUInt16LE(p + 10);
    const name = buf.subarray(p + 46, p + 46 + nl).toString('utf8');
    const localOff = buf.readUInt32LE(p + 42);
    const lNameLen = buf.readUInt16LE(localOff + 26);
    const lExtraLen = buf.readUInt16LE(localOff + 28);
    const start = localOff + 30 + lNameLen + lExtraLen;
    const raw = buf.subarray(start, start + compSize);
    parts[name] = method === 0 ? raw : zlib.inflateRawSync(raw);
    p += 46 + nl + el + cl;
  }
  return parts;
}

function checkXlsx(buf, label) {
  const parts = zipParts(buf);
  const media = Object.keys(parts).filter((k) => k.includes('xl/media'));
  const drawing = Object.keys(parts).filter((k) => k.includes('drawings/'));
  const sheetHasDrawing = Object.keys(parts)
    .filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/.test(k))
    .some((k) => parts[k].toString('utf8').includes('<drawing r:id='));
  const contentTypes = parts['[Content_Types].xml']?.toString('utf8') ?? '';
  const logoBytes = media.length ? parts[media[0]].length : 0;

  // Workbook harus tetap terbaca & datanya utuh.
  let wbOk = false;
  let sheetNames = '';
  let rowCount = -1;
  try {
    const wb = XLSX.read(buf, { type: 'buffer' });
    wbOk = true;
    sheetNames = wb.SheetNames.join(', ');
    if (wb.SheetNames.length) {
      const ref = wb.Sheets[wb.SheetNames[0]]['!ref'];
      if (ref) rowCount = XLSX.utils.decode_range(ref).e.r + 1;
    }
  } catch (e) {
    wbOk = false;
  }

  const ok = media.length > 0 && drawing.length > 0 && sheetHasDrawing && wbOk;
  console.log(`  ${ok ? 'OK  ' : 'GAGAL'} ${label}`);
  console.log(`        media=${media.join(',') || '-'} (${logoBytes} bytes)`);
  console.log(`        drawing=${drawing.join(',') || '-'}`);
  console.log(`        sheet punya <drawing>=${sheetHasDrawing}, ContentTypes override=${contentTypes.includes('drawings/drawing1.xml')}`);
  console.log(`        workbook terbaca=${wbOk}, sheets=[${sheetNames}], baris sheet1=${rowCount}`);
  return ok;
}

async function main() {
  const login = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'superadmin', password: 'admin123' }),
  });
  const cookie = /xh_session=([^;]+)/.exec(login.headers.get('set-cookie') || '')?.[1];
  const H = { cookie: `xh_session=${cookie}` };

  let pass = 0;
  let fail = 0;

  console.log('=== 1. Template Import Headset (.xlsx) ===');
  {
    const res = await fetch(`${BASE}/api/transactions/items/template`, { headers: H });
    const buf = Buffer.from(await res.arrayBuffer());
    checkXlsx(buf, `template xlsx (${buf.length} bytes)`) ? pass++ : fail++;
  }

  console.log('\n=== 2. Export Laporan (.xlsx) ===');
  for (const type of ['purchase_request', 'headset', 'stocks', 'employees', 'findings', 'damaged', 'submission', 'delivery_order', 'laptops', 'leave_requests', 'recording_reviews']) {
    const res = await fetch(`${BASE}/api/reports/export?type=${type}&format=xlsx`, { headers: H });
    if (!res.ok) { console.log(`  GAGAL ${type}: HTTP ${res.status}`); fail++; continue; }
    const buf = Buffer.from(await res.arrayBuffer());
    checkXlsx(buf, `${type} (${buf.length} bytes)`) ? pass++ : fail++;
  }

  console.log('\n=== 3. Export Laporan (.csv) — identitas perusahaan di header ===');
  for (const type of ['purchase_request', 'headset']) {
    const res = await fetch(`${BASE}/api/reports/export?type=${type}&format=csv`, { headers: H });
    const txt = (await res.text()).replace(/^﻿/, '');
    const lines = txt.split('\n');
    const hasCompany = lines[0].includes('PT Xinghao Technology');
    const hasLogoRef = lines.some((l) => l.includes('xh_logo_1.png'));
    const hasHeader = lines.findIndex((l) => l && !l.startsWith('#')) >= 0;
    const ok = hasCompany && hasLogoRef && hasHeader;
    console.log(`  ${ok ? 'OK  ' : 'GAGAL'} ${type} (HTTP ${res.status})`);
    lines.slice(0, 7).forEach((l) => console.log(`        ${l.slice(0, 100)}`));
    ok ? pass++ : fail++;
  }

  console.log('\n=== 4. Template CSV ===');
  {
    const res = await fetch(`${BASE}/api/transactions/items/template?format=csv`, { headers: H });
    const txt = (await res.text()).replace(/^﻿/, '');
    const lines = txt.split('\n');
    const ok = lines[0].includes('PT Xinghao Technology') && lines.some((l) => l.includes('xh_logo_1.png'));
    console.log(`  ${ok ? 'OK  ' : 'GAGAL'} template csv (HTTP ${res.status})`);
    lines.slice(0, 6).forEach((l) => console.log(`        ${l.slice(0, 100)}`));
    ok ? pass++ : fail++;
  }

  console.log('\n=== 5. Ringkasan ===');
  console.log(`  Lulus : ${pass}`);
  console.log(`  Gagal : ${fail}`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });