
// ─── Customer History & Card Lifecycle Page ──────────────────────────────
// Real Customer Session History & Permanent Card Status Audit Trail.
// Multi-field Global Search by Customer Name, Phone Number, Physical Card (e.g. MC 105),
// and Event Action (Card Blocked, Card Unblocked).

import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiService } from '@/services/api';
import { usePermissions, useBranch } from '@/hooks';
import type {
  Card as CardEntity,
  SessionStatus,
  Transaction,
  Branch,
  CardSession,
} from '@/types';
import {
  Button,
  Select,
  Card as UiCard,
  Badge,
  Modal,
  ModalFooter,
  LoadingState,
  EmptyState,
  ErrorState,
} from '@/components/ui';
import { DataTable } from '@/components/tables';
import { formatDate, formatCurrency, extractTransactionItems } from '@/utils';
import {
  CreditCard,
  Building2,
  Search,
  RefreshCw,
  Eye,
  Wallet,
  ArrowUpRight,
  ShoppingBag,
  RotateCcw,
  User,
  Phone,
  History,
} from 'lucide-react';

// ─── Customer Session Record Model ──────────────────────────────────
export interface CustomerHistoryItem {
  id: string; // Session UUID
  cardId: string;
  physicalCardNumber: string;
  sessionCardNumber: string;
  cycleNumber: number;
  customerName: string | null;
  customerPhone: string | null;
  session: CardSession;
  sessionStatus: SessionStatus;
  balance: number;
  branchId: string | null;
  branchName: string;
  startedAt: string;
  settledAt: string | null;
  issuedByName?: string;
  lastActivityAt: string;
}

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

function SessionTransactionItem({ tx }: { tx: Transaction }) {
  const isRecharge = tx.type === 'RECHARGE' || String(tx.type).startsWith('RECHARGE');
  const isPurchase = tx.type === 'PURCHASE';
  const title = getTransactionTitle(tx);

  const iconBg = isPurchase
    ? 'bg-rose-50 text-rose-600'
    : isRecharge
    ? 'bg-emerald-50 text-emerald-600'
    : 'bg-amber-50 text-amber-600';

  return (
    <div className="flex items-start justify-between p-3 rounded-lg border border-slate-200 text-sm hover:border-slate-300 hover:bg-slate-50/50 transition-colors">
      <div className="flex items-start gap-2.5 flex-1 min-w-0 pr-3">
        <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${iconBg}`}>
          {isPurchase ? (
            <ShoppingBag className="h-4 w-4" />
          ) : isRecharge ? (
            <ArrowUpRight className="h-4 w-4" />
          ) : (
            <RotateCcw className="h-4 w-4" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900 leading-snug break-words">{title}</p>
          <p className="text-xs text-slate-500 mt-1">{formatDate(tx.createdAt)}</p>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className={`font-mono font-bold ${isRecharge ? 'text-emerald-600' : 'text-slate-900'}`}>
          {isRecharge ? '+' : '-'}
          {formatCurrency(tx.amount)}
        </p>
        {tx.balanceAfter !== undefined && (
          <p className="text-xs text-slate-400">Bal: {formatCurrency(tx.balanceAfter)}</p>
        )}
      </div>
    </div>
  );
}

export function SessionsPage() {
  const { hasPermission } = usePermissions();
  const { currentBranch, selectBranch } = useBranch();

  const [rawCards, setRawCards] = useState<CardEntity[]>([]);
  const [rawSessions, setRawSessions] = useState<CardSession[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── Filters State ────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [sessionStatusFilter, setSessionStatusFilter] = useState<SessionStatus | 'ALL'>('ALL');
  const [branchFilter, setBranchFilter] = useState<string>(currentBranch?.id || 'ALL');

  useEffect(() => {
    setBranchFilter(currentBranch ? currentBranch.id : 'ALL');
  }, [currentBranch]);
  const [dateRangeFilter, setDateRangeFilter] = useState<'ALL' | 'today' | 'yesterday' | '7d' | '30d'>('ALL');

  // ─── Session Details Inspection Modal ─────────────────────────────
  const [selectedItem, setSelectedItem] = useState<CustomerHistoryItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [sessionTxns, setSessionTxns] = useState<Transaction[]>([]);
  const [isLoadingTxns, setIsLoadingTxns] = useState(false);
  const [detailTab, setDetailTab] = useState<'overview' | 'timeline'>('overview');

  const extractArray = <T,>(data: any): T[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.items)) return data.items;
    return [];
  };

  // ─── Fetch Sessions, Cards, History Events & Branches (Realtime) ──
  const fetchCustomerHistoryData = useCallback(async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
      setError(null);
    }
    try {
      const [sessionsRes, cardsRes, branchesRes] = await Promise.all([
        apiService.sessions.getSessions({ limit: 300 }),
        apiService.cards.getCards(),
        apiService.branches.getBranches(),
      ]);

      if (!sessionsRes.success) {
        if (!silent) setError(sessionsRes.error.message || 'Failed to load customer sessions');
        return;
      }

      setRawSessions(extractArray<CardSession>(sessionsRes.data));
      if (cardsRes.success) {
        setRawCards(extractArray<CardEntity>(cardsRes.data));
      }
      if (branchesRes.success) {
        setBranches(extractArray<Branch>(branchesRes.data));
      }
    } catch {
      if (!silent) setError('Unable to connect to the server. Please try again.');
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomerHistoryData(false);

    // Background polling every 3 seconds for realtime card status synchronization
    const interval = setInterval(() => {
      fetchCustomerHistoryData(true);
    }, 3000);

    // Window focus & custom event listeners
    const onFocus = () => fetchCustomerHistoryData(true);
    const onVisibility = () => {
      if (!document.hidden) fetchCustomerHistoryData(true);
    };
    const onCardsUpdated = () => fetchCustomerHistoryData(true);

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('cards-updated', onCardsUpdated);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('cards-updated', onCardsUpdated);
    };
  }, [fetchCustomerHistoryData]);

  // ─── Build Customer History Records ──────────────────────────────
  const customerHistoryItems = useMemo<any[]>(() => {
    return rawSessions.map((s) => {
      const card = rawCards.find((c) => c.id === s.cardId || c.physicalCardNumber === s.physicalCardNumber);
      const branch = branches.find((b) => b.id === s.branchId);

      const physCard = s.physicalCardNumber || (card ? card.physicalCardNumber : 'MC-Card');
      const cycleNum = s.cycleNumber || 1;
      const sessionCardNum = s.sessionCardNumber || `${physCard}_${cycleNum}`;

      return {
        id: s.id,
        cardId: s.cardId,
        physicalCardNumber: physCard,
        sessionCardNumber: sessionCardNum,
        cycleNumber: cycleNum,
        customerName: s.customerName || null,
        customerPhone: s.customerPhone || null,
        session: s,
        sessionStatus: s.status,
        balance: Number(s.balance) || 0,
        branchId: s.branchId,
        branchName: branch ? branch.name : ((s as any).branchName || (s as any).branch?.name || 'Main Cafeteria'),
        startedAt: s.startedAt || s.createdAt,
        settledAt: s.settledAt || null,
        issuedByName: (s as any).issuedBy?.name,
        lastActivityAt: s.updatedAt || s.createdAt || s.startedAt,
      };
    });
  }, [rawSessions, rawCards, branches]);

  // ─── Filter Customer Sessions ────────────────────────────────────
  const filteredSessions = useMemo(() => {
    return customerHistoryItems.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesCustomerName = item.customerName?.toLowerCase().includes(q) ?? false;
        const matchesCustomerPhone = item.customerPhone?.toLowerCase().includes(q) ?? false;
        const matchesPhysicalNumber = item.physicalCardNumber.toLowerCase().includes(q);
        const matchesInternalNumber = item.sessionCardNumber.toLowerCase().includes(q);
        const matchesCycle = `#${item.cycleNumber}`.toLowerCase().includes(q) || `cycle ${item.cycleNumber}`.includes(q);
        const matchesBranch = item.branchName.toLowerCase().includes(q);

        if (
          !matchesCustomerName &&
          !matchesCustomerPhone &&
          !matchesPhysicalNumber &&
          !matchesInternalNumber &&
          !matchesCycle &&
          !matchesBranch
        ) {
          return false;
        }
      }

      if (sessionStatusFilter !== 'ALL' && item.sessionStatus !== sessionStatusFilter) {
        return false;
      }

      if (branchFilter !== 'ALL' && item.branchId !== branchFilter) {
        return false;
      }

      if (dateRangeFilter !== 'ALL' && item.startedAt) {
        const itemDate = new Date(item.startedAt);
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const itemTime = itemDate.getTime();

        if (dateRangeFilter === 'today' && itemTime < startOfToday) return false;
        if (dateRangeFilter === 'yesterday') {
          const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
          if (itemTime < startOfYesterday || itemTime >= startOfToday) return false;
        }
        if (dateRangeFilter === '7d') {
          const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
          if (itemTime < sevenDaysAgo) return false;
        }
        if (dateRangeFilter === '30d') {
          const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;
          if (itemTime < thirtyDaysAgo) return false;
        }
      }

      return true;
    });
  }, [customerHistoryItems, searchQuery, sessionStatusFilter, branchFilter, dateRangeFilter]);

  // ─── Open Session Detail Inspection ──────────────────────────────
  const handleOpenDetails = async (item: CustomerHistoryItem) => {
    setSelectedItem(item);
    setDetailTab('overview');
    setShowDetailModal(true);
    setIsLoadingTxns(true);
    setSessionTxns([]);

    try {
      const res = await apiService.sessions.getSessionTransactions(item.id);
      if (res.success) {
        setSessionTxns(res.data);
      }
    } catch {
      setSessionTxns([]);
    } finally {
      setIsLoadingTxns(false);
    }
  };


  // ─── Permission Guard ────────────────────────────────────────────
  if (!hasPermission('SESSION_VIEW')) {
    return (
      <ErrorState
        title="Access Denied"
        message="You do not have the required SESSION_VIEW permission to view customer history."
      />
    );
  }

  // ─── Columns for Sessions Table ──────────────────────────────────
  const sessionColumns = [
    {
      key: 'customerName',
      header: 'Customer',
      render: (item: CustomerHistoryItem) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-sm shrink-0">
            {item.customerName ? item.customerName.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900">
                {item.customerName || 'Walk-in Customer'}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenDetails(item);
                }}
                className="p-1 rounded-md text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 transition-colors cursor-pointer"
                title="View customer session details"
                aria-label={`View session for ${item.customerName || 'Walk-in Customer'}`}
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
            </div>
            {item.customerPhone && (
              <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                <Phone className="h-3 w-3 text-slate-400" />
                {item.customerPhone}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'physicalCardNumber',
      header: 'Card Number',
      render: (item: CustomerHistoryItem) => (
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-emerald-600" />
          <span className="font-mono font-bold text-slate-900">
            {item.physicalCardNumber}
          </span>
          <span
            className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 font-mono"
            title={`Card Cycle #${item.cycleNumber}`}
          >
            #{item.cycleNumber}
          </span>
        </div>
      ),
    },
    {
      key: 'sessionStatus',
      header: 'Status',
      render: (item: CustomerHistoryItem) => (
        <Badge variant={item.sessionStatus === 'ACTIVE' ? 'success' : 'outline'}>
          {item.sessionStatus}
        </Badge>
      ),
    },
    {
      key: 'balance',
      header: 'Balance',
      render: (item: CustomerHistoryItem) => (
        <span className="font-mono font-bold text-slate-900">
          {formatCurrency(item.balance)}
        </span>
      ),
    },
    {
      key: 'branchName',
      header: 'Counter',
      render: (item: CustomerHistoryItem) => (
        <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5 text-slate-500" />
          {item.branchName}
        </span>
      ),
    },
    {
      key: 'startedAt',
      header: 'Issued At',
      render: (item: CustomerHistoryItem) => (
        <span className="text-xs font-medium text-slate-500">
          {formatDate(item.startedAt)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* ─── Header ───────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Customer History & Audit Trail
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Historical customer card sessions, purchases, and recharge audits
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchCustomerHistoryData()}
            isLoading={isLoading}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4 text-emerald-600" />
            <span>Refresh History</span>
          </Button>
        </div>
      </div>

      {/* ─── Filter Bar ───────────────────────────────────────────── */}
      <UiCard padding="md" className="border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Search Bar (30 char limit) */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by customer, phone, or card number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value.slice(0, 30))}
              maxLength={30}
              className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-all focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm"
            />
          </div>

          {/* Session Status Filter */}
          <Select
            value={sessionStatusFilter}
            onChange={(e) => setSessionStatusFilter(e.target.value as any)}
            options={[
              { value: 'ALL', label: 'All Sessions' },
              { value: 'ACTIVE', label: 'In Use (Active Now)' },
              { value: 'SETTLED', label: 'Completed (Settled)' },
            ]}
          />

          {/* Branch Filter */}
          <Select
            value={branchFilter}
            onChange={(e) => {
              setBranchFilter(e.target.value);
              selectBranch(e.target.value);
            }}
            options={[
              { value: 'ALL', label: 'All Counters' },
              ...branches.map((b) => ({ value: b.id, label: b.name })),
            ]}
          />

          {/* Date Range Filter */}
          <Select
            value={dateRangeFilter}
            onChange={(e) => setDateRangeFilter(e.target.value as any)}
            options={[
              { value: 'ALL', label: 'All Time' },
              { value: 'today', label: 'Today' },
              { value: 'yesterday', label: 'Yesterday' },
              { value: '7d', label: 'Last 7 Days' },
              { value: '30d', label: 'Last 30 Days' },
            ]}
          />
        </div>
      </UiCard>

      {/* ─── Content Views ────────────────────────────────────────── */}
      {isLoading ? (
        <LoadingState message="Loading customer history..." />
      ) : error ? (
        <ErrorState title="Error Loading History" message={error} onRetry={fetchCustomerHistoryData} />
      ) : filteredSessions.length === 0 ? (
        <EmptyState
          icon={<Wallet className="h-8 w-8 text-slate-400" />}
          title={searchQuery || sessionStatusFilter !== 'ALL' || branchFilter !== 'ALL' || dateRangeFilter !== 'ALL' ? "No matching sessions found" : "No customer sessions yet"}
          description={searchQuery || sessionStatusFilter !== 'ALL' || branchFilter !== 'ALL' || dateRangeFilter !== 'ALL' ? "Try adjusting your search or filters." : "Active and past cafeteria card sessions will appear here in real time."}
          action={
            searchQuery || sessionStatusFilter !== 'ALL' || branchFilter !== 'ALL' || dateRangeFilter !== 'ALL' ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setSessionStatusFilter('ALL');
                  setBranchFilter('ALL');
                  setDateRangeFilter('ALL');
                }}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Clear Filters</span>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <DataTable data={filteredSessions} columns={sessionColumns} />
      )}

      {/* ─── Session & Card Inspection Modal ──────────────────────── */}
      {showDetailModal && selectedItem && (
        <Modal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          title={`Customer Session — Card ${selectedItem.physicalCardNumber}`}
          size="lg"
        >
          <div className="space-y-4">
            {/* Customer & Card Summary Banner */}
            <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 p-4">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Customer Profile</p>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedItem.customerName || 'Walk-in Customer'}
                </h3>
                {selectedItem.customerPhone && (
                  <p className="text-xs text-slate-500">{selectedItem.customerPhone}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-500 uppercase">Session Balance</p>
                <p className="text-xl font-bold font-mono text-emerald-600">
                  {formatCurrency(selectedItem.balance)}
                </p>
                <Badge variant={selectedItem.sessionStatus === 'ACTIVE' ? 'success' : 'outline'}>
                  {selectedItem.sessionStatus}
                </Badge>
              </div>
            </div>

            {/* Modal Detail Tabs */}
            <div className="flex border-b border-slate-200 text-sm">
              <button
                onClick={() => setDetailTab('overview')}
                className={`px-4 py-2 font-semibold border-b-2 ${
                  detailTab === 'overview'
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent text-slate-500'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setDetailTab('timeline')}
                className={`px-4 py-2 font-semibold border-b-2 ${
                  detailTab === 'timeline'
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent text-slate-500'
                }`}
              >
                Transactions ({sessionTxns.length})
              </button>
            </div>

            {/* Detail Tab Contents */}
            {detailTab === 'overview' && (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Physical Card</p>
                  <p className="font-mono font-bold text-slate-900">
                    {selectedItem.physicalCardNumber}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Card Cycle</p>
                  <p className="font-mono font-bold text-slate-900">
                    #{selectedItem.cycleNumber}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Counter Location</p>
                  <p className="font-semibold text-slate-900">
                    {selectedItem.branchName}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Session Started</p>
                  <p className="text-slate-900">
                    {formatDate(selectedItem.startedAt)}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 col-span-2">
                  <p className="text-xs text-slate-500">Settled At</p>
                  <p className="text-slate-900">
                    {selectedItem.settledAt ? formatDate(selectedItem.settledAt) : 'Still Active'}
                  </p>
                </div>
              </div>
            )}

            {detailTab === 'timeline' && (
              isLoadingTxns ? (
                <LoadingState message="Loading transactions..." />
              ) : sessionTxns.length === 0 ? (
                <EmptyState
                  icon={<History className="h-6 w-6 text-slate-400" />}
                  title="No Transactions"
                  description="No purchase or recharge activity recorded for this session yet."
                />
              ) : (
                <div className="max-h-80 overflow-y-auto space-y-2.5 pr-1">
                  {sessionTxns.map((tx) => (
                    <SessionTransactionItem key={tx.id} tx={tx} />
                  ))}
                </div>
              )
            )}
          </div>

          <ModalFooter>
            <Button variant="outline" onClick={() => setShowDetailModal(false)}>
              Close
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}
