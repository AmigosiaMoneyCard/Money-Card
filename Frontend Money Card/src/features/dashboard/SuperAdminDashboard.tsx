// ─── Super Admin Platform Dashboard ───────────────────────────
// Built for non-technical users: clear hierarchy, prominent Action Needed,
// quick actions, simplified KPI cards, and plain-English sections.

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '@/services/api';
import { formatCurrency, formatLocalDate } from '@/utils';
import type {
  OrganizationOverview,
  PlanChangeRequest,
  AnalyticsOverview,
} from '@/types';
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardContent,
  Select,
  LoadingState,
  ErrorState,
} from '@/components/ui';
import {
  Building2,
  Users,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  Sparkles,
  Store,
  UserCheck,
  PlusCircle,
  Bell,
  Layers,
  BarChart3,
  TrendingUp,
  ShoppingBag,
  Wallet,
} from 'lucide-react';

export function SuperAdminDashboard() {
  const navigate = useNavigate();

  const [orgs, setOrgs] = useState<OrganizationOverview[]>([]);
  const [planRequests, setPlanRequests] = useState<PlanChangeRequest[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);

  // Filters for Unified Overview (Organization Scope & Custom Time Range)
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isInitialMount = useRef(true);

  const fetchPlatformData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    setIsRefreshing(true);
    setError(null);
    try {
      const [orgsRes, reqsRes, analyticsRes] = await Promise.all([
        apiService.organizations.getOrganizations(),
        apiService.subscriptions.getPlanRequests(),
        apiService.analytics.getOverview({
          organizationId: selectedOrgId || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
      ]);

      if (!orgsRes.success) {
        setError(orgsRes.error.message || 'Failed to load dashboard data');
        return;
      }

      setOrgs(orgsRes.data.items);
      if (reqsRes.success) setPlanRequests(reqsRes.data || []);
      if (analyticsRes.success) setAnalytics(analyticsRes.data);
    } catch {
      setError('Unable to load platform data. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedOrgId, startDate, endDate]);

  const fetchFilteredAnalytics = useCallback(async () => {
    setIsAnalyticsLoading(true);
    try {
      const analyticsRes = await apiService.analytics.getOverview({
        organizationId: selectedOrgId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      if (analyticsRes.success) {
        setAnalytics(analyticsRes.data);
      }
    } catch {
      // Keep previous data gracefully
    } finally {
      setIsAnalyticsLoading(false);
    }
  }, [selectedOrgId, startDate, endDate]);

  useEffect(() => {
    fetchPlatformData(false);
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    fetchFilteredAnalytics();
  }, [fetchFilteredAnalytics]);

  const activeOrgs = useMemo(
    () => orgs.filter((o) => o.status === 'ACTIVE'),
    [orgs]
  );
  const activeOrgsCount = activeOrgs.length;

  const selectedOrg = useMemo(
    () => activeOrgs.find((o) => o.id === selectedOrgId),
    [activeOrgs, selectedOrgId]
  );

  const filteredOrgs = useMemo(
    () => (selectedOrgId ? activeOrgs.filter((o) => o.id === selectedOrgId) : activeOrgs),
    [activeOrgs, selectedOrgId]
  );

  const pendingRequests = useMemo(
    () => planRequests.filter((r) => r.status === 'PENDING'),
    [planRequests]
  );

  // ── Super Admin SaaS Platform Metrics (Active Only) ───────
  const displayOrgsCount = selectedOrgId ? 1 : activeOrgsCount;

  const activeCardholdersCount = useMemo(
    () => filteredOrgs.reduce((sum, o) => sum + (o.usage?.activeCardCount ?? 0), 0),
    [filteredOrgs]
  );

  const activeCountersCount = useMemo(
    () => filteredOrgs.reduce((sum, o) => sum + (o.usage?.branchCount ?? 0), 0),
    [filteredOrgs]
  );

  const activeStaffCount = useMemo(
    () => filteredOrgs.reduce((sum, o) => sum + (o.usage?.staffCount ?? 0), 0),
    [filteredOrgs]
  );

  return (
    <div className="space-y-6">
      {/* ── 1. Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Sparkles className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Welcome back, Super Admin
          </h1>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchPlatformData(false)}
          isLoading={isRefreshing}
          leftIcon={<RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />}
        >
          Refresh
        </Button>
      </div>

      {/* ── 2. Action Needed (Only shown when pending approval requests exist) ── */}
      {pendingRequests.length > 0 && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/90 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-slate-900">
                    Action Needed: {pendingRequests.length} Request{pendingRequests.length > 1 ? 's' : ''} Awaiting Approval
                  </span>
                  <Badge variant="warning" className="text-[10px] font-bold">URGENT</Badge>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  {pendingRequests.some((r) => r.requestType === 'RENEWAL')
                    ? `${pendingRequests[0]?.organizationName || 'An organization'} requested plan renewal. Tap to approve.`
                    : 'Organizations submitted plan changes requiring your approval.'}
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/subscriptions?tab=requests')}
              rightIcon={<ArrowRight className="h-4 w-4" />}
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-5 shrink-0 shadow-xs shadow-amber-500/20"
            >
              Review Requests
            </Button>
          </div>
        </div>
      )}

      {/* ── 3. Quick Actions ──────────────────────────────────────────────── */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Quick Actions
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <button
            onClick={() => navigate('/organizations')}
            className="group flex flex-col sm:flex-row items-center sm:items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-center sm:text-left transition-all hover:border-emerald-500/50 hover:shadow-md hover:shadow-emerald-500/10 shadow-xs cursor-pointer"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-105 transition-transform">
              <PlusCircle className="h-5 w-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                Add Organization
              </span>
            </div>
          </button>

          <button
            onClick={() => navigate('/subscriptions?tab=requests')}
            className="group flex flex-col sm:flex-row items-center sm:items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-center sm:text-left transition-all hover:border-amber-500/50 hover:shadow-md hover:shadow-amber-500/10 shadow-xs cursor-pointer"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 group-hover:scale-105 transition-transform">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                Review Requests
              </span>
            </div>
          </button>

          <button
            onClick={() => navigate('/plans')}
            className="group flex flex-col sm:flex-row items-center sm:items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-center sm:text-left transition-all hover:border-teal-500/50 hover:shadow-md hover:shadow-teal-500/10 shadow-xs cursor-pointer"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600 group-hover:scale-105 transition-transform">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-900 group-hover:text-teal-600 transition-colors">
                Manage Plans
              </span>
            </div>
          </button>

          <button
            onClick={() => navigate('/analytics')}
            className="group flex flex-col sm:flex-row items-center sm:items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-center sm:text-left transition-all hover:border-sky-500/50 hover:shadow-md hover:shadow-sky-500/10 shadow-xs cursor-pointer"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600 group-hover:scale-105 transition-transform">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
                View Reports
              </span>
            </div>
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingState message="Loading dashboard..." />
      ) : error ? (
        <ErrorState title="Could not load dashboard data" message={error} onRetry={() => fetchPlatformData(false)} />
      ) : (
        <div className="space-y-6">
          {/* ── 4. Unified Overview Container ("Under One Roof") ── */}
          <Card className="border-slate-200 bg-white shadow-xs">
            <CardHeader
              title="Overview"
            />

            <CardContent className="space-y-5">
              {/* Filter Toolbar (Organization Selector, Custom Time Range, Action Buttons) */}
              <div className="flex flex-col gap-3 rounded-xl border border-slate-200/90 bg-slate-50/70 p-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Organization Scope Filter */}
                  <div className="w-full sm:w-52">
                    <label htmlFor="superadmin-org-filter" className="mb-1 block text-[11px] font-semibold text-slate-600">
                      Organization
                    </label>
                    <Select
                      id="superadmin-org-filter"
                      value={selectedOrgId}
                      onChange={(e) => setSelectedOrgId(e.target.value)}
                      options={[
                        { value: '', label: 'All Organizations' },
                        ...activeOrgs.map((o) => ({ value: o.id, label: o.name })),
                      ]}
                      className="h-8 py-1 pl-2.5 pr-7 text-xs font-medium bg-white"
                    />
                  </div>

                  {/* Time Window (Custom Date Range) */}
                  <div className="w-full sm:w-auto">
                    <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                      Time Window
                    </label>
                    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 shadow-2xs">
                      <input
                        id="superadmin-start-date"
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                          const val = e.target.value;
                          setStartDate(val);
                          if (endDate && val > endDate) {
                            setEndDate(val);
                          }
                        }}
                        className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none font-medium"
                        aria-label="Start date"
                      />
                      <span className="text-xs text-slate-400 font-medium">to</span>
                      <input
                        id="superadmin-end-date"
                        type="date"
                        value={endDate}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEndDate(val);
                          if (startDate && val < startDate) {
                            setStartDate(val);
                          }
                        }}
                        className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none font-medium"
                        aria-label="End date"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const today = formatLocalDate(new Date());
                          setStartDate(today);
                          setEndDate(today);
                        }}
                        className="h-6 px-2 text-[11px] font-semibold border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                      >
                        Today
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setStartDate('');
                          setEndDate('');
                        }}
                        className="h-6 px-2 text-[11px] font-semibold border-slate-200 bg-white text-slate-600 hover:text-slate-900 cursor-pointer"
                      >
                        All Time
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Refresh Metrics Action */}
                <div className="pt-1 lg:pt-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchPlatformData(true)}
                    isLoading={isRefreshing || isAnalyticsLoading}
                    leftIcon={<RefreshCw className={`h-3.5 w-3.5 text-slate-600 ${isRefreshing || isAnalyticsLoading ? 'animate-spin' : ''}`} />}
                    className="w-full sm:w-auto h-8 text-xs font-semibold"
                  >
                    Refresh
                  </Button>
                </div>
              </div>

              {/* Row 1: SaaS Platform Metrics (Organizations, Active Cardholders, Active Counters, Staff Members) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Platform Scale
                  </span>
                  {selectedOrg && (
                    <Badge variant="default" className="text-[10px] font-semibold">
                      Filtered: {selectedOrg.name}
                    </Badge>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs hover:border-slate-300 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-600">Organizations</span>
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                        <Building2 className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                        {displayOrgsCount}
                      </div>
                      <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                        {selectedOrg ? 'Selected organization' : 'Active platforms'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs hover:border-slate-300 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-600">Active Cardholders</span>
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                        <Users className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                        {activeCardholdersCount}
                      </div>
                      <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                        {selectedOrg ? `${selectedOrg.name} cards` : 'Across all organizations'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs hover:border-slate-300 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-600">Active Counters</span>
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                        <Store className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                        {activeCountersCount}
                      </div>
                      <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                        Active POS counters
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs hover:border-slate-300 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-600">Staff Members</span>
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                        <UserCheck className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                        {activeStaffCount}
                      </div>
                      <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                        Registered staff
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 2: Platform Financial & Operational Metrics (Wallet Analytics) */}
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Wallet Analytics
                  </span>
                  {(startDate || endDate) && (
                    <span className="text-[11px] font-medium text-slate-400">
                      {startDate && endDate ? `${startDate} to ${endDate}` : startDate ? `From ${startDate}` : `Until ${endDate}`}
                    </span>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs hover:border-slate-300 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-600">Total Sales</span>
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                        <ShoppingBag className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                        {formatCurrency(analytics?.totalPurchaseVolume ?? analytics?.salesVolume ?? 0)}
                      </div>
                      <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                        {`${analytics?.foodOrdersCount || analytics?.purchaseCount || 0} orders`}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs hover:border-slate-300 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-600">Recharge Amount</span>
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                        <TrendingUp className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                        {formatCurrency(analytics?.moneyAdded ?? analytics?.totalRechargeVolume ?? analytics?.rechargeVolume ?? 0)}
                      </div>
                      <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                        {`${analytics?.rechargeCount ?? 0} recharges`}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs hover:border-slate-300 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-600">Net Recharge Inflow</span>
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                        <Wallet className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                        {formatCurrency(
                          (analytics?.moneyAdded ?? analytics?.totalRechargeVolume ?? analytics?.rechargeVolume ?? 0) -
                            (analytics?.totalRefundVolume ?? analytics?.moneyRefunded ?? 0)
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                        Recharges minus refunds
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs hover:border-slate-300 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-600">Refunds</span>
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                        <RefreshCw className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                        {formatCurrency(analytics?.totalRefundVolume ?? analytics?.moneyRefunded ?? 0)}
                      </div>
                      <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                        {`${analytics?.refundCount ?? 0} refunds`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
