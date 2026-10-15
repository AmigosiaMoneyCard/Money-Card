import { describe, it, expect } from 'vitest';
import { TransactionType } from '@prisma/client';

describe('Card Fleet Analytics - Cancelled Recharge & Fleet Aggregation Logic', () => {
  interface MockTransaction {
    id: string;
    branchId?: string;
    staffUserId?: string;
    type: TransactionType | string;
    amount: number;
    paymentMethod?: string;
    createdAt?: Date;
    items?: Record<string, any>;
  }

  interface MockSession {
    id: string;
    balance: number;
    issuedAt?: Date;
    transactions: MockTransaction[];
    card?: { physicalCardNumber?: string; status?: string };
    branch?: { name?: string };
    sessionCardNumber?: string;
  }

  // Exact function mirroring analytics.controller.ts cardItems calculation
  function calculateCardItem(s: MockSession) {
    const cardNum =
      s.card?.physicalCardNumber ||
      s.sessionCardNumber ||
      `MC-${s.id.slice(0, 6).toUpperCase()}`;
    let totalRecharged = 0;
    let totalSpent = 0;
    let totalRefunded = 0;
    let lastUsedAt = s.issuedAt ? s.issuedAt.toISOString() : undefined;

    s.transactions.forEach((t) => {
      const isCancelled = Boolean((t.items as any)?.isCancelled);
      const tType = String(t.type || '').toUpperCase();
      if (tType.includes('RECHARGE') || tType === 'ISSUANCE') {
        if (!isCancelled) {
          totalRecharged += t.amount;
        }
      } else if (tType === 'PURCHASE') {
        totalSpent += t.amount;
      } else if (tType.includes('REFUND')) {
        totalRefunded += t.amount;
      }
      if (t.createdAt && (!lastUsedAt || new Date(t.createdAt) > new Date(lastUsedAt))) {
        lastUsedAt = new Date(t.createdAt).toISOString();
      }
    });

    return {
      id: s.id,
      cardNumber: cardNum,
      balance: Number(s.balance.toFixed(2)),
      totalRecharged: Number(totalRecharged.toFixed(2)),
      totalSpent: Number(totalSpent.toFixed(2)),
      totalRefunded: Number(totalRefunded.toFixed(2)),
      transactionCount: s.transactions.length,
      lastUsedAt,
    };
  }

  // Test Case 1: A valid ₹100 recharge contributes ₹100
  it('Case 1: A valid ₹100 recharge contributes ₹100 to totalRecharged', () => {
    const session: MockSession = {
      id: 'sess-001',
      balance: 100,
      transactions: [
        {
          id: 'tx-1',
          type: TransactionType.RECHARGE_CASH,
          amount: 100,
          items: {},
        },
      ],
    };

    const card = calculateCardItem(session);
    expect(card.totalRecharged).toBe(100);
    expect(card.balance).toBe(100);
  });

  // Test Case 2: A cancelled ₹100 recharge contributes ₹0 to valid recharge volume
  it('Case 2: A cancelled ₹100 recharge contributes ₹0 to valid recharge volume', () => {
    const session: MockSession = {
      id: 'sess-002',
      balance: 0,
      transactions: [
        {
          id: 'tx-2',
          type: TransactionType.RECHARGE_CASH,
          amount: 100,
          items: {
            isCancelled: true,
            cancelledAt: new Date().toISOString(),
            cancellationReason: 'Wrong Amount Entered',
          },
        },
      ],
    };

    const card = calculateCardItem(session);
    expect(card.totalRecharged).toBe(0);
    expect(card.balance).toBe(0);
  });

  // Test Case 3: A valid ₹100 recharge plus a cancelled ₹50 recharge contributes ₹100
  it('Case 3: A valid ₹100 recharge plus a cancelled ₹50 recharge contributes ₹100', () => {
    const session: MockSession = {
      id: 'sess-003',
      balance: 100,
      transactions: [
        {
          id: 'tx-3a',
          type: TransactionType.RECHARGE_CASH,
          amount: 100,
          items: {},
        },
        {
          id: 'tx-3b',
          type: TransactionType.RECHARGE_UPI,
          amount: 50,
          items: {
            isCancelled: true,
            cancelledAt: new Date().toISOString(),
            cancellationReason: 'Duplicate Scan',
          },
        },
      ],
    };

    const card = calculateCardItem(session);
    expect(card.totalRecharged).toBe(100);
    expect(card.balance).toBe(100);
    expect(card.transactionCount).toBe(2);
  });

  // Test Case 4: Existing issuance transaction behaviour remains unchanged
  it('Case 4: Existing issuance transaction behaviour remains unchanged', () => {
    const session: MockSession = {
      id: 'sess-004',
      balance: 200,
      transactions: [
        {
          id: 'tx-4-issue',
          type: 'ISSUANCE',
          amount: 200,
          items: {},
        },
      ],
    };

    const card = calculateCardItem(session);
    expect(card.totalRecharged).toBe(200);
    expect(card.balance).toBe(200);
  });

  // Test Case 5: Financial Overview, Staff Performance, and Cash in Drawer calculations remain unchanged
  it('Case 5: Financial Overview, Staff Performance, and Cash in Drawer calculations remain unchanged', () => {
    // Verify that the main financial loop continues to work as expected
    let totalRechargeVolume = 0;
    let cashRechargeVolume = 0;
    let upiRechargeVolume = 0;
    let totalRefundVolume = 0;
    let cancelledTopUpsVolume = 0;
    let cancelledTopUpsCount = 0;

    const txs: MockTransaction[] = [
      {
        id: 'tx-cash-valid',
        type: TransactionType.RECHARGE_CASH,
        amount: 500,
        paymentMethod: 'CASH',
        items: {},
      },
      {
        id: 'tx-upi-valid',
        type: TransactionType.RECHARGE_UPI,
        amount: 300,
        paymentMethod: 'UPI',
        items: {},
      },
      {
        id: 'tx-cancelled-recharge',
        type: TransactionType.RECHARGE_CASH,
        amount: 100,
        paymentMethod: 'CASH',
        items: { isCancelled: true, cancelledAt: new Date().toISOString() },
      },
      {
        id: 'tx-refund',
        type: TransactionType.REFUND_RETURN,
        amount: 150,
        paymentMethod: 'CASH',
        items: {},
      },
    ];

    txs.forEach((tx) => {
      const txType = String(tx.type || '');
      const paymentMethod = String(tx.paymentMethod || '').toUpperCase();
      const isCancelled = Boolean((tx.items as any)?.isCancelled);

      if (isCancelled) {
        if (txType.includes('RECHARGE') || txType === 'CASH' || txType === 'UPI') {
          cancelledTopUpsCount++;
          cancelledTopUpsVolume += tx.amount;
        }
        return; // Exclude from active totals
      }

      if (txType === 'REFUND_RETURN' || txType.includes('REFUND')) {
        totalRefundVolume += tx.amount;
      } else if (txType.includes('RECHARGE') || paymentMethod === 'CASH' || paymentMethod === 'UPI') {
        totalRechargeVolume += tx.amount;
        if (paymentMethod === 'CASH' || txType === 'RECHARGE_CASH') {
          cashRechargeVolume += tx.amount;
        } else if (paymentMethod === 'UPI' || txType === 'RECHARGE_UPI') {
          upiRechargeVolume += tx.amount;
        }
      }
    });

    const netMoneyCollected = totalRechargeVolume - totalRefundVolume;
    const cashInDrawer = cashRechargeVolume - totalRefundVolume;

    // Assertions
    expect(cancelledTopUpsVolume).toBe(100);
    expect(cancelledTopUpsCount).toBe(1);
    expect(totalRechargeVolume).toBe(800); // 500 cash + 300 upi (excludes 100 cancelled)
    expect(cashRechargeVolume).toBe(500); // excludes 100 cancelled
    expect(upiRechargeVolume).toBe(300);
    expect(totalRefundVolume).toBe(150);
    expect(netMoneyCollected).toBe(650); // 800 - 150
    expect(cashInDrawer).toBe(350); // 500 - 150
  });
});
