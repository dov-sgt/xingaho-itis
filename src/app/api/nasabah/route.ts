import { buildCrudHandlers } from '@/lib/crud-route';
import { toNumber, isNegative } from '@/lib/documents';

const STATUS = ['Aktif', 'Nonaktif', 'Lunas'];

const handlers = buildCrudHandlers({
  model: 'nasabah',
  feature: 'transaction_stockout',
  searchFields: ['nik', 'nama', 'telepon', 'assignedTo'],
  statusField: 'status',
  validate: (body) => {
    const e: string[] = [];
    if (!body.nik) e.push('NIK wajib diisi.');
    if (!body.nama) e.push('Nama wajib diisi.');
    if (isNegative(body.pinjol)) e.push('Pinjol tidak boleh negatif.');
    if (body.status && !STATUS.includes(body.status)) e.push(`Status harus salah satu dari: ${STATUS.join(', ')}.`);
    return e;
  },
  toCreate: (body) => ({
    nik: String(body.nik).trim(),
    nama: body.nama,
    telepon: body.telepon || null,
    pinjol: toNumber(body.pinjol, 0),
    jatuhTempo: body.jatuhTempo || null,
    assignedTo: body.assignedTo || null,
    status: body.status || 'Aktif',
  }),
  toUpdate: (body) => ({
    nama: body.nama,
    telepon: body.telepon ?? null,
    pinjol: body.pinjol !== undefined ? toNumber(body.pinjol, 0) : undefined,
    jatuhTempo: body.jatuhTempo ?? null,
    assignedTo: body.assignedTo ?? null,
    ...(body.status ? { status: body.status } : {}),
  }),
});

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;