// ─── Branch 360° End-to-End Details Modal (Org Admin) ─────────────────
// Shows complete 360° operational details for a specific branch when clicked:
// Assigned staff, complete menu catalog, live stock, valuation, and inventory health.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiService } from '@/services/api';
import type { Branch, Staff, ProductWithInventory, InventoryItem } from '@/types';
import {
  Button,
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
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Clock,
  Calendar,
  Layers,
  Edit2,
  Search,
} from 'lucide-react';

export interface BranchDetailsModalProps {
  branch: Branch | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenMenu?: (branch: Branch) => void;
  onEditBranch?: (branch: Branch) => void;
}

type TabType = 'MENU' | 'STAFF' | 'ALERTS' | 'OVERVIEW';

export function BranchDetailsModal({
  branch,
  isOpen,
  onClose,
  onOpenMenu,
  onEditBranch,
}: BranchDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('MENU');
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [productsList, setProductsList] = useState<ProductWithInventory[]>([]);
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Search filter for menu items within this branch
  const [menuSearch, setMenuSearch] = useState('');

  const fetchBranch360Data = useCallback(async () => {
    if (!branch) return;
    setIsLoading(true);
    setLoadError(null);

    try {
      const [staffRes, prodRes, invRes] = await Promise.all([
        apiService.staff.getStaff(),
        apiService.products.getProducts({ branchId: branch.id }),
        apiService.inventory.getInventory({ branchId: branch.id }),
      ]);

      if (staffRes.success) {
        const allStaff: Staff[] = staffRes.data?.items || [];
        const branchStaff = allStaff.filter(
          (s) => Array.isArray(s.assignedBranchIds) && s.assignedBranchIds.includes(branch.id),
        );
        setStaffList(branchStaff);
      }

      const rawProds: ProductWithInventory[] = prodRes.success
        ? Array.isArray(prodRes.data)
          ? prodRes.data
          : prodRes.data?.items || []
        : [];

      const rawInv: InventoryItem[] = invRes.success
        ? Array.isArray(invRes.data)
          ? invRes.data
          : invRes.data?.items || []
        : [];

      setProductsList(rawProds);
      setInventoryList(rawInv);
    } catch {
      setLoadError('Unable to load branch details. Please check connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }, [branch]);

  useEffect(() => {
    if (isOpen && branch) {
      setActiveTab('MENU');
      setMenuSearch('');
      fetchBranch360Data();
    }
  }, [isOpen, branch, fetchBranch360Data]);

  // ─── Unified Products with Quantities for this Branch ─────────────────────
  const unifiedProducts = useMemo(() => {
    return productsList.map((prod) => {
      const invItem = inventoryList.find((i) => i.productId === prod.id);
      const qty = invItem !== undefined ? invItem.quantity : (prod.quantity || 0);

      return {
        ...prod,
        quantity: qty,
      };
    });
  }, [productsList, inventoryList]);

  // ─── Metrics for this Specific Branch ────────────────────────────────────
  const branchMetrics = useMemo(() => {
    const totalProducts = unifiedProducts.length;
    const activeProducts = unifiedProducts.filter((p) => p.status === 'ACTIVE').length;
    const totalStockUnits = unifiedProducts.reduce((sum, p) => sum + (p.quantity || 0), 0);
    const totalValuation = unifiedProducts.reduce((sum, p) => sum + ((p.quantity || 0) * (p.price || 0)), 0);
    const lowStockCount = unifiedProducts.filter((p) => p.quantity > 0 && p.quantity < 10).length;
    const outOfStockCount = unifiedProducts.filter((p) => p.quantity === 0).length;
    const totalAlerts = lowStockCount + outOfStockCount;

    return {
      totalProducts,
      activeProducts,
      totalStockUnits,
      totalValuation,
      lowStockCount,
      outOfStockCount,
      totalAlerts,
    };
  }, [unifiedProducts]);

  // ─── Filtered Menu Items for Tab 1 ────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    if (!menuSearch.trim()) return unifiedProducts;
    const q = menuSearch.toLowerCase().trim();
    return unifiedProducts.filter(
      (p) =>
        p.itemName.toLowerCase().includes(q) ||
        (Array.isArray(p.category) && p.category.some((c) => c.toLowerCase().includes(q))),
    );
  }, [unifiedProducts, menuSearch]);

  if (!branch) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Branch Details: ${branch.name}`}
      description="End-to-end operational details, staff assignments, menu catalog, and live inventory health."
      size="2xl"
    >
      <div className="space-y-5">
        {/* Branch Identity Header Card */}
        <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-slate-50 to-white p-4 shadow-2xs">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm font-bold">
                <Building2 className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-slate-900 text-lg sm:text-xl truncate">{branch.name}</h3>
                  <Badge variant={branch.status === 'ACTIVE' ? 'success' : 'outline'} className="text-xs">
                    {branch.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    Created: {formatDate(branch.createdAt)}
                  </span>
                  <span className="hidden sm:inline">•</span>
                  <span className="font-mono text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                    ID: {branch.id}
                  </span>
                </div>
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              {onOpenMenu && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onOpenMenu(branch);
                  }}
                  className="text-xs font-semibold"
                  leftIcon={<UtensilsCrossed className="h-3.5 w-3.5" />}
                >
                  Manage Menu
                </Button>
              )}
              {onEditBranch && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onEditBranch(branch);
                  }}
                  className="text-xs"
                  leftIcon={<Edit2 className="h-3.5 w-3.5" />}
                >
                  Edit
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* 5 Executive KPI Metric Cards */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
          {/* Staff Assigned */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Staff</span>
              <Users className="h-3.5 w-3.5 text-indigo-600" />
            </div>
            <p className="text-lg font-bold text-slate-900">{staffList.length}</p>
            <p className="text-[10px] text-slate-500">Assigned Operators</p>
          </div>

          {/* Menu Items */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Menu</span>
              <UtensilsCrossed className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <p className="text-lg font-bold text-slate-900">{branchMetrics.totalProducts}</p>
            <p className="text-[10px] text-emerald-600 font-medium">{branchMetrics.activeProducts} Active on sale</p>
          </div>

          {/* Total Units */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Stock Units</span>
              <Package className="h-3.5 w-3.5 text-sky-600" />
            </div>
            <p className="text-lg font-bold text-slate-900">{branchMetrics.totalStockUnits}</p>
            <p className="text-[10px] text-sky-700 font-medium">Units available</p>
          </div>

          {/* Inventory Valuation */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Valuation</span>
              <TrendingUp className="h-3.5 w-3.5 text-teal-600" />
            </div>
            <p className="text-lg font-bold text-teal-700 font-mono">{formatCurrency(branchMetrics.totalValuation)}</p>
            <p className="text-[10px] text-slate-500">Inventory worth</p>
          </div>

          {/* Stock Alerts */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Stock Alerts</span>
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
            </div>
            {branchMetrics.totalAlerts === 0 ? (
              <>
                <p className="text-lg font-bold text-emerald-600">0 Alerts</p>
                <p className="text-[10px] text-emerald-600 flex items-center gap-1 font-medium">
                  <ShieldCheck className="h-3 w-3" /> Fully Stocked
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-bold text-amber-700">{branchMetrics.totalAlerts} Alerts</p>
                <p className="text-[10px] text-amber-700 font-medium">
                  {branchMetrics.outOfStockCount > 0
                    ? `${branchMetrics.outOfStockCount} out of stock`
                    : `${branchMetrics.lowStockCount} low stock`}
                </p>
              </>
            )}
          </div>
        </div>

        {/* 360° Tab Navigation */}
        <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto pb-px">
          <button
            type="button"
            onClick={() => setActiveTab('MENU')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'MENU'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40 rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <UtensilsCrossed className="h-3.5 w-3.5" />
            <span>Menu & Stock ({unifiedProducts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('STAFF')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'STAFF'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40 rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Assigned Staff ({staffList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ALERTS')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'ALERTS'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40 rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            <span>
              Restock Alerts{' '}
              {branchMetrics.totalAlerts > 0 && (
                <span className="inline-flex items-center justify-center px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold ml-1">
                  {branchMetrics.totalAlerts}
                </span>
              )}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('OVERVIEW')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'OVERVIEW'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40 rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Branch Overview</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="min-h-[260px] max-h-[46vh] overflow-y-auto pr-1">
          {isLoading ? (
            <div className="py-12">
              <LoadingState message={`Loading details for ${branch.name}...`} />
            </div>
          ) : loadError ? (
            <div className="p-4">
              <ErrorState message={loadError} onRetry={fetchBranch360Data} />
            </div>
          ) : (
            <>
              {/* TAB 1: MENU & LIVE STOCK */}
              {activeTab === 'MENU' && (
                <div className="space-y-3">
                  {/* Search Bar */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search menu item or category..."
                        value={menuSearch}
                        onChange={(e) => setMenuSearch(e.target.value.slice(0, 30))}
                        className="w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    {onOpenMenu && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onClose();
                          onOpenMenu(branch);
                        }}
                        className="text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                        leftIcon={<ExternalLink className="h-3.5 w-3.5" />}
                      >
                        Adjust Live Stock
                      </Button>
                    )}
                  </div>

                  {filteredProducts.length === 0 ? (
                    <div className="py-8">
                      <EmptyState
                        icon={<UtensilsCrossed className="h-7 w-7 text-slate-400" />}
                        title={menuSearch ? 'No matching products' : 'No menu items configured'}
                        description={
                          menuSearch
                            ? `No items match "${menuSearch}" at this branch.`
                            : `Add products and inventory stock for ${branch.name} to begin serving customers.`
                        }
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {filteredProducts.map((p) => {
                        const isVeg = Array.isArray(p.category) && p.category.some((c) => c.toLowerCase() === 'veg');
                        const isNonVeg = Array.isArray(p.category) && p.category.some((c) => c.toLowerCase() === 'non-veg');
                        const isBeverage = Array.isArray(p.category) && p.category.some((c) => c.toLowerCase() === 'beverage' || c.toLowerCase() === 'drink');
                        const qty = p.quantity || 0;

                        return (
                          <div
                            key={p.id}
                            className={`rounded-xl border p-3 flex items-center justify-between gap-3 ${
                              p.status === 'ACTIVE'
                                ? 'border-slate-200 bg-white shadow-2xs'
                                : 'border-slate-200 bg-slate-50/70 opacity-70'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="font-bold text-slate-900 text-xs truncate">{p.itemName}</h4>
                                {isVeg && (
                                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                    🟢 Veg
                                  </span>
                                )}
                                {isNonVeg && (
                                  <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                    🔴 Non-Veg
                                  </span>
                                )}
                                {isBeverage && (
                                  <span className="text-[10px] font-semibold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
                                    ☕ Drink
                                  </span>
                                )}
                              </div>
                              <span className="font-mono text-sm font-bold text-emerald-700 block mt-1">
                                {formatCurrency(p.price)}
                              </span>
                            </div>

                            <div className="text-right shrink-0">
                              {qty === 0 ? (
                                <span className="inline-flex items-center font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 text-[11px]">
                                  Out of stock
                                </span>
                              ) : qty < 10 ? (
                                <span className="inline-flex items-center font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 text-[11px]">
                                  Low: {qty} units
                                </span>
                              ) : (
                                <span className="inline-flex items-center font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[11px]">
                                  {qty} in stock
                                </span>
                              )}
                              <Badge
                                variant={p.status === 'ACTIVE' ? 'success' : 'outline'}
                                className="text-[10px] block mt-1 text-center"
                              >
                                {p.status}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: ASSIGNED STAFF */}
              {activeTab === 'STAFF' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Authorized staff operators assigned to {branch.name}:</span>
                    <span className="font-semibold text-slate-700">{staffList.length} staff total</span>
                  </div>

                  {staffList.length === 0 ? (
                    <div className="py-8">
                      <EmptyState
                        icon={<Users className="h-7 w-7 text-slate-400" />}
                        title="No staff members assigned"
                        description={`Go to the Staff page to create or assign staff members to ${branch.name}.`}
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {staffList.map((staff) => (
                        <div
                          key={staff.id}
                          className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2 shadow-2xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs border border-indigo-200">
                                {staff.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-slate-900 text-xs truncate">{staff.name}</h4>
                                <p className="text-[11px] text-slate-500 truncate">{staff.email}</p>
                              </div>
                            </div>
                            <Badge variant={staff.status === 'ACTIVE' ? 'success' : 'outline'} className="text-[10px]">
                              {staff.status}
                            </Badge>
                          </div>

                          {/* Permissions summary */}
                          {Array.isArray(staff.permissions) && staff.permissions.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-100">
                              {staff.permissions.slice(0, 3).map((perm) => (
                                <span
                                  key={perm}
                                  className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200"
                                >
                                  {perm.replace('_', ' ')}
                                </span>
                              ))}
                              {staff.permissions.length > 3 && (
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                  +{staff.permissions.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: RESTOCK ALERTS */}
              {activeTab === 'ALERTS' && (
                <div className="space-y-3">
                  {branchMetrics.totalAlerts === 0 ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-6 text-center space-y-2">
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <h4 className="font-bold text-emerald-900 text-sm">All Inventory In Good Health</h4>
                      <p className="text-xs text-emerald-700 max-w-md mx-auto">
                        All configured menu items at {branch.name} have 10 or more units in live stock. No urgent restocking is needed.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex items-start gap-2.5 text-xs text-amber-900">
                        <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                        <div>
                          <p className="font-bold">Inventory Warnings for {branch.name}</p>
                          <p className="mt-0.5 text-amber-800">
                            {branchMetrics.outOfStockCount} items out of stock and {branchMetrics.lowStockCount} items running low. Update stock quantities to prevent counter disruption.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {unifiedProducts
                          .filter((p) => (p.quantity || 0) < 10)
                          .map((p) => {
                            const qty = p.quantity || 0;
                            return (
                              <div
                                key={p.id}
                                className={`rounded-xl border p-3 flex items-center justify-between gap-3 ${
                                  qty === 0
                                    ? 'border-rose-200 bg-rose-50/50'
                                    : 'border-amber-200 bg-amber-50/50'
                                }`}
                              >
                                <div className="min-w-0">
                                  <h4 className="font-bold text-slate-900 text-xs">{p.itemName}</h4>
                                  <p className="text-[11px] text-slate-600 font-mono mt-0.5">
                                    Selling Price: {formatCurrency(p.price)}
                                  </p>
                                </div>

                                <div className="flex items-center gap-3">
                                  <span
                                    className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                      qty === 0
                                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                                    }`}
                                  >
                                    {qty === 0 ? '0 Units (Out)' : `${qty} Units Left`}
                                  </span>

                                  {onOpenMenu && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        onClose();
                                        onOpenMenu(branch);
                                      }}
                                      className="text-xs py-1 px-2 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                                    >
                                      Restock
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: OVERVIEW & SPECS */}
              {activeTab === 'OVERVIEW' && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-2xs text-xs">
                    <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                      Branch Operational Metadata
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700">
                      <div className="space-y-1">
                        <span className="text-slate-500 font-medium">Branch Location Name:</span>
                        <p className="font-semibold text-slate-900">{branch.name}</p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-slate-500 font-medium">Branch Status:</span>
                        <p>
                          <Badge variant={branch.status === 'ACTIVE' ? 'success' : 'outline'}>
                            {branch.status}
                          </Badge>
                        </p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-slate-500 font-medium">Organization ID:</span>
                        <p className="font-mono text-slate-800">{branch.organizationId}</p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-slate-500 font-medium">System Branch ID:</span>
                        <p className="font-mono text-slate-800">{branch.id}</p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-slate-500 font-medium">Created Timestamp:</span>
                        <p className="text-slate-800 flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-400" />
                          {formatDate(branch.createdAt)}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-slate-500 font-medium">Total Inventory Valuation:</span>
                        <p className="font-mono font-bold text-teal-700">
                          {formatCurrency(branchMetrics.totalValuation)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <ModalFooter>
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-slate-500">
              End-to-end details for <strong className="text-slate-700">{branch.name}</strong>
            </span>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </ModalFooter>
      </div>
    </Modal>
  );
}
