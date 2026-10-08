import { useState } from 'react';
import type { Card as CardEntity } from '@/types';
import { Button, Modal, ModalFooter } from '@/components/ui';
import { apiService } from '@/services/api';
import { notify, formatCurrency } from '@/utils';
import { ShieldAlert, AlertTriangle } from 'lucide-react';

interface BlockCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: CardEntity | null;
  onSuccess: () => void;
  currentUserName?: string;
}

const BLOCK_REASONS = [
  'Lost or Stolen Wallet',
  'Damaged Card / Hardware Fault',
  'Suspicious Activity / Fraud',
  'Customer Request',
  'Staff Discretion',
  'Other Reason',
];

export function BlockCardModal({
  isOpen,
  onClose,
  card,
  onSuccess,
  currentUserName,
}: BlockCardModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>('Lost or Stolen Wallet');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!card) return null;

  const cardIdentifier = card.physicalCardNumber || card.qrToken || card.id;
  const balance = card.activeSession?.balance ?? 0;
  const customerName = card.activeSession?.customerName;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!card) return;

    setIsSubmitting(true);
    try {
      const blockerName = currentUserName?.trim() || 'Manager';
      const cleanReason = selectedReason.trim();
      const cleanNotes = notes.trim();

      const finalReason = cleanNotes
        ? `Blocked by ${blockerName} - ${cleanReason}: ${cleanNotes}`
        : `Blocked by ${blockerName} - ${cleanReason}`;

      const res = await apiService.cards.blockCard(card.id, finalReason);

      if (res.success) {
        notify.success(`Wallet ${cardIdentifier} blocked successfully.`);
        onSuccess();
        onClose();
      } else {
        notify.error(res.error?.message || 'Failed to block wallet.');
      }
    } catch {
      notify.error('Network error while blocking wallet.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSubmitting ? () => {} : onClose}
      title={`Block Wallet — ${cardIdentifier}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 space-y-1">
            <p className="font-semibold text-amber-900">
              Are you sure you want to block this wallet?
            </p>
            <p className="text-amber-700 leading-relaxed">
              This will immediately deactivate the wallet. Purchases, recharges, and public portal access will be locked until an administrator unblocks it.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1 font-mono text-[11px] text-amber-900">
              {customerName && (
                <span>Customer: <strong className="font-sans">{customerName}</strong></span>
              )}
              <span>Locked Balance: <strong>{formatCurrency(balance)}</strong></span>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 block">
            Reason for Blocking <span className="text-rose-500">*</span>
          </label>
          <select
            value={selectedReason}
            onChange={(e) => setSelectedReason(e.target.value)}
            disabled={isSubmitting}
            className="w-full text-xs font-medium rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 cursor-pointer"
          >
            {BLOCK_REASONS.map((reason) => (
              <option key={reason} value={reason}>
                {reason}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 block">
            Additional Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Misplaced card at counter, reported by customer..."
            disabled={isSubmitting}
            rows={2}
            className="w-full text-xs font-normal rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none"
          />
        </div>

        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs px-4"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="danger"
            size="sm"
            isLoading={isSubmitting}
            leftIcon={<ShieldAlert className="h-3.5 w-3.5" />}
            className="text-xs px-4 bg-rose-600 hover:bg-rose-700 text-white font-semibold cursor-pointer"
          >
            Confirm Block
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
