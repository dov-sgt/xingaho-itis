import { buildCrudHandlers } from '@/lib/crud-route';
import { toInt, toNumber } from '@/lib/documents';

const STATUS = ['Pending', 'Approved', 'Rejected'];

const handlers = buildCrudHandlers({
  model: 'stockOutTransaction',
  feature: 'transaction_stockout',
  searchFields: ['itemName', 'category', 'note', 'requestedBy', 'itemCode'],
  statusField: 'status',
  dateField: 'date',
  validate: (body) => {
    const e: string[] = [];
    if (!body.itemName) e.push('Nama barang wajib diisi.');
    if (toInt(body.outQty, 0) < 1) e.push('Qty minimal 1.');
    if (body.status && !STATUS.includes(body.status)) e.push(`Status harus salah satu dari: ${STATUS.join(', ')}.`);
    return e;
  },
  toCreate: (body) => ({
    date: body.date ? new Date(body.date) : new Date(),
    category: body.category || 'Others',
    itemCode: body.itemCode || null,
    itemName: body.itemName,
    outQty: toInt(body.outQty, 1),
    note: body.note || null,
    status: body.status || 'Pending',
    requestedBy: body.requestedBy || null,
  }),
  toUpdate: (body) => ({
    ...(body.date ? { date: new Date(body.date) } : {}),
    category: body.category,
    itemCode: body.itemCode ?? null,
    itemName: body.itemName,
    outQty: body.outQty !== undefined ? toInt(body.outQty, 1) : undefined,
    note: body.note ?? null,
    ...(body.status ? { status: body.status } : {}),
    ...(body.approvedBy !== undefined ? { approvedBy: body.approvedBy } : {}),
  }),
});

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;