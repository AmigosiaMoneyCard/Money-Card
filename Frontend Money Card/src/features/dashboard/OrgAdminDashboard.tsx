// ─── Organization Admin Dashboard (M11) ────────────────────
// Real-time organization metrics, plan usage limits, and
// unified date-range calendar filtered operational metrics.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '@/services/api';
import { useBranch, usePermissions, useAuth } from '@/hooks';
import type {
  Branch,
  Staff,
  Card as CardEntity,
  AnalyticsOverview,
} from '@/types';
import {
  Button,
  Select,
  Card,
  CardHeader,
  CardContent,
  StatCard,
  LoadingState,
  ErrorState,
} from '@/components/ui';
import { formatCurrency, formatLocalDate } from '@/utils';
import {
  Users,
  CreditCard,
  ShoppingBag,
  TrendingUp,
  RefreshCw,
  ArrowRight,
  BarChart3,
  ShieldAlert,
  DollarSign,
  RotateCcw,
} from 'lucide-react';

export type DatePreset = 'thisMonth' | 'today' | 'yesterday' | 'last7' | 'last30' | 'all' | 'custom';

export function getPresetDates(preset: DatePreset): { startDate: string; endDate: string } {
  const now = new Date();
  const todayStr = formatLocalDate(now);

  if (preset === 'today') {
    return { startDate: todayStr, endDate: todayStr };
  }
  if (preset === 'yesterday') {
    const yest = new Date(now);
    yest.setDate(yest.getDate() - 1);
    const yestStr = formatLocalDate(yest);
    return { startDate: yestStr, endDate: yestStr };
  }
  if (preset === 'last7') {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    return { startDate: formatLocalDate(start), endDate: todayStr };
  }
  if (preset === 'last30') {
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    return { startDate: formatLocalDate(start), endDate: todayStr };
  }
  if (preset === 'thisMonth') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { startDate: formatLocalDate(start), endDate: todayStr };
  }

  return { startDate: '', endDate: '' };
}

export function OrgAdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const { currentBranch, selectBranch, clearBranch, setBranches: updateBranchContext } = useBranch();
  const isCounterAdmin = user?.role === 'STAFF';

  const [branches, setBranches] = useState<Branch[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [cardsList, setCardsList] = useState<CardEntity[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);

  // Date Filtering State (Custom Range, Default: Today)
  const [startDate, setStartDate] = useState<string>(() => getPresetDates('today').startDate);
  const [endDate, setEndDate] = useState<string>(() => getPresetDates('today').endDate);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrgDashboardData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    setIsRefreshing(true);
    setError(null);
    try {
      const [branchRes, staffRes, cardRes, analyticsRes] =
        await Promise.all([
          apiService.branches.getBranches(),
          apiService.staff.getStaff(),
          apiService.cards.getCards(),
          apiService.analytics.getAnalyticsOverview({
            branchId: currentBranch ? currentBranch.id : undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
          }),
        ]);

      if (branchRes.success) {
        setBranches(branchRes.data.items);
        updateBranchContext(branchRes.data.items);
      }
      if (staffRes.success) setStaffList(staffRes.data.items);
      if (cardRes.success) setCardsList(cardRes.data.items);
      if (analyticsRes.success) setAnalytics(analyticsRes.data);
    } catch {
      setError('Unable to connect to server. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [currentBranch, startDate, endDate]);

  useEffect(() => {
    let isCancelled = false;
    const load = async () => {
      setError(null);
      try {
        const [branchRes, staffRes, cardRes, analyticsRes] =
          await Promise.all([
            apiService.branches.getBranches(),
            apiService.staff.getStaff(),
            apiService.cards.getCards(),
            apiService.analytics.getAnalyticsOverview({
              branchId: currentBranch ? currentBranch.id : undefined,
              startDate: startDate || undefined,
              endDate: endDate || undefined,
            }),
          ]);
        if (isCancelled) return;

        if (branchRes.success) {
          setBranches(branchRes.data.items);
          updateBranchContext(branchRes.data.items);
        }
        if (staffRes.success) setStaffList(staffRes.data.items);
        if (cardRes.success) setCardsList(cardRes.data.items);
        if (analyticsRes.success) setAnalytics(analyticsRes.data);
      } catch {
        if (!isCancelled) setError('Unable to connect to server. Please try again.');
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      isCancelled = true;
    };
  }, [currentBranch, startDate, endDate]);





  // Active wallets count
  const activeWalletsCount = useMemo(() => {
    return cardsList.filter((c) => c.status === 'ACTIVE').length;
  }, [cardsList]);

  // Blocked wallets count (Security locked)
  const blockedWalletsCount = useMemo(() => {
    return cardsList.filter((c) => c.status === 'BLOCKED').length;
  }, [cardsList]);

  // Remaining balance across active wallets
  const remainingWalletsBalance = useMemo(() => {
    return cardsList.reduce((acc, c) => acc + (c.activeSession?.balance || 0), 0);
  }, [cardsList]);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isCounterAdmin ? 'Counter Dashboard' : 'Organization Dashboard'}
          </h1>
        </div>
      </div>

      {/* ─── 4 Primary Quick Action Cards (Non-Technical Friendly) ─── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {hasPermission('CARD_ISSUE') && (
          <button
            type="button"
            onClick={() => navigate('/cards')}
            className="group flex flex-col justify-between p-5 rounded-2xl border border-slate-200 bg-white hover:border-emerald-500/50 hover:shadow-md transition-all text-left shadow-xs cursor-pointer"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-110 transition-transform">
                <CreditCard className="h-6 w-6" />
              </div>
              <span className="text-xs font-semibold text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                Open <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                View Wallets
              </h3>
            </div>
          </button>
        )}

        {hasPermission('STAFF_MANAGE') && (
          <button
            type="button"
            onClick={() => navigate('/staff')}
            className="group flex flex-col justify-between p-5 rounded-2xl border border-slate-200 bg-white hover:border-emerald-500/50 hover:shadow-md transition-all text-left shadow-xs cursor-pointer"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-110 transition-transform">
                <Users className="h-6 w-6" />
              </div>
              <span className="text-xs font-semibold text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                Open <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                Add Team Member
              </h3>
            </div>
          </button>
        )}

        {hasPermission('PRODUCT_MANAGE') && (
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="group flex flex-col justify-between p-5 rounded-2xl border border-slate-200 bg-white hover:border-teal-500/50 hover:shadow-md transition-all text-left shadow-xs cursor-pointer"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-600 group-hover:scale-110 transition-transform">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <span className="text-xs font-semibold text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                Open <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 group-hover:text-teal-600 transition-colors">
                Add Menu Item
              </h3>
            </div>
          </button>
        )}

        <button
          type="button"
          onClick={() => navigate('/analytics')}
          className="group flex flex-col justify-between p-5 rounded-2xl border border-slate-200 bg-white hover:border-amber-500/50 hover:shadow-md transition-all text-left shadow-xs cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 group-hover:scale-110 transition-transform">
              <BarChart3 className="h-6 w-6" />
            </div>
            <span className="text-xs font-semibold text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              Open <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
          <div>
            <h3 className="font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
              Analytics
            </h3>
          </div>
        </button>
      </div>

      {isLoading ? (
        <LoadingState message="Loading cafeteria dashboard..." />
      ) : error ? (
        <ErrorState title="Failed to load dashboard" message={error} onRetry={() => fetchOrgDashboardData(false)} />
      ) : (
        <div className="space-y-6">
          {/* ── UNIFIED FILTERED METRICS BOX (Date Filter Toolbar + 4 Operational Stat Cards) ── */}
          <Card>
            <CardHeader
              title="Overview"
            />

            <CardContent className="space-y-5">
              {/* Filter Toolbar (Branch Scope, Time Window, Refresh Data) */}
              <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Branch Scope Filter (Org Admin only) */}
                  {!isCounterAdmin && (
                    <div className="w-full sm:w-52">
                      <label className="mb-1 block text-[11px] font-medium text-slate-600">Cafeteria Scope</label>
                      <Select
                        id="dashboard-branch-filter"
                        value={currentBranch?.id || ''}
                        onChange={(e) => {
                          const bId = e.target.value;
                          if (!bId) {
                            clearBranch();
                          } else {
                            const target = branches.find((b) => b.id === bId);
                            if (target) selectBranch(target);
                          }
                        }}
                        options={[
                          { value: '', label: 'All Cafeterias' },
                          ...branches.map((b) => ({ value: b.id, label: b.name })),
                        ]}
                      />
                    </div>
                  )}

                  {/* Time Window Filter (Custom Range Only) */}
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-slate-600">Time Window</label>
                    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 shadow-2xs">
                      <input
                        id="dashboard-start-date"
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                          const val = e.target.value;
                          setStartDate(val);
                          if (endDate && val > endDate) {
                            setEndDate(val);
                          }
                        }}
                        className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
                      />
                      <span className="text-xs text-slate-400">to</span>
                      <input
                        id="dashboard-end-date"
                        type="date"
                        value={endDate}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEndDate(val);
                          if (startDate && val < startDate) {
                            setStartDate(val);
                          }
                        }}
                        className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const today = getPresetDates('today').startDate;
                          setStartDate(today);
                          setEndDate(today);
                        }}
                        className="h-7 px-2 text-xs font-semibold border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                      >
                        Reset to Today
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Refresh Data Button */}
                <div className="pt-2 lg:pt-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchOrgDashboardData(false)}
                    disabled={isRefreshing}
                    isLoading={isRefreshing}
                    leftIcon={<RefreshCw className="h-4 w-4" />}
                  >
                    Refresh Data
                  </Button>
                </div>
              </div>

              {/* Filtered Stat Cards inside the box (6 Operational Stat Cards matching Wallet Analytics) */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard
                  label="Total sales"
                  value={formatCurrency(analytics?.totalPurchaseVolume ?? analytics?.salesVolume ?? 0)}
                  description={`${analytics?.foodOrdersCount || analytics?.purchaseCount || 0} orders`}
                  icon={<ShoppingBag className="h-5 w-5 text-emerald-600" />}
                />

                <StatCard
                  label="Recharge Amount"
                  value={formatCurrency(analytics?.moneyAdded ?? analytics?.totalRechargeVolume ?? analytics?.rechargeVolume ?? 0)}
                  description={`${analytics?.rechargeCount ?? 0} recharges`}
                  icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
                />

                <StatCard
                  label="Wallet In use"
                  value={activeWalletsCount}
                  description="Active wallets"
                  icon={<CreditCard className="h-5 w-5 text-sky-600" />}
                />

                {isCounterAdmin ? (
                  <StatCard
                    label="Remaining Balance"
                    value={formatCurrency(remainingWalletsBalance)}
                    description="Money in wallets"
                    icon={<DollarSign className="h-5 w-5 text-amber-600" />}
                  />
                ) : (
                  <StatCard
                    label="Active Staff Members"
                    value={staffList.filter((s) => s.status === 'ACTIVE').length}
                    description="Assigned staff"
                    icon={<Users className="h-5 w-5 text-indigo-600" />}
                  />
                )}

                {!isCounterAdmin ? (
                  <StatCard
                    label="Blocked Wallets"
                    value={blockedWalletsCount}
                    description="Security locked"
                    icon={<ShieldAlert className="h-5 w-5 text-rose-600" />}
                  />
                ) : (
                  <StatCard
                    label="Cancelled Recharged"
                    value={formatCurrency(analytics?.cancelledTopUps ?? 0)}
                    description={`${analytics?.cancelledTopUpsCount ?? 0} cancelled`}
                    icon={<RotateCcw className="h-5 w-5 text-rose-600" />}
                  />
                )}

                <StatCard
                  label="Refunds"
                  value={formatCurrency(analytics?.totalRefundVolume ?? analytics?.moneyRefunded ?? analytics?.refundVolume ?? 0)}
                  description={`${analytics?.refundCount ?? 0} refunds`}
                  icon={<RefreshCw className="h-5 w-5 text-slate-600" />}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
