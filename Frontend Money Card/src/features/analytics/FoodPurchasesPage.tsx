import { useMemo } from 'react';
import { Calendar, RefreshCw, ShoppingBag, ArrowUpRight, Store } from 'lucide-react';
import { useAuth } from '@/hooks';
import { Select, LoadingState, ErrorState, Card } from '@/components/ui';
import { FoodPurchasesByCounterTable } from './OrgAdminAnalyticsComponents';
import { useOrgAdminAnalytics } from './useOrgAdminAnalytics';
import { formatCurrency } from '@/utils';

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

  const totalRevenue = useMemo(() => {
    return purchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
  }, [purchases]);

  const crossCounterCount = useMemo(() => {
    return purchases.filter((p) => p.isCrossCounter).length;
  }, [purchases]);

  const totalItemsCount = useMemo(() => {
    return purchases.reduce((sum, p) => {
      const itemsSum = (p.items || []).reduce((iSum, it) => iSum + (it.quantity || 1), 0);
      return sum + itemsSum;
    }, 0);
  }, [purchases]);

  return (
    <div className="space-y-6">
      {/* ─── Header Bar: Title on Left, Filter Options & Actions on Right ─── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Food Purchases by Counter
          </h1>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            {isCounterStaff
              ? 'Real-time itemized food purchase ledger for your counter'
              : 'Detailed itemized food purchases across all cafeteria counters'}
          </p>
        </div>

        {/* Filter Controls: Cafeteria Filter + Custom Date Range + Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Cafeteria Filter (Org Admin only) */}
          {!isCounterStaff && (
            <div className="w-44 sm:w-52">
              <Select
                id="food-purchases-cafeteria-filter"
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
                id="food-purchases-start-date"
                type="date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="h-7 px-1.5 text-xs bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium transition-colors"
                aria-label="Start date"
              />
              <span className="text-xs text-slate-300 font-medium select-none">–</span>
              <input
                id="food-purchases-end-date"
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
              title="Refresh purchases data"
              aria-label="Refresh purchases data"
              className="h-7 w-7 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Main Content ─── */}
      {isLoading ? (
        <LoadingState message="Loading food purchases..." />
      ) : error ? (
        <ErrorState title="Failed to load food purchases" message={error} onRetry={fetchAnalytics} />
      ) : (
        <div className="space-y-6">
          {/* Summary KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card padding="md" className="border-slate-200 bg-white shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Total Food Orders
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <ShoppingBag className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2">
                <p className="font-mono text-2xl font-bold text-slate-900">
                  {purchases.length} Orders
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {totalItemsCount} food items sold
                </p>
              </div>
            </Card>

            <Card padding="md" className="border-slate-200 bg-white shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Total Food Sales
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                  <ArrowUpRight className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2">
                <p className="font-mono text-2xl font-bold text-emerald-600">
                  {formatCurrency(totalRevenue)}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  From itemized counter orders
                </p>
              </div>
            </Card>

            <Card padding="md" className="border-slate-200 bg-white shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Cross-Counter Orders
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Store className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2">
                <p className="font-mono text-2xl font-bold text-indigo-600">
                  {crossCounterCount} Orders
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cross-counter redemptions
                </p>
              </div>
            </Card>
          </div>

          {/* Food Purchases by Counter Table */}
          <FoodPurchasesByCounterTable purchases={purchases} />
        </div>
      )}
    </div>
  );
}
