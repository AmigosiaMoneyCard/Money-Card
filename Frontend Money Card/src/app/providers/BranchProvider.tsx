import { useState, useCallback, useMemo, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Branch } from '@/types';
import { BranchContext } from './BranchContext';
import { storage, STORAGE_KEYS } from '@/utils';
import { apiService } from '@/services/api';

// ─── Branch Provider ───────────────────────────────────────
// Manages the currently selected branch for branch-scoped operations.
// Supports: current branch, branch switching, persistence, auto-fetch.

interface BranchProviderProps {
  children: ReactNode;
}

export function BranchProvider({ children }: BranchProviderProps) {
  const [branches, setBranchList] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(() => {
    const stored = storage.get<string>(STORAGE_KEYS.SELECTED_BRANCH_ID);
    return stored === 'ALL' ? null : stored;
  });

  // ── Fetch Branches on Provider mount ─────────────────────
  const refreshBranches = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await apiService.branches.getBranches();
      if (res.success) {
        const items = Array.isArray(res.data) ? res.data : (res.data?.items || []);
        setBranchList(items);

        // Synchronize selected branch with loaded branches
        const storedId = storage.get<string>(STORAGE_KEYS.SELECTED_BRANCH_ID);
        if (storedId && storedId !== 'ALL' && items.some((b: Branch) => b.id === storedId)) {
          setSelectedBranchId(storedId);
        } else if (!storedId && items.length > 0) {
          // Default to first branch (e.g. Main Cafeteria) if nothing was explicitly stored
          setSelectedBranchId(items[0].id);
          storage.set(STORAGE_KEYS.SELECTED_BRANCH_ID, items[0].id);
        } else if (storedId === 'ALL') {
          setSelectedBranchId(null);
        }
        return items;
      }
    } catch {
      // Handled gracefully (e.g. during initial unauthenticated render)
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshBranches();
  }, [refreshBranches]);

  // Derive currentBranch from branches + selectedBranchId (null means All Branches)
  const currentBranch = useMemo(() => {
    if (branches.length === 0 || !selectedBranchId) return null;
    const found = branches.find((b) => b.id === selectedBranchId);
    return found || null;
  }, [branches, selectedBranchId]);

  // ── Select Branch ─────────────────────────────────────────
  const selectBranch = useCallback((branch: Branch | string | null) => {
    if (!branch || branch === 'ALL') {
      setSelectedBranchId(null);
      storage.set(STORAGE_KEYS.SELECTED_BRANCH_ID, 'ALL');
      return;
    }
    const branchId = typeof branch === 'string' ? branch : branch.id;
    setSelectedBranchId(branchId);
    storage.set(STORAGE_KEYS.SELECTED_BRANCH_ID, branchId);

    if (typeof branch !== 'string') {
      setBranchList((prev) => (prev.some((b) => b.id === branch.id) ? prev : [...prev, branch]));
    }
  }, []);

  // ── Set Branches ──────────────────────────────────────────
  const setBranches = useCallback((newBranches: Branch[]) => {
    setBranchList(newBranches);
  }, []);

  // ── Clear Branch ──────────────────────────────────────────
  const clearBranch = useCallback(() => {
    setSelectedBranchId(null);
    storage.set(STORAGE_KEYS.SELECTED_BRANCH_ID, 'ALL');
  }, []);

  return (
    <BranchContext.Provider
      value={{
        currentBranch,
        branches,
        selectBranch,
        setBranches,
        clearBranch,
        isLoading,
        refreshBranches,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
}
