// ─── Branch Menu & Inventory Management Modal (Org Admin) ────────────
// Branch-wise food & product menu configuration, live stock levels, and price control.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiService } from '@/services/api';
import { usePermissions } from '@/hooks';
import type { Branch, ProductWithInventory, InventoryItem } from '@/types';
import {
  Button,
  Input,
  Select,
  Badge,
  Modal,
  ModalFooter,
  LoadingState,
  EmptyState,
  ErrorState,
} from '@/components/ui';
import { notify, formatCurrency } from '@/utils';
import { DataTable, type Column } from '@/components/tables';
import { CategorySelector } from '@/features/products/CategorySelector';
import {
  Plus,
  AlertCircle,
  Power,
  Sliders,
  Trash2,
  Search,
  RefreshCw,
} from 'lucide-react';

export interface BranchMenuModalProps {
  branch: Branch | null;
  isOpen: boolean;
  onClose: () => void;
}

export interface UnifiedProductItem extends ProductWithInventory {
  inventoryId?: string;
}

export function BranchMenuModal({ branch, isOpen, onClose }: BranchMenuModalProps) {
  const { hasPermission } = usePermissions();

  const canManageProducts = hasPermission('PRODUCT_MANAGE');
  const canManageInventory = hasPermission('INVENTORY_MANAGE');

  const [products, setProducts] = useState<ProductWithInventory[]>([]);
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusStockFilter, setStatusStockFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Sub-Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProductToDelete, setSelectedProductToDelete] = useState<UnifiedProductItem | null>(null);
  const [selectedInventory, setSelectedInventory] = useState<{
    id: string;
    productId: string;
    productName: string;
    quantity: number;
  } | null>(null);

  // Create Product Form State
  const [formItemName, setFormItemName] = useState('');
  const [formCategories, setFormCategories] = useState<string[]>([]);
  const [formPrice, setFormPrice] = useState('');
  const [formStockQty, setFormStockQty] = useState('0');
  const [formStatus, setFormStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [modalApiError, setModalApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stock Adjustment Form State
  const [adjustQtyInput, setAdjustQtyInput] = useState('');
  const [qtyError, setQtyError] = useState<string | null>(null);

  // ─── Fetch Branch Menu Data ───────────────────────────────────────────────
  const fetchBranchMenu = useCallback(async () => {
    if (!branch) return;
    setIsLoading(true);
    setLoadError(null);

    try {
      const [prodRes, invRes] = await Promise.all([
        apiService.products.getProducts({ branchId: branch.id }),
        apiService.inventory.getInventory({ branchId: branch.id }),
      ]);

      if (!prodRes.success) {
        setLoadError(prodRes.error.message || 'Failed to load branch menu');
        return;
      }

      const rawProducts: ProductWithInventory[] = Array.isArray(prodRes.data)
        ? prodRes.data
        : prodRes.data?.items || [];

      const rawInventory: InventoryItem[] = invRes.success
        ? Array.isArray(invRes.data)
          ? invRes.data
          : invRes.data?.items || []
        : [];

      setProducts(rawProducts);
      setInventoryList(rawInventory);
    } catch {
      setLoadError('Unable to connect to the server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [branch]);

  useEffect(() => {
    if (isOpen && branch) {
      fetchBranchMenu();
    }
  }, [isOpen, branch, fetchBranchMenu]);

  // ─── Unified Product List ────────────────────────────────────────────────
  const unifiedProducts = useMemo<UnifiedProductItem[]>(() => {
    return products.map((product) => {
      const matchingInv = inventoryList.find((i) => i.productId === product.id);
      const totalQty = matchingInv !== undefined ? matchingInv.quantity : (product.quantity || 0);
      const inventoryId = matchingInv?.id;

      return {
        ...product,
        quantity: totalQty,
        branchName: branch?.name,
        inventoryId,
      };
    });
  }, [products, inventoryList, branch?.name]);

  // ─── Filtered Products ───────────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    return unifiedProducts.filter((product) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = product.itemName.toLowerCase().includes(q);
        const matchesCat = Array.isArray(product.category) && product.category.some((c) => c.toLowerCase().includes(q));
        if (!matchesName && !matchesCat) return false;
      }

      if (categoryFilter !== 'ALL') {
        const catLower = categoryFilter.toLowerCase();
        const hasCat = Array.isArray(product.category) && product.category.some((c) => c.toLowerCase() === catLower);
        if (!hasCat) return false;
      }

      if (statusStockFilter === 'ACTIVE' && product.status !== 'ACTIVE') return false;
      if (statusStockFilter === 'INACTIVE' && product.status !== 'INACTIVE') return false;
      if (statusStockFilter === 'IN_STOCK' && product.quantity < 10) return false;
      if (statusStockFilter === 'LOW_STOCK' && (product.quantity <= 0 || product.quantity >= 10)) return false;
      if (statusStockFilter === 'OUT_OF_STOCK' && product.quantity > 0) return false;

      return true;
    });
  }, [unifiedProducts, searchQuery, categoryFilter, statusStockFilter]);

  // ─── Summary Metrics ─────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const totalProducts = unifiedProducts.length;
    const activeProducts = unifiedProducts.filter((p) => p.status === 'ACTIVE').length;
    const totalUnits = unifiedProducts.reduce((sum, p) => sum + (p.quantity || 0), 0);
    const totalValuation = unifiedProducts.reduce((sum, p) => sum + ((p.quantity || 0) * p.price), 0);
    const lowStock = unifiedProducts.filter((p) => p.quantity > 0 && p.quantity < 10).length;
    const outOfStock = unifiedProducts.filter((p) => p.quantity === 0).length;

    return { totalProducts, activeProducts, totalUnits, totalValuation, lowStock, outOfStock };
  }, [unifiedProducts]);

  // ─── Handlers: Add Product ───────────────────────────────────────────────
  const handleOpenCreate = () => {
    setFormItemName('');
    setFormCategories([]);
    setFormPrice('');
    setFormStockQty('0');
    setFormStatus('ACTIVE');
    setFormErrors({});
    setModalApiError(null);
    setShowCreateModal(true);
  };

  const validateProductForm = () => {
    const errs: Record<string, string> = {};
    if (!formItemName.trim()) errs.itemName = 'Product name is required';
    if (formItemName.trim().length > 40) errs.itemName = 'Product name must be 40 characters or less';
    if (!formCategories || formCategories.length === 0) errs.categories = 'Select at least one category';

    const priceNum = parseFloat(formPrice);
    if (isNaN(priceNum) || priceNum <= 0) errs.price = 'Price must be greater than 0';

    const qtyNum = parseInt(formStockQty, 10);
    if (isNaN(qtyNum) || qtyNum < 0) errs.stockQty = 'Initial stock quantity must be 0 or more';

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreateProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branch || !validateProductForm()) return;

    setModalApiError(null);
    setIsSubmitting(true);

    try {
      const res = await apiService.products.createProduct({
        itemName: formItemName.trim(),
        category: formCategories,
        price: Math.round(parseFloat(formPrice)),
        branchId: branch.id,
        initialQuantity: parseInt(formStockQty, 10),
        status: formStatus,
      });

      if (!res.success) {
        setModalApiError(res.error.message || 'Failed to create product');
        return;
      }

      notify.success(`Product "${res.data.itemName}" added to ${branch.name}`);
      setShowCreateModal(false);
      fetchBranchMenu();
    } catch {
      setModalApiError('An unexpected network error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Handlers: Toggle Status ─────────────────────────────────────────────
  const handleToggleStatus = async (product: UnifiedProductItem) => {
    const newStatus = product.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await apiService.products.updateProduct(product.id, { status: newStatus });
      if (!res.success) {
        notify.error(res.error.message || `Failed to ${newStatus.toLowerCase()} product`);
        return;
      }
      notify.success(`Product "${product.itemName}" set to ${newStatus}`);
      fetchBranchMenu();
    } catch {
      notify.error('Network error. Unable to change status.');
    }
  };

  // ─── Handlers: Adjust Stock ──────────────────────────────────────────────
  const handleOpenAdjust = (product: UnifiedProductItem) => {
    const invItem = inventoryList.find((i) => i.productId === product.id);
    setSelectedInventory({
      id: invItem?.id || product.inventoryId || product.id,
      productId: product.id,
      productName: product.itemName,
      quantity: product.quantity || 0,
    });
    setAdjustQtyInput((product.quantity || 0).toString());
    setQtyError(null);
    setModalApiError(null);
    setShowAdjustModal(true);
  };

  const handleStepAdjustment = (delta: number) => {
    const current = parseInt(adjustQtyInput, 10) || 0;
    const nextVal = Math.max(0, current + delta);
    setAdjustQtyInput(nextVal.toString());
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInventory || !branch) return;

    const newQty = parseInt(adjustQtyInput, 10);
    if (isNaN(newQty)) {
      setQtyError('Please enter a valid numeric quantity');
      return;
    }

    if (newQty < 0) {
      setQtyError('Stock quantity cannot be negative');
      return;
    }

    setQtyError(null);
    setModalApiError(null);
    setIsSubmitting(true);

    try {
      const res = await apiService.inventory.updateInventoryQuantity(
        selectedInventory.id,
        newQty,
      );

      if (!res.success) {
        setModalApiError(res.error.message || 'Failed to adjust stock quantity');
        return;
      }

      notify.success(`Stock for ${selectedInventory.productName} updated to ${newQty} units`);
      setShowAdjustModal(false);
      fetchBranchMenu();
    } catch {
      setModalApiError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Handlers: Delete Product ────────────────────────────────────────────
  const handleOpenDeleteProduct = (product: UnifiedProductItem) => {
    setSelectedProductToDelete(product);
    setModalApiError(null);
    setShowDeleteModal(true);
  };

  const handleDeleteProductSubmit = async () => {
    if (!selectedProductToDelete) return;
    setIsSubmitting(true);
    setModalApiError(null);

    try {
      const res = await apiService.products.deleteProduct(selectedProductToDelete.id);
      if (!res.success) {
        setModalApiError(res.error.message || 'Failed to archive product');
        return;
      }

      notify.success(`Product '${selectedProductToDelete.itemName}' archived successfully`);
      setShowDeleteModal(false);
      fetchBranchMenu();
    } catch {
      setModalApiError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Table Columns ───────────────────────────────────────────────────────
  const productColumns: Column<UnifiedProductItem>[] = useMemo(() => [
    {
      key: 'itemName',
      header: 'Item Name',
      className: 'min-w-[170px]',
      render: (p: UnifiedProductItem) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900 text-sm">{p.itemName}</span>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      className: 'min-w-[130px]',
      render: (p: UnifiedProductItem) => {
        const isVeg = Array.isArray(p.category) && p.category.some((c) => c.toLowerCase() === 'veg');
        const isNonVeg = Array.isArray(p.category) && p.category.some((c) => c.toLowerCase() === 'non-veg');
        const isBeverage = Array.isArray(p.category) && p.category.some((c) => c.toLowerCase() === 'beverage' || c.toLowerCase() === 'drink');
        const otherCategories = Array.isArray(p.category)
          ? p.category.filter((c) => !['veg', 'non-veg', 'beverage', 'drink'].includes(c.toLowerCase()))
          : [];

        return (
          <div className="flex flex-wrap items-center gap-1">
            {isVeg && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                🟢 Veg
              </span>
            )}
            {isNonVeg && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                🔴 Non-Veg
              </span>
            )}
            {isBeverage && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                ☕ Drink
              </span>
            )}
            {otherCategories.map((cat) => (
              <span key={cat} className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                {cat}
              </span>
            ))}
            {!isVeg && !isNonVeg && !isBeverage && otherCategories.length === 0 && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                Food
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'price',
      header: 'Price',
      className: 'whitespace-nowrap',
      render: (p: UnifiedProductItem) => (
        <span className="font-mono text-sm font-bold text-emerald-700">
          {formatCurrency(p.price)}
        </span>
      ),
    },
    {
      key: 'quantity',
      header: 'Branch Stock',
      className: 'whitespace-nowrap',
      render: (p: UnifiedProductItem) => {
        if (p.quantity === 0) {
          return (
            <span className="inline-flex items-center font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 text-xs">
              Out of stock (0)
            </span>
          );
        }
        if (p.quantity < 10) {
          return (
            <span className="inline-flex items-center font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 text-xs">
              Low: {p.quantity} units
            </span>
          );
        }
        return (
          <span className="inline-flex items-center font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-xs">
            {p.quantity} in stock
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      className: 'whitespace-nowrap',
      render: (p: UnifiedProductItem) => (
        <Badge variant={p.status === 'ACTIVE' ? 'success' : 'danger'} className="text-xs">
          {p.status === 'ACTIVE' ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right whitespace-nowrap',
      render: (p: UnifiedProductItem) => (
        <div className="flex items-center justify-end gap-1.5">
          {canManageInventory && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs py-1 px-2 border-slate-200 text-slate-700 hover:border-emerald-500 hover:text-emerald-700"
              onClick={() => handleOpenAdjust(p)}
              leftIcon={<Sliders className="h-3.5 w-3.5" />}
              title="Adjust Live Stock"
            >
              Stock
            </Button>
          )}

          {canManageProducts && (
            <Button
              variant={p.status === 'ACTIVE' ? 'ghost' : 'outline'}
              size="sm"
              className="text-xs py-1 px-2"
              onClick={() => handleToggleStatus(p)}
              leftIcon={<Power className="h-3.5 w-3.5" />}
              title={p.status === 'ACTIVE' ? 'Deactivate product' : 'Activate product'}
            >
              {p.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
            </Button>
          )}

          {canManageProducts && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenDeleteProduct(p)}
              className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5"
              title="Archive product"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ], [canManageInventory, canManageProducts]);

  if (!branch) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Branch Menu: ${branch.name}`}
        description={`Manage food catalog items, categories, pricing, and live inventory stock for ${branch.name}.`}
        size="2xl"
      >
        <div className="space-y-5">
          {/* Summary Metric Cards for this Branch */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1">
              <span className="text-[11px] font-medium text-slate-500">Menu Items</span>
              <p className="text-base font-bold text-slate-900">{metrics.totalProducts}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1">
              <span className="text-[11px] font-medium text-slate-500">Active for Sale</span>
              <p className="text-base font-bold text-emerald-700">{metrics.activeProducts}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1">
              <span className="text-[11px] font-medium text-slate-500">Stock Units</span>
              <p className="text-base font-bold text-sky-700">{metrics.totalUnits}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1">
              <span className="text-[11px] font-medium text-slate-500">Stock Valuation</span>
              <p className="text-base font-bold text-teal-700">{formatCurrency(metrics.totalValuation)}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1 col-span-2 sm:col-span-1">
              <span className="text-[11px] font-medium text-slate-500">Stock Alerts</span>
              <p className="text-base font-bold text-amber-700">
                {metrics.lowStock + metrics.outOfStock}{' '}
                <span className="text-[10px] font-normal text-slate-500">({metrics.outOfStock} out)</span>
              </p>
            </div>
          </div>

          {/* Search, Filter Bar & Add Product */}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search item or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value.slice(0, 30))}
                  className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <Select
                value={statusStockFilter}
                onChange={(e) => setStatusStockFilter(e.target.value)}
                options={[
                  { value: 'ALL', label: 'All Statuses & Stock' },
                  { value: 'ACTIVE', label: 'Active for Sale' },
                  { value: 'INACTIVE', label: 'Inactive / Hidden' },
                  { value: 'IN_STOCK', label: 'In Stock (>= 10)' },
                  { value: 'LOW_STOCK', label: 'Low Stock (< 10)' },
                  { value: 'OUT_OF_STOCK', label: 'Out of Stock (0)' },
                ]}
              />

              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                options={[
                  { value: 'ALL', label: 'All Categories' },
                  { value: 'Veg', label: 'Veg' },
                  { value: 'Non-Veg', label: 'Non-Veg' },
                  { value: 'Beverage', label: 'Beverage' },
                  { value: 'Snack', label: 'Snack' },
                  { value: 'Breakfast', label: 'Breakfast' },
                  { value: 'Lunch', label: 'Lunch' },
                ]}
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchBranchMenu}
                leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                className="text-xs"
              >
                Refresh
              </Button>
              {canManageProducts && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleOpenCreate}
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                  className="text-xs font-semibold"
                >
                  Add Product
                </Button>
              )}
            </div>
          </div>

          {/* Menu Table */}
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white max-h-[50vh] overflow-y-auto">
            {isLoading ? (
              <div className="py-12">
                <LoadingState message="Loading branch menu items..." />
              </div>
            ) : loadError ? (
              <div className="p-6">
                <ErrorState message={loadError} onRetry={fetchBranchMenu} />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="py-10">
                <EmptyState
                  title={
                    searchQuery || statusStockFilter !== 'ALL' || categoryFilter !== 'ALL'
                      ? 'No matching products'
                      : 'No items in this branch menu yet'
                  }
                  description={
                    searchQuery || statusStockFilter !== 'ALL' || categoryFilter !== 'ALL'
                      ? 'Try clearing your search or category filters.'
                      : `Add menu items and stock for ${branch.name} to start selling at counter.`
                  }
                  action={
                    searchQuery || statusStockFilter !== 'ALL' || categoryFilter !== 'ALL' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearchQuery('');
                          setStatusStockFilter('ALL');
                          setCategoryFilter('ALL');
                        }}
                      >
                        Clear Filters
                      </Button>
                    ) : canManageProducts ? (
                      <Button variant="primary" size="sm" onClick={handleOpenCreate} leftIcon={<Plus className="h-3.5 w-3.5" />}>
                        Add First Product
                      </Button>
                    ) : undefined
                  }
                />
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block">
                  <DataTable<UnifiedProductItem>
                    data={filteredProducts}
                    columns={productColumns}
                    keyExtractor={(item) => item.id}
                    rowClassName={(item) =>
                      item.status !== 'ACTIVE' ? 'opacity-70 bg-slate-50' : undefined
                    }
                  />
                </div>

                {/* Mobile Card List View (Optimized for phones/tablets) */}
                <div className="md:hidden divide-y divide-slate-100 p-2 space-y-2.5">
                  {filteredProducts.map((p) => {
                    const isVeg = Array.isArray(p.category) && p.category.some((c) => c.toLowerCase() === 'veg');
                    const isNonVeg = Array.isArray(p.category) && p.category.some((c) => c.toLowerCase() === 'non-veg');
                    const isBeverage = Array.isArray(p.category) && p.category.some((c) => c.toLowerCase() === 'beverage' || c.toLowerCase() === 'drink');
                    const otherCategories = Array.isArray(p.category)
                      ? p.category.filter((c) => !['veg', 'non-veg', 'beverage', 'drink'].includes(c.toLowerCase()))
                      : [];

                    return (
                      <div
                        key={p.id}
                        className={`rounded-xl border p-3.5 space-y-3 transition-all ${
                          p.status === 'ACTIVE'
                            ? 'border-slate-200 bg-white shadow-2xs'
                            : 'border-slate-200 bg-slate-50/80 opacity-75'
                        }`}
                      >
                        {/* Card Header: Item Name, Price & Status */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-900 text-sm">{p.itemName}</h4>
                            <div className="flex flex-wrap items-center gap-1 mt-1">
                              {isVeg && (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  🟢 Veg
                                </span>
                              )}
                              {isNonVeg && (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  🔴 Non-Veg
                                </span>
                              )}
                              {isBeverage && (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                                  ☕ Drink
                                </span>
                              )}
                              {otherCategories.map((cat) => (
                                <span key={cat} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                  {cat}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="font-mono text-base font-bold text-emerald-700 block">
                              {formatCurrency(p.price)}
                            </span>
                            <Badge variant={p.status === 'ACTIVE' ? 'success' : 'danger'} className="text-[10px] mt-1">
                              {p.status}
                            </Badge>
                          </div>
                        </div>

                        {/* Card Stock Pill */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                          <span className="text-slate-500 font-medium">Branch Live Stock:</span>
                          {p.quantity === 0 ? (
                            <span className="inline-flex items-center font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 text-xs">
                              Out of stock (0)
                            </span>
                          ) : p.quantity < 10 ? (
                            <span className="inline-flex items-center font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 text-xs">
                              Low: {p.quantity} units
                            </span>
                          ) : (
                            <span className="inline-flex items-center font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 text-xs">
                              {p.quantity} in stock
                            </span>
                          )}
                        </div>

                        {/* Mobile Card Action Buttons */}
                        <div className="grid grid-cols-3 gap-2 pt-1">
                          {canManageInventory && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full text-xs py-1.5 justify-center border-slate-200 text-slate-700 hover:border-emerald-500 hover:text-emerald-700"
                              onClick={() => handleOpenAdjust(p)}
                              leftIcon={<Sliders className="h-3.5 w-3.5" />}
                            >
                              Stock
                            </Button>
                          )}

                          {canManageProducts && (
                            <Button
                              variant={p.status === 'ACTIVE' ? 'ghost' : 'outline'}
                              size="sm"
                              className="w-full text-xs py-1.5 justify-center"
                              onClick={() => handleToggleStatus(p)}
                              leftIcon={<Power className="h-3.5 w-3.5" />}
                            >
                              {p.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                            </Button>
                          )}

                          {canManageProducts && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDeleteProduct(p)}
                              className="w-full text-xs py-1.5 justify-center text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                              leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                            >
                              Archive
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <ModalFooter>
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-slate-500">
                Showing <strong className="text-slate-700">{filteredProducts.length}</strong> of {unifiedProducts.length} items configured for {branch.name}
              </span>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </ModalFooter>
        </div>
      </Modal>

      {/* ─── ADD PRODUCT TO BRANCH MODAL ─── */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={`Add Product to ${branch.name}`}
        description={`This product will be immediately available in the ${branch.name} menu catalog.`}
        size="lg"
      >
        <form onSubmit={handleCreateProductSubmit} className="space-y-4">
          {modalApiError && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 p-3 text-sm text-rose-700 border border-rose-500/20">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
              <span>{modalApiError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Product / Food Name <span className="text-rose-500">*</span>
            </label>
            <Input
              placeholder="e.g. Chicken Roll, Veg Burger, Masala Chai"
              value={formItemName}
              maxLength={40}
              onChange={(e) => setFormItemName(e.target.value.slice(0, 40))}
              error={formErrors.itemName}
              autoFocus
            />
          </div>

          <div>
            <CategorySelector
              selectedCategories={formCategories}
              onChange={(cats) => setFormCategories(cats)}
              error={formErrors.categories}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Selling Price (₹) <span className="text-rose-500">*</span>
              </label>
              <Input
                type="number"
                placeholder="e.g. 120"
                min="1"
                step="1"
                value={formPrice}
                onChange={(e) => setFormPrice(e.target.value)}
                error={formErrors.price}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Initial Stock Quantity (Units)
              </label>
              <Input
                type="number"
                placeholder="0"
                min="0"
                step="1"
                value={formStockQty}
                onChange={(e) => setFormStockQty(e.target.value)}
                error={formErrors.stockQty}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Initial Sale Status
            </label>
            <Select
              value={formStatus}
              onChange={(e) => setFormStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
              options={[
                { value: 'ACTIVE', label: 'Active (Available for Counter Sales)' },
                { value: 'INACTIVE', label: 'Inactive (Hidden / Draft)' },
              ]}
            />
          </div>

          <ModalFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => setShowCreateModal(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              disabled={isSubmitting}
            >
              Add Product to Menu
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* ─── ADJUST LIVE STOCK MODAL ─── */}
      <Modal
        isOpen={showAdjustModal}
        onClose={() => setShowAdjustModal(false)}
        title="Adjust Live Stock"
        description={
          selectedInventory
            ? `Update stock quantity for "${selectedInventory.productName}" at ${branch.name}.`
            : undefined
        }
      >
        {selectedInventory && (
          <form onSubmit={handleAdjustSubmit} className="space-y-4">
            {modalApiError && (
              <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 p-3 text-sm text-rose-700 border border-rose-500/20">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                <span>{modalApiError}</span>
              </div>
            )}

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Item Name:</span>
                <span className="font-semibold text-slate-800">{selectedInventory.productName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Branch Location:</span>
                <span className="font-semibold text-slate-800">{branch.name}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <span className="text-slate-500">Current Stock:</span>
                <span className="font-mono font-bold text-emerald-700">
                  {selectedInventory.quantity} units
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                New Target Stock Quantity <span className="text-rose-500">*</span>
              </label>
              <Input
                type="number"
                min="0"
                value={adjustQtyInput}
                onChange={(e) => {
                  setAdjustQtyInput(e.target.value);
                  if (qtyError) setQtyError(null);
                }}
                error={qtyError ?? undefined}
                autoFocus
              />
            </div>

            {/* Quick Adjustment Delta Buttons */}
            <div>
              <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Quick Adjustments:
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs font-semibold py-2 hover:border-emerald-500 hover:text-emerald-700 justify-center"
                  onClick={() => handleStepAdjustment(1)}
                >
                  +1
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs font-semibold py-2 hover:border-emerald-500 hover:text-emerald-700 justify-center"
                  onClick={() => handleStepAdjustment(5)}
                >
                  +5
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs font-semibold py-2 hover:border-emerald-500 hover:text-emerald-700 justify-center"
                  onClick={() => handleStepAdjustment(10)}
                >
                  +10
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs font-semibold py-2 hover:border-rose-500 hover:text-rose-700 justify-center"
                  onClick={() => handleStepAdjustment(-1)}
                >
                  -1
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs font-semibold py-2 hover:border-rose-500 hover:text-rose-700 justify-center"
                  onClick={() => handleStepAdjustment(-5)}
                >
                  -5
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs font-semibold py-2 hover:border-rose-500 hover:text-rose-700 justify-center"
                  onClick={() => handleStepAdjustment(-10)}
                >
                  -10
                </Button>
              </div>
            </div>

            <ModalFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => setShowAdjustModal(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                disabled={isSubmitting}
              >
                Update Stock
              </Button>
            </ModalFooter>
          </form>
        )}
      </Modal>

      {/* ─── ARCHIVE / DELETE PRODUCT MODAL ─── */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Archive Product"
        description="Hide product from menu while preserving sales history"
      >
        <div className="space-y-4">
          {modalApiError && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 p-3 text-sm text-rose-700 border border-rose-500/20">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
              <span>{modalApiError}</span>
            </div>
          )}

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
            <p className="text-sm text-slate-800 font-medium">
              Are you sure you want to archive{' '}
              <span className="text-emerald-700 font-bold font-mono">
                {selectedProductToDelete?.itemName}
              </span>
              ?
            </p>
            <p className="text-xs text-slate-600 leading-relaxed">
              This product will be deactivated and removed from the active menu. All historical customer purchase and receipt logs will be preserved.
            </p>
          </div>

          <ModalFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => setShowDeleteModal(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              type="button"
              onClick={handleDeleteProductSubmit}
              isLoading={isSubmitting}
              disabled={isSubmitting}
            >
              Confirm Archive
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </>
  );
}
