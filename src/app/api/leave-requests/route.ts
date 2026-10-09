import { buildCrudHandlers, nextCode } from '@/lib/crud-route';
import { LEAVE_TYPES, LEAVE_STATUSES } from '@/lib/options';
import { toInt } from '@/lib/documents';

const STATUS = LEAVE_STATUSES;

const handlers = buildCrudHandlers({
  model: 'leaveRequest',
  feature: 'user_management',
  searchFields: ['requestCode', 'reason', 'leaveType'],
  statusField: 'status',
  dateField: 'startDate',
  validate: (body) => {
    const e: string[] = [];
    if (!body.employeeId) e.push('Karyawan wajib dipilih.');
    if (!body.leaveType) e.push('Tipe cuti wajib diisi.');
    if (!body.startDate) e.push('Tanggal mulai wajib diisi.');
    if (!body.endDate) e.push('Tanggal selesai wajib diisi.');
    if (body.startDate && body.endDate && new Date(body.endDate) < new Date(body.startDate)) {
      e.push('Tanggal selesai tidak boleh lebih awal dari tanggal mulai.');
    }
    if (body.status && !STATUS.includes(body.status)) e.push(`Status harus salah satu dari: ${STATUS.join(', ')}.`);
    return e;
  },
  toCreate: async (body) => ({
    requestCode: await nextCode('leaveRequest', 'LV', 4),
    employeeId: toInt(body.employeeId),
    leaveType: body.leaveType,
    startDate: new Date(body.startDate),
    endDate: new Date(body.endDate),
    reason: body.reason || '-',
    status: body.status || 'Pending',
    approvedBy: body.approvedBy || null,
  }),
  toUpdate: (body) => ({
    employeeId: body.employeeId ? toInt(body.employeeId) : undefined,
    leaveType: body.leaveType,
    startDate: body.startDate ? new Date(body.startDate) : undefined,
    endDate: body.endDate ? new Date(body.endDate) : undefined,
    reason: body.reason,
    ...(body.status ? { status: body.status, approvedBy: body.approvedBy || null } : {}),
  }),
});

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;