// ─── User Portal Recharge History Page (M11) ───────────────────
// Displays recharge history for the current session.

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiService } from '@/services/api';
import type { PublicTransaction } from '@/types';
import {
  Card,
  LoadingState,
  EmptyState,
  ErrorState,
} from '@/components/ui';
import { formatDateTime, formatCurrency } from '@/utils';
import {
  ArrowLeft,
  History,
  ArrowDownLeft,
  RotateCcw,
} from 'lucide-react';

export function PortalTransactionsPage() {
  const navigate = useNavigate();
  const sessionToken = typeof window !== 'undefined'
    ? sessionStorage.getItem('moneycard_portal_session_token')
    : null;

  const [transactions, setTransactions] = useState<PublicTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async (isSilent = false) => {
    if (!sessionToken) {
      if (!isSilent) setIsLoading(false);
      return;
    }

    if (!isSilent) setIsLoading(true);
    setError(null);
    try {
      const res = await apiService.userPortal.getPublicSessionTransactions(sessionToken);

      if (!res.success) {
        if (!isSilent) setError(res.error.message || 'Failed to load recharge history');
        return;
      }

      setTransactions(res.data);
    } catch {
      if (!isSilent) setError('Unable to connect to server. Please try again.');
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, [sessionToken]);

  useEffect(() => {
    if (!sessionToken) return;

    // Initial load
    fetchTransactions(false);

    // 2-second real-time polling while app/tab is active and visible
    const pollInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchTransactions(true);
      }
    }, 2000);

    const handleVisibilityOrFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchTransactions(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [sessionToken, fetchTransactions]);

  if (!sessionToken) {
    navigate('/portal', { replace: true });
    return null;
  }

  const rechargeTransactions = transactions.filter(
    (txn) =>
      txn.type === 'RECHARGE' ||
      txn.type === 'RECHARGE_CASH' ||
      txn.type === 'RECHARGE_UPI' ||
      String(txn.type).includes('RECHARGE')
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/portal/session"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 shadow-sm"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Recharge History</h1>
        </div>
      </div>

      {isLoading ? (
        <LoadingState message="Loading recharge history..." />
      ) : error ? (
        <ErrorState title="Failed to load history" message={error} onRetry={fetchTransactions} />
      ) : rechargeTransactions.length === 0 ? (
        <EmptyState
          icon={<History className="h-8 w-8 text-slate-500" />}
          title="No recharges recorded"
          description="Your wallet recharge top-ups will appear here."
        />
      ) : (
        <div className="space-y-3">
          {rechargeTransactions.map((txn) => {
            const isCancelled = txn.status === 'CANCELLED' || Boolean((txn.items as any)?.isCancelled);

            return (
              <Card key={txn.id} padding="sm" className="space-y-3">
                <div className="w-full flex items-center justify-between text-left">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        isCancelled
                          ? 'bg-rose-50 text-rose-600'
                          : 'bg-emerald-50 text-emerald-600'
                      }`}
                    >
                      {isCancelled ? <RotateCcw className="h-5 w-5" /> : <ArrowDownLeft className="h-5 w-5" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">
                          {txn.paymentMethod ? `Recharge (${txn.paymentMethod})` : 'Recharge'}
                        </span>
                        {isCancelled && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-100 text-rose-700">
                            Cancelled
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{formatDateTime(txn.timestamp)}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    {isCancelled ? (
                      <p className="font-mono text-sm font-semibold text-slate-400 line-through">
                        {formatCurrency(txn.amount)}
                      </p>
                    ) : (
                      <p className="font-mono text-sm font-bold text-emerald-600">
                        +{formatCurrency(txn.amount)}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
