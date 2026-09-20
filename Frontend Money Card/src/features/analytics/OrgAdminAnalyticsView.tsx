import { Eye, RefreshCw, BarChart3, CreditCard, Store } from 'lucide-react';
import { useAuth } from '@/hooks';
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
  const { user } = useAuth();
  const isCounterStaff = user?.role === 'STAFF';

  const {
    branches,
    branchFilter,
    handleBranchChange,
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
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    fetchAnalytics,
    handlePresetChange,
    handleCustomDateApply,
    handleViewPdf,
    handleDownloadFinancialPdf,
    handleDownloadCardAnalyticsPdf,
    handleDownloadBothPdf,
    handleUpdatePreviewSections,
    cashRechargeAmount,
    upiRechargeAmount,
  } = useOrgAdminAnalytics();

  const assignedBranchName =
    branches.find((b) => b.id === branchFilter)?.name ||
    (branches.length > 0 ? branches[0].name : 'Assigned Counter');

  return (
    <div className="space-y-6">
      {/* ─── Header Bar: Title on Left, Filter Options & Actions on Right ─── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            {isCounterStaff ? 'Counter Analytics' : 'Analytics'}
          </h1>
        </div>

        {/* Filter Controls: Cafeteria Filter + Custom Date Range + Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Cafeteria Filter */}
          {!isCounterStaff ? (
            <div className="w-44 sm:w-52">
              <Select
                id="analytics-cafeteria-filter"
                value={branchFilter}
                onChange={(e) => handleBranchChange(e.target.value)}
                options={[
                  { value: 'ALL', label: 'All Cafeterias' },
                  ...branches.map((b) => ({ value: b.id, label: b.name })),
                ]}
                className="h-9 py-1.5 pl-3 pr-8 text-xs leading-normal font-medium"
              />
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 shadow-2xs">
              <Store className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span className="truncate max-w-[160px]">{assignedBranchName}</span>
            </div>
          )}

          {/* Custom Date Pickers — always visible */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200">
            <input
              id="org-analytics-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-8 px-2 text-xs bg-white border border-slate-200 rounded text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
              aria-label="Start date"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              id="org-analytics-end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-8 px-2 text-xs bg-white border border-slate-200 rounded text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
              aria-label="End date"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleCustomDateApply(startDate, endDate)}
              className="h-8 px-2.5 text-xs font-semibold"
            >
              Apply
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePresetChange('today')}
              className="h-8 px-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border-slate-200 bg-white"
            >
              Reset to Today
            </Button>
          </div>

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

      {/* ─── Tab Navigation: Financial Overview, Card Analytics & Recharges ─── */}
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
        onDownloadPdf={handleDownloadFinancialPdf}
        onDownloadFinancial={handleDownloadFinancialPdf}
        onDownloadCardAnalytics={handleDownloadCardAnalyticsPdf}
        onDownloadBoth={handleDownloadBothPdf}
        onPreviewSectionsChange={handleUpdatePreviewSections}
      />
    </div>
  );
}
