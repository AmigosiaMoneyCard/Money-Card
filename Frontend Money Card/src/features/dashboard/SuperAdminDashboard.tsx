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
  ArrowRight,
  RefreshCw,
  Layers,
  ShoppingBag,
  CreditCard,
  AlertTriangle,
  Sparkles,
  PlusCircle,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
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

  // Cafeterias Section Expand/Collapse State (Starts collapsed)
  const [isCafeteriasExpanded, setIsCafeteriasExpanded] = useState<boolean>(false);

  // Date Filtering State
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

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

  const selectedOrg = useMemo(
    () => orgs.find((o) => o.id === selectedOrgId),
    [orgs, selectedOrgId]
  );

  const pendingRequests = useMemo(
    () => planRequests.filter((r) => r.status === 'PENDING'),
    [planRequests]
  );

  const filteredOrgs = useMemo(() => {
    if (!selectedOrgId) return orgs;
    return orgs.filter((o) => o.id === selectedOrgId);
  }, [orgs, selectedOrgId]);

  // Simplified Table Headers: Cafeteria, Status, Plan, Joined, View, Action
  const orgColumns = [
    {
      key: 'name',
      header: 'Cafeteria',
      render: (org: OrganizationOverview) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-slate-100">{org.name}</p>
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
        <Badge variant="outline" className="text-violet-300 border-violet-500/30">
          {org.plan?.name || 'Standard'}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Joined',
      render: (org: OrganizationOverview) => (
        <span className="text-xs text-slate-400">{formatDate(org.createdAt)}</span>
      ),
    },
    {
      key: 'view',
      header: 'View',
      render: (_org: OrganizationOverview) => (
        <button
          onClick={() => navigate('/organizations')}
          className="text-xs font-semibold text-violet-400 hover:text-violet-300 hover:underline inline-flex items-center gap-1"
        >
          <span>Open</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (org: OrganizationOverview) => (
        <div className="relative inline-block">
          <select
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'filter') setSelectedOrgId(org.id);
              if (val === 'manage') navigate('/organizations');
              if (val === 'analytics') navigate(`/analytics?org=${org.id}`);
              if (val === 'plans') navigate('/plans');
            }}
            defaultValue=""
            className="appearance-none rounded-lg border border-slate-700 bg-slate-800/90 pl-2.5 pr-6 py-1 text-xs font-medium text-slate-300 hover:border-violet-500/60 focus:border-violet-500 focus:outline-none cursor-pointer shadow-sm"
          >
            <option value="" disabled>Select Action</option>
            <option value="filter" className="bg-slate-900 text-slate-200">Filter Dashboard</option>
            <option value="manage" className="bg-slate-900 text-slate-200">Manage Org</option>
            <option value="analytics" className="bg-slate-900 text-slate-200">View Analytics</option>
            <option value="plans" className="bg-slate-900 text-slate-200">View Plans</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── 1. Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600/20 text-violet-400">
            <Sparkles className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
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
        <div className="rounded-2xl border-2 border-amber-500/50 bg-gradient-to-r from-amber-500/20 via-slate-900 to-amber-500/10 p-5 shadow-lg shadow-amber-500/10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-slate-100">
                    Action Needed: {pendingRequests.length} Request{pendingRequests.length > 1 ? 's' : ''} Awaiting Approval
                  </span>
                  <Badge variant="warning" className="text-[10px] font-bold">URGENT</Badge>
                </div>
                <p className="text-xs text-slate-300 mt-1">
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
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 shrink-0 shadow-md shadow-amber-500/25"
            >
              Review Requests
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <span className="text-sm font-semibold text-emerald-200">
              Action Needed: All caught up! No pending approvals right now.
            </span>
          </div>
          <span className="text-xs text-emerald-400/80 font-medium">All systems normal</span>
        </div>
      )}

      {/* ── 3. Quick Actions ──────────────────────────────────────────────── */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Quick Actions
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <button
            onClick={() => navigate('/organizations')}
            className="group flex flex-col sm:flex-row items-center sm:items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-center sm:text-left transition-all hover:border-violet-500/50 hover:bg-slate-900 hover:shadow-md hover:shadow-violet-500/10"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/15 text-violet-400 group-hover:scale-105 transition-transform">
              <PlusCircle className="h-5 w-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-100 group-hover:text-violet-300 transition-colors">
                Add Cafeteria
              </span>
            </div>
          </button>

          <button
            onClick={() => navigate('/subscriptions?tab=requests')}
            className="group flex flex-col sm:flex-row items-center sm:items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-center sm:text-left transition-all hover:border-amber-500/50 hover:bg-slate-900 hover:shadow-md hover:shadow-amber-500/10"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 group-hover:scale-105 transition-transform">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-100 group-hover:text-amber-300 transition-colors">
                Review Requests
              </span>
            </div>
          </button>

          <button
            onClick={() => navigate('/plans')}
            className="group flex flex-col sm:flex-row items-center sm:items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-center sm:text-left transition-all hover:border-indigo-500/50 hover:bg-slate-900 hover:shadow-md hover:shadow-indigo-500/10"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-400 group-hover:scale-105 transition-transform">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
                Manage Plans
              </span>
            </div>
          </button>

          <button
            onClick={() => navigate('/analytics')}
            className="group flex flex-col sm:flex-row items-center sm:items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-center sm:text-left transition-all hover:border-sky-500/50 hover:bg-slate-900 hover:shadow-md hover:shadow-sky-500/10"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-400 group-hover:scale-105 transition-transform">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-100 group-hover:text-sky-300 transition-colors">
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
          <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              {/* Cafeteria Scope Filter */}
              <div className="w-full sm:w-56">
                <label className="mb-1 block text-[11px] font-medium text-slate-400">Cafeteria Scope</label>
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
                <label className="mb-1 block text-[11px] font-medium text-slate-400">Time Window</label>
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
                    <label className="mb-1 block text-[11px] font-medium text-slate-400">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 focus:border-violet-500 focus:outline-none [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-slate-400">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 focus:border-violet-500 focus:outline-none [color-scheme:dark]"
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
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {selectedOrg ? `Org Admin Scope: ${selectedOrg.name}` : 'Platform Metrics (All Cafeterias)'}
                </span>
                <Badge variant={selectedOrg ? 'primary' : 'outline'} className="text-[10px]">
                  {selectedOrg ? 'Connected Org Admin' : 'Global Super Admin'}
                </Badge>
              </div>
              {selectedOrg && (
                <button
                  onClick={() => setSelectedOrgId('')}
                  className="text-xs text-violet-400 hover:text-violet-300 hover:underline font-medium"
                >
                  Reset to All Cafeterias
                </button>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* 1. Cafeteria Card with prominent single dropdown on the right-end side */}
              <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 backdrop-blur-sm p-4 sm:p-5 transition-all hover:border-violet-500/40 flex flex-col justify-between gap-3 group shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 shadow-inner">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-400 leading-snug">Cafeteria</p>
                      <p
                        className="mt-1 text-lg sm:text-xl font-extrabold text-slate-100 tracking-tight truncate max-w-[110px] sm:max-w-[130px]"
                        title={selectedOrg ? selectedOrg.name : `${activeOrgsCount} Active`}
                      >
                        {selectedOrg ? selectedOrg.name : `${activeOrgsCount} Active`}
                      </p>
                    </div>
                  </div>

                  {/* Single Dropdown on the right end side of the Cafeteria box */}
                  <div className="shrink-0">
                    <div className="relative">
                      <select
                        id="dashboard-cafeteria-box-dropdown"
                        value={selectedOrgId}
                        onChange={(e) => setSelectedOrgId(e.target.value)}
                        className="appearance-none rounded-lg border-2 border-violet-500/40 bg-violet-950/40 pl-3 pr-8 py-1.5 text-xs font-bold text-violet-200 hover:border-violet-400 hover:bg-violet-900/50 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 cursor-pointer shadow-md shadow-violet-950/30 transition-all"
                      >
                        <option value="" className="bg-slate-900 text-slate-200">All Cafeterias</option>
                        {orgs.map((o) => (
                          <option key={o.id} value={o.id} className="bg-slate-900 text-slate-200">
                            {o.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-violet-300" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-800/60 pt-2.5">
                  <span className="text-xs text-slate-400 truncate">
                    {selectedOrg
                      ? `${selectedOrg.plan?.name || 'Standard'} Plan • Active`
                      : `${orgs.length} registered cafeterias`}
                  </span>
                  <button
                    onClick={() => navigate('/organizations')}
                    className="text-xs font-semibold text-violet-400 hover:text-violet-300 hover:underline flex items-center gap-0.5 shrink-0"
                  >
                    <span>Manage</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* 2. Sales Card */}
              <StatCard
                label={selectedOrg ? `${selectedOrg.name} Sales` : 'Sales'}
                value={formatCurrency(analytics?.totalPurchaseVolume || 0)}
                description={
                  selectedOrg
                    ? `Gross revenue for ${selectedOrg.name}`
                    : 'Platform-wide gross sales'
                }
                icon={<TrendingUp className="h-5 w-5 text-emerald-400" />}
                onClick={() => navigate(selectedOrgId ? `/analytics?org=${selectedOrgId}` : '/analytics')}
                className="group transition-all hover:border-emerald-500/50 hover:shadow-md hover:shadow-emerald-500/10"
              />

              {/* 3. Active Cards */}
              <StatCard
                label={selectedOrg ? `${selectedOrg.name} Cards` : 'Active Cards'}
                value={(analytics?.activeCardsCount || 0).toLocaleString()}
                description={
                  selectedOrg
                    ? `Smart cards in ${selectedOrg.name}`
                    : 'Total active cards in circulation'
                }
                icon={<CreditCard className="h-5 w-5 text-sky-400" />}
                onClick={() => navigate('/cards')}
                className="group transition-all hover:border-sky-500/50 hover:shadow-md hover:shadow-sky-500/10"
              />

              {/* 4. Orders */}
              <StatCard
                label={selectedOrg ? `${selectedOrg.name} Orders` : 'Orders'}
                value={(analytics?.totalTransactions || 0).toLocaleString()}
                description={
                  selectedOrg
                    ? `POS orders at ${selectedOrg.name}`
                    : 'Completed POS orders platform-wide'
                }
                icon={<ShoppingBag className="h-5 w-5 text-indigo-400" />}
                onClick={() => navigate('/reports')}
                className="group transition-all hover:border-indigo-500/50 hover:shadow-md hover:shadow-indigo-500/10"
              />
            </div>
          </div>

          {/* ── 5. Subscription Plans ─────────────────────────────────────── */}
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
                      className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-4 transition-all hover:border-violet-500/40"
                    >
                      <div className="space-y-1">
                        <span className="text-sm font-bold text-slate-100">{plan.name}</span>
                        <p className="text-xs font-semibold text-emerald-400">
                          {formatCurrency(plan.price)} <span className="text-[10px] text-slate-500 font-normal">/ {plan.billingInterval.toLowerCase()}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="font-bold text-violet-300 border-violet-500/30">
                          {count} Cafeteria{count !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* ── 6. Cafeterias Directory (With View & Collapse Mode) ─────────── */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm overflow-hidden transition-all">
            {/* Collapsible Header */}
            <div
              className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/80 transition-colors ${
                isCafeteriasExpanded ? 'border-b border-slate-800/80' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 shadow-inner">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-lg font-bold text-slate-100">
                      Cafeterias
                    </h2>
                    <Badge variant="outline" className="border-violet-500/30 text-violet-300 text-xs font-semibold">
                      {filteredOrgs.length} {filteredOrgs.length === 1 ? 'Cafeteria' : 'Cafeterias'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedOrg ? `Filtered for ${selectedOrg.name}` : `All ${orgs.length} registered cafeterias`}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* When Expanded: Show All Cafeterias Dropdown & Manage All Button */}
                {isCafeteriasExpanded && (
                  <>
                    {/* Single Cafeteria Dropdown */}
                    <div className="w-48 sm:w-56">
                      <Select
                        id="dashboard-cafeterias-bottom-filter"
                        value={selectedOrgId}
                        onChange={(e) => setSelectedOrgId(e.target.value)}
                        options={[
                          { value: '', label: 'All Cafeterias' },
                          ...orgs.map((o) => ({ value: o.id, label: o.name })),
                        ]}
                      />
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/organizations')}
                      rightIcon={<ArrowRight className="h-4 w-4" />}
                    >
                      Manage All
                    </Button>
                  </>
                )}

                {/* View / Collapse Toggle Button */}
                <Button
                  variant={isCafeteriasExpanded ? 'secondary' : 'primary'}
                  size="sm"
                  onClick={() => setIsCafeteriasExpanded((prev) => !prev)}
                  rightIcon={isCafeteriasExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  className="font-medium"
                >
                  {isCafeteriasExpanded ? 'Collapse' : 'View Cafeterias'}
                </Button>
              </div>
            </div>

            {/* Expandable Table Content */}
            {isCafeteriasExpanded && (
              <div className="overflow-x-auto">
                <DataTable<OrganizationOverview>
                  data={filteredOrgs.slice(0, 10)}
                  columns={orgColumns}
                  keyExtractor={(item: OrganizationOverview) => item.id}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
