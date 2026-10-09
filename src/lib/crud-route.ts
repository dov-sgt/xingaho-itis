import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from './session';
import { ok, badRequest, serverError } from './api';
import { toInt } from './documents';

/**
 * Helper CRUD generik untuk model sederhana.
 *
 * Tujuannya agar setiap route kecil tetap punya validasi akses yang sama:
 *  - `requirePermission` untuk setiap method (bukan hanya satu method)
 *  - pagination + pencarian + filter status yang seragam
 *  - pesan error berbahasa Indonesia
 */

export interface CrudRouteConfig {
  model: string;
  feature: string;
  /** Kolom yang boleh dicari. */
  searchFields: string[];
  /** Kolom tanggal untuk filter rentang. */
  dateField?: string;
  /** Kolom status. */
  statusField?: string;
  /** Validasi sebelum create/update. */
  validate?: (body: any, isUpdate: boolean) => string[];
  /** Siapkan payload create (boleh async). */
  toCreate?: (body: any) => any;
  /** Siapkan payload update (boleh async). */
  toUpdate?: (body: any) => any;
  orderBy?: any;
}

export function buildCrudHandlers(cfg: CrudRouteConfig) {
  const db = prisma as unknown as Record<string, any>;

  return {
    async GET(req: NextRequest) {
      const authError = await requirePermission(req, cfg.feature, 'read');
      if (authError) return authError;

      try {
        const { searchParams } = new URL(req.url);
        const search = (searchParams.get('search') || '').trim();
        const status = searchParams.get('status') || '';
        const dateFrom = searchParams.get('date_from') || '';
        const dateTo = searchParams.get('date_to') || '';
        const page = Math.max(1, toInt(searchParams.get('page'), 1));
        const pageSize = Math.min(200, Math.max(1, toInt(searchParams.get('pageSize'), 10)));

        const where: any = {};
        if (search) where.OR = cfg.searchFields.map((f) => ({ [f]: { contains: search } }));
        if (status && cfg.statusField) where[cfg.statusField] = status;
        if (cfg.dateField && (dateFrom || dateTo)) {
          where[cfg.dateField] = {
            gte: dateFrom ? new Date(dateFrom) : new Date('1970-01-01'),
            lte: dateTo ? new Date(`${dateTo}T23:59:59.999`) : new Date('2999-12-31'),
          };
        }

        const [data, total] = await Promise.all([
          db[cfg.model].findMany({ where, orderBy: cfg.orderBy ?? { id: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
          db[cfg.model].count({ where }),
        ]);

        return ok({ data, pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } });
      } catch (error: any) {
        return serverError(error.message);
      }
    },

    async POST(req: NextRequest) {
      const authError = await requirePermission(req, cfg.feature, 'create');
      if (authError) return authError;

      try {
        const body = await req.json();
        const errors = cfg.validate?.(body, false) ?? [];
        if (errors.length) return badRequest(errors.join(' · '));
        const created = await db[cfg.model].create({ data: cfg.toCreate ? await cfg.toCreate(body) : body });
        return ok(created, 201);
      } catch (error: any) {
        return serverError(error.message);
      }
    },

    async PUT(req: NextRequest) {
      const authError = await requirePermission(req, cfg.feature, 'update');
      if (authError) return authError;

      try {
        const body = await req.json();
        const { id } = body;
        if (!id) return badRequest('ID wajib diisi.');

        const errors = cfg.validate?.(body, true) ?? [];
        if (errors.length) return badRequest(errors.join(' · '));

        const existing = await db[cfg.model].findUnique({ where: { id: toInt(id) } });
        if (!existing) return badRequest('Data tidak ditemukan.');

        const updated = await db[cfg.model].update({
          where: { id: toInt(id) },
          data: cfg.toUpdate ? await cfg.toUpdate(body) : body,
        });
        return ok(updated);
      } catch (error: any) {
        return serverError(error.message);
      }
    },

    async DELETE(req: NextRequest) {
      const authError = await requirePermission(req, cfg.feature, 'delete');
      if (authError) return authError;

      try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return badRequest('ID wajib diisi.');
        await db[cfg.model].delete({ where: { id: toInt(id) } });
        return ok({ success: true });
      } catch (error: any) {
        return serverError(error.message);
      }
    },
  };
}

/** Generator nomor dokumen berurutan per tahun, mis. BKG-2026-0001. */
export async function nextCode(model: string, prefix: string, pad = 4): Promise<string> {
  const db = prisma as unknown as Record<string, any>;
  const year = new Date().getFullYear();
  const count = await db[model].count();
  let n = count + 1;
  for (let i = 0; i < 50; i++) {
    const candidate = `${prefix}-${year}-${String(n).padStart(pad, '0')}`;
    const exists = await db[model].findFirst({ where: { [codeField(model)]: candidate } });
    if (!exists) return candidate;
    n++;
  }
  return `${prefix}-${year}-${Date.now()}`;
}

function codeField(model: string): string {
  return {
    booking: 'bookingCode',
    servisAsset: 'servisCode',
    employee: 'employeeCode',
    leaveRequest: 'requestCode',
    finding: 'findingCode',
    recordingReview: 'reviewCode',
    logRuangServer: 'logCode',
  }[model] ?? 'code';
}