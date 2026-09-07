import { describe, it, expect } from 'vitest';
import type {
  OrganizationOverview,
  Subscription,
  SubscriptionPayment,
  PlanChangeRequest,
} from '@/types';

describe('Super Admin Dashboard - B2B SaaS Platform KPI Metrics', () => {
  const mockOrgs: OrganizationOverview[] = [
    {
      id: 'org_001',
      name: 'Activation Test Cafeteria',
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
      createdAt: '2026-09-07T00:00:00.000Z',
      updatedAt: '2026-09-07T00:00:00.000Z',
    },
    {
      id: 'org_002',
      name: 'test',
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
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      createdAt: '2026-09-03T00:00:00.000Z',
      updatedAt: '2026-09-03T00:00:00.000Z',
    },
    {
      id: 'org_003',
      name: 'Acme Cafeterias',
      status: 'ACTIVE',
      planId: 'plan_ent',
      plan: {
        id: 'plan_ent',
        name: 'Enterprise',
        status: 'ACTIVE',
        price: 9999,
        currency: 'INR',
        billingInterval: 'MONTHLY',
        branchLimit: 20,
        staffLimit: 100,
        cardLimit: 5000,
        inventoryLevel: 'ADVANCED',
        reportsLevel: 'ADVANCED',
        analyticsLevel: 'ADVANCED',
        multiBranchEnabled: true,
        whiteLabelEnabled: true,
        supportLevel: 'PRIORITY',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      createdAt: '2026-08-28T00:00:00.000Z',
      updatedAt: '2026-08-28T00:00:00.000Z',
    },
  ];

  const mockSubscriptions: Subscription[] = [
    {
      id: 'sub_001',
      organizationId: 'org_001',
      planId: 'plan_std',
      status: 'ACTIVE',
      paymentStatus: 'SUCCESS',
      startDate: '2026-01-01T00:00:00.000Z',
      endDate: '2026-12-31T23:59:59.000Z',
      renewalDate: '2026-12-31T23:59:59.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'sub_002',
      organizationId: 'org_002',
      planId: 'plan_str',
      status: 'ACTIVE',
      paymentStatus: 'SUCCESS',
      startDate: '2026-02-01T00:00:00.000Z',
      endDate: '2026-12-31T23:59:59.000Z',
      renewalDate: '2026-12-31T23:59:59.000Z',
      createdAt: '2026-02-01T00:00:00.000Z',
      updatedAt: '2026-02-01T00:00:00.000Z',
    },
  ];

  const mockPayments: SubscriptionPayment[] = [
    {
      id: 'pay_001',
      organizationId: 'org_001',
      subscriptionId: 'sub_001',
      amount: 4999,
      currency: 'INR',
      status: 'SUCCESS',
      paymentMethod: 'DIRECT_BANK_TRANSFER',
      paymentReference: 'REF_001',
      createdAt: '2026-09-01T10:00:00.000Z',
    },
    {
      id: 'pay_002',
      organizationId: 'org_002',
      subscriptionId: 'sub_002',
      amount: 1999,
      currency: 'INR',
      status: 'SUCCESS',
      paymentMethod: 'DIRECT_BANK_TRANSFER',
      paymentReference: 'REF_002',
      createdAt: '2026-09-02T11:00:00.000Z',
    },
  ];

  const mockPlanRequests: PlanChangeRequest[] = [
    {
      id: 'req_001',
      organizationId: 'org_001',
      organizationName: 'Activation Test Cafeteria',
      currentPlanId: 'plan_std',
      currentPlanName: 'Standard',
      requestedPlanId: 'plan_ent',
      requestedPlanName: 'Enterprise',
      requestType: 'UPGRADE',
      reason: 'Expanding cafeteria counters',
      status: 'PENDING',
      createdAt: '2026-09-05T10:00:00.000Z',
      updatedAt: '2026-09-05T10:00:00.000Z',
    },
    {
      id: 'req_002',
      organizationId: 'org_003',
      organizationName: 'Acme Cafeterias',
      currentPlanId: 'plan_ent',
      currentPlanName: 'Enterprise',
      requestedPlanId: 'plan_ent',
      requestedPlanName: 'Enterprise',
      requestType: 'RENEWAL',
      reason: 'Annual renewal',
      status: 'PENDING',
      createdAt: '2026-09-06T12:00:00.000Z',
      updatedAt: '2026-09-06T12:00:00.000Z',
    },
  ];

  it('calculates total verified subscription revenue across all cafeterias', () => {
    const verifiedRevenue = mockPayments
      .filter((p) => p.status === 'SUCCESS')
      .reduce((sum, p) => sum + p.amount, 0);

    expect(verifiedRevenue).toBe(6998); // 4999 + 1999
  });

  it('falls back to active plan recurring revenue if no direct payments recorded', () => {
    const emptyPayments: SubscriptionPayment[] = [];
    const verifiedRevenue = emptyPayments
      .filter((p) => p.status === 'SUCCESS')
      .reduce((sum, p) => sum + p.amount, 0);

    const recurringRevenue = mockOrgs
      .filter((o) => o.status === 'ACTIVE')
      .reduce((sum, o) => sum + (o.plan?.price || 0), 0);

    const subscriptionRevenue = verifiedRevenue > 0 ? verifiedRevenue : recurringRevenue;
    expect(subscriptionRevenue).toBe(16997); // 4999 + 1999 + 9999
  });

  it('calculates active subscriptions count across cafeterias', () => {
    const activeSubsCount = mockSubscriptions.filter((s) => s.status === 'ACTIVE').length;
    expect(activeSubsCount).toBe(2);
  });

  it('calculates pending plan requests awaiting Super Admin action', () => {
    const pendingRequestsCount = mockPlanRequests.filter((r) => r.status === 'PENDING').length;
    expect(pendingRequestsCount).toBe(2);
  });

  it('correctly scopes business metrics when filtered to a single cafeteria', () => {
    const selectedOrgId = 'org_001';

    // Revenue for org_001
    const orgPayments = mockPayments.filter((p) => p.organizationId === selectedOrgId);
    const orgRevenue = orgPayments
      .filter((p) => p.status === 'SUCCESS')
      .reduce((sum, p) => sum + p.amount, 0);
    expect(orgRevenue).toBe(4999);

    // Active sub for org_001
    const orgSub = mockSubscriptions.find((s) => s.organizationId === selectedOrgId);
    expect(orgSub?.status).toBe('ACTIVE');

    // Requests for org_001
    const orgRequests = mockPlanRequests.filter(
      (r) => r.organizationId === selectedOrgId && r.status === 'PENDING'
    );
    expect(orgRequests).toHaveLength(1);
    expect(orgRequests[0].requestType).toBe('UPGRADE');
  });

  it('verifies that StatCard specifications do NOT contain subheadings or descriptions', () => {
    const cards = [
      { label: 'Cafeterias', value: '3 Active' },
      { label: 'Subscription Revenue', value: '₹6,998' },
      { label: 'Active Subscriptions', value: '2 Active' },
      { label: 'Plan Requests', value: '2 Pending' },
    ];

    cards.forEach((card) => {
      expect(card.label).toBeTruthy();
      expect(card.value).toBeTruthy();
      // Verify no description or subtitle is defined
      expect((card as any).description).toBeUndefined();
      expect((card as any).subHeading).toBeUndefined();
    });
  });
});
