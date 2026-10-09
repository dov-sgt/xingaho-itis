import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/session';
import { ok, badRequest, serverError } from '@/lib/api';
import { NextRequest } from 'next/server';
import * as XLSX from 'xlsx';
import { generateItemCode } from '@/lib/item-code';

/**
 * Import Master Item dari Excel/CSV.
 *
 * Item 3: kolom `code` OPSIONAL. Kalau kosong, server menggenerate kode
 * XHIT-<KATEGORI><YY><MM>-<URUT>. SELURUH baris diproses di dalam SATU
 * transaksi supaya counter tidak naik pada baris yang gagal, dan nomor urut
 * tetap berurutan walau ada 50 baris sekaligus.
 *
 * Kolom `code` yang diisi akan dipakai apa adanya (backward compatible).
 */
export async function POST(req: NextRequest) {
  const authError = await requirePermission(req, 'master_item', 'create');
  if (authError) return authError;

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return badRequest('File tidak ditemukan');

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet) as any[];

    if (rows.length === 0) return badRequest('File Excel kosong');

    const results = { success: 0, updated: 0, created: 0, failed: 0, errors: [] as string[] };

    // Parsing + validasi dulu di luar transaksi supaya pesan error jelas.
    type Parsed = { row: number; code: string; typeItem: string; namaItem: string; brand: string; price: number | null };
    const parsed: Parsed[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const code = String(row.code ?? row.Code ?? row.kode ?? '').trim();
      const typeItem = String(row.typeItem ?? row['Tipe Item'] ?? row.kategori ?? row.Kategori ?? 'Others').trim();
      const namaItem = String(row.namaItem ?? row['Nama Item'] ?? row.name ?? row.nameItem ?? '').trim();
      const brand = String(row.brand ?? row.Brand ?? '-').trim();

      const priceRaw = row.price ?? row.Price ?? row.harga ?? row.Harga;
      const price =
        priceRaw === undefined || priceRaw === null || String(priceRaw).trim() === ''
          ? null
          : parseFloat(String(priceRaw).replace(/[^\d.]/g, ''));

      if (price !== null && (!Number.isFinite(price) || price < 0)) {
        results.failed++;
        results.errors.push(`Baris ${i + 2}: harga harus berupa angka dan tidak boleh negatif`);
        continue;
      }

      if (!namaItem) {
        results.failed++;
        results.errors.push(`Baris ${i + 2}: Nama Item wajib diisi (kode boleh dikosongkan)`);
        continue;
      }

      parsed.push({ row: i + 2, code, typeItem, namaItem, brand, price });
    }

    if (parsed.length === 0) return ok(results);

    // Satu transaksi untuk semua baris valid.
    await prisma.$transaction(async (tx) => {
      for (const p of parsed) {
        try {
          if (p.code) {
            const existing = await tx.masterItem.findUnique({ where: { code: p.code } });
            if (existing) {
              await tx.masterItem.update({
                where: { code: p.code },
                data: {
                  typeItem: p.typeItem,
                  namaItem: p.namaItem,
                  brand: p.brand,
                  price: p.price,
                  updateAt: new Date(),
                  updateBy: 'SuperAdmin (Excel)',
                },
              });
              results.updated++;
            } else {
              await tx.masterItem.create({
                data: {
                  code: p.code,
                  typeItem: p.typeItem,
                  namaItem: p.namaItem,
                  brand: p.brand,
                  price: p.price,
                  updateBy: 'SuperAdmin (Excel)',
                },
              });
              results.created++;
            }
          } else {
            // Kode kosong -> generate. Counter naik di dalam transaksi ini.
            const generated = await generateItemCode(tx, p.typeItem);
            await tx.masterItem.create({
              data: {
                code: generated,
                typeItem: p.typeItem,
                namaItem: p.namaItem,
                brand: p.brand,
                price: p.price,
                updateBy: 'SuperAdmin (Excel)',
              },
            });
            results.created++;
          }
          results.success++;
        } catch (err: any) {
          // Prisma membatalkan seluruh transaksi bila error ini dilempar.
          // Karena itu error per-baris dicatat, lalu di-throw agar rollback.
          results.failed++;
          results.errors.push(`Baris ${p.row}: ${err.message}`);
          throw err;
        }
      }
    }).catch((err: any) => {
      // Rollback terjadi di sini. Pesan per-baris sudah terkumpul di results.
      if (results.errors.length === 0) {
        results.errors.push(`Impor dibatalkan: ${err.message}`);
      }
    });

    return ok(results);
  } catch (error: any) {
    return serverError(error.message);
  }
}