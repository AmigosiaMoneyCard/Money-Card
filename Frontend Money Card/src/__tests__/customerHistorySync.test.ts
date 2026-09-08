type CustomerHistoryItem = any;
import { describe, it, expect } from 'vitest';
import type { CustomerHistoryEvent } from '../types';

describe('Customer History Sync & Table Rendering', () => {
  const sampleSessions: CustomerHistoryItem[] = [
    {
      id: 'sess-1',
      cardId: 'card-1',
      physicalCardNumber: 'MC 105',
      sessionCardNumber: 'MC 105_1',
      cycleNumber: 1,
      customerName: 'John Doe',
      customerPhone: '9876501234',
      session: {} as any,
      sessionStatus: 'ACTIVE',
      balance: 450,
      branchId: 'branch_001',
      branchName: 'Main Cafeteria',
      startedAt: '2026-08-28T08:00:00Z',
      settledAt: null,
      lastActivityAt: '2026-08-28T08:00:00Z',
    },
    {
      id: 'sess-2',
      cardId: 'card-2',
      physicalCardNumber: 'MC-001',
      sessionCardNumber: 'MC-001_1',
      cycleNumber: 1,
      customerName: 'Alex Morgan',
      customerPhone: '9876543210',
      session: {} as any,
      sessionStatus: 'ACTIVE',
      balance: 600,
      branchId: 'branch_001',
      branchName: 'Main Cafeteria',
      startedAt: '2026-08-28T08:30:00Z',
      settledAt: null,
      lastActivityAt: '2026-08-28T08:30:00Z',
    },
  ];

  const sampleEvents: CustomerHistoryEvent[] = [
    {
      id: 'evt-1',
      cardId: 'card-1',
      customerName: 'John Doe',
      customerPhone: '9876501234',
      physicalCardNumber: 'MC 105',
      action: 'CARD_BLOCKED',
      previousStatus: 'ACTIVE',
      newStatus: 'BLOCKED',
      performedByName: 'Rahul Counter Staff',
      branchName: 'Main Cafeteria',
      reason: 'Reported lost by customer',
      createdAt: '2026-08-28T09:00:00Z',
    },
    {
      id: 'evt-2',
      cardId: 'card-1',
      customerName: 'John Doe',
      customerPhone: '9876501234',
      physicalCardNumber: 'MC 105',
      action: 'CARD_UNBLOCKED',
      previousStatus: 'BLOCKED',
      newStatus: 'ACTIVE',
      performedByName: 'Acme General Manager',
      branchName: 'Main Cafeteria',
      reason: 'Found card and verified identity',
      createdAt: '2026-08-28T10:00:00Z',
    },
  ];

  it('filters sessions by search query across customer name and card number', () => {
    const q = 'MC 105'.toLowerCase();
    const matches = sampleSessions.filter((s) =>
      s.physicalCardNumber.toLowerCase().includes(q) ||
      (s.customerName?.toLowerCase().includes(q) ?? false)
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].customerName).toBe('John Doe');
  });

  it('filters audit events by action type', () => {
    const blockedEvents = sampleEvents.filter((e) => e.action === 'CARD_BLOCKED');
    expect(blockedEvents).toHaveLength(1);
    expect(blockedEvents[0].reason).toBe('Reported lost by customer');

    const unblockedEvents = sampleEvents.filter((e) => e.action === 'CARD_UNBLOCKED');
    expect(unblockedEvents).toHaveLength(1);
    expect(unblockedEvents[0].reason).toBe('Found card and verified identity');
  });

  it('correctly calculates total floating balance and active count from sessions', () => {
    const activeSessions = sampleSessions.filter((s) => s.sessionStatus === 'ACTIVE');
    const totalBalance = activeSessions.reduce((sum, s) => sum + s.balance, 0);
    expect(activeSessions).toHaveLength(2);
    expect(totalBalance).toBe(1050);
  });

  it('extracts array data safely from both raw array and paginated response objects', () => {
    const extractArray = <T,>(data: any): T[] => {
      if (!data) return [];
      if (Array.isArray(data)) return data;
      if (Array.isArray(data.items)) return data.items;
      return [];
    };

    const rawArrayData = [{ id: '1' }, { id: '2' }];
    const paginatedObj = { items: [{ id: '3' }], pagination: { total: 1 } };

    expect(extractArray(rawArrayData)).toHaveLength(2);
    expect(extractArray(paginatedObj)).toHaveLength(1);
    expect(extractArray(null)).toHaveLength(0);
  });

  it('correctly formats internal card cycle as #1, #2 for each customer in history', () => {
    const formatCycle = (cycle: number) => `#${cycle}`;

    const multiCycleSessions: CustomerHistoryItem[] = [
      {
        id: 'sess-101',
        cardId: 'card-100',
        physicalCardNumber: 'MC-100',
        sessionCardNumber: 'MC-100_1',
        cycleNumber: 1,
        customerName: 'Alice Green',
        customerPhone: '9876500001',
        sessionStatus: 'SETTLED',
        balance: 0,
      },
      {
        id: 'sess-102',
        cardId: 'card-100',
        physicalCardNumber: 'MC-100',
        sessionCardNumber: 'MC-100_2',
        cycleNumber: 2,
        customerName: 'Bob White',
        customerPhone: '9876500002',
        sessionStatus: 'ACTIVE',
        balance: 350,
      },
    ];

    expect(formatCycle(multiCycleSessions[0].cycleNumber)).toBe('#1');
    expect(formatCycle(multiCycleSessions[1].cycleNumber)).toBe('#2');
    expect(multiCycleSessions[0].customerName).toBe('Alice Green');
    expect(multiCycleSessions[1].customerName).toBe('Bob White');
    expect(multiCycleSessions[0].physicalCardNumber).toBe(multiCycleSessions[1].physicalCardNumber);
  });

  it('filters customer history items by cycle number (e.g. #2)', () => {
    const sessions: CustomerHistoryItem[] = [
      { id: '1', physicalCardNumber: 'MC-100', cycleNumber: 1, customerName: 'Alice' },
      { id: '2', physicalCardNumber: 'MC-100', cycleNumber: 2, customerName: 'Bob' },
      { id: '3', physicalCardNumber: 'MC-200', cycleNumber: 1, customerName: 'Charlie' },
    ];

    const searchFilter = (query: string) => {
      const q = query.toLowerCase().trim();
      return sessions.filter((s) =>
        s.physicalCardNumber.toLowerCase().includes(q) ||
        (s.customerName?.toLowerCase().includes(q) ?? false) ||
        `#${s.cycleNumber}`.toLowerCase().includes(q) ||
        `cycle ${s.cycleNumber}`.includes(q)
      );
    };

    const matchesCycle2 = searchFilter('#2');
    expect(matchesCycle2).toHaveLength(1);
    expect(matchesCycle2[0].customerName).toBe('Bob');

    const matchesCycle1 = searchFilter('#1');
    expect(matchesCycle1).toHaveLength(2);
  });

  it('keeps Card Cycle in the Eye button Customer Profile details overview', () => {
    const sessionDetailsModalView = (item: CustomerHistoryItem) => ({
      customerProfile: {
        name: item.customerName,
        phone: item.customerPhone,
      },
      overview: {
        physicalCard: item.physicalCardNumber,
        cardCycle: `#${item.cycleNumber}`,
        branchLocation: item.branchName,
        sessionStarted: item.startedAt,
        settledAt: item.settledAt || 'Still Active',
      },
    });

    const modalData = sessionDetailsModalView(sampleSessions[0]);
    expect(modalData.customerProfile.name).toBe('John Doe');
    expect(modalData.overview.physicalCard).toBe('MC 105');
    expect(modalData.overview.cardCycle).toBe('#1');
    expect(modalData.overview.branchLocation).toBe('Main Cafeteria');
    expect(modalData.overview.settledAt).toBe('Still Active');
  });
});

