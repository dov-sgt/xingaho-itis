import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, getAuthContext } from '@/lib/session';
import { ok, badRequest, serverError, validationError } from '@/lib/api';
import { collectErrors, validateRequired, validateString } from '@/lib/validation';
import { toInt, toNumber, isNegative, nextNumber } from '@/lib/documents';
import { HEADSET_ITEM_CATEGORY } from '@/lib/config';

const VALID_STATUSES = ['Pending', 'Approved', 'Rejected'];

/** Kategori pengajuan yang mewajibkan pemilihan item katalog (item 13). */
const CATEGORIES = ['Headset', 'Laptop', 'Aksesoris', 'Printer', 'Lainnya'];

/**
 * Item 8: pemetaan kategori pengajuan -> kategori katalog MasterItem.
 * Dipakai server untuk memvalidasi item yang dipilih benar-benar milik
 * kategori pengajuannya. Kalau tidak ada pemetaan, semua kategori diizinkan.
 */
const CATEGORY_TO_ITEM_TYPE: Record<string, string> = {
  Headset: HEADSET_ITEM_CATEGORY,
  Aksesoris: 'Accessories',
  Laptop: 'Computer',
  Printer: 'Printer',
  Lainnya: 'Others',
};

function requiresCatalogItem(category: string): boolean {
  return category.trim().toLowerCase() === 'headset';
}

export async function GET(req: NextRequest) {
  const authError = await requirePermission(req, 'vendor_submission', 'read');
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const vendorName = searchParams.get('vendorName') || '';
    const status = searchParams.get('status') || '';
    const project = searchParams.get('project') || '';
    const search = searchParams.get('search') || '';
    const dateFrom = searchParams.get('date_from') || '';
    const dateTo = searchParams.get('date_to') || '';

    const where: any = {};
    if (vendorName) where.vendorName = { contains: vendorName };
    if (project) where.project = { contains: project };
    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return badRequest(`Status tidak valid. Valid: ${VALID_STATUSES.join(', ')}`);
      }
      where.status = status;
    }
    if (search) {
      where.OR = [
        { submissionCode: { contains: search } },
        { title: { contains: search } },
        { description: { contains: search } },
        { namaPembuat: { contains: search } },
        { itemName: { contains: search } },
        { karyawanName: { contains: search } },
      ];
    }
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }

    const submissions = await prisma.vendorSubmission.findMany({ where, orderBy: { id: 'desc' } });
    return ok(submissions);
  } catch (error: any) {
    return serverError(error.message);
  }
}

export async function POST(req: NextRequest) {
  const authError = await requirePermission(req, 'vendor_submission', 'create');
  if (authError) return authError;

  try {
    const auth = await getAuthContext(req);
    const body = await req.json();

    const {
      vendorName, title, description, category, proposedPrice,
      nik, karyawanName, project, date, namaPembuat, itemCode, employeeCategory,
    } = body;

    const cat = category || 'Headset';

    const errors = collectErrors([
      validateRequired(vendorName, 'Nama Vendor'),
      validateString(vendorName, 'Nama Vendor', 1, 255),
      validateRequired(title, 'Judul Pengajuan'),
      validateString(title, 'Judul Pengajuan', 1, 255),
      // Item 14: "Nama Pembuat" wajib diisi.
      validateRequired(namaPembuat, 'Nama Pembuat'),
      validateString(namaPembuat, 'Nama Pembuat', 1, 255),
    ]);
    if (isNegative(proposedPrice)) errors.push('Estimasi Biaya tidak boleh negatif');

    // Item 13: kategori Headset WAJIB memilih item dari kategori Accessories.
    // Item 8: kategori lain juga boleh memilih item, tetapi item wajib milik
    // kategori katalog yang sesuai (kalau kategori punya pemetaan).
    let catalogItem: { code: string; namaItem: string; price: number | null; typeItem: string } | null = null;
    if (requiresCatalogItem(cat) && !itemCode) {
      errors.push(`Kategori ${cat} wajib memilih Nama Item dari kategori ${HEADSET_ITEM_CATEGORY}.`);
    } else if (itemCode) {
      catalogItem = await prisma.masterItem.findUnique({ where: { code: itemCode } });
      if (!catalogItem) {
        errors.push('Item katalog tidak ditemukan.');
      } else {
        const expectedType = CATEGORY_TO_ITEM_TYPE[cat];
        if (expectedType && catalogItem.typeItem !== expectedType) {
          errors.push(
            `Item yang dipilih harus berasal dari kategori ${expectedType} (kategori pengajuan: ${cat}).`,
          );
        }
      }
    }
    if (errors.length > 0) return validationError(errors);

    const submissionCode = await nextNumber('vendorSubmission', 'VND-REQ', 3);

    // Item 8: harga yang tersimpan adalah NILAI AKHIR yang dikirim user.
    // Nilai master hanya dipakai sebagai pratinjau di sisi client; kalau user
    // tidak mengubah apa pun, nilainya sama. `priceSnapshot` menyimpan harga
    // master saat pengajuan dibuat sebagai jejak audit.
    const finalPrice = proposedPrice === undefined || proposedPrice === null || proposedPrice === ''
      ? (catalogItem?.price ?? 0)
      : toNumber(proposedPrice, 0);

    const submission = await prisma.vendorSubmission.create({
      data: {
        submissionCode,
        date: date ? new Date(date) : new Date(),
        vendorName,
        title,
        description: description || '-',
        category: cat,
        proposedPrice: finalPrice,
        status: 'Pending',
        nik: nik || null,
        karyawanName: karyawanName || null,
        project: project || null,
        namaPembuat: namaPembuat, // item 14
        itemCode: catalogItem?.code ?? itemCode ?? null,
        itemName: catalogItem?.namaItem ?? null,
        priceSnapshot: finalPrice,
      },
    });

    return ok(submission, 201);
  } catch (error: any) {
    return serverError(error.message);
  }
}

export async function PUT(req: NextRequest) {
  const authError = await requirePermission(req, 'vendor_submission', 'update');
  if (authError) return authError;

  try {
    const auth = await getAuthContext(req);
    const body = await req.json();
    const {
      id, status, adminNote, vendorName, title, description, category,
      proposedPrice, nik, karyawanName, project, date, namaPembuat,
    } = body;

    if (!id) return badRequest('ID is required');
    if (status && !VALID_STATUSES.includes(status)) {
      return badRequest(`Status tidak valid. Valid: ${VALID_STATUSES.join(', ')}`);
    }

    const current = await prisma.vendorSubmission.findUnique({ where: { id: toInt(id) } });
    if (!current) return badRequest('Pengajuan tidak ditemukan');

    const data: any = {};
    if (status) data.status = status;
    if (adminNote !== undefined) data.adminNote = adminNote;
    if (vendorName) data.vendorName = vendorName;
    if (title) data.title = title;
    if (description !== undefined) data.description = description;
    if (category) data.category = category;
    if (proposedPrice !== undefined) data.proposedPrice = toNumber(proposedPrice, 0);
    if (nik !== undefined) data.nik = nik;
    if (karyawanName !== undefined) data.karyawanName = karyawanName;
    if (project !== undefined) data.project = project;
    if (date) data.date = new Date(date);
    // Item 14: nama pembuat boleh dikoreksi, namun tidak boleh dikosongkan.
    if (namaPembuat !== undefined) {
      if (!String(namaPembuat).trim()) return badRequest('Nama Pembuat tidak boleh kosong.');
      data.namaPembuat = String(namaPembuat).trim();
    }
    if (status === 'Approved' && !current.approvedAt) data.approvedAt = new Date();

    const updated = await prisma.vendorSubmission.update({
      where: { id: toInt(id) },
      data,
    });

    // Item 11: pengajuan disetujui -> buat/aktivasi Headset berstatus Used.
    let transactionItemId: number | null = null;
    if (status === 'Approved') {
      const existingTx = await prisma.transactionItem.findFirst({
        where: { vendorSubmissionId: updated.id, status: { in: ['Pending', 'Used'] } },
      });

      if (existingTx) {
        const tx = await prisma.transactionItem.update({
          where: { id: existingTx.id },
          data: {
            status: 'Used',
            approvedBy: auth?.name ?? 'System',
            approvedAt: new Date(),
            updatedBy: auth?.name ?? 'System',
          },
        });
        transactionItemId = tx.id;
      } else {
        const tx = await prisma.transactionItem.create({
          data: {
            vendorSubmissionId: updated.id,
            date: new Date().toISOString().slice(0, 10),
            employeeCategory: updated.karyawanName ? 'Existing Employee' : 'New Employee',
            nik: updated.nik || updated.namaPembuat || '-',
            name: updated.karyawanName || updated.namaPembuat || '-',
            condition: 'New Use',
            vendor: updated.vendorName,
            deposit: updated.proposedPrice || 0,
            note: updated.description || '-',
            project: updated.project || '-',
            // Langsung Used karena pengajuannya sudah Approved (item 11).
            status: 'Used',
            approvedBy: auth?.name ?? 'System',
            approvedAt: new Date(),
            itemCode: updated.itemCode,
            itemName: updated.itemName,
            updatedBy: auth?.name ?? 'System',
          },
        });
        transactionItemId = tx.id;
      }
    }

    return ok({ ...updated, transactionItemId });
  } catch (error: any) {
    return serverError(error.message);
  }
}

export async function DELETE(req: NextRequest) {
  const authError = await requirePermission(req, 'vendor_submission', 'delete');
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return badRequest('ID is required');
    await prisma.vendorSubmission.delete({ where: { id: toInt(id) } });
    return ok({ success: true });
  } catch (error: any) {
    return serverError(error.message);
  }
}