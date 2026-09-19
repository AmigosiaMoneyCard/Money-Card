import { formatCurrency, formatDate } from '@/utils';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiService } from '@/services/api';
import { usePermissions } from '@/hooks';
import { SessionsPage } from '@/features/sessions';
import type {
  Card as CardEntity,
  Branch,
} from '@/types';
import {
  Button,
  Badge,
  Modal,
  ModalFooter,
  LoadingState,
  EmptyState,
  ErrorState,
} from '@/components/ui';
import { UnauthorizedPage } from '@/features/auth';
import {
  CreditCard,
  Search,
  RefreshCw,
  CheckCircle2,
  ShieldAlert,
  X,
  Building2,
  History,
  BarChart2,
  Wallet,
  ShoppingBag,
  DollarSign,
} from 'lucide-react';

export function CardsPage() {
  const { hasPermission } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();

  const topTab = searchParams.get('tab') === 'history' ? 'history' : 'cards';

  const handleTopTabChange = (tab: 'cards' | 'history') => {
    const next = new URLSearchParams(searchParams);
    if (tab === 'history') {
      next.set('tab', 'history');
    } else {
      next.delete('tab');
    }
    setSearchParams(next);
  };

  const canView = hasPermission('CARD_VIEW');

  const [allCards, setAllCards] = useState<CardEntity[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── Counter Pattern & Modal States ──────────────────────────────
  const [counterSearchQuery, setCounterSearchQuery] = useState('');
  const [selectedBranchForDetails, setSelectedBranchForDetails] = useState<Branch | { id: string; name: string } | null>(null);
  const [selectedBranchForAnalytics, setSelectedBranchForAnalytics] = useState<Branch | { id: string; name: string } | null>(null);
  const [modalSearchQuery, setModalSearchQuery] = useState('');

  // Analytics Custom Range Date States (Strictly Custom Range)
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [appliedStartDate, setAppliedStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [appliedEndDate, setAppliedEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [counterAnalyticsData, setCounterAnalyticsData] = useState<any>(null);
  const [isLoadingCounterAnalytics, setIsLoadingCounterAnalytics] = useState(false);
  const [counterRecentActivities, setCounterRecentActivities] = useState<any[]>([]);

  const fetchCounterAnalytics = useCallback(async (branchId: string, start: string, end: string) => {
    setIsLoadingCounterAnalytics(true);
    try {
      const [res, sessionsRes] = await Promise.all([
        branchId === '__unassigned__'
          ? apiService.analytics.getOverview({ startDate: start, endDate: end })
          : apiService.analytics.getOverview({ branchId, startDate: start, endDate: end }),
        branchId === '__unassigned__'
          ? apiService.sessions.getSessions({ limit: 15 })
          : apiService.sessions.getSessions({ branchId, limit: 15 }),
      ]);

      if (res.success) {
        setCounterAnalyticsData(res.data);
      } else {
        setCounterAnalyticsData(null);
      }

      if (sessionsRes.success) {
        const sData = Array.isArray(sessionsRes.data)
          ? sessionsRes.data
          : (sessionsRes.data?.items || []);
        setCounterRecentActivities(sData);
      } else {
        setCounterRecentActivities([]);
      }
    } catch {
      setCounterAnalyticsData(null);
      setCounterRecentActivities([]);
    } finally {
      setIsLoadingCounterAnalytics(false);
    }
  }, []);

  const handleOpenAnalytics = useCallback((branch: Branch | { id: string; name: string }) => {
    setSelectedBranchForAnalytics(branch);
    fetchCounterAnalytics(branch.id, appliedStartDate, appliedEndDate);
  }, [fetchCounterAnalytics, appliedStartDate, appliedEndDate]);

  const handleApplyCustomDates = useCallback(() => {
    if (!selectedBranchForAnalytics) return;
    setAppliedStartDate(customStartDate);
    setAppliedEndDate(customEndDate);
    fetchCounterAnalytics(selectedBranchForAnalytics.id, customStartDate, customEndDate);
  }, [selectedBranchForAnalytics, customStartDate, customEndDate, fetchCounterAnalytics]);

  // ─── Fetch Cards Data ─────────────────────────────────────────────
  const fetchCardsData = useCallback(async () => {
    setError(null);
    try {
      const [cardsRes, branchesRes] = await Promise.all([
        apiService.cards.getCards({ limit: 1000 }),
        apiService.branches.getBranches(),
      ]);

      if (!cardsRes.success) {
        setError(cardsRes.error.message || 'Failed to load card list');
        return;
      }

      const items = Array.isArray(cardsRes.data) ? cardsRes.data : (cardsRes.data?.items || []);
      setAllCards(items);
      if (branchesRes.success) {
        const bItems = Array.isArray(branchesRes.data) ? branchesRes.data : (branchesRes.data?.items || []);
        setBranches(bItems);
      }
    } catch {
      setError('Unable to connect to the server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCardsData();
  }, [fetchCardsData]);

  // ─── Filtered Counters ───────────────────────────────────────────
  const filteredBranches = useMemo(() => {
    if (!counterSearchQuery.trim()) return branches;
    const q = counterSearchQuery.toLowerCase().trim();
    return branches.filter((b) => b.name.toLowerCase().includes(q));
  }, [branches, counterSearchQuery]);

  const unassignedCards = useMemo(() => {
    return allCards.filter((c) => !c.currentBranchId);
  }, [allCards]);

  const getBranchCards = useCallback((branchId: string) => {
    if (branchId === '__unassigned__') {
      return allCards.filter((c) => !c.currentBranchId);
    }
    return allCards.filter((c) => c.currentBranchId === branchId);
  }, [allCards]);

  const branchCardsForDetails = useMemo(() => {
    if (!selectedBranchForDetails) return [];
    const cards = getBranchCards(selectedBranchForDetails.id);
    if (!modalSearchQuery.trim()) return cards;
    const q = modalSearchQuery.toLowerCase().trim();
    return cards.filter((c) => {
      const couponId = (c.physicalCardNumber || c.qrToken || '').toLowerCase();
      const customer = (c.activeSession?.customerName || '').toLowerCase();
      const phone = (c.activeSession?.customerPhone || '').toLowerCase();
      return couponId.includes(q) || customer.includes(q) || phone.includes(q);
    });
  }, [selectedBranchForDetails, getBranchCards, modalSearchQuery]);

  if (!canView) {
    return <UnauthorizedPage />;
  }

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-10">
      {/* ─── Minimal Header matching Menu page pattern ─── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <CreditCard className="h-6 w-6 text-emerald-600" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Cards & Customer History</h1>
          </div>
        </div>

        {topTab === 'cards' && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 px-3 rounded-xl border-slate-200 text-slate-700 hover:border-emerald-500 font-medium cursor-pointer"
              onClick={fetchCardsData}
              leftIcon={<RefreshCw className="h-3.5 w-3.5 text-slate-500" />}
            >
              Refresh
            </Button>
          </div>
        )}
      </div>

      {/* ─── Top Tabs: Cards Directory & Customer History ─────────────── */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/60 self-start">
        <button
          type="button"
          onClick={() => handleTopTabChange('cards')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            topTab === 'cards'
              ? 'bg-white text-slate-900 shadow-2xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CreditCard className="h-3.5 w-3.5" />
          <span>Cards Directory</span>
          <span className="ml-1 rounded-full bg-slate-200/80 px-1.5 py-0.2 text-[10px] text-slate-700 font-bold">
            {allCards.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTopTabChange('history')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            topTab === 'history'
              ? 'bg-white text-slate-900 shadow-2xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <History className="h-3.5 w-3.5" />
          <span>Customer History</span>
        </button>
      </div>

      {topTab === 'history' ? (
        <SessionsPage hideHeader />
      ) : (
        <>
          {/* ─── ONLY Search Bar: Search by counter name ─────────────────── */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by counter name..."
              value={counterSearchQuery}
              onChange={(e) => setCounterSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-8 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
            />
            {counterSearchQuery && (
              <button
                type="button"
                onClick={() => setCounterSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* ─── Counter-Wise Table ─────────────────────────────────────── */}
          {error ? (
            <div className="py-12 bg-white rounded-2xl border border-rose-200">
              <ErrorState message={error} onRetry={fetchCardsData} />
            </div>
          ) : isLoading ? (
            <div className="py-12 bg-white rounded-2xl border border-slate-200/80">
              <LoadingState message="Loading cafeteria counters..." />
            </div>
          ) : filteredBranches.length === 0 && unassignedCards.length === 0 ? (
            <div className="py-12 bg-white rounded-2xl border border-slate-200/80">
              <EmptyState
                title={counterSearchQuery ? 'No matching counters' : 'No counters found'}
                description={
                  counterSearchQuery
                    ? 'Try adjusting your search query.'
                    : 'Counters configured in your organization will appear here.'
                }
              />
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4 min-w-[220px]">Counter Name</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBranches.map((branch) => {
                      const count = getBranchCards(branch.id).length;
                      return (
                        <tr key={branch.id} className="hover:bg-slate-50/60 transition-colors">
                          {/* Counter Name */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                                <Building2 className="h-4 w-4" />
                              </div>
                              <span className="font-semibold text-sm text-slate-900">
                                {branch.name}
                              </span>
                            </div>
                          </td>

                          {/* Far Right Action Buttons */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenAnalytics(branch)}
                                className="text-xs h-8 px-3 rounded-lg border-slate-200 text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 font-medium cursor-pointer"
                                leftIcon={<BarChart2 className="h-3.5 w-3.5 text-emerald-600" />}
                              >
                                Card Analytics
                              </Button>

                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => {
                                  setSelectedBranchForDetails(branch);
                                  setModalSearchQuery('');
                                }}
                                className="text-xs h-8 px-3.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer"
                                leftIcon={<CreditCard className="h-3.5 w-3.5" />}
                              >
                                Card Details ({count})
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Unassigned / General Pool row if cards exist */}
                    {unassignedCards.length > 0 && (!counterSearchQuery || 'general pool unassigned'.includes(counterSearchQuery.toLowerCase())) && (
                      <tr className="hover:bg-slate-50/60 transition-colors bg-slate-50/30">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                              <CreditCard className="h-4 w-4" />
                            </div>
                            <div>
                              <span className="font-semibold text-sm text-slate-900">
                                General Pool / Unassigned Cards
                              </span>
                              <span className="ml-2 text-[11px] text-slate-400 font-normal">
                                (Not tied to a specific counter)
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenAnalytics({ id: '__unassigned__', name: 'General Pool / Unassigned' })}
                              className="text-xs h-8 px-3 rounded-lg border-slate-200 text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 font-medium cursor-pointer"
                              leftIcon={<BarChart2 className="h-3.5 w-3.5 text-emerald-600" />}
                            >
                              Card Analytics
                            </Button>

                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => {
                                setSelectedBranchForDetails({ id: '__unassigned__', name: 'General Pool / Unassigned' });
                                setModalSearchQuery('');
                              }}
                              className="text-xs h-8 px-3.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer"
                              leftIcon={<CreditCard className="h-3.5 w-3.5" />}
                            >
                              Card Details ({unassignedCards.length})
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─── MODAL 1: Card Details Modal (NO Card QR, Strict 3 Columns) ─ */}
          {selectedBranchForDetails && (
            <Modal
              isOpen={!!selectedBranchForDetails}
              onClose={() => setSelectedBranchForDetails(null)}
              title={`Card Details — ${selectedBranchForDetails.name}`}
              size="lg"
            >
              <div className="space-y-4">
                {/* Search Bar inside Details Modal */}
                <div className="flex items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search by coupon ID or customer name..."
                      value={modalSearchQuery}
                      onChange={(e) => setModalSearchQuery(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                  <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 font-semibold text-xs px-2.5 py-0.5">
                    {branchCardsForDetails.length} Cards
                  </Badge>
                </div>

                {branchCardsForDetails.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500 border border-slate-200 rounded-xl bg-slate-50/50">
                    <p className="font-semibold text-slate-700">No cards found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {modalSearchQuery ? 'No cards match your search.' : 'No cards have been registered for this counter yet.'}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs max-h-[60vh] overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500 sticky top-0">
                        <tr>
                          <th className="py-2.5 px-4">Coupon ID</th>
                          <th className="py-2.5 px-4">Status</th>
                          <th className="py-2.5 px-4">Current User & Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {branchCardsForDetails.map((card) => {
                          const couponId = `#${card.physicalCardNumber || card.qrToken}`;
                          return (
                            <tr key={card.id} className="hover:bg-slate-50/70 transition-colors">
                              {/* 1. Coupon ID */}
                              <td className="py-3 px-4 font-mono font-bold text-slate-900 text-xs">
                                {couponId}
                              </td>

                              {/* 2. Status */}
                              <td className="py-3 px-4">
                                {card.status === 'BLOCKED' ? (
                                  <Badge variant="danger">Blocked</Badge>
                                ) : card.status === 'ACTIVE' ? (
                                  <Badge variant="success" className="gap-1 font-semibold text-xs">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Active
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="border-sky-300 bg-sky-50 text-sky-700">
                                    Available
                                  </Badge>
                                )}
                              </td>

                              {/* 3. Current User & Balance */}
                              <td className="py-3 px-4">
                                {card.activeSession ? (
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-slate-800">
                                      {card.activeSession.customerName || 'Walk-in Customer'}
                                    </span>
                                    <span className="text-slate-400">—</span>
                                    <span className="font-mono font-bold text-emerald-600">
                                      {formatCurrency(card.activeSession.balance)}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 font-medium">— (Ready)</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <ModalFooter>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedBranchForDetails(null)}
                  className="text-xs px-4 cursor-pointer"
                >
                  Close
                </Button>
              </ModalFooter>
            </Modal>
          )}

          {/* ─── MODAL 2: Card Analytics Modal (Strictly Custom Range & 7 Easy Metrics) ─ */}
          {selectedBranchForAnalytics && (
            <Modal
              isOpen={!!selectedBranchForAnalytics}
              onClose={() => setSelectedBranchForAnalytics(null)}
              title={`Card Analytics — ${selectedBranchForAnalytics.name}`}
              size="lg"
            >
              <div className="space-y-4">
                {/* Strictly Custom Date Range Filtering */}
                <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-xs font-semibold text-slate-700">Date Range:</span>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
                      <span className="text-slate-400 text-[11px] font-medium">From</span>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="text-xs font-medium text-slate-800 border-none outline-none bg-transparent cursor-pointer"
                      />
                    </div>
                    <span className="text-slate-400 text-xs">to</span>
                    <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
                      <span className="text-slate-400 text-[11px] font-medium">To</span>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="text-xs font-medium text-slate-800 border-none outline-none bg-transparent cursor-pointer"
                      />
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleApplyCustomDates}
                    className="text-xs h-7 px-3 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer rounded-lg"
                  >
                    Apply
                  </Button>
                </div>

                {isLoadingCounterAnalytics ? (
                  <div className="py-10">
                    <LoadingState message="Loading card analytics..." />
                  </div>
                ) : (
                  <>
                    {/* 7 Simplified Metrics Grid (NO Avg. Balance) */}
                    {(() => {
                      const branchCards = getBranchCards(selectedBranchForAnalytics.id);
                      const activeCards = branchCards.filter((c) => c.status === 'ACTIVE').length;
                      const readyCards = branchCards.filter((c) => c.status === 'AVAILABLE').length;
                      const blockedCards = branchCards.filter((c) => c.status === 'BLOCKED').length;

                      const totalBalance = branchCards.reduce(
                        (acc, c) => acc + (c.activeSession?.balance || 0),
                        0
                      );

                      const moneyAdded = counterAnalyticsData?.rechargeVolume ?? 0;
                      const rechargeOrders = counterAnalyticsData?.rechargeCount ?? 0;
                      const foodSales = counterAnalyticsData?.salesVolume ?? 0;
                      const salesOrders = counterAnalyticsData?.salesCount ?? 0;
                      const totalRefunds = counterAnalyticsData?.refundVolume ?? 0;
                      const refundOrders = counterAnalyticsData?.refundCount ?? 0;

                      return (
                        <div className="space-y-3">
                          {/* Row 1: 4 Financial Metrics */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {/* 1. Cards in Use */}
                            <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-500">Cards in Use</span>
                                <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                                  <CreditCard className="h-3.5 w-3.5" />
                                </div>
                              </div>
                              <p className="mt-1.5 text-xl font-bold text-slate-900">{activeCards}</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">Active cards</p>
                            </div>

                            {/* 2. Money Added */}
                            <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-500">Money Added</span>
                                <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                                  <Wallet className="h-3.5 w-3.5" />
                                </div>
                              </div>
                              <p className="mt-1.5 text-xl font-bold text-slate-900">{formatCurrency(moneyAdded)}</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">{rechargeOrders} recharges</p>
                            </div>

                            {/* 3. Food Sales */}
                            <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-500">Food Sales</span>
                                <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                                  <ShoppingBag className="h-3.5 w-3.5" />
                                </div>
                              </div>
                              <p className="mt-1.5 text-xl font-bold text-slate-900">{formatCurrency(foodSales)}</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">{salesOrders} orders</p>
                            </div>

                            {/* 4. Remaining Balance */}
                            <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-500">Remaining Balance</span>
                                <div className="h-7 w-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                                  <DollarSign className="h-3.5 w-3.5" />
                                </div>
                              </div>
                              <p className="mt-1.5 text-xl font-bold text-slate-900">{formatCurrency(totalBalance)}</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">Money on cards</p>
                            </div>
                          </div>

                          {/* Row 2: 3 Operational Metrics */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {/* 5. Ready Cards */}
                            <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-500">Ready Cards</span>
                                <div className="h-7 w-7 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                </div>
                              </div>
                              <p className="mt-1.5 text-xl font-bold text-slate-900">{readyCards}</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">Ready to issue</p>
                            </div>

                            {/* 6. Blocked Cards */}
                            <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-500">Blocked Cards</span>
                                <div className="h-7 w-7 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
                                  <ShieldAlert className="h-3.5 w-3.5" />
                                </div>
                              </div>
                              <p className="mt-1.5 text-xl font-bold text-slate-900">{blockedCards}</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">Security locked</p>
                            </div>

                            {/* 7. Refunds */}
                            <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-500">Refunds</span>
                                <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                                  <RefreshCw className="h-3.5 w-3.5" />
                                </div>
                              </div>
                              <p className="mt-1.5 text-xl font-bold text-slate-900">{formatCurrency(totalRefunds)}</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">{refundOrders} refunds</p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Recent Activity Table */}
                    <div className="space-y-2 pt-1">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Recent Activity</h4>
                      {counterRecentActivities.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400 border border-slate-200 rounded-xl bg-slate-50/50">
                          No card activity recorded for this counter in selected date range.
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                              <tr>
                                <th className="py-2.5 px-3">Coupon ID</th>
                                <th className="py-2.5 px-3">Customer</th>
                                <th className="py-2.5 px-3">Action</th>
                                <th className="py-2.5 px-3 text-right">Amount</th>
                                <th className="py-2.5 px-3 text-right">Date</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {counterRecentActivities.map((item: any) => (
                                <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                                    #{item.sessionCardNumber || item.card?.physicalCardNumber || item.card?.qrToken || 'CPN'}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-700">
                                    {item.customerName || 'Walk-in Customer'}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                                      {item.status === 'ACTIVE' ? 'Active Session' : 'Completed Cycle'}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">
                                    {formatCurrency(item.balance ?? 0)}
                                  </td>
                                  <td className="py-2.5 px-3 text-right text-slate-500">
                                    {formatDate(item.createdAt || item.startedAt)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
              <ModalFooter>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedBranchForAnalytics(null)}
                  className="text-xs px-4 cursor-pointer"
                >
                  Close
                </Button>
              </ModalFooter>
            </Modal>
          )}
        </>
      )}
    </div>
  );
}
