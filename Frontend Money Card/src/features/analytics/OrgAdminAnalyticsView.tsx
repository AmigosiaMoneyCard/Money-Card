import { Eye, RefreshCw, BarChart3, CreditCard } from 'lucide-react';
import { Button, Select, LoadingState, ErrorState } from '@/components/ui';
import {
  OrgAdminFinancialSection,
  OrgAdminPdfModal,
} from './OrgAdminAnalyticsComponents';
import { OrgAdminCardTracker } from './OrgAdminCardTracker';
import type { SortMetric } from './OrgAdminAnalyticsComponents';
import {
  useOrgAdminAnalytics,
  getPresetDates,
} from './useOrgAdminAnalytics';
import type { DatePreset } from './useOrgAdminAnalytics';

export type { DatePreset, SortMetric };
export { getPresetDates };
export type StaffSortMetric =
  | 'activated'
  | 'settled'
  | 'cardRecharge'
  | 'purchases'
  | 'refunds'
  | 'txns'
  | 'name';

export function OrgAdminAnalyticsView() {
  const {
    branches,
    analytics,
    activeTab,
    handleTabChange,
    isLoading,
    error,
    isExportingPdf,
    showPdfModal,
    setShowPdfModal,
    pdfPreviewUrl,
    setPdfPreviewUrl,
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
    handleViewPdf,
    handleDownloadPdf,
    cashRechargeAmount,
    upiRechargeAmount,
  } = useOrgAdminAnalytics();

  return (
    <div className="space-y-6">
      {/* ─── Header Bar: Title on Left, Filter Options & Actions on Right ─── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Analytics</h1>
        </div>

        {/* Filter Controls Directly Beside Headline */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Counter Scope Selector */}
          <div className="w-36 sm:w-44">
            <Select
              id="analytics-branch-filter"
              value={branchFilter}
              onChange={(e) => handleBranchChange(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Counters' },
                ...branches.map((b) => ({ value: b.id, label: b.name })),
              ]}
            />
          </div>

          {/* Time Window Selector */}
          <div className="w-36 sm:w-40">
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

          {/* Custom Date Pickers (Shown when custom is selected) */}
          {datePreset === 'custom' && (
            <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200">
              <input
                id="org-analytics-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                id="org-analytics-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCustomDateApply(startDate, endDate)}
                className="h-7 px-2.5 text-xs font-semibold"
              >
                Apply
              </Button>
            </div>
          )}

          {/* Refresh Data */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAnalytics()}
            leftIcon={<RefreshCw className="h-3.5 w-3.5 text-slate-600" />}
            title="Refresh analytics data"
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
          >
            View PDF
          </Button>
        </div>
      </div>

      {/* ─── Tab Navigation: Strictly Financial Overview & Card Analytics ─── */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => handleTabChange('overview')}
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
          onClick={() => handleTabChange('cards')}
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

      {/* ─── Main Content ─── */}
      {isLoading ? (
        <LoadingState message="Calculating analytics metrics..." />
      ) : error ? (
        <ErrorState title="Failed to load analytics" message={error} onRetry={fetchAnalytics} />
      ) : activeTab === 'overview' ? (
        analytics ? (
          <OrgAdminFinancialSection
            analytics={analytics}
            cashRecharge={cashRechargeAmount}
            upiRecharge={upiRechargeAmount}
            totalRefund={analytics.totalRefundVolume ?? 0}
          />
        ) : null
      ) : (
        <OrgAdminCardTracker
          cardFleet={analytics?.cardFleetAnalytics}
          closedCardsCount={analytics?.closedCardsCount}
          zeroBalanceActiveCardsCount={analytics?.zeroBalanceActiveCardsCount}
          activeCardsRechargeCount={analytics?.activeCardsRechargeCount}
          reRechargedCardsCount={analytics?.reRechargedCardsCount}
        />
      )}

      {/* PDF Viewer Modal */}
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
        onDownloadPdf={handleDownloadPdf}
      />
    </div>
  );
}
