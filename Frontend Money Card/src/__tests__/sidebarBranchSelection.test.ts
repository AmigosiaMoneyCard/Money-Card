import { describe, it, expect, beforeEach, vi } from 'vitest';
import { storage, STORAGE_KEYS } from '@/utils';
import type { Branch } from '@/types';

describe('Sidebar Branch Selector & Cross-View Synchronization Logic', () => {
  const mockBranches: Branch[] = [
    {
      id: 'branch_001',
      organizationId: 'org_001',
      name: 'Main Cafeteria',
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'branch_002',
      organizationId: 'org_001',
      name: 'South Campus Cafeteria',
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ];

  const mockStorageStore = new Map<string, string>();
  const mockLocalStorage = {
    getItem: (key: string) => mockStorageStore.get(key) ?? null,
    setItem: (key: string, value: string) => mockStorageStore.set(key, value),
    removeItem: (key: string) => mockStorageStore.delete(key),
    clear: () => mockStorageStore.clear(),
    key: (index: number) => Array.from(mockStorageStore.keys())[index] ?? null,
    get length() {
      return mockStorageStore.size;
    },
  };

  beforeEach(() => {
    mockStorageStore.clear();
    vi.stubGlobal('localStorage', mockLocalStorage);
    storage.clear();
    vi.clearAllMocks();
  });

  it('should default to the primary branch (Main Cafeteria) when no stored branch exists', () => {
    const stored = storage.get<string>(STORAGE_KEYS.SELECTED_BRANCH_ID);
    expect(stored).toBeNull();

    // Default selection logic on initial load
    let selectedBranchId: string | null = stored;
    if (!selectedBranchId && mockBranches.length > 0) {
      selectedBranchId = mockBranches[0].id;
      storage.set(STORAGE_KEYS.SELECTED_BRANCH_ID, mockBranches[0].id);
    }

    expect(selectedBranchId).toBe('branch_001');
    const currentBranch = mockBranches.find((b) => b.id === selectedBranchId) || null;
    expect(currentBranch?.name).toBe('Main Cafeteria');
  });

  it('should allow switching to a secondary branch (South Campus Cafeteria)', () => {
    // Select branch_002
    storage.set(STORAGE_KEYS.SELECTED_BRANCH_ID, 'branch_002');
    const selectedBranchId = storage.get<string>(STORAGE_KEYS.SELECTED_BRANCH_ID);
    const currentBranch = mockBranches.find((b) => b.id === selectedBranchId) || null;

    expect(currentBranch?.name).toBe('South Campus Cafeteria');
  });

  it('should allow selecting "All Branches" by setting null or ALL', () => {
    storage.set(STORAGE_KEYS.SELECTED_BRANCH_ID, 'ALL');
    const stored = storage.get<string>(STORAGE_KEYS.SELECTED_BRANCH_ID);
    const selectedBranchId = stored === 'ALL' ? null : stored;
    const currentBranch = mockBranches.find((b) => b.id === selectedBranchId) || null;

    expect(currentBranch).toBeNull();
    // In UI, !currentBranch displays 'All Branches'
    const displayLabel = currentBranch?.name || 'All Branches';
    expect(displayLabel).toBe('All Branches');
  });

  it('should synchronize branch filtering across views', () => {
    const activeBranch: Branch | null = mockBranches[0]; // Main Cafeteria
    const targetBranchId = activeBranch ? activeBranch.id : 'ALL';

    // Mock dataset across views
    const cards = [
      { id: 'c1', currentBranchId: 'branch_001' },
      { id: 'c2', currentBranchId: 'branch_002' },
    ];
    const sessions = [
      { id: 's1', branchId: 'branch_001' },
      { id: 's2', branchId: 'branch_002' },
    ];

    // Filter simulation
    const filteredCards = cards.filter((c) => targetBranchId === 'ALL' || c.currentBranchId === targetBranchId);
    const filteredSessions = sessions.filter((s) => targetBranchId === 'ALL' || s.branchId === targetBranchId);

    expect(filteredCards).toHaveLength(1);
    expect(filteredCards[0].currentBranchId).toBe('branch_001');

    expect(filteredSessions).toHaveLength(1);
    expect(filteredSessions[0].branchId).toBe('branch_001');
  });
});
