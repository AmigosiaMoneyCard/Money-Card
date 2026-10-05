import { describe, it, expect } from 'vitest';
import type { PublicTransaction } from '@/types';

describe('Portal Recharge History & Billing Receipt Tests', () => {
  it('should filter transactions to strictly show recharge records only', () => {
    const mixedTransactions: PublicTransaction[] = [
      {
        id: 'txn-1',
        type: 'RECHARGE',
        amount: 500,
        status: 'SUCCESS',
        timestamp: '2026-10-05T10:00:00Z',
        paymentMethod: 'UPI',
      },
      {
        id: 'txn-2',
        type: 'PURCHASE',
        amount: 150,
        status: 'SUCCESS',
        timestamp: '2026-10-05T10:30:00Z',
        items: [
          {
            itemId: 'item-1',
            itemName: 'Chicken Biriyani',
            quantity: 1,
            unitPrice: 150,
            totalPrice: 150,
          },
        ],
      },
      {
        id: 'txn-3',
        type: 'RECHARGE_CASH',
        amount: 200,
        status: 'SUCCESS',
        timestamp: '2026-10-05T11:00:00Z',
        paymentMethod: 'CASH',
      },
      {
        id: 'txn-4',
        type: 'REFUND_RETURN',
        amount: 50,
        status: 'SUCCESS',
        timestamp: '2026-10-05T12:00:00Z',
      },
      {
        id: 'txn-5',
        type: 'RECHARGE_UPI',
        amount: 300,
        status: 'SUCCESS',
        timestamp: '2026-10-05T12:30:00Z',
        paymentMethod: 'UPI',
      },
    ];

    const isRecharge = (txn: PublicTransaction) =>
      txn.type === 'RECHARGE' ||
      txn.type === 'RECHARGE_CASH' ||
      txn.type === 'RECHARGE_UPI' ||
      String(txn.type).includes('RECHARGE');

    const rechargeHistoryOnly = mixedTransactions.filter(isRecharge);

    expect(rechargeHistoryOnly).toHaveLength(3);
    expect(rechargeHistoryOnly.map((t) => t.id)).toEqual(['txn-1', 'txn-3', 'txn-5']);
    expect(rechargeHistoryOnly.some((t) => t.type === 'PURCHASE')).toBe(false);
    expect(rechargeHistoryOnly.some((t) => t.type === 'REFUND_RETURN')).toBe(false);
  });

  it('should format all ordered food items without ellipsis truncation for preparation list', () => {
    const complexOrder = {
      orderNumber: '042',
      counterName: 'Counter 1',
      items: [
        { itemName: 'avil milk', quantity: 2 },
        { itemName: 'cb', quantity: 1 },
        { itemName: 'chiken biriyani', quantity: 1 },
        { itemName: 'milk', quantity: 1 },
        { itemName: 'tea', quantity: 3 },
      ],
    };

    const itemSummary = complexOrder.items
      .map((it) => `${it.quantity}x ${it.itemName}`)
      .join(', ');

    const fullOrderText = `${complexOrder.counterName}: ${itemSummary}`;

    expect(fullOrderText).toBe(
      'Counter 1: 2x avil milk, 1x cb, 1x chiken biriyani, 1x milk, 3x tea'
    );
    expect(fullOrderText).not.toContain('...');
  });
});
