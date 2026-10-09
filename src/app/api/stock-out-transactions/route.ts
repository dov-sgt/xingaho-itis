import { buildCrudHandlers } from '@/lib/crud-route';
import { toInt } from '@/lib/documents';
import type { AuthContext } from '@/lib/session';

const STATUS = ['Pending', 'Approved', 'Rejected'];

/** Nama pengaju: dari form, atau dari sesi bila form tidak mengirimnya. */
function requestedByOf(body: any, auth?: AuthContext | null): string {
  const fromBody = typeof body.requestedBy === 'string' ? body.requestedBy.trim() : '';
  if (fromBody) return fromBody;
  const fromSession = auth?.name?.trim();
  if (fromSession) return fromSession;
  throw new Error('Nama pengaju wajib diisi.');
}

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
  // `requestedBy` wajib di database, jadi jangan pernah kirim null.
  toCreate: (body, auth) => ({
    date: body.date ? new Date(body.date) : new Date(),
    category: body.category || 'Others',
    itemCode: body.itemCode || null,
    itemName: body.itemName,
    outQty: toInt(body.outQty, 1),
    note: body.note || null,
    status: body.status || 'Pending',
    requestedBy: requestedByOf(body, auth),
  }),
  toUpdate: (body, auth) => ({
    ...(body.date ? { date: new Date(body.date) } : {}),
    category: body.category,
    itemCode: body.itemCode ?? null,
    itemName: body.itemName,
    outQty: body.outQty !== undefined ? toInt(body.outQty, 1) : undefined,
    note: body.note ?? null,
    ...(body.status ? { status: body.status } : {}),
    ...(body.approvedBy !== undefined ? { approvedBy: body.approvedBy } : {}),
    ...(body.requestedBy !== undefined
      ? { requestedBy: requestedByOf(body, auth) }
      : {}),
  }),
});

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;