import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, getAuthContext } from '@/lib/session';
import { ok, badRequest, serverError } from '@/lib/api';
import { toInt } from '@/lib/documents';
import { REPORT_TYPES, ReportType, REPORT_LABELS, REPORT_SEARCHABLE, allowedReportTypes } from '@/lib/reports';
import { REPORT_COLUMNS, isMoneyColumn } from '@/lib/report-columns';
import { readCompanyLogo, embedLogoInXlsx } from '@/lib/xlsx-brand';
import { COMPANY_LEGAL_NAME, COMPANY_DISPLAY_NAME, COMPANY_TAGLINE } from '@/lib/config';
import { formatDate } from '@/lib/format';
import * as XLSX from 'xlsx';

/**
 * Ekspor laporan — seluruh berkas memuat logo perusahaan.
 *
 * - `.xlsx` : logo benar-benar disematkan (injeksi OOXML) + kop perusahaan.
 * - `.csv`  : CSV tidak mendukung gambar, identitas perusahaan ditulis sebagai
 *             baris metadata di atas header kolom.
 *
 * Filter yang sama dengan halaman Reporting (search, rentang tanggal).
 */
export async function GET(req: NextRequest) {
  const authError = await requirePermission(req, 'reporting', 'read');
  if (authError) return authError;

  try {
    const auth = await getAuthContext(req);
    if (!auth) return badRequest('Anda belum login.');

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || '';
    const format = (searchParams.get('format') || 'xlsx').toLowerCase();

    if (!(REPORT_TYPES as readonly string[]).includes(type)) {
      return badRequest(`Jenis laporan tidak valid. Valid: ${REPORT_TYPES.join(', ')}`);
    }
    if (!allowedReportTypes(auth.divisionCode, auth.role).includes(type as ReportType)) {
      return badRequest('Laporan ini tidak tersedia untuk divisi Anda.');
    }

    const search = (searchParams.get('search') || '').trim();
    const dateFrom = searchParams.get('date_from') || '';
    const dateTo = searchParams.get('date_to') || '';
    const limit = Math.min(2000, Math.max(1, toInt(searchParams.get('limit'), 500)));

    const where: any = {};
    if (dateFrom || dateTo) {
      where.date = {
        gte: dateFrom ? new Date(dateFrom) : new Date('1970-01-01'),
        lte: dateTo ? new Date(`${dateTo}T23:59:59.999`) : new Date('2999-12-31'),
      };
    }
    if (search) {
      where.OR = REPORT_SEARCHABLE[type as ReportType].map((f) => ({ [f]: { contains: search } }));
    }

    const rows = await loadRows(type as ReportType, where, limit);
    const cols = REPORT_COLUMNS[type] ?? [];
    const stamp = new Date().toISOString().slice(0, 10);

    // ---------- CSV ----------
    if (format === 'csv') {
      const meta = [
        `# ${COMPANY_LEGAL_NAME}`,
        `# ${REPORT_LABELS[type as ReportType]}`,
        `# Divisi: ${auth.division}`,
        `# Periode: ${dateFrom || '-'} s.d. ${dateTo || '-'}`,
        `# Dicetak: ${formatDate(new Date())} oleh ${auth.name}`,
        `# Logo perusahaan: /pict/xh_logo_1.png`,
      ];
      const header = cols.map((c) => c.header).join(',');
      const body = rows.map((r) =>
        cols
          .map((c) => {
            const raw = (r as any)[c.key];
            const v = isMoneyColumn(c) && typeof raw === 'number'
              ? new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(raw)
              : raw === null || raw === undefined
                ? ''
                : String(raw);
            return `"${v.replace(/"/g, '""')}"`;
          })
          .join(','),
      );
      const csv = '\ufeff' + [...meta, header, ...body].join('\n') + '\n';
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${type}-${stamp}.csv"`,
        },
      });
    }

    // ---------- XLSX ----------
    const wb = XLSX.utils.book_new();

    // Sheet data harus sheet PERTAMA supaya logo langsung terlihat saat dibuka.
    type Cell = string | number;
    const aoa: Cell[][] = [cols.map((c) => c.header) as Cell[]];
    for (const row of rows) {
      aoa.push(
        cols.map((c) => {
          const raw = (row as any)[c.key];
          if (isMoneyColumn(c)) return typeof raw === 'number' ? raw : raw == null ? 0 : Number(raw);
          if (c.type === 'number') return raw == null ? 0 : Number(raw);
          if (c.type === 'date' || c.type === 'datetime') {
            if (!raw) return '-';
            const d = new Date(raw);
            return Number.isNaN(d.getTime()) ? String(raw) : formatDate(d);
          }
          return raw === null || raw === undefined || raw === '' ? '-' : String(raw);
        }) as Cell[],
      );
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = cols.map((c) => ({ wch: c.width ?? Math.max(12, c.header.length + 4) }));
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan');

    // Sheet kop berisi identitas perusahaan + ringkasan pencetakan.
    const kop: Cell[][] = [
      [COMPANY_LEGAL_NAME],
      [REPORT_LABELS[type as ReportType]],
      [COMPANY_TAGLINE],
      [],
      ['Divisi', auth.division],
      ['Periode', `${dateFrom || '-'} s.d. ${dateTo || '-'}`],
      ['Dicetak oleh', `${auth.name} (${auth.roleName})`],
      ['Tanggal cetak', formatDate(new Date())],
      ['Total data', String(rows.length)],
      [],
      [`© ${new Date().getFullYear()} ${COMPANY_LEGAL_NAME}. Seluruh hak cipta dilindungi.`],
    ];
    const wsKop = XLSX.utils.aoa_to_sheet(kop);
    wsKop['!cols'] = [{ wch: 20 }, { wch: 52 }];
    XLSX.utils.book_append_sheet(wb, wsKop, 'Kop');

    let buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const logo = readCompanyLogo();
    if (logo) {
      try {
        buf = embedLogoInXlsx(Buffer.from(buf), XLSX, {
          logoBytes: logo,
          logoMime: logo[0] === 0x3c ? 'image/svg+xml' : 'image/png',
          logoExt: logo[0] === 0x3c ? 'svg' : 'png',
          companyName: COMPANY_LEGAL_NAME,
          width: 200,
          height: 56,
        });
      } catch (e: any) {
        console.error('[reports/export] gagal menyematkan logo:', e?.message);
      }
    }

    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${type}-${stamp}.xlsx"`,
      },
    });
  } catch (error: any) {
    return serverError(error.message);
  }
}

const db = prisma as unknown as Record<string, any>;

async function loadRows(type: ReportType, where: any, limit: number): Promise<any[]> {
  switch (type) {
    case 'headset':
      return db.transactionItem.findMany({ where, orderBy: { id: 'desc' }, take: limit });
    case 'damaged':
      return db.damagedItem.findMany({ where, orderBy: { id: 'desc' }, take: limit });
    case 'stocks':
      return db.inventoryStock.findMany({ where, orderBy: { updatedAt: 'desc' }, take: limit });
    case 'purchase_request':
      return db.purchaseRequest.findMany({ where, orderBy: { date: 'desc' }, take: limit });
    case 'delivery_order':
      return db.deliveryOrder.findMany({ where, orderBy: { id: 'desc' }, take: limit });
    case 'submission':
      return db.vendorSubmission.findMany({ where, orderBy: { id: 'desc' }, take: limit });
    case 'laptops':
      return db.laptopAsset.findMany({ where, orderBy: { date: 'desc' }, take: limit });
    case 'employees':
      return db.employee.findMany({ where, orderBy: { name: 'asc' }, take: limit });
    case 'leave_requests':
      return db.leaveRequest.findMany({ where, orderBy: { id: 'desc' }, take: limit });
    case 'findings':
      return db.finding.findMany({ where, orderBy: { id: 'desc' }, take: limit });
    case 'recording_reviews':
      return db.recordingReview.findMany({ where, orderBy: { id: 'desc' }, take: limit });
    default:
      return [];
  }
}