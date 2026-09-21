// ─── Permission Matrix Component (M6) ──────────────────────
// Streamlined 2-Role Permission Architecture:
// 1. Manager: Recharge Cards, card issuing, returns, sessions, counter operations.
// 2. Staff: Deduct Amount, POS checkout, menu view, scan cards (no recharge rights).

import type { Permission } from '@/types';
import { Check, X, Wallet, ShoppingCart } from 'lucide-react';
import { MANAGER_PERMISSIONS, STAFF_PERMISSIONS } from './constants';

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
  // Determine if the currently configured permissions correspond to Manager (has RECHARGE) or Staff
  const isManager =
    selectedPermissions.includes('RECHARGE') ||
    selectedPermissions.includes('STAFF_MANAGE') ||
    selectedPermissions.includes('CARD_ISSUE');

  const handleSelectRole = (role: 'MANAGER' | 'STAFF') => {
    if (readOnly || !onChange) return;
    if (role === 'MANAGER') {
      onChange(MANAGER_PERMISSIONS);
    } else {
      onChange(STAFF_PERMISSIONS);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3.5 sm:grid-cols-2">
        {/* ── ROLE 1: MANAGER ── */}
        <div
          role="button"
          tabIndex={readOnly ? -1 : 0}
          onClick={() => handleSelectRole('MANAGER')}
          onKeyDown={(e) => {
            if (!readOnly && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              handleSelectRole('MANAGER');
            }
          }}
          className={`flex flex-col justify-between p-4 rounded-xl border transition-all text-left select-none ${
            readOnly ? 'cursor-default' : 'cursor-pointer'
          } ${
            isManager
              ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500 shadow-xs'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                    isManager
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  <Wallet className="h-4 w-4" />
                </div>
                <h5 className="font-bold text-sm text-slate-900 leading-tight">Manager</h5>
              </div>

              {/* Radio Indicator */}
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full border transition-all ${
                  isManager
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-slate-300 bg-white'
                }`}
              >
                {isManager && <div className="h-2 w-2 rounded-full bg-white" />}
              </div>
            </div>

            <div className="mt-3.5 pt-3 border-t border-slate-200/80 space-y-1.5 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span className="font-semibold text-slate-800">Recharge Card Balances (Cash / UPI)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Issue & Activate New Cards</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Return / Settle Cards & Refunds</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Block / Unblock Compromised Cards</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>View Sessions & Counter Analytics</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Manage Products & Staff at Counter</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
            <span className="font-mono text-emerald-700 font-semibold">
              {MANAGER_PERMISSIONS.length} Permissions
            </span>
            {isManager && (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <Check className="h-3 w-3" /> Selected Role
              </span>
            )}
          </div>
        </div>

        {/* ── ROLE 2: STAFF ── */}
        <div
          role="button"
          tabIndex={readOnly ? -1 : 0}
          onClick={() => handleSelectRole('STAFF')}
          onKeyDown={(e) => {
            if (!readOnly && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              handleSelectRole('STAFF');
            }
          }}
          className={`flex flex-col justify-between p-4 rounded-xl border transition-all text-left select-none ${
            readOnly ? 'cursor-default' : 'cursor-pointer'
          } ${
            !isManager
              ? 'border-sky-500 bg-sky-50/40 ring-2 ring-sky-500 shadow-xs'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                    !isManager
                      ? 'bg-sky-600 text-white shadow-2xs'
                      : 'bg-sky-100 text-sky-800'
                  }`}
                >
                  <ShoppingCart className="h-4 w-4" />
                </div>
                <h5 className="font-bold text-sm text-slate-900 leading-tight">Staff</h5>
              </div>

              {/* Radio Indicator */}
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full border transition-all ${
                  !isManager
                    ? 'border-sky-600 bg-sky-600 text-white'
                    : 'border-slate-300 bg-white'
                }`}
              >
                {!isManager && <div className="h-2 w-2 rounded-full bg-white" />}
              </div>
            </div>

            <div className="mt-3.5 pt-3 border-t border-slate-200/80 space-y-1.5 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <Check className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                <span className="font-semibold text-slate-800">Deduct Card Amount (POS Checkout)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Check className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                <span className="font-semibold text-slate-800">Create & Edit Menu Products</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Check className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                <span>Add Food Products to Cart</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Check className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                <span>View Product Catalog & Prices</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Check className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                <span>Scan & View Customer Card Balance</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <X className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="line-through">Cannot recharge card balance</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <X className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="line-through">Cannot return cards or process refunds</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
            <span className="font-mono text-sky-700 font-semibold">
              {STAFF_PERMISSIONS.length} Permissions
            </span>
            {!isManager && (
              <span className="text-sky-700 font-bold flex items-center gap-1">
                <Check className="h-3 w-3" /> Selected Role
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
