import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiService } from '@/services/api';
import { usePermissions } from '@/hooks';
import type { Card as CardEntity } from '@/types';
import {
  Card,
  Badge,
  Button,
  Modal,
  ModalFooter,
  LoadingState,
  EmptyState,
} from '@/components/ui';
import { formatCurrency, formatDate, notify } from '@/utils';
import { formatBlockedCardMessage } from '@/utils/cardBlockMessages';
import {
  ShieldAlert,
  Search,
  RefreshCw,
  Lock,
  CreditCard,
  Store,
  X,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

interface OrgAdminBlockedCardsSectionProps {
  branchFilter?: string;
  startDate?: string;
  endDate?: string;
}

function getCardBalance(card: CardEntity): number {
  if (card.activeSession && typeof card.activeSession.balance === 'number') {
    return card.activeSession.balance;
  }
  if ((card as any).balance !== undefined) {
    return Number((card as any).balance) || 0;
  }
  return 0;
}

function getCardCustomer(card: CardEntity): { name?: string | null; phone?: string | null } {
  const name = card.activeSession?.customerName || (card as any).assignedCustomerName || (card as any).customerName;
  const phone = card.activeSession?.customerPhone || (card as any).assignedPhone || (card as any).phone;
  return { name, phone };
}

function getCardBranchName(card: CardEntity): string | undefined {
  return card.activeSession?.branchName || (card as any).branchName;
}

export function OrgAdminBlockedCardsSection({
  branchFilter,
  startDate,
  endDate,
}: OrgAdminBlockedCardsSectionProps) {
  const { hasPermission } = usePermissions();
  const canUnblock = hasPermission('CARD_UNBLOCK');

  const [cards, setCards] = useState<CardEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Unblock Confirmation State
  const [cardToUnblock, setCardToUnblock] = useState<CardEntity | null>(null);
  const [isUnblocking, setIsUnblocking] = useState(false);

  // Fetch Blocked Cards
  const fetchBlockedCards = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const isFilteredBranch = branchFilter && branchFilter !== 'ALL';
      const res = await apiService.cards.getCards({
        status: 'BLOCKED',
        branchId: isFilteredBranch ? branchFilter : undefined,
      });

      if (res.success) {
        const rawItems = Array.isArray(res.data)
          ? res.data
          : (res.data as any)?.items || [];

        // Ensure we only have BLOCKED cards (case-insensitive)
        const blockedOnly = rawItems.filter(
          (c: CardEntity) => String(c.status).toUpperCase() === 'BLOCKED',
        );
        setCards(blockedOnly);
      } else {
        setError(res.error.message || 'Failed to load blocked cards');
      }
    } catch {
      setError('Unable to load blocked cards. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [branchFilter]);

  useEffect(() => {
    fetchBlockedCards();
  }, [fetchBlockedCards]);

  // Date Range Filtering (if card has blockedAt, updatedAt, or createdAt within range)
  const dateFilteredCards = useMemo(() => {
    if (!startDate && !endDate) return cards;
    return cards.filter((card) => {
      const cardDateStr = card.blockedAt || card.updatedAt || card.createdAt;
      if (!cardDateStr) return true;
      const cardDate = new Date(cardDateStr);
      if (isNaN(cardDate.getTime())) return true;

      const dateOnly = cardDate.toISOString().split('T')[0];
      if (startDate && dateOnly < startDate) return false;
      if (endDate && dateOnly > endDate) return false;
      return true;
    });
  }, [cards, startDate, endDate]);

  // Search Query Filtering
  const filteredCards = useMemo(() => {
    if (!searchQuery.trim()) return dateFilteredCards;
    const q = searchQuery.toLowerCase().trim();
    return dateFilteredCards.filter((c) => {
      const cardId = (c.physicalCardNumber || c.id || '').toLowerCase();
      const customer = getCardCustomer(c);
      const name = (customer.name || '').toLowerCase();
      const phone = (customer.phone || '').toLowerCase();
      const reason = (c.blockedReason || '').toLowerCase();
      const branchName = (getCardBranchName(c) || '').toLowerCase();
      return (
        cardId.includes(q) ||
        name.includes(q) ||
        phone.includes(q) ||
        reason.includes(q) ||
        branchName.includes(q)
      );
    });
  }, [dateFilteredCards, searchQuery]);

  // KPI Calculations
  const totalBlockedCount = dateFilteredCards.length;
  const totalLockedBalance = useMemo(() => {
    return dateFilteredCards.reduce((sum, c) => sum + getCardBalance(c), 0);
  }, [dateFilteredCards]);

  // Unblock Handler
  const handleConfirmUnblock = async () => {
    if (!cardToUnblock) return;
    setIsUnblocking(true);
    try {
      const res = await apiService.cards.unblockCard(cardToUnblock.id);
      if (res.success) {
        notify.success(`Card ${cardToUnblock.physicalCardNumber || cardToUnblock.id} has been unblocked`);
        setCardToUnblock(null);
        await fetchBlockedCards();
      } else {
        notify.error(res.error.message || 'Failed to unblock card');
      }
    } catch {
      notify.error('An error occurred while unblocking the card');
    } finally {
      setIsUnblocking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── Top KPI Metric Cards ─── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
        {/* KPI 1: Total Blocked Cards */}
        <Card padding="md" className="border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Blocked Cards
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
              <ShieldAlert className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <p className="font-mono text-3xl font-extrabold text-slate-900">
              {totalBlockedCount}
            </p>
            <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
              Blocked
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Cards reported lost, damaged, or suspended</p>
        </Card>

        {/* KPI 2: Total Locked Balance */}
        <Card padding="md" className="border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Locked Balance
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <Lock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <p className="font-mono text-3xl font-extrabold text-amber-700">
              {formatCurrency(totalLockedBalance)}
            </p>
          </div>
          <p className="text-xs text-slate-400 mt-1">Safe and preserved inside blocked card wallets</p>
        </Card>
      </div>

      {/* ─── Search Bar & List Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by card ID, customer, phone, or reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-9 pr-8 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchBlockedCards}
            disabled={isLoading}
            leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            className="text-xs h-8"
          >
            Refresh
          </Button>
          <Badge variant="outline" className="border-slate-300 text-slate-600 text-xs font-semibold px-2.5 py-1">
            {filteredCards.length} {filteredCards.length === 1 ? 'Record' : 'Records'}
          </Badge>
        </div>
      </div>

      {/* ─── Main Content / Table ─── */}
      {isLoading ? (
        <div className="py-12 bg-white rounded-2xl border border-slate-200/80">
          <LoadingState message="Loading blocked cards..." />
        </div>
      ) : error ? (
        <div className="p-6 bg-white rounded-2xl border border-rose-200 text-center space-y-3">
          <p className="text-sm text-rose-600 font-medium">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchBlockedCards}>
            Retry
          </Button>
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="py-12 bg-white rounded-2xl border border-slate-200/80">
          <EmptyState
            title={searchQuery ? 'No matching blocked cards' : 'No blocked cards'}
            description={
              searchQuery
                ? 'Try adjusting your search query.'
                : 'There are currently no blocked cards recorded for this counter.'
            }
          />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Card / Wallet ID</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Locked Balance</th>
                  <th className="py-3 px-4">Blocked Reason</th>
                  <th className="py-3 px-4">Blocked By</th>
                  <th className="py-3 px-4">Blocked Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredCards.map((card) => {
                  const cardId = card.physicalCardNumber || card.id;
                  const customer = getCardCustomer(card);
                  const branchName = getCardBranchName(card);
                  const blockedDate = card.blockedAt || card.updatedAt || card.createdAt;
                  const blocker = card.blockedBy || 'Administrator';
                  const formattedReason = formatBlockedCardMessage(card.blockedReason, blocker);
                  const balance = getCardBalance(card);

                  return (
                    <tr key={card.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Card ID */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                            <CreditCard className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <span className="font-mono font-bold text-slate-900 block">
                              {cardId}
                            </span>
                            {branchName && (
                              <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                <Store className="h-2.5 w-2.5" />
                                {branchName}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        {customer.name ? (
                          <div>
                            <span className="font-semibold text-slate-900 block">
                              {customer.name}
                            </span>
                            {customer.phone && (
                              <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                                {customer.phone}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned Card</span>
                        )}
                      </td>

                      {/* Locked Balance */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {formatCurrency(balance)}
                      </td>

                      {/* Blocked Reason */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="flex items-start gap-1.5">
                          <span className="inline-flex shrink-0 items-center rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 border border-rose-200 mt-0.5">
                            Blocked
                          </span>
                          <span className="text-slate-700 text-xs leading-relaxed line-clamp-2" title={formattedReason}>
                            {formattedReason}
                          </span>
                        </div>
                      </td>

                      {/* Blocked By */}
                      <td className="py-3.5 px-4 text-slate-600">
                        <span className="font-medium text-slate-800 block">{blocker}</span>
                      </td>

                      {/* Blocked Date */}
                      <td className="py-3.5 px-4 text-slate-500 font-medium">
                        {blockedDate ? formatDate(blockedDate) : '—'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {canUnblock && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCardToUnblock(card)}
                            className="text-xs h-7 px-2.5 rounded-lg border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400 font-semibold cursor-pointer"
                            leftIcon={<ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />}
                          >
                            Unblock
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Unblock Confirmation Modal ─── */}
      <Modal
        isOpen={Boolean(cardToUnblock)}
        onClose={() => !isUnblocking && setCardToUnblock(null)}
        title="Unblock Card"
        size="sm"
      >
        {cardToUnblock && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 p-3.5 text-amber-900">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <p className="font-bold">Are you sure you want to unblock this card?</p>
                <p className="mt-1 text-amber-800">
                  Unblocking will restore the card to Active status and allow purchases and recharges to resume immediately.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Card / Wallet ID:</span>
                <span className="font-mono font-bold text-slate-900">
                  {cardToUnblock.physicalCardNumber || cardToUnblock.id}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Locked Balance:</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatCurrency(getCardBalance(cardToUnblock))}
                </span>
              </div>
              {cardToUnblock.blockedReason && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Original Reason:</span>
                  <span className="text-slate-700 text-right max-w-[200px] truncate">
                    {cardToUnblock.blockedReason}
                  </span>
                </div>
              )}
            </div>

            <ModalFooter>
              <Button
                variant="ghost"
                type="button"
                size="sm"
                onClick={() => setCardToUnblock(null)}
                disabled={isUnblocking}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                size="sm"
                isLoading={isUnblocking}
                onClick={handleConfirmUnblock}
                leftIcon={<ShieldCheck className="h-4 w-4" />}
              >
                Confirm Unblock
              </Button>
            </ModalFooter>
          </div>
        )}
      </Modal>
    </div>
  );
}
