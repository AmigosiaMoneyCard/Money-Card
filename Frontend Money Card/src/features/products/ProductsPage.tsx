// ─── Products & Inventory Unified Hub (Org Admin) ──────────────────────────
// Merged single view: Product catalog, live branch stock, pricing, and adjustments.

import { useState, useEffect, useCallback, useMemo, useRef, type FormEvent } from 'react';
import { apiService } from '@/services/api';
import { useBranch, usePermissions } from '@/hooks';
import type { ProductWithInventory, Branch, InventoryItem } from '@/types';
import {
  Button,
  Input,
  Select,
  Card,
  Badge,
  Modal,
  ModalFooter,
  LoadingState,
  EmptyState,
  ErrorState,
} from '@/components/ui';
import { notify, formatCurrency } from '@/utils';
import { UnauthorizedPage } from '@/features/auth';
import { DataTable, type Column } from '@/components/tables';
import {
  Package,
  AlertCircle,
  Power,
  Layers,
  Trash2,
  Search,
  Building2,
} from 'lucide-react';

export interface InventoryItemWithDetails extends InventoryItem {
  productName: string;
  category: string[];
  price: number;
  branchName: string;
}

export interface UnifiedProductItem extends ProductWithInventory {
  inventoryId?: string;
}

interface ProductsPageProps {
  defaultTab?: string;
}

interface ProductsMetrics {
  totalProducts: number;
  activeProducts: number;
  totalUnits: number;
  totalValuation: number;
  lowStock: number;
  outOfStock: number;
}

function matchesProductSearch(product: UnifiedProductItem, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase().trim();
  if (product.itemName.toLowerCase().includes(q)) return true;
  return Array.isArray(product.category) && product.category.some((c) => c.toLowerCase().includes(q));
}

function matchesProductCategory(product: UnifiedProductItem, category: string): boolean {
  if (category === 'ALL') return true;
  const catLower = category.toLowerCase();
  return Array.isArray(product.category) && product.category.some((c) => c.toLowerCase() === catLower);
}

function matchesProductStockStatus(product: UnifiedProductItem, filter: string): boolean {
  switch (filter) {
    case 'ACTIVE':
      return product.status === 'ACTIVE';
    case 'INACTIVE':
      return product.status === 'INACTIVE';
    case 'IN_STOCK':
      return product.quantity >= 10;
    case 'LOW_STOCK':
      return product.quantity > 0 && product.quantity < 10;
    case 'OUT_OF_STOCK':
      return product.quantity === 0;
    default:
      return true;
  }
}

function matchesProductFilter(
  product: UnifiedProductItem,
  query: string,
  category: string,
  statusStock: string,
): boolean {
  return (
    matchesProductSearch(product, query) &&
    matchesProductCategory(product, category) &&
    matchesProductStockStatus(product, statusStock)
  );
}

function ProductsMetricsCards({ metrics }: { metrics: ProductsMetrics }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Card padding="md" className="space-y-1">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-semibold uppercase tracking-wider">Catalog Items</span>
          <Package className="h-4 w-4 text-emerald-600" />
        </div>
        <p className="text-xl font-bold text-slate-900">{metrics.totalProducts}</p>
        <p className="text-[11px] text-slate-500">Menu products in catalog</p>
      </Card>

      <Card padding="md" className="space-y-1">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-semibold uppercase tracking-wider">Active for Sale</span>
          <Layers className="h-4 w-4 text-indigo-600" />
        </div>
        <p className="text-xl font-bold text-emerald-700">{metrics.activeProducts}</p>
        <p className="text-[11px] text-slate-500">Available at POS terminals</p>
      </Card>

      <Card padding="md" className="space-y-1">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-semibold uppercase tracking-wider">Inactive / Hidden</span>
          <Power className="h-4 w-4 text-slate-400" />
        </div>
        <p className="text-xl font-bold text-slate-700">{metrics.totalProducts - metrics.activeProducts}</p>
        <p className="text-[11px] text-slate-500">Hidden from POS sale</p>
      </Card>
    </div>
  );
}

interface ProductCounterModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: UnifiedProductItem | null;
  branches: Branch[];
  onUpdated: () => void;
}

function ProductCounterModal({
  isOpen,
  onClose,
  product,
  branches,
  onUpdated,
}: ProductCounterModalProps) {
  const [mode, setMode] = useState<'move' | 'copy'>('move');
  const [targetBranchId, setTargetBranchId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && product) {
      setMode('move');
      setTargetBranchId(product.branchId || '');
      setApiError(null);
    }
  }, [isOpen, product]);

  if (!product) return null;

  const currentCounterName =
    branches.find((b) => b.id === product.branchId)?.name ||
    product.branchName ||
    'All Counters (Global Menu)';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setIsSubmitting(true);

    try {
      const targetName =
        targetBranchId === ''
          ? 'All Counters (Global Menu)'
          : branches.find((b) => b.id === targetBranchId)?.name || 'selected counter';

      if (mode === 'move') {
        const res = await apiService.products.updateProduct(product.id, {
          branchId: targetBranchId || '',
        });
        if (!res.success) {
          setApiError(res.error.message || 'Failed to reassign counter');
          return;
        }
        notify.success(`Moved "${product.itemName}" to ${targetName}`);
      } else {
        const res = await apiService.products.createProduct({
          itemName: product.itemName,
          price: product.price,
          category: product.category,
          branchId: targetBranchId || undefined,
          status: 'ACTIVE',
        });
        if (!res.success) {
          setApiError(res.error.message || 'Failed to copy item to counter');
          return;
        }
        notify.success(`Copied "${product.itemName}" to ${targetName}`);
      }
      onClose();
      onUpdated();
    } catch {
      setApiError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isSubmitting && onClose()}
      title="Counter Assignment & Sharing"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {apiError && (
          <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">Action Failed</p>
              <p>{apiError}</p>
            </div>
          </div>
        )}

        {/* Item Summary Card */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-900 text-sm">{product.itemName}</h4>
            <span className="font-mono text-emerald-700 font-bold text-sm">
              {formatCurrency(product.price)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Currently assigned to:</span>
            <span className="font-semibold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
              🏪 {currentCounterName}
            </span>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setMode('move')}
            className={`py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'move'
                ? 'bg-white text-emerald-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🔄 Move Counter</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('copy')}
            className={`py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'copy'
                ? 'bg-white text-emerald-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>📋 Copy to Counter</span>
          </button>
        </div>

        {/* Explanatory text */}
        <p className="text-xs text-slate-600 leading-relaxed">
          {mode === 'move'
            ? `Transfer "${product.itemName}" to another counter. It will no longer appear on ${currentCounterName}.`
            : `Duplicate "${product.itemName}" to another counter. It will be available at both ${currentCounterName} and the new counter.`}
        </p>

        {/* Counter Dropdown */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            {mode === 'move' ? 'New Assigned Counter' : 'Target Counter for Copy'}
          </label>
          <select
            value={targetBranchId}
            onChange={(e) => setTargetBranchId(e.target.value)}
            disabled={isSubmitting}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden cursor-pointer"
          >
            <option value="">All Counters (Global Menu)</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <ModalFooter>
          <Button variant="ghost" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isSubmitting}>
            {mode === 'move' ? 'Confirm Counter Move' : 'Duplicate Item to Counter'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

// ─── ⚡ Rapid Quick-Add Bar Component ────────────────────────────────────────
interface QuickAddProductBarProps {
  branches: Branch[];
  currentBranchId: string;
  onSuccess: () => void;
}

function QuickAddProductBar({
  branches,
  currentBranchId,
  onSuccess,
}: QuickAddProductBarProps) {
  const [itemName, setItemName] = useState('');
  const [price, setPrice] = useState('');
  const [isVeg, setIsVeg] = useState(true);
  const [selectedBranchId, setSelectedBranchId] = useState(currentBranchId || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const itemNameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSelectedBranchId(currentBranchId || '');
  }, [currentBranchId]);

  const handleQuickAdd = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    const trimmedName = itemName.trim();
    if (!trimmedName) {
      notify.error('Please enter an item name');
      itemNameInputRef.current?.focus();
      return;
    }
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      notify.error('Please enter a valid price greater than 0');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiService.products.createProduct({
        itemName: trimmedName,
        price: Math.round(numPrice),
        category: [isVeg ? 'Veg' : 'Non-Veg'],
        branchId: selectedBranchId || undefined,
        status: 'ACTIVE',
      });

      if (!res.success) {
        notify.error(res.error.message || 'Failed to add product');
        return;
      }

      notify.success(`"${trimmedName}" (₹${Math.round(numPrice)}) added to menu!`);
      setItemName('');
      setPrice('');
      itemNameInputRef.current?.focus();
      onSuccess();
    } catch {
      notify.error('Failed to add product. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-emerald-200/90 bg-gradient-to-r from-emerald-50/70 via-white to-emerald-50/40 p-4 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold shadow-xs">
            ⚡
          </span>
          <h3 className="text-sm font-bold text-slate-900">
            Quick Add Menu Item
          </h3>
          <span className="text-xs text-slate-500 hidden sm:inline">
            Type name & price, hit Enter to add items continuously
          </span>
        </div>
      </div>

      <form onSubmit={handleQuickAdd} className="grid grid-cols-1 gap-2.5 sm:grid-cols-12 sm:items-center">
        {/* Item Name (5 cols) */}
        <div className="sm:col-span-5">
          <input
            ref={itemNameInputRef}
            type="text"
            placeholder="Item name (e.g. Samosa, Masala Chai, Cold Coffee)"
            value={itemName}
            onChange={(e) => setItemName(e.target.value.slice(0, 40))}
            maxLength={40}
            disabled={isSubmitting}
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden"
          />
        </div>

        {/* Price (2 cols) */}
        <div className="sm:col-span-2 relative">
          <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₹</span>
          <input
            type="number"
            step="1"
            min="1"
            placeholder="Price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            disabled={isSubmitting}
            className="w-full rounded-xl border border-slate-300 bg-white pl-7 pr-3 py-2 text-xs font-bold text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden"
          />
        </div>

        {/* Veg / Non-Veg Toggle (2 cols) */}
        <div className="sm:col-span-2">
          <button
            type="button"
            onClick={() => setIsVeg(!isVeg)}
            disabled={isSubmitting}
            className={`w-full flex items-center justify-center gap-1.5 rounded-xl border py-2 px-3 text-xs font-bold transition-all cursor-pointer ${
              isVeg
                ? 'border-emerald-300 bg-emerald-100/70 text-emerald-800 hover:bg-emerald-100'
                : 'border-rose-300 bg-rose-100/70 text-rose-800 hover:bg-rose-100'
            }`}
            title="Click to toggle Veg / Non-Veg"
          >
            <span>{isVeg ? '🟢 Veg' : '🔴 Non-Veg'}</span>
          </button>
        </div>

        {/* Canteen / Counter Selector (2 cols) */}
        <div className="sm:col-span-2">
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            disabled={isSubmitting}
            className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs font-medium text-slate-800 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden cursor-pointer"
          >
            <option value="">All Counters</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Submit Button (1 col) */}
        <div className="sm:col-span-1">
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
            className="w-full h-8.5 rounded-xl text-xs font-bold shadow-xs flex items-center justify-center"
          >
            + Add
          </Button>
        </div>
      </form>
    </div>
  );
}

function ProductsAdjustModal({
  isOpen,
  onClose,
  selectedInventory,
  onAdjusted,
}: {
  isOpen: boolean;
  onClose: () => void;
  selectedInventory: InventoryItemWithDetails | null;
  onAdjusted: () => void;
}) {
  const [adjustQtyInput, setAdjustQtyInput] = useState('');
  const [qtyError, setQtyError] = useState<string | null>(null);
  const [modalApiError, setModalApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && selectedInventory) {
      setAdjustQtyInput(selectedInventory.quantity.toString());
      setQtyError(null);
      setModalApiError(null);
    }
  }, [isOpen, selectedInventory]);

  if (!selectedInventory) return null;

  const handleStepAdjustment = (delta: number) => {
    const current = parseInt(adjustQtyInput, 10) || 0;
    const nextVal = Math.max(0, current + delta);
    setAdjustQtyInput(nextVal.toString());
  };

  const handleAdjustSubmit = async (e: FormEvent) => {
    e.preventDefault();
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
      const res = await apiService.inventory.updateInventoryQuantity(selectedInventory.id, newQty);
      if (!res.success) {
        setModalApiError(res.error.message || 'Failed to adjust stock quantity');
        return;
      }

      notify.success(`Stock for ${selectedInventory.productName} updated to ${newQty} units`);
      onClose();
      onAdjusted();
    } catch {
      setModalApiError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Adjust Counter Stock"
      size="md"
    >
      <form onSubmit={handleAdjustSubmit} className="space-y-4">
        {modalApiError && (
          <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 p-3 text-sm text-rose-700 border border-rose-500/20">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
            <span>{modalApiError}</span>
          </div>
        )}

        <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
          <p className="font-semibold text-slate-900">{selectedInventory.productName}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Counter: <span className="text-slate-800">{selectedInventory.branchName}</span> • Current:{' '}
            <span className="text-emerald-700 font-bold">{selectedInventory.quantity} units</span>
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            New Stock Quantity (Units)
          </label>
          <Input
            type="number"
            min="0"
            value={adjustQtyInput}
            onChange={(e) => setAdjustQtyInput(e.target.value)}
            error={qtyError || undefined}
          />
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {[-10, -5, -1, 1, 5, 10, 50].map((delta) => (
            <Button
              key={delta}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleStepAdjustment(delta)}
            >
              {delta > 0 ? `+${delta}` : delta}
            </Button>
          ))}
        </div>

        <ModalFooter>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isSubmitting}>
            Confirm Stock Update
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

function ProductsDeleteModal({
  isOpen,
  onClose,
  selectedProduct,
  onDeleted,
}: {
  isOpen: boolean;
  onClose: () => void;
  selectedProduct: UnifiedProductItem | null;
  onDeleted: () => void;
}) {
  const [modalApiError, setModalApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!selectedProduct) return null;

  const handleDeleteProductSubmit = async () => {
    setIsSubmitting(true);
    setModalApiError(null);

    try {
      const res = await apiService.products.deleteProduct(selectedProduct.id);
      if (!res.success) {
        setModalApiError(res.error.message || 'Failed to archive product');
        return;
      }

      notify.success(`Product '${selectedProduct.itemName}' archived successfully`);
      onClose();
      onDeleted();
    } catch {
      setModalApiError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isSubmitting && onClose()}
      title="Delete Product"
      description="Archive product from master catalog"
      size="md"
    >
      <div className="space-y-4">
        {modalApiError && (
          <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">Action Failed</p>
              <p>{modalApiError}</p>
            </div>
          </div>
        )}

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
          <p className="text-sm text-slate-800 font-medium">
            Are you sure you want to delete{' '}
            <span className="text-emerald-700 font-bold font-mono">
              {selectedProduct.itemName}?
            </span>
          </p>
          <p className="text-xs text-slate-600 leading-relaxed">
            This product will be archived and hidden from POS sale menus. All historical receipts, purchase items, and past financial reports will continue to safely preserve this product's name and accounting history.
          </p>
        </div>

        <ModalFooter>
          <Button variant="ghost" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="danger"
            type="button"
            onClick={handleDeleteProductSubmit}
            isLoading={isSubmitting}
          >
            Archive & Delete Product
          </Button>
        </ModalFooter>
      </div>
    </Modal>
  );
}

// ─── Extracted Hook: Products Page State & Operations ───────────────────────
interface UseProductsPageDataProps {
  currentBranch: Branch | null;
}

function useProductsPageData({ currentBranch }: UseProductsPageDataProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchFilter, setBranchFilter] = useState<string>(currentBranch?.id || 'ALL');

  useEffect(() => {
    setBranchFilter(currentBranch ? currentBranch.id : 'ALL');
  }, [currentBranch]);

  const [products, setProducts] = useState<ProductWithInventory[]>([]);
  const [inventoryList, setInventoryList] = useState<InventoryItemWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusStockFilter, setStatusStockFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const [showCounterModal, setShowCounterModal] = useState(false);
  const [selectedProductForCounter, setSelectedProductForCounter] = useState<UnifiedProductItem | null>(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProductToDelete, setSelectedProductToDelete] = useState<UnifiedProductItem | null>(null);
  const [selectedInventory, setSelectedInventory] = useState<InventoryItemWithDetails | null>(null);

  const handleOpenCounter = (product: UnifiedProductItem) => {
    setSelectedProductForCounter(product);
    setShowCounterModal(true);
  };

  const fetchUnifiedData = useCallback(async () => {
    setLoadError(null);
    try {
      const targetBranch = branchFilter !== 'ALL' ? branchFilter : currentBranch?.id;
      const [prodRes, invRes, branchRes] = await Promise.all([
        apiService.products.getProducts({
          branchId: targetBranch,
        }),
        apiService.inventory.getInventory({ branchId: targetBranch }),
        apiService.branches.getBranches(),
      ]);

      if (!prodRes.success) {
        setLoadError(prodRes.error.message || 'Failed to load products');
        return;
      }

      if (branchRes.success) {
        const bItems = Array.isArray(branchRes.data) ? branchRes.data : branchRes.data?.items || [];
        setBranches(bItems);
      }

      const rawProducts: ProductWithInventory[] = Array.isArray(prodRes.data)
        ? prodRes.data
        : prodRes.data?.items || [];

      const rawInventory: InventoryItem[] = invRes.success
        ? Array.isArray(invRes.data)
          ? invRes.data
          : invRes.data?.items || []
        : [];

      const branchMap = new Map<string, string>();
      if (branchRes.success) {
        const bItems = Array.isArray(branchRes.data) ? branchRes.data : branchRes.data?.items || [];
        bItems.forEach((b) => branchMap.set(b.id, b.name));
      }

      const invDetailsList: InventoryItemWithDetails[] = rawInventory.map((item) => {
        const prod = rawProducts.find((p) => p.id === item.productId);
        return {
          ...item,
          productName: prod?.itemName || (item as any).productName || `Product ${item.productId}`,
          category: prod?.category || (item as any).category || ['General'],
          price: prod?.price ?? (item as any).price ?? 0,
          branchName: branchMap.get(item.branchId) || 'Main Branch',
        };
      });

      setProducts(rawProducts);
      setInventoryList(invDetailsList);
    } catch {
      setLoadError('Unable to connect to the server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [branchFilter, currentBranch]);

  useEffect(() => {
    fetchUnifiedData();
  }, [fetchUnifiedData]);

  const unifiedProducts = useMemo<UnifiedProductItem[]>(() => {
    return products.map((product) => {
      const matchingInv = inventoryList.filter((i) => i.productId === product.id);
      const totalQty =
        matchingInv.length > 0
          ? matchingInv.reduce((sum, i) => sum + i.quantity, 0)
          : product.quantity || 0;

      const branchName = product.branchName || matchingInv[0]?.branchName || undefined;
      const inventoryId = matchingInv[0]?.id;

      return {
        ...product,
        quantity: totalQty,
        branchName,
        inventoryId,
      };
    });
  }, [products, inventoryList]);

  const filteredProducts = useMemo(() => {
    return unifiedProducts.filter((product) =>
      matchesProductFilter(product, searchQuery, categoryFilter, statusStockFilter),
    );
  }, [unifiedProducts, searchQuery, categoryFilter, statusStockFilter]);

  const metrics = useMemo<ProductsMetrics>(() => {
    const totalProducts = unifiedProducts.length;
    const activeProducts = unifiedProducts.filter((p) => p.status === 'ACTIVE').length;
    const totalUnits = unifiedProducts.reduce((sum, p) => sum + (p.quantity || 0), 0);
    const totalValuation = unifiedProducts.reduce((sum, p) => sum + (p.quantity || 0) * p.price, 0);
    const lowStock = unifiedProducts.filter((p) => p.quantity > 0 && p.quantity < 10).length;
    const outOfStock = unifiedProducts.filter((p) => p.quantity === 0).length;

    return { totalProducts, activeProducts, totalUnits, totalValuation, lowStock, outOfStock };
  }, [unifiedProducts]);

  const handleToggleStatus = async (product: UnifiedProductItem) => {
    const newStatus = product.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await apiService.products.updateProduct(product.id, { status: newStatus });
      if (!res.success) {
        notify.error(res.error.message || `Failed to update status`);
        return;
      }
      notify.success(`Product "${product.itemName}" is now ${newStatus}`);
      fetchUnifiedData();
    } catch {
      notify.error('Failed to change product status.');
    }
  };

  const handleOpenAdjust = (product: UnifiedProductItem) => {
    const inv = inventoryList.find((i) => i.productId === product.id);
    if (!inv) {
      setSelectedInventory({
        id: product.inventoryId || product.id,
        productId: product.id,
        branchId: product.branchId || currentBranch?.id || (branches[0]?.id || ''),
        quantity: product.quantity || 0,
        productName: product.itemName,
        category: product.category,
        price: product.price,
        branchName: product.branchName || currentBranch?.name || 'Main Cafeteria',
        updatedAt: new Date().toISOString(),
      });
    } else {
      setSelectedInventory(inv);
    }
    setShowAdjustModal(true);
  };

  const handleOpenDelete = (product: UnifiedProductItem) => {
    setSelectedProductToDelete(product);
    setShowDeleteModal(true);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('ALL');
    setStatusStockFilter('ALL');
  };

  return {
    branches,
    branchFilter,
    setBranchFilter,
    isLoading,
    loadError,
    searchQuery,
    setSearchQuery,
    statusStockFilter,
    setStatusStockFilter,
    categoryFilter,
    setCategoryFilter,
    showCounterModal,
    setShowCounterModal,
    selectedProductForCounter,
    handleOpenCounter,
    showAdjustModal,
    setShowAdjustModal,
    showDeleteModal,
    setShowDeleteModal,
    selectedProductToDelete,
    selectedInventory,
    unifiedProducts,
    filteredProducts,
    metrics,
    fetchUnifiedData,
    handleToggleStatus,
    handleOpenAdjust,
    handleOpenDelete,
    handleClearFilters,
  };
}

function renderProductItemCategoryBadges(category: string | string[] | undefined) {
  const isVeg = Array.isArray(category) && category.some((c) => c.toLowerCase() === 'veg');
  const isNonVeg = Array.isArray(category) && category.some((c) => c.toLowerCase() === 'non-veg');
  const isBeverage = Array.isArray(category) && category.some((c) => c.toLowerCase() === 'beverage' || c.toLowerCase() === 'drink');
  const otherCategories = Array.isArray(category)
    ? category.filter((c) => !['veg', 'non-veg', 'beverage', 'drink'].includes(c.toLowerCase()))
    : [];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {isVeg && (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          🟢 Veg
        </span>
      )}
      {isNonVeg && (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          🔴 Non-Veg
        </span>
      )}
      {isBeverage && (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
          ☕ Drink
        </span>
      )}
      {otherCategories.map((cat) => (
        <span
          key={cat}
          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200"
        >
          {cat}
        </span>
      ))}
      {!isVeg && !isNonVeg && !isBeverage && otherCategories.length === 0 && (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
          Food
        </span>
      )}
    </div>
  );
}

function useProductsPageColumns(
  canManageProducts: boolean,
  onToggle: (p: UnifiedProductItem) => void,
  onOpenCounter: (p: UnifiedProductItem) => void,
  onDelete: (p: UnifiedProductItem) => void,
): Column<UnifiedProductItem>[] {
  return useMemo(
    () => [
      {
        key: 'itemName',
        header: 'Item Name',
        className: 'min-w-[180px]',
        render: (p: UnifiedProductItem) => (
          <div className="flex flex-col">
            <span className="font-semibold text-slate-900 text-sm">{p.itemName}</span>
            {p.branchName && (
              <span className="text-[11px] text-slate-500 mt-0.5">🏪 {p.branchName}</span>
            )}
          </div>
        ),
      },
      {
        key: 'category',
        header: 'Category',
        className: 'min-w-[140px]',
        render: (p: UnifiedProductItem) => renderProductItemCategoryBadges(p.category),
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
            {canManageProducts && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 px-2 text-slate-700 hover:text-emerald-700 hover:border-emerald-300"
                onClick={() => onOpenCounter(p)}
                leftIcon={<Building2 className="h-3 w-3 text-emerald-600" />}
                title="Move or copy this item to another counter"
              >
                Counter
              </Button>
            )}

            {canManageProducts && (
              <Button
                variant={p.status === 'ACTIVE' ? 'ghost' : 'outline'}
                size="sm"
                className="text-xs h-7 px-2.5"
                onClick={() => onToggle(p)}
                leftIcon={<Power className="h-3 w-3" />}
              >
                {p.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
              </Button>
            )}

            {canManageProducts && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(p)}
                className="text-xs h-7 px-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                leftIcon={<Trash2 className="h-3 w-3" />}
              >
                Delete
              </Button>
            )}
          </div>
        ),
      },
    ],
    [canManageProducts, onToggle, onOpenCounter, onDelete],
  );
}

interface ProductsPageTableContentProps {
  isLoading: boolean;
  loadError: string | null;
  filteredProducts: UnifiedProductItem[];
  productColumns: Column<UnifiedProductItem>[];
  searchQuery: string;
  categoryFilter: string;
  statusStockFilter: string;
  canManageProducts: boolean;
  onRetry: () => void;
  onOpenCounter: (p: UnifiedProductItem) => void;
  onToggle: (p: UnifiedProductItem) => void;
  onDelete: (p: UnifiedProductItem) => void;
}

function ProductsPageTableContent({
  isLoading,
  loadError,
  filteredProducts,
  productColumns,
  searchQuery,
  categoryFilter,
  statusStockFilter,
  canManageProducts,
  onRetry,
  onOpenCounter,
  onToggle,
  onDelete,
}: ProductsPageTableContentProps) {
  if (isLoading) {
    return (
      <div className="py-8">
        <LoadingState message="Loading master products..." />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="py-8">
        <ErrorState message={loadError} onRetry={onRetry} />
      </div>
    );
  }

  if (filteredProducts.length === 0) {
    return (
      <div className="py-8">
        <EmptyState
          title="No Menu Items Found"
          description={
            searchQuery || statusStockFilter !== 'ALL' || categoryFilter !== 'ALL'
              ? 'No products matched your search or filters. Try adjusting them.'
              : 'Add your first menu item using the Quick Add Menu Item bar above.'
          }
        />
      </div>
    );
  }

  return (
    <>
      <div className="hidden md:block">
        <DataTable<UnifiedProductItem>
          data={filteredProducts}
          columns={productColumns}
          keyExtractor={(item) => item.id}
          rowClassName={(item) => (item.status !== 'ACTIVE' ? 'opacity-70 bg-slate-50/50' : undefined)}
        />
      </div>

      <div className="md:hidden divide-y divide-slate-100 p-2 space-y-3">
        {filteredProducts.map((p) => (
          <div
            key={p.id}
            className={`rounded-xl border p-4 space-y-3 transition-all ${
              p.status === 'ACTIVE'
                ? 'border-slate-200 bg-white shadow-2xs'
                : 'border-slate-200 bg-slate-50/80 opacity-75'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="font-bold text-slate-900 text-sm">{p.itemName}</h4>
                {p.branchName && (
                  <span className="text-[11px] text-slate-500 block mt-0.5">🏪 {p.branchName}</span>
                )}
                <div className="mt-1.5">{renderProductItemCategoryBadges(p.category)}</div>
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

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
              {canManageProducts && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs py-1.5 justify-center text-slate-700"
                  onClick={() => onOpenCounter(p)}
                  leftIcon={<Building2 className="h-3.5 w-3.5 text-emerald-600" />}
                >
                  Counter
                </Button>
              )}

              {canManageProducts && (
                <Button
                  variant={p.status === 'ACTIVE' ? 'ghost' : 'outline'}
                  size="sm"
                  className="w-full text-xs py-1.5 justify-center"
                  onClick={() => onToggle(p)}
                  leftIcon={<Power className="h-3.5 w-3.5" />}
                >
                  {p.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                </Button>
              )}

              {canManageProducts && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(p)}
                  className="w-full text-xs py-1.5 justify-center text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                  leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                >
                  Delete
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function ProductsPage({ defaultTab: _defaultTab }: ProductsPageProps = {}) {
  const { currentBranch, selectBranch } = useBranch();
  const { hasPermission } = usePermissions();

  const canViewProducts = hasPermission('PRODUCT_VIEW');
  const canManageProducts = hasPermission('PRODUCT_MANAGE');

  const pageData = useProductsPageData({ currentBranch });
  const productColumns = useProductsPageColumns(
    canManageProducts,
    pageData.handleToggleStatus,
    pageData.handleOpenCounter,
    pageData.handleOpenDelete,
  );

  if (!canViewProducts) {
    return <UnauthorizedPage />;
  }

  return (
    <div className="space-y-6">
      {/* ─── Page Header ─── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Menu</h1>
          <p className="text-sm text-slate-500 mt-1">
            Cafeteria menus, rapid item creation, and counter assignments.
          </p>
        </div>
      </div>

      <ProductsMetricsCards metrics={pageData.metrics} />

      {/* ─── ⚡ Rapid Quick-Add Bar ─── */}
      {canManageProducts && (
        <QuickAddProductBar
          branches={pageData.branches}
          currentBranchId={pageData.branchFilter !== 'ALL' ? pageData.branchFilter : ''}
          onSuccess={pageData.fetchUnifiedData}
        />
      )}

      {/* ─── Filter & Search Bar ─── */}
      <Card padding="md">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by product name..."
                value={pageData.searchQuery}
                onChange={(e) => pageData.setSearchQuery(e.target.value.slice(0, 40))}
                className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <Select
              value={pageData.branchFilter}
              onChange={(e) => {
                pageData.setBranchFilter(e.target.value);
                selectBranch(e.target.value);
              }}
              options={[
                { value: 'ALL', label: 'All Cafeterias' },
                ...pageData.branches.map((b) => ({ value: b.id, label: b.name })),
              ]}
            />

            <Select
              value={pageData.categoryFilter}
              onChange={(e) => pageData.setCategoryFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Categories' },
                { value: 'Veg', label: 'Veg' },
                { value: 'Non-Veg', label: 'Non-Veg' },
                { value: 'Beverage', label: 'Beverage' },
                { value: 'Snack', label: 'Snack' },
                { value: 'Breakfast', label: 'Breakfast' },
                { value: 'Lunch', label: 'Lunch' },
                { value: 'Dinner', label: 'Dinner' },
              ]}
            />

            <Select
              value={pageData.statusStockFilter}
              onChange={(e) => pageData.setStatusStockFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Statuses' },
                { value: 'ACTIVE', label: 'Active Items Only' },
                { value: 'INACTIVE', label: 'Inactive / Hidden Items' },
              ]}
            />
          </div>

          {(pageData.searchQuery || pageData.categoryFilter !== 'ALL' || pageData.statusStockFilter !== 'ALL') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={pageData.handleClearFilters}
              className="text-xs text-slate-500"
            >
              Clear Filters
            </Button>
          )}
        </div>
      </Card>

      {/* ─── Unified Data View (Table & Mobile Cards) ─── */}
      <Card padding="none">
        <ProductsPageTableContent
          isLoading={pageData.isLoading}
          loadError={pageData.loadError}
          filteredProducts={pageData.filteredProducts}
          productColumns={productColumns}
          searchQuery={pageData.searchQuery}
          categoryFilter={pageData.categoryFilter}
          statusStockFilter={pageData.statusStockFilter}
          canManageProducts={canManageProducts}
          onRetry={pageData.fetchUnifiedData}
          onOpenCounter={pageData.handleOpenCounter}
          onToggle={pageData.handleToggleStatus}
          onDelete={pageData.handleOpenDelete}
        />
      </Card>

      <ProductCounterModal
        isOpen={pageData.showCounterModal}
        onClose={() => pageData.setShowCounterModal(false)}
        product={pageData.selectedProductForCounter}
        branches={pageData.branches}
        onUpdated={pageData.fetchUnifiedData}
      />

      <ProductsAdjustModal
        isOpen={pageData.showAdjustModal}
        onClose={() => pageData.setShowAdjustModal(false)}
        selectedInventory={pageData.selectedInventory}
        onAdjusted={pageData.fetchUnifiedData}
      />

      <ProductsDeleteModal
        isOpen={pageData.showDeleteModal}
        onClose={() => pageData.setShowDeleteModal(false)}
        selectedProduct={pageData.selectedProductToDelete}
        onDeleted={pageData.fetchUnifiedData}
      />
    </div>
  );
}
