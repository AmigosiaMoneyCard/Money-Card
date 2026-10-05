import { Eye, RefreshCw, BarChart3, CreditCard, UtensilsCrossed, Calendar } from 'lucide-react';
import { useAuth } from '@/hooks';
import { Button, Select, LoadingState, ErrorState } from '@/components/ui';
import {
  OrgAdminFinancialSection,
  OrgAdminPdfModal,
  OrgAdminMenuAnalyticsSection,
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
    fetchAnalytics,
    handlePresetChange,
    handleStartDateChange,
    handleEndDateChange,
    handleViewPdf,
    handleDownloadFinancialPdf,
    handleDownloadCardAnalyticsPdf,
    handleDownloadBothPdf,
    handleUpdatePreviewSections,
    cashRechargeAmount,
    upiRechargeAmount,
  } = useOrgAdminAnalytics();

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
          {/* Cafeteria Filter (Org Admin only) */}
          {!isCounterStaff && (
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
          )}

          {/* Minimal Segmented Toolbar */}
          <div className="flex flex-wrap items-center bg-white p-1 rounded-xl border border-slate-200/90 shadow-2xs gap-1.5">
            {/* Date Range Inputs with Calendar Icon (Auto-applied) */}
            <div className="flex items-center gap-1 pl-1.5 pr-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <input
                id="org-analytics-start-date"
                type="date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="h-7 px-1.5 text-xs bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium transition-colors"
                aria-label="Start date"
              />
              <span className="text-xs text-slate-300 font-medium select-none">–</span>
              <input
                id="org-analytics-end-date"
                type="date"
                value={endDate}
                onChange={(e) => handleEndDateChange(e.target.value)}
                className="h-7 px-1.5 text-xs bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium transition-colors"
                aria-label="End date"
              />
            </div>

            {/* Today Preset */}
            <button
              type="button"
              onClick={() => handlePresetChange('today')}
              className="h-7 px-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
            >
              Today
            </button>

            {/* Micro-divider */}
            <div className="h-4 w-px bg-slate-200 mx-0.5 hidden sm:block" />

            {/* Refresh Data */}
            <button
              type="button"
              onClick={() => fetchAnalytics()}
              title="Refresh analytics data"
              aria-label="Refresh analytics data"
              className="h-7 w-7 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>

            {/* View PDF */}
            <Button
              variant="primary"
              size="sm"
              onClick={handleViewPdf}
              disabled={isExportingPdf || isLoading || !analytics}
              leftIcon={<Eye className="h-3.5 w-3.5" />}
              className="h-7 px-2.5 text-xs font-semibold rounded-md shadow-2xs"
            >
              View PDF
            </Button>
          </div>
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
          <span>Wallet Analytics</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('menu')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'menu'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <UtensilsCrossed className="h-4 w-4 text-emerald-600" />
          <span>Menu Analytics</span>
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
      ) : activeTab === 'cards' ? (
        <OrgAdminCardTracker
          cardFleet={analytics?.cardFleetAnalytics}
          blockedCardsCount={analytics?.blockedCardsCount ?? analytics?.cardFleetAnalytics?.blockedCardsCount ?? 0}
          blockedBalance={analytics?.blockedBalance ?? analytics?.cardFleetAnalytics?.blockedBalance ?? 0}
          closedCardsCount={analytics?.closedCardsCount}
          zeroBalanceActiveCardsCount={analytics?.zeroBalanceActiveCardsCount}
          activeCardsRechargeCount={analytics?.activeCardsRechargeCount}
          reRechargedCardsCount={analytics?.reRechargedCardsCount}
        />
      ) : (
        analytics ? (
          <OrgAdminMenuAnalyticsSection analytics={analytics} />
        ) : null
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
