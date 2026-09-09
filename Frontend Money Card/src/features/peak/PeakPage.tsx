import {
  generatePeakDemandPdfBlob,
  downloadPeakDemandPdf,
  type PeakPdfSectionOptions,
} from './peakPdfExport';
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

type HourlyDistribution = PeakAnalyticsOverview['hourlyDistribution'][number];
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
  Modal,
  ModalFooter,
} from '@/components/ui';
import { DataTable, type Column } from '@/components/tables';
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
  Eye,
  Check,
  SlidersHorizontal,
} from 'lucide-react';

export type TimeWindowPreset = 'thisMonth' | 'today' | 'yesterday' | 'last7' | 'last30' | 'custom';

function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getPeakPresetDates(
  preset: TimeWindowPreset,
  customStart?: string,
  customEnd?: string,
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
  if (preset === 'yesterday') {
    const yest = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yestStr = formatLocalDate(yest);
    return { startDate: yestStr, endDate: yestStr };
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
    if (c.replace(/s$/, '') === target.replace(/s$/, '')) return true;
    return false;
  });
}

function resolveStockScore(item: ProductDemandMetric): number {
  if (item.currentStock !== undefined && item.currentStock !== null) {
    return item.currentStock;
  }
  switch (item.stockStatus) {
    case 'NORMAL':
      return 50;
    case 'LOW':
      return 5;
    default:
      return 0;
  }
}

function compareByRevenue(a: ProductDemandMetric, b: ProductDemandMetric): number {
  if (b.revenue !== a.revenue) return b.revenue - a.revenue;
  const stockDiff = resolveStockScore(b) - resolveStockScore(a);
  if (stockDiff !== 0) return stockDiff;
  return b.quantitySold - a.quantitySold;
}

function compareByOrders(a: ProductDemandMetric, b: ProductDemandMetric): number {
  if (b.quantitySold !== a.quantitySold) return b.quantitySold - a.quantitySold;
  return b.revenue - a.revenue;
}

/**
 * Sorts food & product demand metrics by Revenue or Orders,
 * prioritizing revenue and available stock health.
 */
export function sortProductDemand(
  items: ProductDemandMetric[],
  sortBy: 'REVENUE' | 'ORDERS' = 'REVENUE',
): ProductDemandMetric[] {
  const comparator = sortBy === 'REVENUE' ? compareByRevenue : compareByOrders;
  return [...items].sort(comparator);
}

const DATE_RANGE_LABELS: Record<TimeWindowPreset, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  last7: 'Last 7 Days',
  last30: 'Last 30 Days',
  thisMonth: 'This Month',
  custom: 'Custom Range',
};

function formatPeakDateRangeLabel(
  preset: TimeWindowPreset,
  startDate: string,
  endDate: string,
): string {
  if (preset === 'custom') {
    return `Custom Range (${startDate} to ${endDate})`;
  }
  return DATE_RANGE_LABELS[preset] || 'This Month';
}

function usePeakPageData() {
  const { currentBranch, selectBranch } = useBranch();

  const [data, setData] = useState<PeakAnalyticsOverview | null>(null);
  const [allBranches, setAllBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedBranchId, setSelectedBranchId] = useState<string>(() => {
    if (currentBranch) return currentBranch.id;
    return 'ALL';
  });

  useEffect(() => {
    if (currentBranch && currentBranch.id && currentBranch.id !== 'ALL') {
      setSelectedBranchId(currentBranch.id);
    } else {
      setSelectedBranchId('ALL');
    }
  }, [currentBranch]);

  const [selectedDateRange, setSelectedDateRange] = useState<TimeWindowPreset>('thisMonth');
  const [startDate, setStartDate] = useState<string>(() => getPeakPresetDates('thisMonth').startDate);
  const [endDate, setEndDate] = useState<string>(() => getPeakPresetDates('thisMonth').endDate);
  const [customStartDate, setCustomStartDate] = useState<string>(
    () => getPeakPresetDates('thisMonth').startDate,
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    () => getPeakPresetDates('thisMonth').endDate,
  );

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [demandSortBy, setDemandSortBy] = useState<'REVENUE' | 'ORDERS'>('REVENUE');
  const [isExporting, setIsExporting] = useState(false);

  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfSections, setPdfSections] = useState<PeakPdfSectionOptions>({
    includeRushKpis: true,
    includeTrafficDistribution: true,
    includeFoodDemand: true,
  });

  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl);
      }
    };
  }, [pdfPreviewUrl]);

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
    productDemand.forEach((p) => {
      const cats = (p as any)._categoryList || extractProductCategories(p.category);
      cats.forEach((c: string) => {
        if (c && c.toLowerCase() !== 'general food') {
          set.add(c);
        }
      });
    });
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

  const getPeakReportOptions = (overrideSections?: Partial<PeakPdfSectionOptions>) => {
    if (!data) return null;

    const selectedBranchObj = allBranches.find((b) => b.id === selectedBranchId);
    const selectedBranchName =
      selectedBranchId === 'ALL' ? 'All Branches' : selectedBranchObj?.name || 'Selected Branch';

    const baseLabel = formatPeakDateRangeLabel(selectedDateRange, startDate, endDate);
    const sortLabel = demandSortBy === 'REVENUE' ? 'Revenue Wise' : 'Order Wise';

    return {
      data: {
        ...data,
        productDemand: filteredProducts,
      },
      selectedBranchName,
      dateRangeLabel:
        selectedCategory !== 'ALL'
          ? `${baseLabel} (${sortLabel}, Category: ${selectedCategory})`
          : `${baseLabel} (${sortLabel})`,
      organizationName: 'Money Card Cafeteria',
      sections: overrideSections ?? pdfSections,
    };
  };

  const refreshPdfPreview = (sectionsToUse: PeakPdfSectionOptions) => {
    try {
      const options = getPeakReportOptions(sectionsToUse);
      if (!options) return;
      const blob = generatePeakDemandPdfBlob(options);
      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl);
      }
      const url = URL.createObjectURL(blob);
      setPdfPreviewUrl(url);
    } catch (err) {
      console.error('Failed to refresh Peak PDF preview:', err);
    }
  };

  const handleToggleSection = (sectionKey: keyof PeakPdfSectionOptions) => {
    const updated = {
      ...pdfSections,
      [sectionKey]: !pdfSections[sectionKey],
    };
    setPdfSections(updated);
    refreshPdfPreview(updated);
  };

  const handleSetAllSections = (enable: boolean) => {
    const updated: PeakPdfSectionOptions = {
      includeRushKpis: enable,
      includeTrafficDistribution: enable,
      includeFoodDemand: enable,
    };
    setPdfSections(updated);
    refreshPdfPreview(updated);
  };

  const handleViewPdf = () => {
    setIsExporting(true);
    try {
      const options = getPeakReportOptions(pdfSections);
      if (!options) {
        notify.error('No peak demand data available to export.');
        return;
      }

      const blob = generatePeakDemandPdfBlob(options);
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
      const url = URL.createObjectURL(blob);
      setPdfPreviewUrl(url);
      setShowPdfModal(true);
    } catch (err: any) {
      notify.error(err?.message || 'Failed to generate Peak & Demand PDF preview.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPdf = () => {
    setIsExporting(true);
    try {
      const options = getPeakReportOptions(pdfSections);
      if (!options) {
        notify.error('No peak demand data available to export.');
        return;
      }

      const selectedBranchObj = allBranches.find((b) => b.id === selectedBranchId);
      const selectedBranchName =
        selectedBranchId === 'ALL' ? 'All Branches' : selectedBranchObj?.name || 'Selected Branch';

      const filename = `Peak_Demand_Report_${selectedBranchName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
      downloadPeakDemandPdf(options, filename);

      notify.success('Peak & Demand PDF downloaded successfully.');
    } catch (err: any) {
      notify.error(err?.message || 'Failed to generate Peak & Demand PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  return {
    data,
    allBranches,
    isLoading,
    error,
    selectedBranchId,
    setSelectedBranchId,
    selectedDateRange,
    startDate,
    endDate,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    selectedCategory,
    setSelectedCategory,
    demandSortBy,
    setDemandSortBy,
    isExporting,
    showPdfModal,
    setShowPdfModal,
    pdfPreviewUrl,
    setPdfPreviewUrl,
    pdfSections,
    handlePresetChange,
    handleApplyCustomDates,
    fetchPeakData,
    handleRefreshData,
    handleToggleSection,
    handleSetAllSections,
    handleViewPdf,
    handleDownloadPdf,
    categories,
    filteredProducts,
    selectBranch,
  };
}

function PeakKpiGrid({ comparison }: { comparison: PeakAnalyticsOverview['comparison'] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Busiest Peak Hour"
        value={comparison.busiestHour}
        icon={<Clock className="h-5 w-5 text-amber-600" />}
      />
      <StatCard
        label="Peak Hours Volume"
        value={formatCurrency(comparison.peakVolume)}
        icon={<Flame className="h-5 w-5 text-rose-600" />}
      />
      <StatCard
        label="Peak Transactions"
        value={comparison.peakTransactions.toLocaleString()}
        icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
      />
      <StatCard
        label="Busiest Branch"
        value={comparison.busiestBranchName}
        icon={<Building2 className="h-5 w-5 text-sky-600" />}
      />
    </div>
  );
}

function PeakHourlyTrafficChart({
  hourlyDistribution,
  busiestHour,
  busiestDay,
}: {
  hourlyDistribution: HourlyDistribution[];
  busiestHour: string;
  busiestDay?: string;
}) {
  const maxVol = Math.max(...hourlyDistribution.map((h) => h.totalVolume), 1);

  return (
    <Card>
      <CardHeader
        title="24-Hour Traffic & Demand Distribution"
        description="Live transaction volume and throughput per hour from 00:00 to 23:00."
      />
      <CardContent className="space-y-6">
        <div className="grid grid-cols-12 sm:grid-cols-24 gap-1.5 items-end h-44 pt-6 px-1">
          {hourlyDistribution.map((hour) => {
            const hasActivity = hour.totalVolume > 0 || hour.transactionCount > 0;
            const heightPct = hasActivity
              ? Math.max(8, Math.round((hour.totalVolume / maxVol) * 100))
              : 3;

            return (
              <div
                key={hour.hour}
                className="group relative flex flex-col items-center h-full justify-end cursor-pointer"
              >
                <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col rounded-lg bg-slate-900/95 backdrop-blur-md border border-slate-700 p-2.5 shadow-2xl z-30 text-[11px] w-36 pointer-events-none">
                  <span className="font-bold text-slate-100">
                    {hour.hourLabel} - {String((hour.hour + 1) % 24).padStart(2, '0')}:00
                  </span>
                  <span className="text-emerald-400 font-mono font-bold mt-0.5">
                    {formatCurrency(hour.totalVolume)}
                  </span>
                  <span className="text-slate-400 text-[10px]">
                    {hour.transactionCount} transactions
                  </span>
                </div>

                <div
                  className={`w-full rounded-t transition-all duration-300 ${
                    hasActivity
                      ? 'bg-gradient-to-t from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 shadow-sm shadow-emerald-500/20'
                      : 'bg-slate-100 hover:bg-slate-200'
                  }`}
                  style={{ height: `${heightPct}%` }}
                />

                <span className="mt-2 text-[9px] font-mono text-slate-500 rotate-45 sm:rotate-0">
                  {hour.hour % 3 === 0 ? hour.hourLabel.replace(':00', 'h') : ''}
                </span>
              </div>
            );
          })}
        </div>

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
            <span>
              Busiest Hour: <strong className="text-emerald-600">{busiestHour}</strong>
            </span>
            <span>•</span>
            <span>
              Busiest Day: <strong className="text-slate-800">{busiestDay || 'Friday'}</strong>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PeakPdfModal({
  isOpen,
  onClose,
  pdfPreviewUrl,
  pdfSections,
  onToggleSection,
  onSetAllSections,
  onDownloadPdf,
}: {
  isOpen: boolean;
  onClose: () => void;
  pdfPreviewUrl: string | null;
  pdfSections: PeakPdfSectionOptions;
  onToggleSection: (key: keyof PeakPdfSectionOptions) => void;
  onSetAllSections: (enable: boolean) => void;
  onDownloadPdf: () => void;
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Peak & Demand Analytics Report — PDF Preview"
      size="xl"
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                <SlidersHorizontal className="h-4 w-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">Customize Report Sections</h4>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="peak-pdf-select-all"
                onClick={() => onSetAllSections(true)}
                className="rounded-md px-2 py-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                Select All
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                id="peak-pdf-clear-all"
                onClick={() => onSetAllSections(false)}
                className="rounded-md px-2 py-1 text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Clear All
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2.5">
            <button
              type="button"
              id="peak-toggle-rush-kpis"
              onClick={() => onToggleSection('includeRushKpis')}
              className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-all cursor-pointer ${
                pdfSections.includeRushKpis
                  ? 'border-emerald-300 bg-emerald-50/60 text-emerald-950 shadow-2xs ring-1 ring-emerald-400/30'
                  : 'border-slate-200 bg-slate-50/60 text-slate-500 hover:border-slate-300 hover:bg-slate-100/50 opacity-70'
              }`}
            >
              <div
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                  pdfSections.includeRushKpis
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-slate-300 bg-white'
                }`}
              >
                {pdfSections.includeRushKpis && <Check className="h-3 w-3 stroke-[3]" />}
              </div>
              <span className="text-xs font-semibold">1. Peak Hour Metrics</span>
            </button>

            <button
              type="button"
              id="peak-toggle-traffic-distribution"
              onClick={() => onToggleSection('includeTrafficDistribution')}
              className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-all cursor-pointer ${
                pdfSections.includeTrafficDistribution
                  ? 'border-emerald-300 bg-emerald-50/60 text-emerald-950 shadow-2xs ring-1 ring-emerald-400/30'
                  : 'border-slate-200 bg-slate-50/60 text-slate-500 hover:border-slate-300 hover:bg-slate-100/50 opacity-70'
              }`}
            >
              <div
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                  pdfSections.includeTrafficDistribution
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-slate-300 bg-white'
                }`}
              >
                {pdfSections.includeTrafficDistribution && <Check className="h-3 w-3 stroke-[3]" />}
              </div>
              <span className="text-xs font-semibold">2. 24-Hour Traffic</span>
            </button>

            <button
              type="button"
              id="peak-toggle-food-demand"
              onClick={() => onToggleSection('includeFoodDemand')}
              className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-all cursor-pointer ${
                pdfSections.includeFoodDemand
                  ? 'border-emerald-300 bg-emerald-50/60 text-emerald-950 shadow-2xs ring-1 ring-emerald-400/30'
                  : 'border-slate-200 bg-slate-50/60 text-slate-500 hover:border-slate-300 hover:bg-slate-100/50 opacity-70'
              }`}
            >
              <div
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                  pdfSections.includeFoodDemand
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-slate-300 bg-white'
                }`}
              >
                {pdfSections.includeFoodDemand && <Check className="h-3 w-3 stroke-[3]" />}
              </div>
              <span className="text-xs font-semibold">3. Food Demand Summary</span>
            </button>
          </div>
        </div>

        {pdfPreviewUrl && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-lg">
            <iframe
              src={`${pdfPreviewUrl}#toolbar=0`}
              className="w-full h-[70vh] rounded-lg"
              title="Peak & Demand Analytics Report PDF Preview"
            />
          </div>
        )}

        <ModalFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onDownloadPdf}
            leftIcon={<Download className="h-4 w-4" />}
            id="download-peak-customized-pdf-btn"
          >
            Download PDF
          </Button>
        </ModalFooter>
      </div>
    </Modal>
  );
}

const PRODUCT_DEMAND_COLUMNS: Column<ProductDemandMetric>[] = [
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

interface PeakFilterToolbarProps {
  selectedBranchId: string;
  setSelectedBranchId: (id: string) => void;
  selectBranch: (id: string) => void;
  allBranches: Branch[];
  selectedDateRange: TimeWindowPreset;
  handlePresetChange: (preset: TimeWindowPreset) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  categories: string[];
  customStartDate: string;
  setCustomStartDate: (d: string) => void;
  customEndDate: string;
  setCustomEndDate: (d: string) => void;
  startDate: string;
  endDate: string;
  handleApplyCustomDates: () => void;
}

function PeakFilterToolbar({
  selectedBranchId,
  setSelectedBranchId,
  selectBranch,
  allBranches,
  selectedDateRange,
  handlePresetChange,
  selectedCategory,
  setSelectedCategory,
  categories,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  startDate,
  endDate,
  handleApplyCustomDates,
}: PeakFilterToolbarProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 flex-1">
          <div>
            <label htmlFor="peak-branch-scope" className="text-xs font-semibold text-slate-600 block mb-1.5">
              Counter Scope
            </label>
            <Select
              id="peak-branch-scope"
              value={selectedBranchId}
              onChange={(e) => {
                setSelectedBranchId(e.target.value);
                selectBranch(e.target.value);
              }}
              options={[
                { value: 'ALL', label: 'All Counters' },
                ...allBranches.map((b) => ({ value: b.id, label: b.name })),
              ]}
            />
          </div>

          <div>
            <label htmlFor="peak-time-window" className="text-xs font-semibold text-slate-600 block mb-1.5">
              Time Window
            </label>
            <Select
              id="peak-time-window"
              value={selectedDateRange}
              onChange={(e) => handlePresetChange(e.target.value as TimeWindowPreset)}
              options={[
                { value: 'thisMonth', label: 'This Month' },
                { value: 'today', label: 'Today' },
                { value: 'yesterday', label: 'Yesterday' },
                { value: 'last7', label: 'Last 7 Days' },
                { value: 'last30', label: 'Last 30 Days' },
                { value: 'custom', label: 'Custom Range' },
              ]}
            />
          </div>

          <div>
            <label htmlFor="peak-food-category" className="text-xs font-semibold text-slate-600 block mb-1.5">
              Food Category
            </label>
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
      </div>

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
            <label htmlFor="peak-start-date" className="mb-1 block text-[11px] font-medium text-slate-600">
              Start Date
            </label>
            <input
              id="peak-start-date"
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none shadow-sm"
            />
          </div>
          <div>
            <label htmlFor="peak-end-date" className="mb-1 block text-[11px] font-medium text-slate-600">
              End Date
            </label>
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
  );
}

interface PeakFoodDemandSectionProps {
  filteredProducts: ProductDemandMetric[];
  selectedCategory: string;
  demandSortBy: 'REVENUE' | 'ORDERS';
  setDemandSortBy: (sort: 'REVENUE' | 'ORDERS') => void;
  setSelectedCategory: (cat: string) => void;
}

function PeakFoodDemandSection({
  filteredProducts,
  selectedCategory,
  demandSortBy,
  setDemandSortBy,
  setSelectedCategory,
}: PeakFoodDemandSectionProps) {
  return (
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
            columns={PRODUCT_DEMAND_COLUMNS}
            keyExtractor={(item: ProductDemandMetric) => item.productId}
          />
        </Card>
      )}
    </div>
  );
}

export function PeakPage() {
  const {
    data,
    allBranches,
    isLoading,
    error,
    selectedBranchId,
    setSelectedBranchId,
    selectedDateRange,
    startDate,
    endDate,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    selectedCategory,
    setSelectedCategory,
    demandSortBy,
    setDemandSortBy,
    isExporting,
    showPdfModal,
    setShowPdfModal,
    pdfPreviewUrl,
    setPdfPreviewUrl,
    pdfSections,
    handlePresetChange,
    handleApplyCustomDates,
    fetchPeakData,
    handleRefreshData,
    handleToggleSection,
    handleSetAllSections,
    handleViewPdf,
    handleDownloadPdf,
    categories,
    filteredProducts,
    selectBranch,
  } = usePeakPageData();

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
            variant="outline"
            size="sm"
            onClick={handleRefreshData}
            disabled={isLoading}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleViewPdf}
            disabled={isExporting || isLoading || !data}
            leftIcon={<Eye className="h-4 w-4" />}
            id="view-peak-pdf-btn"
          >
            View PDF
          </Button>
        </div>
      </div>

      <PeakFilterToolbar
        selectedBranchId={selectedBranchId}
        setSelectedBranchId={setSelectedBranchId}
        selectBranch={selectBranch}
        allBranches={allBranches}
        selectedDateRange={selectedDateRange}
        handlePresetChange={handlePresetChange}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        categories={categories}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
        startDate={startDate}
        endDate={endDate}
        handleApplyCustomDates={handleApplyCustomDates}
      />

      {isLoading ? (
        <LoadingState message="Calculating hour-by-hour peak and item demand distributions..." />
      ) : error ? (
        <ErrorState title="Failed to load peak analytics" message={error} onRetry={fetchPeakData} />
      ) : data ? (
        <div className="space-y-8">
          <PeakKpiGrid comparison={data.comparison} />

          <PeakHourlyTrafficChart
            hourlyDistribution={data.hourlyDistribution}
            busiestHour={data.comparison.busiestHour}
            busiestDay={data.busiestDay}
          />

          <PeakFoodDemandSection
            filteredProducts={filteredProducts}
            selectedCategory={selectedCategory}
            demandSortBy={demandSortBy}
            setDemandSortBy={setDemandSortBy}
            setSelectedCategory={setSelectedCategory}
          />
        </div>
      ) : null}

      <PeakPdfModal
        isOpen={showPdfModal}
        onClose={() => {
          setShowPdfModal(false);
          if (pdfPreviewUrl) {
            URL.revokeObjectURL(pdfPreviewUrl);
            setPdfPreviewUrl(null);
          }
        }}
        pdfPreviewUrl={pdfPreviewUrl}
        pdfSections={pdfSections}
        onToggleSection={handleToggleSection}
        onSetAllSections={handleSetAllSections}
        onDownloadPdf={handleDownloadPdf}
      />
    </div>
  );
}
