/**
 * Opsi dropdown yang dipakai bersama oleh API route dan halaman.
 * Dipisah dari `route.ts` karena Next.js hanya mengizinkan export HTTP method
 * dari file route.
 */

export const LEAVE_TYPES = ['Cuti Tahunan', 'Cuti Sakit', 'Cuti Karena Keadian', 'Izin', 'Lainnya'];

export const LEAVE_STATUSES = ['Pending', 'Approved', 'Rejected'];

export const FINDING_TYPES = ['Kualitas', 'Ketepatan Waktu', 'Pelayanan', 'Compliance', 'Lainnya'];

export const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];

export const FINDING_STATUSES = ['Open', 'In Progress', 'Resolved'];

export const COMPLIANCE_OPTIONS = ['Compliant', 'Non-Compliant', 'Need Review'];

export const SERVIS_STATUSES = ['Pending', 'In Progress', 'Completed', 'Cancelled'];

export const BOOKING_STATUSES = ['Pending', 'Confirmed', 'Cancelled', 'Completed'];

export const PAYMENT_STATUSES = ['Pending', 'Approved', 'Paid', 'Rejected'];

export const EMPLOYEE_STATUSES = ['Active', 'Inactive', 'Resign'];

export const VENDOR_STATUSES = ['Active', 'Inactive'];

/** Ubah array menjadi opsi untuk `CrudField` / `<select>`. */
export const toOptions = (list: readonly string[]) => list.map((v) => ({ value: v, label: v }));