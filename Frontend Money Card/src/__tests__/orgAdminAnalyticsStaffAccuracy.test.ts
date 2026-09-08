import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockAnalyticsHandlers } from '../services/mock/handlers/analytics';
import { mockStaffHandlers } from '../services/mock/handlers/staff';
import { mockAuthHandlers } from '../services/mock/handlers/auth';
import { mockStore } from '../services/mock/store';
import type { AuthUser, Transaction } from '../types';

describe('Org Admin Analytics - Accurate Staff Count & Ledger Metrics', () => {
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
      'STAFF_VIEW',
      'STAFF_MANAGE',
      'VIEW_ANALYTICS',
    ],
    assignedBranchIds: ['branch_001', 'branch_002'],
    mustChangePassword: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.resetStore();
    mockAuthHandlers.setMockSessionUser(orgAdminUser);
  });

  it('should accurately report 3 active staff across 2 branches in initial seed', async () => {
    const res = await mockAnalyticsHandlers.getAnalyticsOverview();
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.activeStaffCount).toBe(3);
      expect(res.data.staffPerformance?.length).toBe(3);
    }
  });

  it('should accurately filter active staff when branch filter is selected', async () => {
    // branch_001 has staff_001 (branch_001) and usr_staff_eros (branch_001, branch_002) = 2 staff
    const resBranch1 = await mockAnalyticsHandlers.getAnalyticsOverview({ branchId: 'branch_001' });
    expect(resBranch1.success).toBe(true);
    if (resBranch1.success) {
      expect(resBranch1.data.activeStaffCount).toBe(2);
      expect(resBranch1.data.staffPerformance?.map((s) => s.staffId)).toEqual(
        expect.arrayContaining(['staff_001', 'usr_staff_eros']),
      );
    }

    // branch_002 has usr_staff_eros (branch_001, branch_002) and staff_002 (branch_002) = 2 staff
    const resBranch2 = await mockAnalyticsHandlers.getAnalyticsOverview({ branchId: 'branch_002' });
    expect(resBranch2.success).toBe(true);
    if (resBranch2.success) {
      expect(resBranch2.data.activeStaffCount).toBe(2);
      expect(resBranch2.data.staffPerformance?.map((s) => s.staffId)).toEqual(
        expect.arrayContaining(['usr_staff_eros', 'staff_002']),
      );
    }
  });

  it('should dynamically increase activeStaffCount when a new staff member is created', async () => {
    const createRes = await mockStaffHandlers.createStaff({
      name: 'New Chef Staff',
      email: 'chef@maincafe.com',
      permissions: ['PURCHASE', 'SESSION_VIEW'],
      assignedBranchIds: ['branch_001'],
      password: 'password123',
    });
    expect(createRes.success).toBe(true);

    const res = await mockAnalyticsHandlers.getAnalyticsOverview();
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.activeStaffCount).toBe(4);
      expect(res.data.totalStaffCount).toBe(4);
    }
  });

  it('should exclude deactivated/inactive staff from activeStaffCount', async () => {
    // Deactivate staff_001
    const staff = mockStore.staffEntities.find((s) => s.id === 'staff_001');
    if (staff) staff.status = 'INACTIVE';

    const res = await mockAnalyticsHandlers.getAnalyticsOverview();
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.activeStaffCount).toBe(2);
      expect(res.data.totalStaffCount).toBe(3);
    }
  });

  it('should accurately calculate cash and UPI recharges from actual transactions without hardcoded ratios', async () => {
    const res = await mockAnalyticsHandlers.getAnalyticsOverview();
    expect(res.success).toBe(true);
    if (res.success) {
      // In seed: TXN001 is CASH 500, TXN003 is UPI 200 => Total 700
      expect(res.data.cashRechargeVolume).toBe(500);
      expect(res.data.upiRechargeVolume).toBe(200);
      expect(res.data.totalRechargeVolume).toBe(700);
    }
  });

  it('should dynamically update wallet recharges and active card sessions when new operations occur', async () => {
    // Add extra UPI recharge transaction
    const newTxn: Transaction = {
      id: 'txn_test_upi',
      sessionId: 'SESSION002',
      branchId: 'branch_001',
      type: 'RECHARGE',
      amount: 350,
      paymentMethod: 'UPI',
      status: 'SUCCESS',
      createdAt: new Date().toISOString(),
    };
    mockStore.transactions.push(newTxn);

    const res = await mockAnalyticsHandlers.getAnalyticsOverview();
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.cashRechargeVolume).toBe(500);
      expect(res.data.upiRechargeVolume).toBe(550);
      expect(res.data.totalRechargeVolume).toBe(1050);
    }
  });
});
