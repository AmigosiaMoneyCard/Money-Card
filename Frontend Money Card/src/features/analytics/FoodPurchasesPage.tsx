import { Calendar, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks';
import { Select, LoadingState, ErrorState } from '@/components/ui';
import { FoodPurchasesByCounterTable } from './OrgAdminAnalyticsComponents';
import { useOrgAdminAnalytics } from './useOrgAdminAnalytics';

export function FoodPurchasesPage() {
  const { user } = useAuth();
  const isCounterStaff = user?.role === 'STAFF';

  const {
    branches,
    branchFilter,
    handleBranchChange,
    analytics,
    isLoading,
    error,
    startDate,
    endDate,
    fetchAnalytics,
    handlePresetChange,
    handleStartDateChange,
    handleEndDateChange,
  } = useOrgAdminAnalytics();

  const purchases = analytics?.foodPurchasesByCounter || [];

  return (
    <div className="space-y-6">
      {/* ─── Header Bar: Title on Left, Filter Options & Actions on Right ─── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Sales
          </h1>
        </div>

        {/* Filter Controls: Kitchen Filter + Custom Date Range + Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Kitchen Filter (Org Admin only) */}
          {!isCounterStaff && (
            <div className="w-44 sm:w-52">
              <Select
                id="sales-kitchen-filter"
                value={branchFilter}
                onChange={(e) => handleBranchChange(e.target.value)}
                options={[
                  { value: 'ALL', label: 'All Kitchens' },
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
                id="sales-start-date"
                type="date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="h-7 px-1.5 text-xs bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium transition-colors"
                aria-label="Start date"
              />
              <span className="text-xs text-slate-300 font-medium select-none">–</span>
              <input
                id="sales-end-date"
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
              title="Refresh sales data"
              aria-label="Refresh sales data"
              className="h-7 w-7 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Main Content ─── */}
      {isLoading ? (
        <LoadingState message="Loading sales..." />
      ) : error ? (
        <ErrorState title="Failed to load sales" message={error} onRetry={fetchAnalytics} />
      ) : (
        <FoodPurchasesByCounterTable purchases={purchases} />
      )}
    </div>
  );
}
