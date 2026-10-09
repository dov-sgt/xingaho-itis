import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/session';
import { badRequest } from '@/lib/api';
import { HEADSET_IMPORT_COLUMNS } from '@/lib/headset-template';
import * as XLSX from 'xlsx';

/**
 * Template import Headset User (item 7).
 *
 * Header kolom PERSIS sama dengan yang dibaca `POST /api/transactions/items/upload`:
 *   date, nik, name, vendor, project, deposit, condition, employeeCategory, note
 *
 * Formatted Excel (.xlsx) berisi 2 baris contoh + sheet "Petunjuk".
 */

const EXAMPLES = [
  {
    date: '2026-01-15',
    nik: '1234567890',
    name: 'Budi Santoso',
    vendor: 'Swapro',
    project: 'GoTo',
    deposit: 100000,
    condition: 'New Use',
    employeeCategory: 'New Employee',
    note: 'Contoh baris 1 — hapus sebelum import',
  },
  {
    date: '2026-01-16',
    nik: '0987654321',
    name: 'Siti Aminah',
    vendor: 'Swapro',
    project: 'GoTo',
    deposit: 150000,
    condition: 'Exchange',
    employeeCategory: 'Existing Employee',
    note: 'Contoh baris 2 — hapus sebelum import',
  },
];

export async function GET(req: NextRequest) {
  const authError = await requirePermission(req, 'transaction_headset', 'create');
  if (authError) return authError;

  try {
    if (req.nextUrl.searchParams.get('format') === 'csv') {
      const header = HEADSET_IMPORT_COLUMNS.join(',');
      const lines = EXAMPLES.map((e) =>
        HEADSET_IMPORT_COLUMNS.map((c) => `"${String((e as Record<string, unknown>)[c]).replace(/"/g, '""')}"`).join(','),
      );
      const csv = `${header}\n${lines.join('\n')}\n`;
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="template-import-headset-user.csv"',
        },
      });
    }

    const wb = XLSX.utils.book_new();

    // Sheet 1: data siap isi (header baris 1 = nama kolom yang dibaca importer)
    const ws = XLSX.utils.json_to_sheet([...EXAMPLES], { header: [...HEADSET_IMPORT_COLUMNS] });
    ws['!cols'] = HEADSET_IMPORT_COLUMNS.map((c) => ({ wch: Math.max(14, c.length + 4) }));
    XLSX.utils.book_append_sheet(wb, ws, 'Data Headset');

    // Sheet 2: petunjuk pengisian
    const guide = [
      ['PETUNJUK PENGISIAN TEMPLATE IMPORT HEADSET USER'],
      [''],
      ['Kolom', 'Wajib', 'Keterangan'],
      ['date', 'Tidak', 'Tanggal peminjaman format YYYY-MM-DD. Kosongkan untuk memakai tanggal hari ini.'],
      ['nik', 'YA', 'Nomor Induk Karyawan. Wajib diisi.'],
      ['name', 'YA', 'Nama lengkap karyawan. Wajib diisi.'],
      ['vendor', 'Tidak', 'Pemasok headset. Default: Swapro'],
      ['project', 'Tidak', 'Project penempatan. Default: GoTo'],
      ['deposit', 'Tidak', 'Nominal deposit Rupiah, tanpa titik pemisah. Default: 100000'],
      ['condition', 'Tidak', 'New Use | Exchange | Broken | Missing. Default: New Use'],
      ['employeeCategory', 'Tidak', 'New Employee | Existing Employee. Default: New Employee'],
      ['note', 'Tidak', 'Catatan bebas. Default: -'],
      [''],
      ['CATATAN PENTING'],
      ['1. Baris contoh (baris 2 dan 3) HAPUS sebelum mengunggah file.'],
      ['2. Jangan mengubah nama kolom header.'],
      ['3. Status awal setiap data adalah "Pending", lalu diubah ke "Used" saat pengajuan disetujui.'],
      ['4. Simpan file dalam format .xlsx lalu unggah di menu Headset User.'],
    ];
    const wsGuide = XLSX.utils.aoa_to_sheet(guide);
    wsGuide['!cols'] = [{ wch: 20 }, { wch: 10 }, { wch: 80 }];
    XLSX.utils.book_append_sheet(wb, wsGuide, 'Petunjuk');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="template-import-headset-user.xlsx"',
      },
    });
  } catch (error: any) {
    return badRequest(error.message ?? 'Gagal membuat template');
  }
}