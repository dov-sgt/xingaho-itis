import { buildCrudHandlers, nextCode } from '@/lib/crud-route';
import { FINDING_TYPES, SEVERITIES, FINDING_STATUSES } from '@/lib/options';

const STATUS = FINDING_STATUSES;

const handlers = buildCrudHandlers({
  model: 'finding',
  feature: 'finding',
  searchFields: ['findingCode', 'agenName', 'description', 'findingType'],
  statusField: 'status',
  dateField: 'date',
  validate: (body) => {
    const e: string[] = [];
    if (!body.agenName) e.push('Nama agen wajib diisi.');
    if (!body.description) e.push('Deskripsi temuan wajib diisi.');
    if (body.findingType && !FINDING_TYPES.includes(body.findingType)) {
      e.push(`Tipe temuan harus salah satu dari: ${FINDING_TYPES.join(', ')}.`);
    }
    if (body.severity && !SEVERITIES.includes(body.severity)) {
      e.push(`Severity harus salah satu dari: ${SEVERITIES.join(', ')}.`);
    }
    if (body.status && !STATUS.includes(body.status)) e.push(`Status harus salah satu dari: ${STATUS.join(', ')}.`);
    return e;
  },
  toCreate: async (body) => ({
    findingCode: await nextCode('finding', 'FND', 4),
    date: body.date ? new Date(body.date) : new Date(),
    agenName: body.agenName,
    findingType: body.findingType || 'Kualitas',
    severity: body.severity || 'Medium',
    description: body.description,
    evidence: body.evidence || null,
    status: body.status || 'Open',
  }),
  toUpdate: (body) => ({
    ...(body.date ? { date: new Date(body.date) } : {}),
    agenName: body.agenName,
    findingType: body.findingType,
    severity: body.severity,
    description: body.description,
    evidence: body.evidence ?? null,
    ...(body.status ? { status: body.status } : {}),
    ...(body.resolvedBy ? { resolvedBy: body.resolvedBy } : {}),
    ...(body.resolutionNote !== undefined ? { resolutionNote: body.resolutionNote } : {}),
  }),
});

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;