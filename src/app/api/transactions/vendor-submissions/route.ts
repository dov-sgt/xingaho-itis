import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/session';
import { ok, badRequest, notFound, serverError, validationError } from '@/lib/api';
import { validateRequired, validateString, validateNumber, collectErrors } from '@/lib/validation';
import { NextRequest } from 'next/server';

const VALID_STATUSES = ['Pending', 'Approved', 'Rejected'];

export async function GET(req: NextRequest) {
  const authError = requirePermission(req, 'vendor_submission', 'read');
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const vendorName = searchParams.get('vendorName') || '';
    const status = searchParams.get('status') || '';
    const project = searchParams.get('project') || '';
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
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }

    const submissions = await prisma.vendorSubmission.findMany({
      where,
      orderBy: { id: 'desc' },
    });

    return ok(submissions);
  } catch (error: any) {
    return serverError(error.message);
  }
}

export async function POST(req: NextRequest) {
  const authError = requirePermission(req, 'vendor_submission', 'create');
  if (authError) return authError;

  try {
    const body = await req.json();
    const { vendorName, title, description, category, proposedPrice, nik, karyawanName, project, date } = body;

    const errors = collectErrors([
      validateRequired(vendorName, 'Nama Vendor'),
      validateString(vendorName, 'Nama Vendor', 1, 255),
      validateRequired(title, 'Judul Pengajuan'),
      validateString(title, 'Judul Pengajuan', 1, 255),
      validateNumber(proposedPrice, 'Estimasi Biaya', 0),
    ]);

    if (errors.length > 0) return validationError(errors);

    const count = await prisma.vendorSubmission.count();
    const submissionCode = `VND-REQ-2026-${(count + 1).toString().padStart(3, '0')}`;

    const submission = await prisma.vendorSubmission.create({
      data: {
        submissionCode,
        date: date ? new Date(date) : new Date(),
        vendorName,
        title,
        description: description || '-',
        category: category || 'Pengajuan Headset',
        proposedPrice: parseFloat(proposedPrice) || 0,
        status: 'Pending',
        nik: nik || null,
        karyawanName: karyawanName || null,
        project: project || null,
      },
    });

    return ok(submission, 201);
  } catch (error: any) {
    return serverError(error.message);
  }
}

export async function PUT(req: NextRequest) {
  const authError = requirePermission(req, 'vendor_submission', 'update');
  if (authError) return authError;

  try {
    const body = await req.json();
    const { id, status, adminNote, vendorName, title, description, category, proposedPrice, nik, karyawanName, project, date } = body;

    if (!id) return badRequest('ID is required');

    // If status is being updated, validate it
    if (status && !VALID_STATUSES.includes(status)) {
      return badRequest(`Status tidak valid. Valid: ${VALID_STATUSES.join(', ')}`);
    }

    // Build update data - only include fields that are provided
    const data: any = {};
    if (status) data.status = status;
    if (adminNote !== undefined) data.adminNote = adminNote;
    if (vendorName) data.vendorName = vendorName;
    if (title) data.title = title;
    if (description !== undefined) data.description = description;
    if (category) data.category = category;
    if (proposedPrice !== undefined) data.proposedPrice = parseFloat(proposedPrice) || 0;
    if (nik !== undefined) data.nik = nik;
    if (karyawanName !== undefined) data.karyawanName = karyawanName;
    if (project !== undefined) data.project = project;
    if (date) data.date = new Date(date);

    const updated = await prisma.vendorSubmission.update({
      where: { id: Number(id) },
      data,
    });

    return ok(updated);
  } catch (error: any) {
    return serverError(error.message);
  }
}

export async function DELETE(req: NextRequest) {
  const authError = requirePermission(req, 'vendor_submission', 'delete');
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return badRequest('ID is required');

    await prisma.vendorSubmission.delete({
      where: { id: Number(id) },
    });

    return ok({ success: true });
  } catch (error: any) {
    return serverError(error.message);
  }
}
