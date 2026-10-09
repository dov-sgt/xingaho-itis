import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

/**
 * Menyematkan logo perusahaan ke dalam file .xlsx.
 *
 * SheetJS edisi komunitas TIDAK mendukung menulis gambar, jadi kita memakai
 * teknik injeksi OOXML:
 *   1. `XLSX.read(buf, { bookFiles: true })` untuk membongkar isi zip
 *   2. tambahkan part gambar + drawing + rels
 *   3. tulis ulang zip dengan penulis ZIP minimal (lihat `writeZip`)
 *
 * Hasilnya file .xlsx yang tetap valid dan logo tampil di sheet pertama.
 */

/* ------------------------------------------------------------------ */
/* Penulis ZIP minimal (deflate)                                       */
/* ------------------------------------------------------------------ */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** Tanggal tetap agar output deterministik (tidak ada clock lokal). */
const DOS_TIME = 0;
const DOS_DATE = 0x21; // 1 Januari 1980

export function writeZip(entries: { name: string; data: Buffer }[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const e of entries) {
    const nameBuf = Buffer.from(e.name, 'utf8');
    const comp = zlib.deflateRawSync(e.data, { level: 9 });
    const crc = crc32(e.data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8 filenames
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(comp.length, 18);
    local.writeUInt32LE(e.data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);

    locals.push(local, nameBuf, comp);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0); // signature
    cd.writeUInt16LE(20, 4); // version made by
    cd.writeUInt16LE(20, 6); // version needed
    cd.writeUInt16LE(0x0800, 8); // flags: UTF-8 filename
    cd.writeUInt16LE(8, 10); // method: deflate
    cd.writeUInt16LE(DOS_TIME, 12);
    cd.writeUInt16LE(DOS_DATE, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(comp.length, 20);
    cd.writeUInt32LE(e.data.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt16LE(0, 30); // extra field length
    cd.writeUInt16LE(0, 32); // comment length
    cd.writeUInt16LE(0, 34); // disk number start
    cd.writeUInt16LE(0, 36); // internal attributes
    cd.writeUInt32LE(0, 38); // external attributes
    cd.writeUInt32LE(offset, 42); // relative offset of local header
    centrals.push(cd, nameBuf);

    offset += local.length + nameBuf.length + comp.length;
  }

  const centralBuf = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...locals, centralBuf, eocd]);
}

/* ------------------------------------------------------------------ */
/# Logo                                                                */
/* ------------------------------------------------------------------ */

/** Baca logo dari folder public; null bila file tidak ada. */
export function readCompanyLogo(): Buffer | null {
  const candidates = [
    path.join(process.cwd(), 'public', 'pict', 'xh_logo_1.png'),
    path.join(process.cwd(), 'public', 'pict', 'xh_logo.svg'),
  ];
  for (const p of candidates) {
    try {
      const buf = fs.readFileSync(p);
      if (buf.length > 0) return buf;
    } catch {
      /* coba berikutnya */
    }
  }
  return null;
}

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c] as string,
  );
}

/* ------------------------------------------------------------------ */
/# Injeksi                                                             */
/* ------------------------------------------------------------------ */

type SheetEntry = { name: string; data: Buffer };

/**
 * Sisipkan logo ke sheet pertama workbook.
 *
 * @param xlsxBuffer  buffer .xlsx hasil XLSX.write
 * @param XLSX        instance library `xlsx` (dioper agar tidak di-import
 *                    dua kali oleh modul lain)
 * @param opts.logoBytes    isi file logo (PNG)
 * @param opts.logoMime     tipe MIME
 * @param opts.logoExt      ekstensi file (png/svg)
 * @param opts.companyName  nama perusahaan untuk alt-text
 * @param opts.rows         jumlah baris yang akan digeser agar logo tidak
 *                          menutupi data (0 = logo mengambang di kanan atas)
 */
export function embedLogoInXlsx(
  xlsxBuffer: Buffer,
  XLSX: any,
  opts: {
    logoBytes: Buffer;
    logoMime?: string;
    logoExt?: string;
    companyName?: string;
    /** Lebar logo dalam piksel. */
    width?: number;
    /** Tinggi logo dalam piksel. */
    height?: number;
    /** Kolom anchor (0-based). */
    fromCol?: number;
    fromRow?: number;
  },
): Buffer {
  const {
    logoBytes,
    logoMime = 'image/png',
    logoExt = 'png',
    companyName = 'Logo Perusahaan',
    width = 140,
    height = 52,
    fromCol = 0,
    fromRow = 0,
  } = opts;

  const wb = XLSX.read(xlsxBuffer, { type: 'buffer', bookFiles: true });
  const files = wb.files as Record<string, { name: string; content: Buffer }>;

  // Pastikan ada worksheet; tanpa ini tidak ada yang bisa di-anchor.
  const sheetKeys = Object.keys(files).filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/.test(k));
  if (!sheetKeys.length) return xlsxBuffer;
  const sheetKey = sheetKeys[0];

  const EMU_PER_PIXEL = 9525;
  const drawingRelId = 'rIdLogo1';
  const imageRelId = 'rId1';
  const toCol = fromCol + 3;
  const toRow = fromRow + 2;

  const drawingXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><xdr:twoCellAnchor><xdr:from><xdr:col>${fromCol}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${fromRow}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>${toCol}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${toRow}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="1" name="Logo" descr="${escapeXml(companyName)}"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="${imageRelId}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${width * EMU_PER_PIXEL}" cy="${height * EMU_PER_PIXEL}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:twoCellAnchor></xdr:wsDr>`;

  const drawingRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="${imageRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.${logoExt}"/></Relationships>`;

  const sheetRelsPath = `xl/worksheets/_rels/${path.basename(sheetKey)}.rels`;
  const existingSheetRels = files[sheetRelsPath]?.content?.toString('utf8');
  let sheetRels: string;
  if (existingSheetRels) {
    // Sisipkan relasi baru sebelum </Relationships>.
    sheetRels = existingSheetRels.replace(
      '</Relationships>',
      `<Relationship Id="${drawingRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>`,
    );
  } else {
    sheetRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="${drawingRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>`;
  }

  // Tambahkan <drawing/> sebagai elemen terakhir di dalam <worksheet>.
  let sheetXml = files[sheetKey].content.toString('utf8');
  if (!sheetXml.includes('xmlns:r=')) {
    sheetXml = sheetXml.replace(
      '<worksheet ',
      '<worksheet xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ',
    );
  }
  sheetXml = sheetXml.replace(/<drawing [^>]*\/>/g, ''); // jangan dobel
  sheetXml = sheetXml.replace('</worksheet>', `<drawing r:id="${drawingRelId}"/></worksheet>`);

  // Content types: png sudah punya Default di SheetJS, sisakan drawing + media.
  let contentTypes = files['[Content_Types].xml'].content.toString('utf8');
  if (!contentTypes.includes(`Extension="${logoExt}"`)) {
    contentTypes = contentTypes.replace(
      '<Default Extension="xml"',
      `<Default Extension="${logoExt}" ContentType="${logoMime}"/><Default Extension="xml"`,
    );
  }
  if (!contentTypes.includes('/xl/drawings/drawing1.xml')) {
    contentTypes = contentTypes.replace(
      '</Types>',
      '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>',
    );
  }

  // Rakit ulang seluruh part. SheetJS menyisipkan satu entri metadata tanpa
  // `content` — part seperti itu dilewati.
  const out: SheetEntry[] = [];
  for (const [key, entry] of Object.entries(files)) {
    if (!key || !entry?.content) continue;
    if (key === sheetKey || key === '[Content_Types].xml' || key === sheetRelsPath) continue;
    out.push({ name: key, data: Buffer.from(entry.content) });
  }
  out.push({ name: `[Content_Types].xml`, data: Buffer.from(contentTypes, 'utf8') });
  out.push({ name: `xl/media/image1.${logoExt}`, data: logoBytes });
  out.push({ name: 'xl/drawings/drawing1.xml', data: Buffer.from(drawingXml, 'utf8') });
  out.push({ name: 'xl/drawings/_rels/drawing1.xml.rels', data: Buffer.from(drawingRels, 'utf8') });
  out.push({ name: sheetRelsPath, data: Buffer.from(sheetRels, 'utf8') });
  out.push({ name: sheetKey, data: Buffer.from(sheetXml, 'utf8') });

  return writeZip(out);
}