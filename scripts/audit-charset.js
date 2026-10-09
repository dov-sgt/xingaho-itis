const fs = require('fs');
const path = require('path');

function walk(dir, acc = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (f !== 'node_modules' && f !== '.next' && f !== '.git') walk(p, acc);
    } else if (/\.(ts|tsx|js|jsx|css|md|json)$/.test(f)) acc.push(p);
  }
  return acc;
}

const files = [...walk('src'), ...walk('prisma'), ...walk('scripts'), 'AGENTS.md'].filter((f) => fs.existsSync(f));

// Pola khas mojibake: byte UTF-8 yang dibaca sebagai Windows-1252.
const MOJIBAKE = /[\u00C2-\u00C3\u00E2-\u00E3][\u0080-\u00BF\u20AC\u0192\u201A-\u201E\u2020-\u2022\u2030\u2039\u203A\u20AC]/;
const BARE_C2 = /[\u00C2]/;
const BARE_E2 = /[\u00E2]/;

const findings = [];

for (const f of files) {
  const buf = fs.readFileSync(f);
  const text = buf.toString('utf8');
  const hasBom = buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;

  // Deteksi byte tunggal 0xC2 / 0xE2 tanpa pasangan continuation -> rusak
  const loneHigh = [];
  for (let i = 0; i < text.length; i++) {
    const cp = text.codePointAt(i);
    if (cp === 0xc2 || cp === 0xe2) {
      const next = text.charCodeAt(i + 1);
      // Byte continuation UTF-8 yang valid berada di 0x80..0xBF
      const okContinuation = next >= 0x80 && next <= 0xbf;
      if (!okContinuation) loneHigh.push(i);
    }
  }

  text.split(/\r?\n/).forEach((line, i) => {
    const hasNonAscii = [...line].some((c) => c.codePointAt(0) >= 128);
    if (!hasNonAscii) return;
    const cjk = /[\u4e00-\u9fff]/;
    const flags = [];
    if (MOJIBAKE.test(line)) flags.push('MOJIBAKE');
    if (cjk.test(line)) flags.push('CJK');
    if (line.includes('\uFFFD')) flags.push('RUSAK');
    findings.push({
      f, line: i + 1, flags, text: line.trim().slice(0, 110),
    });
  });

  if (hasBom) findings.push({ f, line: 0, flags: ['BOM'], text: '(BOM di awal file)' });
  if (loneHigh.length) {
    findings.push({ f, line: 0, flags: ['LONE_C2_E2'], text: `${loneHigh.length} kemunculan` });
  }
}

const mustFix = findings.filter((x) => x.flags.some((y) => y === 'CJK' || y === 'MOJIBAKE' || y === 'RUSAK' || y === 'BOM' || y === 'LONE_C2_E2'));
const ok = findings.filter((x) => !x.flags.length);

console.log('=== YANG HARUS DIPERBAIKI ===');
if (!mustFix.length) console.log('  (bersih)');
mustFix.forEach((x) => console.log(`  [${x.flags.join(',')}] ${x.f}:${x.line}\n      ${x.text}`));

console.log(`\n=== Non-ASCII lainnya (aman, sengaja dipakai) : ${ok.length} baris ===`);
const byChar = new Map();
for (const x of ok) for (const ch of x.text) {
  const cp = ch.codePointAt(0);
  if (cp < 128) continue;
  byChar.set(ch, (byChar.get(ch) || 0) + 1);
}
[...byChar.entries()].sort((a, b) => b[1] - a[1]).forEach(([ch, n]) => {
  console.log(`  ${String(n).padStart(4)}x  U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}  ${ch}`);
});

/**
 * Gerbang build: keluar dengan kode selain 0 bila masih ada karakter rusak,
 * BOM, byte menggantung, atau karakter CJK di source. Script ini juga
 * dijalankan otomatis oleh `prebuild`.
 */
if (mustFix.length > 0) {
  console.error(`\nGAGAL: ${mustFix.length} masalah karakter ditemukan. Perbaiki sebelum build.`);
  process.exit(1);
}