import { useState, useMemo } from 'react';
import type { Card as CardEntity } from '@/types';
import { Modal, ModalFooter, Button } from '@/components/ui';
import { formatCurrency, notify } from '@/utils';
import { apiService } from '@/services/api';
import { CameraQrScanner } from '@/components/scanner/CameraQrScanner';
import {
  ArrowLeftRight,
  Banknote,
  AlertCircle,
  Camera,
  CreditCard,
  X,
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
  const [targetCardInput, setTargetCardInput] = useState('');
  const [selectedTargetCardId, setSelectedTargetCardId] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [refundPaymentMethod, setRefundPaymentMethod] = useState<'CASH' | 'UPI'>('CASH');
  const [reasonNotes, setReasonNotes] = useState('Damaged or lost card replaced');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const lockedBalance = card?.activeSession?.balance || 0;
  const cardIdentifier = card?.physicalCardNumber || card?.qrToken || card?.id || '—';
  const customerName = card?.activeSession?.customerName;
  const customerPhone = card?.activeSession?.customerPhone;

  // Filter available cards for optional dropdown
  const filteredAvailableCards = useMemo(() => {
    return availableCards.filter(
      (c) => c.id !== card?.id && c.status === 'AVAILABLE' && !c.activeSession
    );
  }, [availableCards, card?.id]);

  const effectiveTargetCardNumber = useMemo(() => {
    if (targetCardInput.trim()) return targetCardInput.trim().toUpperCase();
    if (selectedTargetCardId) {
      const found = availableCards.find((c) => c.id === selectedTargetCardId);
      return found?.physicalCardNumber || found?.qrToken || '';
    }
    return '';
  }, [targetCardInput, selectedTargetCardId, availableCards]);

  const handleClose = () => {
    if (isSubmitting) return;
    setSubmitError(null);
    setTargetCardInput('');
    setSelectedTargetCardId('');
    setIsCameraActive(false);
    onClose();
  };

  const handleCameraScan = (scannedText: string) => {
    const clean = extractWalletToken(scannedText);
    if (!clean) return;

    setTargetCardInput(clean);
    setIsCameraActive(false);

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
    notify.success(`Card ${clean} scanned!`);
  };

  const handleSubmit = async () => {
    if (!card) return;
    setSubmitError(null);

    if (resolutionMode === 'REPLACE') {
      const targetIdentifier = targetCardInput.trim() || selectedTargetCardId;
      if (!targetIdentifier) {
        setSubmitError('Please scan or type a replacement card number.');
        return;
      }

      setIsSubmitting(true);
      try {
        let res = await apiService.cards.replaceCard(card.id, {
          targetCardId: targetIdentifier,
          reason: reasonNotes,
        });

        // Auto-create on the fly if target card doesn't exist in backend yet
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
            `Wallet replaced! ${formatCurrency(lockedBalance)} migrated to ${targetIdentifier.toUpperCase()}.`
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
            `Wallet settled. ${formatCurrency(lockedBalance)} refunded via ${refundPaymentMethod}.`
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
      title={`Blocked: ${cardIdentifier}`}
      size="sm"
    >
      <div className="space-y-3.5 text-xs">
        {/* ── 1. Compact Balance Card ── */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Locked Balance
            </span>
            <span className="font-mono text-2xl font-black text-slate-900 leading-tight">
              {formatCurrency(lockedBalance)}
            </span>
            {(customerName || customerPhone) && (
              <span className="text-[11px] text-slate-600 block mt-0.5">
                {customerName || 'Customer'} {customerPhone ? `(${customerPhone})` : ''}
              </span>
            )}
          </div>
          <div className="h-9 w-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs">
            <CreditCard className="h-4 w-4" />
          </div>
        </div>

        {/* ── 2. Sleek Segmented Switcher (Replace vs Refund) ── */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setResolutionMode('REPLACE');
              setSubmitError(null);
            }}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              resolutionMode === 'REPLACE'
                ? 'bg-white text-emerald-700 shadow-2xs border border-emerald-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowLeftRight className="h-3.5 w-3.5 text-emerald-600" />
            <span>Replace Card</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setResolutionMode('REFUND');
              setIsCameraActive(false);
              setSubmitError(null);
            }}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              resolutionMode === 'REFUND'
                ? 'bg-white text-sky-700 shadow-2xs border border-sky-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Banknote className="h-3.5 w-3.5 text-sky-600" />
            <span>Cash Refund</span>
          </button>
        </div>

        {/* ── 3. REPLACE MODE: Minimal Card Entry ── */}
        {resolutionMode === 'REPLACE' && (
          <div className="space-y-2.5">
            {/* Live Camera Viewfinder (Toggles on-demand) */}
            {isCameraActive ? (
              <div className="rounded-xl border border-emerald-300 bg-slate-950 p-2.5 text-center space-y-2">
                <div className="flex items-center justify-between text-white">
                  <span className="text-[11px] font-bold flex items-center gap-1.5 text-emerald-400">
                    <Camera className="h-3.5 w-3.5" /> Point at physical card QR
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsCameraActive(false)}
                    className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="overflow-hidden rounded-lg max-h-48 flex justify-center">
                  <CameraQrScanner
                    isActive={isCameraActive}
                    onScan={handleCameraScan}
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  New Physical Card
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Type card number or scan..."
                    value={targetCardInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTargetCardInput(val);
                      const matched = availableCards.find(
                        (c) =>
                          (c.physicalCardNumber && c.physicalCardNumber.toUpperCase() === val.trim().toUpperCase()) ||
                          c.qrToken === val.trim()
                      );
                      setSelectedTargetCardId(matched ? matched.id : '');
                    }}
                    className="w-full rounded-lg border border-slate-300 bg-white pl-3 pr-20 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder:font-sans placeholder:font-normal placeholder:text-slate-400"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setIsCameraActive(true)}
                    className="absolute inset-y-1 right-1 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-md text-[11px] font-bold flex items-center gap-1 border border-emerald-200 transition-colors"
                    title="Scan card with camera"
                  >
                    <Camera className="h-3 w-3" />
                    <span>Scan</span>
                  </button>
                </div>
              </div>
            )}

            {/* Optional Stock Dropdown (Only if available cards exist) */}
            {filteredAvailableCards.length > 0 && !isCameraActive && (
              <div>
                <select
                  value={selectedTargetCardId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedTargetCardId(id);
                    const found = availableCards.find((c) => c.id === id);
                    if (found) {
                      setTargetCardInput(found.physicalCardNumber || found.qrToken || '');
                    }
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-[11px] font-mono text-slate-700 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Or select from stock ({filteredAvailableCards.length} available) --</option>
                  {filteredAvailableCards.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.physicalCardNumber ? `Card ${c.physicalCardNumber}` : `QR ${c.qrToken}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                Reason (Optional)
              </label>
              <input
                type="text"
                value={reasonNotes}
                onChange={(e) => setReasonNotes(e.target.value)}
                placeholder="e.g. Lost card replaced"
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        )}

        {/* ── 4. REFUND MODE: Minimal Payout ── */}
        {resolutionMode === 'REFUND' && (
          <div className="space-y-2.5">
            <label className="block text-[11px] font-bold text-slate-700">
              Payout Method
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRefundPaymentMethod('CASH')}
                className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors ${
                  refundPaymentMethod === 'CASH'
                    ? 'border-sky-600 bg-sky-600 text-white shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                Cash Payout
              </button>
              <button
                type="button"
                onClick={() => setRefundPaymentMethod('UPI')}
                className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors ${
                  refundPaymentMethod === 'UPI'
                    ? 'border-purple-600 bg-purple-600 text-white shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                UPI Payout
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Pay {formatCurrency(lockedBalance)} back to customer and close this session.
            </p>
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
            ? `Transfer ${formatCurrency(lockedBalance)}`
            : `Refund ${formatCurrency(lockedBalance)}`}
        </button>
      </ModalFooter>
    </Modal>
  );
}
