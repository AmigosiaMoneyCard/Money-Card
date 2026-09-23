// ─── Super Admin Platform Dashboard ───────────────────────────
// Built for non-technical users: clear hierarchy, prominent Action Needed,
// quick actions, simplified KPI cards, and plain-English sections.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '@/services/api';
import type {
  OrganizationOverview,
  PlanChangeRequest,
} from '@/types';
import {
  Button,
  Badge,
  StatCard,
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
  CheckCircle2,
  PlusCircle,
  Bell,
  Layers,
  BarChart3,
} from 'lucide-react';

export function SuperAdminDashboard() {
  const navigate = useNavigate();

  const [orgs, setOrgs] = useState<OrganizationOverview[]>([]);
  const [planRequests, setPlanRequests] = useState<PlanChangeRequest[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlatformData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    setIsRefreshing(true);
    setError(null);
    try {
      const [orgsRes, reqsRes] = await Promise.all([
        apiService.organizations.getOrganizations(),
        apiService.subscriptions.getPlanRequests(),
      ]);

      if (!orgsRes.success) {
        setError(orgsRes.error.message || 'Failed to load dashboard data');
        return;
      }

      setOrgs(orgsRes.data.items);
      if (reqsRes.success) setPlanRequests(reqsRes.data || []);
    } catch {
      setError('Unable to load platform data. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPlatformData(false);
  }, [fetchPlatformData]);

  const activeOrgs = useMemo(
    () => orgs.filter((o) => o.status === 'ACTIVE'),
    [orgs]
  );
  const activeOrgsCount = activeOrgs.length;

  const pendingRequests = useMemo(
    () => planRequests.filter((r) => r.status === 'PENDING'),
    [planRequests]
  );

  // ── Super Admin SaaS Platform Metrics (Active Only) ───────
  const activeCardholdersCount = useMemo(
    () => activeOrgs.reduce((sum, o) => sum + (o.usage?.activeCardCount ?? 0), 0),
    [activeOrgs]
  );

  const activeCountersCount = useMemo(
    () => activeOrgs.reduce((sum, o) => sum + (o.usage?.branchCount ?? 0), 0),
    [activeOrgs]
  );

  const activeStaffCount = useMemo(
    () => activeOrgs.reduce((sum, o) => sum + (o.usage?.staffCount ?? 0), 0),
    [activeOrgs]
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
          {/* ── 4. Super Admin SaaS Platform Metrics (Cafeterias, Active Cardholders, Active Counters, Staff Members) ── */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Cafeterias"
              value={`${activeOrgsCount} Cafeterias`}
              icon={<Building2 className="h-5 w-5 text-emerald-600" />}
            />

            <StatCard
              label="Active Cardholders"
              value={`${activeCardholdersCount} Cardholders`}
              icon={<Users className="h-5 w-5 text-teal-600" />}
            />

            <StatCard
              label="Active Counters"
              value={`${activeCountersCount} Counters`}
              icon={<Store className="h-5 w-5 text-sky-600" />}
            />

            <StatCard
              label="Staff Members"
              value={`${activeStaffCount} Members`}
              icon={<UserCheck className="h-5 w-5 text-amber-600" />}
            />
          </div>
        </div>
      )}
    </div>
  );
}
