/**
 * Generator logo PNG (`public/pict/xh_logo_1.png`).
 *
 * Menggambar monogram "XH" dengan latar rounded-rect bergradien indigo memakai
 * fungsi jarak bertanda (signed distance function) — tanpa dependensi gambar
 * eksternal, hasilnya deterministik dan tajam di ukuran berapa pun.
 *
 * Jalankan:  node scripts/generate-logo.js
 *
 * Aset ini ikut di-commit ke repository. Untuk memakai logo resmi perusahaan,
 * cukup ganti file `public/pict/xh_logo_1.png` (nama file & ukurannya tetap
 * sama), atau hapus aset ini agar sistem memakai fallback vektor.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZE = 512;

/* ---------------------------- CRC32 ---------------------------- */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

/* ------------------------ Geometri dasar ------------------------ */

/** Jarak bertanda ke persegi panjang dengan sudut membulat. */
function sdRoundRect(px, py, cx, cy, halfW, halfH, r) {
  const qx = Math.abs(px - cx) - (halfW - r);
  const qy = Math.abs(py - cy) - (halfH - r);
  const ax = Math.max(qx, 0);
  const ay = Math.max(qy, 0);
  return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - r;
}

/** Jarak titik ke garis segment. */
function sdSegment(px, py, ax, ay, bx, by) {
  const pax = px - ax;
  const pay = py - ay;
  const bax = bx - ax;
  const bay = by - ay;
  const denom = bax * bax + bay * bay;
  const h = denom === 0 ? 0 : Math.max(0, Math.min(1, (pax * bax + pay * bay) / denom));
  return Math.hypot(pax - bax * h, pay - bay * h);
}

/* --------------------- Parameter desain (viewBox 256) --------------------- */

const MARGIN = 14;      // jarak latar ke tepi
const CORNER = 46;      // radius sudut latar
const STROKE = 15;      // lebar goresan huruf

// Huruf X
const X_A = [64, 84];
const X_MID = [108, 128];
const X_B = [64, 172];

// Huruf H — dipisah jauh dari X supaya tidak bertabrakan
const H_LEFT = 150;
const H_RIGHT = 196;
const H_TOP = 84;
const H_BOTTOM = 172;
const H_CROSS_Y = 128;

const GLYPH_STROKES = [
  [X_A[0], X_A[1], X_MID[0], X_MID[1]],
  [X_MID[0], X_MID[1], X_B[0], X_B[1]],
  [H_LEFT, H_TOP, H_LEFT, H_BOTTOM],
  [H_RIGHT, H_TOP, H_RIGHT, H_BOTTOM],
  [H_LEFT, H_CROSS_Y, H_RIGHT, H_CROSS_Y],
];

/* --------------------------- Rendering -------------------------- */

const S = SIZE / 256;
const capR = (STROKE * S) / 2;

const px = new Uint8Array(SIZE * SIZE * 3);
const alpha = new Float64Array(SIZE * SIZE);

const halfBg = (128 - MARGIN) * S;
const center = SIZE / 2;

for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const i = y * SIZE + x;
    const fx = x + 0.5;
    const fy = y + 0.5;

    const dRect = sdRoundRect(fx, fy, center, center, halfBg, halfBg, CORNER * S);
    const aRect = clamp01(0.5 - dRect);
    if (aRect <= 0) continue;

    // Gradien diagonal indigo: terang di kiri atas → gelap di kanan bawah
    const t = clamp01((fx / SIZE) * 0.45 + (fy / SIZE) * 0.55);
    let r = lerp(99, 44, t);
    let g = lerp(91, 41, t);
    let b = lerp(255, 129, t);

    // Goresan huruf putih
    let dGlyph = Infinity;
    for (const [ax, ay, bx, by] of GLYPH_STROKES) {
      dGlyph = Math.min(dGlyph, sdSegment(fx, fy, ax * S, ay * S, bx * S, by * S));
    }
    const aGlyph = clamp01(0.5 - (dGlyph - capR)) * aRect;
    r = lerp(r, 255, aGlyph);
    g = lerp(g, 255, aGlyph);
    b = lerp(b, 255, aGlyph);

    px[i * 3] = Math.round(r);
    px[i * 3 + 1] = Math.round(g);
    px[i * 3 + 2] = Math.round(b);
    alpha[i] = aRect;
  }
}

// Rakit menjadi PNG 8-bit RGBA (colour type 6).
const rawRowBytes = SIZE * 4;
const rawData = Buffer.alloc(SIZE * (1 + rawRowBytes));
for (let y = 0; y < SIZE; y++) {
  const dst = y * (1 + rawRowBytes);
  rawData[dst] = 0; // filter: None
  for (let x = 0; x < SIZE; x++) {
    const i = y * SIZE + x;
    const o = dst + 1 + x * 4;
    rawData[o] = px[i * 3];
    rawData[o + 1] = px[i * 3 + 1];
    rawData[o + 2] = px[i * 3 + 2];
    rawData[o + 3] = Math.round(clamp01(alpha[i]) * 255);
  }
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // colour type RGBA
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(rawData, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

const out = path.join(__dirname, '..', 'public', 'pict', 'xh_logo_1.png');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, png);

console.log(`Logo ditulis: ${out}`);
console.log(`  ${SIZE}x${SIZE} RGBA, ${png.length} bytes`);

/* ---------------------------- Utilitas ---------------------------- */
function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}