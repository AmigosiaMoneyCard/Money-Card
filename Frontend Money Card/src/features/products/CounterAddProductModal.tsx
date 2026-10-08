import { useState, useEffect, useRef, type FormEvent } from 'react';
import { Modal, ModalFooter, Button } from '@/components/ui';
import { apiService } from '@/services/api';
import { notify } from '@/utils';
import type { Branch } from '@/types';
import { Plus, AlertCircle } from 'lucide-react';

interface CounterAddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  branch: Branch | null;
  onSuccess: () => void;
}

export function CounterAddProductModal({
  isOpen,
  onClose,
  branch,
  onSuccess,
}: CounterAddProductModalProps) {
  const [itemName, setItemName] = useState('');
  const [price, setPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setItemName('');
      setPrice('');
      setApiError(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!branch) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = itemName.trim();
    if (!trimmedName) {
      setApiError('Please enter an item name');
      inputRef.current?.focus();
      return;
    }

    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      setApiError('Please enter a valid price greater than 0');
      return;
    }

    setIsSubmitting(true);
    setApiError(null);

    try {
      const res = await apiService.products.createProduct({
        itemName: trimmedName,
        price: Math.round(numPrice),
        category: ['General'],
        branchId: branch.id,
        status: 'ACTIVE',
      });

      if (!res.success) {
        setApiError(res.error.message || 'Failed to add menu item');
        return;
      }

      notify.success(`"${trimmedName}" (₹${Math.round(numPrice)}) added to ${branch.name}`);
      onClose();
      onSuccess();
    } catch {
      setApiError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isSubmitting && onClose()}
      title={`Add Menu — ${branch.name}`}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {apiError && (
          <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
            <span>{apiError}</span>
          </div>
        )}

        {/* Item Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Item Name <span className="text-rose-500">*</span>
          </label>
          <input
            ref={inputRef}
            type="text"
            placeholder="e.g. Chicken Wrap, Cold Coffee, Samosa"
            value={itemName}
            onChange={(e) => setItemName(e.target.value.slice(0, 40))}
            maxLength={40}
            disabled={isSubmitting}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden"
          />
        </div>

        {/* Price in ₹ */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Price (₹) <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-sm font-bold text-slate-400">₹</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="150"
              value={price}
              maxLength={7}
              onKeyDown={(e) => {
                if (['e', 'E', '+', '-', '.'].includes(e.key)) {
                  e.preventDefault();
                }
              }}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                if (val.length <= 7) {
                  setPrice(val);
                }
              }}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-slate-200 bg-white pl-7 pr-3 py-2 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden"
            />
          </div>
        </div>

        <ModalFooter>
          <Button
            variant="ghost"
            type="button"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            size="sm"
            isLoading={isSubmitting}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Add Menu
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
