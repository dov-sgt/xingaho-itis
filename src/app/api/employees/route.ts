import { buildCrudHandlers, nextCode } from '@/lib/crud-route';
import { EMPLOYEE_STATUSES } from '@/lib/options';

const STATUS = EMPLOYEE_STATUSES;

const handlers = buildCrudHandlers({
  model: 'employee',
  feature: 'employee_data',
  searchFields: ['employeeCode', 'nik', 'name', 'department', 'position'],
  statusField: 'status',
  validate: (body) => {
    const e: string[] = [];
    if (!body.nik) e.push('NIK wajib diisi.');
    if (!body.name) e.push('Nama wajib diisi.');
    if (!body.department) e.push('Departemen wajib diisi.');
    if (!body.position) e.push('Posisi wajib diisi.');
    if (!body.joinDate) e.push('Tanggal masuk wajib diisi.');
    if (body.status && !STATUS.includes(body.status)) e.push(`Status harus salah satu dari: ${STATUS.join(', ')}.`);
    return e;
  },
  toCreate: async (body) => ({
    employeeCode: await nextCode('employee', 'EMP', 4),
    nik: String(body.nik).trim(),
    name: body.name,
    department: body.department,
    position: body.position,
    joinDate: new Date(body.joinDate),
    status: body.status || 'Active',
    phone: body.phone || null,
    email: body.email || null,
  }),
  toUpdate: (body) => ({
    nik: String(body.nik).trim(),
    name: body.name,
    department: body.department,
    position: body.position,
    joinDate: body.joinDate ? new Date(body.joinDate) : undefined,
    ...(body.status ? { status: body.status } : {}),
    phone: body.phone || null,
    email: body.email || null,
  }),
});

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;