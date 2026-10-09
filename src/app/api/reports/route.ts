import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, getAuthContext } from '@/lib/session';
import { ok, badRequest, serverError } from '@/lib/api';
import { toInt } from '@/lib/documents';
import {
  REPORT_TYPES,
  ReportType,
  REPORT_SEARCHABLE,
  allowedReportTypes,
} from '@/lib/reports';

/**
 * API Reporting.
 *
 * Tanpa `?type=` -> mengembalikan daftar laporan yang boleh diakses oleh divisi
 * user. Dengan `?type=...` -> mengembalikan data laporan tersebut.
 *
 * Divisi & role selalu berasal dari database (session), bukan dari input user.
 */
export async function GET(req: NextRequest) {
  const authError = await requirePermission(req, 'reporting', 'read');
  if (authError) return authError;

  try {
    const auth = await getAuthContext(req);
    if (!auth) return badRequest('Sesi tidak valid.');

    const { searchParams } = new URL(req.url);
    const allowed = allowedReportTypes(auth.divisionCode, auth.role);

    const type = searchParams.get('type');
    if (!type) return ok({ division: auth.division, types: allowed });

    if (!(REPORT_TYPES as readonly string[]).includes(type)) {
      return badRequest(`Jenis laporan tidak valid. Valid: ${REPORT_TYPES.join(', ')}`);
    }
    if (!allowed.includes(type as ReportType)) {
      return badRequest('Laporan ini tidak tersedia untuk divisi Anda.');
    }

    const search = (searchParams.get('search') || '').trim();
    const dateFrom = searchParams.get('date_from') || '';
    const dateTo = searchParams.get('date_to') || '';
    const page = Math.max(1, toInt(searchParams.get('page'), 1));
    const pageSize = Math.min(500, Math.max(1, toInt(searchParams.get('pageSize'), 25)));

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

    const skip = (page - 1) * pageSize;

    const db = prisma as unknown as Record<string, any>;

const run = async (model: string, orderBy: any, include?: any) => {
      const [data, total] = await Promise.all([
        db[model].findMany({ where, orderBy, skip, take: pageSize, ...(include ? { include } : {}) }),
        db[model].count({ where }),
      ]);
      return { data, pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } };
    };

    switch (type as ReportType) {
      case 'headset':
        return ok(await run('transactionItem', { id: 'desc' }));
      case 'damaged':
        return ok(await run('damagedItem', { id: 'desc' }));
      case 'stocks':
        return ok(await run('inventoryStock', { updatedAt: 'desc' }));
      case 'purchase_request':
        return ok(await run('purchaseRequest', { date: 'desc' }, { items: { orderBy: { sortOrder: 'asc' } } }));
      case 'delivery_order':
        return ok(await run('deliveryOrder', { id: 'desc' }));
      case 'submission':
        return ok(await run('vendorSubmission', { id: 'desc' }));
      case 'laptops':
        return ok(await run('laptopAsset', { date: 'desc' }));
      case 'employees':
        return ok(await run('employee', { name: 'asc' }));
      case 'leave_requests':
        return ok(await run('leaveRequest', { id: 'desc' }));
      case 'findings':
        return ok(await run('finding', { id: 'desc' }));
      case 'recording_reviews':
        return ok(await run('recordingReview', { id: 'desc' }));
      default:
        return badRequest('Jenis laporan tidak dikenal.');
    }
  } catch (error: any) {
    return serverError(error.message);
  }
}