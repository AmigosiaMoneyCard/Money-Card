// ─── Permission Matrix Component (M6) ──────────────────────
// Interactive Checkbox-based Permission Architecture:
// Allows quick role presets (Counter Manager vs Kitchen Staff) while
// granting full granular control to check or uncheck individual permission checkboxes.

import type { Permission } from '@/types';
import {
  CreditCard,
  Clock,
  Package,
  ShieldCheck,
  Check,
  ChefHat,
  Wallet,
} from 'lucide-react';
import {
  MANAGER_PERMISSIONS,
  KITCHEN_PERMISSIONS,
  PERMISSION_DEPENDENCIES,
  PERMISSION_CHILDREN,
} from './constants';

interface PermissionMatrixProps {
  selectedPermissions: Permission[];
  onChange?: (permissions: Permission[]) => void;
  readOnly?: boolean;
  rolePreset?: 'MANAGER' | 'KITCHEN';
  onRolePresetChange?: (role: 'MANAGER' | 'KITCHEN') => void;
}

interface CheckboxPermissionItem {
  id: string;
  keys: Permission[];
  label: string;
  description: string;
  prerequisiteKey?: Permission;
}

interface PermissionSection {
  id: string;
  title: string;
  icon: typeof CreditCard;
  items: CheckboxPermissionItem[];
}

const PERMISSION_SECTIONS: PermissionSection[] = [
  {
    id: 'cards',
    title: 'Cards & Wallets',
    icon: CreditCard,
    items: [
      {
        id: 'card_view',
        keys: ['CARD_VIEW'],
        label: 'View Wallets & Balances',
        description: 'View wallet balances and cardholder list (prerequisite for all card actions)',
      },
      {
        id: 'card_issue',
        keys: ['CARD_ISSUE'],
        label: 'Issue & Activate Wallets',
        description: 'Issue new cafeteria wallets to customers',
        prerequisiteKey: 'CARD_VIEW',
      },
      {
        id: 'card_return',
        keys: ['CARD_RETURN'],
        label: 'Return & Settle Wallets',
        description: 'Process card settlements and remaining balance returns',
        prerequisiteKey: 'CARD_VIEW',
      },
      {
        id: 'card_block',
        keys: ['CARD_BLOCK', 'CARD_UNBLOCK'],
        label: 'Block & Unblock Wallets',
        description: 'Lock lost or compromised cards and reactivate verified cards',
        prerequisiteKey: 'CARD_VIEW',
      },
    ],
  },
  {
    id: 'billing',
    title: 'Billing & Recharges',
    icon: Clock,
    items: [
      {
        id: 'recharge',
        keys: ['RECHARGE'],
        label: 'Add Money / Recharge',
        description: 'Top up customer cards with Cash or UPI payments',
      },
      {
        id: 'purchase',
        keys: ['PURCHASE'],
        label: 'Food Purchase & Checkout',
        description: 'Create food orders, apply cart deductions, and bill customer wallets',
      },
      {
        id: 'session_view',
        keys: ['SESSION_VIEW'],
        label: 'View Customer Sessions',
        description: 'Inspect live and historical cafeteria transaction sessions',
      },
      {
        id: 'refund',
        keys: ['REFUND'],
        label: 'Refund Orders',
        description: 'Process purchase refunds back to customer wallet balances',
        prerequisiteKey: 'SESSION_VIEW',
      },
    ],
  },
  {
    id: 'menu',
    title: 'Menu & Food Catalog',
    icon: Package,
    items: [
      {
        id: 'product_view',
        keys: ['PRODUCT_VIEW'],
        label: 'View Menu Items & Prices',
        description: 'Browse active menu dishes, pricing, and category filters',
      },
      {
        id: 'product_manage',
        keys: ['PRODUCT_MANAGE'],
        label: 'Edit Menu & Availability',
        description: 'Add new items, update prices, and toggle in-stock / out-of-stock items',
        prerequisiteKey: 'PRODUCT_VIEW',
      },
    ],
  },
  {
    id: 'operations',
    title: 'Operations & Management',
    icon: ShieldCheck,
    items: [
      {
        id: 'team_view',
        keys: ['STAFF_VIEW', 'BRANCH_VIEW'],
        label: 'View Counters & Team Directory',
        description: 'View cafeteria counter info and team staff listings',
      },
      {
        id: 'team_manage',
        keys: ['STAFF_MANAGE', 'BRANCH_MANAGE'],
        label: 'Manage Counters & Staff Members',
        description: 'Create, edit, and assign staff members to cafeteria counters',
        prerequisiteKey: 'BRANCH_VIEW',
      },
      {
        id: 'analytics_view',
        keys: ['VIEW_ANALYTICS', 'VIEW_REPORTS'],
        label: 'View Analytics & PDF Reports',
        description: 'Access operational sales charts, peak demand, and downloadable PDF reports',
        prerequisiteKey: 'BRANCH_VIEW',
      },
    ],
  },
];

export function PermissionMatrix({
  selectedPermissions,
  onChange,
  readOnly = false,
  rolePreset = 'MANAGER',
  onRolePresetChange,
}: PermissionMatrixProps) {
  const isItemChecked = (item: CheckboxPermissionItem): boolean => {
    return item.keys.every((k) => selectedPermissions.includes(k));
  };

  const isItemIndeterminate = (item: CheckboxPermissionItem): boolean => {
    const someChecked = item.keys.some((k) => selectedPermissions.includes(k));
    const allChecked = item.keys.every((k) => selectedPermissions.includes(k));
    return someChecked && !allChecked;
  };

  const handleToggleItem = (item: CheckboxPermissionItem) => {
    if (readOnly || !onChange) return;
    const currentlyChecked = isItemChecked(item);
    let nextPermissions = new Set<Permission>(selectedPermissions);

    if (currentlyChecked) {
      // Uncheck item and all its keys
      item.keys.forEach((k) => nextPermissions.delete(k));

      // Cascade revocation: if unchecking a parent, uncheck subordinate permissions
      item.keys.forEach((k) => {
        const dependentChildren = PERMISSION_CHILDREN[k];
        if (dependentChildren) {
          dependentChildren.forEach((child) => nextPermissions.delete(child));
        }
      });
    } else {
      // Check item and all its keys
      item.keys.forEach((k) => nextPermissions.add(k));

      // Auto-grant prerequisites
      item.keys.forEach((k) => {
        const prerequisites = PERMISSION_DEPENDENCIES[k];
        if (prerequisites) {
          prerequisites.forEach((p) => nextPermissions.add(p));
        }
      });
    }

    const updated = Array.from(nextPermissions);
    onChange(updated);

    // Sync role preset state if matches
    if (onRolePresetChange) {
      const isKitchen = KITCHEN_PERMISSIONS.every((p) => updated.includes(p)) && !updated.includes('RECHARGE');
      if (isKitchen) {
        onRolePresetChange('KITCHEN');
      } else if (MANAGER_PERMISSIONS.every((p) => updated.includes(p))) {
        onRolePresetChange('MANAGER');
      }
    }
  };

  const handleSelectManagerPreset = () => {
    if (readOnly || !onChange) return;
    onChange([...MANAGER_PERMISSIONS]);
    onRolePresetChange?.('MANAGER');
  };

  const handleSelectKitchenPreset = () => {
    if (readOnly || !onChange) return;
    onChange([...KITCHEN_PERMISSIONS]);
    onRolePresetChange?.('KITCHEN');
  };

  const handleSelectAll = () => {
    if (readOnly || !onChange) return;
    onChange([...MANAGER_PERMISSIONS]);
    onRolePresetChange?.('MANAGER');
  };

  const handleClearAll = () => {
    if (readOnly || !onChange) return;
    onChange([]);
  };

  const totalPossiblePermissions = MANAGER_PERMISSIONS.length;
  const activeCount = selectedPermissions.length;

  return (
    <div className="space-y-4">
      {/* ── Quick Role Presets & Batch Controls ── */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Quick Role Presets
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Select a preset to batch populate checkboxes, or toggle checkboxes individually below.
            </p>
          </div>

          {!readOnly && (
            <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-emerald-700 hover:text-emerald-800 font-semibold hover:underline cursor-pointer"
              >
                Select All
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={handleClearAll}
                className="text-slate-500 hover:text-slate-700 font-medium hover:underline cursor-pointer"
              >
                Clear All
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Preset 1: Counter Manager */}
          <button
            type="button"
            disabled={readOnly}
            onClick={handleSelectManagerPreset}
            className={`flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
              readOnly ? 'cursor-default' : 'cursor-pointer'
            } ${
              rolePreset === 'MANAGER'
                ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-500/20 shadow-2xs'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-600 text-white shrink-0">
                <Wallet className="h-4 w-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block leading-tight">Counter Manager</span>
                <span className="text-[10px] text-slate-500">Full POS billing, card top-up, & staff controls</span>
              </div>
            </div>
            {rolePreset === 'MANAGER' && (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                Active Preset
              </span>
            )}
          </button>

          {/* Preset 2: Kitchen Staff */}
          <button
            type="button"
            disabled={readOnly}
            onClick={handleSelectKitchenPreset}
            className={`flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
              readOnly ? 'cursor-default' : 'cursor-pointer'
            } ${
              rolePreset === 'KITCHEN'
                ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/20 shadow-2xs'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-white shrink-0">
                <ChefHat className="h-4 w-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block leading-tight">Kitchen Staff</span>
                <span className="text-[10px] text-slate-500">Kitchen Display System (KDS) & menu catalog</span>
              </div>
            </div>
            {rolePreset === 'KITCHEN' && (
              <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full shrink-0">
                Active Preset
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Categorized Checkbox Permission Panels ── */}
      <div className="grid gap-3.5 sm:grid-cols-2">
        {PERMISSION_SECTIONS.map((section) => {
          const SectionIcon = section.icon;
          const sectionKeys = section.items.flatMap((item) => item.keys);
          const checkedCount = sectionKeys.filter((k) => selectedPermissions.includes(k)).length;
          const totalCount = sectionKeys.length;

          return (
            <div
              key={section.id}
              className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs flex flex-col justify-between"
            >
              <div>
                {/* Section Header */}
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100">
                      <SectionIcon className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-900">{section.title}</span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {checkedCount}/{totalCount} active
                  </span>
                </div>

                {/* Section Checkbox List */}
                <div className="space-y-2">
                  {section.items.map((item) => {
                    const checked = isItemChecked(item);
                    const indeterminate = isItemIndeterminate(item);

                    return (
                      <label
                        key={item.id}
                        className={`flex items-start gap-2.5 p-2 rounded-lg border transition-all ${
                          readOnly ? 'cursor-default' : 'cursor-pointer'
                        } ${
                          checked
                            ? 'border-emerald-200 bg-emerald-50/40 text-slate-900'
                            : indeterminate
                            ? 'border-amber-200 bg-amber-50/40 text-slate-900'
                            : 'border-slate-100 hover:border-slate-200 bg-slate-50/40 text-slate-600'
                        }`}
                      >
                        <div className="pt-0.5">
                          <input
                            type="checkbox"
                            disabled={readOnly}
                            checked={checked}
                            onChange={() => handleToggleItem(item)}
                            className="sr-only"
                          />
                          <div
                            className={`h-4.5 w-4.5 rounded flex items-center justify-center border transition-colors ${
                              checked
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : indeterminate
                                ? 'bg-amber-500 border-amber-500 text-white'
                                : 'bg-white border-slate-300'
                            }`}
                          >
                            {checked ? (
                              <Check className="h-3 w-3 stroke-[3]" />
                            ) : indeterminate ? (
                              <div className="h-1 w-2 rounded-sm bg-white" />
                            ) : null}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-semibold leading-tight text-slate-800">
                              {item.label}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-snug mt-0.5">
                            {item.description}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Summary Status Footer ── */}
      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs">
        <span className="text-slate-500">
          Selected Permissions:{' '}
          <strong className="text-emerald-700 font-bold">{activeCount}</strong> of{' '}
          {totalPossiblePermissions} active
        </span>
        <span className="text-[11px] font-semibold text-slate-600">
          {rolePreset === 'KITCHEN'
            ? 'Kitchen Mode'
            : activeCount === totalPossiblePermissions
            ? 'Full Counter Manager Access'
            : 'Custom Permission Set'}
        </span>
      </div>
    </div>
  );
}
