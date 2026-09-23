import { formatCurrency, formatDate, extractTransactionItems, formatLocalDate } from '@/utils';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiService } from '@/services/api';
import { usePermissions, useAuth, useBranch } from '@/hooks';
import type {
  Card as CardEntity,
  Branch,
  Transaction,
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
  X,
  Building2,
  History,
  BarChart2,
} from 'lucide-react';

function getTransactionTitle(tx: Transaction): string {
  const isRecharge = tx.type === 'RECHARGE' || String(tx.type).startsWith('RECHARGE');
  const isRefund = tx.type === 'REFUND' || String(tx.type).startsWith('REFUND');
  const isPurchase = tx.type === 'PURCHASE';

  if (isPurchase) {
    const items = extractTransactionItems(tx.items);
    return items.length > 0
      ? items.map((i) => `${i.quantity}× ${i.name}`).join(', ')
      : 'POS Purchase';
  }
  if (isRecharge) {
    if (tx.type === 'RECHARGE_UPI') return 'Wallet Recharge (UPI)';
    if (tx.type === 'RECHARGE_CASH') return 'Wallet Recharge (Cash)';
    return 'Wallet Recharge';
  }
  if (isRefund) {
    return 'Settlement Refund';
  }
  return 'Transaction';
}

export function CounterStaffCardsView() {
  const { user } = useAuth();
  const { currentBranch } = useBranch();
  const staffBranchId = user?.assignedBranchIds?.[0] || currentBranch?.id;

  const { hasPermission } = usePermissions();
  const canView = hasPermission('CARD_VIEW');

  const [allCards, setAllCards] = useState<CardEntity[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── Search & Validation States ──────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);

  // ─── Modal Selection States ──────────────────────────────────────
  const [selectedCardForDetails, setSelectedCardForDetails] = useState<CardEntity | null>(null);
  const [selectedCardForAnalytics, setSelectedCardForAnalytics] = useState<CardEntity | null>(null);

  // Detail transactions for selected card
  const [sessionTxns, setSessionTxns] = useState<Transaction[]>([]);
  const [isLoadingTxns, setIsLoadingTxns] = useState(false);

  // Analytics Custom Range Date States (Strictly Custom Range, Default: Today)
  const [customStartDate, setCustomStartDate] = useState(() => formatLocalDate(new Date()));
  const [customEndDate, setCustomEndDate] = useState(() => formatLocalDate(new Date()));
  const [appliedStartDate, setAppliedStartDate] = useState(() => formatLocalDate(new Date()));
  const [appliedEndDate, setAppliedEndDate] = useState(() => formatLocalDate(new Date()));
  const [counterAnalyticsData, setCounterAnalyticsData] = useState<any>(null);
  const [isLoadingCounterAnalytics, setIsLoadingCounterAnalytics] = useState(false);

  // ─── Search Input Handler with Validation ────────────────────────
  const handleSearchChange = (val: string) => {
    if (val.length > 40) {
      setSearchError('Maximum 40 characters allowed.');
      return;
    }
    const isValid = /^[a-zA-Z0-9\s\-_]*$/.test(val);
    if (!isValid) {
      setSearchError('Only letters, numbers, spaces, and hyphens are allowed.');
    } else {
      setSearchError(null);
    }
    setSearchQuery(val);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchError(null);
  };

  // ─── Branch / Counter Lookup Helper ──────────────────────────────
  const getBranchName = useCallback((branchId?: string | null) => {
    if (!branchId) return 'Main Counter';
    const found = branches.find((b) => b.id === branchId);
    return found?.name || 'Counter';
  }, [branches]);

  // ─── Fetch Cards & Branches ──────────────────────────────────────
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

  // ─── Live Active Cards Filtering (Scoped to Counter Staff Branch) ─
  const liveCards = useMemo(() => {
    return allCards.filter((c) => {
      const isActive = c.status === 'ACTIVE' || Boolean(c.activeSession);
      if (!isActive) return false;
      if (staffBranchId) {
        return c.activeSession?.branchId === staffBranchId || c.currentBranchId === staffBranchId;
      }
      return true;
    });
  }, [allCards, staffBranchId]);

  const filteredLiveCards = useMemo(() => {
    if (!searchQuery.trim()) return liveCards;
    const sanitized = searchQuery.replace(/[^a-zA-Z0-9\s\-_]/g, '').toLowerCase().trim();
    if (!sanitized) return liveCards;

    return liveCards.filter((c) => {
      const couponId = (c.physicalCardNumber || c.qrToken || '').toLowerCase();
      const customer = (c.activeSession?.customerName || '').toLowerCase();
      const phone = (c.activeSession?.customerPhone || '').toLowerCase();
      return couponId.includes(sanitized) || customer.includes(sanitized) || phone.includes(sanitized);
    });
  }, [liveCards, searchQuery]);

  // ─── Fetch Analytics ─────────────────────────────────────────────
  const fetchCounterAnalytics = useCallback(async (branchId: string, start: string, end: string) => {
    setIsLoadingCounterAnalytics(true);
    try {
      const res = await apiService.analytics.getOverview({ branchId, startDate: start, endDate: end });
      if (res.success) {
        setCounterAnalyticsData(res.data);
      } else {
        setCounterAnalyticsData(null);
      }
    } catch {
      setCounterAnalyticsData(null);
    } finally {
      setIsLoadingCounterAnalytics(false);
    }
  }, []);

  const handleOpenAnalytics = useCallback((card: CardEntity) => {
    setSelectedCardForAnalytics(card);
    const branchId = card.activeSession?.branchId || card.currentBranchId || branches[0]?.id;
    if (branchId) {
      fetchCounterAnalytics(branchId, appliedStartDate, appliedEndDate);
    }
  }, [fetchCounterAnalytics, appliedStartDate, appliedEndDate, branches]);

  const handleApplyCustomDates = useCallback(() => {
    if (!selectedCardForAnalytics) return;
    const branchId = selectedCardForAnalytics.activeSession?.branchId || selectedCardForAnalytics.currentBranchId || branches[0]?.id;
    if (branchId) {
      setAppliedStartDate(customStartDate);
      setAppliedEndDate(customEndDate);
      fetchCounterAnalytics(branchId, customStartDate, customEndDate);
    }
  }, [selectedCardForAnalytics, customStartDate, customEndDate, fetchCounterAnalytics, branches]);

  const handleResetToToday = useCallback(() => {
    const today = formatLocalDate(new Date());
    setCustomStartDate(today);
    setCustomEndDate(today);
    setAppliedStartDate(today);
    setAppliedEndDate(today);
    if (selectedCardForAnalytics) {
      const branchId = selectedCardForAnalytics.activeSession?.branchId || selectedCardForAnalytics.currentBranchId || branches[0]?.id;
      if (branchId) {
        fetchCounterAnalytics(branchId, today, today);
      }
    }
  }, [selectedCardForAnalytics, fetchCounterAnalytics, branches]);

  // ─── Open Card Details Modal (with Counter & Active Since) ──────
  const handleOpenCardDetails = useCallback(async (card: CardEntity) => {
    setSelectedCardForDetails(card);
    setIsLoadingTxns(true);
    setSessionTxns([]);
    const sessionId = card.activeSession?.id;
    if (sessionId) {
      try {
        const res = await apiService.sessions.getSessionTransactions(sessionId);
        if (res.success) {
          const txns = Array.isArray(res.data) ? res.data : ((res.data as any)?.items || []);
          setSessionTxns(txns);
        }
      } catch {
        setSessionTxns([]);
      } finally {
        setIsLoadingTxns(false);
      }
    } else {
      setIsLoadingTxns(false);
    }
  }, []);

  if (!canView) {
    return <UnauthorizedPage />;
  }

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-10">
      {/* ─── Header ─── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-2.5">
          <CreditCard className="h-6 w-6 text-emerald-600" />
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Cards & Customer History</h1>
          <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 font-semibold text-xs px-2.5 py-0.5">
            {liveCards.length} Live Active
          </Badge>
        </div>

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
      </div>

      {/* ─── Search Bar with Validation ─────────────────── */}
      <div className="flex flex-col gap-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by card # or coupon ID..."
            value={searchQuery}
            maxLength={40}
            onChange={(e) => handleSearchChange(e.target.value)}
            className={`w-full rounded-xl border bg-white pl-9 pr-16 py-2 text-xs text-slate-900 placeholder-slate-400 transition-colors focus:outline-none ${
              searchError
                ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                : 'border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20'
            }`}
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="text-slate-400 hover:text-slate-600 p-0.5 transition-colors cursor-pointer"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <span className="text-[10px] font-mono text-slate-400 border-l border-slate-200 pl-1.5">
              {searchQuery.length}/40
            </span>
          </div>
        </div>
        {searchError && (
          <p className="text-[11px] text-rose-500 font-medium pl-1 flex items-center gap-1">
            <span>⚠️</span> {searchError}
          </p>
        )}
      </div>

      {/* ─── Streamlined Live Active Cards Table (3 Columns) ───────── */}
      {error ? (
        <div className="py-12 bg-white rounded-2xl border border-rose-200">
          <ErrorState message={error} onRetry={fetchCardsData} />
        </div>
      ) : isLoading ? (
        <div className="py-12 bg-white rounded-2xl border border-slate-200/80">
          <LoadingState message="Loading live active cards..." />
        </div>
      ) : filteredLiveCards.length === 0 ? (
        <div className="py-12 bg-white rounded-2xl border border-slate-200/80">
          <EmptyState
            title={searchQuery ? 'No matching live cards' : 'No Live Active Cards'}
            description={
              searchQuery
                ? `No live active cards found matching "${searchQuery}".`
                : 'There are currently no cards in an active customer session. Live cards will appear here as soon as they are issued to customers.'
            }
          />
          {searchQuery && (
            <div className="text-center mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearSearch}
                className="text-xs px-3"
              >
                Clear Search
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Coupon / Card ID</th>
                  <th className="py-3 px-4">Live Balance</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLiveCards.map((card) => {
                  const couponId = card.physicalCardNumber || card.qrToken;
                  const balance = card.activeSession?.balance ?? 0;

                  return (
                    <tr key={card.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* 1. Coupon / Card ID (Clean display without Live Session badge) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                            <CreditCard className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="font-mono font-bold text-sm text-slate-900 block leading-tight">
                              {couponId}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 2. Live Balance */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono font-bold text-sm text-emerald-600 block">
                          {formatCurrency(balance)}
                        </span>
                      </td>

                      {/* 3. Actions: Card Analytics | Card Details */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenAnalytics(card)}
                            className="text-xs h-8 px-3 rounded-lg border-slate-200 text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 font-medium cursor-pointer"
                            leftIcon={<BarChart2 className="h-3.5 w-3.5 text-emerald-600" />}
                          >
                            Card Analytics
                          </Button>

                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleOpenCardDetails(card)}
                            className="text-xs h-8 px-3.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer shadow-2xs"
                            leftIcon={<CreditCard className="h-3.5 w-3.5" />}
                          >
                            Card Details
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── MODAL 1: Card Details Modal (Contains Customer, Counter & Active Since) ─ */}
      {selectedCardForDetails && (
        <Modal
          isOpen={!!selectedCardForDetails}
          onClose={() => setSelectedCardForDetails(null)}
          title={`Card Details — Coupon ${selectedCardForDetails.physicalCardNumber || selectedCardForDetails.qrToken || ''}`}
          size="lg"
        >
          <div className="space-y-4">
            {/* Customer & Balance Summary Banner */}
            <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 p-4">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Current Customer</p>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedCardForDetails.activeSession?.customerName || 'Walk-in Customer'}
                </h3>
                {selectedCardForDetails.activeSession?.customerPhone && (
                  <p className="text-xs text-slate-500 mt-0.5">{selectedCardForDetails.activeSession.customerPhone}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-500 uppercase">Live Session Balance</p>
                <p className="text-xl font-bold font-mono text-emerald-600">
                  {formatCurrency(selectedCardForDetails.activeSession?.balance ?? 0)}
                </p>
                <Badge variant="success" className="gap-1 font-semibold text-xs mt-0.5">
                  <CheckCircle2 className="h-3 w-3" />
                  Active Session
                </Badge>
              </div>
            </div>

            {/* Counter Location & Active Since Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                  <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="font-semibold uppercase text-[11px]">Counter Location</span>
                </div>
                <span className="font-bold text-slate-900 text-sm block">
                  {getBranchName(selectedCardForDetails.activeSession?.branchId || selectedCardForDetails.currentBranchId)}
                </span>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                  <History className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="font-semibold uppercase text-[11px]">Active Since</span>
                </div>
                <span className="font-semibold text-slate-900 block">
                  {selectedCardForDetails.activeSession?.issuedAt
                    ? formatDate(selectedCardForDetails.activeSession.issuedAt)
                    : 'Current Active Session'}
                </span>
              </div>
            </div>

            {/* Transactions Breakdown */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Order & Recharge Breakdown ({sessionTxns.length})
              </h4>
              {isLoadingTxns ? (
                <div className="py-6">
                  <LoadingState message="Loading order items..." />
                </div>
              ) : sessionTxns.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 border border-slate-200 rounded-xl bg-slate-50/50">
                  No transaction items recorded for this session.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden max-h-52 overflow-y-auto">
                  {sessionTxns.map((tx) => (
                    <div key={tx.id} className="p-3 flex items-center justify-between text-xs bg-white hover:bg-slate-50/60">
                      <div>
                        <p className="font-semibold text-slate-900">{getTransactionTitle(tx)}</p>
                        <p className="text-[11px] text-slate-400">{formatDate(tx.createdAt)}</p>
                      </div>
                      <span className={`font-mono font-bold text-sm ${tx.type === 'PURCHASE' ? 'text-slate-900' : 'text-emerald-600'}`}>
                        {tx.type === 'PURCHASE' ? '-' : '+'}{formatCurrency(tx.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <ModalFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedCardForDetails(null)}
              className="text-xs px-4 cursor-pointer"
            >
              Close
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {/* ─── MODAL 2: Card Analytics Modal (Simplified Metrics) ─────── */}
      {selectedCardForAnalytics && (
        <Modal
          isOpen={!!selectedCardForAnalytics}
          onClose={() => setSelectedCardForAnalytics(null)}
          title={`Card Analytics — Coupon ${selectedCardForAnalytics.physicalCardNumber || selectedCardForAnalytics.qrToken || ''} (${getBranchName(selectedCardForAnalytics.activeSession?.branchId || selectedCardForAnalytics.currentBranchId)})`}
          size="2xl"
        >
          <div className="space-y-5">
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
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetToToday}
                className="text-xs h-7 px-3 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold cursor-pointer rounded-lg"
              >
                Reset to Today
              </Button>
            </div>

            {isLoadingCounterAnalytics ? (
              <div className="py-10">
                <LoadingState message="Loading card analytics..." />
              </div>
            ) : (
              (() => {
                const moneyAdded = counterAnalyticsData?.rechargeVolume ?? 0;
                const rechargeOrders = counterAnalyticsData?.rechargeCount ?? 0;
                const foodSales = counterAnalyticsData?.salesVolume ?? 0;
                const salesOrders = counterAnalyticsData?.salesCount ?? 0;
                const totalRefunds = counterAnalyticsData?.refundVolume ?? 0;
                const refundOrders = counterAnalyticsData?.refundCount ?? 0;

                return (
                  <div className="space-y-4">
                    {/* Financial Summary with Simplified Cafeteria Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                      <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase">Live Card Balance</span>
                        <p className="text-lg font-bold font-mono text-emerald-600 mt-1">
                          {formatCurrency(selectedCardForAnalytics.activeSession?.balance || 0)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase">Money Added</span>
                        <p className="text-lg font-bold font-mono text-emerald-600 mt-1">
                          {formatCurrency(moneyAdded)}
                        </p>
                        <span className="text-[10px] text-slate-400">{rechargeOrders} Recharges</span>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase">Food Sales</span>
                        <p className="text-lg font-bold font-mono text-slate-900 mt-1">
                          {formatCurrency(foodSales)}
                        </p>
                        <span className="text-[10px] text-slate-400">{salesOrders} Purchases</span>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase">Refunds</span>
                        <p className="text-lg font-bold font-mono text-amber-600 mt-1">
                          {formatCurrency(totalRefunds)}
                        </p>
                        <span className="text-[10px] text-slate-400">{refundOrders} Refunds</span>
                      </div>
                    </div>
                  </div>
                );
              })()
            )}
          </div>

          <ModalFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedCardForAnalytics(null)}
              className="text-xs px-4 cursor-pointer"
            >
              Close
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}
