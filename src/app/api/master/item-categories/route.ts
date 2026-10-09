import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/session';
import { ok, badRequest, serverError } from '@/lib/api';
import { previewItemCode, ITEM_CATEGORY_CODE_LENGTH } from '@/lib/item-code';

/**
 * Master kategori item (item 3).
 *
 * Kategori menyimpan `code` 2 huruf besar yang dipakai sebagai bagian dari
 * kode item otomatis. Kategori yang belum terdaftar akan dibuat otomatis saat
 * item dibuat, memakai kode default dari `DEFAULT_CATEGORY_CODES`.
 */
export async function GET(req: NextRequest) {
  const authError = await requirePermission(req, 'master_item', 'read');
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const withUsage = searchParams.get('withUsage') === '1';

    const categories = await prisma.itemCategory.findMany({ orderBy: { name: 'asc' } });

    if (!withUsage) return ok(categories);

    // Hitung pemakaian per kategori supaya tidak ada kategori yang tidak
    // sengaja dihapus/disembunyikan.
    const items = await prisma.masterItem.groupBy({ by: ['typeItem'], _count: { _all: true } });
    const usage = new Map(items.map((i) => [i.typeItem, i._count._all]));

    return ok(
      categories.map((c) => ({ ...c, itemCount: usage.get(c.name) ?? 0 })),
    );
  } catch (error: any) {
    return serverError(error.message);
  }
}

/** Preview kode berikutnya untuk sebuah kategori (tanpa menambah counter). */
export async function POST(req: NextRequest) {
  const authError = await requirePermission(req, 'master_item', 'read');
  if (authError) return authError;

  try {
    const body = await req.json();
    const name = String(body?.name ?? '').trim();
    if (!name) return badRequest('Nama kategori wajib diisi.');
    return ok({ name, code: await previewItemCode(name) });
  } catch (error: any) {
    return serverError(error.message);
  }
}

/** Tambah / ubah kategori item beserta kode 2 hurufnya. */
export async function PUT(req: NextRequest) {
  const authError = await requirePermission(req, 'master_item', 'update');
  if (authError) return authError;

  try {
    const body = await req.json();
    const id = body?.id ? Number(body.id) : null;
    const name = String(body?.name ?? '').trim();
    const code = String(body?.code ?? '').trim().toUpperCase();
    const note = body?.note ? String(body.note).trim() : null;

    if (!name) return badRequest('Nama kategori wajib diisi.');
    if (!code) return badRequest('Kode kategori wajib diisi.');
    if (!/^[A-Z]{2}$/.test(code)) {
      return badRequest(`Kode kategori harus ${ITEM_CATEGORY_CODE_LENGTH} huruf besar (A-Z).`);
    }

    const clash = await prisma.itemCategory.findFirst({
      where: { code, ...(id ? { NOT: { id } } : {}) },
      select: { id: true, name: true },
    });
    if (clash) {
      return badRequest(`Kode kategori ${code} sudah dipakai oleh kategori "${clash.name}".`);
    }

    if (id) {
      const updated = await prisma.itemCategory.update({
        where: { id },
        data: { name, code, note },
      });
      return ok(updated);
    }

    const created = await prisma.itemCategory.create({ data: { name, code, note } });
    return ok(created, 201);
  } catch (error: any) {
    if (String(error?.message || '').includes('Unique constraint')) {
      return badRequest('Nama atau kode kategori sudah digunakan.');
    }
    return serverError(error.message);
  }
}