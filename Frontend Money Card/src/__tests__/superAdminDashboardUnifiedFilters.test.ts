import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockAnalyticsHandlers } from '../services/mock/handlers/analytics';
import { mockAuthHandlers } from '../services/mock/handlers/auth';
import { mockStore } from '../services/mock/store';
import type { AuthUser, OrganizationOverview } from '../types';

describe('Super Admin Dashboard - Unified Overview with Org and Date Range Filters', () => {
  const superAdminUser: AuthUser = {
    id: 'usr_superadmin',
    email: 'amigosiamoneycard@gmail.com',
    name: 'Platform Super Admin',
    role: 'SUPER_ADMIN',
    organizationId: null,
    mustChangePassword: false,
    permissions: [],
    assignedBranchIds: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthHandlers.setMockSessionUser(superAdminUser);
  });

  it('queries platform-wide analytics when organizationId and date range are omitted', async () => {
    const res = await mockAnalyticsHandlers.getAnalyticsOverview();
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.totalTransactions).toBeGreaterThan(0);
      expect(res.data.branchPerformance).toBeDefined();
      expect(res.data.branchPerformance?.length).toBe(mockStore.branches.length);
    }
  });

  it('queries scoped analytics when organizationId is selected', async () => {
    const orgId = 'org_001';
    const orgBranchIds = mockStore.branches
      .filter((b) => b.organizationId === orgId)
      .map((b) => b.id);

    const res = await mockAnalyticsHandlers.getAnalyticsOverview({
      organizationId: orgId,
    });

    expect(res.success).toBe(true);
    if (res.success) {
      for (const bp of res.data.branchPerformance || []) {
        expect(orgBranchIds).toContain(bp.branchId);
      }
      expect(res.data.activeCardsCount).toBeDefined();
    }
  });

  it('queries scoped analytics with custom time range filter', async () => {
    const res = await mockAnalyticsHandlers.getAnalyticsOverview({
      organizationId: 'org_001',
      startDate: '2026-01-01',
      endDate: '2026-01-31',
    });

    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.totalTransactions).toBeGreaterThan(0);
      expect(res.data.totalPurchaseVolume).toBeGreaterThan(0);
    }
  });

  it('returns empty transaction volume for future date range with no transactions', async () => {
    const res = await mockAnalyticsHandlers.getAnalyticsOverview({
      startDate: '2029-01-01',
      endDate: '2029-01-02',
    });

    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.totalTransactions).toBe(0);
      expect(res.data.totalPurchaseVolume).toBe(0);
      expect(res.data.totalRechargeVolume).toBe(0);
    }
  });

  it('computes platform scale metrics correctly for all organizations vs single organization', () => {
    const mockOrgs: OrganizationOverview[] = [
      {
        id: 'org_001',
        name: 'Acme Cafeterias',
        status: 'ACTIVE',
        planId: 'PLAN_STANDARD',
        usage: {
          activeCardCount: 15,
          cardCount: 20,
          cardLimit: 100,
          branchCount: 2,
          branchLimit: 5,
          staffCount: 4,
          staffLimit: 10,
        },
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'org_002',
        name: 'Metro Food Court',
        status: 'ACTIVE',
        planId: 'PLAN_BASIC',
        usage: {
          activeCardCount: 8,
          cardCount: 10,
          cardLimit: 50,
          branchCount: 1,
          branchLimit: 2,
          staffCount: 2,
          staffLimit: 5,
        },
        createdAt: '2026-02-01T00:00:00.000Z',
        updatedAt: '2026-02-01T00:00:00.000Z',
      },
    ];

    // Case 1: All Organizations selected (empty selectedOrgId)
    const allActiveOrgs = mockOrgs.filter((o) => o.status === 'ACTIVE');
    const allOrgsCount = allActiveOrgs.length;
    const allCardholders = allActiveOrgs.reduce((sum, o) => sum + (o.usage?.activeCardCount ?? 0), 0);
    const allCounters = allActiveOrgs.reduce((sum, o) => sum + (o.usage?.branchCount ?? 0), 0);
    const allStaff = allActiveOrgs.reduce((sum, o) => sum + (o.usage?.staffCount ?? 0), 0);

    expect(allOrgsCount).toBe(2);
    expect(allCardholders).toBe(23);
    expect(allCounters).toBe(3);
    expect(allStaff).toBe(6);

    // Case 2: Specific Organization selected ('org_001')
    const selectedOrgId = 'org_001';
    const filteredOrgs = allActiveOrgs.filter((o) => o.id === selectedOrgId);
    const singleOrgDisplayCount = selectedOrgId ? 1 : allOrgsCount;
    const singleOrgCardholders = filteredOrgs.reduce((sum, o) => sum + (o.usage?.activeCardCount ?? 0), 0);
    const singleOrgCounters = filteredOrgs.reduce((sum, o) => sum + (o.usage?.branchCount ?? 0), 0);
    const singleOrgStaff = filteredOrgs.reduce((sum, o) => sum + (o.usage?.staffCount ?? 0), 0);

    expect(singleOrgDisplayCount).toBe(1);
    expect(singleOrgCardholders).toBe(15);
    expect(singleOrgCounters).toBe(2);
    expect(singleOrgStaff).toBe(4);
  });
});
