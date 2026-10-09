import { buildCrudHandlers, nextCode } from '@/lib/crud-route';

const handlers = buildCrudHandlers({
  model: 'booking',
  feature: 'booking',
  searchFields: ['bookingCode', 'borrowerName', 'location', 'itemType'],
  statusField: 'status',
  dateField: 'startDate',
  validate: (body) => {
    const e: string[] = [];
    if (!body.borrowerName) e.push('Nama peminjam wajib diisi.');
    if (!body.startDate) e.push('Tanggal mulai wajib diisi.');
    // endDate & location WAJIB di database. Tanggal selesai boleh dikosongkan
    // di form (booking satu hari) lalu diisi otomatis dengan tanggal mulai.
    if (!body.location) e.push('Lokasi wajib diisi.');
    if (body.endDate && body.startDate && new Date(body.endDate) < new Date(body.startDate)) {
      e.push('Tanggal selesai tidak boleh lebih awal dari tanggal mulai.');
    }
    return e;
  },
  toCreate: async (body, auth) => ({
    bookingCode: await nextCode('booking', 'BKG'),
    borrowerName: body.borrowerName,
    itemType: body.itemType || 'Projector',
    startDate: body.startDate,
    startTime: body.startTime || null,
    endDate: body.endDate || body.startDate,
    endTime: body.endTime || null,
    location: body.location,
    status: body.status || 'Pending',
    createdBy: body.createdBy || auth?.name || null,
  }),
  toUpdate: (body) => ({
    borrowerName: body.borrowerName,
    itemType: body.itemType,
    startDate: body.startDate,
    startTime: body.startTime ?? null,
    endDate: body.endDate || body.startDate,
    endTime: body.endTime ?? null,
    location: body.location,
    ...(body.status ? { status: body.status } : {}),
  }),
});

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;