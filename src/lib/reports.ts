import { isSuperAdmin } from './rbac';

/**
 * Katalog laporan (reporting).
 *
 * Divisi & role dibaca dari database, namun *katalog laporan* per divisi tetap
 * didefinisikan di satu tempat di sisi server supaya user tidak bisa meminta
 * laporan divisi lain hanya dengan mengubah parameter URL.
 *
 * (Berkas ini menggantikan versi lama yang memetakan role -> divisi secara
 * hardcoded; pemetaan tersebut sudah tidak valid karena role kinidinamis.)
 */

export const REPORT_TYPES = [
  'headset',
  'damaged',
  'stocks',
  'purchase_request',
  'delivery_order',
  'submission',
  'laptops',
  'employees',
  'leave_requests',
  'findings',
  'recording_reviews',
] as const;

export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_LABELS: Record<ReportType, string> = {
  headset: 'Rekap Headset User',
  damaged: 'Rekap Item Damage',
  stocks: 'Rekap Stok Inventaris',
  purchase_request: 'Rekap Purchase Request',
  delivery_order: 'Rekap Delivery Order',
  submission: 'Rekap Pengajuan',
  laptops: 'Rekap Aset Laptop',
  employees: 'Rekap Karyawan',
  leave_requests: 'Rekap Pengajuan Cuti',
  findings: 'Rekap Temuan QC',
  recording_reviews: 'Rekap Recording Review',
};

export const DIVISION_REPORTS: Record<string, ReportType[]> = {
  IT: ['headset', 'damaged', 'stocks', 'purchase_request', 'delivery_order', 'submission', 'laptops'],
  OPS: ['headset', 'submission', 'purchase_request'],
  QC: ['findings', 'recording_reviews'],
  HR: ['employees', 'leave_requests', 'headset'],
};

export function allowedReportTypes(divisionCode: string, role: string): ReportType[] {
  if (isSuperAdmin(role)) return [...REPORT_TYPES];
  return DIVISION_REPORTS[divisionCode] ?? [];
}

/** Kolom yang bisa dicari per jenis laporan. */
export const REPORT_SEARCHABLE: Record<ReportType, string[]> = {
  headset: ['name', 'nik', 'vendor', 'project', 'itemName'],
  damaged: ['itemName', 'itemCode', 'nik', 'employeeName'],
  stocks: ['itemName', 'itemCode', 'category'],
  purchase_request: ['prNumber', 'itemName', 'itemCode', 'requesterName'],
  delivery_order: ['doNumber', 'prNumber', 'itemName', 'vendorName', 'recipient'],
  submission: ['submissionCode', 'title', 'vendorName', 'namaPembuat', 'itemName'],
  laptops: ['item', 'user'],
  employees: ['employeeCode', 'nik', 'name', 'department'],
  leave_requests: ['requestCode', 'reason'],
  findings: ['findingCode', 'agenName', 'description'],
  recording_reviews: ['reviewCode', 'agenName', 'nasabahName'],
};