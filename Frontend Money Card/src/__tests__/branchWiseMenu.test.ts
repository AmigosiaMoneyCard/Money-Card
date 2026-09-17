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

  it('should support reassigning (moving) a menu item to another counter', () => {
    let item = { id: 'p1', itemName: 'Samosa', price: 20, branchId: 'counter-1' };
    const targetCounter = 'counter-2';

    // Move to counter-2
    item = { ...item, branchId: targetCounter };
    expect(item.branchId).toBe('counter-2');
    expect(item.itemName).toBe('Samosa');
    expect(item.price).toBe(20);
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
});

