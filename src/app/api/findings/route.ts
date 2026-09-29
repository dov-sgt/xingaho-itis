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
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || '';
    const severity = searchParams.get('severity') || '';
    const where: any = {};
    if (status) where.status = status;
    if (severity) where.severity = severity;
    const findings = await prisma.finding.findMany({ where, orderBy: { id: 'desc' } });
    return ok(findings);
  } catch (error: any) { return serverError(error.message); }
}

export async function POST(req: NextRequest) {
  const authError = requirePermission(req, 'transaction_item', 'create');
  if (authError) return authError;
  try {
    const body = await req.json();
    const { agenName, findingType, severity, description, evidence } = body;
    const errors = collectErrors([
      validateRequired(agenName, 'Nama Agen'),
      validateRequired(findingType, 'Tipe Finding'),
      validateRequired(severity, 'Severity'),
      validateRequired(description, 'Deskripsi'),
    ]);
    if (errors.length > 0) return validationError(errors);
    if (!['Low', 'Medium', 'High', 'Critical'].includes(severity)) return badRequest('Severity tidak valid');

    const count = await prisma.finding.count();
    const findingCode = `FND-2026-${(count + 1).toString().padStart(4, '0')}`;

    const finding = await prisma.finding.create({
      data: { findingCode, agenName, findingType, severity, description, evidence: evidence || null },
    });
    return ok(finding, 201);
  } catch (error: any) { return serverError(error.message); }
}

export async function PUT(req: NextRequest) {
  const authError = requirePermission(req, 'transaction_item', 'update');
  if (authError) return authError;
  try {
    const body = await req.json();
    const { id, status, resolvedBy, resolutionNote } = body;
    if (!id) return badRequest('ID is required');
    if (status && !['Open', 'In Progress', 'Resolved', 'Escalated'].includes(status)) return badRequest('Status tidak valid');
    const data: any = {};
    if (status) data.status = status;
    if (resolvedBy) data.resolvedBy = resolvedBy;
    if (resolutionNote !== undefined) data.resolutionNote = resolutionNote;
    const updated = await prisma.finding.update({ where: { id: Number(id) }, data });
    return ok(updated);
  } catch (error: any) { return serverError(error.message); }
}

export async function DELETE(req: NextRequest) {
  const authError = requirePermission(req, 'transaction_item', 'delete');
  if (authError) return authError;
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return badRequest('ID is required');
    await prisma.finding.delete({ where: { id: Number(id) } });
    return ok({ success: true });
  } catch (error: any) { return serverError(error.message); }
}
