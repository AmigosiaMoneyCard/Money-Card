import { useState, useMemo } from 'react';
import type { CardFleetAnalytics, CardFleetTrackItem } from '@/types';
import { Card, Badge } from '@/components/ui';
import { formatCurrency } from '@/utils';
import {
  CreditCard,
  Search,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Wallet,
  ShieldAlert,
} from 'lucide-react';

interface OrgAdminCardTrackerProps {
  cardFleet?: CardFleetAnalytics;
}

export function OrgAdminCardTracker({ cardFleet }: OrgAdminCardTrackerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubTab, setSelectedSubTab] = useState<'top' | 'dormant'>('top');

  const allCards = useMemo<CardFleetTrackItem[]>(() => {
    if (!cardFleet) return [];
    const map = new Map<string, CardFleetTrackItem>();
    [...cardFleet.topActiveCards, ...cardFleet.dormantCards].forEach((c) => {
      map.set(c.id, c);
    });
    return Array.from(map.values());
  }, [cardFleet]);

  const searchedCard = useMemo<CardFleetTrackItem | null>(() => {
    if (!searchQuery.trim() || allCards.length === 0) return null;
    const q = searchQuery.trim().toLowerCase();
    return (
      allCards.find(
        (c) =>
          c.cardNumber.toLowerCase() === q ||
          c.cardNumber.toLowerCase().includes(q) ||
          c.id.toLowerCase() === q,
      ) || null
    );
  }, [searchQuery, allCards]);

  if (!cardFleet) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
        <CreditCard className="mx-auto h-8 w-8 text-slate-400 mb-2" />
        <p className="font-semibold text-sm">No card fleet data available</p>
        <p className="text-xs text-slate-400 mt-1">Issue cards or complete transactions to see fleet analytics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── 1. Fleet Health Summary Cards ─── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="h-5 w-5 text-indigo-600" />
          <h2 className="text-base font-bold text-slate-900">Card Fleet Overview</h2>
          <span className="text-xs text-slate-500 hidden sm:inline">
            Real-time balance float, circulation, and card lifecycle metrics
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Total Float Balance */}
          <Card padding="md" className="border-slate-200 bg-white shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Customer Float Balance
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Wallet className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <p className="font-mono text-2xl font-bold text-emerald-700">
                {formatCurrency(cardFleet.totalFloatBalance)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Unspent customer money held across all active cards
              </p>
            </div>
          </Card>

          {/* Card 2: Cards in Circulation */}
          <Card padding="md" className="border-slate-200 bg-white shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Cards In Circulation
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <CreditCard className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <p className="font-mono text-2xl font-bold text-slate-900">
                {cardFleet.totalCardsInCirculation.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Active cards currently assigned to cafeteria customers
              </p>
            </div>
          </Card>

          {/* Card 3: Dormant Cards */}
          <Card padding="md" className="border-slate-200 bg-white shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Dormant Cards (&gt; 14 Days)
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <p className="font-mono text-2xl font-bold text-amber-700">
                {cardFleet.dormantCardsCount.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Cards with positive balance inactive for over 14 days
              </p>
            </div>
          </Card>

          {/* Card 4: Blocked & Vault Cards */}
          <Card padding="md" className="border-slate-200 bg-white shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Stock & Blocked Cards
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <ShieldAlert className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-3">
              <div>
                <p className="font-mono text-2xl font-bold text-slate-900">
                  {cardFleet.availableCardsCount}
                </p>
                <p className="text-[11px] text-slate-500">Available in stock</p>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div>
                <p className="font-mono text-2xl font-bold text-rose-600">
                  {cardFleet.blockedCardsCount}
                </p>
                <p className="text-[11px] text-rose-600 font-medium">Blocked cards</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ─── 2. Interactive Card Lookup & Audit Bar ─── */}
      <Card padding="md" className="border-slate-200 bg-gradient-to-r from-slate-50 via-white to-indigo-50/20">
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Direct Card Tracker & Audit</h3>
              <p className="text-xs text-slate-500">
                Enter any card number to view its live balance, lifetime spend, and favorite cafeteria counter.
              </p>
            </div>
            {/* Quick Sample Search Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-400 font-medium">Quick inspect:</span>
              {allCards.slice(0, 3).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSearchQuery(c.cardNumber)}
                  className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-white border border-slate-200 text-indigo-700 hover:border-indigo-300 cursor-pointer shadow-2xs transition-all"
                >
                  {c.cardNumber}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by card number (e.g., MC-001, MC 104)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 focus:outline-hidden"
            />
          </div>

          {/* Searched Card Result Card */}
          {searchedCard && (
            <div className="rounded-xl border border-indigo-200 bg-white p-4 shadow-sm space-y-3 mt-2 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 font-mono font-bold text-xs">
                    💳
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-bold text-slate-900">
                        {searchedCard.cardNumber}
                      </span>
                      <Badge
                        variant={
                          searchedCard.status === 'ACTIVE'
                            ? 'success'
                            : searchedCard.status === 'BLOCKED'
                            ? 'danger'
                            : 'default'
                        }
                        className="text-xs"
                      >
                        {searchedCard.status}
                      </Badge>
                      {searchedCard.isDormant && (
                        <Badge variant="warning" className="text-xs">
                          Dormant (&gt;14d)
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Most Active Counter: <span className="font-bold text-slate-700">Counter: {searchedCard.favoriteBranchName}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
                    Current Balance
                  </span>
                  <span className="font-mono text-xl font-bold text-emerald-700">
                    {formatCurrency(searchedCard.balance)}
                  </span>
                </div>
              </div>

              {/* Lifetime Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 pt-1">
                <div className="rounded-lg bg-slate-50 p-2.5">
                  <span className="text-[11px] text-slate-500 block font-medium">Lifetime Recharged</span>
                  <span className="font-mono text-sm font-bold text-emerald-700">
                    {formatCurrency(searchedCard.totalRecharged)}
                  </span>
                </div>
                <div className="rounded-lg bg-slate-50 p-2.5">
                  <span className="text-[11px] text-slate-500 block font-medium">Lifetime Spent</span>
                  <span className="font-mono text-sm font-bold text-indigo-700">
                    {formatCurrency(searchedCard.totalSpent)}
                  </span>
                </div>
                <div className="rounded-lg bg-slate-50 p-2.5">
                  <span className="text-[11px] text-slate-500 block font-medium">Total Transactions</span>
                  <span className="font-mono text-sm font-bold text-slate-800">
                    {searchedCard.transactionCount} txns
                  </span>
                </div>
                <div className="rounded-lg bg-slate-50 p-2.5">
                  <span className="text-[11px] text-slate-500 block font-medium">Last Active</span>
                  <span className="text-xs font-semibold text-slate-800 block truncate">
                    {searchedCard.lastUsedAt ? new Date(searchedCard.lastUsedAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* ─── 3. Top Active Spenders vs Dormant Cards ─── */}
      <Card padding="md">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedSubTab('top')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedSubTab === 'top'
                    ? 'bg-indigo-50 text-indigo-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <TrendingUp className="h-3.5 w-3.5" />
                <span>Top Spenders ({cardFleet.topActiveCards.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedSubTab('dormant')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedSubTab === 'dormant'
                    ? 'bg-amber-50 text-amber-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Dormant Cards ({cardFleet.dormantCards.length})</span>
              </button>
            </div>

            <span className="text-xs text-slate-400">
              {selectedSubTab === 'top'
                ? 'High-frequency cards driving cafeteria sales volume'
                : 'Cards with unspent money with no activity in over 14 days'}
            </span>
          </div>

          {/* Table List */}
          {selectedSubTab === 'top' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Card Number</th>
                    <th className="py-2.5 px-3">Favorite Counter</th>
                    <th className="py-2.5 px-3 text-right">Current Balance</th>
                    <th className="py-2.5 px-3 text-right">Lifetime Spent</th>
                    <th className="py-2.5 px-3 text-right">Txns</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cardFleet.topActiveCards.map((c: CardFleetTrackItem) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 flex items-center gap-2">
                        <CreditCard className="h-3.5 w-3.5 text-indigo-500" />
                        {c.cardNumber}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Counter: {c.favoriteBranchName}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-700">
                        {formatCurrency(c.balance)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                        {formatCurrency(c.totalSpent)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        {c.transactionCount}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge variant="success" className="text-[10px]">
                          {c.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {cardFleet.dormantCards.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-500 mb-1.5" />
                  <p className="font-semibold text-slate-800">No dormant cards detected</p>
                  <p className="text-slate-400 mt-0.5">All active cards have regular transaction activity.</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-3">Card Number</th>
                      <th className="py-2.5 px-3">Last Active Counter</th>
                      <th className="py-2.5 px-3 text-right">Unclaimed Balance</th>
                      <th className="py-2.5 px-3 text-right">Lifetime Spent</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cardFleet.dormantCards.map((c: CardFleetTrackItem) => (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900 flex items-center gap-2">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                          {c.cardNumber}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Counter: {c.favoriteBranchName}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-700">
                          {formatCurrency(c.balance)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                          {formatCurrency(c.totalSpent)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <Badge variant="warning" className="text-[10px]">
                            Dormant
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
