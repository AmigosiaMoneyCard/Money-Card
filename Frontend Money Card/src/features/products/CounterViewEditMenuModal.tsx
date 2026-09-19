import { useState, useEffect, useCallback } from 'react';
import { Modal, Button, LoadingState, EmptyState } from '@/components/ui';
import { apiService } from '@/services/api';
import { notify, formatCurrency } from '@/utils';
import type { Branch, ProductWithInventory } from '@/types';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
} from 'lucide-react';

interface CounterViewEditMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  branch: Branch | null;
  onChanged: () => void;
  onOpenAddModal?: () => void;
}

interface EditingItemState {
  id: string;
  itemName: string;
  price: string;
  foodType: 'Veg' | 'Non-Veg' | 'Drink';
}

function getItemFoodType(category: string[] | undefined): 'Veg' | 'Non-Veg' | 'Drink' {
  if (!Array.isArray(category)) return 'Veg';
  if (category.some((c) => c.toLowerCase() === 'non-veg')) return 'Non-Veg';
  if (category.some((c) => c.toLowerCase() === 'drink' || c.toLowerCase() === 'beverage')) return 'Drink';
  return 'Veg';
}

export function CounterViewEditMenuModal({
  isOpen,
  onClose,
  branch,
  onChanged,
  onOpenAddModal,
}: CounterViewEditMenuModalProps) {
  const [products, setProducts] = useState<ProductWithInventory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState<EditingItemState | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    if (!branch) return;
    setIsLoading(true);
    try {
      const res = await apiService.products.getProducts({ branchId: branch.id });
      if (res.success) {
        const items = Array.isArray(res.data) ? res.data : (res.data as any)?.items || [];
        setProducts(items);
      } else {
        notify.error(res.error.message || 'Failed to load menu items');
      }
    } catch {
      notify.error('Error fetching counter menu');
    } finally {
      setIsLoading(false);
    }
  }, [branch]);

  useEffect(() => {
    if (isOpen && branch) {
      setSearchQuery('');
      setEditingItem(null);
      setConfirmDeleteId(null);
      fetchItems();
    }
  }, [isOpen, branch, fetchItems]);

  if (!branch) return null;

  const filteredProducts = products.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      p.itemName.toLowerCase().includes(q) ||
      (Array.isArray(p.category) && p.category.some((c) => c.toLowerCase().includes(q)))
    );
  });

  const handleToggleStatus = async (product: ProductWithInventory) => {
    const nextStatus = product.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await apiService.products.updateProduct(product.id, { status: nextStatus });
      if (res.success) {
        setProducts((prev) =>
          prev.map((p) => (p.id === product.id ? { ...p, status: nextStatus } : p)),
        );
        notify.success(`"${product.itemName}" is now ${nextStatus}`);
        onChanged();
      } else {
        notify.error(res.error.message || 'Failed to update item status');
      }
    } catch {
      notify.error('Status update failed');
    }
  };

  const handleStartEdit = (product: ProductWithInventory) => {
    setConfirmDeleteId(null);
    setEditingItem({
      id: product.id,
      itemName: product.itemName,
      price: product.price.toString(),
      foodType: getItemFoodType(product.category),
    });
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
  };

  const handleSaveEdit = async (productId: string) => {
    if (!editingItem || editingItem.id !== productId) return;

    const trimmedName = editingItem.itemName.trim();
    if (!trimmedName) {
      notify.error('Item name cannot be empty');
      return;
    }

    const numPrice = parseFloat(editingItem.price);
    if (isNaN(numPrice) || numPrice <= 0) {
      notify.error('Please enter a valid price greater than 0');
      return;
    }

    setIsUpdating(true);
    try {
      const existing = products.find((p) => p.id === productId);
      const otherTags = Array.isArray(existing?.category)
        ? existing!.category.filter((c) => !['veg', 'non-veg', 'drink', 'beverage'].includes(c.toLowerCase()))
        : [];
      const newCategories = [editingItem.foodType, ...otherTags];

      const res = await apiService.products.updateProduct(productId, {
        itemName: trimmedName,
        price: Math.round(numPrice),
        category: newCategories,
      });

      if (res.success) {
        notify.success(`Updated "${trimmedName}"`);
        setProducts((prev) =>
          prev.map((p) =>
            p.id === productId
              ? { ...p, itemName: trimmedName, price: Math.round(numPrice), category: newCategories }
              : p,
          ),
        );
        setEditingItem(null);
        onChanged();
      } else {
        notify.error(res.error.message || 'Failed to save edits');
      }
    } catch {
      notify.error('Failed to update product');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (productId: string, itemName: string) => {
    setDeletingId(productId);
    try {
      const res = await apiService.products.deleteProduct(productId);
      if (res.success) {
        notify.success(`"${itemName}" deleted from menu`);
        setProducts((prev) => prev.filter((p) => p.id !== productId));
        setConfirmDeleteId(null);
        onChanged();
      } else {
        notify.error(res.error.message || 'Failed to delete product');
      }
    } catch {
      notify.error('Failed to delete item');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${branch.name} Menu`}
      description={`Manage food catalog items and prices (${products.length} items)`}
      size="lg"
    >
      <div className="space-y-4">
        {/* Top Actions: Search & Add Item Shortcut */}
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search items in this counter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-8 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {onOpenAddModal && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                onClose();
                onOpenAddModal();
              }}
              className="shrink-0 text-xs h-8 px-3"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
            >
              Add Item
            </Button>
          )}
        </div>

        {/* Menu Items Content */}
        {isLoading ? (
          <div className="py-8">
            <LoadingState message="Loading counter menu..." />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-6">
            <EmptyState
              title={searchQuery ? 'No matching items' : 'No items in this counter yet'}
              description={
                searchQuery
                  ? 'Try changing your search term.'
                  : 'Add your first menu item using the Add Item button.'
              }
            />
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl max-h-[380px] overflow-y-auto pr-1">
            {filteredProducts.map((product) => {
              const isEditing = editingItem?.id === product.id;
              const isConfirmingDelete = confirmDeleteId === product.id;
              const foodType = getItemFoodType(product.category);

              if (isEditing) {
                return (
                  <div
                    key={product.id}
                    className="p-3 bg-emerald-50/40 space-y-2 border-l-4 border-emerald-500 transition-all"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                      <div className="sm:col-span-5">
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                          Item Name
                        </label>
                        <input
                          type="text"
                          value={editingItem.itemName}
                          onChange={(e) =>
                            setEditingItem({ ...editingItem, itemName: e.target.value.slice(0, 40) })
                          }
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-emerald-600 focus:outline-hidden"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                          Price (₹)
                        </label>
                        <input
                          type="number"
                          value={editingItem.price}
                          onChange={(e) =>
                            setEditingItem({ ...editingItem, price: e.target.value })
                          }
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-900 focus:border-emerald-600 focus:outline-hidden"
                        />
                      </div>

                      <div className="sm:col-span-4">
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                          Type
                        </label>
                        <div className="flex gap-1">
                          {(['Veg', 'Non-Veg', 'Drink'] as const).map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setEditingItem({ ...editingItem, foodType: t })}
                              className={`flex-1 py-1 px-1 rounded text-[10px] font-bold border ${
                                editingItem.foodType === t
                                  ? t === 'Veg'
                                    ? 'border-emerald-500 bg-emerald-100 text-emerald-800'
                                    : t === 'Non-Veg'
                                    ? 'border-rose-500 bg-rose-100 text-rose-800'
                                    : 'border-sky-500 bg-sky-100 text-sky-800'
                                  : 'border-slate-200 bg-white text-slate-600'
                              }`}
                            >
                              {t === 'Veg' ? '🟢 Veg' : t === 'Non-Veg' ? '🔴 Non' : '☕ Drink'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelEdit}
                        disabled={isUpdating}
                        className="text-xs h-7 px-2"
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleSaveEdit(product.id)}
                        isLoading={isUpdating}
                        className="text-xs h-7 px-3"
                        leftIcon={<Check className="h-3.5 w-3.5" />}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={product.id}
                  className={`flex items-center justify-between p-3 gap-3 hover:bg-slate-50/70 transition-colors ${
                    product.status !== 'ACTIVE' ? 'opacity-60 bg-slate-50/40' : 'bg-white'
                  }`}
                >
                  {/* Left: Indicator + Name & Category */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span
                      className="text-base shrink-0 select-none"
                      title={foodType}
                    >
                      {foodType === 'Veg' ? '🟢' : foodType === 'Non-Veg' ? '🔴' : '☕'}
                    </span>

                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-slate-900 truncate">
                        {product.itemName}
                      </p>
                      {Array.isArray(product.category) && product.category.length > 1 && (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {product.category
                            .filter((c) => !['veg', 'non-veg', 'drink', 'beverage'].includes(c.toLowerCase()))
                            .map((tag) => (
                              <span
                                key={tag}
                                className="inline-block px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-600"
                              >
                                {tag}
                              </span>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Middle: Price */}
                  <div className="shrink-0 text-right pr-2">
                    <span className="font-mono text-xs font-bold text-slate-900">
                      {formatCurrency(product.price)}
                    </span>
                  </div>

                  {/* Right: Active Toggle & Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Active/Inactive Toggle Switch */}
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(product)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        product.status === 'ACTIVE' ? 'bg-emerald-600' : 'bg-slate-300'
                      }`}
                      title={`Click to ${product.status === 'ACTIVE' ? 'deactivate' : 'activate'}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          product.status === 'ACTIVE' ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>

                    {/* Edit Button */}
                    <button
                      type="button"
                      onClick={() => handleStartEdit(product)}
                      className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      title="Edit Item"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>

                    {/* Delete / Confirm Delete Button */}
                    {isConfirmingDelete ? (
                      <div className="flex items-center gap-1 bg-rose-50 px-1.5 py-0.5 rounded-lg border border-rose-200">
                        <span className="text-[10px] text-rose-700 font-bold">Delete?</span>
                        <button
                          type="button"
                          onClick={() => handleDelete(product.id, product.itemName)}
                          disabled={deletingId === product.id}
                          className="text-rose-600 hover:text-rose-800 p-0.5 font-bold"
                          title="Confirm Delete"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-slate-400 hover:text-slate-600 p-0.5"
                          title="Cancel"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(product.id)}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete Item"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
