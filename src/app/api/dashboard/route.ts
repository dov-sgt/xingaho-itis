import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, getAuthContext } from '@/lib/session';
import { ok, badRequest, serverError } from '@/lib/api';
import { toInt } from '@/lib/documents';
import { isSuperAdmin } from '@/lib/rbac';
import { DEFAULT_PAGE_SIZE, LOW_STOCK_THRESHOLD } from '@/lib/config';

/**
 * Dashboard — Konten berbeda per divisi.
 *
 * Divisi & role selalu dibaca dari SESSION (database), bukan dari parameter URL,
 * sehingga user tidak bisa membuka dashboard divisi lain hanya dengan
 * menebak-nebak query string.
 *
 * SuperAdmin diberi pemilih divisi, dan datanya selalu mengikuti divisi
 * yang dipilih.
 */

const SUPPORTED = ['IT', 'OPS', 'QC', 'HR'] as const;
type DivisionCode = (typeof SUPPORTED)[number];

function resolveDivision(requested: string | null, authDivision: string, role: string): DivisionCode {
  const fallback = (SUPPORTED.includes(authDivision as DivisionCode) ? authDivision : 'IT') as DivisionCode;
  if (isSuperAdmin(role) && requested && SUPPORTED.includes(requested as DivisionCode)) {
    return requested as DivisionCode;
  }
  return fallback;
}

export async function GET(req: NextRequest) {
  const authError = await requirePermission(req, 'dashboard', 'read');
  if (authError) return authError;

  try {
    const auth = await getAuthContext(req);
    if (!auth) return badRequest('Anda belum login.');

    const { searchParams } = new URL(req.url);
    const division = resolveDivision(searchParams.get('division'), auth.divisionCode, auth.role);
    const page = Math.max(1, toInt(searchParams.get('page'), 1));
    const pageSize = Math.max(1, Math.min(100, toInt(searchParams.get('pageSize'), DEFAULT_PAGE_SIZE)));

    const payload =
      division === 'IT'
        ? await buildIt(page, pageSize)
        : division === 'OPS'
          ? await buildOps(page, pageSize)
          : division === 'QC'
            ? await buildQc(page, pageSize)
            : await buildHr(page, pageSize);

    return ok({
      division,
      // SuperAdmin boleh berpindah divisi; user lain terkunci ke divisinya.
      canSwitchDivision: isSuperAdmin(auth.role),
      divisions: SUPPORTED,
      ...payload,
    });
  } catch (error: any) {
    return serverError(error.message);
  }
}

/* ================================================================== */
/* IT — inventaris, headset, procurement                              */
/* ================================================================== */

async function buildIt(page: number, pageSize: number) {
  const [
    totalMasterItems, totalVendors, totalTransactions,
    pendingLoans, activeLoans, goodLoans, damagedLoans,
    activeDeposits, totalPR, pendingPR, spending,
    pendingSubmissions, openDeliveries, lowStockCount,
    damagedTotal, stockRows, totalStocks,
  ] = await Promise.all([
    prisma.masterItem.count(),
    prisma.masterVendor.count(),
    prisma.transactionItem.count(),
    prisma.transactionItem.count({ where: { status: 'Pending' } }),
    prisma.transactionItem.count({ where: { status: 'Used' } }),
    prisma.transactionItem.count({ where: { status: 'Good' } }),
    prisma.transactionItem.count({ where: { status: 'Damage' } }),
    prisma.transactionItem.aggregate({ where: { status: 'Used' }, _sum: { deposit: true } }),
    prisma.purchaseRequest.count(),
    prisma.purchaseRequest.count({ where: { status: 'Pending' } }),
    prisma.purchaseRequest.aggregate({ _sum: { grandTotal: true, totalPrice: true } }),
    prisma.vendorSubmission.count({ where: { status: 'Pending' } }),
    prisma.deliveryOrder.count({ where: { status: { in: ['Pending', 'Partial'] } } }),
    prisma.inventoryStock.count({ where: { currentStock: { lt: LOW_STOCK_THRESHOLD } } }),
    prisma.damagedItem.aggregate({ _sum: { qty: true } }),
    prisma.inventoryStock.findMany({
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, itemCode: true, itemName: true, category: true, currentStock: true, updatedAt: true },
    }),
    prisma.inventoryStock.count(),
  ]);

  return {
    kpis: [
      { key: 'totalMasterItems', label: 'Master Item', value: totalMasterItems, tone: 'primary', icon: 'boxes' },
      { key: 'totalVendors', label: 'Vendor', value: totalVendors, tone: 'info', icon: 'building' },
      { key: 'activeLoans', label: 'Headset Digunakan', value: activeLoans, tone: 'info', icon: 'headphones', hint: `Deposit ${fmt(activeDeposits._sum.deposit ?? 0)}` },
      { key: 'damagedTotal', label: 'Unit Damage', value: damagedTotal._sum.qty ?? 0, tone: 'danger', icon: 'alert', hint: 'Tidak menambah stok' },
      { key: 'totalPR', label: 'Purchase Request', value: totalPR, tone: 'primary', icon: 'cart', hint: `${pendingPR} menunggu approval` },
      { key: 'totalSpending', label: 'Nilai Pengadaan', value: spending._sum.grandTotal ?? spending._sum.totalPrice ?? 0, tone: 'success', icon: 'wallet', money: true },
      { key: 'openDeliveries', label: 'DO Berjalan', value: openDeliveries, tone: 'warning', icon: 'truck', hint: 'Pending / Partial' },
      { key: 'lowStockCount', label: 'Stok Menipis', value: lowStockCount, tone: 'danger', icon: 'trending', hint: `Stok < ${LOW_STOCK_THRESHOLD}` },
    ],
    summary: [
      { key: 'pendingSubmissions', label: 'Pengajuan menunggu approval', value: pendingSubmissions, tone: 'warning', feature: 'vendor_submission', href: '/transactions/vendor-submissions' },
      { key: 'pendingPR', label: 'Purchase Request pending', value: pendingPR, tone: 'primary', feature: 'purchase_request', href: '/transactions/purchase-requests' },
      { key: 'openDeliveries', label: 'Delivery Order berjalan', value: openDeliveries, tone: 'info', feature: 'delivery_order', href: '/transactions/delivery-orders' },
    ],
    lifecycle: [
      { label: 'Pending', value: pendingLoans, tone: 'warning' },
      { label: 'Used (dipakai)', value: activeLoans, tone: 'info' },
      { label: 'Good (dikembalikan)', value: goodLoans, tone: 'success' },
      { label: 'Damage', value: damagedLoans, tone: 'danger' },
    ],
    // Item 10: nama item + jumlah stok, 10 baris per halaman
    recent: {
      title: 'Transaksi Terakhir',
      description: `10 barang yang paling baru bergerak beserta jumlah stoknya (stok di bawah ${LOW_STOCK_THRESHOLD} ditandai merah).`,
      columns: ['item', 'category', 'stock', 'updatedAt', 'flag'],
      rows: stockRows.map((s) => ({
        id: s.id,
        name: s.itemName,
        code: s.itemCode,
        sub: s.category || '-',
        value: s.currentStock,
        numeric: true,
        updatedAt: s.updatedAt,
        isLow: s.currentStock < LOW_STOCK_THRESHOLD,
      })),
    },
    pagination: { page, pageSize, total: totalStocks, totalPages: Math.max(1, Math.ceil(totalStocks / pageSize)) },
  };
}

/* ================================================================== */
/* OPS — nasabah, remarks, payment achievement                          */
/* ================================================================== */

async function buildOps(page: number, pageSize: number) {
  const [
    totalNasabah, activeNasabah, totalPinjol, totalRemarks,
    promisesPending, totalAchievement, paidAchievement, achievementPending,
    headsetUsed, pendingSubmissions, totalPR,
    remarks, totalRemarksAll,
  ] = await Promise.all([
    prisma.nasabah.count(),
    prisma.nasabah.count({ where: { status: 'Aktif' } }),
    prisma.nasabah.aggregate({ _sum: { pinjol: true } }),
    prisma.remark.count(),
    prisma.remark.count({ where: { promiseToPay: true } }),
    prisma.paymentAchievement.aggregate({ _sum: { amount: true } }),
    prisma.paymentAchievement.aggregate({ where: { status: 'Paid' }, _sum: { amount: true } }),
    prisma.paymentAchievement.count({ where: { status: 'Pending' } }),
    prisma.transactionItem.count({ where: { status: 'Used' } }),
    prisma.vendorSubmission.count({ where: { status: 'Pending' } }),
    prisma.purchaseRequest.count(),
    prisma.remark.findMany({
      orderBy: { id: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { nasabah: { select: { nik: true, nama: true } } },
    }),
    prisma.remark.count(),
  ]);

  return {
    kpis: [
      { key: 'totalNasabah', label: 'Total Nasabah', value: totalNasabah, tone: 'primary', icon: 'users' },
      { key: 'activeNasabah', label: 'Nasabah Aktif', value: activeNasabah, tone: 'success', icon: 'users' },
      { key: 'totalPinjol', label: 'Total Pinjol', value: totalPinjol._sum.pinjol ?? 0, tone: 'warning', icon: 'wallet', money: true },
      { key: 'totalRemarks', label: 'Total Remarks', value: totalRemarks, tone: 'info', icon: 'clipboard' },
      { key: 'promisesPending', label: 'Janji Bayar', value: promisesPending, tone: 'danger', icon: 'clock', hint: 'Perlu ditindaklanjuti' },
      { key: 'totalAchievement', label: 'Total Pencapaian', value: totalAchievement._sum.amount ?? 0, tone: 'primary', icon: 'credit', money: true },
      { key: 'paidAchievement', label: 'Sudah Dibayar', value: paidAchievement._sum.amount ?? 0, tone: 'success', icon: 'check', money: true },
      { key: 'achievementPending', label: 'Achievement Pending', value: achievementPending, tone: 'warning', icon: 'clock' },
    ],
    summary: [
      { key: 'promisesPending', label: 'Janji bayar tercatat', value: promisesPending, tone: 'danger', feature: 'transaction_stockout', href: '/remarks' },
      { key: 'pendingSubmissions', label: 'Pengajuan menunggu approval', value: pendingSubmissions, tone: 'warning', feature: 'vendor_submission', href: '/transactions/vendor-submissions' },
      { key: 'headsetUsed', label: 'Headset sedang dipakai', value: headsetUsed, tone: 'info', feature: 'transaction_headset', href: '/transactions/items' },
    ],
    lifecycle: [
      { label: 'Nasabah Aktif', value: activeNasabah, tone: 'success' },
      { label: 'Remarks tercatat', value: totalRemarks, tone: 'info' },
      { label: 'Janji bayar aktif', value: promisesPending, tone: 'danger' },
      { label: 'Achievement pending', value: achievementPending, tone: 'warning' },
    ],
    recent: {
      title: 'Remarks Terakhir',
      description: 'Catatan follow-up nasabah yang paling baru tercatat.',
      columns: ['name', 'sub', 'value', 'updatedAt', 'flag'],
      rows: remarks.map((r) => ({
        id: r.id,
        name: r.nasabah?.nama ?? '-',
        code: r.nasabah?.nik ?? '-',
        sub: (r.remark || '').slice(0, 60),
        value: r.promiseToPay ? (r.promiseDate ? new Date(r.promiseDate).toISOString().slice(0, 10) : 'Ada') : '—',
        updatedAt: r.createdAt,
        isLow: r.promiseToPay,
      })),
    },
    pagination: { page, pageSize, total: totalRemarksAll, totalPages: Math.max(1, Math.ceil(totalRemarksAll / pageSize)) },
  };
}

/* ================================================================== */
/* QC — findings & recording review                                    */
/* ================================================================== */

async function buildQc(page: number, pageSize: number) {
  const [
    totalFindings, openFindings, criticalFindings, highFindings,
    resolvedFindings, inProgressFindings,
    totalReviews, compliantReviews, nonCompliantReviews, needReviewReviews,
    findings, totalFindingsAll,
  ] = await Promise.all([
    prisma.finding.count(),
    prisma.finding.count({ where: { status: 'Open' } }),
    prisma.finding.count({ where: { severity: 'Critical' } }),
    prisma.finding.count({ where: { severity: 'High' } }),
    prisma.finding.count({ where: { status: 'Resolved' } }),
    prisma.finding.count({ where: { status: 'In Progress' } }),
    prisma.recordingReview.count(),
    prisma.recordingReview.count({ where: { compliance: 'Compliant' } }),
    prisma.recordingReview.count({ where: { compliance: 'Non-Compliant' } }),
    prisma.recordingReview.count({ where: { compliance: 'Need Review' } }),
    prisma.finding.findMany({ orderBy: { id: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.finding.count(),
  ]);

  return {
    kpis: [
      { key: 'totalFindings', label: 'Total Temuan', value: totalFindings, tone: 'primary', icon: 'alert' },
      { key: 'openFindings', label: 'Temuan Terbuka', value: openFindings, tone: 'warning', icon: 'clock' },
      { key: 'inProgressFindings', label: 'Sedang Ditangani', value: inProgressFindings, tone: 'info', icon: 'progress' },
      { key: 'resolvedFindings', label: 'Temuan Selesai', value: resolvedFindings, tone: 'success', icon: 'check' },
      { key: 'criticalFindings', label: 'Severity Critical', value: criticalFindings, tone: 'danger', icon: 'alert', hint: 'Prioritas tertinggi' },
      { key: 'highFindings', label: 'Severity High', value: highFindings, tone: 'warning', icon: 'alert' },
      { key: 'totalReviews', label: 'Recording Review', value: totalReviews, tone: 'primary', icon: 'headphones' },
      { key: 'nonCompliantReviews', label: 'Non-Compliant', value: nonCompliantReviews, tone: 'danger', icon: 'alert', hint: `${compliantReviews} compliant` },
    ],
    summary: [
      { key: 'openFindings', label: 'Temuan belum ditutup', value: openFindings, tone: 'warning', feature: 'finding', href: '/qc/findings' },
      { key: 'needReviewReviews', label: 'Recording perlu review ulang', value: needReviewReviews, tone: 'info', feature: 'recording_review', href: '/qc/recording-reviews' },
      { key: 'nonCompliantReviews', label: 'Recording tidak compliant', value: nonCompliantReviews, tone: 'danger', feature: 'recording_review', href: '/qc/recording-reviews' },
    ],
    lifecycle: [
      { label: 'Open', value: openFindings, tone: 'warning' },
      { label: 'In Progress', value: inProgressFindings, tone: 'info' },
      { label: 'Resolved', value: resolvedFindings, tone: 'success' },
      { label: 'Need Review (recording)', value: needReviewReviews, tone: 'danger' },
    ],
    recent: {
      title: 'Temuan QC Terakhir',
      description: '10 temuan QC terbaru beserta severity dan statusnya.',
      columns: ['name', 'sub', 'value', 'updatedAt', 'flag'],
      rows: findings.map((f) => ({
        id: f.id,
        name: f.agenName,
        code: f.findingCode,
        sub: f.description,
        value: f.severity,
        updatedAt: f.date,
        isLow: f.severity === 'Critical' || f.severity === 'High' || f.status !== 'Resolved',
      })),
    },
    pagination: { page, pageSize, total: totalFindingsAll, totalPages: Math.max(1, Math.ceil(totalFindingsAll / pageSize)) },
  };
}

/* ================================================================== */
/* HR — karyawan & cuti                                                */
/* ================================================================== */

async function buildHr(page: number, pageSize: number) {
  const [
    totalEmployees, activeEmployees, resignedEmployees, newThisYear,
    totalLeave, pendingLeave, approvedLeave, rejectedLeave,
    employees, totalEmployeesAll, departments,
  ] = await Promise.all([
    prisma.employee.count(),
    prisma.employee.count({ where: { status: 'Active' } }),
    prisma.employee.count({ where: { status: 'Resign' } }),
    prisma.employee.count({
      where: { joinDate: { gte: new Date(new Date().getFullYear(), 0, 1) } },
    }),
    prisma.leaveRequest.count(),
    prisma.leaveRequest.count({ where: { status: 'Pending' } }),
    prisma.leaveRequest.count({ where: { status: 'Approved' } }),
    prisma.leaveRequest.count({ where: { status: 'Rejected' } }),
    prisma.employee.findMany({
      orderBy: { id: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, employeeCode: true, name: true, nik: true, department: true, position: true, joinDate: true, status: true },
    }),
    prisma.employee.count(),
    prisma.employee.findMany({ distinct: ['department'], select: { department: true } }),
  ]);

  return {
    kpis: [
      { key: 'totalEmployees', label: 'Total Karyawan', value: totalEmployees, tone: 'primary', icon: 'users' },
      { key: 'activeEmployees', label: 'Karyawan Aktif', value: activeEmployees, tone: 'success', icon: 'check' },
      { key: 'resignedEmployees', label: 'Resign', value: resignedEmployees, tone: 'neutral', icon: 'alert' },
      { key: 'newThisYear', label: 'Karyawan Baru', value: newThisYear, tone: 'info', icon: 'plus', hint: `Tahun ${new Date().getFullYear()}` },
      { key: 'departmentCount', label: 'Departemen', value: departments.length, tone: 'primary', icon: 'building' },
      { key: 'totalLeave', label: 'Total Pengajuan Cuti', value: totalLeave, tone: 'primary', icon: 'clipboard' },
      { key: 'pendingLeave', label: 'Cuti Menunggu', value: pendingLeave, tone: 'warning', icon: 'clock', hint: 'Perlu approval' },
      { key: 'approvedLeave', label: 'Cuti Disetujui', value: approvedLeave, tone: 'success', icon: 'check', hint: `${rejectedLeave} ditolak` },
    ],
    summary: [
      { key: 'pendingLeave', label: 'Pengajuan cuti pending', value: pendingLeave, tone: 'warning', feature: 'leave_request', href: '/hr/leave-requests' },
      { key: 'newThisYear', label: 'Karyawan baru tahun ini', value: newThisYear, tone: 'success', feature: 'employee_data', href: '/hr/employees' },
      { key: 'resignedEmployees', label: 'Karyawan resign', value: resignedEmployees, tone: 'neutral', feature: 'employee_data', href: '/hr/employees' },
    ],
    lifecycle: [
      { label: 'Cuti Pending', value: pendingLeave, tone: 'warning' },
      { label: 'Cuti Approved', value: approvedLeave, tone: 'success' },
      { label: 'Cuti Rejected', value: rejectedLeave, tone: 'danger' },
      { label: 'Resign', value: resignedEmployees, tone: 'neutral' },
    ],
    recent: {
      title: 'Karyawan Terbaru',
      description: '10 data karyawan yang terakhir ditambahkan.',
      columns: ['name', 'sub', 'value', 'updatedAt', 'flag'],
      rows: employees.map((e) => ({
        id: e.id,
        name: e.name,
        code: e.nik,
        sub: `${e.department} · ${e.position}`,
        value: e.employeeCode,
        updatedAt: e.joinDate,
        isLow: e.status !== 'Active',
      })),
    },
    pagination: { page, pageSize, total: totalEmployeesAll, totalPages: Math.max(1, Math.ceil(totalEmployeesAll / pageSize)) },
  };
}

function fmt(n: number): string {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n ?? 0);
}