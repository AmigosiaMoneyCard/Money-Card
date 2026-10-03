import { describe, it, expect } from 'vitest';
import { TransactionType, SessionStatus, CardStatus } from '@prisma/client';

describe('Cross-Counter Wallet Purchase & Return Guard Logic', () => {
  interface MockSession {
    id: string;
    organizationId: string;
    branchId: string; // Issuing Counter
    cardId: string;
    balance: number;
    status: SessionStatus;
    card?: {
      id: string;
      status: CardStatus;
      physicalCardNumber?: string;
    };
  }

  interface MockStaffUser {
    id: string;
    role: 'STAFF' | 'ORG_ADMIN' | 'SUPER_ADMIN';
    organizationId: string;
    assignedBranchIds: string[];
  }

  interface MockProduct {
    id: string;
    itemName: string;
    price: number;
    organizationId: string;
  }

  // Emulates the updated purchaseSession logic
  function evaluatePurchaseSession(
    session: MockSession,
    user: MockStaffUser,
    items: Array<{ productId: string; quantity: number }>,
    products: MockProduct[],
    requestedBranchId?: string,
  ): {
    success: boolean;
    error?: string;
    effectiveBranchId?: string;
    totalCost?: number;
    balanceAfter?: number;
    isCrossCounter?: boolean;
    detailedItems?: any[];
  } {
    if (session.status !== SessionStatus.ACTIVE) {
      return { success: false, error: 'INVALID_STATE' };
    }
    if (session.card?.status === CardStatus.BLOCKED) {
      return { success: false, error: 'CARD_BLOCKED' };
    }

    // Determine effective purchasing branch (supports cross-counter purchase)
    let effectiveBranchId = requestedBranchId || session.branchId;
    if (user.role === 'STAFF') {
      if (requestedBranchId && !user.assignedBranchIds.includes(requestedBranchId)) {
        return { success: false, error: 'BRANCH_ACCESS_DENIED' };
      }
      if (!requestedBranchId && user.assignedBranchIds.length > 0) {
        effectiveBranchId = user.assignedBranchIds.includes(effectiveBranchId)
          ? effectiveBranchId
          : user.assignedBranchIds[0];
      }
    }

    let totalCost = 0;
    const detailedItems: any[] = [];
    for (const it of items) {
      const product = products.find(
        (p) => p.id === it.productId && p.organizationId === session.organizationId,
      );
      if (!product) {
        return { success: false, error: `Product '${it.productId}' not found` };
      }
      const qty = Math.max(1, it.quantity || 1);
      const subtotal = product.price * qty;
      totalCost += subtotal;
      detailedItems.push({
        productId: product.id,
        itemName: product.itemName,
        unitPrice: product.price,
        quantity: qty,
        subtotal,
      });
    }

    if (session.balance < totalCost) {
      return { success: false, error: 'INSUFFICIENT_BALANCE' };
    }

    const isCrossCounter = effectiveBranchId !== session.branchId;

    return {
      success: true,
      effectiveBranchId,
      totalCost,
      balanceAfter: session.balance - totalCost,
      isCrossCounter,
      detailedItems,
    };
  }

  // Emulates the updated returnSession issuing counter guard
  function evaluateReturnSession(
    session: MockSession,
    user: MockStaffUser,
  ): { canReturn: boolean; error?: string } {
    if (user.role === 'STAFF' && !user.assignedBranchIds.includes(session.branchId)) {
      return {
        canReturn: false,
        error: 'RETURN_COUNTER_MISMATCH',
      };
    }
    if (session.status === SessionStatus.SETTLED) {
      return { canReturn: false, error: 'ALREADY_SETTLED' };
    }
    return { canReturn: true };
  }

  const orgId = 'org-central';
  const counterA = 'counter-a-main';
  const counterB = 'counter-b-north';

  const mockProducts: MockProduct[] = [
    { id: 'p-1', itemName: 'Veg Biryani', price: 120, organizationId: orgId },
    { id: 'p-2', itemName: 'Lime Soda', price: 40, organizationId: orgId },
  ];

  it('allows staff at Counter B to sell food on a wallet issued at Counter A and attributes transaction to Counter B', () => {
    const session: MockSession = {
      id: 'sess-1',
      organizationId: orgId,
      branchId: counterA, // Issued at Counter A
      cardId: 'card-1',
      balance: 500,
      status: SessionStatus.ACTIVE,
      card: { id: 'card-1', status: CardStatus.ACTIVE, physicalCardNumber: 'MC-101' },
    };

    const staffCounterB: MockStaffUser = {
      id: 'staff-b',
      role: 'STAFF',
      organizationId: orgId,
      assignedBranchIds: [counterB], // Assigned to Counter B
    };

    const result = evaluatePurchaseSession(
      session,
      staffCounterB,
      [
        { productId: 'p-1', quantity: 2 }, // 2x 120 = 240
        { productId: 'p-2', quantity: 1 }, // 1x 40 = 40
      ],
      mockProducts,
      counterB,
    );

    expect(result.success).toBe(true);
    expect(result.effectiveBranchId).toBe(counterB); // Attributed to purchasing counter
    expect(result.totalCost).toBe(280);
    expect(result.balanceAfter).toBe(220);
    expect(result.isCrossCounter).toBe(true);
    expect(result.detailedItems).toHaveLength(2);
    expect(result.detailedItems![0].itemName).toBe('Veg Biryani');
  });

  it('rejects staff at Counter B when trying to return a wallet issued at Counter A', () => {
    const session: MockSession = {
      id: 'sess-1',
      organizationId: orgId,
      branchId: counterA, // Issued at Counter A
      cardId: 'card-1',
      balance: 220,
      status: SessionStatus.ACTIVE,
      card: { id: 'card-1', status: CardStatus.ACTIVE },
    };

    const staffCounterB: MockStaffUser = {
      id: 'staff-b',
      role: 'STAFF',
      organizationId: orgId,
      assignedBranchIds: [counterB], // Assigned to Counter B
    };

    const result = evaluateReturnSession(session, staffCounterB);
    expect(result.canReturn).toBe(false);
    expect(result.error).toBe('RETURN_COUNTER_MISMATCH');
  });

  it('allows staff at Counter A to return and settle their own issued wallet', () => {
    const session: MockSession = {
      id: 'sess-1',
      organizationId: orgId,
      branchId: counterA, // Issued at Counter A
      cardId: 'card-1',
      balance: 220,
      status: SessionStatus.ACTIVE,
      card: { id: 'card-1', status: CardStatus.ACTIVE },
    };

    const staffCounterA: MockStaffUser = {
      id: 'staff-a',
      role: 'STAFF',
      organizationId: orgId,
      assignedBranchIds: [counterA], // Assigned to Counter A
    };

    const result = evaluateReturnSession(session, staffCounterA);
    expect(result.canReturn).toBe(true);
  });

  it('allows ORG_ADMIN to return a wallet issued at any counter', () => {
    const session: MockSession = {
      id: 'sess-1',
      organizationId: orgId,
      branchId: counterA,
      cardId: 'card-1',
      balance: 220,
      status: SessionStatus.ACTIVE,
    };

    const orgAdmin: MockStaffUser = {
      id: 'admin-1',
      role: 'ORG_ADMIN',
      organizationId: orgId,
      assignedBranchIds: [],
    };

    const result = evaluateReturnSession(session, orgAdmin);
    expect(result.canReturn).toBe(true);
  });
});
