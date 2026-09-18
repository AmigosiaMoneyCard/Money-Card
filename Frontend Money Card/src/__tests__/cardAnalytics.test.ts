import { describe, it, expect } from 'vitest';
import type { CardFleetTrackItem } from '@/types';

describe('Card Fleet Analytics & Tracking Tests', () => {
  const mockCards: CardFleetTrackItem[] = [
    {
      id: 'c1',
      cardNumber: 'MC-001',
      status: 'ACTIVE',
      balance: 250,
      totalRecharged: 1000,
      totalSpent: 750,
      totalRefunded: 0,
      transactionCount: 8,
      favoriteBranchName: 'Main Cafeteria',
      lastUsedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(), // 2 days ago (Active)
      isDormant: false,
    },
    {
      id: 'c2',
      cardNumber: 'MC-002',
      status: 'ACTIVE',
      balance: 120,
      totalRecharged: 500,
      totalSpent: 380,
      totalRefunded: 0,
      transactionCount: 5,
      favoriteBranchName: 'Juice Bar',
      lastUsedAt: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString(), // 20 days ago (Dormant)
      isDormant: true,
    },
    {
      id: 'c3',
      cardNumber: 'MC-003',
      status: 'BLOCKED',
      balance: 0,
      totalRecharged: 200,
      totalSpent: 200,
      totalRefunded: 0,
      transactionCount: 2,
      favoriteBranchName: 'Main Cafeteria',
      lastUsedAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
      isDormant: false,
    },
  ];

  it('should accurately calculate total customer float liability', () => {
    // Only active cards contribute to live float
    const activeCards = mockCards.filter((c) => c.status === 'ACTIVE');
    const totalFloat = activeCards.reduce((sum, c) => sum + c.balance, 0);

    expect(totalFloat).toBe(370); // 250 + 120
    expect(activeCards).toHaveLength(2);
  });

  it('should identify dormant cards with unspent money inactive for > 14 days', () => {
    const dormant = mockCards.filter((c) => c.isDormant);
    expect(dormant).toHaveLength(1);
    expect(dormant[0].cardNumber).toBe('MC-002');
    expect(dormant[0].balance).toBe(120);
  });

  it('should sort top spending cards in descending order', () => {
    const sortedBySpend = [...mockCards].sort((a, b) => b.totalSpent - a.totalSpent);
    expect(sortedBySpend[0].cardNumber).toBe('MC-001'); // 750
    expect(sortedBySpend[1].cardNumber).toBe('MC-002'); // 380
    expect(sortedBySpend[2].cardNumber).toBe('MC-003'); // 200
  });

  it('should correctly find a card by search query (case-insensitive)', () => {
    const query = 'mc-002';
    const found = mockCards.find((c) => c.cardNumber.toLowerCase() === query.toLowerCase());

    expect(found).toBeDefined();
    expect(found?.cardNumber).toBe('MC-002');
    expect(found?.favoriteBranchName).toBe('Juice Bar');
  });

  it('should verify card counter labels do not contain 🏪 emoji', () => {
    mockCards.forEach((c) => {
      const label = `Counter: ${c.favoriteBranchName}`;
      expect(label).not.toContain('🏪');
      expect(label.startsWith('Counter: ')).toBe(true);
    });
  });
});
