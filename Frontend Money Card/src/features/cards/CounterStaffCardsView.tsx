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
  X,
  Building2,
  BarChart2,
  ArrowDownLeft,
  ShoppingBag,
  History,
  User,
  Phone,
  Wallet,
  DollarSign,
  ShieldAlert,
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

  // ─── Customer History Modal States (Counter Scoped) ──────────────
  const [isCustomerHistoryOpen, setIsCustomerHistoryOpen] = useState(false);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [counterSessions, setCounterSessions] = useState<any[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  // Detail modal for a single customer session (from History modal)
  const [selectedSessionForDetail, setSelectedSessionForDetail] = useState<any | null>(null);
  const [sessionDetailTxns, setSessionDetailTxns] = useState<Transaction[]>([]);
  const [isLoadingSessionDetailTxns, setIsLoadingSessionDetailTxns] = useState(false);


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
    const branchId = card.activeSession?.branchId || card.currentBranchId || staffBranchId || branches[0]?.id;
    if (branchId) {
      fetchCounterAnalytics(branchId, appliedStartDate, appliedEndDate);
    }
  }, [fetchCounterAnalytics, appliedStartDate, appliedEndDate, branches, staffBranchId]);

  const handleStartDateChange = useCallback((newStart: string) => {
    setCustomStartDate(newStart);
    setAppliedStartDate(newStart);
    let effectiveEnd = customEndDate;
    if (customEndDate && newStart > customEndDate) {
      effectiveEnd = newStart;
      setCustomEndDate(newStart);
      setAppliedEndDate(newStart);
    }
    const branchId = selectedCardForAnalytics
      ? (selectedCardForAnalytics.activeSession?.branchId || selectedCardForAnalytics.currentBranchId || staffBranchId || branches[0]?.id)
      : (staffBranchId || branches[0]?.id);
    if (branchId) {
      fetchCounterAnalytics(branchId, newStart, effectiveEnd);
    }
  }, [selectedCardForAnalytics, staffBranchId, customEndDate, branches, fetchCounterAnalytics]);

  const handleEndDateChange = useCallback((newEnd: string) => {
    setCustomEndDate(newEnd);
    setAppliedEndDate(newEnd);
    let effectiveStart = customStartDate;
    if (customStartDate && newEnd < customStartDate) {
      effectiveStart = newEnd;
      setCustomStartDate(newEnd);
      setAppliedStartDate(newEnd);
    }
    const branchId = selectedCardForAnalytics
      ? (selectedCardForAnalytics.activeSession?.branchId || selectedCardForAnalytics.currentBranchId || staffBranchId || branches[0]?.id)
      : (staffBranchId || branches[0]?.id);
    if (branchId) {
      fetchCounterAnalytics(branchId, effectiveStart, newEnd);
    }
  }, [selectedCardForAnalytics, staffBranchId, customStartDate, branches, fetchCounterAnalytics]);

  const handleResetToToday = useCallback(() => {
    const today = formatLocalDate(new Date());
    setCustomStartDate(today);
    setCustomEndDate(today);
    setAppliedStartDate(today);
    setAppliedEndDate(today);
    const branchId = selectedCardForAnalytics
      ? (selectedCardForAnalytics.activeSession?.branchId || selectedCardForAnalytics.currentBranchId || staffBranchId || branches[0]?.id)
      : (staffBranchId || branches[0]?.id);
    if (branchId) {
      fetchCounterAnalytics(branchId, today, today);
    }
  }, [selectedCardForAnalytics, staffBranchId, fetchCounterAnalytics, branches]);

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

  // ─── Open Customer History (Counter Scoped) ──────────────────────
  const handleOpenCustomerHistory = useCallback(async (card?: CardEntity) => {
    setIsCustomerHistoryOpen(true);
    if (card) {
      setHistorySearchQuery(card.physicalCardNumber || card.qrToken || '');
    } else {
      setHistorySearchQuery('');
    }
    setIsLoadingSessions(true);
    const branchId = staffBranchId || currentBranch?.id || branches[0]?.id;
    try {
      const res = await apiService.sessions.getSessions(branchId ? { branchId, limit: 100 } : { limit: 100 });
      if (res.success) {
        const items = Array.isArray(res.data) ? res.data : ((res.data as any)?.items || []);
        setCounterSessions(items);
      } else {
        setCounterSessions([]);
      }
    } catch {
      setCounterSessions([]);
    } finally {
      setIsLoadingSessions(false);
    }
  }, [staffBranchId, currentBranch, branches]);

  // ─── Open Session Transactions Detail Inspection ──────────────────
  const handleOpenSessionDetail = useCallback(async (session: any) => {
    setSelectedSessionForDetail(session);
    setIsLoadingSessionDetailTxns(true);
    setSessionDetailTxns([]);
    try {
      const res = await apiService.sessions.getSessionTransactions(session.id);
      if (res.success) {
        const txns = Array.isArray(res.data) ? res.data : ((res.data as any)?.items || []);
        setSessionDetailTxns(txns);
      }
    } catch {
      setSessionDetailTxns([]);
    } finally {
      setIsLoadingSessionDetailTxns(false);
    }
  }, []);

  const filteredCounterSessions = useMemo(() => {
    if (!historySearchQuery.trim()) return counterSessions;
    const q = historySearchQuery.toLowerCase().trim();
    return counterSessions.filter((s) => {
      const name = (s.customerName || '').toLowerCase();
      const phone = (s.customerPhone || '').toLowerCase();
      const coupon = (s.sessionCardNumber || s.card?.physicalCardNumber || s.card?.qrToken || '').toLowerCase();
      return name.includes(q) || phone.includes(q) || coupon.includes(q);
    });
  }, [counterSessions, historySearchQuery]);


  if (!canView) {
    return <UnauthorizedPage />;
  }

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-10">
      {/* ─── Header ─── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-2.5">
          <CreditCard className="h-6 w-6 text-emerald-600" />
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Wallets & Customer History</h1>
          <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 font-semibold text-xs px-2.5 py-0.5">
            {liveCards.length} Live Active
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 px-3 rounded-xl border-slate-200 text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 font-medium cursor-pointer"
            onClick={() => handleOpenCustomerHistory()}
            leftIcon={<History className="h-3.5 w-3.5 text-emerald-600" />}
          >
            Customer History
          </Button>

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
            placeholder="Search by wallet ID or customer..."
            value={searchQuery}
            maxLength={40}
            onChange={(e) => handleSearchChange(e.target.value)}
            className={`w-full rounded-xl border bg-white pl-9 pr-8 py-2 text-xs text-slate-900 placeholder-slate-400 transition-colors focus:outline-none ${
              searchError
                ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                : 'border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20'
            }`}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 transition-colors cursor-pointer"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {searchError && (
          <p className="text-[11px] text-rose-500 font-medium pl-1 flex items-center gap-1">
            {searchError}
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
          <LoadingState message="Loading live active wallets..." />
        </div>
      ) : filteredLiveCards.length === 0 ? (
        <div className="py-12 bg-white rounded-2xl border border-slate-200/80">
          <EmptyState
            title={searchQuery ? 'No matching live wallets' : 'No Live Active Wallets'}
            description={
              searchQuery
                ? `No live active wallets found matching "${searchQuery}".`
                : 'There are currently no wallets in an active customer session. Live wallets will appear here as soon as they are issued to customers.'
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
                  <th className="py-3 px-4">Wallet ID</th>
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
                      {/* 1. Wallet ID (Clean display without Live Session badge) */}
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

                      {/* 3. Actions: Customer History | Wallet Analytics | Wallet Details */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenCustomerHistory(card)}
                            className="text-xs h-8 px-3 rounded-lg border-slate-200 text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 font-medium cursor-pointer"
                            leftIcon={<History className="h-3.5 w-3.5 text-emerald-600" />}
                          >
                            Customer History
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenAnalytics(card)}
                            className="text-xs h-8 px-3 rounded-lg border-slate-200 text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 font-medium cursor-pointer"
                            leftIcon={<BarChart2 className="h-3.5 w-3.5 text-emerald-600" />}
                          >
                            Wallet Analytics
                          </Button>

                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleOpenCardDetails(card)}
                            className="text-xs h-8 px-3.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer shadow-2xs"
                            leftIcon={<CreditCard className="h-3.5 w-3.5" />}
                          >
                            Wallet Details
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

      {/* ─── MODAL 1: Wallet Details Modal (Contains Customer, Counter & Active Since) ─ */}
      {selectedCardForDetails && (
        <Modal
          isOpen={!!selectedCardForDetails}
          onClose={() => setSelectedCardForDetails(null)}
          title={`Wallet Details — Wallet ${selectedCardForDetails.physicalCardNumber || selectedCardForDetails.qrToken || ''}`}
          size="lg"
        >
          <div className="space-y-4">
            {/* Unified Session Summary Header */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Customer Profile
                  </span>
                  {selectedCardForDetails.activeSession?.customerName ? (
                    <h3 className="text-base font-bold text-slate-900 leading-tight">
                      {selectedCardForDetails.activeSession.customerName}
                    </h3>
                  ) : null}
                  {selectedCardForDetails.activeSession?.customerPhone && (
                    <p className="text-xs text-slate-500">{selectedCardForDetails.activeSession.customerPhone}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1 font-medium text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200/80 shadow-2xs">
                      <Building2 className="h-3 w-3 text-emerald-600" />
                      {getBranchName(selectedCardForDetails.activeSession?.branchId || selectedCardForDetails.currentBranchId)}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-[11px] text-slate-500">
                      Since {selectedCardForDetails.activeSession?.issuedAt
                        ? formatDate(selectedCardForDetails.activeSession.issuedAt)
                        : 'Active Session'}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Live Balance
                  </span>
                  <div className="text-2xl font-bold font-mono text-emerald-600">
                    {formatCurrency(selectedCardForDetails.activeSession?.balance ?? 0)}
                  </div>
                  <div className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100/70 text-emerald-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active Session
                  </div>
                </div>
              </div>
            </div>

            {/* Activity Breakdown */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between px-0.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Breakdown
                </h4>
                <span className="text-[11px] text-slate-400">
                  {sessionTxns.length} {sessionTxns.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              {isLoadingTxns ? (
                <div className="py-8">
                  <LoadingState message="Loading order items..." />
                </div>
              ) : sessionTxns.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/40">
                  No transaction items recorded for this session.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200/80 bg-white overflow-hidden max-h-56 overflow-y-auto">
                  {sessionTxns.map((tx) => {
                    const isPurchase = tx.type === 'PURCHASE';
                    return (
                      <div
                        key={tx.id}
                        className="p-3 flex items-center justify-between text-xs hover:bg-slate-50/60 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                              isPurchase
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-emerald-50 text-emerald-600'
                            }`}
                          >
                            {isPurchase ? (
                              <ShoppingBag className="h-3.5 w-3.5" />
                            ) : (
                              <ArrowDownLeft className="h-3.5 w-3.5" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 leading-tight">
                              {getTransactionTitle(tx)}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(tx.createdAt)}</p>
                          </div>
                        </div>
                        <span
                          className={`font-mono font-bold text-sm ${
                            isPurchase ? 'text-slate-900' : 'text-emerald-600'
                          }`}
                        >
                          {isPurchase ? '-' : '+'}{formatCurrency(tx.amount)}
                        </span>
                      </div>
                    );
                  })}
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

      {/* ─── MODAL 2: Wallet Analytics Modal (Simplified Metrics) ─────── */}
      {selectedCardForAnalytics && (
        <Modal
          isOpen={!!selectedCardForAnalytics}
          onClose={() => {
            setSelectedCardForAnalytics(null);
          }}
          title={
            selectedCardForAnalytics
              ? `Wallet Analytics — Wallet ${selectedCardForAnalytics.physicalCardNumber || selectedCardForAnalytics.qrToken || ''} (${getBranchName(selectedCardForAnalytics.activeSession?.branchId || selectedCardForAnalytics.currentBranchId)})`
              : `Wallet Analytics — ${getBranchName(staffBranchId)}`
          }
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
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="text-xs font-medium text-slate-800 border-none outline-none bg-transparent cursor-pointer"
                  />
                </div>
                <span className="text-slate-400 text-xs">to</span>
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
                  <span className="text-slate-400 text-[11px] font-medium">To</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    className="text-xs font-medium text-slate-800 border-none outline-none bg-transparent cursor-pointer"
                  />
                </div>
              </div>

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
                <LoadingState message="Loading wallet analytics..." />
              </div>
            ) : (
              (() => {
                const targetBranchId = selectedCardForAnalytics
                  ? (selectedCardForAnalytics.activeSession?.branchId || selectedCardForAnalytics.currentBranchId || staffBranchId)
                  : staffBranchId;

                const bp = counterAnalyticsData?.branchPerformance?.find(
                  (b: any) => b.branchId === targetBranchId,
                );

                const branchCards = allCards.filter((c) => {
                  if (targetBranchId) {
                    return c.activeSession?.branchId === targetBranchId || c.currentBranchId === targetBranchId;
                  }
                  return true;
                });

                const activeCards =
                  bp?.activeSessionsCount ??
                  counterAnalyticsData?.activeSessionsCount ??
                  branchCards.filter((c) => c.status === 'ACTIVE').length;

                const blockedCards =
                  counterAnalyticsData?.blockedCardsCount ??
                  counterAnalyticsData?.cardFleetAnalytics?.blockedCardsCount ??
                  branchCards.filter((c) => c.status === 'BLOCKED').length;

                const totalBalance = selectedCardForAnalytics
                  ? (selectedCardForAnalytics.activeSession?.balance || 0)
                  : branchCards.reduce((acc, c) => acc + (c.activeSession?.balance || 0), 0);

                const moneyAdded =
                  bp?.rechargeVolume ??
                  bp?.moneyAdded ??
                  counterAnalyticsData?.moneyAdded ??
                  counterAnalyticsData?.rechargeVolume ??
                  counterAnalyticsData?.totalRechargeVolume ??
                  0;

                const rechargeOrders =
                  bp?.rechargeCount ??
                  counterAnalyticsData?.rechargeCount ??
                  counterAnalyticsData?.totalRechargeCount ??
                  0;

                const foodSales =
                  bp?.purchaseVolume ??
                  bp?.salesVolume ??
                  counterAnalyticsData?.salesVolume ??
                  counterAnalyticsData?.purchaseVolume ??
                  counterAnalyticsData?.totalPurchaseVolume ??
                  0;

                const salesOrders =
                  bp?.purchaseCount ??
                  bp?.salesCount ??
                  counterAnalyticsData?.salesCount ??
                  counterAnalyticsData?.purchaseCount ??
                  counterAnalyticsData?.foodOrdersCount ??
                  0;

                const totalRefunds =
                  bp?.refundVolume ??
                  bp?.moneyRefunded ??
                  counterAnalyticsData?.refundVolume ??
                  counterAnalyticsData?.moneyRefunded ??
                  counterAnalyticsData?.totalRefundVolume ??
                  0;

                const refundOrders =
                  bp?.refundCount ??
                  counterAnalyticsData?.refundCount ??
                  counterAnalyticsData?.totalRefundCount ??
                  0;

                return (
                  <div className="space-y-4">
                    {/* Row 1: 4 Financial Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                      {/* 1. Wallets in Use */}
                      <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-500">Wallets in Use</span>
                          <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <CreditCard className="h-3.5 w-3.5" />
                          </div>
                        </div>
                        <p className="mt-2 text-2xl font-bold text-slate-900">{activeCards}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Active wallets</p>
                      </div>

                      {/* 2. Money Added */}
                      <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-500">Money Added</span>
                          <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <Wallet className="h-3.5 w-3.5" />
                          </div>
                        </div>
                        <p className="mt-2 text-2xl font-bold text-slate-900">{formatCurrency(moneyAdded)}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{rechargeOrders} recharges</p>
                      </div>

                      {/* 3. Food Sales */}
                      <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-500">Food Sales</span>
                          <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <ShoppingBag className="h-3.5 w-3.5" />
                          </div>
                        </div>
                        <p className="mt-2 text-2xl font-bold text-slate-900">{formatCurrency(foodSales)}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{salesOrders} orders</p>
                      </div>

                      {/* 4. Remaining Balance */}
                      <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-500">Remaining Balance</span>
                          <div className="h-7 w-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                            <DollarSign className="h-3.5 w-3.5" />
                          </div>
                        </div>
                        <p className="mt-2 text-2xl font-bold text-slate-900">{formatCurrency(totalBalance)}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Money in wallets</p>
                      </div>
                    </div>

                    {/* Row 2: 2 Operational Metrics */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {/* Blocked Wallets */}
                      <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-500">Blocked Wallets</span>
                          <div className="h-7 w-7 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
                            <ShieldAlert className="h-3.5 w-3.5" />
                          </div>
                        </div>
                        <p className="mt-2 text-2xl font-bold text-slate-900">{blockedCards}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Security locked</p>
                      </div>

                      {/* Refunds */}
                      <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-500">Refunds</span>
                          <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                            <RefreshCw className="h-3.5 w-3.5" />
                          </div>
                        </div>
                        <p className="mt-2 text-2xl font-bold text-slate-900">{formatCurrency(totalRefunds)}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{refundOrders} refunds</p>
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
              onClick={() => {
                setSelectedCardForAnalytics(null);
              }}
              className="text-xs px-4 cursor-pointer"
            >
              Close
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {/* ─── MODAL 3: Customer History Modal (Counter Scoped) ─────────── */}
      {isCustomerHistoryOpen && (
        <Modal
          isOpen={isCustomerHistoryOpen}
          onClose={() => setIsCustomerHistoryOpen(false)}
          title={`Customer History — ${getBranchName(staffBranchId)}`}
          size="xl"
        >
          <div className="space-y-4">
            {/* Search Bar inside Customer History Modal */}
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by customer, phone, or wallet ID..."
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:outline-none"
                />
                {historySearchQuery && (
                  <button
                    type="button"
                    onClick={() => setHistorySearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    title="Clear search"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 font-semibold text-xs px-2.5 py-0.5">
                {filteredCounterSessions.length} Sessions
              </Badge>
            </div>

            {isLoadingSessions ? (
              <div className="py-10">
                <LoadingState message="Loading customer history..." />
              </div>
            ) : filteredCounterSessions.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 border border-slate-200 rounded-xl bg-slate-50/50">
                <p className="font-semibold text-slate-700">No customer history found</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {historySearchQuery
                    ? 'No sessions match your search criteria.'
                    : 'No customer sessions recorded for this counter yet.'}
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs max-h-[60vh] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-4">Customer</th>
                      <th className="py-2.5 px-4 text-right">Wallet ID</th>
                      <th className="py-2.5 px-4 text-right w-24">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCounterSessions.map((session) => {
                      const couponId =
                        session.sessionCardNumber ||
                        session.card?.physicalCardNumber ||
                        session.card?.qrToken ||
                        '—';

                      return (
                        <tr key={session.id} className="hover:bg-slate-50/70 transition-colors">
                          {/* 1. Customer (Name & Phone, Blank if not entered) */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs shrink-0">
                                {session.customerName
                                  ? session.customerName.charAt(0).toUpperCase()
                                  : <User className="h-3.5 w-3.5" />}
                              </div>
                              <div>
                                {session.customerName ? (
                                  <span className="font-bold text-slate-900 block text-xs">
                                    {session.customerName}
                                  </span>
                                ) : null}
                                {session.customerPhone && (
                                  <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                                    <Phone className="h-2.5 w-2.5 text-slate-400" />
                                    {session.customerPhone}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 2. Wallet ID */}
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 text-xs">
                            {couponId}
                          </td>

                          {/* 3. Action (View button) */}
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenSessionDetail(session)}
                              className="text-xs h-7 px-3 rounded-lg border-slate-200 text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 font-medium cursor-pointer"
                            >
                              View
                            </Button>
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
              onClick={() => setIsCustomerHistoryOpen(false)}
              className="text-xs px-4 cursor-pointer"
            >
              Close
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {/* ─── MODAL 4: Session Transaction Detail Modal ─────────────── */}
      {selectedSessionForDetail && (
        <Modal
          isOpen={!!selectedSessionForDetail}
          onClose={() => setSelectedSessionForDetail(null)}
          title={`Session Details — Wallet ${selectedSessionForDetail.sessionCardNumber || selectedSessionForDetail.card?.physicalCardNumber || selectedSessionForDetail.card?.qrToken || ''}`}
          size="lg"
        >
          <div className="space-y-4">
            {/* Unified Session Summary Header */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Customer Profile
                  </span>
                  {selectedSessionForDetail.customerName ? (
                    <h3 className="text-base font-bold text-slate-900 leading-tight">
                      {selectedSessionForDetail.customerName}
                    </h3>
                  ) : null}
                  {selectedSessionForDetail.customerPhone && (
                    <p className="text-xs text-slate-500">{selectedSessionForDetail.customerPhone}</p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <div className="text-2xl font-bold font-mono text-emerald-600">
                    {formatCurrency(selectedSessionForDetail.balance ?? 0)}
                  </div>
                  <div className="mt-1">
                    <Badge variant={selectedSessionForDetail.status === 'ACTIVE' ? 'success' : 'outline'} className="text-[10px]">
                      {selectedSessionForDetail.status || 'SETTLED'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Activity Breakdown */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between px-0.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Breakdown
                </h4>
              </div>

              {isLoadingSessionDetailTxns ? (
                <div className="py-8">
                  <LoadingState message="Loading order items..." />
                </div>
              ) : sessionDetailTxns.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/40">
                  No transaction items recorded for this session.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden max-h-56 overflow-y-auto">
                  {sessionDetailTxns.map((tx) => (
                    <div key={tx.id} className="p-3 flex items-center justify-between text-xs bg-white hover:bg-slate-50/60">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-slate-900">{getTransactionTitle(tx)}</p>
                        <p className="text-[11px] text-slate-400">{formatDate(tx.createdAt)}</p>
                      </div>
                      <span className={`font-mono font-bold text-xs ${tx.type === 'PURCHASE' ? 'text-slate-900' : 'text-emerald-600'}`}>
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
              onClick={() => setSelectedSessionForDetail(null)}
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
