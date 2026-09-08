// ─── Organization Admin Analytics View (M9 Analytics Correction) ─────────
// Organization-specific analytics strictly scoped to ORG_ADMIN.
// Provides View PDF, Download PDF, and Detailed Branch Performance Comparison.
// Uses VIEW_ANALYTICS permission strictly.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiService } from '@/services/api';
import { useBranch, useAuth } from '@/hooks';
import type {
  AnalyticsOverview,
  Branch,
  BranchPerformanceMetric,
  StaffPerformanceMetric,
  StaffActivityItem,
} from '@/types';
import {
  Button,
  Select,
  Card,
  Badge,
  StatCard,
  Modal,
  ModalFooter,
  LoadingState,
  ErrorState,
} from '@/components/ui';
import { notify, formatCurrency } from '@/utils';
import {
  generateAnalyticsPdfBlob,
  downloadOrgAnalyticsPdf,
  type OrgPdfSectionOptions,
} from './analyticsPdfExport';
import { filterStaffActivities, calculateScopedStaffMetrics } from './staffActivityFilter';
import {
  BarChart3,
  CreditCard,
  TrendingUp,
  RefreshCw,
  Building2,
  DollarSign,
  Eye,
  Download,
  Layers,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertCircle,
  Users,
  UserCheck,
  History,
  Search,
  FileSpreadsheet,
  Calendar,
  Filter,
  Check,
  SlidersHorizontal,
} from 'lucide-react';

export type DatePreset = 'thisMonth' | 'today' | 'yesterday' | 'last7' | 'last30' | 'custom';
type SortMetric = 'revenue' | 'transactions' | 'purchases' | 'cardRecharge' | 'upiRecharge' | 'recharges' | 'sessions' | 'products';
export type StaffSortMetric =
  | 'activated'
  | 'settled'
  | 'cardRecharge'
  | 'purchases'
  | 'refunds'
  | 'txns'
  | 'name';

export function getPresetDates(preset: DatePreset): { startDate: string; endDate: string } {
  const now = new Date();
  const endStr = now.toISOString().split('T')[0];

  if (preset === 'today') {
    return { startDate: endStr, endDate: endStr };
  }
  if (preset === 'yesterday') {
    const yest = new Date(now);
    yest.setDate(yest.getDate() - 1);
    const yestStr = yest.toISOString().split('T')[0];
    return { startDate: yestStr, endDate: yestStr };
  }
  if (preset === 'last7') {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    return { startDate: start.toISOString().split('T')[0], endDate: endStr };
  }
  if (preset === 'last30') {
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    return { startDate: start.toISOString().split('T')[0], endDate: endStr };
  }
  if (preset === 'thisMonth') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { startDate: start.toISOString().split('T')[0], endDate: endStr };
  }

  return { startDate: '', endDate: endStr };
}

export function OrgAdminAnalyticsView() {
  const { currentBranch, selectBranch } = useBranch();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // PDF Viewer Modal & Option-Wise Customizer State
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfSections, setPdfSections] = useState<OrgPdfSectionOptions>({
    includeExecutiveKpis: true,
    includeBranchComparison: true,
    includeStaffPerformance: true,
  });

  // Clean up object URL when component unmounts or preview changes
  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl);
      }
    };
  }, [pdfPreviewUrl]);

  // Sorting & Detail state for Branch Comparison
  const [sortBy, setSortBy] = useState<SortMetric>('revenue');
  const [selectedBranchDetail, setSelectedBranchDetail] = useState<BranchPerformanceMetric | null>(null);

  // Staff Performance & Operational Activity Modal State
  const [selectedStaffDetail, setSelectedStaffDetail] = useState<StaffPerformanceMetric | null>(null);
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [staffSortBy, setStaffSortBy] = useState<StaffSortMetric>('activated');
  const [staffSortOrder, setStaffSortOrder] = useState<'desc' | 'asc'>('desc');
  const [staffActivityTypeFilter, setStaffActivityTypeFilter] = useState<'ALL' | 'CARD_ACTIVATION' | 'RECHARGE' | 'PURCHASE' | 'CARD_SETTLEMENT' | 'OTHER'>('ALL');
  const [staffActivitySearch, setStaffActivitySearch] = useState('');

  // Filters state
  const [branchFilter, setBranchFilter] = useState<string>(
    searchParams.get('branchId') || currentBranch?.id || 'ALL',
  );

  useEffect(() => {
    setBranchFilter(currentBranch ? currentBranch.id : 'ALL');
  }, [currentBranch]);
  const [datePreset, setDatePreset] = useState<DatePreset>(
    (searchParams.get('preset') as DatePreset) || 'today',
  );
  const [startDate, setStartDate] = useState<string>(() => {
    return searchParams.get('startDate') || getPresetDates('today').startDate;
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return searchParams.get('endDate') || getPresetDates('today').endDate;
  });

  const fetchBranches = useCallback(async () => {
    try {
      const res = await apiService.branches.getBranches();
      if (res.success) {
        setBranches(res.data.items);
      }
    } catch {
      // Ignored
    }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const targetBranch = branchFilter !== 'ALL' ? branchFilter : undefined;
      const res = await apiService.analytics.getOverview({
        branchId: targetBranch,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      if (!res.success) {
        setError(res.error.message || 'Failed to load analytics');
        return;
      }

      setAnalytics(res.data);
    } catch {
      setError('Unable to connect to the server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [branchFilter, startDate, endDate]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  useEffect(() => {
    let isCancelled = false;
    const load = async () => {
      setError(null);
      try {
        const targetBranch = branchFilter !== 'ALL' ? branchFilter : undefined;
        const res = await apiService.analytics.getOverview({
          branchId: targetBranch,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        });

        if (isCancelled) return;
        if (!res.success) {
          setError(res.error.message || 'Failed to load analytics');
          return;
        }

        setAnalytics(res.data);
      } catch {
        if (!isCancelled) {
          setError('Unable to connect to the server. Please try again.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    load();
    return () => {
      isCancelled = true;
    };
  }, [branchFilter, startDate, endDate]);

  const handleBranchChange = (newBranchId: string) => {
    setBranchFilter(newBranchId);
    selectBranch(newBranchId);
    const newParams = new URLSearchParams(searchParams);
    if (newBranchId && newBranchId !== 'ALL') {
      newParams.set('branchId', newBranchId);
    } else {
      newParams.delete('branchId');
    }
    setSearchParams(newParams);
  };

  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset !== 'custom') {
      const { startDate: s, endDate: e } = getPresetDates(preset);
      setStartDate(s);
      setEndDate(e);

      const newParams = new URLSearchParams(searchParams);
      newParams.set('preset', preset);
      newParams.set('startDate', s);
      newParams.set('endDate', e);
      setSearchParams(newParams);
    }
  };

  const handleCustomDateApply = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    setDatePreset('custom');

    const newParams = new URLSearchParams(searchParams);
    newParams.set('preset', 'custom');
    newParams.set('startDate', start);
    newParams.set('endDate', end);
    setSearchParams(newParams);
  };

  const selectedBranchObj = useMemo(
    () => branches.find((b) => b.id === branchFilter),
    [branches, branchFilter],
  );
  const selectedBranchName = branchFilter === 'ALL' ? 'All Branches' : selectedBranchObj?.name || branchFilter;

  const dateRangeLabel = useMemo(() => {
    return datePreset === 'today'
      ? 'Today'
      : datePreset === 'yesterday'
      ? 'Yesterday'
      : datePreset === 'last7'
      ? 'Last 7 Days'
      : datePreset === 'last30'
      ? 'Last 30 Days'
      : datePreset === 'thisMonth'
      ? 'This Month'
      : `${startDate} to ${endDate}`;
  }, [datePreset, startDate, endDate]);

  // Helper to compile Org Admin PDF Options with dynamic section toggles
  const getOrgReportOptions = (overrideSections?: Partial<OrgPdfSectionOptions>) => {
    if (!analytics) return null;

    return {
      analytics,
      branches,
      selectedBranchName,
      dateRangeLabel,
      organizationName: user?.organizationId ? `Organization ${user.organizationId}` : 'Organization Portal',
      sections: overrideSections ?? pdfSections,
    };
  };

  const activeSectionsCount = useMemo(() => {
    let count = 0;
    if (pdfSections.includeExecutiveKpis) count++;
    if (pdfSections.includeBranchComparison) count++;
    if (pdfSections.includeStaffPerformance) count++;
    return count;
  }, [pdfSections]);

  // Real-time PDF preview refresh when an option is modified
  const refreshPdfPreview = (sectionsToUse: OrgPdfSectionOptions) => {
    try {
      const options = getOrgReportOptions(sectionsToUse);
      if (!options) return;
      const blob = generateAnalyticsPdfBlob(options);
      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl);
      }
      const url = URL.createObjectURL(blob);
      setPdfPreviewUrl(url);
    } catch (err) {
      console.error('Failed to refresh PDF preview:', err);
    }
  };

  // Interactive Section Toggle handler (immediately modifies PDF preview)
  const handleToggleSection = (sectionKey: keyof OrgPdfSectionOptions) => {
    const updated = {
      ...pdfSections,
      [sectionKey]: !pdfSections[sectionKey],
    };
    setPdfSections(updated);
    refreshPdfPreview(updated);
  };

  const handleSetAllSections = (enable: boolean) => {
    const updated: OrgPdfSectionOptions = {
      includeExecutiveKpis: enable,
      includeBranchComparison: enable,
      includeStaffPerformance: enable,
    };
    setPdfSections(updated);
    refreshPdfPreview(updated);
  };

  // ── 1. View PDF Action ─────────────────────────────────────
  const handleViewPdf = () => {
    setIsExportingPdf(true);
    try {
      const options = getOrgReportOptions(pdfSections);
      if (!options) {
        notify.error('No analytics data available to render PDF.');
        return;
      }

      const blob = generateAnalyticsPdfBlob(options);
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `MoneyCard_OrgAdmin_Analytics_${dateStr}.pdf`;

      console.log('[Org Admin] PDF Preview Ready:', { size: blob.size, type: blob.type, filename });

      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
      const url = URL.createObjectURL(blob);
      setPdfPreviewUrl(url);
      setShowPdfModal(true);
    } catch {
      notify.error('Failed to generate PDF preview.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // ── 2. Download PDF Action (Accurately downloads selected options via doc.save) ──
  const handleDownloadPdf = () => {
    setIsExportingPdf(true);
    try {
      const options = getOrgReportOptions(pdfSections);
      if (!options) {
        notify.error('No analytics data available to download.');
        return;
      }

      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `MoneyCard_OrgAdmin_Analytics_${dateStr}.pdf`;

      // Execute native jsPDF file download strictly matching enabled options
      downloadOrgAnalyticsPdf(options, filename);

      notify.success(`Analytics report downloaded: ${filename}`);
    } catch {
      notify.error('Failed to download Analytics PDF');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Dynamic exact breakdown from ledger analytics
  const cashRechargeAmount = useMemo(
    () => (analytics?.cashRechargeVolume !== undefined ? analytics.cashRechargeVolume : 0),
    [analytics],
  );
  const upiRechargeAmount = useMemo(
    () => (analytics?.upiRechargeVolume !== undefined ? analytics.upiRechargeVolume : 0),
    [analytics],
  );

  // Sorted Branch Comparison list
  const sortedBranchComparison = useMemo(() => {
    if (!analytics?.branchPerformance) return [];
    const list = [...analytics.branchPerformance];

    list.sort((a, b) => {
      switch (sortBy) {
        case 'revenue':
          return b.totalRevenue - a.totalRevenue;
        case 'transactions':
          return b.transactionCount - a.transactionCount;
        case 'purchases':
          return b.purchaseCount - a.purchaseCount;
        case 'cardRecharge':
          return (
            (b.cardRechargeVolume ?? b.cashRechargeVolume ?? 0) -
            (a.cardRechargeVolume ?? a.cashRechargeVolume ?? 0)
          );
        case 'upiRecharge':
          return (b.upiRechargeVolume ?? 0) - (a.upiRechargeVolume ?? 0);
        case 'recharges':
          return b.rechargeVolume - a.rechargeVolume;
        case 'sessions':
          return b.sessionCount - a.sessionCount;
        case 'products':
          return b.productsSoldCount - a.productsSoldCount;
        default:
          return b.totalRevenue - a.totalRevenue;
      }
    });

    return list;
  }, [analytics, sortBy]);

  const topBranch = sortedBranchComparison[0];

  const handleStaffColumnSort = (column: StaffSortMetric) => {
    if (staffSortBy === column) {
      setStaffSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setStaffSortBy(column);
      setStaffSortOrder(column === 'name' ? 'asc' : 'desc');
    }
  };

  const renderSortIcon = (column: StaffSortMetric) => {
    if (staffSortBy !== column) {
      return <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-60" />;
    }
    return staffSortOrder === 'desc' ? (
      <ArrowDown className="h-3.5 w-3.5 text-emerald-600 font-bold" />
    ) : (
      <ArrowUp className="h-3.5 w-3.5 text-emerald-600 font-bold" />
    );
  };

  // Filter out any non-staff users (e.g., Org Admin accounts) to strictly represent operational staff
  const staffOnlyPerformance = useMemo(() => {
    if (!analytics?.staffPerformance) return [];
    return analytics.staffPerformance.filter(
      (st) =>
        st.role !== 'ORG_ADMIN' &&
        st.role !== 'SUPER_ADMIN' &&
        !st.role?.toLowerCase().includes('admin'),
    );
  }, [analytics?.staffPerformance]);

  const activeStaffList = useMemo(() => {
    return staffOnlyPerformance.filter((st) => st.status === 'ACTIVE');
  }, [staffOnlyPerformance]);

  const sortedStaffPerformance = useMemo(() => {
    let list = [...staffOnlyPerformance];

    if (staffSearchQuery.trim()) {
      const q = staffSearchQuery.toLowerCase();
      list = list.filter(
        (st) =>
          st.staffName.toLowerCase().includes(q) ||
          st.staffEmail.toLowerCase().includes(q) ||
          (st.branchName || '').toLowerCase().includes(q),
      );
    }

    const modifier = staffSortOrder === 'asc' ? 1 : -1;

    list.sort((a, b) => {
      let diff = 0;
      switch (staffSortBy) {
        case 'activated':
          diff = (Number(a.cardsActivatedCount) || 0) - (Number(b.cardsActivatedCount) || 0);
          break;
        case 'settled':
          diff = (Number(a.cardsSettledCount) || 0) - (Number(b.cardsSettledCount) || 0);
          break;
        case 'cardRecharge':
          diff = (Number(a.cardRechargeVolume) || 0) - (Number(b.cardRechargeVolume) || 0);
          break;
        case 'purchases':
          diff = (Number(a.purchaseVolume) || 0) - (Number(b.purchaseVolume) || 0);
          break;
        case 'refunds':
          diff = (Number(a.refundVolume) || 0) - (Number(b.refundVolume) || 0);
          break;
        case 'txns':
          diff = (Number(a.totalTransactionsCount) || 0) - (Number(b.totalTransactionsCount) || 0);
          break;
        case 'name':
          return modifier * a.staffName.localeCompare(b.staffName);
        default:
          diff = (Number(a.cardsActivatedCount) || 0) - (Number(b.cardsActivatedCount) || 0);
          break;
      }

      if (diff !== 0) {
        return modifier * diff;
      }
      return a.staffName.localeCompare(b.staffName);
    });

    return list;
  }, [staffOnlyPerformance, staffSearchQuery, staffSortBy, staffSortOrder]);

  const totalCardsActivatedByStaff = useMemo(() => {
    return staffOnlyPerformance.reduce((acc, st) => acc + (st.cardsActivatedCount || 0), 0);
  }, [staffOnlyPerformance]);

  const totalCardsSettledByStaff = useMemo(() => {
    return staffOnlyPerformance.reduce((acc, st) => acc + (st.cardsSettledCount || 0), 0);
  }, [staffOnlyPerformance]);

  // Activities filtered strictly by Branch Scope and Time Window
  const scopedStaffActivities = useMemo(() => {
    if (!selectedStaffDetail?.activities) return [];
    return filterStaffActivities({
      activities: selectedStaffDetail.activities,
      branchFilter,
      branchName: selectedBranchObj?.name,
      startDate,
      endDate,
    });
  }, [selectedStaffDetail, branchFilter, selectedBranchObj, startDate, endDate]);

  // Further filtered by Modal Tab (Activity Type) and in-modal Search Query
  const filteredStaffActivities = useMemo(() => {
    return filterStaffActivities({
      activities: scopedStaffActivities,
      branchFilter: 'ALL',
      typeFilter: staffActivityTypeFilter,
      searchQuery: staffActivitySearch,
    });
  }, [scopedStaffActivities, staffActivityTypeFilter, staffActivitySearch]);

  // Dynamic KPI Metrics for the Modal based on active branch scope & time window
  const modalScopedStaffMetrics = useMemo(() => {
    if (!selectedStaffDetail) {
      return {
        cardsActivatedCount: 0,
        cardsSettledCount: 0,
        cardRechargeVolume: 0,
        upiRechargeVolume: 0,
        rechargeVolume: 0,
        purchaseVolume: 0,
        refundVolume: 0,
        totalVolumeHandled: 0,
      };
    }

    if (scopedStaffActivities.length === 0 && selectedStaffDetail.activities.length === 0) {
      return selectedStaffDetail;
    }

    return calculateScopedStaffMetrics(scopedStaffActivities);
  }, [selectedStaffDetail, scopedStaffActivities]);

  const handleExportStaffCsv = (staff: StaffPerformanceMetric) => {
    const headers = [
      'Timestamp',
      'Type',
      'Card Number',
      'Customer Name',
      'Customer Phone',
      'Amount (INR)',
      'Branch',
      'Description',
    ];
    const exportList = filteredStaffActivities.length > 0 ? filteredStaffActivities : scopedStaffActivities;
    const rows = exportList.map((act: StaffActivityItem) => [
      `"${new Date(act.timestamp).toLocaleString()}"`,
      `"${act.title}"`,
      `"${act.cardNumber || '—'}"`,
      `"${act.customerName || '—'}"`,
      `"${act.customerPhone || '—'}"`,
      act.amount !== undefined ? act.amount : 0,
      `"${act.branchName || '—'}"`,
      `"${act.description.replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r: (string | number)[]) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const sanitizedStaff = staff.staffName.replace(/\s+/g, '_');
    const sanitizedBranch = selectedBranchName.replace(/\s+/g, '_');
    link.setAttribute('download', `${sanitizedStaff}_${sanitizedBranch}_Operational_Activity_Audit.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    notify.success(`Exported ${exportList.length} operational activity records for ${staff.staffName}`);
  };

  return (
    <div className="space-y-8">
      {/* Header Bar with View PDF and Download PDF Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Organization Analytics</h1>
            <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50/50">
              Organization Scope
            </Badge>
          </div>
        </div>

        {/* Action Button: [ View PDF ] */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="primary"
            size="sm"
            onClick={handleViewPdf}
            disabled={isExportingPdf || isLoading || !analytics}
            leftIcon={<Eye className="h-4 w-4" />}
          >
            View PDF
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {/* Branch Scope Filter */}
          <div className="w-full sm:w-52">
            <label className="mb-1 block text-[11px] font-medium text-slate-600">Branch Scope</label>
            <Select
              id="analytics-branch-filter"
              value={branchFilter}
              onChange={(e) => handleBranchChange(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Branches' },
                ...branches.map((b) => ({ value: b.id, label: b.name })),
              ]}
            />
          </div>

          {/* Date Preset Filter */}
          <div className="w-full sm:w-44">
            <label className="mb-1 block text-[11px] font-medium text-slate-600">Time Window</label>
            <Select
              id="analytics-preset-filter"
              value={datePreset}
              onChange={(e) => handlePresetChange(e.target.value as DatePreset)}
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

          {/* Custom Date Inputs (if selected) */}
          {datePreset === 'custom' && (
            <div className="flex items-end gap-2">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-600">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none shadow-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-600">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none shadow-sm"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCustomDateApply(startDate, endDate)}
                className="h-8"
              >
                Apply
              </Button>
            </div>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchAnalytics()}
          leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          className="self-end lg:self-center"
        >
          Refresh Data
        </Button>
      </div>

      {isLoading ? (
        <LoadingState message="Calculating organization metrics & ledger analytics..." />
      ) : error ? (
        <ErrorState title="Failed to load analytics" message={error} onRetry={fetchAnalytics} />
      ) : analytics ? (
        <div className="space-y-8">
          {/* Top 4 KPI Metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total POS Revenue"
              value={formatCurrency(analytics.totalPurchaseVolume)}
              icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
            />

            <StatCard
              label="Wallet Recharges"
              value={formatCurrency(analytics.totalRechargeVolume)}
              icon={<CreditCard className="h-5 w-5 text-emerald-600" />}
            />

            <StatCard
              label="Total Transactions"
              value={analytics.totalTransactions.toLocaleString()}
              icon={<BarChart3 className="h-5 w-5 text-emerald-600" />}
            />

            <StatCard
              label="Active Card Sessions"
              value={analytics.activeSessionsCount.toLocaleString()}
              icon={<Layers className="h-5 w-5 text-emerald-600" />}
            />
          </div>

          {/* Card Lifecycle & Activity (Active Card Recharges, Closed Cards, Zero Balance Cards) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Card Lifecycle & Activity</h2>
              <span className="text-xs text-slate-500 font-medium">Real-time card circulation and session status</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {/* Box 1: Already active card how many times it got recharged */}
              <Card padding="md" className="border-slate-200 bg-white shadow-xs hover:border-slate-300 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Active Card Recharges
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <RefreshCw className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <p className="font-mono text-2xl font-bold text-slate-900">
                    {(analytics.activeCardsRechargeCount ?? 0).toLocaleString()}{' '}
                    <span className="text-xs font-normal text-slate-500">
                      {(analytics.activeCardsRechargeCount ?? 0) === 1 ? 'Recharge' : 'Recharges'}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {(analytics.reRechargedCardsCount ?? 0) > 0
                      ? `${analytics.reRechargedCardsCount} repeat top-up${(analytics.reRechargedCardsCount ?? 0) === 1 ? '' : 's'} on active cards`
                      : 'Total times active cards were recharged'}
                  </p>
                </div>
              </Card>

              {/* Box 2: How many cards got closed */}
              <Card padding="md" className="border-slate-200 bg-white shadow-xs hover:border-slate-300 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Closed Cards
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <p className="font-mono text-2xl font-bold text-slate-900">
                    {(analytics.closedCardsCount ?? 0).toLocaleString()}{' '}
                    <span className="text-xs font-normal text-slate-500">
                      {(analytics.closedCardsCount ?? 0) === 1 ? 'Card' : 'Cards'}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Completed & settled card sessions
                  </p>
                </div>
              </Card>

              {/* Box 3: Active cards but Zero balance */}
              <Card padding="md" className="border-slate-200 bg-white shadow-xs hover:border-slate-300 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Active Cards (Zero Balance)
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                    <AlertCircle className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <p className="font-mono text-2xl font-bold text-amber-700">
                    {(analytics.zeroBalanceActiveCardsCount ?? 0).toLocaleString()}{' '}
                    <span className="text-xs font-normal text-slate-500">
                      {(analytics.zeroBalanceActiveCardsCount ?? 0) === 1 ? 'Card' : 'Cards'}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Currently in use with ₹0 unspent balance
                  </p>
                </div>
              </Card>
            </div>
          </div>

          {/* Section 1: Financial Streams Breakdown */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card padding="md" className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Cash Recharges
                </span>
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="font-mono text-2xl font-bold text-slate-900">
                {formatCurrency(cashRechargeAmount)}
              </p>
            </Card>

            <Card padding="md" className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  UPI Recharges
                </span>
                <CreditCard className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="font-mono text-2xl font-bold text-slate-900">
                {formatCurrency(upiRechargeAmount)}
              </p>
            </Card>

            <Card padding="md" className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Total Returns / Refunds
                </span>
                <ArrowUpDown className="h-4 w-4 text-rose-600" />
              </div>
              <p className="font-mono text-2xl font-bold text-slate-900">
                {formatCurrency(analytics.totalRefundVolume ?? 0)}
              </p>
            </Card>
          </div>

          {/* Section 2: Detailed Branch Performance Comparison */}
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Branch Performance Comparison</h2>
              </div>

              {/* Sorting Metric Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600">Sort By:</span>
                <Select
                  id="branch-sort-metric"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortMetric)}
                  options={[
                    { value: 'revenue', label: 'Top Revenue' },
                    { value: 'transactions', label: 'Total Transactions' },
                    { value: 'purchases', label: 'POS Purchases' },
                    { value: 'cardRecharge', label: 'Card Recharges' },
                    { value: 'upiRecharge', label: 'UPI Recharges' },
                    { value: 'recharges', label: 'Total Recharges' },
                    { value: 'sessions', label: 'Active Sessions' },
                    { value: 'products', label: 'Products Sold' },
                  ]}
                />
              </div>
            </div>

            {/* Top Branch Insight Banner */}
            {topBranch && (
              <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{topBranch.branchName}</span>
                      <Badge variant="success" className="text-[10px]">
                        Top Performing Branch
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="hidden sm:block text-right font-mono">
                  <span className="text-xs text-slate-500">POS Revenue</span>
                  <p className="text-sm font-bold text-emerald-600">
                    {formatCurrency(topBranch.purchaseVolume)}
                  </p>
                </div>
              </div>
            )}

            {/* Comparison Table */}
            <Card padding="none">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                    <tr>
                      <th className="py-3.5 pl-4 pr-3">Branch</th>
                      <th className="px-3 py-3.5 text-right">Transactions</th>
                      <th className="px-3 py-3.5 text-right">Purchases</th>
                      <th className="px-3 py-3.5 text-right">Card Recharge</th>
                      <th className="px-3 py-3.5 text-right">UPI Recharge</th>
                      <th className="px-3 py-3.5 text-right">Total Recharges</th>
                      <th className="px-3 py-3.5 text-right">Total Revenue</th>
                      <th className="px-3 py-3.5 text-right">Active Sessions</th>
                      <th className="px-3 py-3.5 text-right">Products Sold</th>
                      <th className="py-3.5 pl-3 pr-4 text-center">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
                    {sortedBranchComparison.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-xs text-slate-500 font-sans">
                          No branch analytics available for the selected period.
                        </td>
                      </tr>
                    ) : (
                      sortedBranchComparison.map((metric) => {
                        const cardRechargeVol =
                          metric.cardRechargeVolume ??
                          metric.cashRechargeVolume ??
                          (metric.rechargeVolume ? Math.round(metric.rechargeVolume * 0.6) : 0);
                        const upiRechargeVol =
                          metric.upiRechargeVolume ??
                          (metric.rechargeVolume ? metric.rechargeVolume - cardRechargeVol : 0);

                        return (
                          <tr
                            key={metric.branchId}
                            className="transition-colors hover:bg-slate-50/80"
                          >
                            <td className="py-3 pl-4 pr-3 font-sans font-semibold text-slate-900">
                              <div className="flex items-center gap-2">
                                <span>{metric.branchName}</span>
                                {metric.status === 'INACTIVE' && (
                                  <Badge variant="outline" className="text-[10px] text-slate-500">
                                    Inactive
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-right">{metric.transactionCount}</td>
                            <td className="px-3 py-3 text-right text-emerald-600 font-semibold">
                              {formatCurrency(metric.purchaseVolume)}
                            </td>
                            <td className="px-3 py-3 text-right text-emerald-600 font-semibold">
                              {formatCurrency(cardRechargeVol)}
                            </td>
                            <td className="px-3 py-3 text-right text-sky-600 font-semibold">
                              {formatCurrency(upiRechargeVol)}
                            </td>
                            <td className="px-3 py-3 text-right font-bold text-slate-800">
                              {formatCurrency(metric.rechargeVolume)}
                            </td>
                            <td className="px-3 py-3 text-right font-bold text-slate-900">
                              {formatCurrency(metric.totalRevenue)}
                            </td>
                            <td className="px-3 py-3 text-right">{metric.activeSessionsCount}</td>
                            <td className="px-3 py-3 text-right">{metric.productsSoldCount}</td>
                            <td className="py-3 pl-3 pr-4 text-center font-sans">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedBranchDetail(metric)}
                                leftIcon={<Eye className="h-3.5 w-3.5 text-slate-500" />}
                              >
                                View
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      ) : null}

      {/* ── Section 3: Staff Performance & Operational Audit ── */}
      {analytics?.staffPerformance && analytics.staffPerformance.length > 0 ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                3. Staff Performance & Operational Audit
              </h2>
            </div>

            {/* Filter & Search Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search staff by name/email..."
                  value={staffSearchQuery}
                  maxLength={30}
                  onChange={(e) => {
                    const sanitized = e.target.value.replace(/[^a-zA-Z0-9\s@._-]/g, '').slice(0, 30);
                    setStaffSearchQuery(sanitized);
                  }}
                  className="h-8 w-56 rounded-lg border border-slate-200 bg-white pl-8 pr-7 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
                />
                {staffSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setStaffSearchQuery('')}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    aria-label="Clear staff search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600">Sort By:</span>
                <Select
                  id="staff-sort-metric"
                  value={staffSortBy}
                  onChange={(e) => setStaffSortBy(e.target.value as any)}
                  options={[
                    { value: 'activated', label: 'Cards Activated' },
                    { value: 'settled', label: 'Cards Settled' },
                    { value: 'cardRecharge', label: 'Card Recharge' },
                    { value: 'purchases', label: 'POS Sales' },
                    { value: 'refunds', label: 'Refunds' },
                    { value: 'txns', label: 'Transactions' },
                    { value: 'name', label: 'Staff Name' },
                  ]}
                />
                <button
                  type="button"
                  onClick={() => setStaffSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  title={`Sort Order: ${staffSortOrder === 'desc' ? 'Descending (High to Low)' : 'Ascending (Low to High)'}`}
                >
                  {staffSortOrder === 'desc' ? (
                    <>
                      <ArrowDown className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="hidden sm:inline">High → Low</span>
                    </>
                  ) : (
                    <>
                      <ArrowUp className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="hidden sm:inline">Low → High</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Staff KPI Summary Banner */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500">
                <Users className="h-4 w-4 text-emerald-600" />
                <span className="text-xs">Active Staff</span>
              </div>
              <p className="mt-1 font-mono text-xl font-bold text-slate-900">
                {activeStaffList.length}
              </p>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 shadow-sm">
              <div className="flex items-center gap-2 text-emerald-800">
                <CreditCard className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-semibold">Total Cards Activated</span>
              </div>
              <p className="mt-1 font-mono text-xl font-bold text-emerald-700">
                {totalCardsActivatedByStaff}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500">
                <UserCheck className="h-4 w-4 text-sky-600" />
                <span className="text-xs">Cards Settled</span>
              </div>
              <p className="mt-1 font-mono text-xl font-bold text-slate-900">
                {totalCardsSettledByStaff}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500">
                <TrendingUp className="h-4 w-4 text-indigo-600" />
                <span className="text-xs">Staff Volume Handled</span>
              </div>
              <p className="mt-1 font-mono text-xl font-bold text-slate-900">
                {formatCurrency(
                  staffOnlyPerformance.reduce((acc, s) => acc + (s.totalVolumeHandled || 0), 0),
                )}
              </p>
            </div>
          </div>

          {/* Staff Performance Table */}
          <Card padding="none">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                  <tr>
                    <th
                      className="py-3.5 pl-4 pr-3 cursor-pointer select-none hover:bg-slate-100 transition-colors"
                      onClick={() => handleStaffColumnSort('name')}
                      title="Sort by Staff Member"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Staff Member</span>
                        {renderSortIcon('name')}
                      </div>
                    </th>
                    <th
                      className="px-3 py-3.5 text-right cursor-pointer select-none hover:bg-slate-100 transition-colors"
                      onClick={() => handleStaffColumnSort('activated')}
                      title="Sort by Cards Activated"
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Cards Activated</span>
                        {renderSortIcon('activated')}
                      </div>
                    </th>
                    <th
                      className="px-3 py-3.5 text-right cursor-pointer select-none hover:bg-slate-100 transition-colors"
                      onClick={() => handleStaffColumnSort('settled')}
                      title="Sort by Cards Settled"
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Cards Settled</span>
                        {renderSortIcon('settled')}
                      </div>
                    </th>
                    <th
                      className="px-3 py-3.5 text-right cursor-pointer select-none hover:bg-slate-100 transition-colors"
                      onClick={() => handleStaffColumnSort('cardRecharge')}
                      title="Sort by Card Recharge"
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Card Recharge</span>
                        {renderSortIcon('cardRecharge')}
                      </div>
                    </th>
                    <th
                      className="px-3 py-3.5 text-right cursor-pointer select-none hover:bg-slate-100 transition-colors"
                      onClick={() => handleStaffColumnSort('purchases')}
                      title="Sort by POS Sales"
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>POS Sales</span>
                        {renderSortIcon('purchases')}
                      </div>
                    </th>
                    <th
                      className="px-3 py-3.5 text-right cursor-pointer select-none hover:bg-slate-100 transition-colors"
                      onClick={() => handleStaffColumnSort('refunds')}
                      title="Sort by Refunds"
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Refunds</span>
                        {renderSortIcon('refunds')}
                      </div>
                    </th>
                    <th
                      className="px-3 py-3.5 text-right cursor-pointer select-none hover:bg-slate-100 transition-colors"
                      onClick={() => handleStaffColumnSort('txns')}
                      title="Sort by Transactions"
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Transactions</span>
                        {renderSortIcon('txns')}
                      </div>
                    </th>
                    <th className="py-3.5 pl-3 pr-4 text-center">Activity Log</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
                  {sortedStaffPerformance.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-xs text-slate-500 font-sans">
                        No staff members found matching the current search criteria.
                      </td>
                    </tr>
                  ) : (
                    sortedStaffPerformance.map((st) => (
                      <tr key={st.staffId} className="transition-colors hover:bg-slate-50/80">
                        <td className="py-3 pl-4 pr-3 font-sans">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-800 text-xs">
                              {st.staffName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                                <span>{st.staffName}</span>
                                {st.status === 'INACTIVE' && (
                                  <Badge variant="outline" className="text-[10px] text-slate-500">
                                    Inactive
                                  </Badge>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 font-normal">
                                {st.staffEmail} • <span className="text-slate-600">{st.branchName || 'Main Cafeteria'}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700">
                            <span>{st.cardsActivatedCount}</span>
                            <span className="text-[10px] font-normal text-emerald-600">activated</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span className="font-semibold text-slate-700">{st.cardsSettledCount}</span>
                        </td>
                        <td className="px-3 py-3 text-right text-emerald-600 font-semibold">
                          {formatCurrency(st.cardRechargeVolume)}
                          <span className="block text-[10px] font-normal text-slate-400">
                            {st.cardRechargeCount} deposits
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right text-emerald-600 font-semibold">
                          {formatCurrency(st.purchaseVolume)}
                          <span className="block text-[10px] font-normal text-slate-400">
                            {st.purchaseCount} orders
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right text-rose-600 font-semibold">
                          {st.refundVolume > 0 ? formatCurrency(st.refundVolume) : '₹0.00'}
                          <span className="block text-[10px] font-normal text-slate-400">
                            {st.refundCount} refunds
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right font-bold text-slate-800">
                          {st.totalTransactionsCount}
                        </td>
                        <td className="py-3 pl-3 pr-4 text-center font-sans">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedStaffDetail(st)}
                            leftIcon={<History className="h-3.5 w-3.5 text-emerald-600" />}
                          >
                            Activity Log
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : null}

      {/* ── PDF Viewer Modal ─────────────────────────────────────── */}
      <Modal
        isOpen={showPdfModal}
        onClose={() => {
          setShowPdfModal(false);
          if (pdfPreviewUrl) {
            URL.revokeObjectURL(pdfPreviewUrl);
            setPdfPreviewUrl(null);
          }
        }}
        title="Organization Analytics Report — PDF Preview"
        size="xl"
      >
        <div className="space-y-4">
          {/* Option-Wise Report Section Customizer Toolbar */}
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
                  id="pdf-opt-select-all"
                  onClick={() => handleSetAllSections(true)}
                  className="rounded-md px-2 py-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  id="pdf-opt-clear-all"
                  onClick={() => handleSetAllSections(false)}
                  className="rounded-md px-2 py-1 text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Option Pills / Interactive Toggle Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2.5">
              {/* Option 1: Executive KPIs */}
              <button
                type="button"
                id="pdf-toggle-executive-kpis"
                onClick={() => handleToggleSection('includeExecutiveKpis')}
                className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-all cursor-pointer ${
                  pdfSections.includeExecutiveKpis
                    ? 'border-emerald-300 bg-emerald-50/60 text-emerald-950 shadow-2xs ring-1 ring-emerald-400/30'
                    : 'border-slate-200 bg-slate-50/60 text-slate-500 hover:border-slate-300 hover:bg-slate-100/50 opacity-70'
                }`}
              >
                <div
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                    pdfSections.includeExecutiveKpis
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {pdfSections.includeExecutiveKpis && <Check className="h-3 w-3 stroke-[3]" />}
                </div>
                <span className="text-xs font-semibold">1. Executive KPIs</span>
              </button>

              {/* Option 2: Branch Comparison */}
              <button
                type="button"
                id="pdf-toggle-branch-comparison"
                onClick={() => handleToggleSection('includeBranchComparison')}
                className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-all cursor-pointer ${
                  pdfSections.includeBranchComparison
                    ? 'border-emerald-300 bg-emerald-50/60 text-emerald-950 shadow-2xs ring-1 ring-emerald-400/30'
                    : 'border-slate-200 bg-slate-50/60 text-slate-500 hover:border-slate-300 hover:bg-slate-100/50 opacity-70'
                }`}
              >
                <div
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                    pdfSections.includeBranchComparison
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {pdfSections.includeBranchComparison && <Check className="h-3 w-3 stroke-[3]" />}
                </div>
                <span className="text-xs font-semibold">2. Branch Comparison</span>
              </button>

              {/* Option 3: Staff Performance */}
              <button
                type="button"
                id="pdf-toggle-staff-performance"
                onClick={() => handleToggleSection('includeStaffPerformance')}
                className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-all cursor-pointer ${
                  pdfSections.includeStaffPerformance
                    ? 'border-emerald-300 bg-emerald-50/60 text-emerald-950 shadow-2xs ring-1 ring-emerald-400/30'
                    : 'border-slate-200 bg-slate-50/60 text-slate-500 hover:border-slate-300 hover:bg-slate-100/50 opacity-70'
                }`}
              >
                <div
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                    pdfSections.includeStaffPerformance
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {pdfSections.includeStaffPerformance && <Check className="h-3 w-3 stroke-[3]" />}
                </div>
                <span className="text-xs font-semibold">3. Staff Performance</span>
              </button>
            </div>
          </div>

          {pdfPreviewUrl && (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-lg">
              <iframe
                src={`${pdfPreviewUrl}#toolbar=0`}
                className="w-full h-[70vh] rounded-lg"
                title="Organization Analytics Report PDF Preview"
              />
            </div>
          )}

          <ModalFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowPdfModal(false);
                if (pdfPreviewUrl) {
                  URL.revokeObjectURL(pdfPreviewUrl);
                  setPdfPreviewUrl(null);
                }
              }}
            >
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleDownloadPdf}
              leftIcon={<Download className="h-4 w-4" />}
              id="download-customized-pdf-btn"
            >
              {activeSectionsCount === 0
                ? 'Download PDF (Empty)'
                : `Download PDF (${activeSectionsCount} Section${activeSectionsCount > 1 ? 's' : ''})`}
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* Branch Metric Detail Modal */}
      {selectedBranchDetail && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedBranchDetail(null)}
          title={`${selectedBranchDetail.branchName} — Operational Breakdown`}
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <span className="text-slate-500">Total Revenue</span>
                <p className="font-mono text-lg font-bold text-slate-900">
                  {formatCurrency(selectedBranchDetail.totalRevenue)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <span className="text-slate-500">Transactions</span>
                <p className="font-mono text-lg font-bold text-slate-900">
                  {selectedBranchDetail.transactionCount}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <span className="text-slate-500">POS Purchases</span>
                <p className="font-mono text-base font-semibold text-emerald-600">
                  {formatCurrency(selectedBranchDetail.purchaseVolume)}
                </p>
                <span className="text-[10px] text-slate-500">
                  {selectedBranchDetail.purchaseCount} items billed
                </span>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <span className="text-slate-500">Card Recharge (POS)</span>
                <p className="font-mono text-base font-semibold text-emerald-600">
                  {formatCurrency(
                    selectedBranchDetail.cardRechargeVolume ??
                    selectedBranchDetail.cashRechargeVolume ??
                    Math.round(selectedBranchDetail.rechargeVolume * 0.6)
                  )}
                </p>
                <span className="text-[10px] text-slate-500">
                  {selectedBranchDetail.cardRechargeCount ??
                   selectedBranchDetail.cashRechargeCount ??
                   Math.round(selectedBranchDetail.rechargeCount * 0.6)} deposits
                </span>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <span className="text-slate-500">UPI Recharge</span>
                <p className="font-mono text-base font-semibold text-sky-600">
                  {formatCurrency(
                    selectedBranchDetail.upiRechargeVolume ??
                    Math.round(selectedBranchDetail.rechargeVolume * 0.4)
                  )}
                </p>
                <span className="text-[10px] text-slate-500">
                  {selectedBranchDetail.upiRechargeCount ??
                   Math.round(selectedBranchDetail.rechargeCount * 0.4)} deposits
                </span>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <span className="text-slate-500">Total Recharges</span>
                <p className="font-mono text-base font-bold text-slate-900">
                  {formatCurrency(selectedBranchDetail.rechargeVolume)}
                </p>
                <span className="text-[10px] text-slate-500">
                  {selectedBranchDetail.rechargeCount} total deposits
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
              <span className="font-semibold text-slate-900">Session & Inventory Health</span>
              <div className="grid grid-cols-2 gap-2 text-slate-600 font-mono">
                <div>Active Sessions: {selectedBranchDetail.activeSessionsCount}</div>
                <div>Settled Sessions: {selectedBranchDetail.settledSessionsCount}</div>
                <div>Products Sold: {selectedBranchDetail.productsSoldCount}</div>
                <div>Low Stock Items: {selectedBranchDetail.lowStockItemCount}</div>
              </div>
            </div>

            <ModalFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedBranchDetail(null)}
              >
                Close
              </Button>
            </ModalFooter>
          </div>
        </Modal>
      )}

      {/* ── Staff Operational Activity Audit Modal ─────────────────── */}
      {selectedStaffDetail && (
        <Modal
          isOpen={true}
          onClose={() => {
            setSelectedStaffDetail(null);
            setStaffActivityTypeFilter('ALL');
            setStaffActivitySearch('');
          }}
          title={`${selectedStaffDetail.staffName} — Operational Activity Log`}
          size="xl"
        >
          <div className="space-y-4 text-xs">
            {/* Staff Profile & Lifetime KPI Strip */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 font-bold text-white text-base">
                  {selectedStaffDetail.staffName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{selectedStaffDetail.staffName}</span>
                    <Badge variant="outline" className="text-[10px] text-slate-600 bg-white">
                      {selectedStaffDetail.role}
                    </Badge>
                  </div>
                  <span className="text-slate-500">
                    {selectedStaffDetail.staffEmail} • {selectedStaffDetail.branchName || 'Main Cafeteria'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportStaffCsv(selectedStaffDetail)}
                  leftIcon={<FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />}
                >
                  Export Activity CSV
                </Button>
              </div>
            </div>

            {/* Active Filter Scope Strip */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-200/80 bg-emerald-50/60 px-3 py-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-700 flex items-center gap-1">
                  <Filter className="h-3.5 w-3.5 text-emerald-600" />
                  Active Filter Scope:
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 font-semibold text-slate-800 border border-slate-200 shadow-2xs">
                  <Building2 className="h-3 w-3 text-emerald-600" />
                  {selectedBranchName}
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 font-semibold text-slate-800 border border-slate-200 shadow-2xs">
                  <Calendar className="h-3 w-3 text-emerald-600" />
                  {dateRangeLabel}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                Showing <strong className="text-slate-900 font-mono">{filteredStaffActivities.length}</strong> {filteredStaffActivities.length === 1 ? 'activity' : 'activities'}
              </span>
            </div>

            {/* Metric KPI Cards */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-2.5">
                <span className="text-slate-500 text-[11px]">Cards Activated</span>
                <p className="font-mono text-base font-bold text-emerald-700">
                  {modalScopedStaffMetrics.cardsActivatedCount} cards
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                <span className="text-slate-500 text-[11px]">Cards Settled</span>
                <p className="font-mono text-base font-bold text-slate-800">
                  {modalScopedStaffMetrics.cardsSettledCount} cards
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                <span className="text-slate-500 text-[11px]">Card Recharges (POS)</span>
                <p className="font-mono text-base font-semibold text-emerald-600">
                  {formatCurrency(modalScopedStaffMetrics.cardRechargeVolume)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                <span className="text-slate-500 text-[11px]">POS Sales Billed</span>
                <p className="font-mono text-base font-semibold text-emerald-600">
                  {formatCurrency(modalScopedStaffMetrics.purchaseVolume)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                <span className="text-slate-500 text-[11px]">Refunds Processed</span>
                <p className="font-mono text-base font-semibold text-rose-600">
                  {formatCurrency(modalScopedStaffMetrics.refundVolume)}
                </p>
              </div>
            </div>

            {/* Filter Tabs & Search in Modal */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-2">
              <div className="flex flex-wrap items-center gap-1">
                {[
                  { key: 'ALL', label: 'All Activities' },
                  { key: 'CARD_ACTIVATION', label: 'Card Activations' },
                  { key: 'RECHARGE', label: 'Recharges' },
                  { key: 'PURCHASE', label: 'POS Sales' },
                  { key: 'CARD_SETTLEMENT', label: 'Settlements' },
                  { key: 'OTHER', label: 'Card Actions' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setStaffActivityTypeFilter(tab.key as any)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                      staffActivityTypeFilter === tab.key
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by card, customer, phone..."
                  value={staffActivitySearch}
                  maxLength={30}
                  onChange={(e) => {
                    const sanitized = e.target.value.replace(/[^a-zA-Z0-9\s@._-]/g, '').slice(0, 30);
                    setStaffActivitySearch(sanitized);
                  }}
                  className="h-7.5 w-60 rounded-lg border border-slate-200 bg-white pl-8 pr-7 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
                />
                {staffActivitySearch && (
                  <button
                    type="button"
                    onClick={() => setStaffActivitySearch('')}
                    className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    aria-label="Clear activity filter"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Operational Activity Ledger Table */}
            <div className="max-h-[360px] overflow-y-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                  <tr>
                    <th className="py-2.5 pl-3 pr-2">Date & Time</th>
                    <th className="px-2 py-2.5">Operation</th>
                    <th className="px-2 py-2.5">Card #</th>
                    <th className="px-2 py-2.5">Customer</th>
                    <th className="px-2 py-2.5 text-right">Amount</th>
                    <th className="px-2 py-2.5">Branch</th>
                    <th className="py-2.5 pl-2 pr-3">Details / Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans text-slate-700">
                  {filteredStaffActivities.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-xs text-slate-500">
                        No activity records found for this staff member in {selectedBranchName} ({dateRangeLabel}).
                      </td>
                    </tr>
                  ) : (
                    filteredStaffActivities.map((act: StaffActivityItem) => {
                      let badgeClass = 'bg-slate-100 text-slate-700';

                      if (act.type === 'CARD_ACTIVATION') {
                        badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                      } else if (act.type === 'RECHARGE_CASH') {
                        badgeClass = 'bg-green-100 text-green-800 border-green-200';
                      } else if (act.type === 'RECHARGE_UPI') {
                        badgeClass = 'bg-sky-100 text-sky-800 border-sky-200';
                      } else if (act.type === 'PURCHASE') {
                        badgeClass = 'bg-indigo-100 text-indigo-800 border-indigo-200';
                      } else if (act.type === 'CARD_SETTLEMENT') {
                        badgeClass = 'bg-purple-100 text-purple-800 border-purple-200';
                      } else if (act.type === 'REFUND' || act.type === 'CARD_BLOCKED') {
                        badgeClass = 'bg-rose-100 text-rose-800 border-rose-200';
                      }

                      return (
                        <tr key={act.id} className="hover:bg-slate-50/80">
                          <td className="py-2 pl-3 pr-2 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                            {new Date(act.timestamp).toLocaleString()}
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold border ${badgeClass}`}>
                              {act.title}
                            </span>
                          </td>
                          <td className="px-2 py-2 font-mono font-bold text-slate-900 whitespace-nowrap">
                            {act.cardNumber || '—'}
                          </td>
                          <td className="px-2 py-2">
                            <div className="font-medium text-slate-900">{act.customerName || '—'}</div>
                            {act.customerPhone && act.customerPhone !== '—' && (
                              <span className="text-[10px] text-slate-400 font-mono">{act.customerPhone}</span>
                            )}
                          </td>
                          <td className="px-2 py-2 text-right font-mono font-semibold whitespace-nowrap">
                            {act.amount !== undefined ? (
                              <span
                                className={
                                  act.type.includes('RECHARGE') || act.type === 'CARD_ACTIVATION'
                                    ? 'text-emerald-600'
                                    : act.type === 'PURCHASE'
                                    ? 'text-indigo-600'
                                    : act.type === 'REFUND'
                                    ? 'text-rose-600'
                                    : 'text-slate-800'
                                }
                              >
                                {act.type.includes('RECHARGE') ? '+' : ''}
                                {formatCurrency(act.amount)}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-2 py-2 text-slate-600 whitespace-nowrap">
                            {act.branchName || 'Main Cafeteria'}
                          </td>
                          <td className="py-2 pl-2 pr-3 text-slate-600 text-[11px]">
                            {act.description}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <ModalFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedStaffDetail(null);
                  setStaffActivityTypeFilter('ALL');
                  setStaffActivitySearch('');
                }}
              >
                Close
              </Button>
            </ModalFooter>
          </div>
        </Modal>
      )}
    </div>
  );
}
