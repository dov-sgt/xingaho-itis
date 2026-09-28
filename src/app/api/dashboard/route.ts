import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/session';
import { ok, serverError } from '@/lib/api';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const authError = requirePermission(req, 'dashboard', 'read');
  if (authError) return authError;

  try {
    const totalMasterItems = await prisma.masterItem.count();
    const totalVendors = await prisma.masterVendor.count();

    // Headset Transactions
    const totalTransactions = await prisma.transactionItem.count();
    const activeLoans = await prisma.transactionItem.count({
      where: { status: 'Used' },
    });
    const returnedLoans = await prisma.transactionItem.count({
      where: { status: 'Return' },
    });
    const rejectedLoans = await prisma.transactionItem.count({
      where: { status: 'Reject' },
    });

    const activeDeposits = await prisma.transactionItem.aggregate({
      where: { status: 'Used' },
      _sum: { deposit: true },
    });

    // Purchase Requests
    const totalPR = await prisma.purchaseRequest.count();
    const pendingPR = await prisma.purchaseRequest.count({
      where: { status: 'Pending' },
    });
    const totalPRSpending = await prisma.purchaseRequest.aggregate({
      _sum: { totalPrice: true },
    });

    // Laptops
    const totalLaptops = await prisma.laptopAsset.count();
    const brokenLaptops = await prisma.laptopAsset.count({
      where: { status: 'Broken' },
    });
    const goodLaptops = await prisma.laptopAsset.count({
      where: { status: 'Good' },
    });

    // Inventory Stocks - sorted by most recently updated
    const stocks = await prisma.inventoryStock.findMany({
      orderBy: { updatedAt: 'desc' },
    });

    // Category breakdown from MasterItem
    const masterItems = await prisma.masterItem.findMany();
    const categoryCounts: Record<string, number> = {};
    for (const item of masterItems) {
      categoryCounts[item.typeItem] = (categoryCounts[item.typeItem] || 0) + 1;
    }

    // Recent Transactions
    const recentTransactions = await prisma.transactionItem.findMany({
      take: 8,
      orderBy: { id: 'desc' },
    });

    // Pending Vendor Submissions
    const pendingSubmissions = await prisma.vendorSubmission.count({
      where: { status: 'Pending' },
    });

    return ok({
      kpis: {
        totalMasterItems,
        totalVendors,
        totalTransactions,
        activeLoans,
        returnedLoans,
        rejectedLoans,
        totalActiveDeposit: activeDeposits._sum.deposit || 0,
        totalPR,
        pendingPR,
        totalPRSpending: totalPRSpending._sum.totalPrice || 0,
        totalLaptops,
        brokenLaptops,
        goodLaptops,
        pendingSubmissions,
      },
      stocks,
      categoryCounts,
      recentTransactions,
    });
  } catch (error: any) {
    return serverError(error.message);
  }
}
