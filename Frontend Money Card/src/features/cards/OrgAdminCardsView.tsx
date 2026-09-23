import { formatCurrency, formatDate, extractTransactionItems } from '@/utils';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiService } from '@/services/api';
import { usePermissions } from '@/hooks';
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
  ShieldAlert,
  X,
  Building2,
  History,
  BarChart2,
  Wallet,
  ShoppingBag,
  DollarSign,
  User,
  Phone,
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

export function OrgAdminCardsView() {
  const { hasPermission } = usePermissions();
  const canView = hasPermission('CARD_VIEW');

  const [allCards, setAllCards] = useState<CardEntity[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── Counter Pattern & Modal States ──────────────────────────────
  const [counterSearchQuery, setCounterSearchQuery] = useState('');
  const [selectedBranchForDetails, setSelectedBranchForDetails] = useState<Branch | null>(null);
  const [selectedBranchForAnalytics, setSelectedBranchForAnalytics] = useState<Branch | null>(null);
  const [selectedBranchForHistory, setSelectedBranchForHistory] = useState<Branch | null>(null);

  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [counterSessions, setCounterSessions] = useState<any[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  // Detail modal for a single customer session
  const [selectedSessionForDetail, setSelectedSessionForDetail] = useState<any | null>(null);
  const [sessionTxns, setSessionTxns] = useState<Transaction[]>([]);
  const [isLoadingTxns, setIsLoadingTxns] = useState(false);

  // Analytics Custom Range Date States (Strictly Custom Range, Default: Today)
  const [customStartDate, setCustomStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [customEndDate, setCustomEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [appliedStartDate, setAppliedStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [appliedEndDate, setAppliedEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [counterAnalyticsData, setCounterAnalyticsData] = useState<any>(null);
  const [isLoadingCounterAnalytics, setIsLoadingCounterAnalytics] = useState(false);

  // ─── Fetch Counter Analytics ──────────────────────────────────────
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

  const handleOpenAnalytics = useCallback((branch: Branch) => {
    setSelectedBranchForAnalytics(branch);
    fetchCounterAnalytics(branch.id, appliedStartDate, appliedEndDate);
  }, [fetchCounterAnalytics, appliedStartDate, appliedEndDate]);

  const handleApplyCustomDates = useCallback(() => {
    if (!selectedBranchForAnalytics) return;
    setAppliedStartDate(customStartDate);
    setAppliedEndDate(customEndDate);
    fetchCounterAnalytics(selectedBranchForAnalytics.id, customStartDate, customEndDate);
  }, [selectedBranchForAnalytics, customStartDate, customEndDate, fetchCounterAnalytics]);

  const handleResetToToday = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    setCustomStartDate(today);
    setCustomEndDate(today);
    setAppliedStartDate(today);
    setAppliedEndDate(today);
    if (selectedBranchForAnalytics) {
      fetchCounterAnalytics(selectedBranchForAnalytics.id, today, today);
    }
  }, [selectedBranchForAnalytics, fetchCounterAnalytics]);

  // ─── Open Customer History per Counter ────────────────────────────
  const handleOpenCustomerHistory = useCallback(async (branch: Branch) => {
    setSelectedBranchForHistory(branch);
    setHistorySearchQuery('');
    setIsLoadingSessions(true);
    try {
      const res = await apiService.sessions.getSessions({ branchId: branch.id, limit: 100 });
      if (res.success) {
        const items = Array.isArray(res.data) ? res.data : (res.data?.items || []);
        setCounterSessions(items);
      } else {
        setCounterSessions([]);
      }
    } catch {
      setCounterSessions([]);
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  // ─── Open Session Transactions Detail Inspection ──────────────────
  const handleOpenSessionDetail = useCallback(async (session: any) => {
    setSelectedSessionForDetail(session);
    setIsLoadingTxns(true);
    setSessionTxns([]);
    try {
      const res = await apiService.sessions.getSessionTransactions(session.id);
      if (res.success) {
        const txns = Array.isArray(res.data) ? res.data : ((res.data as any)?.items || []);
        setSessionTxns(txns);
      }
    } catch {
      setSessionTxns([]);
    } finally {
      setIsLoadingTxns(false);
    }
  }, []);

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

  const getBranchCards = useCallback((branchId: string) => {
    return allCards.filter((c) => {
      if (c.activeSession?.branchId === branchId) return true;
      if (c.currentBranchId === branchId) return true;
      if (c.status === 'AVAILABLE' && (!c.currentBranchId || c.currentBranchId === branchId)) return true;
      return false;
    });
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
      const status = (c.status || '').toLowerCase();
      return couponId.includes(q) || customer.includes(q) || phone.includes(q) || status.includes(q);
    });
  }, [selectedBranchForDetails, getBranchCards, modalSearchQuery]);

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
      {/* ─── Header matching Menu page pattern ─── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <CreditCard className="h-6 w-6 text-emerald-600" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Cards & Customer History</h1>
          </div>
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
      ) : filteredBranches.length === 0 ? (
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
                  <th className="py-3 px-4 w-1/2 min-w-[240px]">Counter Name</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBranches.map((branch) => {
                  const count = getBranchCards(branch.id).length;
                  return (
                    <tr key={branch.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Counter Name */}
                      <td className="py-3.5 px-4 w-1/2 min-w-[240px]">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <span className="font-semibold text-sm text-slate-900">
                            Cards - {branch.name}
                          </span>
                        </div>
                      </td>

                      {/* 3 Action Buttons on Far Right: [ Customer History ] [ Card Analytics ] [ Card Details (N) ] */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          {/* 1. Customer History (to the left of Card Analytics) */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenCustomerHistory(branch)}
                            className="text-xs h-8 px-3 rounded-lg border-slate-200 text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 font-medium cursor-pointer"
                            leftIcon={<History className="h-3.5 w-3.5 text-emerald-600" />}
                          >
                            Customer History
                          </Button>

                          {/* 2. Card Analytics */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenAnalytics(branch)}
                            className="text-xs h-8 px-3 rounded-lg border-slate-200 text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 font-medium cursor-pointer"
                            leftIcon={<BarChart2 className="h-3.5 w-3.5 text-emerald-600" />}
                          >
                            Card Analytics
                          </Button>

                          {/* 3. Card Details */}
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
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── MODAL 1: Customer History Modal (Counter Scoped) ─────────── */}
      {selectedBranchForHistory && (
        <Modal
          isOpen={!!selectedBranchForHistory}
          onClose={() => setSelectedBranchForHistory(null)}
          title={`Customer History — ${selectedBranchForHistory.name}`}
          size="xl"
        >
          <div className="space-y-4">
            {/* Search Bar inside Customer History Modal */}
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by customer, phone, or coupon ID..."
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:outline-none"
                />
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
                      <th className="py-2.5 px-4 text-right">Coupon ID</th>
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
                          {/* 1. Customer (Name & Phone, NO eye icon) */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs shrink-0">
                                {session.customerName
                                  ? session.customerName.charAt(0).toUpperCase()
                                  : <User className="h-3.5 w-3.5" />}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 block text-xs">
                                  {session.customerName || 'Walk-in Customer'}
                                </span>
                                {session.customerPhone && (
                                  <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                                    <Phone className="h-2.5 w-2.5 text-slate-400" />
                                    {session.customerPhone}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 2. Coupon ID (near to View button) */}
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 text-xs">
                            {couponId}
                          </td>

                          {/* 3. Action (Clean View Button, NO eye icon) */}
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
              onClick={() => setSelectedBranchForHistory(null)}
              className="text-xs px-4 cursor-pointer"
            >
              Close
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {/* ─── MODAL 1B: Session Transaction Detail Modal ─────────────── */}
      {selectedSessionForDetail && (
        <Modal
          isOpen={!!selectedSessionForDetail}
          onClose={() => setSelectedSessionForDetail(null)}
          title={`Session Details — Coupon ${selectedSessionForDetail.sessionCardNumber || selectedSessionForDetail.card?.physicalCardNumber || selectedSessionForDetail.card?.qrToken || ''}`}
          size="lg"
        >
          <div className="space-y-4">
            {/* Customer & Balance Summary Banner */}
            <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 p-4">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Customer Profile</p>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedSessionForDetail.customerName || 'Walk-in Customer'}
                </h3>
                {selectedSessionForDetail.customerPhone && (
                  <p className="text-xs text-slate-500 mt-0.5">{selectedSessionForDetail.customerPhone}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-500 uppercase">Session Balance</p>
                <p className="text-xl font-bold font-mono text-emerald-600">
                  {formatCurrency(selectedSessionForDetail.balance ?? 0)}
                </p>
                <Badge variant={selectedSessionForDetail.status === 'ACTIVE' ? 'success' : 'outline'}>
                  {selectedSessionForDetail.status || 'SETTLED'}
                </Badge>
              </div>
            </div>

            {/* Session Info Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                <span className="text-slate-500 block">Session Started</span>
                <span className="font-semibold text-slate-900 mt-0.5 block">
                  {formatDate(selectedSessionForDetail.issuedAt || selectedSessionForDetail.startedAt || selectedSessionForDetail.createdAt)}
                </span>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                <span className="text-slate-500 block">Settled At</span>
                <span className="font-semibold text-slate-900 mt-0.5 block">
                  {selectedSessionForDetail.settledAt ? formatDate(selectedSessionForDetail.settledAt) : 'Still Active'}
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
              onClick={() => setSelectedSessionForDetail(null)}
              className="text-xs px-4 cursor-pointer"
            >
              Close
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {/* ─── MODAL 2: Card Details Modal (NO Card QR, NO '#' in Coupon ID) ─ */}
      {selectedBranchForDetails && (
        <Modal
          isOpen={!!selectedBranchForDetails}
          onClose={() => setSelectedBranchForDetails(null)}
          title={`Card Details — ${selectedBranchForDetails.name}`}
          size="xl"
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
                      <th className="py-2.5 px-4">Live Current User</th>
                      <th className="py-2.5 px-4 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {branchCardsForDetails.map((card) => {
                      const couponId = card.physicalCardNumber || card.qrToken;
                      return (
                        <tr key={card.id} className="hover:bg-slate-50/70 transition-colors">
                          {/* 1. Coupon ID (Clean without '#') */}
                          <td className="py-3 px-4 font-mono font-bold text-slate-900 text-xs whitespace-nowrap">
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

                          {/* 3. Live Current User */}
                          <td className="py-3 px-4">
                            {card.activeSession ? (
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">
                                  {(card.activeSession.customerName || 'W').charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-slate-800 truncate leading-tight">
                                    {card.activeSession.customerName || 'Walk-in Customer'}
                                  </p>
                                  {card.activeSession.customerPhone && (
                                    <p className="text-[10px] text-slate-400 font-mono leading-tight">
                                      {card.activeSession.customerPhone}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ) : card.status === 'BLOCKED' ? (
                              <span className="text-slate-400 font-medium text-[11px]">— (Security Locked)</span>
                            ) : (
                              <span className="text-slate-400 font-medium text-[11px]">— (Ready to Issue)</span>
                            )}
                          </td>

                          {/* 4. Balance */}
                          <td className="py-3 px-4 text-right">
                            {card.activeSession ? (
                              <span className="font-mono font-bold text-emerald-600 text-xs">
                                {formatCurrency(card.activeSession.balance)}
                              </span>
                            ) : (
                              <span className="font-mono font-medium text-slate-400 text-xs">
                                {formatCurrency(0)}
                              </span>
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

      {/* ─── MODAL 3: Card Analytics Modal (Wide size="2xl", NO Recent Activity) ─ */}
      {selectedBranchForAnalytics && (
        <Modal
          isOpen={!!selectedBranchForAnalytics}
          onClose={() => setSelectedBranchForAnalytics(null)}
          title={`Card Analytics — ${selectedBranchForAnalytics.name}`}
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
              /* 7 Simplified Metrics Grid (NO Avg. Balance) */
              (() => {
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
                  <div className="space-y-4">
                    {/* Row 1: 4 Financial Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                      {/* 1. Cards in Use */}
                      <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-500">Cards in Use</span>
                          <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <CreditCard className="h-3.5 w-3.5" />
                          </div>
                        </div>
                        <p className="mt-2 text-2xl font-bold text-slate-900">{activeCards}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Active cards</p>
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
                        <p className="text-[11px] text-slate-400 mt-0.5">Money on cards</p>
                      </div>
                    </div>

                    {/* Row 2: 3 Operational Metrics */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      {/* 5. Ready Cards */}
                      <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-500">Ready Cards</span>
                          <div className="h-7 w-7 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </div>
                        </div>
                        <p className="mt-2 text-2xl font-bold text-slate-900">{readyCards}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Ready to issue</p>
                      </div>

                      {/* 6. Blocked Cards */}
                      <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-500">Blocked Cards</span>
                          <div className="h-7 w-7 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
                            <ShieldAlert className="h-3.5 w-3.5" />
                          </div>
                        </div>
                        <p className="mt-2 text-2xl font-bold text-slate-900">{blockedCards}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Security locked</p>
                      </div>

                      {/* 7. Refunds */}
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
              onClick={() => setSelectedBranchForAnalytics(null)}
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
