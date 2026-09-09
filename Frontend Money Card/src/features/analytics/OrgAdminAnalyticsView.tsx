import { Eye, RefreshCw } from 'lucide-react';
import { Badge, Button, Select, LoadingState, ErrorState } from '@/components/ui';
import {
  OrgAdminKpiCards,
  OrgAdminLifecycleCards,
  OrgAdminPaymentRefundCards,
  OrgAdminBranchComparison,
  OrgAdminStaffSummary,
  OrgAdminPdfModal,
  OrgAdminBranchDetailModal,
} from './OrgAdminAnalyticsComponents';
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
    cashRechargeAmount,
    upiRechargeAmount,
    sortedBranchComparison,
    activeStaffList,
    totalCardsActivatedByStaff,
    totalCardsSettledByStaff,
    totalStaffVolume,
  } = useOrgAdminAnalytics();

  return (
    <div className="space-y-8">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Cafeteria Analytics</h1>
            <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50/50">
              Organization Scope
            </Badge>
          </div>
        </div>

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
            <label htmlFor="analytics-branch-filter" className="mb-1 block text-[11px] font-medium text-slate-600">
              Counter Scope
            </label>
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

          {/* Date Preset Filter */}
          <div className="w-full sm:w-44">
            <label htmlFor="analytics-preset-filter" className="mb-1 block text-[11px] font-medium text-slate-600">
              Time Window
            </label>
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

          {/* Custom Date Inputs */}
          {datePreset === 'custom' && (
            <div className="flex items-end gap-2">
              <div>
                <label htmlFor="org-analytics-start-date" className="mb-1 block text-[11px] font-medium text-slate-600">
                  Start Date
                </label>
                <input
                  id="org-analytics-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none shadow-sm"
                />
              </div>
              <div>
                <label htmlFor="org-analytics-end-date" className="mb-1 block text-[11px] font-medium text-slate-600">
                  End Date
                </label>
                <input
                  id="org-analytics-end-date"
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
        <LoadingState message="Calculating cafeteria metrics & ledger analytics..." />
      ) : error ? (
        <ErrorState title="Failed to load analytics" message={error} onRetry={fetchAnalytics} />
      ) : analytics ? (
        <div className="space-y-8">
          <OrgAdminKpiCards analytics={analytics} />
          <OrgAdminLifecycleCards analytics={analytics} />
          <OrgAdminPaymentRefundCards
            cashRecharge={cashRechargeAmount}
            upiRecharge={upiRechargeAmount}
            totalRefund={analytics.totalRefundVolume ?? 0}
          />
          <OrgAdminBranchComparison
            sortedBranches={sortedBranchComparison}
            sortBy={sortBy}
            onSortChange={setSortBy}
            onSelectDetail={setSelectedBranchDetail}
          />
        </div>
      ) : null}

      {/* Staff Operational Performance Summary */}
      {analytics?.staffPerformance && analytics.staffPerformance.length > 0 && (
        <OrgAdminStaffSummary
          activeCount={activeStaffList.length}
          cardsActivated={totalCardsActivatedByStaff}
          cardsSettled={totalCardsSettledByStaff}
          totalVolume={totalStaffVolume}
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
        pdfSections={pdfSections}
        activeSectionsCount={activeSectionsCount}
        onToggleSection={handleToggleSection}
        onSetAllSections={handleSetAllSections}
        onDownloadPdf={handleDownloadPdf}
      />

      {/* Branch Metric Detail Modal */}
      <OrgAdminBranchDetailModal
        branch={selectedBranchDetail}
        onClose={() => setSelectedBranchDetail(null)}
      />
    </div>
  );
}
