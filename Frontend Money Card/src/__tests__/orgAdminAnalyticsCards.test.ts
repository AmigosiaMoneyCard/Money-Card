import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockAnalyticsHandlers } from '../services/mock/handlers/analytics';
import { mockAuthHandlers } from '../services/mock/handlers/auth';
import { mockStore } from '../services/mock/store';
import type { AuthUser, CardSession, Transaction } from '../types';

describe('Org Admin Analytics - Card Lifecycle & Activity Boxes', () => {
  const orgAdminUser: AuthUser = {
    id: 'usr_orgadmin',
    email: 'admin@maincafe.com',
    name: 'Acme General Manager',
    role: 'ORG_ADMIN',
    organizationId: 'org_001',
    permissions: [
      'CARD_VIEW',
      'RECHARGE',
      'PURCHASE',
      'REFUND',
      'SESSION_VIEW',
      'VIEW_ANALYTICS',
    ],
    assignedBranchIds: ['branch_001'],
    mustChangePassword: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.resetStore();
    mockAuthHandlers.setMockSessionUser(orgAdminUser);
  });

  it('should accurately calculate zeroBalanceActiveCardsCount from active sessions', async () => {
    // Check initial seed state
    const res = await mockAnalyticsHandlers.getAnalyticsOverview();
    expect(res.success).toBe(true);
    if (res.success) {
      expect(typeof res.data.zeroBalanceActiveCardsCount).toBe('number');
      // In seed data, SESSION003 is active with balance 0.0
      expect(res.data.zeroBalanceActiveCardsCount).toBe(1);
    }
  });

  it('should dynamically update zeroBalanceActiveCardsCount when session balance changes', async () => {
    // Add another active session with zero balance
    const extraZeroSession: CardSession = {
      id: 'sess_test_zero',
      cardId: 'card_test_zero',
      branchId: 'branch_001',
      balance: 0.0,
      status: 'ACTIVE',
      cycleNumber: 1,
      customerName: 'Zero Balance User',
      customerPhone: '9999999999',
      startedAt: new Date().toISOString(),
      settledAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockStore.sessions.push(extraZeroSession);

    const res = await mockAnalyticsHandlers.getAnalyticsOverview();
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.zeroBalanceActiveCardsCount).toBe(2);
    }
  });

  it('should accurately calculate closedCardsCount for settled card sessions', async () => {
    const res = await mockAnalyticsHandlers.getAnalyticsOverview();
    expect(res.success).toBe(true);
    if (res.success) {
      expect(typeof res.data.closedCardsCount).toBe('number');
      // In seed data, SESSION004 is SETTLED
      expect(res.data.closedCardsCount).toBe(1);
    }
  });

  it('should accurately count active card recharges and repeat re-recharges', async () => {
    const res = await mockAnalyticsHandlers.getAnalyticsOverview();
    expect(res.success).toBe(true);
    if (res.success) {
      expect(typeof res.data.activeCardsRechargeCount).toBe('number');
      expect(typeof res.data.reRechargedCardsCount).toBe('number');
      // SESSION001 has TXN001 (RECHARGE) and TXN003 (RECHARGE)
      expect(res.data.activeCardsRechargeCount).toBeGreaterThanOrEqual(2);
      expect(res.data.reRechargedCardsCount).toBeGreaterThanOrEqual(1);
    }
  });

  it('should increment activeCardsRechargeCount when another recharge transaction occurs on an active card', async () => {
    const newRechargeTx: Transaction = {
      id: 'tx_extra_recharge',
      sessionId: 'SESSION002', // Active session
      branchId: 'branch_001',
      type: 'RECHARGE',
      amount: 300,
      balanceAfter: 620,
      status: 'SUCCESS',
      paymentMethod: 'CASH',
      createdAt: new Date().toISOString(),
    };
    mockStore.transactions.push(newRechargeTx);

    const res = await mockAnalyticsHandlers.getAnalyticsOverview();
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.activeCardsRechargeCount).toBe(3);
    }
  });
});
