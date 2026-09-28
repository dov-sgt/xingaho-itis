import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/session';
import { ok, badRequest, serverError } from '@/lib/api';
import { NextRequest } from 'next/server';
import * as XLSX from 'xlsx';

export async function POST(req: NextRequest) {
  const authError = requirePermission(req, 'transaction_item', 'create');
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
        // Expected columns: date, nik, name, vendor, project, deposit, condition, status, employeeCategory, note
        const nik = String(row.nik || row.NIK || '').trim();
        const name = String(row.name || row.Nama || row['Nama Karyawan'] || '').trim();

        if (!nik || !name) {
          results.failed++;
          results.errors.push(`Baris ${i + 2}: NIK dan Nama wajib diisi`);
          continue;
        }

        await prisma.transactionItem.create({
          data: {
            date: String(row.date || row.Tanggal || new Date().toISOString().split('T')[0]),
            employeeCategory: String(row.employeeCategory || row['Kategori Karyawan'] || 'New Employee'),
            nik,
            name,
            condition: String(row.condition || row.Kondisi || 'New Use'),
            vendor: String(row.vendor || row.Vendor || 'Swapro'),
            deposit: parseFloat(row.deposit || row.Deposit || 100000) || 100000,
            note: String(row.note || row.Catatan || '-'),
            project: String(row.project || row.Project || 'GoTo'),
            status: String(row.status || row.Status || 'Used'),
            updatedBy: 'SuperAdmin (Excel Upload)',
          },
        });
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
