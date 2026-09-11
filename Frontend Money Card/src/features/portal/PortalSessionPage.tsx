import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiService } from '@/services/api';
import type { PublicSessionDetail } from '@/types';
import {
  Card,
  Badge,
  Button,
  Input,
  LoadingState,
  ErrorState,
} from '@/components/ui';
import { CameraQrScanner } from '@/components/scanner/CameraQrScanner';
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
  Search,
  ShieldCheck,
  ShieldAlert,
  User,
} from 'lucide-react';

export function PortalSessionPage() {
  const navigate = useNavigate();
  const [sessionToken, setSessionToken] = useState<string | null>(() =>
    typeof window !== 'undefined' ? sessionStorage.getItem('moneycard_portal_session_token') : null,
  );

  const [sessionDetail, setSessionDetail] = useState<PublicSessionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Manual lookup & in-browser scanner states
  const [lookupInput, setLookupInput] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [showSwitchScanner, setShowSwitchScanner] = useState(false);

  const fetchSessionDetail = useCallback(async (tokenOverride?: string) => {
    const activeToken = tokenOverride || sessionToken;
    if (!activeToken) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await apiService.userPortal.getPublicSessionDetail(activeToken);

      if (!res.success) {
        if (res.error.code === 'UNAUTHORIZED' || res.error.code === 'SESSION_NOT_FOUND') {
          sessionStorage.removeItem('moneycard_portal_session_token');
          sessionStorage.removeItem('moneycard_portal_card_number');
          setSessionToken(null);
          setSessionDetail(null);
          setError('Portal session expired or invalid. Please scan your card QR code again.');
        } else {
          setError(res.error.message || 'Failed to load card session detail');
        }
        return;
      }

      setSessionDetail(res.data);
    } catch {
      setError('Unable to connect to server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [sessionToken]);

  const handleResolveCard = async (targetInput: string) => {
    const clean = targetInput.trim();
    if (!clean) return;

    setIsResolving(true);
    setLookupError(null);

    try {
      const res = await apiService.userPortal.resolvePublicCard(clean);

      if (!res.success) {
        if (res.error?.code === 'CARD_BLOCKED') {
          setLookupError('This physical card has been blocked. Please visit the cafeteria desk.');
        } else if (res.error?.code === 'SESSION_NOT_FOUND') {
          setLookupError('No active session found for this card. Please request staff to issue or recharge a session.');
        } else if (res.error?.code === 'CARD_NOT_FOUND') {
          setLookupError(`Card or QR "${clean}" not recognized. Please check the code and try again.`);
        } else {
          setLookupError(res.error?.message || 'The card could not be resolved.');
        }
        return;
      }

      sessionStorage.setItem('moneycard_portal_session_token', res.data.sessionToken);
      sessionStorage.setItem('moneycard_portal_card_number', res.data.cardDisplayNumber);
      setSessionToken(res.data.sessionToken);
      setIsScanning(false);
      setShowSwitchScanner(false);
      setLookupInput('');
      await fetchSessionDetail(res.data.sessionToken);
    } catch {
      setLookupError('Unable to connect to server. Please check your network and try again.');
    } finally {
      setIsResolving(false);
    }
  };

  useEffect(() => {
    if (sessionToken) {
      fetchSessionDetail(sessionToken);
    }
  }, [sessionToken, fetchSessionDetail]);

  const handleExitSession = () => {
    sessionStorage.removeItem('moneycard_portal_session_token');
    sessionStorage.removeItem('moneycard_portal_card_number');
    setSessionToken(null);
    setSessionDetail(null);
    setLookupError(null);
    navigate('/portal', { replace: true });
  };

  if (!sessionToken && !sessionDetail) {
    return (
      <div className="py-6 space-y-6 max-w-lg mx-auto">
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
              <h2 className="text-xl font-bold text-slate-900">Check Card Balance & Receipts</h2>
              <p className="text-xs text-slate-500 max-w-sm">
                Scan the QR code on your card with your camera or enter your card number below.
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
                Scan Card with Camera
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
                <div className="overflow-hidden rounded-xl bg-black min-h-[220px]">
                  <CameraQrScanner
                    isActive={isScanning}
                    onScan={(scannedText) => handleResolveCard(scannedText)}
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Point camera at the Money Card QR code. It will detect automatically.
                </p>
              </div>
            )}

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-400">
                <span className="bg-white px-2">OR ENTER MANUALLY</span>
              </div>
            </div>

            {/* Manual Lookup Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleResolveCard(lookupInput);
              }}
              className="space-y-3 text-left"
            >
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Card Number or QR Identifier
                </label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={lookupInput}
                    onChange={(e) => {
                      setLookupInput(e.target.value);
                      if (lookupError) setLookupError(null);
                    }}
                    placeholder="e.g. MC-001 or KD1NIICJY"
                    className="font-mono text-sm uppercase"
                    autoCapitalize="characters"
                  />
                  <Button
                    type="submit"
                    variant="outline"
                    isLoading={isResolving}
                    disabled={!lookupInput.trim()}
                    className="shrink-0 font-medium"
                    leftIcon={<Search className="h-3.5 w-3.5" />}
                  >
                    Search
                  </Button>
                </div>
              </div>

              {lookupError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-start gap-2 animate-in fade-in">
                  <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">{lookupError}</p>
                    <p className="text-[11px] text-rose-600 mt-0.5">
                      Check that the card is currently active and assigned in the system.
                    </p>
                  </div>
                </div>
              )}
            </form>
          </div>
        </Card>

        {/* Helpful Info Guide */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-600 space-y-2">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Customer Privacy & Security</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Scanning or searching establishes a secure self-service session. You can view your current cafeteria balance and itemized receipts without entering personal passwords.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="py-12">
        <LoadingState message="Loading card session details..." />
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
                {sessionDetail.customerName || 'Walk-in Customer'}
              </p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  Card: {sessionDetail.cardDisplayNumber}
                </span>
                {sessionDetail.customerPhone && (
                  <span className="text-xs font-mono text-slate-500">
                    {sessionDetail.customerPhone}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <Badge variant={isClosed ? 'outline' : 'success'} className="text-xs">
              {sessionDetail.sessionStatus}
            </Badge>
            <button
              type="button"
              onClick={() => setShowSwitchScanner(!showSwitchScanner)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer shadow-2xs"
              title="Scan or check another card"
            >
              <Camera className="h-3.5 w-3.5" />
              <span>{showSwitchScanner ? 'Hide Scanner' : 'Scan Card'}</span>
            </button>
          </div>
        </div>

        {/* In-Session Camera Scanner & Card Switcher */}
        {showSwitchScanner && (
          <div className="my-4 rounded-2xl border border-emerald-300 bg-slate-900 p-4 text-center text-white space-y-3 shadow-lg animate-in fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Camera className="h-4 w-4" /> Scan Another Card
              </span>
              <button
                type="button"
                onClick={() => setShowSwitchScanner(false)}
                className="text-xs text-slate-300 hover:text-white px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
            <div className="overflow-hidden rounded-xl bg-black min-h-[200px]">
              <CameraQrScanner
                isActive={showSwitchScanner}
                onScan={(scannedText) => handleResolveCard(scannedText)}
              />
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleResolveCard(lookupInput);
              }}
              className="flex gap-2 pt-2 text-left"
            >
              <Input
                type="text"
                value={lookupInput}
                onChange={(e) => {
                  setLookupInput(e.target.value);
                  if (lookupError) setLookupError(null);
                }}
                placeholder="Or type card/QR (e.g. MC-002)"
                className="font-mono text-xs bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
              />
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isResolving}
                disabled={!lookupInput.trim()}
                className="shrink-0 bg-emerald-600 hover:bg-emerald-700"
              >
                Switch
              </Button>
            </form>
            {lookupError && (
              <p className="text-xs text-rose-400 text-left pt-1">
                {lookupError}
              </p>
            )}
          </div>
        )}

        {/* Live Balance Section */}
        <div className="py-6 text-center">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
            {isClosed ? 'Final Settled Balance' : 'Current Wallet Balance'}
          </span>
          <h2 className="mt-1 font-mono text-4xl font-extrabold text-emerald-600">
            {formatCurrency(sessionDetail.currentBalance)}
          </h2>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-slate-600">
            <Building2 className="h-3.5 w-3.5 text-slate-500" />
            <span>{sessionDetail.branchDisplayName}</span>
          </p>
        </div>

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

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSwitchScanner(true)}
              className="flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-medium transition-colors"
            >
              <Camera className="h-3.5 w-3.5" />
              Scan Card
            </button>
            <button
              onClick={handleExitSession}
              className="flex items-center gap-1 text-slate-500 hover:text-slate-800 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Exit Session
            </button>
          </div>
        </div>
      </Card>

      {/* Navigation Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link
          to="/portal/transactions"
          className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm transition-all hover:border-emerald-500/50 hover:bg-emerald-50/20"
        >
          <History className="h-6 w-6 text-emerald-600 mb-2" />
          <span className="text-sm font-semibold text-slate-900">Transaction History</span>
          <span className="mt-0.5 text-xs text-slate-500">View recharges & purchases</span>
        </Link>

        <Link
          to="/portal/receipts"
          className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm transition-all hover:border-emerald-500/50 hover:bg-emerald-50/20"
        >
          <Receipt className="h-6 w-6 text-emerald-600 mb-2" />
          <span className="text-sm font-semibold text-slate-900">Purchase Receipts</span>
          <span className="mt-0.5 text-xs text-slate-500">Itemized purchase details</span>
        </Link>
      </div>
    </div>
  );
}
