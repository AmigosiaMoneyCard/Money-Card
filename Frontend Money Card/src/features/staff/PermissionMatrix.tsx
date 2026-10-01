// ─── Permission Matrix Component (M6) ──────────────────────
// Streamlined Permission Architecture:
// Manager Only: Recharge Cards, card issuing, returns, sessions, counter operations, staff & inventory management.

import { useEffect } from 'react';
import type { Permission } from '@/types';
import { Check, Wallet } from 'lucide-react';
import { MANAGER_PERMISSIONS } from './constants';

interface PermissionMatrixProps {
  selectedPermissions: Permission[];
  onChange?: (permissions: Permission[]) => void;
  readOnly?: boolean;
}

export function PermissionMatrix({
  selectedPermissions,
  onChange,
  readOnly = false,
}: PermissionMatrixProps) {
  // Ensure Manager permissions are selected by default if not already set
  useEffect(() => {
    if (!readOnly && onChange) {
      const hasAllManager = MANAGER_PERMISSIONS.every((p) => selectedPermissions.includes(p));
      if (!hasAllManager) {
        onChange(MANAGER_PERMISSIONS);
      }
    }
  }, [readOnly, onChange, selectedPermissions]);

  const handleSelectManager = () => {
    if (readOnly || !onChange) return;
    onChange(MANAGER_PERMISSIONS);
  };

  return (
    <div className="space-y-4">
      <div className="w-full">
        {/* ── ROLE: MANAGER (ONLY ROLE REQUIRED) ── */}
        <div
          role="button"
          tabIndex={readOnly ? -1 : 0}
          onClick={handleSelectManager}
          onKeyDown={(e) => {
            if (!readOnly && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              handleSelectManager();
            }
          }}
          className={`flex flex-col justify-between p-5 rounded-xl border transition-all text-left select-none ${
            readOnly ? 'cursor-default' : 'cursor-pointer'
          } border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500 shadow-xs`}
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-2xs">
                  <Wallet className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h5 className="font-bold text-sm text-slate-900 leading-tight">Counter Manager</h5>
                  <p className="text-[11px] text-slate-500">Full counter operations, cashier POS, and team management</p>
                </div>
              </div>

              {/* Radio Indicator */}
              <div className="flex h-5 w-5 items-center justify-center rounded-full border border-emerald-600 bg-emerald-600 text-white">
                <div className="h-2 w-2 rounded-full bg-white" />
              </div>
            </div>

            <div className="mt-3.5 pt-3.5 border-t border-slate-200/80 grid gap-2 sm:grid-cols-2 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span className="font-semibold text-slate-800">Recharge Wallet Balances (Cash / UPI)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Issue & Activate New Wallets</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Return / Settle Wallets & Refunds</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Block / Unblock Compromised Wallets</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>POS Purchase & Cart Checkout</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>View Sessions & Counter Analytics</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Manage Products & Menu Catalog</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Manage & Delete Staff at Counter</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
            <span className="font-mono text-emerald-700 font-semibold">
              {MANAGER_PERMISSIONS.length} Permissions Granted
            </span>
            <span className="text-emerald-700 font-bold flex items-center gap-1">
              <Check className="h-3 w-3" /> Active Role (Manager Only)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
