// ─── Product Category Multi-Select Component ─────────────────
// Scroll-safe, accessible button-tile multi-selector with tab filtering and instant toggle.

import { useState, useMemo } from 'react';
import { Utensils, Clock, Layers, Sparkles, Check, X, Search, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui';

export interface CategoryOption {
  value: string;
  label: string;
}

export interface CategoryGroupConfig {
  id: string;
  title: string;
  shortLabel: string;
  icon: React.ReactNode;
  options: CategoryOption[];
}

export const PRODUCT_CATEGORY_GROUPS: CategoryGroupConfig[] = [
  {
    id: 'food_type',
    title: 'Food Type',
    shortLabel: 'Food Type',
    icon: <Utensils className="h-4 w-4 text-emerald-600" />,
    options: [
      { value: 'Veg', label: 'Veg' },
      { value: 'Non-Veg', label: 'Non-Veg' },
      { value: 'Vegan', label: 'Vegan' },
      { value: 'Vegetarian', label: 'Vegetarian' },
      { value: 'Egg', label: 'Egg' },
      { value: 'Contains Dairy', label: 'Contains Dairy' },
    ],
  },
  {
    id: 'meal_type',
    title: 'Meal Type',
    shortLabel: 'Meal Type',
    icon: <Clock className="h-4 w-4 text-teal-600" />,
    options: [
      { value: 'Breakfast', label: 'Breakfast' },
      { value: 'Lunch', label: 'Lunch' },
      { value: 'Dinner', label: 'Dinner' },
      { value: 'Snack', label: 'Snack' },
      { value: 'Beverage', label: 'Beverage' },
      { value: 'Dessert', label: 'Dessert' },
    ],
  },
  {
    id: 'food_category',
    title: 'Food Category',
    shortLabel: 'Food Category',
    icon: <Layers className="h-4 w-4 text-amber-600" />,
    options: [
      { value: 'Main Course', label: 'Main Course' },
      { value: 'Starter', label: 'Starter' },
      { value: 'Rice', label: 'Rice' },
      { value: 'Curry', label: 'Curry' },
      { value: 'Bread', label: 'Bread' },
      { value: 'Salad', label: 'Salad' },
      { value: 'Soup', label: 'Soup' },
      { value: 'Sandwich', label: 'Sandwich' },
      { value: 'Fast Food', label: 'Fast Food' },
      { value: 'Bakery', label: 'Bakery' },
    ],
  },
  {
    id: 'dietary_attributes',
    title: 'Dietary / Attributes',
    shortLabel: 'Attributes',
    icon: <Sparkles className="h-4 w-4 text-rose-500" />,
    options: [
      { value: 'Spicy', label: 'Spicy' },
      { value: 'Mild', label: 'Mild' },
      { value: 'Sweet', label: 'Sweet' },
      { value: 'Sugar-Free', label: 'Sugar-Free' },
      { value: 'Gluten-Free', label: 'Gluten-Free' },
      { value: 'High Protein', label: 'High Protein' },
    ],
  },
];

interface CategorySelectorProps {
  selectedCategories: string[];
  onChange: (categories: string[]) => void;
  error?: string;
  disabled?: boolean;
}

export function CategorySelector({
  selectedCategories,
  onChange,
  error,
  disabled = false,
}: CategorySelectorProps) {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');

  const isSelected = (val: string) =>
    selectedCategories.some((c) => c.toLowerCase() === val.toLowerCase());

  // Toggle option selection
  const handleToggle = (val: string) => {
    if (disabled) return;

    if (isSelected(val)) {
      onChange(selectedCategories.filter((c) => c.toLowerCase() !== val.toLowerCase()));
    } else {
      onChange([...selectedCategories, val]);
    }
  };

  // Remove individual selection
  const handleRemove = (val: string) => {
    if (disabled) return;
    onChange(selectedCategories.filter((c) => c.toLowerCase() !== val.toLowerCase()));
  };

  // Clear all selections
  const handleClearAll = () => {
    if (disabled) return;
    onChange([]);
  };

  // Filtered groups based on search & active tab
  const displayGroups = useMemo(() => {
    const q = searchFilter.toLowerCase().trim();

    return PRODUCT_CATEGORY_GROUPS.filter((g) => {
      if (activeTab !== 'all' && g.id !== activeTab) return false;
      return true;
    })
      .map((g) => {
        if (!q) return g;
        const matchingOptions = g.options.filter(
          (o) =>
            o.label.toLowerCase().includes(q) ||
            o.value.toLowerCase().includes(q) ||
            g.title.toLowerCase().includes(q),
        );
        return {
          ...g,
          options: matchingOptions,
        };
      })
      .filter((g) => g.options.length > 0);
  }, [activeTab, searchFilter]);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-700">
          Categories & Attributes <span className="text-rose-500">*</span>
        </label>
        <div className="flex items-center gap-2">
          {selectedCategories.length > 0 && !disabled && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-[11px] font-medium text-slate-500 hover:text-rose-600 transition-colors flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Clear all</span>
            </button>
          )}
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            {selectedCategories.length} selected
          </span>
        </div>
      </div>

      {/* Selected Summary Chips */}
      {selectedCategories.length > 0 && (
        <div className="flex flex-wrap gap-1.5 rounded-lg border border-emerald-100 bg-emerald-50/40 p-2 items-center max-h-24 overflow-y-auto">
          {selectedCategories.map((cat) => (
            <span
              key={cat}
              className="inline-flex items-center gap-1 rounded-md bg-white border border-emerald-300 px-2 py-0.5 text-xs text-emerald-900 font-medium shadow-2xs"
            >
              <span>{cat}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(cat)}
                  className="rounded p-0.5 text-emerald-600 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title={`Remove ${cat}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Group Navigation Tabs & Quick Filter */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            All
          </button>
          {PRODUCT_CATEGORY_GROUPS.map((group) => {
            const count = group.options.filter((o) => isSelected(o.value)).length;
            const isActive = activeTab === group.id;

            return (
              <button
                key={group.id}
                type="button"
                onClick={() => setActiveTab(group.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <span>{group.shortLabel}</span>
                {count > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      isActive ? 'bg-white text-emerald-800' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search inside categories */}
        <div className="relative shrink-0 sm:w-36">
          <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search tags..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white pl-7 pr-2.5 py-1 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Category Groups & Option Tiles */}
      <div className="space-y-2.5 max-h-[36vh] overflow-y-auto pr-1">
        {displayGroups.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500">
            No categories matching &quot;{searchFilter}&quot;
          </div>
        ) : (
          displayGroups.map((group) => {
            const groupOptions = group.options.map((o) => o.value);
            const groupSelectedCount = groupOptions.filter((val) => isSelected(val)).length;

            return (
              <div
                key={group.id}
                className={`rounded-lg border p-2.5 transition-all ${
                  groupSelectedCount > 0
                    ? 'border-emerald-500/40 bg-emerald-50/20'
                    : 'border-slate-200 bg-white'
                }`}
              >
                {/* Group Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-2">
                  <div className="flex items-center gap-1.5">
                    {group.icon}
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      {group.title}
                    </h4>
                  </div>
                  {groupSelectedCount > 0 && (
                    <Badge
                      variant="outline"
                      className="text-[10px] border-emerald-200 text-emerald-700 bg-emerald-50 py-0"
                    >
                      {groupSelectedCount} selected
                    </Badge>
                  )}
                </div>

                {/* Option Button Tiles: Scroll-Safe & No Hidden Inputs */}
                <div className="grid gap-1.5 grid-cols-2 sm:grid-cols-3">
                  {group.options.map((option) => {
                    const active = isSelected(option.value);

                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="checkbox"
                        aria-checked={active}
                        disabled={disabled}
                        onClick={() => handleToggle(option.value)}
                        className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs text-left transition-all ${
                          active
                            ? 'border-emerald-500 bg-emerald-50 text-slate-900 ring-1 ring-emerald-500/30 font-medium'
                            : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/20'
                        } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer active:scale-98'}`}
                      >
                        <div
                          className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-colors ${
                            active
                              ? 'border-emerald-600 bg-emerald-600 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {active && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                        </div>
                        <span className={`truncate text-xs ${active ? 'font-semibold text-emerald-950' : ''}`}>
                          {option.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
    </div>
  );
}
