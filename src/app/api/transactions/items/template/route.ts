import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/session';
import { badRequest } from '@/lib/api';
import { HEADSET_IMPORT_COLUMNS } from '@/lib/headset-template';
import { COMPANY_LEGAL_NAME, COMPANY_DISPLAY_NAME } from '@/lib/config';
import * as XLSX from 'xlsx';

/**
 * Template import Headset User (item 7).
 *
 * Header kolom PERSIS sama dengan yang dibaca `POST /api/transactions/items/upload`:
 *   date, nik, name, vendor, project, deposit, condition, employeeCategory, note
 *
 * Berkas .xlsx sengaja TIDAK diberi gambar logo agar kolom data tetap bersih
 * untuk langsung diimpor; identitas perusahaan ditulis di sheet "Petunjuk".
 */

export async function GET(req: NextRequest) {
  const authError = await requirePermission(req, 'transaction_headset', 'create');
  if (authError) return authError;

  try {
    // ---------- CSV ----------
    // CSV tidak mendukung gambar, jadi identitas perusahaan ditulis sebagai
    // baris metadata di atas header kolom.
    if (req.nextUrl.searchParams.get('format') === 'csv') {
      const header = HEADSET_IMPORT_COLUMNS.join(',');
      const lines = [
        `# ${COMPANY_DISPLAY_NAME}`,
        `# Template Import Headset User - ${COMPANY_LEGAL_NAME}`,
        header,
      ];
      const csv = lines.join('\n') + '\n';
      return new NextResponse('\ufeff' + csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="template-import-headset-user.csv"',
        },
      });
    }

    // ---------- XLSX ----------
    const wb = XLSX.utils.book_new();

    // Sheet 1: data siap isi.
    // Baris 1-2 adalah kop perusahaan (teks saja, tanpa gambar agar kolom
    // data tetap bersih), baris 3 adalah header kolom yang dibaca importer.
    type Cell = string | number;
    const headerRow = [...HEADSET_IMPORT_COLUMNS] as Cell[];

    const example1: Cell[] = [
      '2026-01-15', '1234567890', 'Budi Santoso', 'Swapro', 'GoTo',
      100000, 'New Use', 'New Employee', 'Contoh baris 1 - hapus sebelum import',
    ];
    const example2: Cell[] = [
      '2026-01-16', '0987654321', 'Siti Aminah', 'Swapro', 'GoTo',
      150000, 'Exchange', 'Existing Employee', 'Contoh baris 2 - hapus sebelum import',
    ];

    const aoa: Cell[][] = [
      [COMPANY_LEGAL_NAME, ...headerRow.slice(1)],
      [`Template Import Headset User - ${COMPANY_DISPLAY_NAME}`, ...headerRow.slice(1)],
      headerRow,
      example1,
      example2,
    ];

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [
      { wch: 28 },
      { wch: 16 },
      { wch: 24 },
      ...headerRow.slice(3).map((c) => ({ wch: Math.max(15, String(c).length + 4) })),
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Data Headset');

    // Sheet 2: petunjuk.
    const guide: (string | number)[][] = [
      [`${COMPANY_LEGAL_NAME}`],
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
      ['1. Baris contoh (baris 4 dan 5) HAPUS sebelum mengunggah file.'],
      ['2. Jangan mengubah nama kolom header pada baris 3.'],
      ['3. Status awal setiap data adalah "Pending", lalu diubah ke "Used" saat pengajuan disetujui.'],
      [`4. Simpan file dalam format .xlsx lalu unggah di menu Headset User - ${COMPANY_LEGAL_NAME}.`],
    ];
    const wsGuide = XLSX.utils.aoa_to_sheet(guide);
    wsGuide['!cols'] = [{ wch: 26 }, { wch: 12 }, { wch: 86 }];
    XLSX.utils.book_append_sheet(wb, wsGuide, 'Petunjuk');

    // Catatan: berkas .xlsx sengaja TIDAK diberi gambar logo - kolom data
    // harus tetap bersih agar bisa langsung dipakai olah/import.
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