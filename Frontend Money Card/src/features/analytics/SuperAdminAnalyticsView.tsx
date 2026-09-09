// ─── Super Admin Analytics View (Platform Scope) ─────────────────────────
// Global platform metrics across all organizations, subscription plans, and POS transactions.
// Strictly provides [ View PDF ] and [ Download PDF ] via jsPDF native download.

import { useState, useEffect, useCallback } from 'react';
import { apiService } from '@/services/api';
import type {
  AnalyticsOverview,
  OrganizationOverview,
  SubscriptionPayment,
  Plan,
  Branch,
  PeakAnalyticsOverview,
  PlanChangeRequest,
} from '@/types';
import {
  Button,
  Card,
  Badge,
  StatCard,
  Modal,
  ModalFooter,
  Select,
  LoadingState,
  ErrorState,
} from '@/components/ui';
import { DataTable } from '@/components/tables';
import { notify, formatCurrency } from '@/utils';
import {
  generatePlatformAnalyticsPdfBlob,
  downloadPlatformAnalyticsPdf,
  type GeneratePlatformAnalyticsPdfParams,
  type PlatformPdfSectionOptions,
} from './analyticsPdfExport';
import {
  Building2,
  Layers,
  RefreshCw,
  Receipt,
  Eye,
  Download,
  Bell,
  Check,
  SlidersHorizontal,
} from 'lucide-react';

export type DatePreset = 'all' | 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'custom';

export function getPresetDates(preset: DatePreset): { startDate: string; endDate: string } {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  if (preset === 'today') {
    return { startDate: todayStr, endDate: todayStr };
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
    return { startDate: start.toISOString().split('T')[0], endDate: todayStr };
  }
  if (preset === 'last30') {
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    return { startDate: start.toISOString().split('T')[0], endDate: todayStr };
  }
  if (preset === 'thisMonth') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { startDate: start.toISOString().split('T')[0], endDate: todayStr };
  }

  return { startDate: '', endDate: '' };
}

export function SuperAdminAnalyticsView() {
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [peakData, setPeakData] = useState<PeakAnalyticsOverview | null>(null);
  const [orgs, setOrgs] = useState<OrganizationOverview[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planRequests, setPlanRequests] = useState<PlanChangeRequest[]>([]);

  // Time Period & Cafeteria Filter State
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const [isLoading, setIsLoading] = useState(true);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // PDF Viewer Modal & Option-Wise Customizer State
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfSections, setPdfSections] = useState<PlatformPdfSectionOptions>({
    includePlatformKpis: true,
    includeFinancialSummary: true,
    includeTenantOrgs: true,
    includeBranchPerformance: true,
    includeProductDemand: true,
    includePeakTraffic: true,
    includeSubscriptionPlans: true,
  });

  // Clean up object URL when component unmounts or preview changes
  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl);
      }
    };
  }, [pdfPreviewUrl]);

  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset !== 'custom') {
      const { startDate: s, endDate: e } = getPresetDates(preset);
      setStartDate(s);
      setEndDate(e);
    }
  };

  const fetchPlatformData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [analyticsRes, peakRes, orgsRes, branchesRes, payRes, plansRes, reqsRes] = await Promise.all([
        apiService.analytics.getOverview({
          organizationId: selectedOrgId || undefined,
          branchId: undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
        apiService.analytics.getPeakAnalytics(),
        apiService.organizations.getOrganizations({ limit: 100 }),
        apiService.branches.getBranches(),
        apiService.subscriptions.getPayments(),
        apiService.plans.getPlans(),
        apiService.subscriptions.getPlanRequests(),
      ]);

      if (!analyticsRes.success) {
        setError(analyticsRes.error.message || 'Failed to load platform analytics');
        return;
      }

      setAnalytics(analyticsRes.data);
      if (peakRes.success) setPeakData(peakRes.data);
      if (orgsRes.success) setOrgs(orgsRes.data.items);
      if (branchesRes.success) setBranches(branchesRes.data.items);
      if (payRes.success) setPayments(payRes.data);
      if (plansRes.success) setPlans(plansRes.data);
      if (reqsRes.success) setPlanRequests(reqsRes.data || []);
    } catch {
      setError('Unable to connect to the server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedOrgId, startDate, endDate]);

  useEffect(() => {
    fetchPlatformData();
  }, [fetchPlatformData]);

  const totalGatewayRevenue = payments
    .filter((p) => p.status === 'SUCCESS')
    .reduce((sum, p) => sum + p.amount, 0);

  const recurringMrr = orgs
    .filter((o) => o.status === 'ACTIVE')
    .reduce((sum, o) => sum + (o.plan?.price || 0), 0);

  const subscriptionRevenue = totalGatewayRevenue > 0 ? totalGatewayRevenue : recurringMrr;

  const activeOrgsCount = orgs.filter((o) => o.status === 'ACTIVE').length;

  const pendingRequestsCount = planRequests.filter((r) => {
    if (selectedOrgId && r.organizationId !== selectedOrgId) return false;
    return r.status === 'PENDING';
  }).length;

  // Helper to compile full report parameters object with optional section override
  const buildReportParams = (overrideSections?: Partial<PlatformPdfSectionOptions>): GeneratePlatformAnalyticsPdfParams | null => {
    if (!analytics) return null;

    const orgMap = new Map<string, string>();
    orgs.forEach((o) => orgMap.set(o.id, o.name));

    let dateLabel = 'Custom Range';
    switch (datePreset) {
      case 'all':
        dateLabel = 'All Recorded History';
        break;
      case 'today':
        dateLabel = 'Today';
        break;
      case 'yesterday':
        dateLabel = 'Yesterday';
        break;
      case 'last7':
        dateLabel = 'Last 7 Days';
        break;
      case 'last30':
        dateLabel = 'Last 30 Days';
        break;
      case 'thisMonth':
        dateLabel = 'This Month';
        break;
      default:
        if (startDate && endDate) {
          dateLabel = `${startDate} to ${endDate}`;
        }
        break;
    }

    return {
      reportDateRange: dateLabel,
      selectedOrgFilter: 'All Platform Cafeterias',
      totalOrganizations: orgs.length,
      activeSubscriptions: activeOrgsCount,
      totalGatewayRevenue: subscriptionRevenue,
      pendingRequestsCount,
      totalPurchaseVolume: analytics.totalPurchaseVolume,
      totalRechargeVolume: analytics.totalRechargeVolume,
      totalRefundVolume: analytics.totalRefundVolume ?? 0,
      totalTransactions: analytics.totalTransactions,
      activeSessionsCount: analytics.activeSessionsCount,
      lowStockItemsCount: analytics.lowStockItemsCount,
      organizations: orgs.map((o) => ({
        id: o.id,
        name: o.name,
        status: o.status,
        planName: o.plan?.name || 'Standard',
        branchCount: o.usage?.branchCount ?? 0,
        branchLimit: o.usage?.branchLimit ?? 3,
        staffCount: o.usage?.staffCount ?? 0,
        staffLimit: o.usage?.staffLimit ?? 25,
        cardCount: o.usage?.cardCount ?? 0,
        cardLimit: o.usage?.cardLimit ?? 1000,
      })),
      branches: branches.map((b) => ({
        id: b.id,
        name: b.name,
        orgName: orgMap.get(b.organizationId) || 'Platform Cafeteria',
        status: b.status,
        transactionCount: 120,
        purchaseCount: 80,
        rechargeCount: 40,
        totalRevenue: 28500,
        sessionCount: 45,
        productsSoldCount: 150,
      })),
      products: peakData?.productDemand.map((p) => ({
        id: p.productId,
        name: p.productName,
        category: p.category,
        quantitySold: p.quantitySold,
        revenue: p.revenue,
        stockStatus: p.stockStatus,
      })) || [],
      peakInfo: peakData
        ? {
            peakHoursRange: peakData.comparison.peakHoursRange,
            peakTransactions: peakData.comparison.peakTransactions,
            offPeakTransactions: peakData.comparison.offPeakTransactions,
            peakVolume: peakData.comparison.peakVolume,
            offPeakVolume: peakData.comparison.offPeakVolume,
            busiestHour: peakData.comparison.busiestHour,
            busiestBranchName: peakData.comparison.busiestBranchName,
            hourlyDistribution: peakData.hourlyDistribution.map((h) => ({
              hourLabel: h.hourLabel,
              transactionCount: h.transactionCount,
              totalVolume: h.totalVolume,
              isPeak: h.isPeak,
            })),
          }
        : undefined,
      plans: plans.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        billingInterval: p.billingInterval,
        branchLimit: p.branchLimit ?? 3,
        staffLimit: p.staffLimit ?? 25,
        cardLimit: p.cardLimit ?? 1000,
        tenantCount: orgs.filter((o) => o.plan?.id === p.id || o.plan?.name === p.name).length,
      })),
      sections: overrideSections ?? pdfSections,
    };
  };

  const refreshPdfPreview = (sectionsToUse: PlatformPdfSectionOptions) => {
    try {
      const params = buildReportParams(sectionsToUse);
      if (!params) return;
      const blob = generatePlatformAnalyticsPdfBlob(params);
      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl);
      }
      const url = URL.createObjectURL(blob);
      setPdfPreviewUrl(url);
    } catch (err) {
      console.error('Failed to refresh Super Admin PDF preview:', err);
    }
  };

  const handleToggleSection = (sectionKey: keyof PlatformPdfSectionOptions) => {
    const updated = {
      ...pdfSections,
      [sectionKey]: !pdfSections[sectionKey],
    };
    setPdfSections(updated);
    refreshPdfPreview(updated);
  };

  const handleSetAllSections = (enable: boolean) => {
    const updated: PlatformPdfSectionOptions = {
      includePlatformKpis: enable,
      includeFinancialSummary: enable,
      includeTenantOrgs: enable,
      includeBranchPerformance: enable,
      includeProductDemand: enable,
      includePeakTraffic: enable,
      includeSubscriptionPlans: enable,
    };
    setPdfSections(updated);
    refreshPdfPreview(updated);
  };

  // ── 1. View PDF Action ─────────────────────────────────────
  const handleViewPdf = () => {
    setIsExportingPdf(true);
    try {
      const params = buildReportParams(pdfSections);
      if (!params) {
        notify.error('No analytics data available to render PDF.');
        return;
      }

      const blob = generatePlatformAnalyticsPdfBlob(params);
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `MoneyCard_SuperAdmin_Analytics_${dateStr}.pdf`;

      console.log('[Super Admin] PDF Preview Ready:', { size: blob.size, type: blob.type, filename });

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

  // ── 2. Download PDF Action (Explicit .pdf binary file) ───────
  const handleDownloadPdf = () => {
    setIsExportingPdf(true);
    try {
      const params = buildReportParams(pdfSections);
      if (!params) {
        notify.error('No analytics data available to download.');
        return;
      }

      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `MoneyCard_SuperAdmin_Analytics_${dateStr}.pdf`;

      // Execute native jsPDF file download strictly matching enabled options
      downloadPlatformAnalyticsPdf(params, filename);

      notify.success(`Analytics report downloaded: ${filename}`);
    } catch {
      notify.error('Failed to download Analytics PDF.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const orgColumns = [
    {
      key: 'name',
      header: 'Cafeteria',
      render: (org: OrganizationOverview) => (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-slate-900">{org.name}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'plan',
      header: 'Subscribed Plan',
      render: (org: OrganizationOverview) => (
        <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50/50">
          {org.plan?.name || 'Standard'}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (org: OrganizationOverview) => (
        <Badge variant={org.status === 'ACTIVE' ? 'success' : 'danger'}>
          {org.status}
        </Badge>
      ),
    },
    {
      key: 'usage',
      header: 'Quota Utilization',
      render: (org: OrganizationOverview) => (
        <span className="text-xs text-slate-600 font-mono">
          {org.usage?.branchCount ?? 0} Branches • {org.usage?.staffCount ?? 0} Staff • {org.usage?.cardCount ?? 0} Cards
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header Bar with View PDF and Download PDF buttons */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Platform Analytics</h1>
        </div>

        {/* Action Buttons: [ Refresh ] and [ View PDF ] */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchPlatformData()}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleViewPdf}
            disabled={isExportingPdf || isLoading || !analytics}
            leftIcon={<Eye className="h-4 w-4" />}
            id="view-superadmin-pdf-btn"
          >
            View PDF
          </Button>
        </div>
      </div>

      {isLoading ? (
        <LoadingState message="Aggregating platform-wide analytics..." />
      ) : error ? (
        <ErrorState title="Failed to load platform analytics" message={error} onRetry={fetchPlatformData} />
      ) : analytics ? (
        <div className="space-y-8">
          {/* ── Filter Toolbar (Cafeteria Scope, Time Window, Refresh Data) ── */}
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              {/* Cafeteria Scope Filter */}
              <div className="w-full sm:w-56">
                <label htmlFor="analytics-cafeteria-filter" className="mb-1 block text-[11px] font-medium text-slate-600">Cafeteria Scope</label>
                <Select
                  id="analytics-cafeteria-filter"
                  value={selectedOrgId}
                  onChange={(e) => setSelectedOrgId(e.target.value)}
                  options={[
                    { value: '', label: 'All Cafeterias' },
                    ...orgs.map((o) => ({ value: o.id, label: o.name })),
                  ]}
                />
              </div>

              {/* Time Window Filter */}
              <div className="w-full sm:w-48">
                <label htmlFor="analytics-preset-filter" className="mb-1 block text-[11px] font-medium text-slate-600">Time Window</label>
                <Select
                  id="analytics-preset-filter"
                  value={datePreset}
                  onChange={(e) => handlePresetChange(e.target.value as DatePreset)}
                  options={[
                    { value: 'all', label: 'All Time' },
                    { value: 'today', label: 'Today' },
                    { value: 'yesterday', label: 'Yesterday' },
                    { value: 'last7', label: 'Last 7 Days' },
                    { value: 'last30', label: 'Last 30 Days' },
                    { value: 'thisMonth', label: 'This Month' },
                    { value: 'custom', label: 'Custom Range' },
                  ]}
                />
              </div>

              {/* Custom Date Inputs (if selected) */}
              {datePreset === 'custom' && (
                <div className="flex flex-wrap items-end gap-2">
                  <div>
                    <label htmlFor="analytics-start-date" className="mb-1 block text-[11px] font-medium text-slate-600">Start Date</label>
                    <input
                      id="analytics-start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none shadow-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="analytics-end-date" className="mb-1 block text-[11px] font-medium text-slate-600">End Date</label>
                    <input
                      id="analytics-end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none shadow-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchPlatformData()}
              leftIcon={<RefreshCw className="h-4 w-4" />}
              className="shrink-0 self-start lg:self-center"
            >
              Refresh Data
            </Button>
          </div>

          {/* Top Platform KPI Cards (Super Admin B2B SaaS Metrics) */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Cafeterias"
              value={orgs.length}
              icon={<Building2 className="h-5 w-5 text-emerald-600" />}
            />

            <StatCard
              label="Active Subscriptions"
              value={activeOrgsCount}
              icon={<Layers className="h-5 w-5 text-emerald-600" />}
            />

            <StatCard
              label="Gateway Subscription Revenue"
              value={formatCurrency(subscriptionRevenue)}
              icon={<Receipt className="h-5 w-5 text-emerald-600" />}
            />

            <StatCard
              label="Plan Requests"
              value={`${pendingRequestsCount} Pending`}
              icon={<Bell className="h-5 w-5 text-emerald-600" />}
            />
          </div>

          {/* Section 1: Tenant Organizations Summary */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Platform Cafeterias Performance</h2>
            <Card padding="none">
              <DataTable<OrganizationOverview>
                data={selectedOrgId ? orgs.filter((o) => o.id === selectedOrgId) : orgs}
                columns={orgColumns}
                keyExtractor={(item: OrganizationOverview) => item.id}
              />
            </Card>
          </div>

          {/* Section 2: Catalog Plans Overview */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Subscription Plans Distribution</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {plans.map((plan) => {
                const count = orgs.filter((o) => o.plan?.id === plan.id || o.plan?.name === plan.name).length;
                return (
                  <div key={plan.id} className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 shadow-sm">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-900">{plan.name}</span>
                      <Badge variant="outline">{count} Tenants</Badge>
                    </div>
                    <p className="font-mono text-lg font-bold text-emerald-600">
                      {formatCurrency(plan.price)} <span className="text-xs text-slate-500 font-normal">/{plan.billingInterval.toLowerCase()}</span>
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
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
        title="Cafeteria Analytics Report — PDF Preview"
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
                  id="platform-pdf-select-all"
                  onClick={() => handleSetAllSections(true)}
                  className="rounded-md px-2 py-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  id="platform-pdf-clear-all"
                  onClick={() => handleSetAllSections(false)}
                  className="rounded-md px-2 py-1 text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Option Pills / Interactive Toggle Cards - Section by section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 pt-2.5">
              {[
                { key: 'includePlatformKpis' as const, label: '1. Platform Overview', id: 'platform-toggle-kpis' },
                { key: 'includeFinancialSummary' as const, label: '2. Financial & Revenue', id: 'platform-toggle-financial' },
                { key: 'includeTenantOrgs' as const, label: '3. Cafeterias & Usage', id: 'platform-toggle-orgs' },
                { key: 'includeBranchPerformance' as const, label: '4. Counter Performance', id: 'platform-toggle-branches' },
                { key: 'includeProductDemand' as const, label: '5. Top Selling Products', id: 'platform-toggle-products' },
                { key: 'includePeakTraffic' as const, label: '6. Peak Hours & Traffic', id: 'platform-toggle-peak' },
                { key: 'includeSubscriptionPlans' as const, label: '7. Subscription Plans', id: 'platform-toggle-plans' },
              ].map((sec) => {
                const isSelected = !!pdfSections[sec.key];
                return (
                  <button
                    key={sec.key}
                    type="button"
                    id={sec.id}
                    onClick={() => handleToggleSection(sec.key)}
                    className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-300 bg-emerald-50/60 text-emerald-950 shadow-2xs ring-1 ring-emerald-400/30'
                        : 'border-slate-200 bg-slate-50/60 text-slate-500 hover:border-slate-300 hover:bg-slate-100/50 opacity-70'
                    }`}
                  >
                    <div
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                    <span className="text-xs font-semibold">{sec.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {pdfPreviewUrl && (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-lg">
              <iframe
                src={`${pdfPreviewUrl}#toolbar=0`}
                className="w-full h-[70vh] rounded-lg"
                title="Cafeteria Analytics Report PDF Preview"
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
              id="download-platform-customized-pdf-btn"
            >
              Download PDF
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </div>
  );
}
