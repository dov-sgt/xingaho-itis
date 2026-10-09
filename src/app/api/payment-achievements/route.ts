import { buildCrudHandlers } from '@/lib/crud-route';
import { toNumber, isNegative } from '@/lib/documents';
import { PAYMENT_STATUSES } from '@/lib/options';

const STATUS = PAYMENT_STATUSES;

const handlers = buildCrudHandlers({
  model: 'paymentAchievement',
  feature: 'transaction_stockout',
  searchFields: ['agenName', 'status'],
  statusField: 'status',
  dateField: 'date',
  validate: (body) => {
    const e: string[] = [];
    if (!body.agenName) e.push('Nama agen wajib diisi.');
    if (isNegative(body.amount)) e.push('Nominal tidak boleh negatif.');
    if (body.status && !STATUS.includes(body.status)) e.push(`Status harus salah satu dari: ${STATUS.join(', ')}.`);
    return e;
  },
  toCreate: (body) => ({
    agenName: body.agenName,
    date: body.date ? new Date(body.date) : new Date(),
    amount: toNumber(body.amount, 0),
    status: body.status || 'Pending',
  }),
  toUpdate: (body) => ({
    ...(body.date ? { date: new Date(body.date) } : {}),
    agenName: body.agenName,
    amount: toNumber(body.amount, 0),
    ...(body.status ? { status: body.status } : {}),
  }),
});

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;