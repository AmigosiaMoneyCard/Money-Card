import { describe, it, expect } from 'vitest';
import type { Card as CardEntity, Branch } from '@/types';

describe('Counter Cards Live Status & Search Validation Tests', () => {
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

    it('should validate normal counter names within 40 characters', () => {
      expect(validateSearchQuery('Counter')).toEqual({ isValid: true, error: null });
      expect(validateSearchQuery('c2')).toEqual({ isValid: true, error: null });
      expect(validateSearchQuery('Main_Branch-01')).toEqual({ isValid: true, error: null });
      expect(validateSearchQuery('Westside Campus 3')).toEqual({ isValid: true, error: null });
    });

    it('should reject search queries with special or malicious characters', () => {
      expect(validateSearchQuery('Counter<script>')).toEqual({
        isValid: false,
        error: 'Only letters, numbers, spaces, and hyphens are allowed.',
      });
      expect(validateSearchQuery('c2@#$!')).toEqual({
        isValid: false,
        error: 'Only letters, numbers, spaces, and hyphens are allowed.',
      });
      expect(validateSearchQuery('DROP TABLE counters;')).toEqual({
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
      expect(sanitizeSearchQuery('  Counter<script>alert()  ')).toBe('counterscriptalert');
      expect(sanitizeSearchQuery('  c2-Branch #1  ')).toBe('c2-branch 1');
      expect(sanitizeSearchQuery('Main_Stall-2')).toBe('main_stall-2');
    });

    it('should filter branches correctly using sanitized query', () => {
      const branches: Branch[] = [
        { id: 'b1', name: 'Counter', status: 'ACTIVE', organizationId: 'org1', createdAt: '', updatedAt: '' },
        { id: 'b2', name: 'c2', status: 'ACTIVE', organizationId: 'org1', createdAt: '', updatedAt: '' },
        { id: 'b3', name: 'Airport Hub', status: 'ACTIVE', organizationId: 'org1', createdAt: '', updatedAt: '' },
      ];

      const filterCounters = (query: string) => {
        const sanitized = sanitizeSearchQuery(query);
        if (!sanitized) return branches;
        return branches.filter((b) => b.name.toLowerCase().includes(sanitized));
      };

      expect(filterCounters('Counter')).toHaveLength(1);
      expect(filterCounters('Counter')[0].name).toBe('Counter');

      expect(filterCounters('c2')).toHaveLength(1);
      expect(filterCounters('c2')[0].name).toBe('c2');

      expect(filterCounters('  c  ')).toHaveLength(2); // Counter and c2
      expect(filterCounters('unknown')).toHaveLength(0);
    });
  });

  // ─── 2. Live Cards Resolution Logic ────────────────────────────────────────
  describe('Live Cards Resolution per Counter', () => {
    const mockCards: CardEntity[] = [
      {
        id: 'card-1',
        organizationId: 'org1',
        qrToken: 'qr-1',
        physicalCardNumber: 'MC-101',
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
        physicalCardNumber: 'MC-102',
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
        physicalCardNumber: 'MC-103',
        status: 'AVAILABLE',
        currentBranchId: 'branch-counter',
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
      {
        id: 'card-4',
        organizationId: 'org1',
        qrToken: 'qr-4',
        physicalCardNumber: 'MC-104',
        status: 'BLOCKED',
        currentBranchId: 'branch-counter',
        blockedReason: 'Card damaged',
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
      {
        id: 'card-5',
        organizationId: 'org1',
        qrToken: 'qr-5',
        physicalCardNumber: 'MC-201',
        status: 'AVAILABLE',
        currentBranchId: 'branch-c2',
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
    ];

    const getBranchCards = (cards: CardEntity[], branchId: string) => {
      return cards.filter((c) => {
        if (c.activeSession?.branchId === branchId) return true;
        if (c.currentBranchId === branchId) return true;
        if (c.status === 'AVAILABLE' && (!c.currentBranchId || c.currentBranchId === branchId)) return true;
        return false;
      });
    };

    const getBranchLiveCards = (cards: CardEntity[], branchId: string) => {
      return cards.filter((c) => {
        const isLive = c.status === 'ACTIVE' || Boolean(c.activeSession);
        const belongsToBranch = c.activeSession?.branchId === branchId || c.currentBranchId === branchId;
        return isLive && belongsToBranch;
      });
    };

    it('should accurately count total cards registered for branch-counter', () => {
      const counterCards = getBranchCards(mockCards, 'branch-counter');
      expect(counterCards).toHaveLength(4);
    });

    it('should accurately count live active cards for branch-counter', () => {
      const liveCards = getBranchLiveCards(mockCards, 'branch-counter');
      expect(liveCards).toHaveLength(2);
      expect(liveCards.map((c) => c.physicalCardNumber)).toEqual(['MC-101', 'MC-102']);
      expect(liveCards[0].activeSession?.customerName).toBe('Alice Smith');
      expect(liveCards[1].activeSession?.customerName).toBe('Bob Jones');
    });

    it('should accurately report 0 live cards for branch-c2', () => {
      const c2Cards = getBranchCards(mockCards, 'branch-c2');
      const c2LiveCards = getBranchLiveCards(mockCards, 'branch-c2');

      expect(c2Cards).toHaveLength(1);
      expect(c2LiveCards).toHaveLength(0);
    });

    it('should calculate correct live cards breakdown for modal tabs', () => {
      const counterCards = getBranchCards(mockCards, 'branch-counter');
      const live = counterCards.filter((c) => c.status === 'ACTIVE' || Boolean(c.activeSession)).length;
      const available = counterCards.filter((c) => c.status === 'AVAILABLE' && !c.activeSession).length;
      const blocked = counterCards.filter((c) => c.status === 'BLOCKED').length;

      expect(live).toBe(2);
      expect(available).toBe(1);
      expect(blocked).toBe(1);
      expect(counterCards.length).toBe(4);
    });

    it('should compute total live balance accurately for branch-counter', () => {
      const liveCards = getBranchLiveCards(mockCards, 'branch-counter');
      const totalLiveBalance = liveCards.reduce((acc, c) => acc + (c.activeSession?.balance || 0), 0);
      expect(totalLiveBalance).toBe(500); // 350 + 150
    });
  });

  // ─── 3. Clean Counter Name Display ─────────────────────────────────────────
  describe('Clean Counter Name Display in Rows', () => {
    it('should render clean branch name without Cards - prefix', () => {
      const branch1 = { name: 'Counter' };
      const branch2 = { name: 'c2' };

      const formatCounterName = (branch: { name: string }) => branch.name;

      expect(formatCounterName(branch1)).toBe('Counter');
      expect(formatCounterName(branch2)).toBe('c2');
      expect(formatCounterName(branch1)).not.toContain('Cards -');
      expect(formatCounterName(branch2)).not.toContain('Cards -');
    });
  });
});
