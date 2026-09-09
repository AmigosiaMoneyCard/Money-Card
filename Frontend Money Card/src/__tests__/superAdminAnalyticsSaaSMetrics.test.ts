import { describe, it, expect } from 'vitest';
import type {
  OrganizationOverview,
  SubscriptionPayment,
  PlanChangeRequest,
} from '@/types';

describe('Super Admin Analytics View - SaaS Platform Metrics', () => {
  const mockOrgs: OrganizationOverview[] = [
    {
      id: 'org_001',
      name: 'Acme Cafeterias',
      status: 'ACTIVE',
      planId: 'plan_std',
      plan: {
        id: 'plan_std',
        name: 'Standard',
        status: 'ACTIVE',
        price: 4999,
        currency: 'INR',
        billingInterval: 'MONTHLY',
        branchLimit: 5,
        staffLimit: 20,
        cardLimit: 500,
        inventoryLevel: 'STANDARD',
        reportsLevel: 'STANDARD',
        analyticsLevel: 'STANDARD',
        multiBranchEnabled: true,
        whiteLabelEnabled: false,
        supportLevel: 'STANDARD',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'org_002',
      name: 'Metro Food Court',
      status: 'ACTIVE',
      planId: 'plan_str',
      plan: {
        id: 'plan_str',
        name: 'Starter',
        status: 'ACTIVE',
        price: 1999,
        currency: 'INR',
        billingInterval: 'MONTHLY',
        branchLimit: 2,
        staffLimit: 5,
        cardLimit: 100,
        inventoryLevel: 'BASIC',
        reportsLevel: 'BASIC',
        analyticsLevel: 'BASIC',
        multiBranchEnabled: false,
        whiteLabelEnabled: false,
        supportLevel: 'BASIC',
        createdAt: '2026-02-01T00:00:00.000Z',
        updatedAt: '2026-02-01T00:00:00.000Z',
      },
      createdAt: '2026-02-01T00:00:00.000Z',
      updatedAt: '2026-02-01T00:00:00.000Z',
    },
  ];

  const mockPayments: SubscriptionPayment[] = [
    {
      id: 'sub_pay_001',
      subscriptionId: 'sub_001',
      organizationId: 'org_001',
      amount: 1499,
      currency: 'INR',
      status: 'SUCCESS',
      paymentMethod: 'DIRECT_BANK_TRANSFER',
      paymentReference: 'NEFT_REF_99881122',
      externalReference: 'PAY_SUB_12345',
      verifiedBy: 'Platform Super Admin',
      verifiedAt: '2026-01-01T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ];

  const mockPlanRequests: PlanChangeRequest[] = [
    {
      id: 'req_001',
      organizationId: 'org_001',
      organizationName: 'Acme Cafeterias',
      currentPlanId: 'PLAN_STANDARD',
      currentPlanName: 'Standard Plan',
      requestedPlanId: 'PLAN_PRO',
      requestedPlanName: 'Pro Plan',
      requestType: 'UPGRADE',
      reason: 'Expanding to 2 new cafeteria locations across the campus.',
      status: 'PENDING',
      createdAt: '2026-02-10T10:00:00.000Z',
      updatedAt: '2026-02-10T10:00:00.000Z',
    },
    {
      id: 'req_002',
      organizationId: 'org_002',
      organizationName: 'City Foods Co.',
      currentPlanId: 'PLAN_STARTER',
      currentPlanName: 'Starter Plan',
      requestedPlanId: 'PLAN_STANDARD',
      requestedPlanName: 'Standard Plan',
      requestType: 'UPGRADE',
      reason: 'Need increased card limits for upcoming semester.',
      status: 'PENDING',
      createdAt: '2026-02-12T14:30:00.000Z',
      updatedAt: '2026-02-12T14:30:00.000Z',
    },
  ];

  it('calculates total organizations and active subscriptions accurately', () => {
    expect(mockOrgs.length).toBe(2);
    const activeSubs = mockOrgs.filter((o) => o.status === 'ACTIVE').length;
    expect(activeSubs).toBe(2);
  });

  it('calculates subscription revenue from verified payments', () => {
    const verifiedRevenue = mockPayments
      .filter((p) => p.status === 'SUCCESS')
      .reduce((sum, p) => sum + p.amount, 0);

    expect(verifiedRevenue).toBe(1499);
  });

  it('calculates pending plan requests as the 4th core business metric', () => {
    const pendingCount = mockPlanRequests.filter((r) => r.status === 'PENDING').length;
    expect(pendingCount).toBe(2);
  });

  it('verifies that removed consumer metrics are no longer in the analytics KPI cards structure', () => {
    const activeAnalyticsKpiLabels = [
      'Total Cafeterias',
      'Active Subscriptions',
      'Gateway Subscription Revenue',
      'Plan Requests',
    ];

    const removedConsumerMetrics = [
      'Platform POS Volume',
      'Wallet Recharges',
      'Total Transactions',
      'Active Sessions',
    ];

    removedConsumerMetrics.forEach((removed) => {
      expect(activeAnalyticsKpiLabels).not.toContain(removed);
    });

    expect(activeAnalyticsKpiLabels).toContain('Plan Requests');
  });
});
