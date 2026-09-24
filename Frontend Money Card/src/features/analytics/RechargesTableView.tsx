import { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  DollarSign,
  Search,
  RotateCcw,
  Calendar,
  XCircle,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { Card, Badge, Button, Input, Modal, ModalFooter } from '@/components/ui';
import { formatCurrency } from '@/utils/formatters';
import { apiService } from '@/services/api';
import type { RechargeTransaction, RechargesSummary } from '@/types';

interface RechargesTableViewProps {
  branchId?: string;
}

export function RechargesTableView({ branchId }: RechargesTableViewProps) {
  const [recharges, setRecharges] = useState<RechargeTransaction[]>([]);
  const [summary, setSummary] = useState<RechargesSummary>({
    totalCount: 0,
    totalVolume: 0,
    upiCount: 0,
    upiVolume: 0,
    cashCount: 0,
    cashVolume: 0,
    cancelledCount: 0,
    cancelledVolume: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState('TODAY');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'UPI' | 'CASH'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'CANCELLED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Cancellation Modal state
  const [cancellingTx, setCancellingTx] = useState<RechargeTransaction | null>(null);
  const [cancelReason, setCancelReason] = useState('Wrong Amount Entered');
  const [customReason, setCustomReason] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const getDatesForFilter = useCallback((filter: string) => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (filter === 'TODAY') {
      const today = toDateStr(now);
      return { start: today, end: today };
    }
    if (filter === 'YESTERDAY') {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const str = toDateStr(yesterday);
      return { start: str, end: str };
    }
    if (filter === 'LAST_7_DAYS') {
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      return { start: toDateStr(start), end: toDateStr(now) };
    }
    if (filter === 'LAST_30_DAYS') {
      const start = new Date(now);
      start.setDate(start.getDate() - 29);
      return { start: toDateStr(start), end: toDateStr(now) };
    }
    if (filter === 'THIS_MONTH') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: toDateStr(start), end: toDateStr(now) };
    }
    if (filter === 'CUSTOM') {
      return { start: customStartDate, end: customEndDate };
    }
    return {};
  }, [customStartDate, customEndDate]);

  const loadRecharges = useCallback(async () => {
    setIsLoading(true);
    try {
      const dateParams = getDatesForFilter(dateFilter);
      const params: any = {
        page,
        limit: 20,
      };
      if (branchId) params.branchId = branchId;
      if (dateParams.start) params.startDate = dateParams.start;
      if (dateParams.end) params.endDate = dateParams.end;
      if (paymentFilter !== 'ALL') params.paymentMethod = paymentFilter;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await apiService.sessions.listRecharges(params);
      if (res.success && res.data) {
        setRecharges(res.data.transactions);
        setSummary(res.data.summary);
        setTotalPages(res.data.totalPages || 1);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [branchId, dateFilter, getDatesForFilter, paymentFilter, statusFilter, searchQuery, page]);

  useEffect(() => {
    loadRecharges();
  }, [loadRecharges]);

  const handleResetToToday = () => {
    setDateFilter('TODAY');
    setPaymentFilter('ALL');
    setStatusFilter('ALL');
    setSearchQuery('');
    setPage(1);
  };

  const handleConfirmCancel = async () => {
    if (!cancellingTx) return;
    setIsSubmittingCancel(true);
    setCancelError(null);

    const finalReason = cancelReason === 'Other Reason'
      ? (customReason.trim() || 'Other Reason')
      : cancelReason;

    try {
      const res = await apiService.sessions.cancelRecharge(cancellingTx.id, finalReason);
      if (res.success) {
        setCancellingTx(null);
        setCustomReason('');
        loadRecharges();
      } else {
        setCancelError(res.error?.message || 'Failed to cancel top-up');
      }
    } catch (e: any) {
      setCancelError(e.message || 'Failed to cancel top-up');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── 1. Side-by-Side UPI & Cash Boxes ─── */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* Online UPI Money */}
        <div className="rounded-2xl border border-purple-200 bg-purple-50/40 p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                <CreditCard className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">UPI Recharge</h3>
                <p className="text-xs text-slate-500">QR Code & Banking Apps</p>
              </div>
            </div>
            <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700">
              {summary.upiCount} top-ups
            </span>
          </div>
          <div className="mt-4">
            <p className="font-mono text-3xl sm:text-4xl font-black text-purple-700">
              {formatCurrency(summary.upiVolume)}
            </p>
            <p className="mt-1 text-xs text-slate-500">Credited automatically via bank transfer</p>
          </div>
        </div>

        {/* Cash Money */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <DollarSign className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Cash Recharge</h3>
                <p className="text-xs text-slate-500">Cash Register Counter</p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
              {summary.cashCount} top-ups
            </span>
          </div>
          <div className="mt-4">
            <p className="font-mono text-3xl sm:text-4xl font-black text-emerald-700">
              {formatCurrency(summary.cashVolume)}
            </p>
            <p className="mt-1 text-xs text-slate-500">Physical notes and coins collected</p>
          </div>
        </div>
      </div>

      {/* ─── 2. Search, Date Dropdown, Chips & Reset ─── */}
      <Card padding="md" className="border-slate-200 bg-white shadow-xs">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative min-w-[240px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search Card ID, Customer Name, Mobile..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-4 text-sm text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Date Filter Dropdown */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-xs">
                <Calendar className="h-4 w-4 text-slate-400" />
                <select
                  value={dateFilter}
                  onChange={(e) => {
                    setDateFilter(e.target.value);
                    setPage(1);
                  }}
                  className="bg-transparent font-medium text-slate-800 outline-none cursor-pointer"
                >
                  <option value="TODAY">Today</option>
                  <option value="YESTERDAY">Yesterday</option>
                  <option value="LAST_7_DAYS">Last 7 Days</option>
                  <option value="LAST_30_DAYS">Last 30 Days</option>
                  <option value="THIS_MONTH">This Month</option>
                  <option value="CUSTOM">Custom Range</option>
                </select>
              </div>

              {/* Reset to Today Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetToToday}
                className="gap-1.5 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Reset to Today</span>
              </Button>
            </div>
          </div>

          {/* Custom Date Inputs if CUSTOM selected */}
          {dateFilter === 'CUSTOM' && (
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-500 uppercase">Custom Dates:</span>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          {/* Filter Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-400 mr-1 uppercase">Filter By:</span>
            {/* Payment Method Chips */}
            <button
              type="button"
              onClick={() => { setPaymentFilter('ALL'); setPage(1); }}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                paymentFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Modes
            </button>
            <button
              type="button"
              onClick={() => { setPaymentFilter('UPI'); setPage(1); }}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                paymentFilter === 'UPI'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
              }`}
            >
              📱 Online UPI
            </button>
            <button
              type="button"
              onClick={() => { setPaymentFilter('CASH'); setPage(1); }}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                paymentFilter === 'CASH'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              💵 Cash
            </button>

            <span className="mx-2 text-slate-300">|</span>

            {/* Status Chips */}
            <button
              type="button"
              onClick={() => { setStatusFilter('ALL'); setPage(1); }}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Status
            </button>
            <button
              type="button"
              onClick={() => { setStatusFilter('ACTIVE'); setPage(1); }}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                statusFilter === 'ACTIVE'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => { setStatusFilter('CANCELLED'); setPage(1); }}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                statusFilter === 'CANCELLED'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              Cancelled ({summary.cancelledCount})
            </button>
          </div>
        </div>
      </Card>

      {/* ─── 3. Recharges Data Table (Responsive Wrapper) ─── */}
      <Card padding="none" className="overflow-hidden border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 min-w-[700px]">
            <thead className="border-b border-slate-100 bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-3.5">Date & Time</th>
                <th className="px-6 py-3.5">Card / Customer</th>
                <th className="px-6 py-3.5">Amount & Mode</th>
                <th className="px-6 py-3.5">Staff Member</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin text-emerald-600 mb-2" />
                    Loading recharges...
                  </td>
                </tr>
              ) : recharges.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No recharges found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                recharges.map((tx) => {
                  const isUpi = tx.paymentMethod === 'UPI';
                  return (
                    <tr
                      key={tx.id}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        tx.isCancelled ? 'bg-slate-50/40 opacity-75' : ''
                      }`}
                    >
                      <td className="px-6 py-4 font-mono text-xs text-slate-500 whitespace-nowrap">
                        {formatDate(tx.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">
                          {tx.cardNumber || tx.sessionId.slice(-6)}
                        </div>
                        {tx.customerName && (
                          <div className="text-xs text-slate-500">
                            {tx.customerName} {tx.customerPhone ? `(${tx.customerPhone})` : ''}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono text-base font-bold ${
                              tx.isCancelled ? 'line-through text-slate-400' : 'text-slate-900'
                            }`}
                          >
                            {formatCurrency(tx.amount)}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                              isUpi
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isUpi ? 'UPI' : 'CASH'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600 whitespace-nowrap">
                        {tx.staffName || 'Counter Staff'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {tx.isCancelled ? (
                          <div>
                            <Badge variant="danger">CANCELLED</Badge>
                            {tx.cancellationReason && (
                              <div className="text-xs text-rose-600 mt-0.5">
                                {tx.cancellationReason}
                              </div>
                            )}
                          </div>
                        ) : (
                          <Badge variant="success">ACTIVE</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        {!tx.isCancelled ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCancellingTx(tx)}
                            className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 gap-1 rounded-lg"
                          >
                            <XCircle className="h-4 w-4" />
                            <span>Cancel Top-up</span>
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Reversed</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3 text-xs text-slate-500">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ─── 4. Cancel Top-up Confirmation Modal ─── */}
      {cancellingTx && (
        <Modal
          isOpen={!!cancellingTx}
          onClose={() => {
            if (!isSubmittingCancel) {
              setCancellingTx(null);
              setCancelError(null);
            }
          }}
          title="Cancel Top-up & Deduct Balance"
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 text-sm text-rose-800">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-rose-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold text-rose-900">Are you sure you want to cancel this top-up?</p>
                  <p className="mt-1 text-xs text-rose-700">
                    Amount of <strong className="font-mono">{formatCurrency(cancellingTx.amount)}</strong> will be
                    immediately deducted from the card balance.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Transaction ID:</span>
                <span className="font-mono font-semibold">{cancellingTx.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Card:</span>
                <span className="font-semibold">{cancellingTx.cardNumber || cancellingTx.sessionId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Mode:</span>
                <span className="font-semibold">{cancellingTx.paymentMethod || 'CASH'}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Select Cancellation Reason:
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="Wrong Amount Entered">Wrong Amount Entered</option>
                <option value="Customer Changed Mind">Customer Changed Mind</option>
                <option value="Duplicate Scan">Duplicate Scan</option>
                <option value="Payment Failed">Payment Failed</option>
                <option value="Other Reason">Other Reason</option>
              </select>
            </div>

            {cancelReason === 'Other Reason' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Specify Reason:
                </label>
                <Input
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Enter specific explanation..."
                />
              </div>
            )}

            {cancelError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                {cancelError}
              </div>
            )}
          </div>

          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCancellingTx(null);
                setCancelError(null);
              }}
              disabled={isSubmittingCancel}
            >
              Never Mind
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmCancel}
              isLoading={isSubmittingCancel}
            >
              Confirm Cancellation
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}
