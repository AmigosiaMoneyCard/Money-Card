import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiService } from '@/services/api';
import { usePermissions } from '@/hooks';
import type { Branch, ProductWithInventory } from '@/types';
import { Button, LoadingState, EmptyState } from '@/components/ui';
import { notify } from '@/utils';
import { UnauthorizedPage } from '@/features/auth';
import {
  Search,
  Plus,
  Building2,
  Eye,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CounterAddProductModal } from './CounterAddProductModal';
import { CounterViewEditMenuModal } from './CounterViewEditMenuModal';

interface ProductsPageProps {
  defaultTab?: string;
}

export function ProductsPage({ defaultTab: _defaultTab }: ProductsPageProps = {}) {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();

  const canViewProducts = hasPermission('PRODUCT_VIEW');
  const canManageProducts = hasPermission('PRODUCT_MANAGE');

  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<ProductWithInventory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modals state
  const [selectedBranchForAdd, setSelectedBranchForAdd] = useState<Branch | null>(null);
  const [selectedBranchForViewEdit, setSelectedBranchForViewEdit] = useState<Branch | null>(null);
  const [togglingBranchId, setTogglingBranchId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [branchRes, prodRes] = await Promise.all([
        apiService.branches.getBranches(),
        apiService.products.getProducts({}),
      ]);

      if (branchRes.success) {
        const bItems = Array.isArray(branchRes.data)
          ? branchRes.data
          : (branchRes.data as any)?.items || [];
        setBranches(bItems);
      }

      if (prodRes.success) {
        const pItems = Array.isArray(prodRes.data)
          ? prodRes.data
          : (prodRes.data as any)?.items || [];
        setProducts(pItems);
      }
    } catch {
      notify.error('Failed to load menu and counters data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Map item count per branch
  const branchProductCounts = useMemo(() => {
    const counts = new Map<string, number>();
    products.forEach((p) => {
      if (p.branchId) {
        counts.set(p.branchId, (counts.get(p.branchId) || 0) + 1);
      }
    });
    return counts;
  }, [products]);

  // Filtered branches
  const filteredBranches = useMemo(() => {
    return branches.filter((b) => {
      if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return b.name.toLowerCase().includes(q) || (b.location && b.location.toLowerCase().includes(q));
      }
      return true;
    });
  }, [branches, searchQuery, statusFilter]);

  const handleToggleBranchStatus = async (branch: Branch) => {
    const nextStatus = branch.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setTogglingBranchId(branch.id);
    try {
      const res = await apiService.branches.updateBranch(branch.id, { status: nextStatus });
      if (res.success) {
        setBranches((prev) =>
          prev.map((b) => (b.id === branch.id ? { ...b, status: nextStatus } : b)),
        );
        notify.success(`Counter "${branch.name}" is now ${nextStatus.toLowerCase()}`);
      } else {
        notify.error(res.error.message || 'Failed to update counter status');
      }
    } catch {
      notify.error('Failed to update counter status');
    } finally {
      setTogglingBranchId(null);
    }
  };

  if (!canViewProducts) {
    return <UnauthorizedPage />;
  }

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-10">
      {/* ─── Minimal Header ─── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Menu Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure food items, menus, and live availability counter-by-counter.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/branches')}
            className="text-xs h-8 px-3"
            leftIcon={<Building2 className="h-3.5 w-3.5 text-slate-500" />}
          >
            Manage Counters
          </Button>
        </div>
      </div>

      {/* ─── Search & Status Filters ─── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search counters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden"
          />
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/60 self-start sm:self-auto">
          {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === s
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {s === 'ALL' ? 'All Counters' : s === 'ACTIVE' ? 'Active' : 'Inactive'}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Minimal Table ─── */}
      {isLoading ? (
        <div className="py-12 bg-white rounded-2xl border border-slate-200/80">
          <LoadingState message="Loading cafeteria counters..." />
        </div>
      ) : filteredBranches.length === 0 ? (
        <div className="py-12 bg-white rounded-2xl border border-slate-200/80">
          <EmptyState
            title={searchQuery ? 'No matching counters' : 'No counters found'}
            description={
              searchQuery
                ? 'Try adjusting your search query.'
                : 'Counters configured in your organization will appear here.'
            }
          />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          {/* Desktop Table View */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4 min-w-[200px]">Counter Name</th>
                  <th className="py-3 px-4 text-center w-[130px]">Add Item</th>
                  <th className="py-3 px-4 text-center w-[180px]">View Menu / Edit</th>
                  <th className="py-3 px-4 text-right w-[150px]">Active / Inactive</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBranches.map((branch) => {
                  const itemCount = branchProductCounts.get(branch.id) || 0;
                  const isActive = branch.status === 'ACTIVE';

                  return (
                    <tr
                      key={branch.id}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        !isActive ? 'opacity-70 bg-slate-50/30' : ''
                      }`}
                    >
                      {/* 1. Counter Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="font-semibold text-sm text-slate-900 block">
                              {branch.name}
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium">
                              {itemCount} {itemCount === 1 ? 'item' : 'items'}
                              {branch.location ? ` • ${branch.location}` : ''}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 2. Add Button */}
                      <td className="py-3.5 px-4 text-center">
                        {canManageProducts && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedBranchForAdd(branch)}
                            className="text-xs h-7 px-2.5 rounded-lg border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400 font-semibold"
                            leftIcon={<Plus className="h-3.5 w-3.5 text-emerald-600" />}
                          >
                            Add
                          </Button>
                        )}
                      </td>

                      {/* 3. View Menu / Edit */}
                      <td className="py-3.5 px-4 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedBranchForViewEdit(branch)}
                          className="text-xs h-7 px-3 rounded-lg text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200 font-medium"
                          leftIcon={<Eye className="h-3.5 w-3.5 text-slate-500" />}
                        >
                          View Menu / Edit
                        </Button>
                      </td>

                      {/* 4. Active / Inactive Switch */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-2 justify-end">
                          <span
                            className={`text-xs font-semibold ${
                              isActive ? 'text-emerald-700' : 'text-slate-400'
                            }`}
                          >
                            {isActive ? 'Active' : 'Inactive'}
                          </span>

                          {canManageProducts && (
                            <button
                              type="button"
                              onClick={() => handleToggleBranchStatus(branch)}
                              disabled={togglingBranchId === branch.id}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                                isActive ? 'bg-emerald-600' : 'bg-slate-300'
                              } ${togglingBranchId === branch.id ? 'opacity-50' : ''}`}
                              title={`Click to ${isActive ? 'deactivate' : 'activate'} counter`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                  isActive ? 'translate-x-4' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Minimal Popup: Add Item ─── */}
      <CounterAddProductModal
        isOpen={Boolean(selectedBranchForAdd)}
        onClose={() => setSelectedBranchForAdd(null)}
        branch={selectedBranchForAdd}
        onSuccess={fetchData}
      />

      {/* ─── Minimal Popup: View Menu / Edit ─── */}
      <CounterViewEditMenuModal
        isOpen={Boolean(selectedBranchForViewEdit)}
        onClose={() => setSelectedBranchForViewEdit(null)}
        branch={selectedBranchForViewEdit}
        onChanged={fetchData}
        onOpenAddModal={() => {
          if (selectedBranchForViewEdit) {
            setSelectedBranchForAdd(selectedBranchForViewEdit);
          }
        }}
      />
    </div>
  );
}
