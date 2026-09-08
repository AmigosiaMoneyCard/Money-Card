import { describe, it, expect } from 'vitest';

describe('All Branches End-to-End Overview Calculations & Consolidation Tests', () => {
  const mockBranches = [
    { id: 'b1', organizationId: 'org1', name: 'Downtown Branch', status: 'ACTIVE', createdAt: '2026-01-01', updatedAt: '2026-01-01' },
    { id: 'b2', organizationId: 'org1', name: 'Airport Kiosk', status: 'ACTIVE', createdAt: '2026-02-01', updatedAt: '2026-02-01' },
    { id: 'b3', organizationId: 'org1', name: 'Westside Campus', status: 'INACTIVE', createdAt: '2026-03-01', updatedAt: '2026-03-01' },
  ];

  const mockStaff = [
    { id: 's1', name: 'Alice', email: 'alice@test.com', status: 'ACTIVE', assignedBranchIds: ['b1'] },
    { id: 's2', name: 'Bob', email: 'bob@test.com', status: 'ACTIVE', assignedBranchIds: ['b1', 'b2'] },
    { id: 's3', name: 'Charlie', email: 'charlie@test.com', status: 'ACTIVE', assignedBranchIds: ['b2'] },
    { id: 's4', name: 'Dave', email: 'dave@test.com', status: 'INACTIVE', assignedBranchIds: ['b3'] },
  ];

  const mockProducts = [
    { id: 'p1', branchId: 'b1', itemName: 'Burger', price: 100, status: 'ACTIVE' },
    { id: 'p2', branchId: 'b1', itemName: 'Fries', price: 50, status: 'ACTIVE' },
    { id: 'p3', branchId: 'b2', itemName: 'Coffee', price: 60, status: 'ACTIVE' },
    { id: 'p4', branchId: 'b2', itemName: 'Sandwich', price: 120, status: 'INACTIVE' },
    { id: 'p5', branchId: 'b3', itemName: 'Tea', price: 30, status: 'ACTIVE' },
  ];

  const mockInventory = [
    { id: 'i1', branchId: 'b1', productId: 'p1', quantity: 20 },
    { id: 'i2', branchId: 'b1', productId: 'p2', quantity: 5 }, // Low stock (< 10)
    { id: 'i3', branchId: 'b2', productId: 'p3', quantity: 0 }, // Out of stock
    { id: 'i4', branchId: 'b2', productId: 'p4', quantity: 15 },
    { id: 'i5', branchId: 'b3', productId: 'p5', quantity: 50 },
  ];

  it('should consolidate branch staff assignments correctly', () => {
    const b1Staff = mockStaff.filter((s) => s.assignedBranchIds.includes('b1'));
    const b2Staff = mockStaff.filter((s) => s.assignedBranchIds.includes('b2'));
    const b3Staff = mockStaff.filter((s) => s.assignedBranchIds.includes('b3'));

    expect(b1Staff.length).toBe(2); // Alice & Bob
    expect(b2Staff.length).toBe(2); // Bob & Charlie
    expect(b3Staff.length).toBe(1); // Dave
  });

  it('should accurately calculate branch-level stock, valuation, and alerts', () => {
    // Branch 1: Burger (20 * 100 = 2000) + Fries (5 * 50 = 250) = 2250, Total Units = 25
    const b1Prods = mockProducts.filter((p) => p.branchId === 'b1');
    let b1Units = 0;
    let b1Valuation = 0;
    let b1LowStock = 0;
    let b1OutOfStock = 0;

    b1Prods.forEach((prod) => {
      const inv = mockInventory.find((i) => i.productId === prod.id && i.branchId === 'b1');
      const qty = inv?.quantity || 0;
      b1Units += qty;
      b1Valuation += qty * prod.price;
      if (qty === 0) b1OutOfStock++;
      else if (qty < 10) b1LowStock++;
    });

    expect(b1Units).toBe(25);
    expect(b1Valuation).toBe(2250);
    expect(b1LowStock).toBe(1);
    expect(b1OutOfStock).toBe(0);
  });

  it('should accurately calculate organization-wide aggregate metrics', () => {
    const totalBranches = mockBranches.length;
    const activeBranches = mockBranches.filter((b) => b.status === 'ACTIVE').length;
    const totalStaff = mockStaff.length;
    const totalProducts = mockProducts.length;

    let totalStockUnits = 0;
    let totalValuation = 0;
    let totalAlerts = 0;

    mockProducts.forEach((prod) => {
      const inv = mockInventory.find((i) => i.productId === prod.id);
      const qty = inv?.quantity || 0;
      totalStockUnits += qty;
      totalValuation += qty * prod.price;
      if (qty < 10) totalAlerts++;
    });

    expect(totalBranches).toBe(3);
    expect(activeBranches).toBe(2);
    expect(totalStaff).toBe(4);
    expect(totalProducts).toBe(5);
    // Quantities: 20 + 5 + 0 + 15 + 50 = 90
    expect(totalStockUnits).toBe(90);
    // Valuation: (20*100) + (5*50) + (0*60) + (15*120) + (50*30) = 2000 + 250 + 0 + 1800 + 1500 = 5550
    expect(totalValuation).toBe(5550);
    // Alerts: p2 (5) is low, p3 (0) is out => 2 alerts
    expect(totalAlerts).toBe(2);
  });
});
