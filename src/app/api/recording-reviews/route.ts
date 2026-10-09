import { buildCrudHandlers, nextCode } from '@/lib/crud-route';
import { COMPLIANCE_OPTIONS } from '@/lib/options';

const COMPLIANCE = COMPLIANCE_OPTIONS;

const handlers = buildCrudHandlers({
  model: 'recordingReview',
  feature: 'recording_review',
  searchFields: ['reviewCode', 'agenName', 'nasabahName', 'reviewedBy'],
  dateField: 'date',
  validate: (body) => {
    const e: string[] = [];
    if (!body.agenName) e.push('Nama agen wajib diisi.');
    if (!body.reviewedBy) e.push('Nama reviewer wajib diisi.');
    if (!body.compliance) e.push('Status compliance wajib diisi.');
    if (body.compliance && !COMPLIANCE.includes(body.compliance)) {
      e.push(`Compliance harus salah satu dari: ${COMPLIANCE.join(', ')}.`);
    }
    return e;
  },
  toCreate: async (body) => ({
    reviewCode: await nextCode('recordingReview', 'REC', 4),
    date: body.date ? new Date(body.date) : new Date(),
    agenName: body.agenName,
    nasabahName: body.nasabahName || null,
    recordingUrl: body.recordingUrl || null,
    duration: body.duration || null,
    reviewedBy: body.reviewedBy,
    compliance: body.compliance,
    notes: body.notes || null,
  }),
  toUpdate: (body) => ({
    ...(body.date ? { date: new Date(body.date) } : {}),
    agenName: body.agenName,
    nasabahName: body.nasabahName ?? null,
    recordingUrl: body.recordingUrl ?? null,
    duration: body.duration ?? null,
    reviewedBy: body.reviewedBy,
    compliance: body.compliance,
    notes: body.notes ?? null,
  }),
});

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;