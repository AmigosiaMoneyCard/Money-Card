import { useState, useMemo } from 'react';
import type { Card as CardEntity, Branch } from '@/types';
import {
  Badge,
  Button,
  Modal,
  ModalFooter,
  LoadingState,
  EmptyState,
} from '@/components/ui';
import { formatCurrency, formatDate, notify } from '@/utils';
import { apiService } from '@/services/api';
import {
  Search,
  CreditCard,
  Store,
  X,
  History,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface BlockedWalletsTableViewProps {
  cards: CardEntity[];
  branches?: Branch[];
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onOpenCustomerHistory?: (card: CardEntity) => void;
  canUnblock?: boolean;
}

export function BlockedWalletsTableView({
  cards,
  branches = [],
  isLoading = false,
  error = null,
  onRefresh,
  onOpenCustomerHistory,
  canUnblock = true,
}: BlockedWalletsTableViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [cardToUnblock, setCardToUnblock] = useState<CardEntity | null>(null);
  const [isUnblocking, setIsUnblocking] = useState(false);

  // Map branches for quick lookup
  const branchMap = useMemo(() => {
    const map = new Map<string, string>();
    branches.forEach((b) => map.set(b.id, b.name));
    return map;
  }, [branches]);

  const getBranchName = (card: CardEntity): string | undefined => {
    if (card.activeSession?.branchName) return card.activeSession.branchName;
    const branchId = card.activeSession?.branchId || card.currentBranchId;
    if (branchId && branchMap.has(branchId)) return branchMap.get(branchId);
    return undefined;
  };

  // Filter blocked cards
  const blockedCards = useMemo(() => {
    return cards.filter((c) => c.status === 'BLOCKED');
  }, [cards]);


  // Search Filter
  const filteredCards = useMemo(() => {
    if (!searchQuery.trim()) return blockedCards;
    const q = searchQuery.toLowerCase().trim();
    return blockedCards.filter((c) => {
      const cardId = (c.physicalCardNumber || c.qrToken || c.id || '').toLowerCase();
      const customer = (c.activeSession?.customerName || '').toLowerCase();
      const phone = (c.activeSession?.customerPhone || '').toLowerCase();
      const reason = (c.blockedReason || '').toLowerCase();
      const branch = (getBranchName(c) || '').toLowerCase();
      return (
        cardId.includes(q) ||
        customer.includes(q) ||
        phone.includes(q) ||
        reason.includes(q) ||
        branch.includes(q)
      );
    });
  }, [blockedCards, searchQuery, branchMap]);

  // Unblock Handler
  const handleConfirmUnblock = async () => {
    if (!cardToUnblock) return;
    setIsUnblocking(true);
    try {
      const res = await apiService.cards.unblockCard(cardToUnblock.id);
      if (res.success) {
        notify.success(
          `Wallet ${cardToUnblock.physicalCardNumber || cardToUnblock.qrToken || cardToUnblock.id} unblocked successfully.`
        );
        setCardToUnblock(null);
        if (onRefresh) onRefresh();
      } else {
        notify.error(res.error?.message || 'Failed to unblock wallet');
      }
    } catch {
      notify.error('Failed to unblock wallet. Please try again.');
    } finally {
      setIsUnblocking(false);
    }
  };

  return (
    <div className="space-y-4">

      {/* ─── 2. Search Bar with Validation ─── */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search by card ID, customer, phone, or reason..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-8 py-2 text-xs text-slate-900 placeholder-slate-400 transition-colors focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 transition-colors cursor-pointer"
            title="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* ─── 3. Standardized 7-Column Blocked Wallets Table ─── */}
      {error ? (
        <div className="py-12 bg-white rounded-2xl border border-rose-200">
          <EmptyState title="Error Loading Blocked Wallets" description={error} />
        </div>
      ) : isLoading ? (
        <div className="py-12 bg-white rounded-2xl border border-slate-200/80">
          <LoadingState message="Loading blocked wallets..." />
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="py-12 bg-white rounded-2xl border border-slate-200/80">
          <EmptyState
            title={searchQuery ? 'No matching blocked wallets' : 'No Blocked Wallets'}
            description={
              searchQuery
                ? `No blocked wallets found matching "${searchQuery}".`
                : 'There are currently no security-locked or administratively blocked wallets.'
            }
          />
          {searchQuery && (
            <div className="text-center mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchQuery('')}
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
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Wallet ID</th>
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
                  const cardIdentifier = card.physicalCardNumber || card.qrToken || card.id;
                  const customerName = card.activeSession?.customerName;
                  const customerPhone = card.activeSession?.customerPhone;
                  const lockedBal = card.activeSession?.balance || 0;
                  const branchName = getBranchName(card);
                  const reasonText = card.blockedReason || 'Security Locked';
                  const blocker = card.blockedBy || 'Administrator';
                  const blockedDate = card.blockedAt || card.updatedAt || card.createdAt;

                  return (
                    <tr key={card.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* 1. Wallet ID */}
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                            <CreditCard className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <span className="font-mono font-bold text-slate-900 block">
                              {cardIdentifier}
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

                      {/* 2. Customer */}
                      <td className="py-3.5 px-4">
                        {customerName ? (
                          <div>
                            <span className="font-semibold text-slate-900 block">
                              {customerName}
                            </span>
                            {customerPhone && (
                              <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">
                                {customerPhone}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned Card</span>
                        )}
                      </td>

                      {/* 3. Locked Balance */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {formatCurrency(lockedBal)}
                      </td>

                      {/* 4. Blocked Reason */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="flex items-start gap-1.5">
                          <Badge variant="danger" className="text-[10px] font-semibold shrink-0 mt-0.5">
                            Blocked
                          </Badge>
                          <span className="text-slate-700 text-xs leading-relaxed line-clamp-2" title={reasonText}>
                            {reasonText}
                          </span>
                        </div>
                      </td>

                      {/* 5. Blocked By */}
                      <td className="py-3.5 px-4 text-slate-600">
                        <span className="font-medium text-slate-800 block">{blocker}</span>
                      </td>

                      {/* 6. Blocked Date */}
                      <td className="py-3.5 px-4 text-slate-500 font-medium">
                        {blockedDate ? formatDate(blockedDate) : '—'}
                      </td>

                      {/* 7. Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          {onOpenCustomerHistory && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onOpenCustomerHistory(card)}
                              className="text-xs h-8 px-3 rounded-lg border-slate-200 text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 font-medium cursor-pointer"
                              leftIcon={<History className="h-3.5 w-3.5 text-emerald-600" />}
                            >
                              Customer History
                            </Button>
                          )}

                          {canUnblock && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => setCardToUnblock(card)}
                              className="text-xs h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer shadow-2xs"
                              leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                            >
                              Unblock
                            </Button>
                          )}
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

      {/* ─── 4. Unblock Confirmation Modal ─── */}
      {cardToUnblock && (
        <Modal
          isOpen={Boolean(cardToUnblock)}
          onClose={() => !isUnblocking && setCardToUnblock(null)}
          title="Unblock Card"
          size="sm"
        >
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
                <span className="text-slate-500">Wallet ID:</span>
                <span className="font-mono font-bold text-slate-900">
                  {cardToUnblock.physicalCardNumber || cardToUnblock.qrToken || cardToUnblock.id}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Locked Balance:</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatCurrency(cardToUnblock.activeSession?.balance || 0)}
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
                type="button"
                size="sm"
                isLoading={isUnblocking}
                onClick={handleConfirmUnblock}
                leftIcon={<CheckCircle2 className="h-4 w-4" />}
              >
                Confirm Unblock
              </Button>
            </ModalFooter>
          </div>
        </Modal>
      )}
    </div>
  );
}
