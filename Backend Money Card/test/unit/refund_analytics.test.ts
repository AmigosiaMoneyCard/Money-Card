import { describe, it, expect } from 'vitest';
import { TransactionType } from '@prisma/client';

describe('Refund Analytics Calculation & Staff Attribution Logic', () => {
  interface MockTransaction {
    id: string;
    branchId: string;
    staffUserId?: string;
    type: TransactionType;
    amount: number;
    paymentMethod?: string;
    createdAt?: Date;
    items?: Record<string, any>;
    session?: {
      branchId?: string;
      card?: { physicalCardNumber?: string };
      sessionCardNumber?: string;
      customerName?: string;
      customerPhone?: string;
    };
  }

  interface AggregationResult {
    totalRechargeVolume: number;
    totalRechargeCount: number;
    cashRechargeVolume: number;
    cashRechargeCount: number;
    upiRechargeVolume: number;
    upiRechargeCount: number;
    totalRefundVolume: number;
    totalRefundCount: number;
    cashRefunds: number;
    cashRefundCount: number;
    upiRefunds: number;
    upiRefundCount: number;
    netMoneyCollected: number;
    cashInDrawer: number;
  }

  // Exact implementation of the updated analytics classification logic
  function aggregateTransactions(
    transactions: MockTransaction[],
    effectiveBranchId?: string,
  ): AggregationResult {
    let totalRechargeVolume = 0;
    let totalRechargeCount = 0;
    let cashRechargeVolume = 0;
    let cashRechargeCount = 0;
    let upiRechargeVolume = 0;
    let upiRechargeCount = 0;
    let totalRefundVolume = 0;
    let totalRefundCount = 0;
    let cashRefunds = 0;
    let cashRefundCount = 0;
    let upiRefunds = 0;
    let upiRefundCount = 0;

    transactions.forEach((tx) => {
      const isThisBranch = !effectiveBranchId || tx.branchId === effectiveBranchId;
      const txType = String(tx.type || '');
      const paymentMethod = String(tx.paymentMethod || '').toUpperCase();
      const isCancelled = Boolean((tx.items as any)?.isCancelled);

      if (isCancelled) return;

      if (txType === 'PURCHASE') {
        // Purchases handled separately
      } else if (txType === 'REFUND_RETURN' || txType.includes('REFUND') || txType.includes('RETURN')) {
        const pMethod = String(tx.paymentMethod || '').toUpperCase();
        if (isThisBranch) {
          totalRefundVolume += tx.amount;
          totalRefundCount++;
          if (pMethod === 'UPI') {
            upiRefunds += tx.amount;
            upiRefundCount++;
          } else {
            cashRefunds += tx.amount;
            cashRefundCount++;
          }
        }
      } else if (txType === 'RECHARGE_CASH' || paymentMethod === 'CASH' || paymentMethod === 'CARD' || txType === 'CASH') {
        if (isThisBranch) {
          totalRechargeVolume += tx.amount;
          totalRechargeCount++;
          cashRechargeVolume += tx.amount;
          cashRechargeCount++;
        }
      } else if (txType === 'RECHARGE_UPI' || paymentMethod === 'UPI' || txType === 'UPI') {
        if (isThisBranch) {
          totalRechargeVolume += tx.amount;
          totalRechargeCount++;
          upiRechargeVolume += tx.amount;
          upiRechargeCount++;
        }
      } else if (txType.includes('RECHARGE') || txType === 'ISSUANCE') {
        if (isThisBranch) {
          totalRechargeVolume += tx.amount;
          totalRechargeCount++;
          if (paymentMethod === 'UPI') {
            upiRechargeVolume += tx.amount;
            upiRechargeCount++;
          } else {
            cashRechargeVolume += tx.amount;
            cashRechargeCount++;
          }
        }
      }
    });

    return {
      totalRechargeVolume: Number(totalRechargeVolume.toFixed(2)),
      totalRechargeCount,
      cashRechargeVolume: Number(cashRechargeVolume.toFixed(2)),
      cashRechargeCount,
      upiRechargeVolume: Number(upiRechargeVolume.toFixed(2)),
      upiRechargeCount,
      totalRefundVolume: Number(totalRefundVolume.toFixed(2)),
      totalRefundCount,
      cashRefunds: Number(cashRefunds.toFixed(2)),
      cashRefundCount,
      upiRefunds: Number(upiRefunds.toFixed(2)),
      upiRefundCount,
      netMoneyCollected: Number((totalRechargeVolume - totalRefundVolume).toFixed(2)),
      cashInDrawer: Number((cashRechargeVolume - totalRefundVolume).toFixed(2)),
    };
  }

  // Exact implementation of the updated staff performance classification logic
  function aggregateStaffPerformance(
    transactions: MockTransaction[],
    staffUserId: string,
  ) {
    let cardRechargeCount = 0;
    let cardRechargeVolume = 0;
    let upiRechargeCount = 0;
    let upiRechargeVolume = 0;
    let refundCount = 0;
    let refundVolume = 0;
    const activities: any[] = [];

    const staffTxns = transactions.filter((t) => t.staffUserId === staffUserId);

    staffTxns.forEach((tx) => {
      const txType = String(tx.type || '');
      const pMethod = String(tx.paymentMethod || '').toUpperCase();
      const bName = 'Main Cafeteria';
      const cardNum = tx.session?.card?.physicalCardNumber || tx.session?.sessionCardNumber || 'MC-Card';
      const custName = tx.session?.customerName || 'Customer';
      const custPhone = tx.session?.customerPhone || '—';

      if (txType === 'PURCHASE') {
        // Purchase logic
      } else if (txType === 'REFUND_RETURN' || txType.includes('REFUND') || txType.includes('RETURN')) {
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
          timestamp: tx.createdAt?.toISOString() || new Date().toISOString(),
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
          timestamp: tx.createdAt?.toISOString() || new Date().toISOString(),
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
          timestamp: tx.createdAt?.toISOString() || new Date().toISOString(),
          paymentMethod: 'UPI',
          cardNumber: cardNum,
          customerName: custName,
          customerPhone: custPhone,
        });
      }
    });

    return {
      cardRechargeCount,
      cardRechargeVolume,
      upiRechargeCount,
      upiRechargeVolume,
      refundCount,
      refundVolume,
      activities,
    };
  }

  // 1. ₹2,000 CASH refund test
  it('correctly aggregates ₹2,000 CASH refund into refund totals without polluting recharge volume', () => {
    const txs: MockTransaction[] = [
      {
        id: 'tx_ref_001',
        branchId: 'branch_001',
        type: TransactionType.REFUND_RETURN,
        amount: 2000,
        paymentMethod: 'CASH',
      },
    ];

    const result = aggregateTransactions(txs);
    expect(result.totalRefundVolume).toBe(2000);
    expect(result.totalRefundCount).toBe(1);
    expect(result.cashRefunds).toBe(2000);
    expect(result.cashRefundCount).toBe(1);
    expect(result.upiRefunds).toBe(0);
    expect(result.totalRechargeVolume).toBe(0);
    expect(result.cashRechargeVolume).toBe(0);
    expect(result.totalRechargeCount).toBe(0);
  });

  // 2. ₹1,000 UPI refund test
  it('correctly aggregates ₹1,000 UPI refund into UPI refund totals without polluting recharge volume', () => {
    const txs: MockTransaction[] = [
      {
        id: 'tx_ref_002',
        branchId: 'branch_001',
        type: TransactionType.REFUND_RETURN,
        amount: 1000,
        paymentMethod: 'UPI',
      },
    ];

    const result = aggregateTransactions(txs);
    expect(result.totalRefundVolume).toBe(1000);
    expect(result.totalRefundCount).toBe(1);
    expect(result.upiRefunds).toBe(1000);
    expect(result.upiRefundCount).toBe(1);
    expect(result.cashRefunds).toBe(0);
    expect(result.totalRechargeVolume).toBe(0);
    expect(result.upiRechargeVolume).toBe(0);
  });

  // 3. ₹500 genuine cash recharge test
  it('correctly aggregates ₹500 genuine cash recharge without polluting refund totals', () => {
    const txs: MockTransaction[] = [
      {
        id: 'tx_rec_001',
        branchId: 'branch_001',
        type: TransactionType.RECHARGE_CASH,
        amount: 500,
        paymentMethod: 'CASH',
      },
    ];

    const result = aggregateTransactions(txs);
    expect(result.totalRechargeVolume).toBe(500);
    expect(result.cashRechargeVolume).toBe(500);
    expect(result.totalRechargeCount).toBe(1);
    expect(result.totalRefundVolume).toBe(0);
    expect(result.totalRefundCount).toBe(0);
  });

  // 4. Staff Performance test
  it('properly attributes refund activity and volume to staff performance rather than creating fake recharges', () => {
    const staffId = 'usr_staff_001';
    const txs: MockTransaction[] = [
      {
        id: 'tx_staff_ref',
        branchId: 'branch_001',
        staffUserId: staffId,
        type: TransactionType.REFUND_RETURN,
        amount: 2000,
        paymentMethod: 'CASH',
        session: { customerName: 'Nihal' },
      },
      {
        id: 'tx_staff_rec',
        branchId: 'branch_001',
        staffUserId: staffId,
        type: TransactionType.RECHARGE_CASH,
        amount: 500,
        paymentMethod: 'CASH',
        session: { customerName: 'Arun' },
      },
    ];

    const perf = aggregateStaffPerformance(txs, staffId);
    expect(perf.refundCount).toBe(1);
    expect(perf.refundVolume).toBe(2000);
    expect(perf.cardRechargeCount).toBe(1);
    expect(perf.cardRechargeVolume).toBe(500);

    expect(perf.activities).toHaveLength(2);
    const refundActivity = perf.activities.find((a) => a.type === 'REFUND');
    expect(refundActivity).toBeDefined();
    expect(refundActivity?.title).toBe('Customer Refund Processed');
    expect(refundActivity?.amount).toBe(2000);

    const rechargeActivity = perf.activities.find((a) => a.type === 'RECHARGE_CASH');
    expect(rechargeActivity).toBeDefined();
    expect(rechargeActivity?.title).toBe('Card / Cash Recharge');
    expect(rechargeActivity?.amount).toBe(500);
  });

  // 5. Net Cash in Drawer accounting test
  it('calculates net cash in drawer as ₹3,000 for ₹5,000 cash recharge followed by ₹2,000 cash refund', () => {
    const txs: MockTransaction[] = [
      {
        id: 'tx_rec_5000',
        branchId: 'branch_001',
        type: TransactionType.RECHARGE_CASH,
        amount: 5000,
        paymentMethod: 'CASH',
      },
      {
        id: 'tx_ref_2000',
        branchId: 'branch_001',
        type: TransactionType.REFUND_RETURN,
        amount: 2000,
        paymentMethod: 'CASH',
      },
    ];

    const result = aggregateTransactions(txs);
    expect(result.cashRechargeVolume).toBe(5000);
    expect(result.totalRefundVolume).toBe(2000);
    expect(result.cashInDrawer).toBe(3000); // 5000 - 2000
    expect(result.netMoneyCollected).toBe(3000);
  });

  // 6. Branch-specific vs All Counters filtering test
  describe('Branch-Specific vs All Counters Filtering', () => {
    const multiBranchTxs: MockTransaction[] = [
      {
        id: 'tx_b1_ref',
        branchId: 'branch_001', // Counter 1
        type: TransactionType.REFUND_RETURN,
        amount: 2000,
        paymentMethod: 'CASH',
      },
      {
        id: 'tx_b2_ref',
        branchId: 'branch_002', // High School Block
        type: TransactionType.REFUND_RETURN,
        amount: 1500,
        paymentMethod: 'CASH',
      },
    ];

    it('correctly isolates Counter 1 refund volume when filtered by branch_001', () => {
      const result = aggregateTransactions(multiBranchTxs, 'branch_001');
      expect(result.totalRefundVolume).toBe(2000);
      expect(result.totalRefundCount).toBe(1);
    });

    it('correctly aggregates all refunds across all counters when effectiveBranchId is undefined', () => {
      const result = aggregateTransactions(multiBranchTxs, undefined);
      expect(result.totalRefundVolume).toBe(3500); // 2000 + 1500
      expect(result.totalRefundCount).toBe(2);
    });
  });
});
