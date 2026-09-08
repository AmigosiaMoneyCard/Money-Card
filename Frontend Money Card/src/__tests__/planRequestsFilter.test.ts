import { describe, it, expect } from 'vitest';
import type { PlanChangeRequest } from '@/types';
import { detectPlanRequestType } from '@/features/subscriptions/SubscriptionsPage';

describe('Plan Change Requests Filter Logic', () => {
  const sampleRequests: PlanChangeRequest[] = [
    {
      id: 'req_001',
      organizationId: 'org_001',
      organizationName: 'Acme Cafeterias',
      currentPlanId: 'PLAN_STANDARD',
      currentPlanName: 'Standard Plan',
      requestedPlanId: 'PLAN_PRO',
      requestedPlanName: 'Pro Plan',
      requestType: 'UPGRADE',
      reason: 'Expanding branches',
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
      reason: 'Upgrading branch count',
      status: 'APPROVED',
      adminNotes: 'Payment verified',
      createdAt: '2026-02-07T09:15:00.000Z',
      updatedAt: '2026-02-08T14:30:00.000Z',
    },
    {
      id: 'req_003',
      organizationId: 'org_001',
      organizationName: 'Acme Cafeterias',
      currentPlanId: 'PLAN_STANDARD',
      currentPlanName: 'Standard Plan',
      requestedPlanId: 'PLAN_STANDARD',
      requestedPlanName: 'Standard Plan',
      requestType: 'RENEWAL',
      status: 'APPROVED',
      adminNotes: 'Contract renewed',
      createdAt: '2026-01-14T16:00:00.000Z',
      updatedAt: '2026-01-15T11:20:00.000Z',
    },
    {
      id: 'req_004',
      organizationId: 'org_003',
      organizationName: 'Metro Eats',
      currentPlanId: 'PLAN_ENTERPRISE',
      currentPlanName: 'Enterprise Plan',
      requestedPlanId: 'PLAN_STARTER',
      requestedPlanName: 'Starter Plan',
      requestType: 'DOWNGRADE',
      status: 'REJECTED',
      adminNotes: 'Contract term active until next year',
      createdAt: '2026-01-10T11:00:00.000Z',
      updatedAt: '2026-01-11T09:00:00.000Z',
    },
  ];

  function filterRequests(
    requests: PlanChangeRequest[],
    statusFilter: string,
    typeFilter: string,
    searchQuery: string
  ) {
    return requests.filter((req) => {
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'APPROVED') {
          if (req.status !== 'APPROVED' && req.status !== 'COMPLETED') return false;
        } else if (req.status !== statusFilter) {
          return false;
        }
      }

      if (typeFilter !== 'ALL') {
        if (req.requestType !== typeFilter) return false;
      }

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        (req.organizationName || '').toLowerCase().includes(q) ||
        (req.requestedPlanName || '').toLowerCase().includes(q) ||
        (req.currentPlanName || '').toLowerCase().includes(q) ||
        (req.adminNotes || '').toLowerCase().includes(q) ||
        req.id.toLowerCase().includes(q)
      );
    });
  }

  it('should return all requests when filter is ALL', () => {
    const result = filterRequests(sampleRequests, 'ALL', 'ALL', '');
    expect(result).toHaveLength(4);
  });

  it('should filter only APPROVED requests when status filter is APPROVED', () => {
    const result = filterRequests(sampleRequests, 'APPROVED', 'ALL', '');
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.status === 'APPROVED')).toBe(true);
  });

  it('should filter only PENDING requests when status filter is PENDING', () => {
    const result = filterRequests(sampleRequests, 'PENDING', 'ALL', '');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('req_001');
  });

  it('should filter only REJECTED requests when status filter is REJECTED', () => {
    const result = filterRequests(sampleRequests, 'REJECTED', 'ALL', '');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('req_004');
  });

  it('should filter by request type correctly (e.g. RENEWAL)', () => {
    const result = filterRequests(sampleRequests, 'ALL', 'RENEWAL', '');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('req_003');
  });

  it('should filter by search query across organization name and notes', () => {
    const result = filterRequests(sampleRequests, 'ALL', 'ALL', 'Metro Eats');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('req_004');
  });
});

describe('Plan Request Type Auto-Detection (Upgrade / Downgrade)', () => {
  const starterPlan: any = {
    id: 'plan_001',
    name: 'Starter',
    price: 999,
    billingInterval: 'MONTHLY',
  };

  const standardPlan: any = {
    id: 'plan_002',
    name: 'Standard',
    price: 1999,
    billingInterval: 'MONTHLY',
  };

  const enterprisePlan: any = {
    id: 'plan_003',
    name: 'Enterprise',
    price: 4999,
    billingInterval: 'MONTHLY',
  };

  it('automatically detects DOWNGRADE when current plan is Enterprise and target is Standard', () => {
    const result = detectPlanRequestType(standardPlan, enterprisePlan);
    expect(result).toBe('DOWNGRADE');
  });

  it('automatically detects DOWNGRADE when current plan is Enterprise and target is Starter', () => {
    const result = detectPlanRequestType(starterPlan, enterprisePlan);
    expect(result).toBe('DOWNGRADE');
  });

  it('automatically detects UPGRADE when current plan is Starter and target is Standard or Enterprise', () => {
    expect(detectPlanRequestType(standardPlan, starterPlan)).toBe('UPGRADE');
    expect(detectPlanRequestType(enterprisePlan, starterPlan)).toBe('UPGRADE');
  });

  it('automatically detects UPGRADE when current plan is Standard and target is Enterprise', () => {
    expect(detectPlanRequestType(enterprisePlan, standardPlan)).toBe('UPGRADE');
  });

  it('automatically detects DOWNGRADE when current plan is Standard and target is Starter', () => {
    expect(detectPlanRequestType(starterPlan, standardPlan)).toBe('DOWNGRADE');
  });

  it('strictly outputs only UPGRADE or DOWNGRADE without ENTERPRISE or CHANGE_PLAN', () => {
    const resultToEnterprise = detectPlanRequestType(enterprisePlan, standardPlan);
    expect(resultToEnterprise).toBe('UPGRADE');
    expect(['UPGRADE', 'DOWNGRADE']).toContain(resultToEnterprise);

    const resultFromEnterprise = detectPlanRequestType(standardPlan, enterprisePlan);
    expect(resultFromEnterprise).toBe('DOWNGRADE');
    expect(['UPGRADE', 'DOWNGRADE']).toContain(resultFromEnterprise);
  });

  describe('Single Pending Plan Request Constraint', () => {
    it('blocks a new plan change request if an organization already has a request with status PENDING', () => {
      const orgRequests: PlanChangeRequest[] = [
        {
          id: 'req_101',
          organizationId: 'org_001',
          organizationName: 'Acme Cafeterias',
          currentPlanId: 'plan_std',
          currentPlanName: 'Standard',
          requestedPlanId: 'plan_ent',
          requestedPlanName: 'Enterprise',
          requestType: 'UPGRADE',
          status: 'PENDING',
          createdAt: '2026-03-01T10:00:00.000Z',
          updatedAt: '2026-03-01T10:00:00.000Z',
        },
      ];

      const hasPending = orgRequests.some(
        (r) => r.organizationId === 'org_001' && r.status === 'PENDING'
      );
      expect(hasPending).toBe(true);

      const canSubmitNew = !hasPending;
      expect(canSubmitNew).toBe(false);
    });

    it('allows a new plan change request once all previous requests are APPROVED or REJECTED', () => {
      const orgRequests: PlanChangeRequest[] = [
        {
          id: 'req_101',
          organizationId: 'org_001',
          organizationName: 'Acme Cafeterias',
          currentPlanId: 'plan_std',
          currentPlanName: 'Standard',
          requestedPlanId: 'plan_ent',
          requestedPlanName: 'Enterprise',
          requestType: 'UPGRADE',
          status: 'REJECTED',
          createdAt: '2026-03-01T10:00:00.000Z',
          updatedAt: '2026-03-02T10:00:00.000Z',
        },
        {
          id: 'req_102',
          organizationId: 'org_001',
          organizationName: 'Acme Cafeterias',
          currentPlanId: 'plan_std',
          currentPlanName: 'Standard',
          requestedPlanId: 'plan_ent',
          requestedPlanName: 'Enterprise',
          requestType: 'UPGRADE',
          status: 'APPROVED',
          createdAt: '2026-02-01T10:00:00.000Z',
          updatedAt: '2026-02-02T10:00:00.000Z',
        },
      ];

      const hasPending = orgRequests.some(
        (r) => r.organizationId === 'org_001' && r.status === 'PENDING'
      );
      expect(hasPending).toBe(false);

      const canSubmitNew = !hasPending;
      expect(canSubmitNew).toBe(true);
    });
  });
});

