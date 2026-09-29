import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/session';
import { ok, badRequest, serverError, validationError } from '@/lib/api';
import { validateRequired, validateString, collectErrors } from '@/lib/validation';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const authError = requirePermission(req, 'transaction_item', 'read');
  if (authError) return authError;
  try {
    const reviews = await prisma.recordingReview.findMany({ orderBy: { id: 'desc' } });
    return ok(reviews);
  } catch (error: any) { return serverError(error.message); }
}

export async function POST(req: NextRequest) {
  const authError = requirePermission(req, 'transaction_item', 'create');
  if (authError) return authError;
  try {
    const body = await req.json();
    const { agenName, nasabahName, recordingUrl, duration, reviewedBy, compliance, notes } = body;
    const errors = collectErrors([
      validateRequired(agenName, 'Nama Agen'),
      validateRequired(reviewedBy, 'Reviewer'),
      validateRequired(compliance, 'Compliance'),
    ]);
    if (errors.length > 0) return validationError(errors);
    if (!['Compliant', 'Non-Compliant'].includes(compliance)) return badRequest('Compliance harus Compliant atau Non-Compliant');

    const count = await prisma.recordingReview.count();
    const reviewCode = `REC-2026-${(count + 1).toString().padStart(4, '0')}`;

    const review = await prisma.recordingReview.create({
      data: { reviewCode, agenName, nasabahName: nasabahName || null, recordingUrl: recordingUrl || null, duration: duration || null, reviewedBy, compliance, notes: notes || null },
    });
    return ok(review, 201);
  } catch (error: any) { return serverError(error.message); }
}

export async function PUT(req: NextRequest) {
  const authError = requirePermission(req, 'transaction_item', 'update');
  if (authError) return authError;
  try {
    const body = await req.json();
    const { id, compliance, notes } = body;
    if (!id) return badRequest('ID is required');
    const data: any = {};
    if (compliance) data.compliance = compliance;
    if (notes !== undefined) data.notes = notes;
    const updated = await prisma.recordingReview.update({ where: { id: Number(id) }, data });
    return ok(updated);
  } catch (error: any) { return serverError(error.message); }
}
