import { describe, it, expect } from 'vitest';
import {
  buildPeakDemandJsPdf,
  generatePeakDemandPdfBlob,
  type GeneratePeakPdfOptions,
} from '../features/peak/peakPdfExport';
import type { PeakAnalyticsOverview } from '../types';

describe('Peak & Demand Analytics - Option-Wise PDF Customization', () => {
  const mockPeakData: PeakAnalyticsOverview = {
    totalTransactions: 175,
    totalPurchaseVolume: 18500,
    totalRechargeVolume: 4500,
    comparison: {
      peakHoursRange: '12:00 - 14:00',
      peakTransactions: 95,
      offPeakTransactions: 80,
      peakVolume: 12500,
      offPeakVolume: 10500,
      busiestHour: '13:00',
      busiestBranchName: 'Main Cafeteria',
    },
    busiestDay: 'Friday',
    hourlyDistribution: [
      {
        hour: 12,
        hourLabel: '12:00',
        transactionCount: 80,
        purchaseCount: 65,
        rechargeCount: 15,
        sessionCount: 20,
        totalVolume: 10500,
        isPeak: false,
      },
      {
        hour: 13,
        hourLabel: '13:00',
        transactionCount: 95,
        purchaseCount: 78,
        rechargeCount: 17,
        sessionCount: 28,
        totalVolume: 12500,
        isPeak: true,
      },
    ],
    productDemand: [
      {
        productId: 'prod_1',
        productName: 'Veg Thali',
        revenue: 8500,
        quantitySold: 70,
        peakHourQuantity: 50,
        offPeakQuantity: 20,
        stockStatus: 'NORMAL',
        currentStock: 45,
        category: 'Veg, Main Course',
      },
      {
        productId: 'prod_2',
        productName: 'Cold Coffee',
        revenue: 4000,
        quantitySold: 40,
        peakHourQuantity: 28,
        offPeakQuantity: 12,
        stockStatus: 'LOW',
        currentStock: 5,
        category: 'Beverage',
      },
    ],
  };

  const baseOptions: GeneratePeakPdfOptions = {
    data: mockPeakData,
    selectedBranchName: 'Main Cafeteria',
    dateRangeLabel: 'This Month',
    organizationName: 'Money Card Cafeteria',
  };

  it('generates full peak report when all sections are enabled by default', () => {
    const doc = buildPeakDemandJsPdf(baseOptions);
    expect(doc).toBeDefined();
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  it('generates customized report with only Rush KPIs enabled', () => {
    const doc = buildPeakDemandJsPdf({
      ...baseOptions,
      sections: {
        includeRushKpis: true,
        includeTrafficDistribution: false,
        includeFoodDemand: false,
      },
    });
    expect(doc).toBeDefined();
    expect(doc.getNumberOfPages()).toBe(1);
  });

  it('generates customized report with only 24-Hour Traffic enabled', () => {
    const doc = buildPeakDemandJsPdf({
      ...baseOptions,
      sections: {
        includeRushKpis: false,
        includeTrafficDistribution: true,
        includeFoodDemand: false,
      },
    });
    expect(doc).toBeDefined();
    expect(doc.getNumberOfPages()).toBe(1);
  });

  it('generates customized report with only Food Demand enabled', () => {
    const doc = buildPeakDemandJsPdf({
      ...baseOptions,
      sections: {
        includeRushKpis: false,
        includeTrafficDistribution: false,
        includeFoodDemand: true,
      },
    });
    expect(doc).toBeDefined();
    expect(doc.getNumberOfPages()).toBe(1);
  });

  it('renders clean notice when no sections are enabled (empty state)', () => {
    const doc = buildPeakDemandJsPdf({
      ...baseOptions,
      sections: {
        includeRushKpis: false,
        includeTrafficDistribution: false,
        includeFoodDemand: false,
      },
    });
    expect(doc).toBeDefined();
    expect(doc.getNumberOfPages()).toBe(1);
  });

  it('generatePeakDemandPdfBlob produces a valid application/pdf blob', () => {
    const blob = generatePeakDemandPdfBlob({
      ...baseOptions,
      sections: {
        includeRushKpis: true,
        includeTrafficDistribution: true,
        includeFoodDemand: false,
      },
    });
    expect(blob).toBeDefined();
    expect(blob.size).toBeGreaterThan(0);
    expect(blob.type).toBe('application/pdf');
  });
});
