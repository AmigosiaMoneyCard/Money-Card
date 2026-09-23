// ─── Super Admin Analytics View (Platform Scope) ─────────────────────────
// Global platform metrics across all organizations, subscription plans, and POS transactions.
// Structured with Financial Overview and Card Analytics tabs matching Org Admin design.

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  Select,
  LoadingState,
  ErrorState,
} from '@/components/ui';
import { DataTable } from '@/components/tables';
import { notify, formatCurrency } from '@/utils';
import {
  OrgAdminFinancialSection,
  OrgAdminPdfModal,
} from './OrgAdminAnalyticsComponents';
import { OrgAdminCardTracker } from './OrgAdminCardTracker';
import {
  generateAnalyticsPdfBlob,
  downloadOrgAnalyticsPdf,
  downloadFinancialOverviewPdf,
  downloadCardAnalyticsPdf,
  type GenerateOrgPdfOptions,
  type OrgPdfSectionOptions,
} from './analyticsPdfExport';
import {
  Building2,
  Layers,
  RefreshCw,
  Eye,
  Users,
  CreditCard,
  BarChart3,
} from 'lucide-react';

function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function SuperAdminAnalyticsView() {
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [peakData, setPeakData] = useState<PeakAnalyticsOverview | null>(null);
  const [orgs, setOrgs] = useState<OrganizationOverview[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [, setPlanRequests] = useState<PlanChangeRequest[]>([]);

  // Active Tab: Financial Overview vs Card Analytics
  const [activeTab, setActiveTab] = useState<'overview' | 'cards'>('overview');

  // Cafeteria Filter & Custom Date Range Only
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(() => formatLocalDate(new Date()));
  const [endDate, setEndDate] = useState<string>(() => formatLocalDate(new Date()));

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // PDF Viewer Modal & Section State
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfSections, setPdfSections] = useState<OrgPdfSectionOptions>({
    includeExecutiveKpis: true,
    includeCardLifecycle: true,
    includePaymentBreakdown: false,
    includeRushKpis: false,
    includeTrafficDistribution: false,
    includeFoodDemand: false,
    includeBranchComparison: false,
    includeStaffPerformance: false,
  });

  // Clean up object URL when component unmounts or preview changes
  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl);
      }
    };
  }, [pdfPreviewUrl]);

  const fetchPlatformData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    setIsRefreshing(true);
    setError(null);
    try {
      const [analyticsRes, peakRes, orgsRes, branchesRes, payRes, plansRes, reqsRes] = await Promise.all([
        apiService.analytics.getOverview({
          organizationId: selectedOrgId || undefined,
          branchId: undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
        apiService.analytics.getPeakAnalytics({
          organizationId: selectedOrgId || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
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
      setIsRefreshing(false);
    }
  }, [selectedOrgId, startDate, endDate]);

  useEffect(() => {
    fetchPlatformData(false);
  }, [fetchPlatformData]);

  // Monthly Gateway Revenue
  const monthlyGatewayRevenue = useMemo(() => {
    const successPayments = payments.filter((p) => {
      if (p.status !== 'SUCCESS') return false;
      if (selectedOrgId && p.organizationId !== selectedOrgId) return false;
      return true;
    });

    if (startDate && endDate) {
      return successPayments
        .filter((p) => {
          if (!p.createdAt) return true;
          const payDate = p.createdAt.split('T')[0];
          return payDate >= startDate && payDate <= endDate;
        })
        .reduce((sum, p) => sum + p.amount, 0);
    }

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentMonthPayments = successPayments.filter((p) => {
      if (!p.createdAt) return true;
      return p.createdAt.startsWith(currentMonthKey);
    });

    if (currentMonthPayments.length > 0) {
      return currentMonthPayments.reduce((sum, p) => sum + p.amount, 0);
    }

    return successPayments.reduce((sum, p) => sum + p.amount, 0);
  }, [payments, selectedOrgId, startDate, endDate]);

  const recurringMrr = useMemo(() => {
    return orgs
      .filter((o) => (selectedOrgId ? o.id === selectedOrgId : true) && o.status === 'ACTIVE')
      .reduce((sum, o) => {
        const price = o.plan?.price || 0;
        return sum + (o.plan?.billingInterval === 'YEARLY' ? Math.round(price / 12) : price);
      }, 0);
  }, [orgs, selectedOrgId]);

  const subscriptionRevenue = monthlyGatewayRevenue > 0 ? monthlyGatewayRevenue : recurringMrr;
  const activeOrgsCount = orgs.filter((o) => o.status === 'ACTIVE').length;

  const selectedOrg = useMemo(() => orgs.find((o) => o.id === selectedOrgId), [orgs, selectedOrgId]);
  const cafeteriaDisplayName = selectedOrg ? selectedOrg.name : `${orgs.length} Cafeterias`;
  const dateRangeLabel = startDate && endDate ? `${startDate} to ${endDate}` : 'Custom Range';

  // Helper to compile report options
  const getOrgReportOptions = (overrideSections?: Partial<OrgPdfSectionOptions>): GenerateOrgPdfOptions | null => {
    if (!analytics) return null;
    return {
      analytics,
      peakData,
      branches,
      selectedBranchName: cafeteriaDisplayName,
      dateRangeLabel,
      organizationName: selectedOrg ? selectedOrg.name : 'Platform Cafeterias',
      sections: overrideSections ?? pdfSections,
    };
  };

  const handleViewPdf = () => {
    setIsExportingPdf(true);
    try {
      const defaultSections: OrgPdfSectionOptions = {
        includeExecutiveKpis: true,
        includeCardLifecycle: true,
        includePaymentBreakdown: false,
        includeRushKpis: false,
        includeTrafficDistribution: false,
        includeFoodDemand: false,
        includeBranchComparison: false,
        includeStaffPerformance: false,
      };
      setPdfSections(defaultSections);
      const options = getOrgReportOptions(defaultSections);
      if (!options) {
        notify.error('No analytics data available to preview.');
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
      includeCardLifecycle: selected.cards,
    };
    setPdfSections(updated);
    try {
      const options = getOrgReportOptions(updated);
      if (!options) return;
      const blob = generateAnalyticsPdfBlob(options);
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
      const url = URL.createObjectURL(blob);
      setPdfPreviewUrl(url);
    } catch (err) {
      console.error('Failed to refresh PDF preview:', err);
    }
  };

  const handleDownloadFinancialPdf = () => {
    const options = getOrgReportOptions(pdfSections);
    if (!options) return;
    const dateStr = new Date().toISOString().split('T')[0];
    downloadFinancialOverviewPdf(options, `MoneyCard_SuperAdmin_Financial_Overview_${dateStr}.pdf`);
    notify.success('Financial Overview PDF downloaded.');
  };

  const handleDownloadCardAnalyticsPdf = () => {
    const options = getOrgReportOptions(pdfSections);
    if (!options) return;
    const dateStr = new Date().toISOString().split('T')[0];
    downloadCardAnalyticsPdf(options, `MoneyCard_SuperAdmin_Card_Analytics_${dateStr}.pdf`);
    notify.success('Card Analytics PDF downloaded.');
  };

  const handleDownloadBothPdf = () => {
    const options = getOrgReportOptions({
      ...pdfSections,
      includeExecutiveKpis: true,
      includeCardLifecycle: true,
    });
    if (!options) return;
    const dateStr = new Date().toISOString().split('T')[0];
    downloadOrgAnalyticsPdf(options, `MoneyCard_SuperAdmin_Analytics_${dateStr}.pdf`);
    notify.success('Analytics report downloaded.');
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
    <div className="space-y-6">
      {/* ── Header Bar: Title on Left, Filter Options & Actions on Right ── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Platform Analytics
          </h1>
        </div>

        {/* Filter Controls: Cafeteria Filter + Custom Date Range + Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Cafeteria Filter */}
          <div className="w-44 sm:w-52">
            <Select
              id="analytics-cafeteria-filter"
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              options={[
                { value: '', label: 'All Cafeterias' },
                ...orgs.map((o) => ({ value: o.id, label: o.name })),
              ]}
              className="h-9 py-1.5 pl-3 pr-8 text-xs leading-normal font-medium"
            />
          </div>

          {/* Custom Date Pickers — strictly custom range only */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200">
            <input
              id="superadmin-analytics-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-8 px-2 text-xs bg-white border border-slate-200 rounded text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
              aria-label="Start date"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              id="superadmin-analytics-end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-8 px-2 text-xs bg-white border border-slate-200 rounded text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
              aria-label="End date"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fetchPlatformData(false)}
              className="h-8 px-2.5 text-xs font-semibold"
            >
              Apply
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const today = formatLocalDate(new Date());
                setStartDate(today);
                setEndDate(today);
              }}
              className="h-8 px-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border-slate-200 bg-white"
            >
              Reset to Today
            </Button>
          </div>

          {/* Refresh Data */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchPlatformData(true)}
            isLoading={isRefreshing}
            leftIcon={<RefreshCw className={`h-3.5 w-3.5 text-slate-600 ${isRefreshing ? 'animate-spin' : ''}`} />}
            title="Refresh platform analytics"
          >
            Refresh
          </Button>

          {/* View PDF */}
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

      {/* ── Tab Navigation: Financial Overview & Card Analytics ── */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          <span>Financial Overview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cards')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'cards'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <CreditCard className="h-4 w-4 text-indigo-600" />
          <span>Card Analytics</span>
        </button>
      </div>

      {isLoading ? (
        <LoadingState message="Aggregating platform-wide analytics..." />
      ) : error ? (
        <ErrorState title="Failed to load platform analytics" message={error} onRetry={() => fetchPlatformData(false)} />
      ) : activeTab === 'overview' ? (
        <div className="space-y-8">
          {/* Top Platform KPI Cards (Including Total Cafeterias) */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Cafeterias"
              value={`${orgs.length} Cafeterias`}
              icon={<Building2 className="h-5 w-5 text-emerald-600" />}
            />

            <StatCard
              label="Cafeteria Admins"
              value={`${orgs.filter((o) => Boolean(o.adminUser)).length} Admins`}
              icon={<Users className="h-5 w-5 text-teal-600" />}
            />

            <StatCard
              label="Active Subscriptions"
              value={`${activeOrgsCount} Active`}
              icon={<Layers className="h-5 w-5 text-emerald-600" />}
            />

            <StatCard
              label="Subscription Revenue"
              value={`${formatCurrency(subscriptionRevenue)} / mo`}
              icon={<CreditCard className="h-5 w-5 text-emerald-600" />}
            />
          </div>

          {/* Financial Summaries & Activity Flow */}
          {analytics && (
            <OrgAdminFinancialSection
              analytics={analytics}
              cashRecharge={analytics.cashMoney ?? analytics.cashRechargeVolume ?? 0}
              upiRecharge={analytics.upiMoney ?? analytics.upiRechargeVolume ?? 0}
              totalRefund={analytics.totalRefundVolume ?? 0}
            />
          )}

          {/* Section: Platform Cafeterias Performance */}
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

          {/* Section: Catalog Plans Overview */}
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
      ) : (
        <OrgAdminCardTracker
          cardFleet={analytics?.cardFleetAnalytics}
          closedCardsCount={analytics?.closedCardsCount}
          zeroBalanceActiveCardsCount={analytics?.zeroBalanceActiveCardsCount}
          activeCardsRechargeCount={analytics?.activeCardsRechargeCount}
          reRechargedCardsCount={analytics?.reRechargedCardsCount}
        />
      )}

      {/* ── PDF Viewer Modal (OrgAdminPdfModal with Financial and Card tiles) ── */}
      <OrgAdminPdfModal
        isOpen={showPdfModal}
        onClose={() => {
          setShowPdfModal(false);
          if (pdfPreviewUrl) {
            URL.revokeObjectURL(pdfPreviewUrl);
            setPdfPreviewUrl(null);
          }
        }}
        pdfPreviewUrl={pdfPreviewUrl}
        onDownloadPdf={handleDownloadFinancialPdf}
        onDownloadFinancial={handleDownloadFinancialPdf}
        onDownloadCardAnalytics={handleDownloadCardAnalyticsPdf}
        onDownloadBoth={handleDownloadBothPdf}
        onPreviewSectionsChange={handleUpdatePreviewSections}
      />
    </div>
  );
}
