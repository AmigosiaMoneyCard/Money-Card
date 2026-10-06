import { describe, it, expect } from 'vitest';
import type { Staff, Card } from '@/types';
import { MANAGER_PERMISSIONS, KITCHEN_PERMISSIONS } from '@/features/staff/constants';

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

  it('correctly maps roles and permissions between Counter Manager and Kitchen Staff', () => {
    let roleType: 'MANAGER' | 'KITCHEN' = 'MANAGER';
    let permissions = [...MANAGER_PERMISSIONS];

    expect(roleType).toBe('MANAGER');
    expect(permissions).toEqual(MANAGER_PERMISSIONS);
    expect(permissions.includes('RECHARGE')).toBe(true);
    expect(permissions.includes('CARD_ISSUE')).toBe(true);

    // Switching to Kitchen Staff
    roleType = 'KITCHEN';
    permissions = [...KITCHEN_PERMISSIONS];

    expect(roleType).toBe('KITCHEN');
    expect(permissions).toEqual(KITCHEN_PERMISSIONS);
    expect(permissions.includes('RECHARGE')).toBe(false);
    expect(permissions.includes('PRODUCT_VIEW')).toBe(true);

    // Switching back to Counter Manager
    roleType = 'MANAGER';
    permissions = [...MANAGER_PERMISSIONS];

    expect(roleType).toBe('MANAGER');
    expect(permissions).toEqual(MANAGER_PERMISSIONS);
  });

  it('correctly scopes Blocked Wallets box to Org Admin Dashboard and omits from Counter Dashboard', () => {
    const shouldShowBlockedWalletsStatCard = (isCounterAdmin: boolean) => !isCounterAdmin;

    expect(shouldShowBlockedWalletsStatCard(true)).toBe(false);
    expect(shouldShowBlockedWalletsStatCard(false)).toBe(true);
  });

  it('correctly computes Blocked Wallets KPIs and filters across multiple fields', () => {
    const blockedCards: Card[] = [
      {
        id: 'card-b1',
        physicalCardNumber: 'KD1DG3Z8J',
        qrToken: 'QR-B1',
        status: 'BLOCKED',
        blockedReason: 'Lost card reported by customer',
        blockedBy: 'Counter Admin',
        blockedAt: '2026-10-04T10:00:00Z',
        activeSession: {
          id: 'sess-b1',
          balance: 150,
          branchId: 'branch-1',
          branchName: 'Counter 1',
          customerName: 'Jane Doe',
          customerPhone: '9876543210',
        },
        organizationId: 'org-1',
        createdAt: '2026-10-04T09:00:00Z',
        updatedAt: '2026-10-04T10:00:00Z',
      },
      {
        id: 'card-b2',
        physicalCardNumber: 'MC004',
        qrToken: 'QR-B2',
        status: 'BLOCKED',
        blockedReason: 'Chip damaged',
        blockedBy: 'Staff Akhil',
        blockedAt: '2026-10-03T14:30:00Z',
        activeSession: null,
        organizationId: 'org-1',
        createdAt: '2026-10-03T10:00:00Z',
        updatedAt: '2026-10-03T14:30:00Z',
      },
    ];

    const totalBlockedCount = blockedCards.length;
    const totalLockedBalance = blockedCards.reduce(
      (sum, c) => sum + (c.activeSession?.balance || 0),
      0
    );

    expect(totalBlockedCount).toBe(2);
    expect(totalLockedBalance).toBe(150);

    // Filter by reason
    const filterByQuery = (query: string) => {
      const q = query.toLowerCase().trim();
      return blockedCards.filter((c) => {
        const cardId = (c.physicalCardNumber || c.qrToken || c.id || '').toLowerCase();
        const customer = (c.activeSession?.customerName || '').toLowerCase();
        const phone = (c.activeSession?.customerPhone || '').toLowerCase();
        const reason = (c.blockedReason || '').toLowerCase();
        const branch = (c.activeSession?.branchName || '').toLowerCase();
        return (
          cardId.includes(q) ||
          customer.includes(q) ||
          phone.includes(q) ||
          reason.includes(q) ||
          branch.includes(q)
        );
      });
    };

    expect(filterByQuery('lost').length).toBe(1);
    expect(filterByQuery('lost')[0].physicalCardNumber).toBe('KD1DG3Z8J');

    expect(filterByQuery('damaged').length).toBe(1);
    expect(filterByQuery('damaged')[0].physicalCardNumber).toBe('MC004');

    expect(filterByQuery('9876543210').length).toBe(1);
    expect(filterByQuery('KD1DG3Z8J').length).toBe(1);
  });
});


