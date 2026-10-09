import { Role, Division } from './rbac';

// Map roles to divisions
export const ROLE_DIVISION_MAP: Record<Role, Division | null> = {
  SUPERADMIN: null, // Can see all
  MANAGER_OPS: 'OPS',
  SPV_OPS: 'OPS',
  LEADER_OPS: 'OPS',
  AGEN: 'OPS',
  SPV_QC: 'QC',
  STAFF_QC: 'QC',
  SPV_HR: 'HR',
  STAFF_HR: 'HR',
};

export interface ReportField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'currency' | 'badge';
  width?: string;
}

export interface ReportConfig {
  id: string;
  title: string;
  description: string;
  division: Division;
  endpoint: string;
  fields: ReportField[];
  filters: {
    searchable: boolean;
    dateRange: boolean;
    statusFilter?: { key: string; options: { value: string; label: string }[] };
  };
  exportable: boolean;
  printable: boolean;
}

export const DIVISION_REPORTS: Record<Division, ReportConfig[]> = {
  IT: [
    {
      id: 'headset-transactions',
      title: 'Rekap Transaksi Headset',
      description: 'Laporan peminjaman, pengembalian, dan deposit headset',
      division: 'IT',
      endpoint: '/api/reports?type=headset',
      fields: [
        { key: 'id', label: 'ID', type: 'text', width: '60px' },
        { key: 'date', label: 'Tanggal', type: 'date' },
        { key: 'nik', label: 'NIK', type: 'text' },
        { key: 'name', label: 'Nama Karyawan', type: 'text' },
        { key: 'project', label: 'Project', type: 'text' },
        { key: 'vendor', label: 'Vendor', type: 'text' },
        { key: 'condition', label: 'Kondisi', type: 'badge' },
        { key: 'deposit', label: 'Deposit', type: 'currency' },
        { key: 'status', label: 'Status', type: 'badge' },
      ],
      filters: {
        searchable: true,
        dateRange: true,
        statusFilter: {
          key: 'status',
          options: [
            { value: 'Used', label: 'Digunakan' },
            { value: 'Return', label: 'Dikembalikan' },
            { value: 'Resign', label: 'Resign' },
          ],
        },
      },
      exportable: true,
      printable: true,
    },
    {
      id: 'inventory-stock',
      title: 'Rekap Stok Inventaris',
      description: 'Laporan stok barang masuk dan keluar',
      division: 'IT',
      endpoint: '/api/reports?type=stocks',
      fields: [
        { key: 'itemName', label: 'Nama Item', type: 'text' },
        { key: 'itemCode', label: 'Kode', type: 'text' },
        { key: 'category', label: 'Kategori', type: 'badge' },
        { key: 'currentStock', label: 'Ready Stock', type: 'number' },
        { key: 'inStock', label: 'Total Masuk', type: 'number' },
        { key: 'outStock', label: 'Total Keluar', type: 'number' },
        { key: 'note', label: 'Keterangan', type: 'text' },
      ],
      filters: {
        searchable: true,
        dateRange: false,
      },
      exportable: true,
      printable: true,
    },
    {
      id: 'purchase-requests',
      title: 'Rekap Purchase Request',
      description: 'Laporan pengadaan barang dan anggaran',
      division: 'IT',
      endpoint: '/api/reports?type=pr',
      fields: [
        { key: 'prNumber', label: 'No PR', type: 'text' },
        { key: 'date', label: 'Tanggal', type: 'date' },
        { key: 'itemName', label: 'Nama Barang', type: 'text' },
        { key: 'typeItem', label: 'Kategori', type: 'badge' },
        { key: 'qty', label: 'Qty', type: 'number' },
        { key: 'totalPrice', label: 'Total Harga', type: 'currency' },
        { key: 'status', label: 'Status', type: 'badge' },
      ],
      filters: {
        searchable: true,
        dateRange: true,
        statusFilter: {
          key: 'status',
          options: [
            { value: 'Pending', label: 'Pending' },
            { value: 'Approved', label: 'Disetujui' },
            { value: 'Completed', label: 'Selesai' },
            { value: 'Rejected', label: 'Ditolak' },
          ],
        },
      },
      exportable: true,
      printable: true,
    },
    {
      id: 'laptop-assets',
      title: 'Rekap Aset Laptop',
      description: 'Laporan alokasi dan kondisi laptop',
      division: 'IT',
      endpoint: '/api/reports?type=laptops',
      fields: [
        { key: 'item', label: 'Spesifikasi', type: 'text' },
        { key: 'user', label: 'PIC / User', type: 'text' },
        { key: 'status', label: 'Kondisi', type: 'badge' },
      ],
      filters: {
        searchable: true,
        dateRange: false,
      },
      exportable: true,
      printable: true,
    },
  ],
  OPS: [
    {
      id: 'ops-tasks',
      title: 'Rekap Tugas Operasional',
      description: 'Laporan tugas dan aktivitas operasional',
      division: 'OPS',
      endpoint: '/api/reports?type=ops-tasks',
      fields: [
        { key: 'taskCode', label: 'Kode Tugas', type: 'text' },
        { key: 'date', label: 'Tanggal', type: 'date' },
        { key: 'taskName', label: 'Nama Tugas', type: 'text' },
        { key: 'assignee', label: 'Penanggung Jawab', type: 'text' },
        { key: 'priority', label: 'Prioritas', type: 'badge' },
        { key: 'status', label: 'Status', type: 'badge' },
      ],
      filters: {
        searchable: true,
        dateRange: true,
        statusFilter: {
          key: 'status',
          options: [
            { value: 'Pending', label: 'Pending' },
            { value: 'In Progress', label: 'Dikerjakan' },
            { value: 'Done', label: 'Selesai' },
          ],
        },
      },
      exportable: true,
      printable: true,
    },
    {
      id: 'ops-schedule',
      title: 'Rekap Jadwal Operasional',
      description: 'Laporan jadwal kegiatan operasional',
      division: 'OPS',
      endpoint: '/api/reports?type=ops-schedule',
      fields: [
        { key: 'scheduleCode', label: 'Kode Jadwal', type: 'text' },
        { key: 'date', label: 'Tanggal', type: 'date' },
        { key: 'activity', label: 'Aktivitas', type: 'text' },
        { key: 'location', label: 'Lokasi', type: 'text' },
        { key: 'pic', label: 'PIC', type: 'text' },
      ],
      filters: {
        searchable: true,
        dateRange: true,
      },
      exportable: true,
      printable: true,
    },
  ],
  QC: [
    {
      id: 'qc-findings',
      title: 'Rekap Temuan QC',
      description: 'Laporan temuan quality control',
      division: 'QC',
      endpoint: '/api/reports?type=qc-findings',
      fields: [
        { key: 'findingCode', label: 'Kode Temuan', type: 'text' },
        { key: 'date', label: 'Tanggal', type: 'date' },
        { key: 'description', label: 'Deskripsi', type: 'text' },
        { key: 'severity', label: 'Severity', type: 'badge' },
        { key: 'status', label: 'Status', type: 'badge' },
      ],
      filters: {
        searchable: true,
        dateRange: true,
        statusFilter: {
          key: 'status',
          options: [
            { value: 'Open', label: 'Terbuka' },
            { value: 'In Progress', label: 'Dikerjakan' },
            { value: 'Resolved', label: 'Selesai' },
          ],
        },
      },
      exportable: true,
      printable: true,
    },
    {
      id: 'qc-recording',
      title: 'Rekam Recording',
      description: 'Laporan rekaman panggilan untuk audit',
      division: 'QC',
      endpoint: '/api/reports?type=qc-recording',
      fields: [
        { key: 'recordingUrl', label: 'Link Recording', type: 'text' },
        { key: 'date', label: 'Tanggal', type: 'date' },
        { key: 'agentName', label: 'Nama Agent', type: 'text' },
        { key: 'duration', label: 'Durasi', type: 'text' },
        { key: 'reviewedBy', label: 'Reviewer', type: 'text' },
      ],
      filters: {
        searchable: true,
        dateRange: true,
      },
      exportable: true,
      printable: true,
    },
  ],
  HR: [
    {
      id: 'hr-employees',
      title: 'Rekap Karyawan',
      description: 'Laporan data karyawan',
      division: 'HR',
      endpoint: '/api/reports?type=hr-employees',
      fields: [
        { key: 'employeeCode', label: 'Kode Karyawan', type: 'text' },
        { key: 'name', label: 'Nama', type: 'text' },
        { key: 'department', label: 'Departemen', type: 'text' },
        { key: 'position', label: 'Posisi', type: 'text' },
        { key: 'joinDate', label: 'Tanggal Masuk', type: 'date' },
        { key: 'status', label: 'Status', type: 'badge' },
      ],
      filters: {
        searchable: true,
        dateRange: false,
      },
      exportable: true,
      printable: true,
    },
    {
      id: 'hr-leave',
      title: 'Rekap Cuti',
      description: 'Laporan pengajuan cuti karyawan',
      division: 'HR',
      endpoint: '/api/reports?type=hr-leave',
      fields: [
        { key: 'requestCode', label: 'Kode Pengajuan', type: 'text' },
        { key: 'employeeId', label: 'Karyawan', type: 'text' },
        { key: 'leaveType', label: 'Jenis Cuti', type: 'text' },
        { key: 'startDate', label: 'Dari Tanggal', type: 'date' },
        { key: 'endDate', label: 'Sampai Tanggal', type: 'date' },
        { key: 'status', label: 'Status', type: 'badge' },
      ],
      filters: {
        searchable: true,
        dateRange: true,
      },
      exportable: true,
      printable: true,
    },
  ],
};

// Get reports for a specific division
export function getReportsForDivision(division: Division): ReportConfig[] {
  return DIVISION_REPORTS[division] || [];
}

// Get all divisions
export function getAllDivisions(): Division[] {
  return ['IT', 'OPS', 'QC', 'HR'];
}
