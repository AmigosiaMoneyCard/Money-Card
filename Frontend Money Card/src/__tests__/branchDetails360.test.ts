import { describe, it, expect } from 'vitest';

describe('Branch 360° End-to-End Details Tests', () => {
  const mockBranch = {
    id: 'b-main-cafe',
    organizationId: 'org-test',
    name: 'Main Block Cafe',
    status: 'ACTIVE' as const,
    createdAt: '2026-01-15T08:30:00Z',
    updatedAt: '2026-01-15T08:30:00Z',
  };

  const mockStaffList = [
    { id: 's1', name: 'John Doe', email: 'john@maincafe.com', status: 'ACTIVE', assignedBranchIds: ['b-main-cafe'] },
    { id: 's2', name: 'Jane Smith', email: 'jane@maincafe.com', status: 'ACTIVE', assignedBranchIds: ['b-main-cafe', 'b-other'] },
    { id: 's3', name: 'Bob Wilson', email: 'bob@other.com', status: 'ACTIVE', assignedBranchIds: ['b-other'] },
  ];

  const mockProducts = [
    { id: 'p1', branchId: 'b-main-cafe', itemName: 'Veg Club Sandwich', price: 120, category: ['Veg', 'Snack'], status: 'ACTIVE' },
    { id: 'p2', branchId: 'b-main-cafe', itemName: 'Chicken Burger', price: 180, category: ['Non-Veg', 'Lunch'], status: 'ACTIVE' },
    { id: 'p3', branchId: 'b-main-cafe', itemName: 'Cold Brew Coffee', price: 90, category: ['Beverage'], status: 'INACTIVE' },
  ];

  const mockInventory = [
    { id: 'inv1', branchId: 'b-main-cafe', productId: 'p1', quantity: 25 },
    { id: 'inv2', branchId: 'b-main-cafe', productId: 'p2', quantity: 4 }, // Low Stock (< 10)
    { id: 'inv3', branchId: 'b-main-cafe', productId: 'p3', quantity: 0 }, // Out of Stock
  ];

  it('should filter staff assigned specifically to this branch', () => {
    const assignedStaff = mockStaffList.filter(
      (s) => Array.isArray(s.assignedBranchIds) && s.assignedBranchIds.includes(mockBranch.id),
    );

    expect(assignedStaff.length).toBe(2);
    expect(assignedStaff.map((s) => s.name)).toEqual(['John Doe', 'Jane Smith']);
  });

  it('should unify products with their live inventory stock and calculate 360 metrics', () => {
    const unified = mockProducts.map((p) => {
      const inv = mockInventory.find((i) => i.productId === p.id);
      return {
        ...p,
        quantity: inv ? inv.quantity : 0,
      };
    });

    const totalProducts = unified.length;
    const activeProducts = unified.filter((p) => p.status === 'ACTIVE').length;
    const totalStockUnits = unified.reduce((sum, p) => sum + p.quantity, 0);
    const totalValuation = unified.reduce((sum, p) => sum + p.quantity * p.price, 0);
    const lowStockCount = unified.filter((p) => p.quantity > 0 && p.quantity < 10).length;
    const outOfStockCount = unified.filter((p) => p.quantity === 0).length;
    const totalAlerts = lowStockCount + outOfStockCount;

    expect(totalProducts).toBe(3);
    expect(activeProducts).toBe(2);
    expect(totalStockUnits).toBe(29); // 25 + 4 + 0
    expect(totalValuation).toBe(25 * 120 + 4 * 180 + 0 * 90); // 3000 + 720 = 3720
    expect(lowStockCount).toBe(1);
    expect(outOfStockCount).toBe(1);
    expect(totalAlerts).toBe(2);
  });
});
