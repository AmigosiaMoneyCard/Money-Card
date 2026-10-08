import { useState } from 'react';
import type { CardFleetAnalytics } from '@/types';
import { Card } from '@/components/ui';
import {
  CreditCard,
  CheckCircle2,
  Clock,
  Lock,
  ShieldAlert,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';

interface OrgAdminCardTrackerProps {
  cardFleet?: CardFleetAnalytics;
  blockedCardsCount?: number;
  blockedBalance?: number;
  closedCardsCount?: number;
  zeroBalanceActiveCardsCount?: number;
  activeCardsRechargeCount?: number;
  reRechargedCardsCount?: number;
}

export function OrgAdminCardTracker({
  cardFleet,
  blockedCardsCount,
  blockedBalance,
  closedCardsCount = 0,
  zeroBalanceActiveCardsCount = 0,
}: OrgAdminCardTrackerProps) {
  const totalInCirculation = cardFleet?.totalCardsInCirculation ?? 0;
  const blockedCount = blockedCardsCount ?? cardFleet?.blockedCardsCount ?? 0;
  const effectiveBlockedBalance = blockedBalance ?? cardFleet?.blockedBalance ?? 0;
  const inactiveCount = cardFleet?.dormantCardsCount ?? 0;

  const [showSettled, setShowSettled] = useState(false);
  const [showBlocked, setShowBlocked] = useState(false);
  const [showBlockedBalance, setShowBlockedBalance] = useState(false);
  const [showZeroBalance, setShowZeroBalance] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
      {/* Card 1: Active Wallets (Always visible) */}
      <Card padding="md" className="border-slate-200 bg-white shadow-xs hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Active Wallets
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <CreditCard className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2">
          <p className="font-mono text-2xl font-bold text-slate-900">
            {totalInCirculation.toLocaleString()}
          </p>
        </div>
      </Card>

      {/* Card 2: Settled Wallets */}
      <Card padding="md" className="border-slate-200 bg-white shadow-xs hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Settled Wallets
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowSettled((prev) => !prev)}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
              title={showSettled ? 'Hide Settled' : 'Show Settled'}
            >
              {showSettled ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              <span>{showSettled ? 'Hide' : 'Show'}</span>
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
        </div>
        <div className="mt-2">
          <p className="font-mono text-2xl font-bold text-slate-900">
            {showSettled ? closedCardsCount.toLocaleString() : '••••••'}
          </p>
        </div>
      </Card>

      {/* Card 3: Blocked Wallets */}
      <Card padding="md" className="border-slate-200 bg-white shadow-xs hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Blocked Wallets
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowBlocked((prev) => !prev)}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
              title={showBlocked ? 'Hide Blocked' : 'Show Blocked'}
            >
              {showBlocked ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              <span>{showBlocked ? 'Hide' : 'Show'}</span>
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
        </div>
        <div className="mt-2">
          <p className="font-mono text-2xl font-bold text-rose-600">
            {showBlocked ? blockedCount.toLocaleString() : '••••••'}
          </p>
        </div>
      </Card>

      {/* Card 4: Blocked Balance */}
      <Card padding="md" className="border-slate-200 bg-white shadow-xs hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Blocked Balance
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowBlockedBalance((prev) => !prev)}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
              title={showBlockedBalance ? 'Hide Blocked Balance' : 'Show Blocked Balance'}
            >
              {showBlockedBalance ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              <span>{showBlockedBalance ? 'Hide' : 'Show'}</span>
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
              <Lock className="h-4 w-4" />
            </div>
          </div>
        </div>
        <div className="mt-2">
          <p className="font-mono text-2xl font-bold text-rose-600">
            {showBlockedBalance ? formatCurrency(effectiveBlockedBalance) : '••••••'}
          </p>
        </div>
      </Card>

      {/* Card 5: Zero Balance Wallets */}
      <Card padding="md" className="border-slate-200 bg-white shadow-xs hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Zero Balance Wallets
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowZeroBalance((prev) => !prev)}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors cursor-pointer"
              title={showZeroBalance ? 'Hide Zero Balance' : 'Show Zero Balance'}
            >
              {showZeroBalance ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              <span>{showZeroBalance ? 'Hide' : 'Show'}</span>
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
        </div>
        <div className="mt-2">
          <p className="font-mono text-2xl font-bold text-amber-700">
            {showZeroBalance ? zeroBalanceActiveCardsCount.toLocaleString() : '••••••'}
          </p>
        </div>
      </Card>

      {/* Card 6: Inactive Wallets */}
      <Card padding="md" className="border-slate-200 bg-white shadow-xs hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Inactive Wallets
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowInactive((prev) => !prev)}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 transition-colors cursor-pointer"
              title={showInactive ? 'Hide Inactive' : 'Show Inactive'}
            >
              {showInactive ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              <span>{showInactive ? 'Hide' : 'Show'}</span>
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
        </div>
        <div className="mt-2">
          <p className="font-mono text-2xl font-bold text-orange-700">
            {showInactive ? inactiveCount.toLocaleString() : '••••••'}
          </p>
        </div>
      </Card>
    </div>
  );
}
