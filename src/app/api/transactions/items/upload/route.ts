import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/session';
import { ok, badRequest, serverError } from '@/lib/api';
import { HEADSET_IMPORT_DEFAULTS, pickCell } from '@/lib/headset-template';
import * as XLSX from 'xlsx';

/**
 * Import data Headset User dari Excel/CSV.
 *
 * Format kolom didefinisikan di `src/lib/headset-template.ts` - sumber yang sama
 * dipakai oleh endpoint template (item 7), sehingga template yang diunduh
 * selalu bisa langsung di-import tanpa error.
 */
export async function POST(req: NextRequest) {
  const authError = await requirePermission(req, 'transaction_headset', 'create');
  if (authError) return authError;

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return badRequest('File tidak ditemukan');

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as any[];

    if (rows.length === 0) return badRequest('File Excel kosong atau tidak memiliki data.');

    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const lineNo = i + 2;
      try {
        const nik = pickCell(row, 'nik');
        const name = pickCell(row, 'name');

        if (!nik || !name) {
          results.failed++;
          results.errors.push(`Baris ${lineNo}: kolom "nik" dan "name" wajib diisi.`);
          continue;
        }

        const depositRaw = pickCell(row, 'deposit');
        const deposit = depositRaw ? parseFloat(depositRaw.replace(/[^\d.]/g, '')) || 0 : HEADSET_IMPORT_DEFAULTS.deposit;
        if (deposit < 0) {
          results.failed++;
          results.errors.push(`Baris ${lineNo}: deposit tidak boleh negatif.`);
          continue;
        }

        await prisma.transactionItem.create({
          data: {
            date: pickCell(row, 'date') || HEADSET_IMPORT_DEFAULTS.date,
            nik,
            name,
            vendor: pickCell(row, 'vendor') || HEADSET_IMPORT_DEFAULTS.vendor,
            project: pickCell(row, 'project') || HEADSET_IMPORT_DEFAULTS.project,
            deposit,
            condition: pickCell(row, 'condition') || HEADSET_IMPORT_DEFAULTS.condition,
            employeeCategory: pickCell(row, 'employeeCategory') || HEADSET_IMPORT_DEFAULTS.employeeCategory,
            note: pickCell(row, 'note') || HEADSET_IMPORT_DEFAULTS.note,
            // Data hasil import selalu Pending lalu di-approve -> Used (item 11).
            status: 'Pending',
            updatedBy: 'Import Excel',
          },
        });
        results.success++;
      } catch (err: any) {
        results.failed++;
        results.errors.push(`Baris ${lineNo}: ${err.message}`);
      }
    }

    return ok(results);
  } catch (error: any) {
    return serverError(error.message);
  }
}