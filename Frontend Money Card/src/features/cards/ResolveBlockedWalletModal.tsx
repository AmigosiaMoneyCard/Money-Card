import { useState, useMemo } from 'react';
import type { Card as CardEntity } from '@/types';
import { Modal, ModalFooter, Button } from '@/components/ui';
import { formatCurrency, notify } from '@/utils';
import { apiService } from '@/services/api';
import {
  ArrowLeftRight,
  Banknote,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Search,
} from 'lucide-react';

interface ResolveBlockedWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: CardEntity | null;
  availableCards?: CardEntity[];
  onSuccess: () => void;
}

export function ResolveBlockedWalletModal({
  isOpen,
  onClose,
  card,
  availableCards = [],
  onSuccess,
}: ResolveBlockedWalletModalProps) {
  const [resolutionMode, setResolutionMode] = useState<'REPLACE' | 'REFUND'>('REPLACE');
  const [selectedTargetCardId, setSelectedTargetCardId] = useState('');
  const [targetCardSearch, setTargetCardSearch] = useState('');
  const [refundPaymentMethod, setRefundPaymentMethod] = useState<'CASH' | 'UPI'>('CASH');
  const [reasonNotes, setReasonNotes] = useState('Damaged or lost card replaced');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const lockedBalance = card?.activeSession?.balance || 0;
  const cardIdentifier = card?.physicalCardNumber || card?.qrToken || card?.id || '—';
  const customerName = card?.activeSession?.customerName;
  const customerPhone = card?.activeSession?.customerPhone;

  // Filter available cards
  const filteredAvailableCards = useMemo(() => {
    const list = availableCards.filter(
      (c) => c.id !== card?.id && c.status === 'AVAILABLE' && !c.activeSession
    );
    if (!targetCardSearch.trim()) return list;
    const q = targetCardSearch.toLowerCase().trim();
    return list.filter((c) => {
      const num = (c.physicalCardNumber || '').toLowerCase();
      const qr = (c.qrToken || '').toLowerCase();
      return num.includes(q) || qr.includes(q);
    });
  }, [availableCards, card?.id, targetCardSearch]);

  const handleClose = () => {
    if (isSubmitting) return;
    setSubmitError(null);
    setSelectedTargetCardId('');
    setTargetCardSearch('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!card) return;
    setSubmitError(null);

    if (resolutionMode === 'REPLACE') {
      if (!selectedTargetCardId) {
        setSubmitError('Please select an available replacement card.');
        return;
      }

      setIsSubmitting(true);
      try {
        const res = await apiService.cards.replaceCard(card.id, {
          targetCardId: selectedTargetCardId,
          reason: reasonNotes,
        });

        if (res.success) {
          notify.success(
            `Wallet ${cardIdentifier} successfully replaced! ${formatCurrency(lockedBalance)} migrated to new card.`
          );
          handleClose();
          onSuccess();
        } else {
          setSubmitError(res.error?.message || 'Failed to replace card.');
        }
      } catch (err: any) {
        setSubmitError(err?.message || 'An unexpected error occurred while replacing the card.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // CASH / UPI REFUND
      if (!card.activeSession?.id) {
        setSubmitError('No active session found on this card to refund.');
        return;
      }

      setIsSubmitting(true);
      try {
        const res = await apiService.sessions.returnSession(card.activeSession.id);
        if (res.success) {
          notify.success(
            `Wallet ${cardIdentifier} settled. ${formatCurrency(lockedBalance)} refunded via ${refundPaymentMethod}.`
          );
          handleClose();
          onSuccess();
        } else {
          setSubmitError(res.error?.message || 'Failed to process refund.');
        }
      } catch (err: any) {
        setSubmitError(err?.message || 'An unexpected error occurred while processing refund.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  if (!card) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Resolve Blocked Wallet: ${cardIdentifier}`}
      size="md"
    >
      <div className="space-y-4 text-xs">
        {/* ── 1. Wallet Balance Summary Banner ── */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              Locked Wallet Balance
            </span>
            <span className="font-mono text-2xl font-black text-slate-900 mt-0.5 block">
              {formatCurrency(lockedBalance)}
            </span>
            {(customerName || customerPhone) && (
              <span className="text-[11px] text-slate-600 font-medium mt-0.5 block">
                Customer: {customerName || 'Anonymous'} {customerPhone ? `(${customerPhone})` : ''}
              </span>
            )}
          </div>
          <div className="h-10 w-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
            <CreditCard className="h-5 w-5" />
          </div>
        </div>

        {/* ── 2. Resolution Mode Selector ── */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Choose Resolution Method
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Mode A: Replace Card & Transfer Balance */}
            <button
              type="button"
              onClick={() => {
                setResolutionMode('REPLACE');
                setSubmitError(null);
              }}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                resolutionMode === 'REPLACE'
                  ? 'border-emerald-600 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-600'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <ArrowLeftRight className={`h-4 w-4 ${resolutionMode === 'REPLACE' ? 'text-emerald-700' : 'text-slate-500'}`} />
                  Replace Card & Transfer
                </span>
                {resolutionMode === 'REPLACE' && (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                )}
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Issue a new card and migrate {formatCurrency(lockedBalance)} so customer can keep using it.
              </p>
            </button>

            {/* Mode B: Cash Refund */}
            <button
              type="button"
              onClick={() => {
                setResolutionMode('REFUND');
                setSubmitError(null);
              }}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                resolutionMode === 'REFUND'
                  ? 'border-rose-600 bg-rose-50/50 shadow-xs ring-1 ring-rose-600'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <Banknote className={`h-4 w-4 ${resolutionMode === 'REFUND' ? 'text-rose-700' : 'text-slate-500'}`} />
                  Cash Refund & Settle
                </span>
                {resolutionMode === 'REFUND' && (
                  <CheckCircle2 className="h-4 w-4 text-rose-600" />
                )}
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Pay {formatCurrency(lockedBalance)} back to customer in cash and close this wallet.
              </p>
            </button>
          </div>
        </div>

        {/* ── 3. Mode A: Select Target Card Details ── */}
        {resolutionMode === 'REPLACE' && (
          <div className="space-y-3 rounded-xl border border-emerald-100 bg-emerald-50/30 p-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Available New Card to Assign
              </label>
              {filteredAvailableCards.length === 0 ? (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                  <p className="font-semibold">No available unassigned cards found.</p>
                  <p className="text-[11px] mt-0.5 text-amber-700">
                    Please import or register available cards at this counter first.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Filter available cards by number..."
                      value={targetCardSearch}
                      onChange={(e) => setTargetCardSearch(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <select
                    value={selectedTargetCardId}
                    onChange={(e) => setSelectedTargetCardId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-medium text-slate-900 focus:outline-none focus:border-emerald-600"
                  >
                    <option value="">-- Choose New Card ({filteredAvailableCards.length} available) --</option>
                    {filteredAvailableCards.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.physicalCardNumber ? `Card ${c.physicalCardNumber}` : `QR Token ${c.qrToken}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Replacement Reason / Audit Notes
              </label>
              <input
                type="text"
                value={reasonNotes}
                onChange={(e) => setReasonNotes(e.target.value)}
                placeholder="e.g. Lost card replaced, Damaged chip"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="rounded-lg bg-white border border-emerald-200 p-2.5 text-[11px] text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span>From Blocked Card:</span>
                <span className="font-mono font-bold text-slate-800">{cardIdentifier}</span>
              </div>
              <div className="flex justify-between">
                <span>To New Card:</span>
                <span className="font-mono font-bold text-emerald-700">
                  {selectedTargetCardId
                    ? availableCards.find((c) => c.id === selectedTargetCardId)?.physicalCardNumber || 'Selected Card'
                    : 'Not selected'}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-1 font-bold text-slate-900">
                <span>Migrated Balance:</span>
                <span className="font-mono text-emerald-700">{formatCurrency(lockedBalance)}</span>
              </div>
            </div>
          </div>
        )}

        {/* ── 4. Mode B: Cash Refund Details ── */}
        {resolutionMode === 'REFUND' && (
          <div className="space-y-3 rounded-xl border border-rose-100 bg-rose-50/30 p-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payout Payment Method
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRefundPaymentMethod('CASH')}
                  className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-semibold transition-colors ${
                    refundPaymentMethod === 'CASH'
                      ? 'border-rose-600 bg-rose-600 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Cash Payout
                </button>
                <button
                  type="button"
                  onClick={() => setRefundPaymentMethod('UPI')}
                  className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-semibold transition-colors ${
                    refundPaymentMethod === 'UPI'
                      ? 'border-purple-600 bg-purple-600 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  UPI Payout
                </button>
              </div>
            </div>

            <div className="rounded-lg bg-white border border-rose-200 p-2.5 text-[11px] text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span>Amount to Hand Over:</span>
                <span className="font-mono font-bold text-rose-700 text-sm">{formatCurrency(lockedBalance)}</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                This will settle the session, reduce the float balance by {formatCurrency(lockedBalance)}, and record a cash refund in analytics.
              </p>
            </div>
          </div>
        )}

        {/* ── Error Banner ── */}
        {submitError && (
          <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 flex items-start gap-2 text-rose-800 text-xs">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{submitError}</span>
          </div>
        )}
      </div>

      <ModalFooter>
        <Button variant="outline" size="sm" onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant={resolutionMode === 'REPLACE' ? 'primary' : 'danger'}
          size="sm"
          onClick={handleSubmit}
          isLoading={isSubmitting}
          disabled={resolutionMode === 'REPLACE' && (!selectedTargetCardId || filteredAvailableCards.length === 0)}
        >
          {resolutionMode === 'REPLACE'
            ? `Transfer ${formatCurrency(lockedBalance)} & Issue Card`
            : `Refund ${formatCurrency(lockedBalance)} & Close`}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
