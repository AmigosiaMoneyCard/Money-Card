import { buildPeakDemandJsPdf } from "./peakPdfExport";
// ─── Peak & Demand Analysis Page (M-Peak) ──────────────────────
// Dedicated Peak Hours, Food Demand, and Operational Traffic Analysis for ORG_ADMIN.
// Uses apiService abstraction strictly — does NOT import mock handlers directly.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiService } from '@/services/api';
import { useBranch } from '@/hooks';
import type {
  PeakAnalyticsOverview,
  ProductDemandMetric,
  Branch,
} from '@/types';
import {
  Button,
  Select,
  Card,
  CardHeader,
  CardContent,
  Badge,
  StatCard,
  LoadingState,
  EmptyState,
  ErrorState,
} from '@/components/ui';
import { DataTable } from '@/components/tables';
import { notify, formatCurrency } from '@/utils';
import {
  Flame,
  Clock,
  TrendingUp,
  Download,
  RefreshCw,
  ShoppingBag,
  Building2,
  Calendar,
} from 'lucide-react';

export type TimeWindowPreset = 'thisMonth' | 'today' | 'last7' | 'last30' | 'custom';

function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getPeakPresetDates(
  preset: TimeWindowPreset,
  customStart?: string,
  customEnd?: string
): { startDate: string; endDate: string } {
  const now = new Date();
  const endStr = formatLocalDate(now);

  if (preset === 'custom') {
    return {
      startDate: customStart || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`,
      endDate: customEnd || endStr,
    };
  }
  if (preset === 'today') {
    return { startDate: endStr, endDate: endStr };
  }
  if (preset === 'last7') {
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { startDate: formatLocalDate(start), endDate: endStr };
  }
  if (preset === 'last30') {
    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { startDate: formatLocalDate(start), endDate: endStr };
  }
  if (preset === 'thisMonth') {
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return { startDate: `${year}-${month}-01`, endDate: endStr };
  }

  return { startDate: '', endDate: endStr };
}

export const STANDARD_FOOD_CATEGORIES = [
  'Veg',
  'Non-Veg',
  'Beverage',
  'Fast Food',
  'Snack',
  'Main Course',
  'Starter',
  'Rice',
  'Curry',
  'Bread',
  'Salad',
  'Soup',
  'Sandwich',
  'Bakery',
  'Dessert',
  'Breakfast',
  'Lunch',
  'Dinner',
];

/**
 * Safely extracts an array of category string tags from any raw format
 * (string with comma/pipe/semicolon delimiters, string array, or undefined).
 */
export function extractProductCategories(rawCategory: unknown): string[] {
  if (!rawCategory) return [];
  if (Array.isArray(rawCategory)) {
    return rawCategory
      .flatMap((c) => extractProductCategories(c))
      .map((c) => c.trim())
      .filter(Boolean);
  }
  if (typeof rawCategory === 'string') {
    return rawCategory
      .split(/[,|;]/)
      .map((c) => c.trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * Checks whether a product matches the selected category accurately.
 * Prevents false positives like "Non-Veg" matching when selecting "Veg".
 */
export function matchesFoodCategory(productCategories: string[], selectedCategory: string): boolean {
  if (!selectedCategory || selectedCategory === 'ALL') return true;
  const target = selectedCategory.trim().toLowerCase();

  return productCategories.some((cat) => {
    const c = cat.trim().toLowerCase();
    if (c === target) return true;
    // Handle pluralization differences like "Beverages" vs "Beverage", "Snacks" vs "Snack"
    if (c.replace(/s$/, '') === target.replace(/s$/, '')) return true;
    return false;
  });
}

/**
 * Sorts food & product demand metrics by Revenue or Orders,
 * prioritizing revenue and available stock health.
 */
export function sortProductDemand(
  items: ProductDemandMetric[],
  sortBy: 'REVENUE' | 'ORDERS' = 'REVENUE'
): ProductDemandMetric[] {
  return [...items].sort((a, b) => {
    if (sortBy === 'REVENUE') {
      // Primary: Revenue descending
      if (b.revenue !== a.revenue) return b.revenue - a.revenue;
      // Secondary: Stock count descending (prioritize healthy stocks)
      const stockA = a.currentStock ?? (a.stockStatus === 'NORMAL' ? 50 : a.stockStatus === 'LOW' ? 5 : 0);
      const stockB = b.currentStock ?? (b.stockStatus === 'NORMAL' ? 50 : b.stockStatus === 'LOW' ? 5 : 0);
      if (stockB !== stockA) return stockB - stockA;
      // Tertiary: Quantity sold descending
      return b.quantitySold - a.quantitySold;
    } else {
      // Primary: Orders / Units sold descending
      if (b.quantitySold !== a.quantitySold) return b.quantitySold - a.quantitySold;
      // Secondary: Revenue descending
      return b.revenue - a.revenue;
    }
  });
}

export function PeakPage() {
  const { currentBranch, selectBranch } = useBranch();

  const [data, setData] = useState<PeakAnalyticsOverview | null>(null);
  const [allBranches, setAllBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Sorting Prioritization: defaults to Main Cafeteria or current active branch
  const [selectedBranchId, setSelectedBranchId] = useState<string>(() => {
    if (currentBranch) return currentBranch.id;
    return 'ALL';
  });

  useEffect(() => {
    if (currentBranch) {
      setSelectedBranchId(currentBranch.id);
    } else if (allBranches.length > 0 && selectedBranchId === 'ALL') {
      const mainBranch =
        allBranches.find((b) => b.name.toLowerCase().includes('main')) || allBranches[0];
      if (mainBranch) {
        setSelectedBranchId(mainBranch.id);
      }
    }
  }, [currentBranch, allBranches, selectedBranchId]);

  const [selectedDateRange, setSelectedDateRange] = useState<TimeWindowPreset>('thisMonth');
  const [startDate, setStartDate] = useState<string>(() => getPeakPresetDates('thisMonth').startDate);
  const [endDate, setEndDate] = useState<string>(() => getPeakPresetDates('thisMonth').endDate);
  const [customStartDate, setCustomStartDate] = useState<string>(() => getPeakPresetDates('thisMonth').startDate);
  const [customEndDate, setCustomEndDate] = useState<string>(() => getPeakPresetDates('thisMonth').endDate);

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [demandSortBy, setDemandSortBy] = useState<'REVENUE' | 'ORDERS'>('REVENUE');
  const [isExporting, setIsExporting] = useState(false);

  const handlePresetChange = (preset: TimeWindowPreset) => {
    setSelectedDateRange(preset);
    if (preset !== 'custom') {
      const { startDate: s, endDate: e } = getPeakPresetDates(preset);
      setStartDate(s);
      setEndDate(e);
      setCustomStartDate(s);
      setCustomEndDate(e);
    }
  };

  const handleApplyCustomDates = () => {
    if (!customStartDate || !customEndDate) {
      notify.error('Please select both start and end dates.');
      return;
    }
    if (customStartDate > customEndDate) {
      notify.error('Start date cannot be after end date.');
      return;
    }
    setStartDate(customStartDate);
    setEndDate(customEndDate);
  };

  // ── Fetch Peak Analytics ───────────────────────────────────
  const fetchPeakData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [peakRes, branchRes] = await Promise.all([
        apiService.analytics.getPeakAnalytics({
          branchId: selectedBranchId !== 'ALL' ? selectedBranchId : undefined,
          startDate,
          endDate,
        }),
        apiService.branches.getBranches(),
      ]);

      if (!peakRes.success) {
        setError(peakRes.error.message || 'Failed to load peak analytics data');
        return;
      }

      setData(peakRes.data);
      if (branchRes.success) {
        const items = branchRes.data.items || [];
        setAllBranches(items);
        if (!currentBranch && selectedBranchId === 'ALL' && items.length > 0) {
          const mainBranch =
            items.find((b: Branch) => b.name.toLowerCase().includes('main')) || items[0];
          if (mainBranch) {
            setSelectedBranchId(mainBranch.id);
          }
        }
      }
    } catch {
      setError('Unable to connect to the server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedBranchId, startDate, endDate, currentBranch]);

  const handleRefreshData = async () => {
    await fetchPeakData();
    notify.success('Peak and demand data refreshed successfully.');
  };

  useEffect(() => {
    let isCancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [peakRes, branchRes] = await Promise.all([
          apiService.analytics.getPeakAnalytics({
            branchId: selectedBranchId !== 'ALL' ? selectedBranchId : undefined,
            startDate,
            endDate,
          }),
          apiService.branches.getBranches(),
        ]);
        if (isCancelled) return;

        if (!peakRes.success) {
          setError(peakRes.error.message || 'Failed to load peak analytics data');
          return;
        }

        setData(peakRes.data);
        if (branchRes.success) {
          setAllBranches(branchRes.data.items);
        }
      } catch {
        if (!isCancelled) setError('Unable to connect to the server. Please try again.');
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      isCancelled = true;
    };
  }, [selectedBranchId, startDate, endDate]);

  // ── CSV Export Handler ────────────────────────────────────
  // ── PDF Download Handler ──────────────────────────────────────────
  const handleDownloadPdf = async () => {
    if (!data) {
      notify.error('No peak demand data available to export.');
      return;
    }

    setIsExporting(true);
    try {
      const selectedBranchObj = allBranches.find((b) => b.id === selectedBranchId);
      const selectedBranchName = selectedBranchId === 'ALL'
        ? 'All Branches'
        : (selectedBranchObj?.name || 'Selected Branch');

      const dateRangeLabel =
        selectedDateRange === 'today'
          ? 'Today'
          : selectedDateRange === 'last7'
          ? 'Last 7 Days'
          : selectedDateRange === 'last30'
          ? 'Last 30 Days'
          : selectedDateRange === 'custom'
          ? `Custom Range (${startDate} to ${endDate})`
          : 'This Month';

      const sortLabel = demandSortBy === 'REVENUE' ? 'Revenue Wise' : 'Order Wise';
      const doc = buildPeakDemandJsPdf({
        data: {
          ...data,
          productDemand: filteredProducts,
        },
        selectedBranchName,
        dateRangeLabel:
          selectedCategory !== 'ALL'
            ? `${dateRangeLabel} (${sortLabel}, Category: ${selectedCategory})`
            : `${dateRangeLabel} (${sortLabel})`,
        organizationName: 'Money Card Cafeteria',
      });

      const filename = `Peak_Demand_Report_${selectedBranchName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(filename);

      notify.success('Peak & Demand PDF downloaded successfully.');
    } catch (err: any) {
      notify.error(err?.message || 'Failed to generate Peak & Demand PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  // ── Filtered Products Demand ──────────────────────────────
  const productDemand = useMemo(() => {
    if (!data?.productDemand) return [];
    return data.productDemand
      .filter((p) => !p.productName.toLowerCase().includes('temp delete'))
      .map((p) => {
        const cats = extractProductCategories(p.category);
        return {
          ...p,
          category: cats.length > 0 ? cats.join(', ') : 'General Food',
          _categoryList: cats.length > 0 ? cats : ['General Food'],
        };
      });
  }, [data?.productDemand]);

  const categories = useMemo(() => {
    const set = new Set<string>();

    // 1. Dynamic categories from loaded product demand records
    productDemand.forEach((p) => {
      const cats = (p as any)._categoryList || extractProductCategories(p.category);
      cats.forEach((c: string) => {
        if (c && c.toLowerCase() !== 'general food') {
          set.add(c);
        }
      });
    });

    // 2. Standard food categories so all options are selectable in the filter dropdown
    STANDARD_FOOD_CATEGORIES.forEach((cat) => set.add(cat));

    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [productDemand]);

  const filteredProducts = useMemo(() => {
    if (!productDemand) return [];
    let items = productDemand;
    if (selectedCategory !== 'ALL') {
      items = items.filter((p) => {
        const cats = (p as any)._categoryList || extractProductCategories(p.category);
        return matchesFoodCategory(cats, selectedCategory);
      });
    }
    return sortProductDemand(items, demandSortBy);
  }, [productDemand, selectedCategory, demandSortBy]);

  // Columns for Product Demand Table - Prioritizing Revenue and Stocks
  const productColumns = [
    {
      key: 'productName',
      header: 'Product / Food Item',
      render: (p: ProductDemandMetric) => (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <ShoppingBag className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-slate-900">{p.productName}</p>
            <span className="text-[11px] text-slate-500">{p.category}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'revenue',
      header: 'Gross Revenue',
      render: (p: ProductDemandMetric) => (
        <div className="flex flex-col">
          <span className="font-mono text-sm font-bold text-emerald-600">
            {formatCurrency(p.revenue)}
          </span>
          <span className="text-[10px] text-slate-400">Total Sales</span>
        </div>
      ),
    },
    {
      key: 'stockStatus',
      header: 'Stock & Availability',
      render: (p: ProductDemandMetric) => {
        const stockCount = p.currentStock;
        return (
          <div className="flex items-center gap-1.5">
            <Badge
              variant={
                p.stockStatus === 'NORMAL'
                  ? 'success'
                  : p.stockStatus === 'LOW'
                    ? 'warning'
                    : 'danger'
              }
            >
              {p.stockStatus === 'OUT_OF_STOCK'
                ? 'Out of Stock'
                : p.stockStatus === 'LOW'
                  ? 'Low Stock'
                  : 'In Stock'}
            </Badge>
            {stockCount !== undefined && (
              <span className="font-mono text-xs font-bold text-slate-700">
                {stockCount} in stock
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'quantitySold',
      header: 'Orders & Volume',
      render: (p: ProductDemandMetric) => (
        <span className="font-mono text-sm font-bold text-slate-900">
          {p.quantitySold.toLocaleString()} orders
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* ── Header Bar ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Peak & Demand Analytics</h1>
            <Badge variant="warning" className="gap-1 bg-amber-500/10 text-amber-600 border-amber-500/30">
              <Flame className="h-3 w-3" />
              Live Demand
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            onClick={handleDownloadPdf}
            isLoading={isExporting}
            leftIcon={<Download className="h-4 w-4" />}
          >
            Download PDF
          </Button>
        </div>
      </div>

      {/* ── Filter Toolbar ── */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 flex-1">
            {/* Branch Scope Filter */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">Branch Scope</label>
              <Select
                id="peak-branch-scope"
                value={selectedBranchId}
                onChange={(e) => {
                  setSelectedBranchId(e.target.value);
                  selectBranch(e.target.value);
                }}
                options={[
                  { value: 'ALL', label: 'All Branches' },
                  ...allBranches.map((b) => ({ value: b.id, label: b.name })),
                ]}
              />
            </div>

            {/* Time Window Selector */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">Time Window</label>
              <Select
                id="peak-time-window"
                value={selectedDateRange}
                onChange={(e) => handlePresetChange(e.target.value as TimeWindowPreset)}
                options={[
                  { value: 'thisMonth', label: 'This Month' },
                  { value: 'today', label: 'Today' },
                  { value: 'last7', label: 'Last 7 Days' },
                  { value: 'last30', label: 'Last 30 Days' },
                  { value: 'custom', label: 'Custom Range' },
                ]}
              />
            </div>

            {/* Food Category Filter */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">Food Category</label>
              <Select
                id="peak-food-category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                options={[
                  { value: 'ALL', label: 'All Food Categories' },
                  ...categories.map((c) => ({ value: c, label: c })),
                ]}
              />
            </div>
          </div>

          <div className="flex items-center self-end lg:self-end">
            <Button
              variant="outline"
              size="md"
              onClick={handleRefreshData}
              isLoading={isLoading}
              leftIcon={<RefreshCw className="h-4 w-4" />}
            >
              Refresh Data
            </Button>
          </div>
        </div>

        {/* Custom Range Sub-bar */}
        {selectedDateRange === 'custom' && (
          <div
            data-testid="peak-custom-date-container"
            className="flex flex-wrap items-end gap-3 pt-3 border-t border-slate-100"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 self-center">
              <Calendar className="h-4 w-4 text-emerald-600" />
              <span>Custom Date Range:</span>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-600">Start Date</label>
              <input
                id="peak-start-date"
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none shadow-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-600">End Date</label>
              <input
                id="peak-end-date"
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none shadow-sm"
              />
            </div>
            <Button
              id="peak-apply-custom-date"
              size="sm"
              variant="primary"
              onClick={handleApplyCustomDates}
              className="h-8"
            >
              Apply Range
            </Button>
            {startDate && endDate && (
              <span className="text-xs text-slate-500 self-center">
                Active: <span className="font-semibold text-slate-700">{startDate}</span> to{' '}
                <span className="font-semibold text-slate-700">{endDate}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <LoadingState message="Calculating hour-by-hour peak and item demand distributions..." />
      ) : error ? (
        <ErrorState title="Failed to load peak analytics" message={error} onRetry={fetchPeakData} />
      ) : data ? (
        <div className="space-y-8">
          {/* ── KPI Cards ── */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Busiest Peak Hour"
              value={data.comparison.busiestHour}
              icon={<Clock className="h-5 w-5 text-amber-600" />}
            />
            <StatCard
              label="Peak Hours Volume"
              value={formatCurrency(data.comparison.peakVolume)}
              icon={<Flame className="h-5 w-5 text-rose-600" />}
            />
            <StatCard
              label="Peak Transactions"
              value={data.comparison.peakTransactions.toLocaleString()}
              icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
            />
            <StatCard
              label="Busiest Branch"
              value={data.comparison.busiestBranchName}
              icon={<Building2 className="h-5 w-5 text-sky-600" />}
            />
          </div>

          {/* ── Section 1: 24-Hour Activity Heatmap / Bar Distribution ── */}
          <Card>
            <CardHeader
              title="24-Hour Traffic & Demand Distribution"
              description="Live transaction volume and throughput per hour from 00:00 to 23:00."
            />
            <CardContent className="space-y-6">
              {/* Hour Bars */}
              <div className="grid grid-cols-12 sm:grid-cols-24 gap-1.5 items-end h-44 pt-6 px-1">
                {data.hourlyDistribution.map((hour) => {
                  const maxVol = Math.max(...data.hourlyDistribution.map((h) => h.totalVolume), 1);
                  const hasActivity = hour.totalVolume > 0 || hour.transactionCount > 0;
                  const heightPct = hasActivity
                    ? Math.max(8, Math.round((hour.totalVolume / maxVol) * 100))
                    : 3;

                  return (
                    <div
                      key={hour.hour}
                      className="group relative flex flex-col items-center h-full justify-end cursor-pointer"
                    >
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col rounded-lg bg-slate-900/95 backdrop-blur-md border border-slate-700 p-2.5 shadow-2xl z-30 text-[11px] w-36 pointer-events-none">
                        <span className="font-bold text-slate-100">{hour.hourLabel} - {String((hour.hour + 1) % 24).padStart(2, '0')}:00</span>
                        <span className="text-emerald-400 font-mono font-bold mt-0.5">{formatCurrency(hour.totalVolume)}</span>
                        <span className="text-slate-400 text-[10px]">{hour.transactionCount} transactions</span>
                      </div>

                      {/* Visual Bar */}
                      <div
                        className={`w-full rounded-t transition-all duration-300 ${
                          hasActivity
                            ? 'bg-gradient-to-t from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 shadow-sm shadow-emerald-500/20'
                            : 'bg-slate-100 hover:bg-slate-200'
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />

                      {/* Hour Label */}
                      <span className="mt-2 text-[9px] font-mono text-slate-500 rotate-45 sm:rotate-0">
                        {hour.hour % 3 === 0 ? hour.hourLabel.replace(':00', 'h') : ''}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Legend & Summary */}
              <div className="flex flex-wrap items-center justify-between border-t border-slate-200 pt-4 text-xs">
                <div className="flex items-center gap-4 text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded bg-gradient-to-t from-emerald-600 to-teal-500 inline-block" />
                    Hourly Transaction Volume
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded bg-slate-100 border border-slate-200 inline-block" />
                    Zero Activity Window
                  </span>
                </div>
                <div className="flex items-center gap-3 text-slate-600 font-mono text-[11px]">
                  <span>Busiest Hour: <strong className="text-emerald-600">{data.comparison.busiestHour}</strong></span>
                  <span>•</span>
                  <span>Busiest Day: <strong className="text-slate-800">{data.busiestDay || 'Friday'}</strong></span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Section 2: Food / Product Demand Analysis ── */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-lg font-bold text-slate-900">Top Food & Item Demand</h2>
                {selectedCategory !== 'ALL' && (
                  <Badge variant="info" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                    Filtered: {selectedCategory} ({filteredProducts.length})
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Prioritization Toggle: Revenue Wise vs Order Wise */}
                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setDemandSortBy('REVENUE')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                      demandSortBy === 'REVENUE'
                        ? 'bg-white text-emerald-700 font-bold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                    Revenue Wise
                  </button>
                  <button
                    type="button"
                    onClick={() => setDemandSortBy('ORDERS')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                      demandSortBy === 'ORDERS'
                        ? 'bg-white text-emerald-700 font-bold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ShoppingBag className="h-3.5 w-3.5 text-emerald-600" />
                    Order Wise
                  </button>
                </div>

                {selectedCategory !== 'ALL' && (
                  <Button variant="ghost" size="sm" onClick={() => setSelectedCategory('ALL')}>
                    Reset Category Filter
                  </Button>
                )}
              </div>
            </div>

            {filteredProducts.length === 0 ? (
              <EmptyState
                icon={<ShoppingBag className="h-8 w-8 text-slate-500" />}
                title="No product demand records"
                description="No food or item transactions recorded for the selected filter."
              />
            ) : (
              <Card padding="none">
                <DataTable<ProductDemandMetric>
                  data={filteredProducts}
                  columns={productColumns}
                  keyExtractor={(item: ProductDemandMetric) => item.productId}
                />
              </Card>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
