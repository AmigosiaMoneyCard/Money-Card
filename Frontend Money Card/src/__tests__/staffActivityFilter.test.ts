import { describe, it, expect } from 'vitest';
import {
  filterStaffActivities,
  calculateScopedStaffMetrics,
} from '../features/analytics/staffActivityFilter';
import type { StaffActivityItem } from '@/types';

describe('Staff Activity Log Filtering by Branch Scope and Time Window', () => {
  const sampleActivities: StaffActivityItem[] = [
    {
      id: 'act_1',
      type: 'CARD_ACTIVATION',
      title: 'Card Activated & Issued',
      description: 'Issued card MC-001 to John Doe',
      cardNumber: 'MC-001',
      customerName: 'John Doe',
      customerPhone: '9876543210',
      branchId: 'branch_main',
      branchName: 'Main Cafeteria',
      timestamp: '2026-09-01T10:00:00.000Z',
      amount: 500,
    },
    {
      id: 'act_2',
      type: 'RECHARGE_CASH',
      title: 'Cash / Card POS Recharge',
      description: 'Deposited 1000 onto card balance',
      cardNumber: 'MC-001',
      customerName: 'John Doe',
      customerPhone: '9876543210',
      branchId: 'branch_main',
      branchName: 'Main Cafeteria',
      timestamp: '2026-09-02T11:30:00.000Z',
      amount: 1000,
    },
    {
      id: 'act_3',
      type: 'RECHARGE_UPI',
      title: 'UPI QR Recharge',
      description: 'Deposited 300 onto card balance',
      cardNumber: 'MC-002',
      customerName: 'Alice Smith',
      customerPhone: '9876543211',
      branchId: 'branch_south',
      branchName: 'South Campus Cafeteria',
      timestamp: '2026-09-03T12:00:00.000Z',
      amount: 300,
    },
    {
      id: 'act_4',
      type: 'PURCHASE',
      title: 'POS Purchase Processed',
      description: 'Billed lunch combo',
      cardNumber: 'MC-001',
      customerName: 'John Doe',
      customerPhone: '9876543210',
      branchId: 'branch_main',
      branchName: 'Main Cafeteria',
      timestamp: '2026-09-05T13:15:00.000Z',
      amount: 250,
    },
    {
      id: 'act_5',
      type: 'CARD_SETTLEMENT',
      title: 'Card Settled & Returned',
      description: 'Settled card MC-002 and refunded deposit',
      cardNumber: 'MC-002',
      customerName: 'Alice Smith',
      customerPhone: '9876543211',
      branchId: 'branch_south',
      branchName: 'South Campus Cafeteria',
      timestamp: '2026-09-07T16:45:00.000Z',
      amount: 150,
    },
    {
      id: 'act_6',
      type: 'REFUND',
      title: 'Customer Refund Processed',
      description: 'Cancelled transaction item refund',
      cardNumber: 'MC-001',
      customerName: 'John Doe',
      customerPhone: '9876543210',
      branchId: 'branch_main',
      branchName: 'Main Cafeteria',
      timestamp: '2026-09-08T09:00:00.000Z',
      amount: 50,
    },
  ];

  describe('Branch Scope Filtering', () => {
    it('returns all activities when branchFilter is ALL', () => {
      const result = filterStaffActivities({
        activities: sampleActivities,
        branchFilter: 'ALL',
      });
      expect(result).toHaveLength(6);
    });

    it('filters activities strictly by branchId when specified', () => {
      const mainBranchResult = filterStaffActivities({
        activities: sampleActivities,
        branchFilter: 'branch_main',
        branchName: 'Main Cafeteria',
      });
      expect(mainBranchResult).toHaveLength(4);
      expect(mainBranchResult.every((a) => a.branchId === 'branch_main')).toBe(true);

      const southBranchResult = filterStaffActivities({
        activities: sampleActivities,
        branchFilter: 'branch_south',
        branchName: 'South Campus Cafeteria',
      });
      expect(southBranchResult).toHaveLength(2);
      expect(southBranchResult.every((a) => a.branchId === 'branch_south')).toBe(true);
    });

    it('matches by branchName fallback when activity branchId is missing', () => {
      const activitiesWithOnlyNames: StaffActivityItem[] = [
        {
          id: 'act_x',
          type: 'CARD_ACTIVATION',
          title: 'Activation',
          description: 'Issued card',
          branchName: 'Main Cafeteria',
          timestamp: '2026-09-02T10:00:00.000Z',
        },
        {
          id: 'act_y',
          type: 'CARD_ACTIVATION',
          title: 'Activation',
          description: 'Issued card',
          branchName: 'North Kiosk',
          timestamp: '2026-09-02T10:00:00.000Z',
        },
      ];

      const result = filterStaffActivities({
        activities: activitiesWithOnlyNames,
        branchFilter: 'branch_main_id',
        branchName: 'Main Cafeteria',
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('act_x');
    });
  });

  describe('Time Window Filtering', () => {
    it('filters activities within date range [2026-09-01, 2026-09-03]', () => {
      const result = filterStaffActivities({
        activities: sampleActivities,
        branchFilter: 'ALL',
        startDate: '2026-09-01',
        endDate: '2026-09-03',
      });
      // act_1 (Sep 1), act_2 (Sep 2), act_3 (Sep 3)
      expect(result).toHaveLength(3);
      expect(result.map((a) => a.id)).toEqual(['act_1', 'act_2', 'act_3']);
    });

    it('filters activities within single day window [2026-09-05, 2026-09-05]', () => {
      const result = filterStaffActivities({
        activities: sampleActivities,
        branchFilter: 'ALL',
        startDate: '2026-09-05',
        endDate: '2026-09-05',
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('act_4');
    });

    it('returns empty array if date range has no matching activities', () => {
      const result = filterStaffActivities({
        activities: sampleActivities,
        branchFilter: 'ALL',
        startDate: '2026-08-01',
        endDate: '2026-08-15',
      });
      expect(result).toHaveLength(0);
    });
  });

  describe('Combined Branch Scope and Time Window Filtering', () => {
    it('filters activities matching BOTH branch_main AND date window [2026-09-01, 2026-09-04]', () => {
      const result = filterStaffActivities({
        activities: sampleActivities,
        branchFilter: 'branch_main',
        branchName: 'Main Cafeteria',
        startDate: '2026-09-01',
        endDate: '2026-09-04',
      });
      // act_1 (Sep 1, main) & act_2 (Sep 2, main) match. act_3 is south branch. act_4, 5, 6 are later dates.
      expect(result).toHaveLength(2);
      expect(result.map((a) => a.id)).toEqual(['act_1', 'act_2']);
    });

    it('combines branch scope, time window, activity type filter and search query', () => {
      const result = filterStaffActivities({
        activities: sampleActivities,
        branchFilter: 'branch_main',
        startDate: '2026-09-01',
        endDate: '2026-09-10',
        typeFilter: 'PURCHASE',
        searchQuery: 'John',
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('act_4');
    });
  });

  describe('Scoped Staff Metrics Calculation', () => {
    it('accurately calculates KPI metrics for scoped activities', () => {
      const mainActivities = filterStaffActivities({
        activities: sampleActivities,
        branchFilter: 'branch_main',
      });
      const metrics = calculateScopedStaffMetrics(mainActivities);

      // mainActivities has:
      // act_1: CARD_ACTIVATION, amount: 500
      // act_2: RECHARGE_CASH, amount: 1000
      // act_4: PURCHASE, amount: 250
      // act_6: REFUND, amount: 50
      expect(metrics.cardsActivatedCount).toBe(1);
      expect(metrics.cardsSettledCount).toBe(0);
      expect(metrics.cardRechargeVolume).toBe(1000);
      expect(metrics.upiRechargeVolume).toBe(0);
      expect(metrics.rechargeVolume).toBe(1000);
      expect(metrics.purchaseVolume).toBe(250);
      expect(metrics.refundVolume).toBe(50);
      expect(metrics.totalVolumeHandled).toBe(1300); // 250 + 1000 + 50
    });

    it('returns zeroes when activity list is empty', () => {
      const metrics = calculateScopedStaffMetrics([]);
      expect(metrics.cardsActivatedCount).toBe(0);
      expect(metrics.cardsSettledCount).toBe(0);
      expect(metrics.totalVolumeHandled).toBe(0);
      expect(metrics.rechargeVolume).toBe(0);
    });
  });

  describe('Org Admin Analytics Date Presets (getPresetDates)', () => {
    it('calculates yesterday preset accurately', async () => {
      const { getPresetDates } = await import('@/features/analytics/OrgAdminAnalyticsView');
      const dates = getPresetDates('yesterday');

      const yest = new Date();
      yest.setDate(yest.getDate() - 1);
      const expectedYest = yest.toISOString().split('T')[0];

      expect(dates.startDate).toBe(expectedYest);
      expect(dates.endDate).toBe(expectedYest);
    }, 15000);

    it('calculates today, thisMonth and range presets accurately', async () => {
      const { getPresetDates } = await import('@/features/analytics/OrgAdminAnalyticsView');
      const todayDates = getPresetDates('today');
      const thisMonthDates = getPresetDates('thisMonth');

      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const startOfMonthStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

      expect(todayDates.startDate).toBe(todayStr);
      expect(todayDates.endDate).toBe(todayStr);
      expect(thisMonthDates.startDate).toBe(startOfMonthStr);
      expect(thisMonthDates.endDate).toBe(todayStr);
    });
  });
});
