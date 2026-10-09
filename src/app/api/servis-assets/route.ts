import { buildCrudHandlers, nextCode } from '@/lib/crud-route';
import { SERVIS_STATUSES } from '@/lib/options';

const STATUS = SERVIS_STATUSES;

const handlers = buildCrudHandlers({
  model: 'servisAsset',
  feature: 'servis_asset',
  searchFields: ['servisCode', 'itemName', 'teknisiName'],
  statusField: 'status',
  dateField: 'date',
  validate: (body) => {
    const e: string[] = [];
    if (!body.itemName) e.push('Nama barang wajib diisi.');
    if (!body.teknisiName) e.push('Nama teknisi wajib diisi.');
    if (body.status && !STATUS.includes(body.status)) e.push(`Status harus salah satu dari: ${STATUS.join(', ')}.`);
    return e;
  },
  toCreate: async (body) => ({
    servisCode: await nextCode('servisAsset', 'SRV'),
    date: body.date ? new Date(body.date) : new Date(),
    itemName: body.itemName,
    teknisiName: body.teknisiName,
    status: body.status || 'Pending',
    createdBy: body.createdBy || null,
  }),
  toUpdate: (body) => ({
    ...(body.date ? { date: new Date(body.date) } : {}),
    itemName: body.itemName,
    teknisiName: body.teknisiName,
    ...(body.status ? { status: body.status } : {}),
  }),
});

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;