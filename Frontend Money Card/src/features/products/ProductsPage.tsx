import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiService } from '@/services/api';
import { usePermissions, useAuth, useBranch } from '@/hooks';
import type { Branch, ProductWithInventory } from '@/types';
import { Button, LoadingState, EmptyState, Badge } from '@/components/ui';
import { notify, formatCurrency } from '@/utils';
import { UnauthorizedPage } from '@/features/auth';
import {
  Search,
  Plus,
  Building2,
  Eye,
  Edit2,
  Trash2,
  Check,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { CounterAddProductModal } from './CounterAddProductModal';
import { CounterViewEditMenuModal } from './CounterViewEditMenuModal';
import { BulkCsvImportModal } from '@/components/common';

interface ProductsPageProps {
  defaultTab?: string;
}

// ─── Counter Staff View (Counter Dashboard Scope) ──────────────────────────
function CounterStaffMenuView({
  branch,
  canManage,
}: {
  branch: Branch | null;
  canManage: boolean;
}) {
  const [products, setProducts] = useState<ProductWithInventory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkMenuModal, setShowBulkMenuModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const MENU_CSV_TEMPLATE =
    'itemName,category,price\nVeg Burger,"Snacks, Fast Food",120\nCold Coffee,Beverages,80\nSpecial Thali,"Lunch, Dinner",220\n';

  const handleBulkImportMenu = async (
    rows: any[],
  ): Promise<{ success: boolean; message?: string; data?: any }> => {
    if (!branch) {
      return { success: false, message: 'No counter selected for menu import' };
    }
    let createdCount = 0;
    const errors: string[] = [];

    for (const row of rows) {
      const itemName = row.itemname || row.itemName || row.name || '';
      const priceVal = parseFloat(row.price);
      const categoryVal = row.category || 'General';

      if (!itemName.trim()) {
        errors.push(`Row ${row.rowNumber || '?'}: Item name is required`);
        continue;
      }
      if (isNaN(priceVal) || priceVal <= 0) {
        errors.push(`Row ${row.rowNumber || '?'}: Valid price greater than 0 required`);
        continue;
      }

      const categoryList = Array.isArray(categoryVal)
        ? categoryVal
        : typeof categoryVal === 'string'
        ? categoryVal.split(',').map((c: string) => c.trim()).filter(Boolean)
        : ['General'];

      try {
        const res = await apiService.products.createProduct({
          branchId: branch.id,
          itemName: itemName.trim(),
          price: Math.round(priceVal),
          category: categoryList,
        });
        if (res.success) {
          createdCount++;
        } else {
          errors.push(`Row ${row.rowNumber || '?'}: ${res.error.message || 'Failed to create'}`);
        }
      } catch {
        errors.push(`Row ${row.rowNumber || '?'}: Network or server error`);
      }
    }

    if (createdCount > 0) {
      fetchItems();
      notify.success(
        `Created ${createdCount} menu items${errors.length > 0 ? ` (${errors.length} errors)` : ''}`,
      );
      return { success: true, message: `Created ${createdCount} menu items successfully` };
    } else {
      return { success: false, message: errors.join(', ') || 'No valid items imported' };
    }
  };

  const fetchItems = useCallback(async () => {
    if (!branch) return;
    setIsLoading(true);
    try {
      const res = await apiService.products.getProducts({ branchId: branch.id });
      if (res.success) {
        const items = Array.isArray(res.data) ? res.data : (res.data as any)?.items || [];
        setProducts(items);
      }
    } catch {
      notify.error('Failed to load menu items');
    } finally {
      setIsLoading(false);
    }
  }, [branch]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const filtered = products.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase().trim();
    return p.itemName.toLowerCase().includes(q);
  });

  const handleToggle = async (item: ProductWithInventory) => {
    const nextStatus = item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await apiService.products.updateProduct(item.id, { status: nextStatus });
      if (res.success) {
        setProducts((prev) =>
          prev.map((p) => (p.id === item.id ? { ...p, status: nextStatus } : p)),
        );
        notify.success(`"${item.itemName}" is now ${nextStatus}`);
      }
    } catch {
      notify.error('Failed to update status');
    }
  };

  const handleStartEdit = (item: ProductWithInventory) => {
    setEditingId(item.id);
    setEditName(item.itemName);
    setEditPrice(item.price.toString());
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) return;
    const num = parseFloat(editPrice);
    if (isNaN(num) || num <= 0) return;
    setIsUpdating(true);
    try {
      const res = await apiService.products.updateProduct(id, {
        itemName: editName.trim(),
        price: Math.round(num),
      });
      if (res.success) {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === id ? { ...p, itemName: editName.trim(), price: Math.round(num) } : p,
          ),
        );
        setEditingId(null);
        notify.success('Item updated');
      }
    } catch {
      notify.error('Failed to update item');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      const res = await apiService.products.deleteProduct(id);
      if (res.success) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
        notify.success(`"${name}" deleted`);
      }
    } catch {
      notify.error('Failed to delete item');
    }
  };

  if (!branch) {
    return (
      <div className="py-12 bg-white rounded-2xl border border-slate-200 text-center">
        <p className="text-sm text-slate-500">No counter assigned to your account.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-slate-900">{branch.name} Menu</h1>
          <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 font-semibold text-xs px-2.5 py-0.5">
            Counter Scope
          </Badge>
        </div>

        {canManage && (
          <div className="flex items-center gap-1">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowAddModal(true)}
              className="text-xs h-8 px-3 cursor-pointer"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
            >
              Add Menu
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowBulkMenuModal(true)}
              className="text-xs h-8 px-3 cursor-pointer rounded-l-none"
              leftIcon={<FileSpreadsheet className="h-3.5 w-3.5" />}
            >
              Bulk Upload
            </Button>
          </div>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:outline-hidden"
        />
      </div>

      {isLoading ? (
        <div className="py-12 bg-white rounded-2xl border border-slate-200">
          <LoadingState message="Loading counter menu..." />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 bg-white rounded-2xl border border-slate-200">
          <EmptyState
            title="No menu items"
            description={searchQuery ? 'No items match your search.' : 'Add your first menu item.'}
          />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs divide-y divide-slate-100 overflow-hidden">
          {filtered.map((p) => {
            const isEditing = editingId === p.id;
            const isVeg = Array.isArray(p.category) && p.category.some((c) => c.toLowerCase() === 'veg');
            const isDrink = Array.isArray(p.category) && p.category.some((c) => c.toLowerCase() === 'drink' || c.toLowerCase() === 'beverage');

            if (isEditing) {
              return (
                <div key={p.id} className="p-3 bg-emerald-50/30 flex items-center gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-300 px-2 py-1 text-xs"
                  />
                  <input
                    type="number"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveEdit(p.id)}
                    disabled={isUpdating}
                    className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="p-1 rounded text-slate-500 hover:bg-slate-200"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            }

            return (
              <div key={p.id} className="p-3 flex items-center justify-between hover:bg-slate-50/60">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span>{isDrink ? '☕' : isVeg ? '🟢' : '🔴'}</span>
                  <span className="font-semibold text-xs text-slate-900">{p.itemName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-slate-900">{formatCurrency(p.price)}</span>
                  <button
                    type="button"
                    onClick={() => handleToggle(p)}
                    className={`relative inline-flex h-5 w-9 rounded-full transition-colors cursor-pointer ${
                      p.status === 'ACTIVE' ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                        p.status === 'ACTIVE' ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => handleStartEdit(p)}
                      className="p-1 text-slate-400 hover:text-emerald-700"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id, p.itemName)}
                      className="p-1 text-slate-400 hover:text-rose-600"
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

      <CounterAddProductModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        branch={branch}
        onSuccess={fetchItems}
      />

      <BulkCsvImportModal
        isOpen={showBulkMenuModal}
        onClose={() => setShowBulkMenuModal(false)}
        title="Bulk Upload Menu Items (CSV)"
        templateFilename="menu_items_template.csv"
        templateContent={MENU_CSV_TEMPLATE}
        onImport={handleBulkImportMenu}
      />
    </div>
  );
}

// ─── Main Products Page ───────────────────────────────────────────────────
export function ProductsPage({ defaultTab: _defaultTab }: ProductsPageProps = {}) {
  const { user } = useAuth();
  const { currentBranch } = useBranch();
  const { hasPermission } = usePermissions();

  const isCounterView = user?.role === 'STAFF';
  const canViewProducts = hasPermission('PRODUCT_VIEW');
  const canManageProducts = hasPermission('PRODUCT_MANAGE');

  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state for Org Admin
  const [selectedBranchForAdd, setSelectedBranchForAdd] = useState<Branch | null>(null);
  const [selectedBranchForViewEdit, setSelectedBranchForViewEdit] = useState<Branch | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const branchRes = await apiService.branches.getBranches();
      if (branchRes.success) {
        const bItems = Array.isArray(branchRes.data)
          ? branchRes.data
          : (branchRes.data as any)?.items || [];
        setBranches(bItems);
      }
    } catch {
      notify.error('Failed to load counters data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtered branches for Org Admin
  const filteredBranches = useMemo(() => {
    return branches.filter((b) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return b.name.toLowerCase().includes(q) || (b.location && b.location.toLowerCase().includes(q));
      }
      return true;
    });
  }, [branches, searchQuery]);

  if (!canViewProducts) {
    return <UnauthorizedPage />;
  }

  // If user is Staff (Counter Admin / Terminal View), show Counter Staff Menu View
  if (isCounterView) {
    const userBranchId = user?.assignedBranchIds?.[0] || currentBranch?.id;
    const staffBranch = branches.find((b) => b.id === userBranchId) || branches[0] || null;
    return <CounterStaffMenuView branch={staffBranch} canManage={canManageProducts} />;
  }

  // Org Admin Table View (3 Columns Only)
  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-10">
      {/* ─── Minimal Header ─── */}
      <div className="border-b border-slate-200/80 pb-3">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Menu Management</h1>
      </div>

      {/* ─── Search Bar ─── */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search counters..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden"
        />
      </div>

      {/* ─── Minimal Table (3 Columns Only) ─── */}
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
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4 min-w-[200px]">Counter Name</th>
                  <th className="py-3 px-4 text-center w-[130px]">Add Menu</th>
                  <th className="py-3 px-4 text-right w-[180px]">View Menu / Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBranches.map((branch) => {
                  return (
                    <tr
                      key={branch.id}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      {/* 1. Counter Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <span className="font-semibold text-sm text-slate-900">
                            {branch.name}
                          </span>
                        </div>
                      </td>

                      {/* 2. Add Button */}
                      <td className="py-3.5 px-4 text-center">
                        {canManageProducts && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedBranchForAdd(branch)}
                            className="text-xs h-7 px-2.5 rounded-lg border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400 font-semibold cursor-pointer"
                            leftIcon={<Plus className="h-3.5 w-3.5 text-emerald-600" />}
                          >
                            Add Menu
                          </Button>
                        )}
                      </td>

                      {/* 3. View Menu / Edit */}
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedBranchForViewEdit(branch)}
                          className="text-xs h-7 px-3 rounded-lg text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200 font-medium cursor-pointer"
                          leftIcon={<Eye className="h-3.5 w-3.5 text-slate-500" />}
                        >
                          View Menu / Edit
                        </Button>
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
