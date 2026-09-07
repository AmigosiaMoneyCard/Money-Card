import { describe, it, expect } from 'vitest';
import type { PlanChangeRequest } from '@/types';

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
