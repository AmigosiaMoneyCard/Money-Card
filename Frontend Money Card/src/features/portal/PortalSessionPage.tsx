import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiService } from '@/services/api';
import type { PublicSessionDetail, PublicSessionOrder, PublicMenuItem } from '@/types';
import {
  Card,
  Badge,
  Button,
  LoadingState,
  ErrorState,
} from '@/components/ui';
import { CameraQrScanner } from '@/components/scanner/CameraQrScanner';
import { PwaInstallBanner } from '@/components/pwa/PwaInstallBanner';
import { useCardBalanceStream } from './useCardBalanceStream';
import { formatDate, formatCurrency } from '@/utils';
import {
  Building2,
  Clock,
  History,
  Receipt,
  LogOut,
  CheckCircle2,
  QrCode,
  Camera,
  ShieldAlert,
  User,
  Sparkles,
  AlertTriangle,
  ChefHat,
  UtensilsCrossed,
  X,
} from 'lucide-react';


function checkIsStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    document.referrer.includes('android-app://') ||
    window.location.search.includes('source=pwa')
  );
}

export function PortalSessionPage() {
  const navigate = useNavigate();
  const [sessionToken, setSessionToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem('moneycard_portal_session_token');
  });

  const [sessionDetail, setSessionDetail] = useState<PublicSessionDetail | null>(null);
  const [orders, setOrders] = useState<PublicSessionOrder[]>([]);
  const [menuItems, setMenuItems] = useState<PublicMenuItem[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);
  const [menuSearch, setMenuSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStandalone, setIsStandalone] = useState(checkIsStandalone);
  const [bypassInstall, setBypassInstall] = useState(false);

  useEffect(() => {
    // Clear any persistent localStorage tokens so every PWA launch prompts to scan QR code
    try {
      localStorage.removeItem('moneycard_portal_session_token');
      localStorage.removeItem('moneycard_portal_card_number');
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsStandalone(true);
      }
    };
    mediaQuery.addEventListener?.('change', handleChange);
    return () => {
      mediaQuery.removeEventListener?.('change', handleChange);
    };
  }, []);

  // In-browser scanner states
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const fetchOrders = useCallback(async (tokenOverride?: string) => {
    const activeToken = tokenOverride || sessionToken;
    if (!activeToken) return;
    try {
      const res = await apiService.userPortal.getPublicSessionOrders(activeToken);
      if (res.success && Array.isArray(res.data)) {
        setOrders(res.data);
      }
    } catch {
      // silent poll failure
    }
  }, [sessionToken]);

  const fetchMenu = useCallback(async (tokenOverride?: string) => {
    const activeToken = tokenOverride || sessionToken;
    if (!activeToken) return;
    setIsLoadingMenu(true);
    try {
      const res = await apiService.userPortal.getPublicSessionMenu(activeToken);
      if (res.success && Array.isArray(res.data)) {
        setMenuItems(res.data);
      }
    } catch {
      // silent
    } finally {
      setIsLoadingMenu(false);
    }
  }, [sessionToken]);

  const fetchSessionDetail = useCallback(async (tokenOverride?: string, isSilent = false) => {
    const activeToken = tokenOverride || sessionToken;
    if (!activeToken) {
      if (!isSilent) setIsLoading(false);
      return;
    }

    if (!isSilent) setIsLoading(true);
    setError(null);
    try {
      const res = await apiService.userPortal.getPublicSessionDetail(activeToken);

      if (!res.success) {
        if (res.error.code === 'UNAUTHORIZED' || res.error.code === 'SESSION_NOT_FOUND') {
          sessionStorage.removeItem('moneycard_portal_session_token');
          sessionStorage.removeItem('moneycard_portal_card_number');
          localStorage.removeItem('moneycard_portal_session_token');
          localStorage.removeItem('moneycard_portal_card_number');
          setSessionToken(null);
          setSessionDetail(null);
          setOrders([]);
          setError('Portal session expired or invalid. Please scan your wallet QR code again.');
        } else {
          if (!isSilent) setError(res.error.message || 'Failed to load wallet session detail');
        }
        return;
      }

      setSessionDetail(res.data);
    } catch {
      if (!isSilent) setError('Unable to connect to server. Please try again.');
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, [sessionToken]);

  // Real-time Server-Sent Events (SSE) stream for live balance updates
  const { lastUpdateAnimation, latestEvent } = useCardBalanceStream(sessionToken, {
    enabled: !!sessionToken && !isScanning,
    onBalanceUpdate: (event) => {
      setSessionDetail((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          currentBalance: event.balance,
          sessionStatus: (event.status as any) || prev.sessionStatus,
        };
      });
    },
  });

  const handleResolveCard = async (targetInput: string) => {
    const clean = targetInput.trim();
    if (!clean) return;

    setLookupError(null);

    try {
      const res = await apiService.userPortal.resolvePublicCard(clean);

      if (!res.success) {
        if (res.error?.code === 'CARD_BLOCKED') {
          setLookupError('This physical wallet has been blocked. Please visit the cafeteria desk.');
        } else if (res.error?.code === 'SESSION_NOT_FOUND') {
          setLookupError('No active session found for this wallet. Please request staff to issue or recharge a session.');
        } else if (res.error?.code === 'CARD_NOT_FOUND') {
          setLookupError('Wallet QR not recognized. Please scan a valid Money Card wallet.');
        } else {
          setLookupError(res.error?.message || 'The wallet could not be resolved.');
        }
        return;
      }

      sessionStorage.setItem('moneycard_portal_session_token', res.data.sessionToken);
      sessionStorage.setItem('moneycard_portal_card_number', res.data.cardDisplayNumber);
      setSessionToken(res.data.sessionToken);
      setIsScanning(false);
      await fetchSessionDetail(res.data.sessionToken);
      fetchOrders(res.data.sessionToken);
    } catch {
      setLookupError('Unable to connect to server. Please check your network and try again.');
    }
  };

  useEffect(() => {
    if (!sessionToken) return;

    // Initial load
    fetchSessionDetail(sessionToken);
    fetchOrders(sessionToken);

    // 2-second real-time polling while app/tab is active and visible
    const pollInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchSessionDetail(sessionToken, true);
        fetchOrders(sessionToken);
      }
    }, 2000);

    const handleVisibilityOrFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchSessionDetail(sessionToken, true);
        fetchOrders(sessionToken);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [sessionToken, fetchSessionDetail, fetchOrders]);

  const handleExitSession = () => {
    sessionStorage.removeItem('moneycard_portal_session_token');
    sessionStorage.removeItem('moneycard_portal_card_number');
    try {
      localStorage.removeItem('moneycard_portal_session_token');
      localStorage.removeItem('moneycard_portal_card_number');
    } catch {
      // ignore
    }
    setSessionToken(null);
    setSessionDetail(null);
    setOrders([]);
    setMenuItems([]);
    setIsMenuOpen(false);
    setMenuSearch('');
    setLookupError(null);
    setIsScanning(false);
    navigate('/portal', { replace: true });
  };

  // When viewed in mobile browser (not standalone PWA) and customer has not clicked bypass "Not now":
  // Render ONLY the PWA Install prompt screen as requested.
  if (!isStandalone && !bypassInstall) {
    return (
      <div className="py-6 space-y-6 max-w-lg mx-auto">
        <PwaInstallBanner
          isStandaloneGate={true}
          onDismiss={() => setBypassInstall(true)}
        />
      </div>
    );
  }

  if (!sessionToken && !sessionDetail) {
    return (
      <div className="py-6 space-y-6 max-w-lg mx-auto">
        {/* PWA Install Quick Action */}
        <PwaInstallBanner />

        {/* Welcome Hero */}
        <Card padding="lg" className="border-emerald-200 bg-gradient-to-b from-white via-white to-emerald-50/30 shadow-sm text-center">
          <div className="flex flex-col items-center space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-xs">
              <QrCode className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <Badge variant="outline" className="text-[10px] text-emerald-700 border-emerald-300 bg-emerald-50">
                Customer Self-Service
              </Badge>
              <h2 className="text-xl font-bold text-slate-900">Check Wallet Balance & Receipts</h2>
              <p className="text-xs text-slate-500 max-w-sm">
                Scan the QR code on your physical wallet with your camera to view your live balance and receipts.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {/* Camera Scanner Toggle */}
            {!isScanning ? (
              <Button
                variant="primary"
                size="lg"
                className="w-full justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 text-sm font-semibold"
                onClick={() => {
                  setLookupError(null);
                  setIsScanning(true);
                }}
                leftIcon={<Camera className="h-4 w-4" />}
              >
                Scan Wallet with Camera
              </Button>
            ) : (
              <div className="rounded-2xl border border-emerald-300 bg-slate-900 p-4 text-center text-white space-y-3 shadow-inner">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Camera className="h-4 w-4" /> Live Camera Scanner
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsScanning(false)}
                    className="text-xs text-slate-300 hover:text-white px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
                <div className="overflow-hidden rounded-2xl bg-black flex justify-center">
                  <CameraQrScanner
                    isActive={isScanning}
                    onScan={(scannedText) => handleResolveCard(scannedText)}
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Align your physical wallet QR code within the frame to scan.
                </p>
              </div>
            )}

            {lookupError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-start gap-2 animate-in fade-in text-left">
                <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">{lookupError}</p>
                  <p className="text-[11px] text-rose-600 mt-0.5">
                    Please make sure you are scanning an active physical Money Card wallet.
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="py-12">
        <LoadingState message="Loading wallet session details..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8">
        <ErrorState title="Session Access Error" message={error} onRetry={fetchSessionDetail} />
      </div>
    );
  }

  if (!sessionDetail) return null;

  const isClosed = sessionDetail.sessionStatus === 'SETTLED';

  return (
    <div className="space-y-6">
      {/* PWA Install Quick Action */}
      <PwaInstallBanner />

      {/* Session Hero Card */}
      <Card padding="lg" className="relative overflow-hidden border-emerald-200 bg-gradient-to-br from-white via-white to-emerald-50/40 shadow-md">
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-xs shrink-0">
              <User className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">Customer</span>
              <p className="text-base font-bold text-slate-900 leading-tight">
                {sessionDetail.customerName || ''}
              </p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  Wallet: {sessionDetail.cardDisplayNumber}
                </span>
                {sessionDetail.customerPhone && (
                  <span className="font-mono text-xs text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                    Phone: {sessionDetail.customerPhone}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="shrink-0">
            <Badge variant={isClosed ? 'outline' : 'success'} className="text-xs">
              {sessionDetail.sessionStatus}
            </Badge>
          </div>
        </div>

        {/* Live Balance Section */}
        <div className="py-6 text-center relative">
          {lastUpdateAnimation && (
            <div className="flex items-center justify-center mb-2">
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full animate-bounce transition-all ${
                lastUpdateAnimation === 'recharge'
                  ? 'bg-emerald-100 text-emerald-800'
                  : lastUpdateAnimation === 'purchase'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-100 text-slate-800'
              }`}>
                <Sparkles className="h-2.5 w-2.5" />
                {lastUpdateAnimation === 'recharge' ? `+₹${latestEvent?.amount ?? ''} Top-Up` : lastUpdateAnimation === 'purchase' ? `-₹${latestEvent?.amount ?? ''} Paid` : 'Refunded'}
              </span>
            </div>
          )}

          <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
            {isClosed ? 'Final Settled Balance' : 'Current Wallet Balance'}
          </span>
          <h2
            className={`mt-1 font-mono text-4xl font-extrabold transition-all duration-300 transform ${
              lastUpdateAnimation === 'recharge'
                ? 'text-emerald-500 scale-110'
                : lastUpdateAnimation === 'purchase'
                  ? 'text-amber-600 scale-105'
                  : 'text-emerald-600'
            }`}
          >
            {formatCurrency(sessionDetail.currentBalance)}
          </h2>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-slate-600">
            <Building2 className="h-3.5 w-3.5 text-slate-500" />
            <span>{sessionDetail.branchDisplayName}</span>
          </p>
        </div>

        {/* Low Balance Warning Banner */}
        {!isClosed && sessionDetail.currentBalance < 100 && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-left">
              <p className="font-bold text-amber-900">Low Balance Notice</p>
              <p className="mt-0.5 text-amber-800">
                Your wallet balance is {formatCurrency(sessionDetail.currentBalance)}. Top up at the counter to keep ordering without interruptions.
              </p>
            </div>
          </div>
        )}

        {/* Closed Session Warning Banner */}
        {isClosed && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Session Settled & Closed</span>
            </div>
            <p>
              This session was settled by store staff. Remaining funds were refunded.
            </p>
          </div>
        )}

        {/* Footer info & Exit action */}
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            Started: {formatDate(sessionDetail.startedAt)}
          </span>

          <button
            type="button"
            onClick={handleExitSession}
            className="flex items-center gap-1.5 text-slate-500 hover:text-rose-600 font-medium transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            Exit Session
          </button>
        </div>
      </Card>

      {/* Live Order & Food Preparation Status */}
      {orders.length > 0 && (
        <Card padding="md" className="border-slate-200 bg-white shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <ChefHat className="h-5 w-5 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">Food Preparation Status</h3>
            </div>
            <span className="text-[11px] font-semibold text-slate-500">
              {orders.filter((o) => o.orderStatus !== 'COMPLETED').length} Active
            </span>
          </div>

          <div className="space-y-3">
            {orders.map((ord) => {
              const isReady = ord.orderStatus === 'READY';
              const isCooking = ord.orderStatus === 'PREPARING';
              const isQueued = ord.orderStatus === 'PENDING';

              return (
                <div
                  key={ord.id}
                  className={`rounded-xl border p-3.5 transition-all ${
                    isReady
                      ? 'border-emerald-300 bg-emerald-50/60 shadow-sm'
                      : isCooking
                        ? 'border-blue-200 bg-blue-50/40'
                        : 'border-slate-200 bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-slate-900 text-white font-mono">
                        Token #{ord.orderNumber}
                      </span>
                      <span className="text-xs font-medium text-slate-600">
                        {ord.counterName}
                      </span>
                    </div>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                        isReady
                          ? 'bg-emerald-600 text-white animate-pulse'
                          : isCooking
                            ? 'bg-blue-100 text-blue-800'
                            : isQueued
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {isReady
                        ? 'Ready for Pickup'
                        : isCooking
                          ? 'Cooking Now'
                          : isQueued
                            ? 'In Queue'
                            : 'Completed'}
                    </span>
                  </div>

                  <div className="mt-2.5 space-y-1 border-t border-slate-200/60 pt-2 text-xs">
                    {ord.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between text-slate-700">
                        <span>
                          <strong className="text-slate-900">{it.quantity}x</strong> {it.itemName}
                        </span>
                      </div>
                    ))}
                  </div>

                  {isReady && (
                    <div className="mt-2.5 rounded-lg bg-emerald-100/90 px-3 py-1.5 text-center text-xs font-bold text-emerald-900">
                      Your food is ready! Please collect your order from {ord.counterName}.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Navigation Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => {
            setIsMenuOpen(true);
            fetchMenu();
          }}
          className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm transition-all hover:border-emerald-500/50 hover:bg-emerald-50/20 cursor-pointer"
        >
          <UtensilsCrossed className="h-6 w-6 text-emerald-600 mb-2" />
          <span className="text-sm font-semibold text-slate-900">Today's Menu</span>
          <span className="mt-0.5 text-xs text-slate-500">View items & prices</span>
        </button>

        <Link
          to="/portal/transactions"
          className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm transition-all hover:border-emerald-500/50 hover:bg-emerald-50/20"
        >
          <History className="h-6 w-6 text-emerald-600 mb-2" />
          <span className="text-sm font-semibold text-slate-900">Transaction History</span>
          <span className="mt-0.5 text-xs text-slate-500">Recharges & purchases</span>
        </Link>

        <Link
          to="/portal/receipts"
          className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm transition-all hover:border-emerald-500/50 hover:bg-emerald-50/20"
        >
          <Receipt className="h-6 w-6 text-emerald-600 mb-2" />
          <span className="text-sm font-semibold text-slate-900">Purchase Receipts</span>
          <span className="mt-0.5 text-xs text-slate-500">Itemized bills</span>
        </Link>
      </div>

      {/* Live Menu Modal */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 p-4 bg-slate-50">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="h-5 w-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900">Today's Live Menu</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 border-b border-slate-100">
              <input
                type="text"
                value={menuSearch}
                onChange={(e) => setMenuSearch(e.target.value)}
                placeholder="Search food & beverages..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-hidden"
              />
            </div>

            <div className="overflow-y-auto p-4 space-y-2 flex-1">
              {isLoadingMenu ? (
                <div className="py-8 text-center text-sm text-slate-500">Loading menu...</div>
              ) : (
                (() => {
                  const filteredMenu = menuItems.filter(
                    (item) =>
                      item.name.toLowerCase().includes(menuSearch.toLowerCase()) ||
                      item.categories.some((c) => c.toLowerCase().includes(menuSearch.toLowerCase()))
                  );
                  if (filteredMenu.length === 0) {
                    return <div className="py-8 text-center text-sm text-slate-500">No menu items found.</div>;
                  }
                  return filteredMenu.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3 hover:bg-slate-100/60"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`flex h-4 w-4 items-center justify-center rounded-xs border text-[9px] font-bold ${
                            item.isVeg
                              ? 'border-emerald-600 text-emerald-600'
                              : 'border-rose-600 text-rose-600'
                          }`}
                          title={item.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${item.isVeg ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                          {item.categories.length > 0 && (
                            <p className="text-[11px] text-slate-500">{item.categories.join(', ')}</p>
                          )}
                        </div>
                      </div>
                      <span className="font-mono text-sm font-bold text-emerald-700">
                        ₹{item.price}
                      </span>
                    </div>
                  ));
                })()
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
