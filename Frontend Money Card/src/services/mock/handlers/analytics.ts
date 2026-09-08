import { mockStore } from '../store';
import { mockDelay, createMockSuccess, createMockError } from '../utils';
import { mockAuthHandlers } from './auth';
import type {
  ApiResult,
  AnalyticsOverview,
  BranchPerformanceMetric,
  StaffPerformanceMetric,
  StaffActivityItem,
  AnalyticsFilter,
  AnalyticsExportResponseData,
  ReportItem,
  PeakAnalyticsOverview,
  HourlyActivityMetric,
  ProductDemandMetric,
  PeakPeriodComparison,
} from '@/types';

export const mockAnalyticsHandlers = {
  async getOverview(filter?: AnalyticsFilter): Promise<ApiResult<AnalyticsOverview>> {
    return this.getAnalyticsOverview(filter);
  },

  async getAnalyticsOverview(filter?: AnalyticsFilter): Promise<ApiResult<AnalyticsOverview>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) {
      return createMockError('UNAUTHORIZED', 'Authentication required');
    }

    const targetOrgId =
      currentUser.role === 'SUPER_ADMIN'
        ? filter?.organizationId || undefined
        : currentUser.organizationId || 'org_001';

    const branchId = filter?.branchId;
    let filteredTransactions = mockStore.transactions;

    // Filter by organization if specified or if ORG_ADMIN
    if (targetOrgId) {
      const orgBranchIds = mockStore.branches
        .filter((b) => b.organizationId === targetOrgId)
        .map((b) => b.id);

      filteredTransactions = filteredTransactions.filter((t) => orgBranchIds.includes(t.branchId));
    }

    if (branchId && branchId !== 'ALL') {
      filteredTransactions = filteredTransactions.filter((t) => t.branchId === branchId);
    } else if (currentUser.role === 'STAFF') {
      filteredTransactions = filteredTransactions.filter((t) =>
        currentUser.assignedBranchIds.includes(t.branchId),
      );
    }

    // Date range filter
    const from = filter?.startDate
      ? new Date(filter.startDate.includes('T') ? filter.startDate : `${filter.startDate}T00:00:00.000Z`).getTime()
      : 0;
    const to = filter?.endDate
      ? new Date(filter.endDate.includes('T') ? filter.endDate : `${filter.endDate}T23:59:59.999Z`).getTime()
      : Infinity;

    if (filter?.startDate || filter?.endDate) {
      filteredTransactions = filteredTransactions.filter((t) => {
        const txTime = new Date(t.createdAt).getTime();
        return txTime >= from && txTime <= to;
      });
    }

    let totalRechargeVolume = 0;
    let cashRechargeVolume = 0;
    let cashRechargeCount = 0;
    let upiRechargeVolume = 0;
    let upiRechargeCount = 0;
    let totalPurchaseVolume = 0;
    let totalPurchaseCount = 0;
    let totalRefundVolume = 0;
    let totalRefundCount = 0;

    for (const t of filteredTransactions) {
      const pMethod = String((t as any).paymentMethod || '').toUpperCase();
      if (t.type === 'PURCHASE') {
        totalPurchaseVolume += t.amount;
        totalPurchaseCount += 1;
      } else if (
        t.type === 'RECHARGE_CASH' ||
        (t.type === 'RECHARGE' && (pMethod === 'CASH' || pMethod === 'CARD' || !pMethod))
      ) {
        totalRechargeVolume += t.amount;
        cashRechargeVolume += t.amount;
        cashRechargeCount += 1;
      } else if (
        t.type === 'RECHARGE_UPI' ||
        (t.type === 'RECHARGE' && pMethod === 'UPI')
      ) {
        totalRechargeVolume += t.amount;
        upiRechargeVolume += t.amount;
        upiRechargeCount += 1;
      } else if (t.type === 'REFUND') {
        totalRefundVolume += t.amount;
        totalRefundCount += 1;
      }
    }

    totalPurchaseVolume = Number(totalPurchaseVolume.toFixed(2));
    totalRechargeVolume = Number(totalRechargeVolume.toFixed(2));
    cashRechargeVolume = Number(cashRechargeVolume.toFixed(2));
    upiRechargeVolume = Number(upiRechargeVolume.toFixed(2));
    totalRefundVolume = Number(totalRefundVolume.toFixed(2));

    const targetBranchIds = targetOrgId
      ? mockStore.branches.filter((b) => b.organizationId === targetOrgId).map((b) => b.id)
      : null;

    const activeSessions = mockStore.sessions.filter((s) => {
      if (s.status !== 'ACTIVE') return false;
      if (branchId && branchId !== 'ALL' && s.branchId !== branchId) return false;
      if (targetBranchIds && !targetBranchIds.includes(s.branchId)) return false;
      if (currentUser.role === 'STAFF' && !currentUser.assignedBranchIds.includes(s.branchId))
        return false;
      return true;
    });

    const activeSessionsCount = activeSessions.length;

    // 1. Zero balance active cards count
    const zeroBalanceActiveCardsCount = activeSessions.filter((s) => Number(s.balance) === 0).length;

    // 2. Closed / settled cards count
    const closedCardsCount = mockStore.sessions.filter((s) => {
      if (s.status !== 'SETTLED') return false;
      if (branchId && branchId !== 'ALL' && s.branchId !== branchId) return false;
      if (targetBranchIds && !targetBranchIds.includes(s.branchId)) return false;
      if (currentUser.role === 'STAFF' && !currentUser.assignedBranchIds.includes(s.branchId))
        return false;
      return true;
    }).length;

    // 3. Already active card recharges & repeat top-ups count
    const activeSessionIds = new Set(activeSessions.map((s) => s.id));
    const activeSessionsRechargeMap = new Map<string, number>();
    for (const t of filteredTransactions) {
      if (activeSessionIds.has(t.sessionId) && (t.type === 'RECHARGE' || String(t.type).includes('RECHARGE'))) {
        activeSessionsRechargeMap.set(t.sessionId, (activeSessionsRechargeMap.get(t.sessionId) || 0) + 1);
      }
    }

    let activeCardsRechargeCount = 0;
    let reRechargedCardsCount = 0;
    activeSessionsRechargeMap.forEach((count) => {
      activeCardsRechargeCount += count;
      if (count > 1) {
        reRechargedCardsCount += (count - 1);
      }
    });

    const activeCardsCount = mockStore.cards.filter((c) => {
      if (c.status !== 'ACTIVE' && c.status !== 'AVAILABLE') return false;
      if (targetOrgId && c.organizationId !== targetOrgId) return false;
      if (branchId && branchId !== 'ALL' && c.currentBranchId && c.currentBranchId !== branchId) return false;
      return true;
    }).length;

    const lowStockItemsCount = mockStore.inventory.filter((i) => {
      if (i.quantity >= 10) return false;
      if (branchId && branchId !== 'ALL' && i.branchId !== branchId) return false;
      if (targetBranchIds && !targetBranchIds.includes(i.branchId)) return false;
      return true;
    }).length;

    const orgBranches = mockStore.branches.filter((b) => {
      if (targetOrgId) return b.organizationId === targetOrgId;
      if (currentUser.role === 'STAFF') return currentUser.assignedBranchIds.includes(b.id);
      return true;
    });

    const branchPerformance: BranchPerformanceMetric[] = orgBranches
      .filter((b) => !branchId || branchId === 'ALL' || b.id === branchId)
      .map((b) => {
        const bTxns = filteredTransactions.filter((t) => t.branchId === b.id);
        let bPurchaseCount = 0;
        let bPurchaseVol = 0;
        let bCardRechargeCount = 0;
        let bCardRechargeVol = 0;
        let bUpiRechargeCount = 0;
        let bUpiRechargeVol = 0;
        let bRefundCount = 0;
        let bRefundVol = 0;

        for (const t of bTxns) {
          const pMethod = String((t as any).paymentMethod || '').toUpperCase();
          if (t.type === 'PURCHASE') {
            bPurchaseCount++;
            bPurchaseVol += t.amount;
          } else if (
            t.type === 'RECHARGE_CASH' ||
            (t.type === 'RECHARGE' && (pMethod === 'CASH' || pMethod === 'CARD' || !pMethod))
          ) {
            bCardRechargeCount++;
            bCardRechargeVol += t.amount;
          } else if (
            t.type === 'RECHARGE_UPI' ||
            (t.type === 'RECHARGE' && pMethod === 'UPI')
          ) {
            bUpiRechargeCount++;
            bUpiRechargeVol += t.amount;
          } else if (t.type === 'REFUND') {
            bRefundCount++;
            bRefundVol += t.amount;
          }
        }

        const bRechargeCount = bCardRechargeCount + bUpiRechargeCount;
        const bRechargeVol = Number((bCardRechargeVol + bUpiRechargeVol).toFixed(2));
        const bSessions = mockStore.sessions.filter((s) => s.branchId === b.id);
        const activeSess = bSessions.filter((s) => s.status === 'ACTIVE').length;
        const settledSess = bSessions.filter((s) => s.status === 'SETTLED').length;

        const bInventory = mockStore.inventory.filter((i) => i.branchId === b.id);
        const lowStock = bInventory.filter((i) => i.quantity < 10).length;

        const totalProductsSold = Math.round(bPurchaseCount * 1.8) || 0;
        const avgTxn = bTxns.length > 0 ? Number(((bPurchaseVol + bRechargeVol) / bTxns.length).toFixed(2)) : 0;
        const avgPurchase = bPurchaseCount > 0 ? Number((bPurchaseVol / bPurchaseCount).toFixed(2)) : 0;

        return {
          branchId: b.id,
          branchName: b.name,
          status: (b.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE') as 'ACTIVE' | 'INACTIVE',
          transactionCount: bTxns.length,
          purchaseCount: bPurchaseCount,
          purchaseVolume: Number(bPurchaseVol.toFixed(2)),
          rechargeCount: bRechargeCount,
          rechargeVolume: bRechargeVol,
          cardRechargeCount: bCardRechargeCount,
          cardRechargeVolume: Number(bCardRechargeVol.toFixed(2)),
          cashRechargeCount: bCardRechargeCount,
          cashRechargeVolume: Number(bCardRechargeVol.toFixed(2)),
          upiRechargeCount: bUpiRechargeCount,
          upiRechargeVolume: Number(bUpiRechargeVol.toFixed(2)),
          refundCount: bRefundCount,
          refundVolume: Number(bRefundVol.toFixed(2)),
          totalRevenue: Number(bPurchaseVol.toFixed(2)),
          sessionCount: bSessions.length,
          activeSessionsCount: activeSess,
          settledSessionsCount: settledSess,
          avgTransactionValue: avgTxn,
          avgPurchaseValue: avgPurchase,
          productsSoldCount: totalProductsSold,
          inventoryItemCount: bInventory.length,
          lowStockItemCount: lowStock,
        };
      });

    // ── Staff Performance & Activity Aggregation ─────────────
    const orgStaffList = mockStore.staffEntities.filter((s) => {
      if (targetOrgId && s.organizationId !== targetOrgId) return false;
      if (branchId && branchId !== 'ALL' && !s.assignedBranchIds?.includes(branchId)) return false;
      return true;
    });
    const activeStaffCount = orgStaffList.filter((s) => s.status === 'ACTIVE').length;

    const staffPerformance: StaffPerformanceMetric[] = orgStaffList.map((st, idx) => {
      // Sessions issued by this staff
      const issuedSessions = mockStore.sessions.filter((s) => {
        const isStaff = (s as any).issuedByUserId === st.id || (idx === 0 && !(s as any).issuedByUserId);
        if (!isStaff) return false;
        if (branchId && branchId !== 'ALL' && s.branchId !== branchId) return false;
        const time = new Date(s.startedAt || s.createdAt).getTime();
        if (from && time < from) return false;
        if (to && time > to) return false;
        return true;
      });

      // Sessions settled by this staff
      const settledSessions = mockStore.sessions.filter((s) => {
        if ((s as any).settledByUserId !== st.id) return false;
        if (branchId && branchId !== 'ALL' && s.branchId !== branchId) return false;
        const time = new Date(s.settledAt || s.updatedAt).getTime();
        if (from && time < from) return false;
        if (to && time > to) return false;
        return true;
      });

      // Transactions performed under this staff (already filtered by branchId and date)
      const staffTxns = filteredTransactions.filter(
        (t) => (t as any).staffUserId === st.id || (idx === 0 && !(t as any).staffUserId),
      );

      let purchaseCount = 0;
      let purchaseVol = 0;
      let cardRechargeCount = 0;
      let cardRechargeVol = 0;
      let upiRechargeCount = 0;
      let upiRechargeVol = 0;
      let refundCount = 0;
      let refundVol = 0;

      const activities: StaffActivityItem[] = [];

      // Add Card Activation activities
      issuedSessions.forEach((sess) => {
        const card = mockStore.cards.find((c) => c.id === sess.cardId);
        const cardNum = card?.physicalCardNumber || sess.sessionCardNumber || 'MC-Card';
        activities.push({
          id: `act_act_${sess.id}`,
          type: 'CARD_ACTIVATION',
          title: 'Card Activated & Issued',
          description: `Issued new card session for ${sess.customerName || 'Customer'} (Card: ${cardNum})`,
          cardNumber: cardNum,
          customerName: sess.customerName || 'Walk-in Customer',
          customerPhone: sess.customerPhone || '—',
          branchId: sess.branchId,
          branchName: mockStore.branches.find((b) => b.id === sess.branchId)?.name || 'Main Cafeteria',
          timestamp: sess.startedAt || sess.createdAt,
          amount: sess.balance,
        });
      });

      // Add Settlement activities
      settledSessions.forEach((sess) => {
        const card = mockStore.cards.find((c) => c.id === sess.cardId);
        const cardNum = card?.physicalCardNumber || sess.sessionCardNumber || 'MC-Card';
        activities.push({
          id: `act_stl_${sess.id}`,
          type: 'CARD_SETTLEMENT',
          title: 'Card Settled & Returned',
          description: `Settled card ${cardNum} and refunded remaining balance to ${sess.customerName || 'Customer'}`,
          cardNumber: cardNum,
          customerName: sess.customerName || 'Customer',
          customerPhone: sess.customerPhone || '—',
          branchId: sess.branchId,
          branchName: mockStore.branches.find((b) => b.id === sess.branchId)?.name || 'Main Cafeteria',
          timestamp: sess.settledAt || sess.updatedAt,
          amount: (sess as any).refundAmount || 0,
        });
      });

      // Add Customer History events
      const staffEvents = mockStore.customerHistoryEvents.filter((e) => {
        if (e.performedByUserId !== st.id) return false;
        if (branchId && branchId !== 'ALL' && e.branchId && e.branchId !== branchId) return false;
        const time = new Date(e.createdAt).getTime();
        if (from && time < from) return false;
        if (to && time > to) return false;
        return true;
      });

      staffEvents.forEach((ev) => {
        if (ev.action === 'CARD_BLOCKED' || ev.action === 'CARD_UNBLOCKED') {
          activities.push({
            id: `act_ev_${ev.id}`,
            type: ev.action === 'CARD_BLOCKED' ? 'CARD_BLOCKED' : 'CARD_UNBLOCKED',
            title: ev.action === 'CARD_BLOCKED' ? 'Card Blocked' : 'Card Unblocked',
            description: `${ev.action === 'CARD_BLOCKED' ? 'Blocked' : 'Unblocked'} card ${ev.physicalCardNumber}. Reason: ${ev.reason || 'N/A'}`,
            cardNumber: ev.physicalCardNumber,
            customerName: ev.customerName || 'Customer',
            customerPhone: ev.customerPhone || '—',
            branchId: ev.branchId || undefined,
            branchName: ev.branchName || 'Main Cafeteria',
            timestamp: ev.createdAt,
          });
        }
      });

      // Add Transactions
      staffTxns.forEach((tx) => {
        const pMethod = String((tx as any).paymentMethod || '').toUpperCase();
        const txType = tx.type;
        const branchName = mockStore.branches.find((b) => b.id === tx.branchId)?.name || 'Main Cafeteria';

        if (txType === 'PURCHASE') {
          purchaseCount++;
          purchaseVol += tx.amount;
          activities.push({
            id: `act_tx_${tx.id}`,
            type: 'PURCHASE',
            title: 'POS Purchase Processed',
            description: `Billed order amounting to ₹${tx.amount}`,
            amount: tx.amount,
            branchId: tx.branchId,
            branchName,
            timestamp: tx.createdAt,
            paymentMethod: 'CARD_BALANCE',
          });
        } else if (txType === 'RECHARGE_CASH' || (txType === 'RECHARGE' && (pMethod === 'CASH' || pMethod === 'CARD' || !pMethod))) {
          cardRechargeCount++;
          cardRechargeVol += tx.amount;
          activities.push({
            id: `act_tx_${tx.id}`,
            type: 'RECHARGE_CASH',
            title: 'Cash / Card POS Recharge',
            description: `Deposited ₹${tx.amount} onto card balance via Counter POS`,
            amount: tx.amount,
            branchId: tx.branchId,
            branchName,
            timestamp: tx.createdAt,
            paymentMethod: 'CASH',
          });
        } else if (txType === 'RECHARGE_UPI' || (txType === 'RECHARGE' && pMethod === 'UPI')) {
          upiRechargeCount++;
          upiRechargeVol += tx.amount;
          activities.push({
            id: `act_tx_${tx.id}`,
            type: 'RECHARGE_UPI',
            title: 'UPI QR Recharge',
            description: `Deposited ₹${tx.amount} onto card balance via UPI QR`,
            amount: tx.amount,
            branchId: tx.branchId,
            branchName,
            timestamp: tx.createdAt,
            paymentMethod: 'UPI',
          });
        } else if (txType === 'REFUND') {
          refundCount++;
          refundVol += tx.amount;
          activities.push({
            id: `act_tx_${tx.id}`,
            type: 'REFUND',
            title: 'Customer Refund Processed',
            description: `Processed customer refund of ₹${tx.amount}`,
            amount: tx.amount,
            branchId: tx.branchId,
            branchName,
            timestamp: tx.createdAt,
          });
        }
      });

      // Distribute fallback metrics so all demo staff have realistic, rich data only when no restrictive date/branch filters
      const hasStrictFilter = Boolean(filter?.startDate || filter?.endDate || (branchId && branchId !== 'ALL'));
      if (idx === 1 && activities.length === 0 && !hasStrictFilter) {
        cardRechargeCount = 4;
        cardRechargeVol = 1200;
        upiRechargeCount = 2;
        upiRechargeVol = 500;
        purchaseCount = 5;
        purchaseVol = 450;
        activities.push({
          id: 'act_demo_1',
          type: 'CARD_ACTIVATION',
          title: 'Card Activated & Issued',
          description: 'Issued new card session for Michael Scott (Card: MC-104)',
          cardNumber: 'MC 104',
          customerName: 'Michael Scott',
          customerPhone: '9765432109',
          branchId: 'branch_001',
          branchName: 'Main Cafeteria',
          timestamp: '2026-08-28T08:30:00.000Z',
          amount: 600,
        });
        activities.push({
          id: 'act_demo_2',
          type: 'RECHARGE_UPI',
          title: 'UPI QR Recharge',
          description: 'Deposited ₹300 onto card balance via UPI QR',
          amount: 300,
          cardNumber: 'MC 104',
          branchId: 'branch_001',
          branchName: 'Main Cafeteria',
          timestamp: '2026-08-28T09:15:00.000Z',
          paymentMethod: 'UPI',
        });
      }

      const totalRechargeVol = cardRechargeVol + upiRechargeVol;
      const totalTransactions = purchaseCount + cardRechargeCount + upiRechargeCount + refundCount;
      const totalVolume = Number((purchaseVol + totalRechargeVol + refundVol).toFixed(2));

      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      const assignedBranches = mockStore.branches.filter((b) => st.assignedBranchIds?.includes(b.id));
      const branchDisplayName = assignedBranches.map((b) => b.name).join(', ') || 'Unassigned';

      return {
        staffId: st.id,
        staffName: st.name,
        staffEmail: st.email,
        role: 'Counter Staff',
        status: (st.status || 'ACTIVE') as 'ACTIVE' | 'INACTIVE',
        branchId: st.assignedBranchIds?.[0] || 'branch_001',
        branchName: branchDisplayName,
        cardsActivatedCount: issuedSessions.length,
        cardsSettledCount: settledSessions.length,
        totalTransactionsCount: totalTransactions,
        totalVolumeHandled: totalVolume,
        rechargeCount: cardRechargeCount + upiRechargeCount,
        rechargeVolume: Number(totalRechargeVol.toFixed(2)),
        cardRechargeCount,
        cardRechargeVolume: Number(cardRechargeVol.toFixed(2)),
        upiRechargeCount,
        upiRechargeVolume: Number(upiRechargeVol.toFixed(2)),
        purchaseCount,
        purchaseVolume: Number(purchaseVol.toFixed(2)),
        refundCount,
        refundVolume: Number(refundVol.toFixed(2)),
        activities,
      };
    });

    return createMockSuccess({
      totalTransactions: filteredTransactions.length,
      totalRechargeVolume: Number(totalRechargeVolume.toFixed(2)),
      cashRechargeVolume: Number(cashRechargeVolume.toFixed(2)),
      cashRechargeCount,
      upiRechargeVolume: Number(upiRechargeVolume.toFixed(2)),
      upiRechargeCount,
      totalPurchaseVolume: Number(totalPurchaseVolume.toFixed(2)),
      totalRefundVolume: Number(totalRefundVolume.toFixed(2)),
      activeSessionsCount,
      activeCardsCount,
      lowStockItemsCount,
      branchPerformance,
      staffPerformance,
      activeCardsRechargeCount,
      reRechargedCardsCount,
      closedCardsCount,
      zeroBalanceActiveCardsCount,
      activeStaffCount,
      totalStaffCount: orgStaffList.length,
    });
  },

  // ─── Peak & Demand Analytics Handler ───────────────────────
  async getPeakAnalytics(filter?: AnalyticsFilter): Promise<ApiResult<PeakAnalyticsOverview>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) {
      return createMockError('UNAUTHORIZED', 'Authentication required');
    }

    const orgId = currentUser.organizationId || 'org_001';
    const orgBranchIds = mockStore.branches
      .filter((b) => b.organizationId === orgId)
      .map((b) => b.id);

    const branchId = filter?.branchId;

    // Filter transactions strictly to Org scope
    const transactions = mockStore.transactions.filter((t) => {
      if (currentUser.role === 'ORG_ADMIN') {
        if (!orgBranchIds.includes(t.branchId)) return false;
      }
      if (branchId && branchId !== 'ALL' && t.branchId !== branchId) return false;
      if (filter?.startDate) {
        if (new Date(t.createdAt) < new Date(filter.startDate)) return false;
      }
      if (filter?.endDate) {
        const endD = new Date(filter.endDate.includes('T') ? filter.endDate : `${filter.endDate}T23:59:59.999Z`);
        if (new Date(t.createdAt) > endD) return false;
      }
      return true;
    });

    // Filter sessions strictly to Org scope
    const sessions = mockStore.sessions.filter((s) => {
      if (currentUser.role === 'ORG_ADMIN') {
        if (!orgBranchIds.includes(s.branchId)) return false;
      }
      if (branchId && branchId !== 'ALL' && s.branchId !== branchId) return false;
      return true;
    });

    // 1. Initialize 24-hour distribution buckets (00:00 to 23:00)
    const hourlyBuckets: HourlyActivityMetric[] = Array.from({ length: 24 }, (_, h) => {
      const hourStr = String(h).padStart(2, '0');
      // Define typical peak cafeteria hours: 12:00 - 15:00 (lunch peak) and 19:00 - 21:00 (dinner peak)
      const isPeak = (h >= 12 && h <= 15) || (h >= 19 && h <= 21);
      return {
        hour: h,
        hourLabel: `${hourStr}:00`,
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

    // Aggregate transactions into hourly buckets
    for (const t of transactions) {
      const d = new Date(t.createdAt);
      const h = isNaN(d.getHours()) ? 12 : d.getHours();
      const bucket = hourlyBuckets[h];
      if (bucket) {
        bucket.transactionCount += 1;
        bucket.totalVolume += t.amount;
        if (t.type === 'RECHARGE') {
          bucket.rechargeCount += 1;
          totalRechargeVolume += t.amount;
        } else if (t.type === 'PURCHASE') {
          bucket.purchaseCount += 1;
          totalPurchaseVolume += t.amount;
        }
      }
    }

    // Aggregate sessions into hourly buckets
    for (const s of sessions) {
      const d = new Date(s.createdAt);
      const h = isNaN(d.getHours()) ? 12 : d.getHours();
      const bucket = hourlyBuckets[h];
      if (bucket) {
        bucket.sessionCount += 1;
      }
    }

    // 2. Product Demand Analysis
    const orgProducts = mockStore.products.filter((p) => {
      if (branchId && branchId !== 'ALL') return p.branchId === branchId;
      return orgBranchIds.includes(p.branchId);
    });
    const orgInventory = mockStore.inventory.filter((i) => {
      if (branchId && branchId !== 'ALL') return i.branchId === branchId;
      return orgBranchIds.includes(i.branchId);
    });

    let productDemand: ProductDemandMetric[] = orgProducts.map((p, idx) => {
      // Find matching inventory items to calculate stock status
      const pInv = orgInventory.filter((i) => i.productId === p.id);
      const totalQty = pInv.reduce((sum, item) => sum + item.quantity, 0);
      const threshold = 10;

      let stockStatus: 'NORMAL' | 'LOW' | 'OUT_OF_STOCK' = 'NORMAL';
      if (totalQty === 0) stockStatus = 'OUT_OF_STOCK';
      else if (totalQty <= threshold) stockStatus = 'LOW';

      // Base simulated demand distribution from purchase volume
      const baseSold = Math.max(12, (orgProducts.length - idx) * 14 + (p.price > 100 ? 10 : 25));
      const peakHourQty = Math.round(baseSold * 0.68);
      const offPeakQty = baseSold - peakHourQty;
      const revenue = baseSold * p.price;

      return {
        productId: p.id,
        productName: p.itemName,
        category: Array.isArray(p.category) ? p.category.join(', ') : (p.category || 'General Food'),
        quantitySold: baseSold,
        revenue,
        peakHourQuantity: peakHourQty,
        offPeakQuantity: offPeakQty,
        stockStatus,
        currentStock: totalQty,
      };
    });

    // Sort product demand by quantity sold descending
    productDemand.sort((a, b) => b.quantitySold - a.quantitySold);

    const filterCategory = filter?.category || filter?.categoryId;
    if (filterCategory && filterCategory !== 'ALL') {
      const targetLower = filterCategory.toLowerCase();
      productDemand = productDemand.filter((p) => {
        const cats = (p.category || '').split(/[,|;]/).map((c) => c.trim().toLowerCase());
        return cats.some(
          (c) => c === targetLower || c.replace(/s$/, '') === targetLower.replace(/s$/, '')
        );
      });
    }

    // 3. Peak vs Non-Peak Comparison
    let peakTransactions = 0;
    let offPeakTransactions = 0;
    let peakVolume = 0;
    let offPeakVolume = 0;
    let maxHourBucket = hourlyBuckets[13] || hourlyBuckets[0];

    for (const b of hourlyBuckets) {
      if (b.totalVolume > maxHourBucket.totalVolume) {
        maxHourBucket = b;
      }
    }

    for (const b of hourlyBuckets) {
      const isStandardPeak = (b.hour >= 12 && b.hour <= 15) || (b.hour >= 19 && b.hour <= 21);
      const isDynamicPeak = maxHourBucket.totalVolume > 0 && b.hour === maxHourBucket.hour;
      b.isPeak = isStandardPeak || isDynamicPeak;

      if (b.isPeak) {
        peakTransactions += b.transactionCount;
        peakVolume += b.totalVolume;
      } else {
        offPeakTransactions += b.transactionCount;
        offPeakVolume += b.totalVolume;
      }
    }

    // Determine busiest branch
    const branchCounts: Record<string, number> = {};
    for (const t of transactions) {
      branchCounts[t.branchId] = (branchCounts[t.branchId] || 0) + 1;
    }
    let maxBranchId = Object.keys(branchCounts)[0] || '';
    for (const [bId, count] of Object.entries(branchCounts)) {
      if (count > (branchCounts[maxBranchId] || 0)) {
        maxBranchId = bId;
      }
    }
    const busiestBranch = mockStore.branches.find((b) => b.id === maxBranchId);

    const comparison: PeakPeriodComparison = {
      peakHoursRange: '12:00 PM – 03:00 PM & 07:00 PM – 09:00 PM',
      peakTransactions,
      offPeakTransactions,
      peakVolume: Number(peakVolume.toFixed(2)),
      offPeakVolume: Number(offPeakVolume.toFixed(2)),
      busiestHour: `${maxHourBucket.hourLabel} (${maxHourBucket.hour > 12 ? `${maxHourBucket.hour - 12} PM` : `${maxHourBucket.hour} AM`})`,
      busiestBranchName: busiestBranch ? busiestBranch.name : 'Main Cafeteria',
    };

    return createMockSuccess({
      hourlyDistribution: hourlyBuckets,
      productDemand,
      comparison,
      totalTransactions: transactions.length,
      totalPurchaseVolume: Number(totalPurchaseVolume.toFixed(2)),
      totalRechargeVolume: Number(totalRechargeVolume.toFixed(2)),
      busiestDay: 'Friday (Campus Peak)',
    });
  },

  async exportPeakAnalyticsCsv(filter?: AnalyticsFilter): Promise<ApiResult<AnalyticsExportResponseData>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) {
      return createMockError('UNAUTHORIZED', 'Authentication required');
    }

    const peakRes = await this.getPeakAnalytics(filter);
    if (!peakRes.success) {
      return createMockError(peakRes.error.code, peakRes.error.message);
    }

    const data = peakRes.data;
    let csvContent = '--- HOURLY DISTRIBUTION ---\n';
    csvContent += 'Hour,Label,IsPeak,TotalTransactions,Recharges,Purchases,ActiveSessions,Volume(INR)\n';
    for (const h of data.hourlyDistribution) {
      csvContent += `${h.hour},${h.hourLabel},${h.isPeak},${h.transactionCount},${h.rechargeCount},${h.purchaseCount},${h.sessionCount},${h.totalVolume}\n`;
    }

    csvContent += '\n--- PRODUCT DEMAND ---\n';
    csvContent += 'ProductId,ProductName,Category,QuantitySold,PeakHourQty,OffPeakQty,Revenue(INR),StockStatus\n';
    for (const p of data.productDemand) {
      csvContent += `${p.productId},"${p.productName}","${p.category}",${p.quantitySold},${p.peakHourQuantity},${p.offPeakQuantity},${p.revenue},${p.stockStatus}\n`;
    }

    const filename = `peak_demand_analysis_${filter?.branchId || 'organization'}_${new Date().toISOString().split('T')[0]}.csv`;

    return createMockSuccess({
      filename,
      content: csvContent,
      mimeType: 'text/csv',
    });
  },

  async exportAnalyticsCsv(filter?: AnalyticsFilter): Promise<ApiResult<AnalyticsExportResponseData>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) {
      return createMockError('UNAUTHORIZED', 'Authentication required');
    }

    const branchId = filter?.branchId;
    let filteredTxns = mockStore.transactions;

    if (currentUser.role === 'ORG_ADMIN') {
      const orgId = currentUser.organizationId || 'org_001';
      const orgBranchIds = mockStore.branches
        .filter((b) => b.organizationId === orgId)
        .map((b) => b.id);

      filteredTxns = filteredTxns.filter((t) => orgBranchIds.includes(t.branchId));
    }

    if (branchId && branchId !== 'ALL') {
      filteredTxns = filteredTxns.filter((t) => t.branchId === branchId);
    } else if (currentUser.role === 'STAFF') {
      filteredTxns = filteredTxns.filter((t) => currentUser.assignedBranchIds.includes(t.branchId));
    }

    let csvContent = 'transactionId,sessionId,branchId,type,amount,status,timestamp\n';
    for (const t of filteredTxns) {
      csvContent += `${t.id},${t.sessionId},${t.branchId},${t.type},${t.amount},${t.status},${t.createdAt}\n`;
    }

    const filename = `analytics_export_${branchId || 'organization'}_${new Date().toISOString().split('T')[0]}.csv`;

    return createMockSuccess({
      filename,
      content: csvContent,
      mimeType: 'text/csv',
    });
  },

  async exportData(filter?: AnalyticsFilter): Promise<ApiResult<AnalyticsExportResponseData>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) {
      return createMockError('UNAUTHORIZED', 'Authentication required');
    }

    return createMockSuccess({
      filename: `analytics_export_${filter?.branchId || 'organization'}_${new Date().toISOString().split('T')[0]}.pdf`,
      content: 'JVBERi0xLjQKJcTl8uXrCjEgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDIgMCBSCj4+CmVuZG9iago...',
      mimeType: 'application/pdf',
    });
  },

  async downloadReportPdf(reportId: string): Promise<ApiResult<Blob>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) {
      return createMockError('UNAUTHORIZED', 'Authentication required');
    }

    const pdfBlob = new Blob([`%PDF-1.4 Verified M0 Report ${reportId}`], { type: 'application/pdf' });
    return createMockSuccess(pdfBlob);
  },

  async getReports(): Promise<ApiResult<ReportItem[]>> {
    await mockDelay();
    const now = new Date();
    const reportTemplates = [
      { title: 'Monthly Financial Settlement & Reconciliation Report', type: 'FINANCIAL_AUDIT' },
      { title: 'Daily Cash Balance & Digital Payment Breakdown', type: 'FINANCIAL_AUDIT' },
      { title: 'Branch Inventory & Product Movement Summary', type: 'INVENTORY_AUDIT' },
      { title: 'Low-Stock Alert & Inventory Reorder Ledger', type: 'INVENTORY_AUDIT' },
      { title: 'Card Session Audit & POS Transaction Ledger', type: 'SESSION_AUDIT' },
      { title: 'Active Smart Card Wallet Balance Audit', type: 'SESSION_AUDIT' },
      { title: 'Tax & GST Financial Summary Report', type: 'TAX_SUMMARY' },
      { title: 'Staff Sales & Counter Performance Audit', type: 'STAFF_PERFORMANCE' },
      { title: 'Multi-Branch Revenue Reconciliation Report', type: 'BRANCH_RECONCILIATION' },
      { title: 'Customer Refund & Chargeback Activity Log', type: 'CUSTOMER_REFUND_LOG' },
      { title: 'Card Issuance & QR Token Generation Ledger', type: 'CARD_ISSUANCE_AUDIT' },
      { title: 'Blocked Card Session & Security Event Audit', type: 'SESSION_AUDIT' },
      { title: 'Hourly Peak Demand & Counter Velocity Report', type: 'FINANCIAL_AUDIT' },
      { title: 'Category-Wise Product Sales & Profitability Analysis', type: 'INVENTORY_AUDIT' },
      { title: 'Daily Recharge & Deposit Summary Report', type: 'FINANCIAL_AUDIT' },
      { title: 'Weekly Multi-Counter Settlement Statement', type: 'BRANCH_RECONCILIATION' },
      { title: 'Executive Lounge VIP Session Activity Audit', type: 'SESSION_AUDIT' },
      { title: 'End-of-Day Terminal Closing & Drawer Balancing', type: 'FINANCIAL_AUDIT' },
      { title: 'Smart Card Replacement & Transfer Audit', type: 'CARD_ISSUANCE_AUDIT' },
      { title: 'Supplier Stock Receipt & Wastage Log', type: 'INVENTORY_AUDIT' },
      { title: 'Quarterly Financial Audit & Revenue Ledger', type: 'FINANCIAL_AUDIT' },
      { title: 'Staff Shift Handover & Cash Reconciliation', type: 'STAFF_PERFORMANCE' },
      { title: 'Failed Transaction & Dispute Resolution Log', type: 'FINANCIAL_AUDIT' },
      { title: 'Annual Subscription & Limit Usage Audit', type: 'BRANCH_RECONCILIATION' },
      { title: 'Unclaimed Card Balance & Inactive Wallet Settlement', type: 'SESSION_AUDIT' },
      { title: 'Top Selling Food & Beverage Item Rankings', type: 'INVENTORY_AUDIT' },
      { title: 'UPI vs Cash Payment Gateway Settlement Audit', type: 'FINANCIAL_AUDIT' },
      { title: 'Customer Session Duration & Counter Dwell Report', type: 'SESSION_AUDIT' },
      { title: 'Emergency Override & Manual Adjustment Audit', type: 'STAFF_PERFORMANCE' },
      { title: 'Master Platform Compliance & System Audit Certificate', type: 'FINANCIAL_AUDIT' },
    ];

    const reports: ReportItem[] = reportTemplates.map((template, idx) => {
      const reportDate = new Date(now.getTime() - idx * 86400000 * 0.5).toISOString();
      const id = `rep_${(idx + 1).toString().padStart(3, '0')}`;
      return {
        id,
        title: template.title,
        type: template.type,
        generatedAt: reportDate,
        downloadUrl: `/api/v1/reports/${id}/pdf`,
      };
    });

    return createMockSuccess(reports);
  },
};
