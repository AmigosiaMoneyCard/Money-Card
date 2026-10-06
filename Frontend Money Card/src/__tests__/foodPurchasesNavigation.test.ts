import { describe, it, expect } from 'vitest';
import { NAVIGATION_ITEMS } from '@/config/navigation';
import type { FoodPurchaseRecord } from '@/types';

describe('Food Purchases Navigation & Page Isolation Tests', () => {
  it('should verify that Food Purchases is present for ORG_ADMIN as the second item under Dashboard', () => {
    const orgAdminItems = NAVIGATION_ITEMS.filter((item) =>
      item.roles.includes('ORG_ADMIN'),
    );
    const purchaseItem = orgAdminItems.find((item) => item.id === 'food-purchases');

    expect(purchaseItem).toBeDefined();
    expect(purchaseItem?.path).toBe('/food-purchases');
    expect(purchaseItem?.label).toBe('Food Purchases');
    expect(purchaseItem?.permission).toBe('VIEW_ANALYTICS');

    // Second item under dashboard
    expect(orgAdminItems[0].id).toBe('dashboard');
    expect(orgAdminItems[1].id).toBe('food-purchases');
  });

  it('should verify that Food Purchases is present for STAFF (Counter Admin) as the second item under Dashboard', () => {
    const staffItems = NAVIGATION_ITEMS.filter((item) =>
      item.roles.includes('STAFF'),
    );
    const purchaseItem = staffItems.find((item) => item.id === 'food-purchases');

    expect(purchaseItem).toBeDefined();
    expect(purchaseItem?.path).toBe('/food-purchases');
    expect(purchaseItem?.label).toBe('Food Purchases');
    expect(purchaseItem?.permission).toBe('VIEW_ANALYTICS');

    // Second item under dashboard
    expect(staffItems[0].id).toBe('dashboard');
    expect(staffItems[1].id).toBe('food-purchases');
  });

  it('should ensure Food Purchases is NOT visible to SUPER_ADMIN', () => {
    const superAdminItems = NAVIGATION_ITEMS.filter((item) =>
      item.roles.includes('SUPER_ADMIN'),
    );
    const purchaseItem = superAdminItems.find((item) => item.id === 'food-purchases');

    expect(purchaseItem).toBeUndefined();
  });

  it('should verify that food-purchases is positioned directly after dashboard in navigation items list', () => {
    const dashboardIndex = NAVIGATION_ITEMS.findIndex((item) => item.id === 'dashboard');
    const foodPurchasesIndex = NAVIGATION_ITEMS.findIndex((item) => item.id === 'food-purchases');

    expect(dashboardIndex).toBe(0);
    expect(foodPurchasesIndex).toBe(1);
  });

  it('should accurately calculate food purchase metrics and cross-counter counts', () => {
    const mockPurchases: FoodPurchaseRecord[] = [
      {
        id: 'ord_1',
        createdAt: '2026-10-05T10:22:00Z',
        sessionCardNumber: 'KD10G378J',
        issuingBranchId: 'branch_1',
        issuingBranchName: 'Counter 1',
        purchasingBranchId: 'branch_1',
        purchasingBranchName: 'Counter 1',
        isCrossCounter: false,
        items: [{ productId: 'p1', productName: 'cb', quantity: 1, unitPrice: 543, subtotal: 543 }],
        totalAmount: 543,
      },
      {
        id: 'ord_2',
        createdAt: '2026-10-05T10:17:00Z',
        sessionCardNumber: 'KD10G378J',
        issuingBranchId: 'branch_1',
        issuingBranchName: 'Counter 1',
        purchasingBranchId: 'branch_2',
        purchasingBranchName: 'Counter 2',
        isCrossCounter: true,
        items: [
          { productId: 'p2', productName: 'avil milk', quantity: 2, unitPrice: 231, subtotal: 462 },
          { productId: 'p1', productName: 'cb', quantity: 1, unitPrice: 543, subtotal: 543 },
        ],
        totalAmount: 1005,
      },
    ];

    const totalRevenue = mockPurchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
    const crossCounterOrders = mockPurchases.filter((p) => p.isCrossCounter).length;
    const totalItemsSold = mockPurchases.reduce(
      (sum, p) => sum + (p.items?.reduce((iSum, it) => iSum + (it.quantity || 1), 0) || 0),
      0,
    );

    expect(totalRevenue).toBe(1548);
    expect(crossCounterOrders).toBe(1);
    expect(totalItemsSold).toBe(4);
  });
});
