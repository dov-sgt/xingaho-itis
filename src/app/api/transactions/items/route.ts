import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/session';
import { ok, badRequest, notFound, serverError, validationError } from '@/lib/api';
import { validateRequired, validateString, validateNumber, collectErrors } from '@/lib/validation';
import { NextRequest } from 'next/server';

const VALID_STATUSES = ['Pending', 'Used', 'Reject', 'Return'];
const VALID_CONDITIONS = ['New Use', 'Exchange', 'Broken', 'Missing'];
const VALID_RETURN_CONDITIONS = ['Good Condition', 'Damaged/Missing'];

export async function GET(req: NextRequest) {
  const authError = requirePermission(req, 'transaction_item', 'read');
  if (authError) return authError;
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const where: any = {};
    if (status) { if (!VALID_STATUSES.includes(status)) return badRequest('Status tidak valid'); where.status = status; }
    if (search) { where.OR = [{ nik: { contains: search } }, { name: { contains: search } }, { project: { contains: search } }, { vendor: { contains: search } }]; }
    const total = await prisma.transactionItem.count({ where });
    const transactions = await prisma.transactionItem.findMany({ where, orderBy: { id: 'desc' }, skip: (page - 1) * limit, take: limit });
    return ok({ data: transactions, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error: any) { return serverError(error.message); }
}

export async function POST(req: NextRequest) {
  const authError = requirePermission(req, 'transaction_item', 'create');
  if (authError) return authError;
  try {
    const body = await req.json();
    const { date, employeeCategory, nik, name, condition, vendor, deposit, note, project, status, updatedBy } = body;
    const errors = collectErrors([validateRequired(nik, 'NIK'), validateRequired(name, 'Nama'), validateNumber(deposit, 'Deposit', 0)]);
    if (errors.length > 0) return validationError(errors);
    if (condition && !VALID_CONDITIONS.includes(condition)) return badRequest('Kondisi tidak valid');
    const transaction = await prisma.transactionItem.create({ data: { date: date || new Date().toISOString().split('T')[0], employeeCategory: employeeCategory || 'New Employee', nik: String(nik), name: String(name), condition: condition || 'New Use', vendor: vendor || 'Swapro', deposit: parseFloat(deposit) || 100000, note: note || '-', project: project || 'GoTo', status: status || 'Pending', updatedBy: updatedBy || 'Staff IT' } });
    return ok(transaction, 201);
  } catch (error: any) { return serverError(error.message); }
}

export async function PUT(req: NextRequest) {
  const authError = requirePermission(req, 'transaction_item', 'update');
  if (authError) return authError;
  try {
    const body = await req.json();
    const { id, status, condition, note, deposit, vendorSubmissionId, returnCondition, returnPrice, returnNote, updatedBy } = body;
    if (!id) return badRequest('ID is required');
    if (status && !VALID_STATUSES.includes(status)) return badRequest('Status tidak valid');
    if (condition && !VALID_CONDITIONS.includes(condition)) return badRequest('Kondisi tidak valid');
    if (returnCondition && !VALID_RETURN_CONDITIONS.includes(returnCondition)) return badRequest('Return condition tidak valid');

    const data: any = { updatedAt: new Date(), updatedBy: updatedBy || 'Staff IT' };
    if (status) data.status = status;
    if (condition) data.condition = condition;
    if (note) data.note = note;
    if (deposit !== undefined) data.deposit = parseFloat(deposit) || 0;
    if (vendorSubmissionId) data.vendorSubmissionId = Number(vendorSubmissionId);
    if (returnCondition) data.returnCondition = returnCondition;
    if (returnPrice !== undefined) data.returnPrice = parseFloat(returnPrice) || 0;
    if (returnNote !== undefined) data.returnNote = returnNote;
    if (status === 'Return') data.returnedAt = new Date();

    const updated = await prisma.transactionItem.update({ where: { id: Number(id) }, data });
    return ok(updated);
  } catch (error: any) { return serverError(error.message); }
}
