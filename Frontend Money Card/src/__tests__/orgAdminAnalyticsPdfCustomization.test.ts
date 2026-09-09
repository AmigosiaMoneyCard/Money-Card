import { describe, it, expect } from 'vitest';
import {
  buildOrgAnalyticsJsPdf,
  generateAnalyticsPdfBlob,
  type GenerateOrgPdfOptions,
} from '../features/analytics/analyticsPdfExport';
import type { AnalyticsOverview, Branch } from '../types';

describe('Organization Analytics - Option-Wise PDF Customization', () => {
  const mockAnalytics: AnalyticsOverview = {
    totalTransactions: 320,
    totalRefundVolume: 1200,
    totalRechargeVolume: 35000,
    totalPurchaseVolume: 19000,
    activeSessionsCount: 45,
    activeCardsCount: 50,
    lowStockItemsCount: 2,
    zeroBalanceActiveCardsCount: 5,
    closedCardsCount: 150,
    activeCardsRechargeCount: 88,
    reRechargedCardsCount: 32,
    branchPerformance: [
      {
        branchId: 'b1',
        branchName: 'Downtown Cafeteria',
        status: 'ACTIVE',
        totalRevenue: 30000,
        transactionCount: 180,
        purchaseVolume: 11000,
        purchaseCount: 100,
        rechargeVolume: 19000,
        rechargeCount: 80,
        cardRechargeVolume: 12000,
        cardRechargeCount: 50,
        upiRechargeVolume: 7000,
        upiRechargeCount: 30,
        refundCount: 0,
        refundVolume: 0,
        sessionCount: 105,
        activeSessionsCount: 25,
        settledSessionsCount: 80,
        avgTransactionValue: 166.6,
        avgPurchaseValue: 110,
        productsSoldCount: 220,
        inventoryItemCount: 40,
        lowStockItemCount: 2,
      },
      {
        branchId: 'b2',
        branchName: 'Uptown Bistro',
        status: 'ACTIVE',
        totalRevenue: 24000,
        transactionCount: 140,
        purchaseVolume: 8000,
        purchaseCount: 70,
        rechargeVolume: 16000,
        rechargeCount: 70,
        cardRechargeVolume: 10000,
        cardRechargeCount: 45,
        upiRechargeVolume: 6000,
        upiRechargeCount: 25,
        refundCount: 0,
        refundVolume: 0,
        sessionCount: 90,
        activeSessionsCount: 20,
        settledSessionsCount: 70,
        avgTransactionValue: 171.4,
        avgPurchaseValue: 114.2,
        productsSoldCount: 190,
        inventoryItemCount: 35,
        lowStockItemCount: 0,
      },
    ],
    staffPerformance: [
      {
        staffId: 'st_1',
        staffName: 'Alice Operator',
        staffEmail: 'alice@cafe.com',
        role: 'STAFF',
        status: 'ACTIVE',
        branchId: 'b1',
        branchName: 'Downtown Cafeteria',
        cardsActivatedCount: 12,
        cardsSettledCount: 8,
        cardRechargeVolume: 15000,
        cardRechargeCount: 25,
        rechargeVolume: 15000,
        rechargeCount: 25,
        upiRechargeVolume: 0,
        upiRechargeCount: 0,
        purchaseVolume: 9000,
        purchaseCount: 40,
        refundVolume: 0,
        refundCount: 0,
        totalTransactionsCount: 65,
        totalVolumeHandled: 24000,
        activities: [],
      },
    ],
  };

  const mockBranches: Branch[] = [
    {
      id: 'b1',
      name: 'Downtown Cafeteria',
      organizationId: 'org_001',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const baseOptions: GenerateOrgPdfOptions = {
    analytics: mockAnalytics,
    branches: mockBranches,
    selectedBranchName: 'All Counters',
    dateRangeLabel: 'This Month',
    organizationName: 'Acme Dining Group',
  };

  it('generates full report when all sections are enabled by default', () => {
    const doc = buildOrgAnalyticsJsPdf(baseOptions);
    expect(doc).toBeDefined();
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  it('generates customized report with only Executive KPIs enabled', () => {
    const doc = buildOrgAnalyticsJsPdf({
      ...baseOptions,
      sections: {
        includeExecutiveKpis: true,
        includeBranchComparison: false,
        includeStaffPerformance: false,
      },
    });
    expect(doc).toBeDefined();
    expect(doc.getNumberOfPages()).toBe(1);
  });

  it('generates customized report with only Counter Comparison enabled', () => {
    const doc = buildOrgAnalyticsJsPdf({
      ...baseOptions,
      sections: {
        includeExecutiveKpis: false,
        includeBranchComparison: true,
        includeStaffPerformance: false,
      },
    });
    expect(doc).toBeDefined();
    expect(doc.getNumberOfPages()).toBe(1);
  });

  it('generates customized report with only Staff Performance enabled', () => {
    const doc = buildOrgAnalyticsJsPdf({
      ...baseOptions,
      sections: {
        includeExecutiveKpis: false,
        includeBranchComparison: false,
        includeStaffPerformance: true,
      },
    });
    expect(doc).toBeDefined();
    expect(doc.getNumberOfPages()).toBe(1);
  });

  it('renders clean notice when no sections are enabled (empty state)', () => {
    const doc = buildOrgAnalyticsJsPdf({
      ...baseOptions,
      sections: {
        includeExecutiveKpis: false,
        includeBranchComparison: false,
        includeStaffPerformance: false,
      },
    });
    expect(doc).toBeDefined();
    expect(doc.getNumberOfPages()).toBe(1);
  });

  it('generateAnalyticsPdfBlob generates valid PDF blob', () => {
    const blob = generateAnalyticsPdfBlob({
      ...baseOptions,
      sections: {
        includeExecutiveKpis: true,
        includeBranchComparison: true,
        includeStaffPerformance: false,
      },
    });
    expect(blob).toBeDefined();
    expect(blob.size).toBeGreaterThan(0);
    expect(blob.type).toBe('application/pdf');
  });
});
