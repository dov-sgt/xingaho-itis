import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/session';
import { ok, serverError } from '@/lib/api';
import { toInt } from '@/lib/documents';
import { DEFAULT_PAGE_SIZE, LOW_STOCK_THRESHOLD } from '@/lib/config';

/**
 * Dashboard IT (item 10).
 * Menyediakan:
 *  - KPI ringkasan
 *  - Tabel "Transaksi Terakhir": nama item + jumlah stok, 10 baris per halaman,
 *    nilai stok < LOW_STOCK_THRESHOLD ditampilkan merah & tebal.
 */
export async function GET(req: NextRequest) {
  const authError = await requirePermission(req, 'dashboard', 'read');
  if (authError) return authError;

  try {
    const page = Math.max(1, toInt(req.nextUrl.searchParams.get('page'), 1));
    const pageSize = Math.max(1, Math.min(100, toInt(req.nextUrl.searchParams.get('pageSize'), DEFAULT_PAGE_SIZE)));

    const [
      totalMasterItems,
      totalVendors,
      totalTransactions,
      activeLoans,
      goodLoans,
      damagedLoans,
      pendingLoans,
      activeDeposits,
      totalPR,
      pendingPR,
      totalSpending,
      pendingSubmissions,
      openDeliveries,
      lowStockCount,
      recentStockTotal,
    ] = await Promise.all([
      prisma.masterItem.count(),
      prisma.masterVendor.count(),
      prisma.transactionItem.count(),
      prisma.transactionItem.count({ where: { status: 'Used' } }),
      prisma.transactionItem.count({ where: { status: 'Good' } }),
      prisma.transactionItem.count({ where: { status: 'Damage' } }),
      prisma.transactionItem.count({ where: { status: 'Pending' } }),
      prisma.transactionItem.aggregate({ where: { status: 'Used' }, _sum: { deposit: true } }),
      prisma.purchaseRequest.count(),
      prisma.purchaseRequest.count({ where: { status: 'Pending' } }),
      prisma.purchaseRequest.aggregate({ _sum: { grandTotal: true, totalPrice: true } }),
      prisma.vendorSubmission.count({ where: { status: 'Pending' } }),
      prisma.deliveryOrder.count({ where: { status: { in: ['Pending', 'Partial'] } } }),
      prisma.inventoryStock.count({ where: { currentStock: { lt: LOW_STOCK_THRESHOLD } } }),
      prisma.inventoryStock.count(),
    ]);

    // Item 10: 10 transaksi terakhir (stok paling baru bergerak).
    const [recentStocks, totalStocks] = await Promise.all([
      prisma.inventoryStock.findMany({
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          itemCode: true,
          itemName: true,
          category: true,
          currentStock: true,
          updatedAt: true,
        },
      }),
      prisma.inventoryStock.count(),
    ]);

    return ok({
      kpis: {
        totalMasterItems,
        totalVendors,
        totalTransactions,
        pendingLoans,
        activeLoans,
        goodLoans,
        damagedLoans,
        totalActiveDeposit: activeDeposits._sum.deposit || 0,
        totalPR,
        pendingPR,
        totalSpending: totalSpending._sum.grandTotal ?? totalSpending._sum.totalPrice ?? 0,
        pendingSubmissions,
        openDeliveries,
        lowStockCount,
        lowStockThreshold: LOW_STOCK_THRESHOLD,
      },
      recentStocks: recentStocks.map((s) => ({
        ...s,
        isLowStock: s.currentStock < LOW_STOCK_THRESHOLD,
      })),
      stocksPagination: {
        page,
        pageSize,
        total: totalStocks,
        totalPages: Math.max(1, Math.ceil(totalStocks / pageSize)),
      },
    });
  } catch (error: any) {
    return serverError(error.message);
  }
}