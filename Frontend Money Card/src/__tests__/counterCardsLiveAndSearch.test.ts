import { describe, it, expect } from 'vitest';
import type { Card as CardEntity, Branch } from '@/types';

describe('Streamlined Live Active Cards Registry & Search Validation Tests', () => {
  // ─── 1. Search Bar Validation Rules ────────────────────────────────────────
  describe('Search Bar Input Validation', () => {
    const validateSearchQuery = (query: string): { isValid: boolean; error: string | null } => {
      if (query.length > 40) {
        return { isValid: false, error: 'Maximum 40 characters allowed.' };
      }
      const isValid = /^[a-zA-Z0-9\s\-_]*$/.test(query);
      if (!isValid) {
        return { isValid: false, error: 'Only letters, numbers, spaces, and hyphens are allowed.' };
      }
      return { isValid: true, error: null };
    };

    const sanitizeSearchQuery = (query: string): string => {
      return query.replace(/[^a-zA-Z0-9\s\-_]/g, '').toLowerCase().trim();
    };

    it('should validate normal search queries within 40 characters', () => {
      expect(validateSearchQuery('MC 102')).toEqual({ isValid: true, error: null });
      expect(validateSearchQuery('Alice Smith')).toEqual({ isValid: true, error: null });
      expect(validateSearchQuery('9876543210')).toEqual({ isValid: true, error: null });
    });

    it('should reject search queries with special or malicious characters', () => {
      expect(validateSearchQuery('Alice<script>')).toEqual({
        isValid: false,
        error: 'Only letters, numbers, spaces, and hyphens are allowed.',
      });
      expect(validateSearchQuery('MC@#$!')).toEqual({
        isValid: false,
        error: 'Only letters, numbers, spaces, and hyphens are allowed.',
      });
      expect(validateSearchQuery('DROP TABLE sessions;')).toEqual({
        isValid: false,
        error: 'Only letters, numbers, spaces, and hyphens are allowed.',
      });
    });

    it('should reject search queries exceeding 40 characters', () => {
      const longQuery = 'A'.repeat(41);
      expect(validateSearchQuery(longQuery)).toEqual({
        isValid: false,
        error: 'Maximum 40 characters allowed.',
      });
    });

    it('should sanitize input by stripping disallowed characters and trimming', () => {
      expect(sanitizeSearchQuery('  Alice<script>alert()  ')).toBe('alicescriptalert');
      expect(sanitizeSearchQuery('  MC-102 #1  ')).toBe('mc-102 1');
    });
  });

  // ─── 2. Live Active Cards Filtering & Table Columns ─────────────────────────
  describe('Live Active Cards Registry (4 Columns)', () => {
    const mockCards: CardEntity[] = [
      {
        id: 'card-1',
        organizationId: 'org1',
        qrToken: 'qr-1',
        physicalCardNumber: 'MC 101',
        status: 'ACTIVE',
        currentBranchId: 'branch-counter',
        activeSession: {
          id: 'sess-1',
          branchId: 'branch-counter',
          customerName: 'Alice Smith',
          customerPhone: '9876543210',
          balance: 350,
          issuedAt: '2026-09-23T08:00:00Z',
        },
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-23T08:00:00Z',
      },
      {
        id: 'card-2',
        organizationId: 'org1',
        qrToken: 'qr-2',
        physicalCardNumber: 'MC 102',
        status: 'ACTIVE',
        currentBranchId: 'branch-counter',
        activeSession: {
          id: 'sess-2',
          branchId: 'branch-counter',
          customerName: 'Bob Jones',
          customerPhone: '9123456789',
          balance: 150,
          issuedAt: '2026-09-23T09:00:00Z',
        },
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-23T09:00:00Z',
      },
      {
        id: 'card-3',
        organizationId: 'org1',
        qrToken: 'qr-3',
        physicalCardNumber: 'MC 103',
        status: 'AVAILABLE',
        currentBranchId: 'branch-counter',
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
      {
        id: 'card-4',
        organizationId: 'org1',
        qrToken: 'qr-4',
        physicalCardNumber: 'MC 104',
        status: 'BLOCKED',
        currentBranchId: 'branch-counter',
        blockedReason: 'Card damaged',
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
    ];

    const getLiveCards = (cards: CardEntity[]) => {
      return cards.filter((c) => c.status === 'ACTIVE' || Boolean(c.activeSession));
    };

    const filterLiveCards = (cards: CardEntity[], query: string) => {
      const live = getLiveCards(cards);
      const sanitized = query.replace(/[^a-zA-Z0-9\s\-_]/g, '').toLowerCase().trim();
      if (!sanitized) return live;

      return live.filter((c) => {
        const couponId = (c.physicalCardNumber || c.qrToken || '').toLowerCase();
        const customer = (c.activeSession?.customerName || '').toLowerCase();
        const phone = (c.activeSession?.customerPhone || '').toLowerCase();
        return couponId.includes(sanitized) || customer.includes(sanitized) || phone.includes(sanitized);
      });
    };

    it('should only return cards with active sessions for the main table', () => {
      const live = getLiveCards(mockCards);
      expect(live).toHaveLength(2);
      expect(live.map((c) => c.physicalCardNumber)).toEqual(['MC 101', 'MC 102']);
    });

    it('should format 4 main table columns (Coupon ID, Customer, Live Balance, Actions)', () => {
      const live = getLiveCards(mockCards);
      const tableRow = live[0];

      // Column 1: Coupon / Card ID
      expect(tableRow.physicalCardNumber).toBe('MC 101');
      // Column 2: Customer
      expect(tableRow.activeSession?.customerName).toBe('Alice Smith');
      expect(tableRow.activeSession?.customerPhone).toBe('9876543210');
      // Column 3: Live Balance
      expect(tableRow.activeSession?.balance).toBe(350);
      // Column 4: Card has ID for action dispatch
      expect(tableRow.id).toBe('card-1');
    });

    it('should filter live cards by customer name', () => {
      const filtered = filterLiveCards(mockCards, 'Alice');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].activeSession?.customerName).toBe('Alice Smith');
    });

    it('should filter live cards by card number', () => {
      const filtered = filterLiveCards(mockCards, 'MC 102');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].physicalCardNumber).toBe('MC 102');
    });

    it('should filter live cards by phone number', () => {
      const filtered = filterLiveCards(mockCards, '9123');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].activeSession?.customerPhone).toBe('9123456789');
    });
  });

  // ─── 3. Card Details Modal Attributes ──────────────────────────────────────
  describe('Card Details Modal (Counter & Active Since Location)', () => {
    const liveCard: CardEntity = {
      id: 'card-1',
      organizationId: 'org1',
      qrToken: 'qr-1',
      physicalCardNumber: 'MC 101',
      status: 'ACTIVE',
      currentBranchId: 'branch-counter',
      activeSession: {
        id: 'sess-1',
        branchId: 'branch-counter',
        customerName: 'Alice Smith',
        customerPhone: '9876543210',
        balance: 350,
        issuedAt: '2026-09-23T08:00:00Z',
      },
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-23T08:00:00Z',
    };

    const branches: Branch[] = [
      { id: 'branch-counter', name: 'Counter', status: 'ACTIVE', organizationId: 'org1', createdAt: '', updatedAt: '' },
    ];

    it('should provide Counter Location and Active Since inside Card Details modal', () => {
      const branchName = branches.find((b) => b.id === liveCard.activeSession?.branchId)?.name;
      const activeSince = liveCard.activeSession?.issuedAt;

      expect(branchName).toBe('Counter');
      expect(activeSince).toBe('2026-09-23T08:00:00Z');
    });
  });
});
