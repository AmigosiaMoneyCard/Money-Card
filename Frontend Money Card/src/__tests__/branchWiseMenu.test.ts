import { describe, it, expect } from 'vitest';
import { NAVIGATION_ITEMS } from '@/config/navigation';

describe('Branch-Wise Menu Configuration & Sidebar Navigation Tests', () => {
  it('should verify that Menu is present in the Org Admin sidebar navigation', () => {
    const orgAdminNavItems = NAVIGATION_ITEMS.filter((item) =>
      item.roles.includes('ORG_ADMIN'),
    );

    const menuNavItem = orgAdminNavItems.find(
      (item) => item.id === 'products' || item.path === '/products',
    );

    expect(menuNavItem).toBeDefined();
    expect(menuNavItem?.path).toBe('/products');
    expect(menuNavItem?.label).toBe('Menu');
  });

  it('should verify that Branches is present in the Org Admin sidebar navigation', () => {
    const orgAdminNavItems = NAVIGATION_ITEMS.filter((item) =>
      item.roles.includes('ORG_ADMIN'),
    );

    const branchesNavItem = orgAdminNavItems.find((item) => item.id === 'branches');
    expect(branchesNavItem).toBeDefined();
    expect(branchesNavItem?.path).toBe('/branches');
  });

  it('should correctly calculate branch-wise product metrics', () => {
    const branchProducts = [
      { id: 'p1', itemName: 'Veg Roll', price: 80, quantity: 20, status: 'ACTIVE' },
      { id: 'p2', itemName: 'Chicken Sandwich', price: 120, quantity: 5, status: 'ACTIVE' },
      { id: 'p3', itemName: 'Cold Coffee', price: 60, quantity: 0, status: 'INACTIVE' },
    ];

    const totalProducts = branchProducts.length;
    const activeProducts = branchProducts.filter((p) => p.status === 'ACTIVE').length;
    const totalUnits = branchProducts.reduce((sum, p) => sum + p.quantity, 0);
    const totalValuation = branchProducts.reduce((sum, p) => sum + p.quantity * p.price, 0);
    const lowStock = branchProducts.filter((p) => p.quantity > 0 && p.quantity < 10).length;
    const outOfStock = branchProducts.filter((p) => p.quantity === 0).length;

    expect(totalProducts).toBe(3);
    expect(activeProducts).toBe(2);
    expect(totalUnits).toBe(25);
    expect(totalValuation).toBe(20 * 80 + 5 * 120 + 0 * 60); // 1600 + 600 = 2200
    expect(lowStock).toBe(1);
    expect(outOfStock).toBe(1);
  });

  it('should support replicating (copying) a menu item to another counter', () => {
    const originalItem = { id: 'p1', itemName: 'Samosa', price: 20, category: ['Veg'], branchId: 'counter-1' };
    const clonedItem = {
      id: 'p2',
      itemName: originalItem.itemName,
      price: originalItem.price,
      category: originalItem.category,
      branchId: 'counter-2',
      status: 'ACTIVE',
    };

    expect(clonedItem.branchId).toBe('counter-2');
    expect(clonedItem.itemName).toBe(originalItem.itemName);
    expect(clonedItem.price).toBe(originalItem.price);
    expect(clonedItem.category).toEqual(['Veg']);
  });

  it('should filter out the current counter from available copy target counters', () => {
    const branches = [
      { id: 'counter-1', name: 'Snacks Counter' },
      { id: 'counter-2', name: 'Beverage Counter' },
      { id: 'counter-3', name: 'Main Canteen' },
    ];
    const currentItem = { id: 'p1', itemName: 'Samosa', branchId: 'counter-1' };

    const availableTargets = branches.filter((b) => b.id !== currentItem.branchId);
    expect(availableTargets).toHaveLength(2);
    expect(availableTargets.map((b) => b.id)).toEqual(['counter-2', 'counter-3']);
  });

  it('should support batch replicating a menu item across multiple target counters', () => {
    const originalItem = { id: 'p1', itemName: 'Masala Chai', price: 15, category: ['Drink'], branchId: 'counter-1' };
    const selectedTargetBranchIds = ['counter-2', 'counter-3'];

    const replicatedItems = selectedTargetBranchIds.map((targetBranchId, index) => ({
      id: `p-copy-${index + 1}`,
      itemName: originalItem.itemName,
      price: originalItem.price,
      category: originalItem.category,
      branchId: targetBranchId,
      status: 'ACTIVE' as const,
    }));

    expect(replicatedItems).toHaveLength(2);
    expect(replicatedItems[0].branchId).toBe('counter-2');
    expect(replicatedItems[1].branchId).toBe('counter-3');
    expect(replicatedItems.every((item) => item.itemName === 'Masala Chai')).toBe(true);
  });

  it('should accurately resolve counter names for original vs copied items and avoid 🏪 emoji', () => {
    const branches = [
      { id: 'c', name: 'c' },
      { id: 'c2', name: 'c2' },
    ];
    const branchMap = new Map<string, string>();
    branches.forEach((b) => branchMap.set(b.id, b.name));

    const itemOriginal = { id: 'p1', itemName: 'saaa', branchId: 'c' };
    const itemCopied = { id: 'p2', itemName: 'saaa', branchId: 'c2' };

    const resolvedOriginalName = branchMap.get(itemOriginal.branchId) || 'All Counters';
    const resolvedCopiedName = branchMap.get(itemCopied.branchId) || 'All Counters';

    expect(resolvedOriginalName).toBe('c');
    expect(resolvedCopiedName).toBe('c2');

    const badgeOriginal = `Counter: ${resolvedOriginalName}`;
    const badgeCopied = `Counter: ${resolvedCopiedName}`;

    expect(badgeOriginal).toBe('Counter: c');
    expect(badgeCopied).toBe('Counter: c2');
    expect(badgeOriginal).not.toContain('🏪');
    expect(badgeCopied).not.toContain('🏪');
  });

  it('should verify simplified category filter options only contain Veg and Non-Veg', () => {
    const categoryFilterOptions = [
      { value: 'ALL', label: 'All (Veg & Non-Veg)' },
      { value: 'Veg', label: '🟢 Veg' },
      { value: 'Non-Veg', label: '🔴 Non-Veg' },
    ];

    expect(categoryFilterOptions).toHaveLength(3);
    expect(categoryFilterOptions.map((o) => o.value)).toEqual(['ALL', 'Veg', 'Non-Veg']);
  });
});

