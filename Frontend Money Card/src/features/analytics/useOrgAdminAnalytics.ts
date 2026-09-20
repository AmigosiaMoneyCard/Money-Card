import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useBranch, useAuth } from '@/hooks';
import { apiService } from '@/services/api';
import { notify } from '@/utils/toast';
import type { Branch, AnalyticsOverview, BranchPerformanceMetric, PeakAnalyticsOverview } from '@/types';
import type { OrgPdfSectionOptions } from './analyticsPdfExport';
import {
  generateAnalyticsPdfBlob,
  downloadOrgAnalyticsPdf,
  downloadFinancialOverviewPdf,
  downloadCardAnalyticsPdf,
} from './analyticsPdfExport';
import type { SortMetric } from './OrgAdminAnalyticsComponents';

export type DatePreset = 'thisMonth' | 'today' | 'yesterday' | 'last7' | 'last30' | 'custom';

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

function getBranchMetricValue(item: BranchPerformanceMetric, metric: SortMetric): number {
  switch (metric) {
    case 'revenue':
      return item.totalRevenue;
    case 'transactions':
      return item.transactionCount;
    case 'purchases':
      return item.purchaseCount;
    case 'cardRecharge':
      return item.cardRechargeVolume ?? item.cashRechargeVolume ?? 0;
    case 'upiRecharge':
      return item.upiRechargeVolume ?? 0;
    case 'recharges':
      return item.rechargeVolume;
    case 'sessions':
      return item.sessionCount;
    case 'products':
      return item.productsSoldCount;
    default:
      return item.totalRevenue;
  }
}

function compareBranchesByMetric(
  a: BranchPerformanceMetric,
  b: BranchPerformanceMetric,
  sortBy: SortMetric,
): number {
  return getBranchMetricValue(b, sortBy) - getBranchMetricValue(a, sortBy);
}

function isStaffUser(role?: string): boolean {
  if (!role) return true;
  const lower = role.toLowerCase();
  return role !== 'ORG_ADMIN' && role !== 'SUPER_ADMIN' && !lower.includes('admin');
}

function countActiveSections(sections: OrgPdfSectionOptions): number {
  let count = 0;
  if (sections.includeExecutiveKpis) count++;
  if (sections.includeCardLifecycle) count++;
  if (sections.includePaymentBreakdown) count++;
  if (sections.includeRushKpis) count++;
  if (sections.includeTrafficDistribution) count++;
  if (sections.includeFoodDemand) count++;
  if (sections.includeBranchComparison) count++;
  if (sections.includeStaffPerformance) count++;
  return count;
}

function formatDateRangeLabel(preset: DatePreset, startDate: string, endDate: string): string {
  switch (preset) {
    case 'today':
      return 'Today';
    case 'yesterday':
      return 'Yesterday';
    case 'last7':
      return 'Last 7 Days';
    case 'last30':
      return 'Last 30 Days';
    case 'thisMonth':
      return 'This Month';
    default:
      return `${startDate} to ${endDate}`;
  }
}

export function useOrgAdminAnalytics() {
  const { currentBranch, selectBranch } = useBranch();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<'overview' | 'cards'>(() => {
    const t = searchParams.get('tab');
    if (t === 'cards') return 'cards';
    return 'overview';
  });

  const handleTabChange = (tab: 'overview' | 'cards') => {
    setActiveTab(tab);
    const newParams = new URLSearchParams(searchParams);
    if (tab === 'overview') {
      newParams.delete('tab');
    } else {
      newParams.set('tab', tab);
    }
    setSearchParams(newParams);
  };

  const [peakData, setPeakData] = useState<PeakAnalyticsOverview | null>(null);
  const [demandSortBy, setDemandSortBy] = useState<'REVENUE' | 'ORDERS'>('REVENUE');

  const [branches, setBranches] = useState<Branch[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfSections, setPdfSections] = useState<OrgPdfSectionOptions>({
    includeExecutiveKpis: true,
    includeCardLifecycle: true,
    includePaymentBreakdown: true,
    includeRushKpis: true,
    includeTrafficDistribution: true,
    includeFoodDemand: true,
    includeBranchComparison: true,
    includeStaffPerformance: true,
  });

  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl);
      }
    };
  }, [pdfPreviewUrl]);

  const [sortBy, setSortBy] = useState<SortMetric>('revenue');
  const [selectedBranchDetail, setSelectedBranchDetail] = useState<BranchPerformanceMetric | null>(null);

  const isStaff = user?.role === 'STAFF';

  const [branchFilter, setBranchFilter] = useState<string>(() => {
    if (isStaff) {
      return currentBranch?.id || user?.assignedBranchIds?.[0] || searchParams.get('branchId') || '';
    }
    return searchParams.get('branchId') || currentBranch?.id || 'ALL';
  });

  useEffect(() => {
    if (isStaff) {
      const bId = currentBranch?.id || user?.assignedBranchIds?.[0] || '';
      if (bId) setBranchFilter(bId);
    } else {
      setBranchFilter(currentBranch ? currentBranch.id : 'ALL');
    }
  }, [currentBranch, isStaff, user?.assignedBranchIds]);

  const [datePreset, setDatePreset] = useState<DatePreset>(
    (searchParams.get('preset') as DatePreset) || 'custom',
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
      const [overviewRes, peakRes] = await Promise.all([
        apiService.analytics.getOverview({
          branchId: targetBranch,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
        apiService.analytics.getPeakAnalytics({
          branchId: targetBranch,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
      ]);

      if (!overviewRes.success) {
        setError(overviewRes.error.message || 'Failed to load analytics');
        return;
      }

      setAnalytics(overviewRes.data);
      if (peakRes.success) {
        setPeakData(peakRes.data);
      }
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
        const [overviewRes, peakRes] = await Promise.all([
          apiService.analytics.getOverview({
            branchId: targetBranch,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
          }),
          apiService.analytics.getPeakAnalytics({
            branchId: targetBranch,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
          }),
        ]);

        if (isCancelled) return;
        if (!overviewRes.success) {
          setError(overviewRes.error.message || 'Failed to load analytics');
          return;
        }

        setAnalytics(overviewRes.data);
        if (peakRes.success) {
          setPeakData(peakRes.data);
        }
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
  const selectedBranchName =
    branchFilter === 'ALL' ? 'All Cafeterias' : selectedBranchObj?.name || branchFilter;

  const dateRangeLabel = useMemo(
    () => formatDateRangeLabel(datePreset, startDate, endDate),
    [datePreset, startDate, endDate],
  );

  const [resolvedOrgName, setResolvedOrgName] = useState<string>(() => user?.organizationName || '');

  useEffect(() => {
    if (user?.organizationName) {
      setResolvedOrgName(user.organizationName);
    } else if (user?.organizationId) {
      apiService.auth
        .getMe()
        .then((res) => {
          if (res.success && res.data.organizationName) {
            setResolvedOrgName(res.data.organizationName);
          }
        })
        .catch(() => {});
    }
  }, [user?.organizationName, user?.organizationId]);

  const cafeteriaDisplayName = useMemo(() => {
    const raw = (resolvedOrgName || user?.organizationName || '').trim();
    if (!raw) return 'Cafeteria';
    if (/^cafeteria\b/i.test(raw)) {
      return raw;
    }
    return `Cafeteria ${raw}`;
  }, [resolvedOrgName, user?.organizationName]);

  const getOrgReportOptions = (overrideSections?: Partial<OrgPdfSectionOptions>) => {
    if (!analytics) return null;

    return {
      analytics,
      peakData: peakData
        ? {
            ...peakData,
            productDemand: filteredProducts,
          }
        : null,
      branches,
      selectedBranchName,
      dateRangeLabel,
      organizationName: cafeteriaDisplayName,
      sections: overrideSections ?? pdfSections,
    };
  };

  const activeSectionsCount = useMemo(() => countActiveSections(pdfSections), [pdfSections]);

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
      includeCardLifecycle: enable,
      includePaymentBreakdown: enable,
      includeRushKpis: enable,
      includeTrafficDistribution: enable,
      includeFoodDemand: enable,
      includeBranchComparison: enable,
      includeStaffPerformance: enable,
    };
    setPdfSections(updated);
    refreshPdfPreview(updated);
  };

  const handleViewPdf = () => {
    setIsExportingPdf(true);
    try {
      const defaultSections: OrgPdfSectionOptions = {
        includeExecutiveKpis: true,
        includeCardLifecycle: true,
        includePaymentBreakdown: true,
        includeRushKpis: false,
        includeTrafficDistribution: false,
        includeFoodDemand: false,
        includeBranchComparison: false,
        includeStaffPerformance: false,
      };
      setPdfSections(defaultSections);
      const options = getOrgReportOptions(defaultSections);
      if (!options) {
        notify.error('No analytics data available to render PDF.');
        return;
      }

      const blob = generateAnalyticsPdfBlob(options);
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

  const handleUpdatePreviewSections = (selected: { financial: boolean; cards: boolean }) => {
    const updated: OrgPdfSectionOptions = {
      ...pdfSections,
      includeExecutiveKpis: selected.financial,
      includePaymentBreakdown: selected.financial,
      includeCardLifecycle: selected.cards,
      includeRushKpis: false,
      includeTrafficDistribution: false,
      includeFoodDemand: false,
      includeBranchComparison: false,
      includeStaffPerformance: false,
    };
    setPdfSections(updated);
    refreshPdfPreview(updated);
  };

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

      downloadOrgAnalyticsPdf(options, filename);
      notify.success(`Analytics report downloaded: ${filename}`);
    } catch {
      notify.error('Failed to download Analytics PDF');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleDownloadBothPdf = () => {
    try {
      const options = getOrgReportOptions({
        includeExecutiveKpis: true,
        includeCardLifecycle: true,
        includePaymentBreakdown: true,
        includeRushKpis: false,
        includeTrafficDistribution: false,
        includeFoodDemand: false,
        includeBranchComparison: false,
        includeStaffPerformance: false,
      });
      if (!options) {
        notify.error('No analytics data available to download.');
        return;
      }
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `MoneyCard_Analytics_${dateStr}.pdf`;
      downloadOrgAnalyticsPdf(options, filename);
      notify.success(`Analytics report downloaded: ${filename}`);
    } catch {
      notify.error('Failed to download Analytics PDF.');
    }
  };

  const handleDownloadFinancialPdf = () => {
    try {
      const options = getOrgReportOptions(pdfSections);
      if (!options) {
        notify.error('No analytics data available to download.');
        return;
      }
      const dateStr = new Date().toISOString().split('T')[0];
      downloadFinancialOverviewPdf(options, `MoneyCard_Financial_Overview_${dateStr}.pdf`);
      notify.success('Financial Overview PDF downloaded.');
    } catch {
      notify.error('Failed to download Financial Overview PDF.');
    }
  };

  const handleDownloadCardAnalyticsPdf = () => {
    try {
      const options = getOrgReportOptions(pdfSections);
      if (!options) {
        notify.error('No analytics data available to download.');
        return;
      }
      const dateStr = new Date().toISOString().split('T')[0];
      downloadCardAnalyticsPdf(options, `MoneyCard_Card_Analytics_${dateStr}.pdf`);
      notify.success('Card Analytics PDF downloaded.');
    } catch {
      notify.error('Failed to download Card Analytics PDF.');
    }
  };

  const cashRechargeAmount = useMemo(
    () => (analytics?.cashRechargeVolume !== undefined ? analytics.cashRechargeVolume : 0),
    [analytics],
  );
  const upiRechargeAmount = useMemo(
    () => (analytics?.upiRechargeVolume !== undefined ? analytics.upiRechargeVolume : 0),
    [analytics],
  );

  const sortedBranchComparison = useMemo(() => {
    if (!analytics?.branchPerformance) return [];
    return [...analytics.branchPerformance].sort((a, b) =>
      compareBranchesByMetric(a, b, sortBy),
    );
  }, [analytics, sortBy]);

  const staffOnlyPerformance = useMemo(() => {
    if (!analytics?.staffPerformance) return [];
    return analytics.staffPerformance.filter((st) => isStaffUser(st.role));
  }, [analytics?.staffPerformance]);

  const activeStaffList = useMemo(() => {
    return staffOnlyPerformance.filter((st) => st.status === 'ACTIVE');
  }, [staffOnlyPerformance]);

  const totalCardsActivatedByStaff = useMemo(() => {
    return staffOnlyPerformance.reduce((acc, st) => acc + (st.cardsActivatedCount || 0), 0);
  }, [staffOnlyPerformance]);

  const totalCardsSettledByStaff = useMemo(() => {
    return staffOnlyPerformance.reduce((acc, st) => acc + (st.cardsSettledCount || 0), 0);
  }, [staffOnlyPerformance]);

  const totalStaffVolume = useMemo(() => {
    return staffOnlyPerformance.reduce((acc, s) => acc + (s.totalVolumeHandled || 0), 0);
  }, [staffOnlyPerformance]);

  const filteredProducts = useMemo(() => {
    if (!peakData?.productDemand) return [];
    const items = peakData.productDemand.filter(
      (p) => !p.productName.toLowerCase().includes('temp delete'),
    );
    return [...items].sort((a, b) => {
      if (demandSortBy === 'REVENUE') {
        return b.revenue - a.revenue;
      }
      return b.quantitySold - a.quantitySold;
    });
  }, [peakData?.productDemand, demandSortBy]);

  return {
    branches,
    analytics,
    peakData,
    activeTab,
    handleTabChange,
    demandSortBy,
    setDemandSortBy,
    filteredProducts,
    isLoading,
    error,
    isExportingPdf,
    showPdfModal,
    setShowPdfModal,
    pdfPreviewUrl,
    setPdfPreviewUrl,
    pdfSections,
    activeSectionsCount,
    sortBy,
    setSortBy,
    selectedBranchDetail,
    setSelectedBranchDetail,
    branchFilter,
    datePreset,
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    fetchAnalytics,
    handleBranchChange,
    handlePresetChange,
    handleCustomDateApply,
    handleToggleSection,
    handleSetAllSections,
    handleViewPdf,
    handleDownloadPdf,
    handleDownloadFinancialPdf,
    handleDownloadCardAnalyticsPdf,
    handleDownloadBothPdf,
    handleUpdatePreviewSections,
    cashRechargeAmount,
    upiRechargeAmount,
    sortedBranchComparison,
    activeStaffList,
    totalCardsActivatedByStaff,
    totalCardsSettledByStaff,
    totalStaffVolume,
  };
}
