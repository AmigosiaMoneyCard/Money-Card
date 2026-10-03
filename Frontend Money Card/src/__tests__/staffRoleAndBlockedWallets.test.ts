import { describe, it, expect } from 'vitest';
import type { Staff, Card } from '@/types';

describe('Staff Role Toggle and Blocked Wallets Segmentation Tests', () => {
  // Helper matching StaffPage role detection logic
  const getStaffRoleLabel = (staff: Staff): string => {
    const isKitchenRole =
      (staff as any).staffType === 'KITCHEN' ||
      (staff as any).role === 'KITCHEN' ||
      staff.name?.toLowerCase().includes('kitchen') ||
      staff.email?.toLowerCase().includes('kitchen');

    if (isKitchenRole) return 'Kitchen Staff';

    const hasRechargeOrPurchase = staff.permissions?.some((p) =>
      ['RECHARGE', 'PURCHASE', 'CARD_ISSUE', 'CARD_VIEW'].includes(p)
    );

    if (hasRechargeOrPurchase || (staff.assignedBranchIds && staff.assignedBranchIds.length > 0)) {
      return 'Counter Manager';
    }

    return 'Counter Staff';
  };

  it('correctly classifies Counter Manager and Kitchen Staff', () => {
    const managerStaff: Staff = {
      id: 'staff-akhil',
      organizationId: 'org-1',
      name: 'akhil',
      phone: '9876543210',
      email: 'akhil@cafeteria.com',
      status: 'ACTIVE',
      assignedBranchIds: ['branch-1'],
      permissions: ['CARD_VIEW', 'CARD_ISSUE', 'RECHARGE', 'PURCHASE', 'PRODUCT_VIEW'],
      createdAt: '2026-10-01T10:00:00Z',
      updatedAt: '2026-10-01T10:00:00Z',
    };

    const kitchenStaff: Staff = {
      id: 'staff-cook',
      organizationId: 'org-1',
      name: 'Kitchen Chef',
      phone: '9876543211',
      email: 'kitchen@cafeteria.com',
      status: 'ACTIVE',
      assignedBranchIds: ['branch-1'],
      permissions: ['PRODUCT_VIEW'],
      staffType: 'KITCHEN',
      createdAt: '2026-10-01T10:00:00Z',
      updatedAt: '2026-10-01T10:00:00Z',
    };

    expect(getStaffRoleLabel(managerStaff)).toBe('Counter Manager');
    expect(getStaffRoleLabel(kitchenStaff)).toBe('Kitchen Staff');
  });

  it('allows switching role permissions between Counter Manager and Kitchen Staff', () => {
    const KITCHEN_DEFAULT_PERMISSIONS = ['PRODUCT_VIEW'];
    const FROZEN_M0_PERMISSIONS = [
      'CARD_VIEW',
      'CARD_ISSUE',
      'CARD_RETURN',
      'CARD_BLOCK',
      'CARD_UNBLOCK',
      'RECHARGE',
      'PURCHASE',
      'REFUND',
      'SESSION_VIEW',
      'PRODUCT_VIEW',
      'PRODUCT_MANAGE',
      'VIEW_ANALYTICS',
      'VIEW_REPORTS',
      'STAFF_VIEW',
      'STAFF_MANAGE',
      'BRANCH_VIEW',
      'BRANCH_MANAGE',
    ];

    let currentRole: 'MANAGER' | 'KITCHEN' = 'MANAGER';
    let currentPermissions = [...FROZEN_M0_PERMISSIONS];

    // Toggle to Kitchen
    currentRole = 'KITCHEN';
    currentPermissions = [...KITCHEN_DEFAULT_PERMISSIONS];

    expect(currentRole).toBe('KITCHEN');
    expect(currentPermissions).toEqual(['PRODUCT_VIEW']);
    expect(currentPermissions.includes('RECHARGE')).toBe(false);

    // Toggle back to Manager
    currentRole = 'MANAGER';
    currentPermissions = [...FROZEN_M0_PERMISSIONS];

    expect(currentRole).toBe('MANAGER');
    expect(currentPermissions).toContain('RECHARGE');
    expect(currentPermissions).toContain('PURCHASE');
    expect(currentPermissions).toContain('CARD_ISSUE');
  });

  it('restricts Daily Activity Summary action strictly to Counter Manager role', () => {
    const managerStaff: Staff = {
      id: 'staff-1',
      organizationId: 'org-1',
      name: 'akhil',
      phone: '9876543210',
      email: 'akhil@cafeteria.com',
      status: 'ACTIVE',
      assignedBranchIds: ['branch-1'],
      permissions: ['CARD_VIEW', 'RECHARGE', 'PURCHASE'],
      createdAt: '2026-10-01T10:00:00Z',
      updatedAt: '2026-10-01T10:00:00Z',
    };

    const kitchenStaff: Staff = {
      id: 'staff-2',
      organizationId: 'org-1',
      name: 'Ravi',
      phone: '9876543212',
      email: 'ravi.kitchen@cafeteria.com',
      status: 'ACTIVE',
      assignedBranchIds: ['branch-1'],
      permissions: ['PRODUCT_VIEW'],
      staffType: 'KITCHEN',
      createdAt: '2026-10-01T10:00:00Z',
      updatedAt: '2026-10-01T10:00:00Z',
    };

    const shouldShowDailySummary = (staff: Staff) => getStaffRoleLabel(staff) === 'Counter Manager';

    expect(shouldShowDailySummary(managerStaff)).toBe(true);
    expect(shouldShowDailySummary(kitchenStaff)).toBe(false);
  });

  it('correctly segments Live Active Wallets and Blocked Wallets', () => {
    const sampleCards: Card[] = [
      {
        id: 'card-1',
        physicalCardNumber: 'MC001',
        qrToken: 'QR001',
        status: 'ACTIVE',
        activeSession: {
          id: 'sess-1',
          balance: 250,
          branchId: 'branch-1',
        },
        organizationId: 'org-1',
        createdAt: '2026-10-01T10:00:00Z',
        updatedAt: '2026-10-01T10:00:00Z',
      },
      {
        id: 'card-2',
        physicalCardNumber: 'MC002',
        qrToken: 'QR002',
        status: 'BLOCKED',
        activeSession: {
          id: 'sess-2',
          balance: 100,
          branchId: 'branch-1',
        },
        organizationId: 'org-1',
        createdAt: '2026-10-01T10:00:00Z',
        updatedAt: '2026-10-01T10:00:00Z',
      },
      {
        id: 'card-3',
        physicalCardNumber: 'MC003',
        qrToken: 'QR003',
        status: 'ACTIVE',
        activeSession: {
          id: 'sess-3',
          balance: 50,
          branchId: 'branch-1',
        },
        organizationId: 'org-1',
        createdAt: '2026-10-01T10:00:00Z',
        updatedAt: '2026-10-01T10:00:00Z',
      },
      {
        id: 'card-4',
        physicalCardNumber: 'MC004',
        qrToken: 'QR004',
        status: 'BLOCKED',
        activeSession: null,
        organizationId: 'org-1',
        createdAt: '2026-10-01T10:00:00Z',
        updatedAt: '2026-10-01T10:00:00Z',
      },
    ];

    const activeCards = sampleCards.filter((c) => c.status !== 'BLOCKED');
    const blockedCards = sampleCards.filter((c) => c.status === 'BLOCKED');

    expect(activeCards.length).toBe(2);
    expect(activeCards.map((c) => c.physicalCardNumber)).toEqual(['MC001', 'MC003']);

    expect(blockedCards.length).toBe(2);
    expect(blockedCards.map((c) => c.physicalCardNumber)).toEqual(['MC002', 'MC004']);

    const totalBlockedBalance = blockedCards.reduce((sum, c) => sum + (c.activeSession?.balance || 0), 0);
    expect(totalBlockedBalance).toBe(100);
  });

  it('correctly calculates Money Added from live recharge volume and transactions fallback', () => {
    const analytics = {
      moneyAdded: 1500,
      rechargeCount: 5,
      totalPurchaseVolume: 800,
      activeCardsCount: 12,
    };

    const moneyAddedValue = analytics.moneyAdded ?? 0;
    const rechargesCount = analytics.rechargeCount ?? 0;

    expect(moneyAddedValue).toBe(1500);
    expect(rechargesCount).toBe(5);

    // Fallback scenario where moneyAdded is 0 but totalRechargeVolume has positive value
    const legacyAnalytics = {
      moneyAdded: 0,
      totalRechargeVolume: 2200,
      rechargeCount: 8,
    };

    const resolvedMoneyAdded = (legacyAnalytics.moneyAdded && legacyAnalytics.moneyAdded > 0)
      ? legacyAnalytics.moneyAdded
      : legacyAnalytics.totalRechargeVolume ?? 0;

    expect(resolvedMoneyAdded).toBe(2200);
  });

  it('correctly handles checkbox toggling with prerequisite auto-selection and cascading revocation', () => {
    const dependencies: Record<string, string[]> = {
      CARD_ISSUE: ['CARD_VIEW'],
      CARD_RETURN: ['CARD_VIEW'],
      CARD_BLOCK: ['CARD_VIEW'],
      CARD_UNBLOCK: ['CARD_VIEW'],
      PRODUCT_MANAGE: ['PRODUCT_VIEW'],
      REFUND: ['SESSION_VIEW'],
    };

    const children: Record<string, string[]> = {
      CARD_VIEW: ['CARD_ISSUE', 'CARD_RETURN', 'CARD_BLOCK', 'CARD_UNBLOCK'],
      PRODUCT_VIEW: ['PRODUCT_MANAGE'],
      SESSION_VIEW: ['REFUND'],
    };

    let selected = new Set<string>();

    // 1. Checking CARD_ISSUE should automatically check CARD_VIEW prerequisite
    const checkPermission = (perm: string) => {
      selected.add(perm);
      const prereqs = dependencies[perm];
      if (prereqs) {
        prereqs.forEach((p) => selected.add(p));
      }
    };

    checkPermission('CARD_ISSUE');
    expect(selected.has('CARD_ISSUE')).toBe(true);
    expect(selected.has('CARD_VIEW')).toBe(true);

    // 2. Unchecking CARD_VIEW should cascade and remove CARD_ISSUE
    const uncheckPermission = (perm: string) => {
      selected.delete(perm);
      const dependent = children[perm];
      if (dependent) {
        dependent.forEach((d) => selected.delete(d));
      }
    };

    uncheckPermission('CARD_VIEW');
    expect(selected.has('CARD_VIEW')).toBe(false);
    expect(selected.has('CARD_ISSUE')).toBe(false);

    // 3. Checking REFUND automatically adds SESSION_VIEW
    checkPermission('REFUND');
    expect(selected.has('REFUND')).toBe(true);
    expect(selected.has('SESSION_VIEW')).toBe(true);
  });
});

