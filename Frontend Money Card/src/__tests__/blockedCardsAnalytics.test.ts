import { describe, it, expect } from 'vitest';
import type { Card as CardEntity } from '@/types';
import { formatBlockedCardMessage } from '@/utils/cardBlockMessages';

describe('Blocked Cards Analytics Tab Tests', () => {
  const sampleCards: CardEntity[] = [
    {
      id: 'c_001',
      qrToken: 'qr_001',
      organizationId: 'org_001',
      physicalCardNumber: 'MC-101',
      status: 'BLOCKED',
      currentBranchId: 'branch_iti',
      blockedReason: 'Reported lost by customer',
      blockedBy: 'Swathi (Staff)',
      createdAt: '2026-10-01T10:00:00.000Z',
      updatedAt: '2026-10-02T08:30:00.000Z',
      activeSession: {
        id: 's_001',
        balance: 150,
        branchId: 'branch_iti',
        branchName: 'iti block',
        customerName: 'Raman Banpar',
        customerPhone: '9876543210',
      },
    },
    {
      id: 'c_002',
      qrToken: 'qr_002',
      organizationId: 'org_001',
      physicalCardNumber: 'MC-102',
      status: 'BLOCKED',
      currentBranchId: 'branch_iti',
      blockedReason: 'Card damaged chip fault',
      blockedBy: 'Admin (Org Admin)',
      createdAt: '2026-09-28T10:00:00.000Z',
      updatedAt: '2026-10-01T12:00:00.000Z',
      activeSession: {
        id: 's_002',
        balance: 200,
        branchId: 'branch_iti',
        branchName: 'iti block',
        customerName: 'Ananya Sen',
        customerPhone: '9876543211',
      },
    },
    {
      id: 'c_003',
      qrToken: 'qr_003',
      organizationId: 'org_001',
      physicalCardNumber: 'MC-103',
      status: 'BLOCKED',
      currentBranchId: 'branch_main',
      blockedReason: 'Suspicious multiple failed recharges',
      blockedBy: 'Swathi (Staff)',
      createdAt: '2026-09-25T10:00:00.000Z',
      updatedAt: '2026-09-28T14:00:00.000Z',
      activeSession: {
        id: 's_003',
        balance: 100,
        branchId: 'branch_main',
        branchName: 'Main Cafeteria',
        customerName: 'Mohammed Riyas',
        customerPhone: '9876543212',
      },
    },
    {
      id: 'c_004',
      qrToken: 'qr_004',
      organizationId: 'org_001',
      physicalCardNumber: 'MC-104',
      status: 'ACTIVE',
      currentBranchId: 'branch_iti',
      createdAt: '2026-10-01T10:00:00.000Z',
      updatedAt: '2026-10-02T08:30:00.000Z',
      activeSession: {
        id: 's_004',
        balance: 500,
        branchId: 'branch_iti',
        branchName: 'iti block',
        customerName: 'Suresh Kumar',
        customerPhone: '9876543213',
      },
    },
  ];

  it('should isolate only cards with status BLOCKED', () => {
    const blocked = sampleCards.filter(
      (c) => String(c.status).toUpperCase() === 'BLOCKED',
    );
    expect(blocked).toHaveLength(3);
    expect(blocked.every((c) => c.status === 'BLOCKED')).toBe(true);
  });

  it('should accurately calculate total locked balance across blocked cards', () => {
    const blocked = sampleCards.filter((c) => c.status === 'BLOCKED');
    const totalLockedBalance = blocked.reduce(
      (sum, c) => sum + (c.activeSession?.balance ?? 0),
      0,
    );
    expect(totalLockedBalance).toBe(450); // 150 + 200 + 100
  });

  it('should filter blocked cards by counter/branch scope', () => {
    const itiBlocked = sampleCards.filter(
      (c) => c.status === 'BLOCKED' && (c.activeSession?.branchId === 'branch_iti' || c.currentBranchId === 'branch_iti'),
    );
    expect(itiBlocked).toHaveLength(2);
    expect(itiBlocked.map((c) => c.physicalCardNumber)).toEqual(['MC-101', 'MC-102']);

    const mainBlocked = sampleCards.filter(
      (c) => c.status === 'BLOCKED' && (c.activeSession?.branchId === 'branch_main' || c.currentBranchId === 'branch_main'),
    );
    expect(mainBlocked).toHaveLength(1);
    expect(mainBlocked[0].physicalCardNumber).toBe('MC-103');
  });

  it('should support search query matching by card ID, customer name, phone, or reason', () => {
    const searchFilter = (cards: CardEntity[], query: string) => {
      const q = query.toLowerCase().trim();
      return cards.filter((c) => {
        const cardId = (c.physicalCardNumber || c.id || '').toLowerCase();
        const customer = (c.activeSession?.customerName || '').toLowerCase();
        const phone = (c.activeSession?.customerPhone || '').toLowerCase();
        const reason = (c.blockedReason || '').toLowerCase();
        return cardId.includes(q) || customer.includes(q) || phone.includes(q) || reason.includes(q);
      });
    };

    const blockedOnly = sampleCards.filter((c) => c.status === 'BLOCKED');

    // Search by customer name
    expect(searchFilter(blockedOnly, 'Raman')).toHaveLength(1);
    expect(searchFilter(blockedOnly, 'Raman')[0].physicalCardNumber).toBe('MC-101');

    // Search by card ID
    expect(searchFilter(blockedOnly, 'MC-102')).toHaveLength(1);

    // Search by phone
    expect(searchFilter(blockedOnly, '9876543212')).toHaveLength(1);
    expect(searchFilter(blockedOnly, '9876543212')[0].activeSession?.customerName).toBe('Mohammed Riyas');

    // Search by reason
    expect(searchFilter(blockedOnly, 'damaged')).toHaveLength(1);
  });

  it('should format blocked card messages cleanly with fallback blocker', () => {
    const reason1 = formatBlockedCardMessage('Reported lost by customer', 'Swathi (Staff)');
    expect(reason1).toBe('Reported lost by customer');

    const reason2 = formatBlockedCardMessage(null, 'Administrator');
    expect(reason2).toBe('Card blocked by administrator.');
  });

  it('should handle unblocking card state update', () => {
    let cards = [...sampleCards];
    const unblockCardId = 'c_001';

    // Simulate unblock
    cards = cards.map((c) =>
      c.id === unblockCardId ? { ...c, status: 'ACTIVE' as const, blockedReason: null } : c,
    );

    const remainingBlocked = cards.filter((c) => c.status === 'BLOCKED');
    expect(remainingBlocked).toHaveLength(2);
    expect(remainingBlocked.some((c) => c.id === unblockCardId)).toBe(false);
  });
});
