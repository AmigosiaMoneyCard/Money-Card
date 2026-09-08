import { describe, it, expect } from 'vitest';
import {
  buildPlatformAnalyticsJsPdf,
  generatePlatformAnalyticsPdfBlob,
  type GeneratePlatformAnalyticsPdfParams,
} from '../features/analytics/analyticsPdfExport';

describe('Super Admin Analytics - Option-Wise PDF Customization', () => {
  const baseParams: GeneratePlatformAnalyticsPdfParams = {
    reportDateRange: 'All Recorded History',
    selectedOrgFilter: 'All Platform Organizations',
    totalOrganizations: 5,
    activeSubscriptions: 4,
    totalGatewayRevenue: 48000,
    pendingRequestsCount: 2,
    totalPurchaseVolume: 85000,
    totalRechargeVolume: 110000,
    totalRefundVolume: 2500,
    totalTransactions: 1250,
    activeSessionsCount: 65,
    lowStockItemsCount: 4,
    organizations: [
      {
        id: 'org_1',
        name: 'Metro Food Court',
        status: 'ACTIVE',
        planName: 'Enterprise',
        branchCount: 3,
        branchLimit: 5,
        staffCount: 18,
        staffLimit: 30,
        cardCount: 450,
        cardLimit: 1000,
      },
      {
        id: 'org_2',
        name: 'Skyline Bistro',
        status: 'ACTIVE',
        planName: 'Pro',
        branchCount: 2,
        branchLimit: 3,
        staffCount: 10,
        staffLimit: 15,
        cardCount: 220,
        cardLimit: 500,
      },
    ],
    branches: [
      {
        id: 'br_1',
        name: 'Main Food Hall',
        orgName: 'Metro Food Court',
        status: 'ACTIVE',
        transactionCount: 420,
        purchaseCount: 280,
        rechargeCount: 140,
        totalRevenue: 38000,
        sessionCount: 95,
        productsSoldCount: 320,
      },
    ],
    products: [
      {
        id: 'p1',
        name: 'Combo Lunch Meal',
        category: 'Meals',
        quantitySold: 210,
        revenue: 31500,
        stockStatus: 'NORMAL',
      },
    ],
    plans: [
      {
        id: 'plan_1',
        name: 'Enterprise',
        price: 9999,
        billingInterval: 'MONTHLY',
        branchLimit: 10,
        staffLimit: 50,
        cardLimit: 5000,
        tenantCount: 3,
      },
    ],
  };

  it('generates full 3-page platform report when all sections are enabled by default', () => {
    const doc = buildPlatformAnalyticsJsPdf(baseParams);
    expect(doc).toBeDefined();
    expect(doc.getNumberOfPages()).toBe(3);
  });

  it('generates customized 1-page report with only Platform KPIs enabled', () => {
    const doc = buildPlatformAnalyticsJsPdf({
      ...baseParams,
      sections: {
        includePlatformKpis: true,
        includeOrgsAndBranches: false,
        includeProductsAndPlans: false,
      },
    });
    expect(doc).toBeDefined();
    expect(doc.getNumberOfPages()).toBe(1);
  });

  it('generates customized 1-page report with only Organizations & Branches enabled', () => {
    const doc = buildPlatformAnalyticsJsPdf({
      ...baseParams,
      sections: {
        includePlatformKpis: false,
        includeOrgsAndBranches: true,
        includeProductsAndPlans: false,
      },
    });
    expect(doc).toBeDefined();
    expect(doc.getNumberOfPages()).toBe(1);
  });

  it('generates customized 1-page report with only Products & Plans enabled', () => {
    const doc = buildPlatformAnalyticsJsPdf({
      ...baseParams,
      sections: {
        includePlatformKpis: false,
        includeOrgsAndBranches: false,
        includeProductsAndPlans: true,
      },
    });
    expect(doc).toBeDefined();
    expect(doc.getNumberOfPages()).toBe(1);
  });

  it('generates customized 2-page report with KPIs and Organizations enabled', () => {
    const doc = buildPlatformAnalyticsJsPdf({
      ...baseParams,
      sections: {
        includePlatformKpis: true,
        includeOrgsAndBranches: true,
        includeProductsAndPlans: false,
      },
    });
    expect(doc).toBeDefined();
    expect(doc.getNumberOfPages()).toBe(2);
  });

  it('renders clean notice when no sections are enabled (empty state)', () => {
    const doc = buildPlatformAnalyticsJsPdf({
      ...baseParams,
      sections: {
        includePlatformKpis: false,
        includeOrgsAndBranches: false,
        includeProductsAndPlans: false,
      },
    });
    expect(doc).toBeDefined();
    expect(doc.getNumberOfPages()).toBe(1);
  });

  it('generatePlatformAnalyticsPdfBlob produces a valid application/pdf blob', () => {
    const blob = generatePlatformAnalyticsPdfBlob({
      ...baseParams,
      sections: {
        includePlatformKpis: true,
        includeOrgsAndBranches: false,
        includeProductsAndPlans: false,
      },
    });
    expect(blob).toBeDefined();
    expect(blob.size).toBeGreaterThan(0);
    expect(blob.type).toBe('application/pdf');
  });

  describe('Individual Section-by-Section Customization (7 Distinct Sections)', () => {
    const allDisabled = {
      includePlatformKpis: false,
      includeFinancialSummary: false,
      includeTenantOrgs: false,
      includeBranchPerformance: false,
      includeProductDemand: false,
      includePeakTraffic: false,
      includeSubscriptionPlans: false,
    };

    it('renders only Section 1 (Platform Overview)', () => {
      const doc = buildPlatformAnalyticsJsPdf({
        ...baseParams,
        sections: { ...allDisabled, includePlatformKpis: true },
      });
      expect(doc.getNumberOfPages()).toBe(1);
    });

    it('renders only Section 2 (Financial & Revenue)', () => {
      const doc = buildPlatformAnalyticsJsPdf({
        ...baseParams,
        sections: { ...allDisabled, includeFinancialSummary: true },
      });
      expect(doc.getNumberOfPages()).toBe(1);
    });

    it('renders only Section 3 (Organizations & Usage)', () => {
      const doc = buildPlatformAnalyticsJsPdf({
        ...baseParams,
        sections: { ...allDisabled, includeTenantOrgs: true },
      });
      expect(doc.getNumberOfPages()).toBe(1);
    });

    it('renders only Section 4 (Branch Performance)', () => {
      const doc = buildPlatformAnalyticsJsPdf({
        ...baseParams,
        sections: { ...allDisabled, includeBranchPerformance: true },
      });
      expect(doc.getNumberOfPages()).toBe(1);
    });

    it('renders only Section 5 (Top Selling Products)', () => {
      const doc = buildPlatformAnalyticsJsPdf({
        ...baseParams,
        sections: { ...allDisabled, includeProductDemand: true },
      });
      expect(doc.getNumberOfPages()).toBe(1);
    });

    it('renders only Section 6 (Peak Hours & Traffic)', () => {
      const doc = buildPlatformAnalyticsJsPdf({
        ...baseParams,
        sections: { ...allDisabled, includePeakTraffic: true },
      });
      expect(doc.getNumberOfPages()).toBe(1);
    });

    it('renders only Section 7 (Subscription Plans)', () => {
      const doc = buildPlatformAnalyticsJsPdf({
        ...baseParams,
        sections: { ...allDisabled, includeSubscriptionPlans: true },
      });
      expect(doc.getNumberOfPages()).toBe(1);
    });

    it('renders cross-page selection accurately (e.g. Section 2 + Section 4 + Section 6)', () => {
      const doc = buildPlatformAnalyticsJsPdf({
        ...baseParams,
        sections: {
          ...allDisabled,
          includeFinancialSummary: true,
          includeBranchPerformance: true,
          includePeakTraffic: true,
        },
      });
      expect(doc.getNumberOfPages()).toBe(3);
    });
  });
});
