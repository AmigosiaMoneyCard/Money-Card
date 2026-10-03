import { describe, it, expect } from 'vitest';
import { TransactionType, SessionStatus } from '@prisma/client';

describe('Cancel Recharge Earliest Top-up Guard Logic', () => {
  interface MockTransaction {
    id: string;
    sessionId: string;
    type: string;
    amount: number;
    createdAt: string;
    items?: Record<string, any>;
  }

  const sessionId = 'session-101';

  function evaluateCanCancelRecharge(
    targetTxId: string,
    sessionBalance: number,
    sessionStatus: string,
    transactions: MockTransaction[],
  ): { canCancel: boolean; error?: string } {
    const txRecord = transactions.find((t) => t.id === targetTxId);
    if (!txRecord) {
      return { canCancel: false, error: 'NOT_FOUND' };
    }

    const items = txRecord.items || {};
    if (items.isCancelled) {
      return { canCancel: false, error: 'ALREADY_CANCELLED' };
    }

    if (sessionStatus !== SessionStatus.ACTIVE) {
      return { canCancel: false, error: 'SESSION_INACTIVE' };
    }

    // Chronologically sort all recharges (earliest first)
    const allRecharges = transactions
      .filter((t) => {
        const typeStr = String(t.type || '');
        return typeStr.includes('RECHARGE') || typeStr === 'CASH' || typeStr === 'UPI';
      })
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // Guard: Earliest recharge cannot be cancelled if a subsequent recharge was cancelled
    if (allRecharges.length > 1 && allRecharges[0].id === targetTxId) {
      const hasCancelledNext = allRecharges.slice(1).some((t) => (t.items || {}).isCancelled === true);
      if (hasCancelledNext) {
        return {
          canCancel: false,
          error: 'CANNOT_CANCEL_EARLIEST_RECHARGE',
        };
      }
    }

    if (sessionBalance < txRecord.amount) {
      return { canCancel: false, error: 'INSUFFICIENT_BALANCE' };
    }

    return { canCancel: true };
  }

  it('blocks cancellation of earliest recharge when the subsequent recharge is cancelled', () => {
    const txs: MockTransaction[] = [
      {
        id: 'tx-1', // Earliest recharge
        sessionId,
        type: TransactionType.RECHARGE_CASH,
        amount: 500,
        createdAt: '2026-10-03T10:00:00Z',
        items: {},
      },
      {
        id: 'tx-2', // Subsequent recharge, cancelled
        sessionId,
        type: TransactionType.RECHARGE_UPI,
        amount: 200,
        createdAt: '2026-10-03T10:30:00Z',
        items: { isCancelled: true, cancellationReason: 'Wrong Amount Entered' },
      },
    ];

    const result = evaluateCanCancelRecharge('tx-1', 500, SessionStatus.ACTIVE, txs);
    expect(result.canCancel).toBe(false);
    expect(result.error).toBe('CANNOT_CANCEL_EARLIEST_RECHARGE');
  });

  it('permits cancellation of subsequent recharge when balance is sufficient', () => {
    const txs: MockTransaction[] = [
      {
        id: 'tx-1',
        sessionId,
        type: TransactionType.RECHARGE_CASH,
        amount: 500,
        createdAt: '2026-10-03T10:00:00Z',
        items: {},
      },
      {
        id: 'tx-2',
        sessionId,
        type: TransactionType.RECHARGE_UPI,
        amount: 200,
        createdAt: '2026-10-03T10:30:00Z',
        items: {},
      },
    ];

    const result = evaluateCanCancelRecharge('tx-2', 700, SessionStatus.ACTIVE, txs);
    expect(result.canCancel).toBe(true);
  });

  it('permits cancellation of single isolated recharge when no subsequent recharges exist', () => {
    const txs: MockTransaction[] = [
      {
        id: 'tx-1',
        sessionId,
        type: TransactionType.RECHARGE_CASH,
        amount: 300,
        createdAt: '2026-10-03T10:00:00Z',
        items: {},
      },
    ];

    const result = evaluateCanCancelRecharge('tx-1', 300, SessionStatus.ACTIVE, txs);
    expect(result.canCancel).toBe(true);
  });
});
