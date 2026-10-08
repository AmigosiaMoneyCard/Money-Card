import { useState, useMemo } from 'react';
import type { Card as CardEntity } from '@/types';
import { Modal, ModalFooter, Button } from '@/components/ui';
import { formatCurrency, notify } from '@/utils';
import { apiService } from '@/services/api';
import { CameraQrScanner } from '@/components/scanner/CameraQrScanner';
import {
  ArrowLeftRight,
  Banknote,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Camera,
  Keyboard,
  Sparkles,
  RotateCcw,
} from 'lucide-react';

interface ResolveBlockedWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: CardEntity | null;
  availableCards?: CardEntity[];
  onSuccess: () => void;
}

function extractWalletToken(raw: string): string {
  let clean = raw.trim();
  if (clean.toLowerCase().startsWith('mc:')) {
    clean = clean.substring(3).trim();
  }
  if (clean.includes('/c/')) {
    clean = clean.split('/c/')[1].split('?')[0].split('#')[0].trim();
  } else if (clean.startsWith('http://') || clean.startsWith('https://')) {
    try {
      const url = new URL(clean);
      const param =
        url.searchParams.get('wallet') ||
        url.searchParams.get('card') ||
        url.searchParams.get('token') ||
        url.searchParams.get('qr');
      if (param) {
        clean = param.trim();
      } else {
        const segs = url.pathname.split('/').filter(Boolean);
        if (segs.length > 0) {
          clean = segs[segs.length - 1].trim();
        }
      }
    } catch {
      // fallback
    }
  }
  try {
    clean = decodeURIComponent(clean);
  } catch {
    // fallback
  }
  return clean.toUpperCase();
}

export function ResolveBlockedWalletModal({
  isOpen,
  onClose,
  card,
  availableCards = [],
  onSuccess,
}: ResolveBlockedWalletModalProps) {
  const [resolutionMode, setResolutionMode] = useState<'REPLACE' | 'REFUND'>('REPLACE');
  const [cardEntryMethod, setCardEntryMethod] = useState<'TYPE' | 'SCAN'>('TYPE');
  const [selectedTargetCardId, setSelectedTargetCardId] = useState('');
  const [targetCardInput, setTargetCardInput] = useState('');
  const [targetCardSearch, setTargetCardSearch] = useState('');
  const [scannedFeedback, setScannedFeedback] = useState<string | null>(null);
  const [refundPaymentMethod, setRefundPaymentMethod] = useState<'CASH' | 'UPI'>('CASH');
  const [reasonNotes, setReasonNotes] = useState('Damaged or lost card replaced');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const lockedBalance = card?.activeSession?.balance || 0;
  const cardIdentifier = card?.physicalCardNumber || card?.qrToken || card?.id || '—';
  const customerName = card?.activeSession?.customerName;
  const customerPhone = card?.activeSession?.customerPhone;

  // Filter available cards for dropdown
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

  const effectiveTargetCardNumber = useMemo(() => {
    if (targetCardInput.trim()) return targetCardInput.trim().toUpperCase();
    if (selectedTargetCardId) {
      const found = availableCards.find((c) => c.id === selectedTargetCardId);
      return found?.physicalCardNumber || found?.qrToken || 'Selected Card';
    }
    return '';
  }, [targetCardInput, selectedTargetCardId, availableCards]);

  const handleClose = () => {
    if (isSubmitting) return;
    setSubmitError(null);
    setSelectedTargetCardId('');
    setTargetCardInput('');
    setTargetCardSearch('');
    setScannedFeedback(null);
    setCardEntryMethod('TYPE');
    onClose();
  };

  const handleCameraScan = (scannedText: string) => {
    const clean = extractWalletToken(scannedText);
    if (!clean) return;

    setTargetCardInput(clean);
    setScannedFeedback(`Scanned: ${clean}`);
    setCardEntryMethod('TYPE');

    // Check if matches available cards
    const matched = availableCards.find(
      (c) =>
        (c.physicalCardNumber && c.physicalCardNumber.toUpperCase() === clean) ||
        (c.qrToken && c.qrToken.toUpperCase() === clean)
    );
    if (matched) {
      setSelectedTargetCardId(matched.id);
    } else {
      setSelectedTargetCardId('');
    }
    notify.success(`Card ${clean} captured!`);
  };

  const handleSubmit = async () => {
    if (!card) return;
    setSubmitError(null);

    if (resolutionMode === 'REPLACE') {
      const targetIdentifier = targetCardInput.trim() || selectedTargetCardId;
      if (!targetIdentifier) {
        setSubmitError('Please scan, enter a card number, or select an available card.');
        return;
      }

      setIsSubmitting(true);
      try {
        let res = await apiService.cards.replaceCard(card.id, {
          targetCardId: targetIdentifier,
          reason: reasonNotes,
        });

        // If target replacement card is not yet registered in database, auto-create it and retry immediately
        if (
          !res.success &&
          ((res.error?.code as string) === 'TARGET_NOT_FOUND' ||
            res.error?.message?.toLowerCase().includes('not found') ||
            res.error?.message?.toLowerCase().includes('target replacement card'))
        ) {
          const createRes = await apiService.cards.createCard({
            physicalCardNumber: targetIdentifier.toUpperCase(),
          });

          if (createRes.success && createRes.data) {
            res = await apiService.cards.replaceCard(card.id, {
              targetCardId: createRes.data.id || targetIdentifier.toUpperCase(),
              reason: reasonNotes,
            });
          }
        }

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
        const res = await apiService.sessions.returnSession(card.activeSession.id, {
          paymentMethod: refundPaymentMethod,
        });
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
            {/* Mode A: Replace Card & Transfer Balance (Green Theme) */}
            <button
              type="button"
              onClick={() => {
                setResolutionMode('REPLACE');
                setSubmitError(null);
              }}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                resolutionMode === 'REPLACE'
                  ? 'border-emerald-500 bg-emerald-50/60 shadow-xs ring-2 ring-emerald-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <ArrowLeftRight className={`h-4 w-4 ${resolutionMode === 'REPLACE' ? 'text-emerald-700' : 'text-slate-500'}`} />
                    Replace Card & Transfer
                  </span>
                  {resolutionMode === 'REPLACE' && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed mb-2">
                  Issue a new card and migrate {formatCurrency(lockedBalance)} so customer can keep using it.
                </p>
              </div>
              <div className="pt-2 border-t border-emerald-100 flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Reflects in Blocked Returns</span>
              </div>
            </button>

            {/* Mode B: Cash Refund (Blue Theme) */}
            <button
              type="button"
              onClick={() => {
                setResolutionMode('REFUND');
                setSubmitError(null);
              }}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                resolutionMode === 'REFUND'
                  ? 'border-sky-500 bg-sky-50/60 shadow-xs ring-2 ring-sky-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <Banknote className={`h-4 w-4 ${resolutionMode === 'REFUND' ? 'text-sky-700' : 'text-slate-500'}`} />
                    Cash Refund & Settle
                  </span>
                  {resolutionMode === 'REFUND' && (
                    <CheckCircle2 className="h-4 w-4 text-sky-600" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed mb-2">
                  Pay {formatCurrency(lockedBalance)} back to customer in cash and close this wallet.
                </p>
              </div>
              <div className="pt-2 border-t border-sky-100 flex items-center gap-1 text-[10px] font-semibold text-sky-700">
                <span className="inline-block w-2 h-2 rounded-full bg-sky-500"></span>
                <span>Reflects in Refunds</span>
              </div>
            </button>
          </div>
        </div>

        {/* ── 3. Mode A: Select or Scan Target Card Details (Green) ── */}
        {resolutionMode === 'REPLACE' && (
          <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-800">
                  New Physical Card to Assign
                </label>
                <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Auto-registers if new
                </span>
              </div>

              {/* ── Entry Method Switcher: [Type] vs [Scan with Camera] ── */}
              <div className="flex items-center gap-1.5 p-1 bg-white rounded-lg border border-emerald-200 mb-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setCardEntryMethod('TYPE');
                  }}
                  className={`flex-1 py-1 px-2.5 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    cardEntryMethod === 'TYPE'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Keyboard className="h-3.5 w-3.5" />
                  <span>Type / USB Scanner</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCardEntryMethod('SCAN');
                  }}
                  className={`flex-1 py-1 px-2.5 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    cardEntryMethod === 'SCAN'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Camera className="h-3.5 w-3.5" />
                  <span>Scan with Camera</span>
                </button>
              </div>

              {/* ── Option 1: Live Camera Scanner ── */}
              {cardEntryMethod === 'SCAN' && (
                <div className="rounded-xl border border-emerald-300 bg-white p-3 space-y-2 mb-2 text-center animate-in fade-in">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-emerald-900 flex items-center gap-1">
                      <Camera className="h-4 w-4 text-emerald-600" />
                      Live Camera QR Scanner
                    </span>
                    <button
                      type="button"
                      onClick={() => setCardEntryMethod('TYPE')}
                      className="text-[11px] text-slate-500 hover:text-slate-800 underline"
                    >
                      Switch to Typing
                    </button>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950 flex justify-center max-h-56">
                    <CameraQrScanner
                      isActive={cardEntryMethod === 'SCAN'}
                      onScan={(text) => handleCameraScan(text)}
                      className="w-full"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Hold the new physical card up to your webcam. The QR code will scan automatically.
                  </p>
                </div>
              )}

              {/* ── Option 2: Type / USB Barcode Scanner Input ── */}
              {cardEntryMethod === 'TYPE' && (
                <div className="space-y-1.5 mb-2">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-emerald-600">
                      <Keyboard className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      placeholder="Type card number (e.g. KDVSUURS)..."
                      value={targetCardInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTargetCardInput(val);
                        setScannedFeedback(null);
                        // Check if matches available cards
                        const matched = availableCards.find(
                          (c) =>
                            (c.physicalCardNumber && c.physicalCardNumber.toUpperCase() === val.trim().toUpperCase()) ||
                            c.qrToken === val.trim()
                        );
                        if (matched) {
                          setSelectedTargetCardId(matched.id);
                        } else if (val.trim()) {
                          setSelectedTargetCardId('');
                        }
                      }}
                      className="w-full rounded-lg border border-emerald-300 bg-white pl-9 pr-20 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder:font-sans placeholder:text-slate-400"
                      autoFocus
                    />
                    {/* Quick Button to Launch Camera */}
                    <button
                      type="button"
                      onClick={() => setCardEntryMethod('SCAN')}
                      className="absolute inset-y-1 right-1 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-md text-[11px] font-bold flex items-center gap-1 border border-emerald-200 transition-colors"
                      title="Open Camera Scanner"
                    >
                      <Camera className="h-3 w-3" />
                      <span>Scan</span>
                    </button>
                  </div>

                  {scannedFeedback && (
                    <div className="flex items-center justify-between px-2.5 py-1 bg-emerald-100/70 border border-emerald-300 rounded-md text-[11px] text-emerald-800">
                      <span className="font-mono font-bold">{scannedFeedback}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setTargetCardInput('');
                          setScannedFeedback(null);
                        }}
                        className="text-emerald-700 hover:text-emerald-900 flex items-center gap-0.5 text-[10px]"
                      >
                        <RotateCcw className="h-3 w-3" /> Clear
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Or Select from Available Dropdown */}
              {filteredAvailableCards.length > 0 ? (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] text-slate-500 block">
                    Or choose from unassigned cards in stock ({filteredAvailableCards.length} available):
                  </span>
                  <select
                    value={selectedTargetCardId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedTargetCardId(id);
                      const found = availableCards.find((c) => c.id === id);
                      if (found) {
                        setTargetCardInput(found.physicalCardNumber || found.qrToken || '');
                        setScannedFeedback(null);
                      }
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-emerald-600"
                  >
                    <option value="">-- Choose from stock --</option>
                    {filteredAvailableCards.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.physicalCardNumber ? `Card ${c.physicalCardNumber}` : `QR ${c.qrToken}`}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-emerald-100/60 border border-emerald-200 text-emerald-900 text-[11px] flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    No pre-registered cards needed! Type or scan any physical card and it will be assigned automatically.
                  </span>
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
                  {effectiveTargetCardNumber || 'Not entered yet'}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-1 font-bold text-slate-900">
                <span>Migrated Balance:</span>
                <span className="font-mono text-emerald-700">{formatCurrency(lockedBalance)}</span>
              </div>
            </div>
          </div>
        )}

        {/* ── 4. Mode B: Cash Refund Details (Blue) ── */}
        {resolutionMode === 'REFUND' && (
          <div className="space-y-3 rounded-xl border border-sky-200 bg-sky-50/40 p-3.5">
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
                      ? 'border-sky-600 bg-sky-600 text-white shadow-xs'
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
                      ? 'border-purple-600 bg-purple-600 text-white shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  UPI Payout
                </button>
              </div>
            </div>

            <div className="rounded-lg bg-white border border-sky-200 p-2.5 text-[11px] text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span>Amount to Hand Over:</span>
                <span className="font-mono font-bold text-sky-700 text-sm">{formatCurrency(lockedBalance)}</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                This will settle the session, reduce the float balance by {formatCurrency(lockedBalance)}, and record a cash refund in the <strong>Refunds</strong> analytics card.
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
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || (resolutionMode === 'REPLACE' && !effectiveTargetCardNumber)}
          className={`px-4 py-2 rounded-lg text-xs font-bold text-white transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
            resolutionMode === 'REPLACE'
              ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-sm'
              : 'bg-sky-600 hover:bg-sky-700 active:bg-sky-800 shadow-sm'
          }`}
        >
          {isSubmitting
            ? 'Processing...'
            : resolutionMode === 'REPLACE'
            ? `Transfer ${formatCurrency(lockedBalance)} & Issue Card`
            : `Refund ${formatCurrency(lockedBalance)} & Close`}
        </button>
      </ModalFooter>
    </Modal>
  );
}
