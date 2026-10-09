/**
 * Definisi kolom laporan - sumber tunggal untuk tampilan di halaman Reporting
 * maupun untuk hasil ekspor (.xlsx / .csv) berisi logo perusahaan.
 *
 * `format` menentukan cara nilai ditampilkan DAN cara diekspor, sehingga
 * kolom di layar dan di berkas selalu sama.
 */

export type ReportFieldType = 'text' | 'number' | 'money' | 'date' | 'datetime' | 'status' | 'code';

export interface ReportColumn {
  key: string;
  header: string;
  type: ReportFieldType;
  /** Lebar kolom di Excel (dalam karakter). */
  width?: number;
  /** Sembunyikan di layar kecil. */
  hideOnMobile?: boolean;
}

export const REPORT_COLUMNS: Record<string, ReportColumn[]> = {
  headset: [
    { key: 'date', header: 'Tanggal', type: 'date' },
    { key: 'nik', header: 'NIK', type: 'code' },
    { key: 'name', header: 'Nama', type: 'text' },
    { key: 'vendor', header: 'Vendor', type: 'text' },
    { key: 'project', header: 'Project', type: 'text' },
    { key: 'itemName', header: 'Item', type: 'text' },
    { key: 'deposit', header: 'Deposit', type: 'money' },
    { key: 'status', header: 'Status', type: 'status' },
  ],
  damaged: [
    { key: 'date', header: 'Tanggal', type: 'date' },
    { key: 'itemName', header: 'Item', type: 'text' },
    { key: 'itemCode', header: 'Kode', type: 'code' },
    { key: 'qty', header: 'Qty', type: 'number' },
    { key: 'employeeName', header: 'Pengguna', type: 'text' },
    { key: 'nik', header: 'NIK', type: 'code' },
    { key: 'condition', header: 'Kondisi', type: 'status' },
    { key: 'note', header: 'Catatan', type: 'text' },
  ],
  stocks: [
    { key: 'itemName', header: 'Nama Item', type: 'text', width: 30 },
    { key: 'itemCode', header: 'Kode', type: 'code' },
    { key: 'category', header: 'Kategori', type: 'text' },
    { key: 'currentStock', header: 'Ready Stock', type: 'number' },
    { key: 'inStock', header: 'Total Masuk', type: 'number' },
    { key: 'outStock', header: 'Total Keluar', type: 'number' },
  ],
  purchase_request: [
    { key: 'prNumber', header: 'No. PR', type: 'code' },
    { key: 'date', header: 'Tanggal', type: 'date' },
    { key: 'requesterName', header: 'Pemohon', type: 'text' },
    { key: 'itemName', header: 'Item', type: 'text', width: 30 },
    { key: 'qty', header: 'Qty', type: 'number' },
    { key: 'totalPrice', header: 'Total Price', type: 'money' },
    { key: 'shipmentCost', header: 'Shipment Cost', type: 'money' },
    { key: 'diskon', header: 'Discount', type: 'money' },
    { key: 'grandTotal', header: 'Grand Total', type: 'money', width: 18 },
    { key: 'status', header: 'Status', type: 'status' },
  ],
  delivery_order: [
    { key: 'doNumber', header: 'No. DO', type: 'code' },
    { key: 'prNumber', header: 'No. PR', type: 'code' },
    { key: 'date', header: 'Tanggal', type: 'date' },
    { key: 'itemName', header: 'Item', type: 'text' },
    { key: 'vendorName', header: 'Vendor', type: 'text' },
    { key: 'qtyOrdered', header: 'Dipesan', type: 'number' },
    { key: 'qtyReceived', header: 'Diterima', type: 'number' },
    { key: 'recipient', header: 'Penerima', type: 'text' },
    { key: 'status', header: 'Status', type: 'status' },
  ],
  submission: [
    { key: 'submissionCode', header: 'No. Pengajuan', type: 'code' },
    { key: 'date', header: 'Tanggal', type: 'date' },
    { key: 'title', header: 'Judul', type: 'text', width: 30 },
    { key: 'namaPembuat', header: 'Nama Pembuat', type: 'text' },
    // Item 9: kolom vendor menampilkan NAMA vendor, bukan kodenya.
    { key: 'vendorName', header: 'Vendor', type: 'text' },
    { key: 'category', header: 'Kategori', type: 'text' },
    { key: 'itemName', header: 'Item', type: 'text' },
    { key: 'proposedPrice', header: 'Estimasi', type: 'money' },
    { key: 'status', header: 'Status', type: 'status' },
  ],
  laptops: [
    { key: 'item', header: 'Spesifikasi', type: 'text', width: 30 },
    { key: 'user', header: 'PIC / User', type: 'text' },
    { key: 'status', header: 'Kondisi', type: 'status' },
    { key: 'date', header: 'Tanggal', type: 'date' },
  ],
  employees: [
    { key: 'employeeCode', header: 'Kode', type: 'code' },
    { key: 'nik', header: 'NIK', type: 'code' },
    { key: 'name', header: 'Nama', type: 'text' },
    { key: 'department', header: 'Departemen', type: 'text' },
    { key: 'position', header: 'Posisi', type: 'text' },
    { key: 'joinDate', header: 'Tanggal Masuk', type: 'date' },
    { key: 'status', header: 'Status', type: 'status' },
  ],
  leave_requests: [
    { key: 'requestCode', header: 'Kode', type: 'code' },
    { key: 'leaveType', header: 'Tipe', type: 'text' },
    { key: 'startDate', header: 'Mulai', type: 'date' },
    { key: 'endDate', header: 'Selesai', type: 'date' },
    { key: 'reason', header: 'Alasan', type: 'text', width: 34 },
    { key: 'status', header: 'Status', type: 'status' },
  ],
  findings: [
    { key: 'findingCode', header: 'Kode', type: 'code' },
    { key: 'date', header: 'Tanggal', type: 'date' },
    { key: 'agenName', header: 'Agen', type: 'text' },
    { key: 'findingType', header: 'Tipe', type: 'text' },
    { key: 'severity', header: 'Severity', type: 'status' },
    { key: 'description', header: 'Deskripsi', type: 'text', width: 40 },
    { key: 'status', header: 'Status', type: 'status' },
  ],
  recording_reviews: [
    { key: 'reviewCode', header: 'Kode', type: 'code' },
    { key: 'date', header: 'Tanggal', type: 'date' },
    { key: 'agenName', header: 'Agen', type: 'text' },
    { key: 'nasabahName', header: 'Nasabah', type: 'text' },
    { key: 'duration', header: 'Durasi', type: 'text' },
    { key: 'reviewedBy', header: 'Reviewer', type: 'text' },
    { key: 'compliance', header: 'Compliance', type: 'status' },
  ],
};

/** Kolom yang berisi nominal rupiah. */
export const MONEY_KEYS = new Set([
  'deposit', 'pinjol', 'amount', 'totalPrice', 'shipmentCost', 'diskon', 'grandTotal',
  'totalValue', 'price', 'proposedPrice', 'returnPrice', 'biaya',
]);

export function isMoneyColumn(col: ReportColumn): boolean {
  return col.type === 'money' || (MONEY_KEYS.has(col.key) && col.type !== 'code' && col.type !== 'date');
}