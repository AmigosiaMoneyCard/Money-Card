import type { CardFleetAnalytics } from '@/types';
import { Card } from '@/components/ui';
import {
  CreditCard,
  CheckCircle2,
  Clock,
  ShieldAlert,
  AlertCircle,
} from 'lucide-react';

interface OrgAdminCardTrackerProps {
  cardFleet?: CardFleetAnalytics;
  closedCardsCount?: number;
  zeroBalanceActiveCardsCount?: number;
  activeCardsRechargeCount?: number;
  reRechargedCardsCount?: number;
}

export function OrgAdminCardTracker({
  cardFleet,
  closedCardsCount = 0,
  zeroBalanceActiveCardsCount = 0,
}: OrgAdminCardTrackerProps) {
  const totalInCirculation = cardFleet?.totalCardsInCirculation ?? 0;
  const blockedCount = cardFleet?.blockedCardsCount ?? 0;
  const inactiveCount = cardFleet?.dormantCardsCount ?? 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
      {/* Card 1: Active Cards */}
      <Card padding="md" className="border-slate-200 bg-white shadow-xs hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Active Cards
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <CreditCard className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2">
          <p className="font-mono text-2xl font-bold text-slate-900">
            {totalInCirculation.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-slate-500 leading-snug">
            In customer hands
          </p>
        </div>
      </Card>

      {/* Card 2: Settled Cards */}
      <Card padding="md" className="border-slate-200 bg-white shadow-xs hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Settled Cards
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2">
          <p className="font-mono text-2xl font-bold text-slate-900">
            {closedCardsCount.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-slate-500 leading-snug">
            Completed card sessions
          </p>
        </div>
      </Card>

      {/* Card 3: Blocked Cards */}
      <Card padding="md" className="border-slate-200 bg-white shadow-xs hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Blocked Cards
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
            <ShieldAlert className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2">
          <p className="font-mono text-2xl font-bold text-rose-600">
            {blockedCount.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-slate-500 leading-snug">
            Locked due to security / loss
          </p>
        </div>
      </Card>

      {/* Card 4: Zero Balance Cards */}
      <Card padding="md" className="border-slate-200 bg-white shadow-xs hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Zero Balance
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <AlertCircle className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2">
          <p className="font-mono text-2xl font-bold text-amber-700">
            {zeroBalanceActiveCardsCount.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-slate-500 leading-snug">
            In use with ₹0 balance
          </p>
        </div>
      </Card>

      {/* Card 5: Inactive Cards */}
      <Card padding="md" className="border-slate-200 bg-white shadow-xs hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Inactive Cards
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
            <Clock className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2">
          <p className="font-mono text-2xl font-bold text-orange-700">
            {inactiveCount.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-slate-500 leading-snug">
            Unused balance &gt; 2 days
          </p>
        </div>
      </Card>
    </div>
  );
}
