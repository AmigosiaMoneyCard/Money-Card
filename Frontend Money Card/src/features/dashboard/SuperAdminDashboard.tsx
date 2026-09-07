// ─── Super Admin Platform Dashboard ───────────────────────────
// Built for non-technical users: clear hierarchy, prominent Action Needed,
// quick actions, simplified KPI cards, and plain-English sections.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '@/services/api';
import type {
  OrganizationOverview,
  Plan,
  AnalyticsOverview,
  PlanChangeRequest,
} from '@/types';
import {
  Button,
  Card,
  CardHeader,
  CardContent,
  Badge,
  StatCard,
  Select,
  LoadingState,
  ErrorState,
} from '@/components/ui';
import { DataTable } from '@/components/tables';
import { formatDate, formatCurrency } from '@/utils';
import {
  Building2,
  BarChart3,
  TrendingUp,
  Receipt,
  ArrowRight,
  RefreshCw,
  Layers,
  ShoppingBag,
  CreditCard,
  AlertTriangle,
  Clock,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Search,
  PlusCircle,
  Bell,
  CheckCircle2,
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

export function SuperAdminDashboard() {
  const navigate = useNavigate();

  const [orgs, setOrgs] = useState<OrganizationOverview[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [planRequests, setPlanRequests] = useState<PlanChangeRequest[]>([]);

  // Organization Filter State
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');

  // Date Filtering State
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Search & Business Overview Accordion Toggle
  const [searchOrgTerm, setSearchOrgTerm] = useState('');
  const [isDetailedView, setIsDetailedView] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset !== 'custom') {
      const { startDate: s, endDate: e } = getPresetDates(preset);
      setStartDate(s);
      setEndDate(e);
    }
  };

  const fetchPlatformData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    setIsRefreshing(true);
    setError(null);
    try {
      const [orgsRes, plansRes, analyticsRes, reqsRes] = await Promise.all([
        apiService.organizations.getOrganizations(),
        apiService.plans.getPlans(),
        apiService.analytics.getAnalyticsOverview({
          organizationId: selectedOrgId || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
        apiService.subscriptions.getPlanRequests(),
      ]);

      if (!orgsRes.success) {
        setError(orgsRes.error.message || 'Failed to load dashboard data');
        return;
      }

      setOrgs(orgsRes.data.items);
      if (plansRes.success) setPlans(plansRes.data);
      if (analyticsRes.success) setAnalytics(analyticsRes.data);
      if (reqsRes.success) setPlanRequests(reqsRes.data || []);
    } catch {
      setError('Unable to load platform data. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedOrgId, startDate, endDate]);

  useEffect(() => {
    fetchPlatformData(false);
  }, [fetchPlatformData]);

  const activeOrgsCount = useMemo(
    () => orgs.filter((o) => o.status === 'ACTIVE').length,
    [orgs]
  );

  const pendingRequests = useMemo(
    () => planRequests.filter((r) => r.status === 'PENDING'),
    [planRequests]
  );

  const selectedOrgName = useMemo(() => {
    if (!selectedOrgId) return 'All Cafeterias';
    const found = orgs.find((o) => o.id === selectedOrgId);
    return found ? found.name : 'All Cafeterias';
  }, [orgs, selectedOrgId]);

  const filteredOrgs = useMemo(() => {
    if (!searchOrgTerm.trim()) return orgs;
    const term = searchOrgTerm.toLowerCase().trim();
    return orgs.filter((o) => o.name.toLowerCase().includes(term));
  }, [orgs, searchOrgTerm]);

  // Simplified Table Headers: Cafeteria, Status, Plan, Joined, View
  const orgColumns = [
    {
      key: 'name',
      header: 'Cafeteria',
      render: (org: OrganizationOverview) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-slate-900">{org.name}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (org: OrganizationOverview) => (
        <Badge variant={org.status === 'ACTIVE' ? 'success' : 'danger'}>
          {org.status === 'ACTIVE' ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'plan',
      header: 'Plan',
      render: (org: OrganizationOverview) => (
        <Badge variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50">
          {org.plan?.name || 'Standard'}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Joined',
      render: (org: OrganizationOverview) => (
        <span className="text-xs text-slate-500">{formatDate(org.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'View',
      render: (_org: OrganizationOverview) => (
        <button
          onClick={() => navigate('/organizations')}
          className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline inline-flex items-center gap-1"
        >
          <span>Open</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── 1. Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Sparkles className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Welcome back, Super Admin 👋
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

      {/* ── 2. Action Needed (Most Prominent Section) ────────────────────── */}
      {pendingRequests.length > 0 ? (
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
                    ? `${pendingRequests[0]?.organizationName || 'A cafeteria'} requested plan renewal. Tap to approve.`
                    : 'Cafeterias submitted plan changes requiring your approval.'}
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
      ) : (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-semibold text-emerald-900">
              Action Needed: All caught up! No pending approvals right now.
            </span>
          </div>
          <span className="text-xs text-emerald-700 font-medium">All systems normal</span>
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
                Add Cafeteria
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
          {/* ── Filter Toolbar (Cafeteria Scope, Time Window, Refresh Data) ── */}
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              {/* Cafeteria Scope Filter */}
              <div className="w-full sm:w-56">
                <label className="mb-1 block text-[11px] font-medium text-slate-600">Cafeteria Scope</label>
                <Select
                  id="dashboard-cafeteria-filter"
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
                <label className="mb-1 block text-[11px] font-medium text-slate-600">Time Window</label>
                <Select
                  id="dashboard-preset-filter"
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
                    <label className="mb-1 block text-[11px] font-medium text-slate-600">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-slate-600">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden"
                    />
                  </div>
                </div>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchPlatformData(false)}
              isLoading={isRefreshing}
              leftIcon={<RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />}
              className="shrink-0 self-start lg:self-center"
            >
              Refresh Data
            </Button>
          </div>

          {/* ── 4. Simplified KPI Cards (Cafeterias, Sales, Active Cards, Orders) ── */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Cafeterias"
              value={`${activeOrgsCount} Active`}
              icon={<Building2 className="h-5 w-5 text-emerald-600" />}
            />

            <StatCard
              label="Sales"
              value={formatCurrency(analytics?.totalPurchaseVolume || 0)}
              icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
            />

            <StatCard
              label="Active Cards"
              value={(analytics?.activeCardsCount || 0).toLocaleString()}
              icon={<CreditCard className="h-5 w-5 text-sky-600" />}
            />

            <StatCard
              label="Orders"
              value={(analytics?.totalTransactions || 0).toLocaleString()}
              icon={<ShoppingBag className="h-5 w-5 text-teal-600" />}
            />
          </div>

          {/* ── 6. Business Overview (Renamed from Financial & Operational Breakdown) ── */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <button
              onClick={() => setIsDetailedView((prev) => !prev)}
              className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Business Overview ({selectedOrgName})
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600">
                <span>{isDetailedView ? 'Hide Details' : 'Show Details'}</span>
                {isDetailedView ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </button>

            {isDetailedView && (
              <div className="p-5 pt-0 space-y-5 border-t border-slate-200">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 pt-4">
                  <StatCard
                    label="Money Added to Cards"
                    value={formatCurrency(analytics?.totalRechargeVolume || 0)}
                    icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
                  />

                  <StatCard
                    label="Customer Refunds"
                    value={formatCurrency(analytics?.totalRefundVolume || 0)}
                    icon={<Receipt className="h-5 w-5 text-rose-600" />}
                  />

                  <StatCard
                    label="Net Revenue"
                    value={formatCurrency(
                      Math.max(0, (analytics?.totalPurchaseVolume || 0) - (analytics?.totalRefundVolume || 0))
                    )}
                    icon={<Receipt className="h-5 w-5 text-teal-600" />}
                  />

                  <StatCard
                    label="Active Sessions"
                    value={analytics?.activeSessionsCount || 0}
                    icon={<Clock className="h-5 w-5 text-amber-600" />}
                  />
                </div>

                {/* Branch Breakdown Table */}
                {analytics?.branchPerformance && analytics.branchPerformance.length > 0 && (
                  <div className="space-y-3 pt-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Branch Breakdown
                      </h4>
                      <span className="text-xs text-slate-500 font-mono">
                        {analytics.branchPerformance.length} location{analytics.branchPerformance.length > 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                      <table className="w-full text-left text-xs text-slate-600">
                        <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                          <tr>
                            <th className="px-4 py-3">Location</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3 text-right">Purchases</th>
                            <th className="px-4 py-3 text-right">Recharges</th>
                            <th className="px-4 py-3 text-right">Refunds</th>
                            <th className="px-4 py-3 text-right">Orders</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/80">
                          {analytics.branchPerformance.map((bp) => (
                            <tr key={bp.branchId} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3 font-semibold text-slate-900 flex items-center gap-2">
                                <Building2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                <span>{bp.branchName}</span>
                              </td>
                              <td className="px-4 py-3">
                                <Badge variant={bp.status === 'ACTIVE' ? 'success' : 'danger'}>
                                   {bp.status === 'ACTIVE' ? 'Open' : 'Closed'}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-emerald-600">
                                {formatCurrency(bp.purchaseVolume)}
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-teal-600">
                                {formatCurrency(bp.rechargeVolume)}
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-rose-600">
                                {formatCurrency(bp.refundVolume)}
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-slate-800">
                                {bp.transactionCount.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── 7. Subscription Plans ─────────────────────────────────────── */}
          <Card>
            <CardHeader
              title="Subscription Plans"
            />
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {plans.map((plan) => {
                  const count = orgs.filter(
                    (o) => o.plan?.id === plan.id || o.plan?.name === plan.name
                  ).length;

                  return (
                    <div
                      key={plan.id}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-emerald-500/40 shadow-xs"
                    >
                      <div className="space-y-1">
                        <span className="text-sm font-bold text-slate-900">{plan.name}</span>
                        <p className="text-xs font-semibold text-emerald-600">
                          {formatCurrency(plan.price)} <span className="text-[10px] text-slate-500 font-normal">/ {plan.billingInterval.toLowerCase()}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="font-bold text-emerald-700 border-emerald-200 bg-emerald-50">
                          {count} Cafeteria{count !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* ── 8. Cafeterias Directory (With Search) ──────────────────────── */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Cafeterias
                </h2>
              </div>

              <div className="flex items-center gap-3">
                {/* Search Cafeterias */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchOrgTerm}
                    onChange={(e) => setSearchOrgTerm(e.target.value)}
                    placeholder="Search cafeteria..."
                    className="rounded-xl border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden"
                  />
                  {searchOrgTerm && (
                    <button
                      onClick={() => setSearchOrgTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/organizations')}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  Manage All
                </Button>
              </div>
            </div>

            <Card padding="none">
              <DataTable<OrganizationOverview>
                data={filteredOrgs.slice(0, 6)}
                columns={orgColumns}
                keyExtractor={(item: OrganizationOverview) => item.id}
              />
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
