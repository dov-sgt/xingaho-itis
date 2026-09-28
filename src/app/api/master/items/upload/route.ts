import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/session';
import { ok, badRequest, serverError } from '@/lib/api';
import { NextRequest } from 'next/server';
import * as XLSX from 'xlsx';

export async function POST(req: NextRequest) {
  const authError = requirePermission(req, 'master_item', 'create');
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

    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const code = String(row.code || row.Code || '').trim();
        const typeItem = String(row.typeItem || row['Tipe Item'] || 'Others').trim();
        const namaItem = String(row.namaItem || row['Nama Item'] || row.name || '').trim();
        const brand = String(row.brand || row.Brand || '-').trim();

        if (!code || !namaItem) {
          results.failed++;
          results.errors.push(`Baris ${i + 2}: Code dan Nama Item wajib diisi`);
          continue;
        }

        // Check if code already exists
        const existing = await prisma.masterItem.findUnique({ where: { code } });
        if (existing) {
          // Update existing
          await prisma.masterItem.update({
            where: { code },
            data: { typeItem, namaItem, brand, updateAt: new Date(), updateBy: 'SuperAdmin (Excel)' },
          });
        } else {
          // Create new
          await prisma.masterItem.create({
            data: { code, typeItem, namaItem, brand, updateBy: 'SuperAdmin (Excel)' },
          });
        }
        results.success++;
      } catch (err: any) {
        results.failed++;
        results.errors.push(`Baris ${i + 2}: ${err.message}`);
      }
    }

    return ok(results);
  } catch (error: any) {
    return serverError(error.message);
  }
}
