import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { sendError, sendSuccess } from '../utils/response.js';
import { Role } from '@prisma/client';

function normalizeTimezone(tz?: string): string {
  if (!tz || typeof tz !== 'string' || tz.trim() === '') return 'Asia/Kolkata';
  const clean = tz.trim();
  if (clean.toUpperCase() === 'IST' || clean === '+05:30' || clean === 'UTC+5:30' || clean === 'GMT+5:30') {
    return 'Asia/Kolkata';
  }
  return clean;
}

function getLocalHourInTimezone(date: Date, timeZone: string = 'Asia/Kolkata'): number {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      hour12: false,
    });
    const hourStr = formatter.format(date);
    const h = parseInt(hourStr, 10);
    return h === 24 ? 0 : h;
  } catch {
    const utcMs = date.getTime() + (date.getTimezoneOffset() * 60000);
    const istDate = new Date(utcMs + (5.5 * 3600000));
    return istDate.getHours();
  }
}

function getStartAndEndOfDayInTimezone(timeZone: string = 'Asia/Kolkata', dayOffset: number = 0): { start: Date; end: Date } {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const dateStr = formatter.format(now);
    const [year, month, day] = dateStr.split('-').map(Number);
    const testDate = new Date(Date.UTC(year, month - 1, day + dayOffset, 12, 0, 0));
    const tzStr = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'shortOffset' }).format(testDate);
    let offsetMinutes = 330;
    const match = tzStr.match(/GMT([+-]\d+)(?::(\d+))?/);
    if (match) {
      const hours = parseInt(match[1], 10);
      const mins = match[2] ? parseInt(match[2], 10) : 0;
      offsetMinutes = (hours * 60) + (hours >= 0 ? mins : -mins);
    }
    const startUtcMs = Date.UTC(year, month - 1, day + dayOffset, 0, 0, 0, 0) - (offsetMinutes * 60000);
    const endUtcMs = Date.UTC(year, month - 1, day + dayOffset, 23, 59, 59, 999) - (offsetMinutes * 60000);
    return { start: new Date(startUtcMs), end: new Date(endUtcMs) };
  } catch {
    const now = new Date();
    const istNow = new Date(now.getTime() + (5.5 * 3600000));
    const year = istNow.getUTCFullYear();
    const month = istNow.getUTCMonth();
    const day = istNow.getUTCDate() + dayOffset;
    const start = new Date(Date.UTC(year, month, day, 0, 0, 0, 0) - (5.5 * 3600000));
    const end = new Date(Date.UTC(year, month, day, 23, 59, 59, 999) - (5.5 * 3600000));
    return { start, end };
  }
}

export async function getOrgAnalytics(req: Request, res: Response) {
  const isSuperAdmin = req.user?.role === Role.SUPER_ADMIN;
  const orgId = isSuperAdmin
    ? (req.query.organizationId as string) || undefined
    : req.user?.organizationId;

  if (!isSuperAdmin && !orgId) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'User has no associated organization');
  }

  const { branchId, startDate, endDate, range, timezone } = req.query as Record<string, string>;
  const clientTimezone = normalizeTimezone(timezone || (req.headers['x-timezone'] as string) || process.env.APP_TIMEZONE);

  let fromDate: Date | undefined;
  let toDate: Date | undefined;

  if (startDate) {
    fromDate = new Date(startDate.includes('T') ? startDate : `${startDate}T00:00:00.000Z`);
  }
  if (endDate) {
    toDate = new Date(endDate.includes('T') ? endDate : `${endDate}T23:59:59.999Z`);
  }

  if (!fromDate && range) {
    const now = new Date();
    const rangeLower = range.toLowerCase();
    if (rangeLower.includes('today')) {
      const bounds = getStartAndEndOfDayInTimezone(clientTimezone, 0);
      fromDate = bounds.start;
      toDate = bounds.end;
    } else if (rangeLower.includes('yesterday')) {
      const bounds = getStartAndEndOfDayInTimezone(clientTimezone, -1);
      fromDate = bounds.start;
      toDate = bounds.end;
    } else if (rangeLower.includes('week') || rangeLower.includes('last7') || rangeLower.includes('7')) {
      fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      toDate = new Date();
    } else if (rangeLower.includes('last30') || rangeLower.includes('30')) {
      fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      toDate = new Date();
    } else if (rangeLower.includes('month')) {
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
      toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (rangeLower.includes('all')) {
      fromDate = undefined;
      toDate = undefined;
    }
  }

  let effectiveBranchId = branchId && branchId !== 'ALL' ? branchId : undefined;
  let staffBranchIds: string[] | undefined;

  if (req.user?.role === Role.STAFF) {
    const userBranches = await prisma.userBranch.findMany({
      where: { userId: req.user.id },
      select: { branchId: true },
    });
    staffBranchIds = userBranches.map((b) => b.branchId);

    if (staffBranchIds.length === 0) {
      return sendError(res, 403, 'FORBIDDEN', 'Staff member is not assigned to any counter');
    }

    // Always constrain staff to their assigned counter — never deny access if a stale/mismatched branchId was passed
    if (!effectiveBranchId || !staffBranchIds.includes(effectiveBranchId)) {
      effectiveBranchId = staffBranchIds[0];
    }
  }

  const dateFilter: any = {};
  if (fromDate) dateFilter.gte = fromDate;
  if (toDate) dateFilter.lte = toDate;

  const txWhere: any = {
    ...(orgId
      ? {
          OR: [
            { session: { organizationId: orgId } },
            { branch: { organizationId: orgId } },
          ],
        }
      : {}),
    ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
    ...(fromDate || toDate ? { createdAt: dateFilter } : {}),
  };

  const [
    transactions,
    totalCards,
    blockedCardsCount,
    availableCardsCount,
    activeSessionsCount,
    branches,
    lowStockCount,
    activeSessionsList,
    settledSessionsCount,
    staffUsers,
    historyEvents,
    allSessions,
  ] = await Promise.all([
    prisma.transaction.findMany({
      where: txWhere,
      include: {
        branch: true,
        session: {
          include: {
            card: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.card.count({
      where: {
        ...(orgId ? { organizationId: orgId } : {}),
      },
    }),
    prisma.card.count({
      where: {
        ...(orgId ? { organizationId: orgId } : {}),
        status: 'BLOCKED',
      },
    }),
    prisma.card.count({
      where: {
        ...(orgId ? { organizationId: orgId } : {}),
        OR: [
          { status: 'AVAILABLE' },
          { assignmentStatus: 'UNASSIGNED' },
        ],
      },
    }),
    prisma.cardSession.count({
      where: {
        ...(orgId ? { organizationId: orgId } : {}),
        ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
        status: 'ACTIVE',
      },
    }),
    prisma.branch.findMany({
      where: {
        ...(orgId ? { organizationId: orgId } : {}),
        ...(staffBranchIds ? { id: { in: staffBranchIds } } : {}),
      },
      include: {
        inventoryItems: { include: { product: true } },
        cardSessions: true,
      },
    }),
    prisma.branchInventory.count({
      where: {
        ...(orgId ? { branch: { organizationId: orgId } } : {}),
        ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
        quantity: { lte: 5 },
      },
    }),
    prisma.cardSession.findMany({
      where: {
        ...(orgId ? { organizationId: orgId } : {}),
        ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
        status: 'ACTIVE',
      },
      select: {
        id: true,
        balance: true,
        sessionCardNumber: true,
        issuedAt: true,
        card: { select: { physicalCardNumber: true, status: true } },
        branch: { select: { name: true } },
        transactions: {
          select: { id: true, amount: true, type: true, createdAt: true },
        },
      },
    }),
    prisma.cardSession.count({
      where: {
        ...(orgId ? { organizationId: orgId } : {}),
        ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
        status: 'SETTLED',
      },
    }),
    prisma.user.findMany({
      where: {
        ...(orgId ? { organizationId: orgId } : {}),
        role: Role.STAFF,
        ...(effectiveBranchId
          ? {
              assignedBranches: {
                some: { branchId: effectiveBranchId },
              },
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        assignedBranches: {
          select: {
            branchId: true,
            branch: { select: { name: true } },
          },
        },
      },
    }),
    prisma.customerHistoryEvent.findMany({
      where: {
        ...(orgId ? { organizationId: orgId } : {}),
        ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
        ...(fromDate || toDate ? { createdAt: dateFilter } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
    }),
    prisma.cardSession.findMany({
      where: {
        ...(orgId ? { organizationId: orgId } : {}),
        ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
        ...(fromDate || toDate ? { issuedAt: dateFilter } : {}),
      },
      include: {
        card: { select: { physicalCardNumber: true } },
        branch: { select: { name: true } },
      },
      orderBy: { issuedAt: 'desc' },
      take: 300,
    }),
  ]);

  let totalRechargeVolume = 0;
  let totalPurchaseVolume = 0;
  let totalRefundVolume = 0;
  let totalRechargeCount = 0;
  let totalRefundCount = 0;
  let cashRechargeCount = 0;
  let upiRechargeCount = 0;
  let cancelledTopUpsCount = 0;
  let cancelledTopUpsVolume = 0;
  let cancelledCashTopUpsVolume = 0;
  let cancelledUpiTopUpsVolume = 0;
  let cancelledOrdersCount = 0;
  let cancelledOrdersVolume = 0;

  const branchMetricsMap = new Map<string, {
    branchId: string;
    branchName: string;
    status: 'ACTIVE' | 'INACTIVE';
    transactionCount: number;
    purchaseCount: number;
    purchaseVolume: number;
    rechargeCount: number;
    rechargeVolume: number;
    cardRechargeCount: number;
    cardRechargeVolume: number;
    cashRechargeCount: number;
    cashRechargeVolume: number;
    upiRechargeCount: number;
    upiRechargeVolume: number;
    refundCount: number;
    refundVolume: number;
    cancelledTopUpsCount: number;
    cancelledTopUpsVolume: number;
    cancelledCashTopUpsVolume: number;
    cancelledOrdersCount: number;
    cancelledOrdersVolume: number;
    totalRevenue: number;
    sessionCount: number;
    activeSessionsCount: number;
    settledSessionsCount: number;
    avgTransactionValue: number;
    avgPurchaseValue: number;
    productsSoldCount: number;
    inventoryItemCount: number;
    lowStockItemCount: number;
    productDemand: Array<{ productId: string; productName: string; quantitySold: number; totalRevenue: number }>;
    peakPeriods: Array<{ timeSlot: string; activityLevel: string; transactionCount: number; purchaseVolume: number }>;
    moneyAdded: number;
    moneyRefunded: number;
    cancelledTopUps: number;
    netMoneyCollected: number;
    cashInDrawer: number;
    upiMoney: number;
    upiCount: number;
    cashMoney: number;
    cashCount: number;
    cardsGivenOut: number;
    cardsReturned: number;
  }>();

  const branchProductDemandMap = new Map<string, Map<string, { productId: string; productName: string; quantitySold: number; totalRevenue: number }>>();

  branches.forEach((b) => {
    const activeSess = b.cardSessions.filter((s) => s.status === 'ACTIVE').length;
    const settledSess = b.cardSessions.filter((s) => s.status === 'SETTLED').length;
    const lowStock = b.inventoryItems.filter((i) => i.quantity <= 5).length;

    branchMetricsMap.set(b.id, {
      branchId: b.id,
      branchName: b.name,
      status: b.status as 'ACTIVE' | 'INACTIVE',
      transactionCount: 0,
      purchaseCount: 0,
      purchaseVolume: 0,
      rechargeCount: 0,
      rechargeVolume: 0,
      cardRechargeCount: 0,
      cardRechargeVolume: 0,
      cashRechargeCount: 0,
      cashRechargeVolume: 0,
      upiRechargeCount: 0,
      upiRechargeVolume: 0,
      refundCount: 0,
      refundVolume: 0,
      cancelledTopUpsCount: 0,
      cancelledTopUpsVolume: 0,
      cancelledCashTopUpsVolume: 0,
      cancelledOrdersCount: 0,
      cancelledOrdersVolume: 0,
      totalRevenue: 0,
      sessionCount: b.cardSessions.length,
      activeSessionsCount: activeSess,
      settledSessionsCount: settledSess,
      avgTransactionValue: 0,
      avgPurchaseValue: 0,
      productsSoldCount: 0,
      inventoryItemCount: b.inventoryItems.length,
      lowStockItemCount: lowStock,
      productDemand: [],
      peakPeriods: [],
      moneyAdded: 0,
      moneyRefunded: 0,
      cancelledTopUps: 0,
      netMoneyCollected: 0,
      cashInDrawer: 0,
      upiMoney: 0,
      upiCount: 0,
      cashMoney: 0,
      cashCount: 0,
      cardsGivenOut: b.cardSessions.length,
      cardsReturned: settledSess,
    });
  });

  let cashRechargeVolume = 0;
  let upiRechargeVolume = 0;
  const branchHourlyBuckets = new Map<string, Map<number, { count: number; volume: number }>>();

  transactions.forEach((tx) => {
    const bm = branchMetricsMap.get(tx.branchId);
    const txType = String(tx.type || '');
    const paymentMethod = String((tx as any).paymentMethod || '').toUpperCase();
    const isCancelled = Boolean((tx.items as any)?.isCancelled);

    // Track cancelled transactions
    if (isCancelled) {
      if (txType === 'PURCHASE') {
        cancelledOrdersCount++;
        cancelledOrdersVolume += tx.amount;
        if (bm) {
          bm.cancelledOrdersCount++;
          bm.cancelledOrdersVolume += tx.amount;
        }
      } else if (txType.includes('RECHARGE') || txType === 'CASH' || txType === 'UPI') {
        cancelledTopUpsCount++;
        cancelledTopUpsVolume += tx.amount;
        if (paymentMethod === 'UPI' || txType === 'RECHARGE_UPI') {
          cancelledUpiTopUpsVolume += tx.amount;
        } else {
          cancelledCashTopUpsVolume += tx.amount;
        }
        if (bm) {
          bm.cancelledTopUpsCount++;
          bm.cancelledTopUpsVolume += tx.amount;
          if (paymentMethod !== 'UPI' && txType !== 'RECHARGE_UPI') {
            bm.cancelledCashTopUpsVolume += tx.amount;
          }
        }
      }
      return; // Exclude cancelled transactions from active volume totals
    }

    // Track hourly activity for live peak calculation
    if (tx.branchId) {
      let bBuckets = branchHourlyBuckets.get(tx.branchId);
      if (!bBuckets) {
        bBuckets = new Map<number, { count: number; volume: number }>();
        branchHourlyBuckets.set(tx.branchId, bBuckets);
      }
      const txHour = getLocalHourInTimezone(new Date(tx.createdAt), clientTimezone);
      const current = bBuckets.get(txHour) || { count: 0, volume: 0 };
      current.count++;
      if (txType === 'PURCHASE') {
        current.volume += tx.amount;
      }
      bBuckets.set(txHour, current);
    }

    if (txType === 'PURCHASE') {
      totalPurchaseVolume += tx.amount;
      if (bm) {
        bm.transactionCount++;
        bm.purchaseCount++;
        bm.purchaseVolume += tx.amount;
        bm.totalRevenue += tx.amount;
      }
      const orderList: any[] = Array.isArray(tx.items)
        ? tx.items
        : Array.isArray((tx.items as any)?.orderItems)
        ? (tx.items as any).orderItems
        : [];
      if (orderList.length > 0 && tx.branchId) {
        let pMap = branchProductDemandMap.get(tx.branchId);
        if (!pMap) {
          pMap = new Map();
          branchProductDemandMap.set(tx.branchId, pMap);
        }
        orderList.forEach((it) => {
          const pId = String(it.productId || it.id || 'unknown');
          const pName = String(it.itemName || it.productName || it.name || 'Food Item');
          const qty = Number(it.quantity || it.qty || 1);
          const rev = Number(it.subtotal || it.total || (it.unitPrice ? it.unitPrice * qty : 0));
          if (bm) {
            bm.productsSoldCount += qty;
          }
          const curr = pMap!.get(pId) || { productId: pId, productName: pName, quantitySold: 0, totalRevenue: 0 };
          curr.quantitySold += qty;
          curr.totalRevenue = Number((curr.totalRevenue + rev).toFixed(2));
          pMap!.set(pId, curr);
        });
      } else if (bm) {
        bm.productsSoldCount++;
      }
    } else if (txType === 'RECHARGE_CASH' || paymentMethod === 'CASH' || paymentMethod === 'CARD' || txType === 'CASH') {
      totalRechargeVolume += tx.amount;
      totalRechargeCount++;
      cashRechargeVolume += tx.amount;
      cashRechargeCount++;
      if (bm) {
        bm.transactionCount++;
        bm.rechargeCount++;
        bm.rechargeVolume += tx.amount;
        bm.cardRechargeCount++;
        bm.cardRechargeVolume += tx.amount;
        bm.cashRechargeCount++;
        bm.cashRechargeVolume += tx.amount;
      }
    } else if (txType === 'RECHARGE_UPI' || paymentMethod === 'UPI' || txType === 'UPI') {
      totalRechargeVolume += tx.amount;
      totalRechargeCount++;
      upiRechargeVolume += tx.amount;
      upiRechargeCount++;
      if (bm) {
        bm.transactionCount++;
        bm.rechargeCount++;
        bm.rechargeVolume += tx.amount;
        bm.upiRechargeCount++;
        bm.upiRechargeVolume += tx.amount;
      }
    } else if (txType.includes('RECHARGE') || txType === 'ISSUANCE') {
      totalRechargeVolume += tx.amount;
      totalRechargeCount++;
      if (paymentMethod === 'UPI') {
        upiRechargeVolume += tx.amount;
        upiRechargeCount++;
        if (bm) {
          bm.transactionCount++;
          bm.rechargeCount++;
          bm.rechargeVolume += tx.amount;
          bm.upiRechargeCount++;
          bm.upiRechargeVolume += tx.amount;
        }
      } else {
        cashRechargeVolume += tx.amount;
        cashRechargeCount++;
        if (bm) {
          bm.transactionCount++;
          bm.rechargeCount++;
          bm.rechargeVolume += tx.amount;
          bm.cardRechargeCount++;
          bm.cardRechargeVolume += tx.amount;
          bm.cashRechargeCount++;
          bm.cashRechargeVolume += tx.amount;
        }
      }
    } else if (txType.includes('REFUND') || txType.includes('RETURN') || txType.includes('SETTLE')) {
      totalRefundVolume += tx.amount;
      totalRefundCount++;
      if (bm) {
        bm.transactionCount++;
        bm.refundCount++;
        bm.refundVolume += tx.amount;
      }
    }
  });

  const formatHour12 = (h: number): string => {
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 === 0 ? 12 : h % 12;
    return `${String(displayHour).padStart(2, '0')}:00 ${period}`;
  };

  branchMetricsMap.forEach((bm) => {
    bm.avgTransactionValue = bm.transactionCount > 0 ? Number((bm.purchaseVolume / bm.transactionCount).toFixed(2)) : 0;
    bm.avgPurchaseValue = bm.purchaseCount > 0 ? Number((bm.purchaseVolume / bm.purchaseCount).toFixed(2)) : 0;
    bm.purchaseVolume = Number(bm.purchaseVolume.toFixed(2));
    bm.rechargeVolume = Number(bm.rechargeVolume.toFixed(2));
    bm.cardRechargeVolume = Number((bm.cardRechargeVolume || 0).toFixed(2));
    bm.cashRechargeVolume = Number((bm.cashRechargeVolume || 0).toFixed(2));
    bm.upiRechargeVolume = Number((bm.upiRechargeVolume || 0).toFixed(2));
    bm.refundVolume = Number(bm.refundVolume.toFixed(2));
    bm.totalRevenue = Number(bm.totalRevenue.toFixed(2));
    bm.cancelledTopUpsVolume = Number(bm.cancelledTopUpsVolume.toFixed(2));
    bm.cancelledOrdersVolume = Number(bm.cancelledOrdersVolume.toFixed(2));

    // Easy everyday words calculations
    bm.moneyAdded = bm.rechargeVolume;
    bm.moneyRefunded = bm.refundVolume;
    bm.cancelledTopUps = bm.cancelledTopUpsVolume;
    bm.netMoneyCollected = Number((bm.rechargeVolume - bm.refundVolume).toFixed(2));
    bm.cashInDrawer = Number((bm.cashRechargeVolume - bm.refundVolume).toFixed(2));
    bm.upiMoney = bm.upiRechargeVolume;
    bm.upiCount = bm.upiRechargeCount;
    bm.cashMoney = bm.cashRechargeVolume;
    bm.cashCount = bm.cashRechargeCount;
    bm.cardsGivenOut = bm.sessionCount;
    bm.cardsReturned = bm.settledSessionsCount;
    bm.purchaseVolume = Number(bm.purchaseVolume.toFixed(2));
    bm.rechargeVolume = Number(bm.rechargeVolume.toFixed(2));
    bm.cardRechargeVolume = Number((bm.cardRechargeVolume || 0).toFixed(2));
    bm.cashRechargeVolume = Number((bm.cashRechargeVolume || 0).toFixed(2));
    bm.upiRechargeVolume = Number((bm.upiRechargeVolume || 0).toFixed(2));
    bm.refundVolume = Number(bm.refundVolume.toFixed(2));
    bm.totalRevenue = Number(bm.totalRevenue.toFixed(2));

    const pMap = branchProductDemandMap.get(bm.branchId);
    if (pMap && pMap.size > 0) {
      bm.productDemand = Array.from(pMap.values()).sort((a, b) => b.quantitySold - a.quantitySold);
    } else {
      bm.productDemand = [];
    }

    // Calculate real live peak activity periods from actual transactions
    const bBuckets = branchHourlyBuckets.get(bm.branchId);
    if (bBuckets && bBuckets.size > 0) {
      const activeHours = Array.from(bBuckets.entries())
        .filter(([_, data]) => data.count > 0)
        .sort((a, b) => b[1].count - a[1].count || b[1].volume - a[1].volume)
        .slice(0, 3);

      const levels = ['Highest', 'High', 'Moderate'];
      bm.peakPeriods = activeHours.map(([hour, data], idx) => {
        const nextHour = (hour + 1) % 24;
        return {
          timeSlot: `${formatHour12(hour)} - ${formatHour12(nextHour)}`,
          activityLevel: levels[idx] || 'Moderate',
          transactionCount: data.count,
          purchaseVolume: Number(data.volume.toFixed(2)),
        };
      });
    } else {
      bm.peakPeriods = [];
    }
  });

  const zeroBalanceActiveCardsCount = activeSessionsList.filter((s) => s.balance === 0).length;
  let activeCardsRechargeCount = 0;
  let reRechargedCardsCount = 0;
  activeSessionsList.forEach((s) => {
    const rechargeTxns = s.transactions.filter((t) => {
      const type = String(t.type || '').toUpperCase();
      return type.includes('RECHARGE') || type.includes('CASH') || type.includes('UPI');
    });
    const count = rechargeTxns.length;
    activeCardsRechargeCount += count;
    if (count > 1) {
      reRechargedCardsCount += (count - 1);
    }
  });

  const totalFloatBalance = Number(
    activeSessionsList.reduce((acc, s) => acc + (s.balance || 0), 0).toFixed(2),
  );
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

  const cardItems = activeSessionsList.map((s) => {
    const cardNum =
      s.card?.physicalCardNumber ||
      s.sessionCardNumber ||
      `MC-${s.id.slice(0, 6).toUpperCase()}`;
    let totalRecharged = 0;
    let totalSpent = 0;
    let totalRefunded = 0;
    let lastUsedAt = s.issuedAt ? s.issuedAt.toISOString() : undefined;

    s.transactions.forEach((t) => {
      const tType = String(t.type || '').toUpperCase();
      if (tType.includes('RECHARGE') || tType === 'ISSUANCE') {
        totalRecharged += t.amount;
      } else if (tType === 'PURCHASE') {
        totalSpent += t.amount;
      } else if (tType.includes('REFUND')) {
        totalRefunded += t.amount;
      }
      if (t.createdAt && (!lastUsedAt || new Date(t.createdAt) > new Date(lastUsedAt))) {
        lastUsedAt = new Date(t.createdAt).toISOString();
      }
    });

    const isDormant = s.balance > 0 && lastUsedAt && new Date(lastUsedAt) < twoDaysAgo;

    return {
      id: s.id,
      cardNumber: cardNum,
      status: (s.card?.status === 'BLOCKED' ? 'BLOCKED' : 'ACTIVE') as 'ACTIVE' | 'BLOCKED' | 'AVAILABLE',
      balance: Number(s.balance.toFixed(2)),
      totalRecharged: Number(totalRecharged.toFixed(2)),
      totalSpent: Number(totalSpent.toFixed(2)),
      totalRefunded: Number(totalRefunded.toFixed(2)),
      transactionCount: s.transactions.length,
      favoriteBranchName: s.branch?.name || 'Counter',
      lastUsedAt,
      isDormant: Boolean(isDormant),
    };
  });

  const dormantCardsList = cardItems.filter((c) => c.isDormant);
  const topActiveCardsList = [...cardItems]
    .sort((a, b) => b.totalSpent - a.totalSpent || b.balance - a.balance)
    .slice(0, 25);

  const cardFleetAnalytics = {
    totalCardsInCirculation: activeSessionsCount,
    totalFloatBalance,
    dormantCardsCount: dormantCardsList.length,
    blockedCardsCount,
    availableCardsCount,
    topActiveCards: topActiveCardsList,
    dormantCards: dormantCardsList,
  };

  const staffPerformance = staffUsers.map((st) => {
    const staffSessions = allSessions.filter((s) => s.issuedByUserId === st.id);
    const settledSessions = allSessions.filter((s) => s.settledByUserId === st.id);
    const staffTxns = transactions.filter((t) => t.staffUserId === st.id);
    const staffEvts = historyEvents.filter((e) => e.performedByUserId === st.id);

    let purchaseCount = 0;
    let purchaseVolume = 0;
    let cardRechargeCount = 0;
    let cardRechargeVolume = 0;
    let upiRechargeCount = 0;
    let upiRechargeVolume = 0;
    let refundCount = 0;
    let refundVolume = 0;

    const activities: any[] = [];

    staffSessions.forEach((sess) => {
      activities.push({
        id: `act_act_${sess.id}`,
        type: 'CARD_ACTIVATION',
        title: 'Card Activated & Issued',
        description: `Issued card ${sess.card?.physicalCardNumber || 'MC-Card'} to ${sess.customerName || 'Customer'}`,
        cardNumber: sess.card?.physicalCardNumber,
        customerName: sess.customerName || 'Customer',
        customerPhone: sess.customerPhone || '—',
        branchId: sess.branchId,
        branchName: (sess as any).branch?.name || 'Main Cafeteria',
        timestamp: sess.issuedAt ? sess.issuedAt.toISOString() : new Date().toISOString(),
        amount: sess.balance,
      });
    });

    settledSessions.forEach((sess) => {
      activities.push({
        id: `act_stl_${sess.id}`,
        type: 'CARD_SETTLEMENT',
        title: 'Card Settled & Returned',
        description: `Settled card ${sess.card?.physicalCardNumber || 'MC-Card'} for ${sess.customerName || 'Customer'}`,
        cardNumber: sess.card?.physicalCardNumber,
        customerName: sess.customerName || 'Customer',
        customerPhone: sess.customerPhone || '—',
        branchId: sess.branchId,
        branchName: (sess as any).branch?.name || 'Main Cafeteria',
        timestamp: sess.settledAt ? sess.settledAt.toISOString() : new Date().toISOString(),
        amount: sess.refundAmount || 0,
      });
    });

    staffEvts.forEach((ev) => {
      if (ev.action === 'CARD_BLOCKED' || ev.action === 'CARD_UNBLOCKED') {
        activities.push({
          id: `act_ev_${ev.id}`,
          type: ev.action === 'CARD_BLOCKED' ? 'CARD_BLOCKED' : 'CARD_UNBLOCKED',
          title: ev.action === 'CARD_BLOCKED' ? 'Card Blocked' : 'Card Unblocked',
          description: `${ev.action === 'CARD_BLOCKED' ? 'Blocked' : 'Unblocked'} card ${ev.physicalCardNumber}. Reason: ${ev.reason || 'N/A'}`,
          cardNumber: ev.physicalCardNumber,
          customerName: ev.customerName || 'Customer',
          customerPhone: ev.customerPhone || '—',
          branchId: ev.branchId,
          branchName: ev.branchName || 'Main Cafeteria',
          timestamp: ev.createdAt.toISOString(),
        });
      }
    });

    staffTxns.forEach((tx) => {
      const txType = String(tx.type || '');
      const pMethod = String(tx.paymentMethod || '').toUpperCase();
      const bName = tx.branch?.name || 'Branch';
      const cardNum = (tx as any).session?.card?.physicalCardNumber || (tx as any).session?.sessionCardNumber || (tx as any).cardNumber || undefined;
      const custName = (tx as any).session?.customerName || (tx as any).customerName || 'Customer';
      const custPhone = (tx as any).session?.customerPhone || (tx as any).customerPhone || '—';

      if (txType === 'PURCHASE') {
        purchaseCount++;
        purchaseVolume += tx.amount;
        activities.push({
          id: `act_tx_${tx.id}`,
          type: 'PURCHASE',
          title: 'POS Purchase Processed',
          description: `Processed POS order amounting to ₹${tx.amount}`,
          amount: tx.amount,
          branchId: tx.branchId,
          branchName: bName,
          timestamp: tx.createdAt.toISOString(),
          paymentMethod: 'CARD_BALANCE',
          cardNumber: cardNum,
          customerName: custName,
          customerPhone: custPhone,
        });
      } else if (txType === 'RECHARGE_CASH' || pMethod === 'CASH' || pMethod === 'CARD' || txType === 'CASH') {
        cardRechargeCount++;
        cardRechargeVolume += tx.amount;
        activities.push({
          id: `act_tx_${tx.id}`,
          type: 'RECHARGE_CASH',
          title: 'Card / Cash Recharge',
          description: `Loaded ₹${tx.amount} onto card via Cash/Card POS`,
          amount: tx.amount,
          branchId: tx.branchId,
          branchName: bName,
          timestamp: tx.createdAt.toISOString(),
          paymentMethod: 'CASH',
          cardNumber: cardNum,
          customerName: custName,
          customerPhone: custPhone,
        });
      } else if (txType === 'RECHARGE_UPI' || pMethod === 'UPI' || txType === 'UPI') {
        upiRechargeCount++;
        upiRechargeVolume += tx.amount;
        activities.push({
          id: `act_tx_${tx.id}`,
          type: 'RECHARGE_UPI',
          title: 'UPI Recharge',
          description: `Loaded ₹${tx.amount} onto card via UPI QR`,
          amount: tx.amount,
          branchId: tx.branchId,
          branchName: bName,
          timestamp: tx.createdAt.toISOString(),
          paymentMethod: 'UPI',
          cardNumber: cardNum,
          customerName: custName,
          customerPhone: custPhone,
        });
      } else if (txType.includes('REFUND') || txType.includes('RETURN')) {
        refundCount++;
        refundVolume += tx.amount;
        activities.push({
          id: `act_tx_${tx.id}`,
          type: 'REFUND',
          title: 'Customer Refund Processed',
          description: `Processed refund of ₹${tx.amount}`,
          amount: tx.amount,
          branchId: tx.branchId,
          branchName: bName,
          timestamp: tx.createdAt.toISOString(),
          cardNumber: cardNum,
          customerName: custName,
          customerPhone: custPhone,
        });
      }
    });

    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const totalRechargeVol = cardRechargeVolume + upiRechargeVolume;
    const totalTransactions = purchaseCount + cardRechargeCount + upiRechargeCount + refundCount;
    const totalVolume = Number((purchaseVolume + totalRechargeVol + refundVolume).toFixed(2));

    const branchDisplayName = st.assignedBranches?.map((ab: any) => ab.branch?.name).filter(Boolean).join(', ') || 'Unassigned';

    return {
      staffId: st.id,
      staffName: st.name || 'Staff Member',
      staffEmail: st.email || '',
      role: 'Counter Staff',
      status: (st as any).status || 'ACTIVE',
      branchId: st.assignedBranches?.[0]?.branchId || undefined,
      branchName: branchDisplayName,
      cardsActivatedCount: staffSessions.length,
      cardsSettledCount: settledSessions.length,
      totalTransactionsCount: totalTransactions,
      totalVolumeHandled: totalVolume,
      rechargeCount: cardRechargeCount + upiRechargeCount,
      rechargeVolume: Number(totalRechargeVol.toFixed(2)),
      cardRechargeCount,
      cardRechargeVolume: Number(cardRechargeVolume.toFixed(2)),
      upiRechargeCount,
      upiRechargeVolume: Number(upiRechargeVolume.toFixed(2)),
      purchaseCount,
      purchaseVolume: Number(purchaseVolume.toFixed(2)),
      refundCount,
      refundVolume: Number(refundVolume.toFixed(2)),
      activities,
    };
  });

  return sendSuccess(res, {
    totalTransactions: transactions.length,
    totalRechargeVolume: Number(totalRechargeVolume.toFixed(2)),
    cashRechargeVolume: Number(cashRechargeVolume.toFixed(2)),
    cashRechargeCount,
    upiRechargeVolume: Number(upiRechargeVolume.toFixed(2)),
    upiRechargeCount,
    totalPurchaseVolume: Number(totalPurchaseVolume.toFixed(2)),
    totalRefundVolume: Number(totalRefundVolume.toFixed(2)),
    activeSessionsCount,
    activeCardsCount: totalCards,
    lowStockItemsCount: lowStockCount,
    branchPerformance: Array.from(branchMetricsMap.values()),
    staffPerformance,
    activeCardsRechargeCount,
    reRechargedCardsCount,
    closedCardsCount: settledSessionsCount,
    zeroBalanceActiveCardsCount,
    activeStaffCount: staffPerformance.filter((s) => s.status === 'ACTIVE').length,
    totalStaffCount: staffPerformance.length,
    cardFleetAnalytics,

    // Easy Everyday Words Metrics
    moneyAdded: Number(totalRechargeVolume.toFixed(2)),
    moneyRefunded: Number(totalRefundVolume.toFixed(2)),
    cancelledTopUps: Number(cancelledTopUpsVolume.toFixed(2)),
    cancelledTopUpsCount,
    netMoneyCollected: Number((totalRechargeVolume - totalRefundVolume).toFixed(2)),
    cashInDrawer: Number((cashRechargeVolume - totalRefundVolume).toFixed(2)),
    upiMoney: Number(upiRechargeVolume.toFixed(2)),
    upiCount: upiRechargeCount,
    cashMoney: Number(cashRechargeVolume.toFixed(2)),
    cashCount: cashRechargeCount,
    cardsGivenOut: allSessions.length,
    cardsReturned: settledSessionsCount,
    cancelledOrdersCount,
    cancelledOrdersVolume: Number(cancelledOrdersVolume.toFixed(2)),
    rechargeCount: totalRechargeCount,
    refundCount: totalRefundCount,
  });
}

export async function getSuperAdminAnalytics(req: Request, res: Response) {
  return getOrgAnalytics(req, res);
}

export async function getPeakAnalytics(req: Request, res: Response) {
  const isSuperAdmin = req.user?.role === Role.SUPER_ADMIN;
  const orgId = isSuperAdmin
    ? (req.query.organizationId as string) || undefined
    : req.user?.organizationId;

  const { branchId, startDate, endDate, category, categoryId, timezone } = req.query as Record<string, string>;
  const clientTimezone = normalizeTimezone(timezone || (req.headers['x-timezone'] as string) || process.env.APP_TIMEZONE);

  let effectiveBranchId = branchId && branchId !== 'ALL' ? branchId : undefined;
  let staffBranchIds: string[] | undefined;

  if (req.user?.role === Role.STAFF) {
    const userBranches = await prisma.userBranch.findMany({
      where: { userId: req.user.id },
      select: { branchId: true },
    });
    staffBranchIds = userBranches.map((b) => b.branchId);

    if (staffBranchIds.length === 0) {
      return sendError(res, 403, 'FORBIDDEN', 'Staff member is not assigned to any counter');
    }

    // Always constrain staff to their assigned counter — never deny access if a stale/mismatched branchId was passed
    if (!effectiveBranchId || !staffBranchIds.includes(effectiveBranchId)) {
      effectiveBranchId = staffBranchIds[0];
    }
  }

  const dateFilter: any = {};
  if (startDate) dateFilter.gte = new Date(startDate.includes('T') ? startDate : `${startDate}T00:00:00.000Z`);
  if (endDate) dateFilter.lte = new Date(endDate.includes('T') ? endDate : `${endDate}T23:59:59.999Z`);

  const txWhere: any = {
    ...(orgId
      ? {
          OR: [
            { session: { organizationId: orgId } },
            { branch: { organizationId: orgId } },
          ],
        }
      : {}),
    ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
    ...(startDate || endDate ? { createdAt: dateFilter } : {}),
  };

  const [transactions, products, branches] = await Promise.all([
    prisma.transaction.findMany({
      where: txWhere,
      include: { branch: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.product.findMany({
      where: {
        ...(orgId ? { organizationId: orgId } : {}),
        status: { not: 'ARCHIVED' },
      },
      include: { inventoryItems: true },
    }),
    prisma.branch.findMany({
      where: {
        ...(orgId ? { organizationId: orgId } : {}),
        ...(staffBranchIds ? { id: { in: staffBranchIds } } : {}),
      },
    }),
  ]);

  // 1. Hourly distribution (0 to 23)
  const hourlyBuckets = Array.from({ length: 24 }, (_, h) => {
    const hourLabel = `${String(h).padStart(2, '0')}:00`;
    const isPeak = (h >= 12 && h <= 14) || (h >= 19 && h <= 21);
    return {
      hour: h,
      hourLabel,
      transactionCount: 0,
      rechargeCount: 0,
      purchaseCount: 0,
      sessionCount: 0,
      totalVolume: 0,
      isPeak,
    };
  });

  let totalPurchaseVolume = 0;
  let totalRechargeVolume = 0;
  let peakTransactions = 0;
  let offPeakTransactions = 0;
  let peakVolume = 0;
  let offPeakVolume = 0;

  const branchVolMap = new Map<string, number>();

  transactions.forEach((tx) => {
    const txHour = getLocalHourInTimezone(new Date(tx.createdAt), clientTimezone);
    const bucket = hourlyBuckets[txHour];

    if (bucket) {
      bucket.transactionCount++;
      bucket.totalVolume += tx.amount;

      if (tx.type === 'PURCHASE') {
        bucket.purchaseCount++;
        totalPurchaseVolume += tx.amount;
      } else if (tx.type === 'RECHARGE_CASH' || tx.type === 'RECHARGE_UPI') {
        bucket.rechargeCount++;
        totalRechargeVolume += tx.amount;
      }
    }

    branchVolMap.set(tx.branchId, (branchVolMap.get(tx.branchId) || 0) + tx.amount);
  });

  // Find busiest hour and busiest branch
  let maxHourBucket = hourlyBuckets[12];
  hourlyBuckets.forEach((b) => {
    if (b.transactionCount > maxHourBucket.transactionCount) {
      maxHourBucket = b;
    }
  });

  // Dynamically include the busiest operational hour alongside standard meal rush windows (12-14 & 19-21)
  hourlyBuckets.forEach((b) => {
    const isStandardPeak = (b.hour >= 12 && b.hour <= 14) || (b.hour >= 19 && b.hour <= 21);
    const isDynamicPeak = maxHourBucket.transactionCount > 0 && b.hour === maxHourBucket.hour;
    b.isPeak = isStandardPeak || isDynamicPeak;

    if (b.isPeak) {
      peakTransactions += b.transactionCount;
      peakVolume += b.totalVolume;
    } else {
      offPeakTransactions += b.transactionCount;
      offPeakVolume += b.totalVolume;
    }
  });

  let busiestBranchName = branches[0]?.name || 'Main Cafeteria';
  let maxBranchVol = 0;
  branchVolMap.forEach((vol, bId) => {
    if (vol > maxBranchVol) {
      maxBranchVol = vol;
      const bObj = branches.find((b) => b.id === bId);
      if (bObj) busiestBranchName = bObj.name;
    }
  });

  const productSalesMap = new Map<string, { qty: number; rev: number; peakQty: number; offPeakQty: number }>();
  transactions.forEach((tx) => {
    if (tx.type === 'PURCHASE') {
      const orderList: any[] = Array.isArray(tx.items)
        ? tx.items
        : Array.isArray((tx.items as any)?.orderItems)
        ? (tx.items as any).orderItems
        : [];
      const txHour = getLocalHourInTimezone(new Date(tx.createdAt), clientTimezone);
      const isPeak = hourlyBuckets[txHour]?.isPeak ?? false;
      orderList.forEach((it) => {
        const pId = String(it.productId || it.id || '');
        if (pId) {
          const qty = Number(it.quantity || it.qty || 1);
          const rev = Number(it.subtotal || it.total || (it.unitPrice ? it.unitPrice * qty : 0));
          const existing = productSalesMap.get(pId) || { qty: 0, rev: 0, peakQty: 0, offPeakQty: 0 };
          existing.qty += qty;
          existing.rev += rev;
          if (isPeak) existing.peakQty += qty;
          else existing.offPeakQty += qty;
          productSalesMap.set(pId, existing);
        }
      });
    }
  });

  // 2. Product Demand
  let productDemand = products.map((p) => {
    const totalStock = p.inventoryItems
      .filter((inv) => (!effectiveBranchId || inv.branchId === effectiveBranchId))
      .reduce((sum, inv) => sum + inv.quantity, 0);
    const stockStatus = totalStock <= 0 ? 'OUT_OF_STOCK' : totalStock <= 10 ? 'LOW' : 'NORMAL';
    const sales = productSalesMap.get(p.id) || { qty: 0, rev: 0, peakQty: 0, offPeakQty: 0 };

    return {
      productId: p.id,
      productName: p.itemName,
      category: p.category.join(', ') || 'General',
      quantitySold: sales.qty,
      revenue: Number(sales.rev.toFixed(2)),
      peakHourQuantity: sales.peakQty,
      offPeakQuantity: sales.offPeakQty,
      stockStatus: stockStatus as 'NORMAL' | 'LOW' | 'OUT_OF_STOCK',
      currentStock: totalStock,
    };
  });

  const filterCategory = category || categoryId;
  if (filterCategory && filterCategory !== 'ALL') {
    const targetLower = filterCategory.toLowerCase();
    productDemand = productDemand.filter((p) => {
      const cats = p.category.split(',').map((c) => c.trim().toLowerCase());
      return cats.some(
        (c) => c === targetLower || c.replace(/s$/, '') === targetLower.replace(/s$/, '')
      );
    });
  }

  return sendSuccess(res, {
    hourlyDistribution: hourlyBuckets,
    productDemand,
    comparison: {
      peakHoursRange: '12:00 - 15:00 & 19:00 - 21:00',
      peakTransactions,
      offPeakTransactions,
      peakVolume: Number(peakVolume.toFixed(2)),
      offPeakVolume: Number(offPeakVolume.toFixed(2)),
      busiestHour: maxHourBucket.hourLabel,
      busiestBranchName,
    },
    totalTransactions: transactions.length,
    totalPurchaseVolume: Number(totalPurchaseVolume.toFixed(2)),
    totalRechargeVolume: Number(totalRechargeVolume.toFixed(2)),
    busiestDay: 'Wednesday',
  });
}
