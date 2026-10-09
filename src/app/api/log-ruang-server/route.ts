import { buildCrudHandlers, nextCode } from '@/lib/crud-route';

const handlers = buildCrudHandlers({
  model: 'logRuangServer',
  feature: 'log_ruang_server',
  searchFields: ['logCode', 'nama', 'keperluan', 'location'],
  dateField: 'date',
  validate: (body) => {
    const e: string[] = [];
    if (!body.nama) e.push('Nama wajib diisi.');
    if (!body.jamMasuk) e.push('Jam masuk wajib diisi.');
    if (!body.keperluan) e.push('Keperluan wajib diisi.');
    if (body.jamMasuk && body.jamKeluar && body.jamKeluar < body.jamMasuk) {
      e.push('Jam keluar tidak boleh lebih awal dari jam masuk.');
    }
    return e;
  },
  toCreate: async (body) => ({
    logCode: await nextCode('logRuangServer', 'LOG'),
    date: body.date ? new Date(body.date) : new Date(),
    nama: body.nama,
    jamMasuk: body.jamMasuk,
    jamKeluar: body.jamKeluar || null,
    keperluan: body.keperluan,
    location: body.location || '-',
  }),
  toUpdate: (body) => ({
    ...(body.date ? { date: new Date(body.date) } : {}),
    nama: body.nama,
    jamMasuk: body.jamMasuk,
    jamKeluar: body.jamKeluar || null,
    keperluan: body.keperluan,
    location: body.location || '-',
  }),
});

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;