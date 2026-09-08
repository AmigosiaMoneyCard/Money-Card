// ─── All Branches End-to-End Consolidated Overview Modal (Org Admin) ────────────
// Provides a unified, 360-degree operational breakdown across all branches:
// Staff assignments, menu catalogs, live inventory valuation, and stock alerts.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiService } from '@/services/api';
import type { Branch, Staff, ProductWithInventory, InventoryItem } from '@/types';
import {
  Button,
  Select,
  Badge,
  Modal,
  ModalFooter,
  LoadingState,
  EmptyState,
  ErrorState,
} from '@/components/ui';
import { formatCurrency, formatDate } from '@/utils';
import {
  Building2,
  Users,
  UtensilsCrossed,
  Package,
  TrendingUp,
  AlertTriangle,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  X,
} from 'lucide-react';

export interface AllBranchesOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenBranchMenu?: (branch: Branch) => void;
  onEditBranch?: (branch: Branch) => void;
}

export interface BranchComprehensiveData {
  branch: Branch;
  assignedStaff: Staff[];
  products: ProductWithInventory[];
  inventoryItems: InventoryItem[];
  totalProducts: number;
  activeProducts: number;
  totalStockUnits: number;
  totalValuation: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export function AllBranchesOverviewModal({
  isOpen,
  onClose,
  onOpenBranchMenu,
  onEditBranch,
}: AllBranchesOverviewModalProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [productsList, setProductsList] = useState<ProductWithInventory[]>([]);
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Search, Filter & Sort States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [sortBy, setSortBy] = useState<'NAME' | 'VALUATION' | 'PRODUCTS' | 'STAFF' | 'ALERTS'>('NAME');

  // Expanded branch accordion cards
  const [expandedBranchIds, setExpandedBranchIds] = useState<Set<string>>(new Set());

  const toggleBranchExpand = (branchId: string) => {
    setExpandedBranchIds((prev) => {
      const next = new Set(prev);
      if (next.has(branchId)) {
        next.delete(branchId);
      } else {
        next.add(branchId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedBranchIds(new Set(branches.map((b) => b.id)));
  };

  const collapseAll = () => {
    setExpandedBranchIds(new Set());
  };

  // ─── Fetch All Data Across the Entire Organization ─────────────────────────
  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const [branchRes, staffRes, prodRes, invRes] = await Promise.all([
        apiService.branches.getBranches(),
        apiService.staff.getStaff(),
        apiService.products.getProducts(),
        apiService.inventory.getInventory(),
      ]);

      if (!branchRes.success) {
        setLoadError(branchRes.error.message || 'Failed to load branch list');
        return;
      }

      setBranches(branchRes.data.items || []);

      if (staffRes.success) {
        setStaffList(staffRes.data.items || []);
      }

      if (prodRes.success) {
        const prods = Array.isArray(prodRes.data) ? prodRes.data : prodRes.data?.items || [];
        setProductsList(prods);
      }

      if (invRes.success) {
        const inv = Array.isArray(invRes.data) ? invRes.data : invRes.data?.items || [];
        setInventoryList(inv);
      }
    } catch {
      setLoadError('Unable to connect to the server. Please check connection and retry.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchAllData();
    }
  }, [isOpen, fetchAllData]);

  // ─── Consolidate Branch-Level Details ──────────────────────────────────────
  const branchDetails = useMemo<BranchComprehensiveData[]>(() => {
    return branches.map((branch) => {
      // 1. Find staff assigned to this branch
      const assignedStaff = staffList.filter((s) =>
        Array.isArray(s.assignedBranchIds) && s.assignedBranchIds.includes(branch.id),
      );

      // 2. Find products for this branch
      const branchProds = productsList.filter(
        (p) => p.branchId === branch.id || (p as any).branchIds?.includes(branch.id),
      );

      // 3. Find inventory for this branch
      const branchInv = inventoryList.filter((i) => i.branchId === branch.id);

      // 4. Calculate stock units & valuation
      let totalStockUnits = 0;
      let totalValuation = 0;
      let lowStockCount = 0;
      let outOfStockCount = 0;

      const unifiedProds = branchProds.map((prod) => {
        const invItem = branchInv.find((i) => i.productId === prod.id);
        const qty = invItem !== undefined ? invItem.quantity : (prod.quantity || 0);

        totalStockUnits += qty;
        totalValuation += qty * (prod.price || 0);

        if (qty === 0) {
          outOfStockCount++;
        } else if (qty < 10) {
          lowStockCount++;
        }

        return {
          ...prod,
          quantity: qty,
        };
      });

      return {
        branch,
        assignedStaff,
        products: unifiedProds,
        inventoryItems: branchInv,
        totalProducts: branchProds.length,
        activeProducts: branchProds.filter((p) => p.status === 'ACTIVE').length,
        totalStockUnits,
        totalValuation,
        lowStockCount,
        outOfStockCount,
      };
    });
  }, [branches, staffList, productsList, inventoryList]);

  // ─── Filtered & Sorted Branch Details ─────────────────────────────────────
  const filteredBranchDetails = useMemo(() => {
    let result = branchDetails;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (b) =>
          b.branch.name.toLowerCase().includes(q) ||
          b.assignedStaff.some((s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)) ||
          b.products.some((p) => p.itemName.toLowerCase().includes(q)),
      );
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      result = result.filter((b) => b.branch.status === statusFilter);
    }

    // Sorting
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'VALUATION':
          return b.totalValuation - a.totalValuation;
        case 'PRODUCTS':
          return b.totalProducts - a.totalProducts;
        case 'STAFF':
          return b.assignedStaff.length - a.assignedStaff.length;
        case 'ALERTS':
          return (b.lowStockCount + b.outOfStockCount) - (a.lowStockCount + a.outOfStockCount);
        case 'NAME':
        default:
          return a.branch.name.localeCompare(b.branch.name);
      }
    });

    return result;
  }, [branchDetails, searchQuery, statusFilter, sortBy]);

  // ─── Top Level Overall Metrics ───────────────────────────────────────────
  const overallMetrics = useMemo(() => {
    const totalBranches = branches.length;
    const activeBranches = branches.filter((b) => b.status === 'ACTIVE').length;
    const totalStaffCount = staffList.length;
    const totalProductsCount = productsList.length;
    const totalStockUnits = branchDetails.reduce((sum, b) => sum + b.totalStockUnits, 0);
    const totalValuation = branchDetails.reduce((sum, b) => sum + b.totalValuation, 0);
    const totalAlerts = branchDetails.reduce((sum, b) => sum + b.lowStockCount + b.outOfStockCount, 0);

    return {
      totalBranches,
      activeBranches,
      totalStaffCount,
      totalProductsCount,
      totalStockUnits,
      totalValuation,
      totalAlerts,
    };
  }, [branches, staffList, productsList, branchDetails]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="All Branches End-to-End Overview"
      description="Consolidated operational breakdown across all branch locations, staff assignments, menu items, and live inventory."
      size="full"
    >
      <div className="space-y-6">
        {/* Top Executive KPI Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {/* Total Branches */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Branches</span>
              <Building2 className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-xl font-bold text-slate-900">{overallMetrics.totalBranches}</p>
            <p className="text-[11px] text-emerald-600 font-medium">
              {overallMetrics.activeBranches} Active for ops
            </p>
          </div>

          {/* Assigned Staff */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Staff</span>
              <Users className="h-4 w-4 text-indigo-600" />
            </div>
            <p className="text-xl font-bold text-slate-900">{overallMetrics.totalStaffCount}</p>
            <p className="text-[11px] text-slate-500">Across all locations</p>
          </div>

          {/* Menu Catalog */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Menu Items</span>
              <UtensilsCrossed className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-xl font-bold text-slate-900">{overallMetrics.totalProductsCount}</p>
            <p className="text-[11px] text-slate-500">Configured catalog</p>
          </div>

          {/* Stock Units */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Stock Units</span>
              <Package className="h-4 w-4 text-sky-600" />
            </div>
            <p className="text-xl font-bold text-slate-900">{overallMetrics.totalStockUnits}</p>
            <p className="text-[11px] text-sky-700 font-medium">Live unit count</p>
          </div>

          {/* Stock Valuation */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Valuation</span>
              <TrendingUp className="h-4 w-4 text-teal-600" />
            </div>
            <p className="text-xl font-bold text-teal-700">{formatCurrency(overallMetrics.totalValuation)}</p>
            <p className="text-[11px] text-slate-500">Aggregate value</p>
          </div>

          {/* Stock Alerts */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Stock Alerts</span>
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-xl font-bold text-amber-700">{overallMetrics.totalAlerts}</p>
            <p className="text-[11px] text-slate-500">Low / Out of stock</p>
          </div>
        </div>

        {/* Search, Filter, Sort & Controls Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 flex-1">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search branch, staff or item..."
                value={searchQuery}
                maxLength={35}
                onChange={(e) => setSearchQuery(e.target.value.slice(0, 35))}
                className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-8 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
              options={[
                { value: 'ALL', label: 'All Statuses' },
                { value: 'ACTIVE', label: 'Active Branches' },
                { value: 'INACTIVE', label: 'Inactive Branches' },
              ]}
            />

            {/* Sort Order */}
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              options={[
                { value: 'NAME', label: 'Sort: Branch Name (A-Z)' },
                { value: 'VALUATION', label: 'Sort: Highest Valuation (₹)' },
                { value: 'PRODUCTS', label: 'Sort: Most Menu Items' },
                { value: 'STAFF', label: 'Sort: Most Assigned Staff' },
                { value: 'ALERTS', label: 'Sort: Most Stock Alerts' },
              ]}
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={expandAll}
              className="text-xs py-1 px-2.5"
            >
              Expand All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={collapseAll}
              className="text-xs py-1 px-2.5"
            >
              Collapse All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAllData}
              leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
              className="text-xs py-1 px-2.5"
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Consolidated Branches List */}
        <div className="space-y-4 max-h-[58vh] overflow-y-auto pr-1">
          {isLoading ? (
            <div className="py-16">
              <LoadingState message="Loading end-to-end branch metrics..." />
            </div>
          ) : loadError ? (
            <div className="p-6">
              <ErrorState message={loadError} onRetry={fetchAllData} />
            </div>
          ) : filteredBranchDetails.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={<Building2 className="h-8 w-8 text-slate-500" />}
                title={searchQuery || statusFilter !== 'ALL' ? 'No matching branches' : 'No branches found'}
                description={
                  searchQuery || statusFilter !== 'ALL'
                    ? 'Try clearing your search query or status filter.'
                    : 'Create your first branch to view comprehensive end-to-end details.'
                }
              />
            </div>
          ) : (
            filteredBranchDetails.map((item) => {
              const {
                branch,
                assignedStaff,
                products,
                totalProducts,
                activeProducts,
                totalStockUnits,
                totalValuation,
                lowStockCount,
                outOfStockCount,
              } = item;

              const isExpanded = expandedBranchIds.has(branch.id);
              const criticalAlerts = lowStockCount + outOfStockCount;

              return (
                <div
                  key={branch.id}
                  className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                    branch.status === 'ACTIVE'
                      ? 'border-slate-200 bg-white shadow-2xs hover:border-emerald-300'
                      : 'border-slate-200 bg-slate-50/80 opacity-80'
                  }`}
                >
                  {/* Branch Summary Header Bar */}
                  <div className="p-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between bg-white border-b border-slate-100">
                    {/* Left: Branch Identity & Date */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                        <Building2 className="h-6 w-6" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-base truncate">{branch.name}</h3>
                          <Badge variant={branch.status === 'ACTIVE' ? 'success' : 'outline'} className="text-[11px]">
                            {branch.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Created {formatDate(branch.createdAt)} • Branch ID: <span className="font-mono text-slate-600">{branch.id.slice(0, 8)}...</span>
                        </p>
                      </div>
                    </div>

                    {/* Middle: 4 Key Summary Pills */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      {/* Staff Pill */}
                      <div className="rounded-lg bg-slate-50 border border-slate-200/80 px-2.5 py-1.5 flex flex-col">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase">Staff</span>
                        <span className="font-bold text-slate-900 flex items-center gap-1">
                          <Users className="h-3 w-3 text-indigo-600" />
                          {assignedStaff.length} Members
                        </span>
                      </div>

                      {/* Menu Items Pill */}
                      <div className="rounded-lg bg-slate-50 border border-slate-200/80 px-2.5 py-1.5 flex flex-col">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase">Menu Items</span>
                        <span className="font-bold text-slate-900 flex items-center gap-1">
                          <UtensilsCrossed className="h-3 w-3 text-emerald-600" />
                          {totalProducts} <span className="text-[10px] text-slate-500 font-normal">({activeProducts} on sale)</span>
                        </span>
                      </div>

                      {/* Stock & Valuation Pill */}
                      <div className="rounded-lg bg-slate-50 border border-slate-200/80 px-2.5 py-1.5 flex flex-col">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase">Valuation</span>
                        <span className="font-bold text-teal-700 font-mono">
                          {formatCurrency(totalValuation)}{' '}
                          <span className="text-[10px] text-slate-500 font-normal">({totalStockUnits} units)</span>
                        </span>
                      </div>

                      {/* Alerts Pill */}
                      <div className="rounded-lg bg-slate-50 border border-slate-200/80 px-2.5 py-1.5 flex flex-col">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase">Stock Alerts</span>
                        {criticalAlerts === 0 ? (
                          <span className="font-bold text-emerald-600 flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3" /> All Stocked
                          </span>
                        ) : (
                          <span className="font-bold text-amber-700 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {criticalAlerts} Alerts{' '}
                            {outOfStockCount > 0 && (
                              <span className="text-[10px] text-rose-600 font-semibold">({outOfStockCount} out)</span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions & Accordion Toggle */}
                    <div className="flex items-center gap-2 justify-end shrink-0">
                      {onOpenBranchMenu && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onOpenBranchMenu(branch)}
                          className="flex items-center gap-1.5 text-xs py-1 px-2.5 bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400 font-semibold shadow-2xs"
                          title={`Manage Menu & Live Stock for ${branch.name}`}
                        >
                          <UtensilsCrossed className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Menu & Stock</span>
                        </Button>
                      )}

                      {onEditBranch && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEditBranch(branch)}
                          className="text-xs py-1 px-2.5 border-slate-200 text-slate-700 hover:border-emerald-500"
                        >
                          Edit
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleBranchExpand(branch.id)}
                        className="text-xs py-1 px-2 text-slate-600 hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
                        title={isExpanded ? 'Collapse breakdown' : 'Expand end-to-end breakdown'}
                      >
                        <span>{isExpanded ? 'Hide' : 'Details'}</span>
                        {isExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Deep-Dive Details Accordion */}
                  {isExpanded && (
                    <div className="p-4 bg-slate-50/70 border-t border-slate-200 space-y-4 animate-in fade-in duration-150">
                      {/* Section 1: Assigned Staff Members */}
                      <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-indigo-600" />
                            Assigned Staff Members ({assignedStaff.length})
                          </h4>
                          <span className="text-[11px] text-slate-500">Authorized operators</span>
                        </div>

                        {assignedStaff.length === 0 ? (
                          <p className="text-xs text-slate-500 italic py-1">
                            No staff members currently assigned to {branch.name}. Assign staff in the Staff management page.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
                            {assignedStaff.map((staff) => (
                              <div
                                key={staff.id}
                                className="flex items-center justify-between p-2 rounded-lg border border-slate-200 bg-slate-50 text-xs"
                              >
                                <div className="min-w-0 pr-2">
                                  <p className="font-semibold text-slate-900 truncate">{staff.name}</p>
                                  <p className="text-[11px] text-slate-500 truncate">{staff.email}</p>
                                </div>
                                <Badge variant={staff.status === 'ACTIVE' ? 'success' : 'outline'} className="text-[10px] shrink-0">
                                  {staff.status}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Section 2: Menu Catalog & Stock Breakdown */}
                      <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                            <UtensilsCrossed className="h-3.5 w-3.5 text-emerald-600" />
                            Menu Items & Live Inventory Stock ({products.length})
                          </h4>
                          {onOpenBranchMenu && (
                            <button
                              type="button"
                              onClick={() => onOpenBranchMenu(branch)}
                              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                            >
                              <span>Manage Branch Menu</span>
                              <ExternalLink className="h-3 w-3" />
                            </button>
                          )}
                        </div>

                        {products.length === 0 ? (
                          <p className="text-xs text-slate-500 italic py-1">
                            No menu items added to {branch.name} yet. Click "Menu & Stock" to create products for this branch.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
                            {products.map((prod) => {
                              const qty = prod.quantity || 0;
                              return (
                                <div
                                  key={prod.id}
                                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs"
                                >
                                  <div className="min-w-0 pr-2">
                                    <p className="font-semibold text-slate-900 truncate">{prod.itemName}</p>
                                    <span className="font-mono font-bold text-emerald-700">
                                      {formatCurrency(prod.price)}
                                    </span>
                                  </div>

                                  <div className="text-right shrink-0">
                                    {qty === 0 ? (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                        Out of stock
                                      </span>
                                    ) : qty < 10 ? (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                        Low: {qty} units
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        {qty} in stock
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Section 3: Critical Stock Alerts (if any) */}
                      {criticalAlerts > 0 && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 space-y-2">
                          <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                            <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                            Inventory Warnings for {branch.name} ({criticalAlerts} Items Requiring Restock)
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {products
                              .filter((p) => (p.quantity || 0) < 10)
                              .map((p) => {
                                const qty = p.quantity || 0;
                                return (
                                  <span
                                    key={p.id}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${
                                      qty === 0
                                        ? 'bg-rose-100 text-rose-800 border-rose-300'
                                        : 'bg-amber-100 text-amber-800 border-amber-300'
                                    }`}
                                  >
                                    <strong>{p.itemName}</strong> ({qty === 0 ? 'Out of Stock' : `${qty} left`})
                                  </span>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <ModalFooter>
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-slate-500">
              Showing <strong className="text-slate-700">{filteredBranchDetails.length}</strong> of {branches.length} branches
            </span>
            <Button variant="outline" onClick={onClose}>
              Close Overview
            </Button>
          </div>
        </ModalFooter>
      </div>
    </Modal>
  );
}
