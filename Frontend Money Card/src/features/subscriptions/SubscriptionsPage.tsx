// ─── Subscriptions & Plan Management Page (M9/M10/M11) ────────
// Web Subscription Management for ORG_ADMIN & SUPER_ADMIN.
// Uses apiService abstraction strictly — does NOT import mock handlers directly.
// Approved Business Model: Direct payment / offline invoice to Super Admin.
// Org Admin requests plan change -> Super Admin verifies & approves.

import { useState, useEffect, useCallback } from 'react';
import { apiService } from '@/services/api';
import { useAuth } from '@/hooks';
import type {
  Plan,
  Subscription,
  SubscriptionPayment,
  Branch,
  Staff,
  Card as CardEntity,
  PlanChangeRequest,
  PlanRequestType,
} from '@/types';
import {
  Button,
  Select,
  Card,
  CardHeader,
  CardContent,
  Badge,
  Modal,
  ModalFooter,
  LoadingState,
  EmptyState,
  ErrorState,
} from '@/components/ui';
import { DataTable } from '@/components/tables';
import { notify, formatDate, formatCurrency } from '@/utils';
import { AdminPlansSubscriptionsView } from './AdminPlansSubscriptionsView';
import { UnauthorizedPage } from '@/features/auth';
import {
  CreditCard,
  Check,
  RefreshCw,
  AlertCircle,
  Building2,
  Users,
  Receipt,
  MessageSquare,
  Send,
  Clock,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

/**
 * Automatically detects whether a plan change request is an UPGRADE or DOWNGRADE
 * based on plan price and tier hierarchy.
 */
export const detectPlanRequestType = (
  target: Plan,
  current?: Plan | null
): 'UPGRADE' | 'DOWNGRADE' => {
  if (!current) return 'UPGRADE';
  if (target.price < current.price) return 'DOWNGRADE';
  if (target.price > current.price) return 'UPGRADE';

  const tierOrder: Record<string, number> = {
    starter: 1,
    standard: 2,
    premium: 3,
    enterprise: 4,
  };
  const targetRank = tierOrder[target.name.toLowerCase()] ?? 0;
  const currentRank = tierOrder[current.name.toLowerCase()] ?? 0;
  return targetRank < currentRank ? 'DOWNGRADE' : 'UPGRADE';
};

export function SubscriptionsPage() {
  const { user, isLoading } = useAuth();

  if (isLoading && !user) {
    return <LoadingState message="Loading subscriptions..." />;
  }

  if (user?.role === 'SUPER_ADMIN') {
    return <AdminPlansSubscriptionsView />;
  }

  if (user?.role === 'ORG_ADMIN') {
    return <OrgAdminSubscriptionsView />;
  }

  return <UnauthorizedPage />;
}

function OrgAdminSubscriptionsView() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
  const [planRequests, setPlanRequests] = useState<PlanChangeRequest[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [cardsList, setCardsList] = useState<CardEntity[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals & Request Form
  const [showContactModal, setShowContactModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);

  const [formRequestedPlanId, setFormRequestedPlanId] = useState('');
  const [formRequestType, setFormRequestType] = useState<PlanRequestType>('UPGRADE');
  const [formReason, setFormReason] = useState('');
  const [renewReason, setRenewReason] = useState('');
  const [formValidationError, setFormValidationError] = useState<string | null>(null);
  const [modalApiError, setModalApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Collapsible Dropdown Sections for History & Ledger (collapsed by default to save dashboard space)
  const [isPlanRequestsOpen, setIsPlanRequestsOpen] = useState(false);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);

  // ── Fetch Organization Subscription Data ───────────────────
  const fetchOrgSubscriptionData = useCallback(async () => {
    setError(null);
    try {
      const [plansRes, subRes, payRes, reqsRes, branchRes, staffRes, cardRes] =
        await Promise.all([
          apiService.plans.getPlans(),
          apiService.subscriptions.getSubscription(),
          apiService.subscriptions.getPayments(),
          apiService.subscriptions.getPlanRequests(),
          apiService.branches.getBranches(),
          apiService.staff.getStaff(),
          apiService.cards.getCards(),
        ]);

      if (!plansRes.success) {
        setError(plansRes.error.message || 'Failed to load plans');
        return;
      }

      setPlans(plansRes.data);
      if (subRes.success) setSubscription(subRes.data);
      if (payRes.success) setPayments(payRes.data);
      if (reqsRes.success) setPlanRequests(reqsRes.data);
      if (branchRes.success) setBranches(branchRes.data.items);
      if (staffRes.success) setStaffList(staffRes.data.items);
      if (cardRes.success) setCardsList(cardRes.data.items);
    } catch {
      setError('Unable to connect to the server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;
    const load = async () => {
      setError(null);
      try {
        const [plansRes, subRes, payRes, reqsRes, branchRes, staffRes, cardRes] =
          await Promise.all([
            apiService.plans.getPlans(),
            apiService.subscriptions.getSubscription(),
            apiService.subscriptions.getPayments(),
            apiService.subscriptions.getPlanRequests(),
            apiService.branches.getBranches(),
            apiService.staff.getStaff(),
            apiService.cards.getCards(),
          ]);
        if (isCancelled) return;

        if (!plansRes.success) {
          setError(plansRes.error.message || 'Failed to load plans');
          return;
        }

        setPlans(plansRes.data);
        if (subRes.success) setSubscription(subRes.data);
        if (payRes.success) setPayments(payRes.data);
        if (reqsRes.success) setPlanRequests(reqsRes.data);
        if (branchRes.success) setBranches(branchRes.data.items);
        if (staffRes.success) setStaffList(staffRes.data.items);
        if (cardRes.success) setCardsList(cardRes.data.items);
      } catch {
        if (!isCancelled) setError('Unable to connect to the server. Please try again.');
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      isCancelled = true;
    };
  }, []);

  const currentPlan = plans.find((p) => p.id === subscription?.planId) || plans[0];
  const selectedTargetPlan = plans.find((p) => p.id === formRequestedPlanId);

  // Authoritative Effective Limits: Custom Override > Plan Default
  const branchUsage = branches.length;
  const branchLimit =
    subscription?.overrides?.branchLimit ??
    (subscription as any)?.branchLimitOverride ??
    currentPlan?.branchLimit ??
    1;

  const staffUsage = staffList.length;
  const staffLimit =
    subscription?.overrides?.staffLimit ??
    (subscription as any)?.staffLimitOverride ??
    currentPlan?.staffLimit ??
    10;

  const cardUsage = cardsList.length;
  const cardLimit =
    subscription?.overrides?.cardLimit ??
    (subscription as any)?.cardLimitOverride ??
    currentPlan?.cardLimit ??
    250;

  // Active/Latest pending plan change request
  const pendingRequest = planRequests.find((r) => r.status === 'PENDING') || null;

  // ── Contact Super Admin Handler ───────────────────────────
  const handleOpenContactSuperAdmin = (targetPlan?: Plan) => {
    if (pendingRequest) {
      notify.warning(
        'An organization can only make one plan change request at a time. Please wait until your pending request is approved or rejected by Super Admin before submitting another request.'
      );
      return;
    }

    setFormValidationError(null);
    setModalApiError(null);

    // Auto-detect target plan if not explicitly provided
    let selected = targetPlan;
    if (!selected) {
      if (currentPlan) {
        if (currentPlan.name.toLowerCase().includes('enterprise')) {
          // If current is Enterprise (highest tier), auto-detect Standard for downgrade
          selected =
            plans.find((p) => p.name.toLowerCase().includes('standard')) ||
            plans.find((p) => p.id !== currentPlan.id);
        } else {
          // If current is lower tier, auto-detect the next upgrade plan
          const upgradePlans = plans.filter((p) => p.price > currentPlan.price);
          selected = upgradePlans[0] || plans.find((p) => p.id !== currentPlan.id);
        }
      }
      if (!selected) {
        selected = plans.find((p) => p.id !== currentPlan?.id) || plans[0];
      }
    }

    setFormRequestedPlanId(selected.id);
    setFormReason('');

    // Automatically detect UPGRADE or DOWNGRADE
    setFormRequestType(detectPlanRequestType(selected, currentPlan));

    setShowContactModal(true);
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormValidationError(null);
    setModalApiError(null);

    if (pendingRequest) {
      setModalApiError(
        'An organization can only make one plan change request at a time. Please wait until your pending request is approved or rejected by Super Admin before submitting another request.'
      );
      return;
    }

    const selectedTarget = plans.find((p) => p.id === formRequestedPlanId);
    if (!selectedTarget) {
      setFormValidationError('Please select a valid target plan.');
      return;
    }

    if (selectedTarget.id === currentPlan?.id) {
      setFormValidationError('Requested plan must be different from your current active plan.');
      return;
    }

    const trimmedReason = formReason.trim();
    if (trimmedReason.length > 500) {
      setFormValidationError('Message must not exceed 500 characters.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await apiService.subscriptions.createPlanRequest({
        requestedPlanId: selectedTarget.id,
        requestType: formRequestType,
        reason: formReason.trim() || undefined,
      });

      if (!res.success) {
        setModalApiError(res.error.message || 'Failed to submit plan change request.');
        return;
      }

      notify.success(`Plan change request for ${selectedTarget.name} submitted to Super Admin.`);
      setShowContactModal(false);
      fetchOrgSubscriptionData();
    } catch {
      setModalApiError('An unexpected network error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Renew Subscription Handler ────────────────────────────
  const handleRenewSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedReason = renewReason.trim();
    if (trimmedReason.length > 500) {
      setModalApiError('Renewal notes must not exceed 500 characters.');
      return;
    }
    setIsSubmitting(true);
    setModalApiError(null);
    try {
      const res = await apiService.subscriptions.renewSubscription({
        reason:
          renewReason.trim() ||
          `Active subscription renewal requested for ${currentPlan?.name || 'Active Plan'}`,
      });
      if (!res.success) {
        setModalApiError(res.error.message || 'Renewal request submission failed');
        return;
      }

      notify.success('Subscription renewal request submitted to Super Admin for review and approval.');
      setShowRenewModal(false);
      setRenewReason('');
      fetchOrgSubscriptionData();
    } catch {
      setModalApiError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Billing Columns ───────────────────────────────────────
  const billingColumns = [
    {
      key: 'id',
      header: 'Invoice ID',
      render: (pay: SubscriptionPayment) => (
        <span className="font-mono text-xs font-bold text-slate-900">PAY-#{pay.id.slice(0, 8).toUpperCase()}</span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (pay: SubscriptionPayment) => (
        <span className="font-mono text-sm font-bold text-emerald-700">
          {formatCurrency(pay.amount)}
        </span>
      ),
    },
    {
      key: 'paymentMethod',
      header: 'Payment Method',
      render: (pay: SubscriptionPayment) => (
        <Badge variant="outline" className="text-slate-700 border-slate-300 bg-slate-50">
          {pay.paymentMethod.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      key: 'paymentReference',
      header: 'Reference ID',
      render: (pay: SubscriptionPayment) => (
        <span className="font-mono text-xs font-semibold text-slate-700">
          {pay.paymentReference || pay.externalReference || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (pay: SubscriptionPayment) => (
        <Badge variant={pay.status === 'SUCCESS' ? 'success' : 'danger'}>
          {pay.status}
        </Badge>
      ),
    },
    {
      key: 'verifiedBy',
      header: 'Verification',
      render: (pay: SubscriptionPayment) => (
        <span className="text-xs text-emerald-700 font-medium">
          {pay.verifiedBy ? `Verified (${pay.verifiedBy})` : 'Verified'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: (pay: SubscriptionPayment) => (
        <span className="text-xs text-slate-600">{formatDate(pay.createdAt)}</span>
      ),
    },
  ];

  // ── Plan Requests Columns ─────────────────────────────────
  const requestColumns = [
    {
      key: 'requestedPlanName',
      header: 'Requested Plan',
      render: (req: PlanChangeRequest) => (
        <div>
          <span className="font-bold text-slate-900">{req.requestedPlanName}</span>
          <p className="text-[11px] text-slate-500">From {req.currentPlanName}</p>
        </div>
      ),
    },
    {
      key: 'requestType',
      header: 'Type',
      render: (req: PlanChangeRequest) => {
        if (req.requestType === 'RENEWAL') {
          return (
            <Badge variant="success" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold">
              Subscription Renewal
            </Badge>
          );
        }
        return (
          <Badge variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50">
            {req.requestType.replace('_', ' ')}
          </Badge>
        );
      },
    },
    {
      key: 'reason',
      header: 'Notes / Reason',
      render: (req: PlanChangeRequest) => (
        <span className="text-xs text-slate-700 font-medium max-w-xs truncate block">
          {req.reason || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (req: PlanChangeRequest) => (
        <Badge
          variant={
            req.status === 'APPROVED' || req.status === 'COMPLETED'
              ? 'success'
              : req.status === 'PENDING'
                ? 'warning'
                : 'danger'
          }
        >
          {req.status}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Submitted Date',
      render: (req: PlanChangeRequest) => (
        <span className="text-xs text-slate-600 font-medium">{formatDate(req.createdAt)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Subscription & Plan Details</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant={pendingRequest ? 'outline' : 'primary'}
            onClick={() => handleOpenContactSuperAdmin()}
            disabled={!!pendingRequest}
            title={
              pendingRequest
                ? 'An organization can only make one plan change request at a time. Please wait until your pending request is approved or rejected.'
                : 'Contact Super Admin'
            }
            leftIcon={<MessageSquare className="h-4 w-4" />}
          >
            {pendingRequest ? 'Plan Request Pending' : 'Contact Super Admin'}
          </Button>

          {subscription && (
            <Button
              variant="outline"
              onClick={() => setShowRenewModal(true)}
              leftIcon={<RefreshCw className="h-4 w-4" />}
            >
              Renew Subscription
            </Button>
          )}
        </div>
      </div>

      {/* Pending Plan Change / Renewal Request Banner */}
      {pendingRequest && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-slate-900 text-sm">
                  {pendingRequest.requestType === 'RENEWAL'
                    ? 'Subscription Renewal Request Submitted'
                    : 'Plan Change Request Submitted'}
                </span>
                <Badge variant="warning" className="text-[10px]">PENDING SUPER ADMIN REVIEW</Badge>
              </div>
              <p className="mt-1 text-slate-700 leading-relaxed">
                {pendingRequest.requestType === 'RENEWAL' ? (
                  <>
                    Your request to renew your active subscription for <strong className="text-slate-900 font-bold">{pendingRequest.requestedPlanName}</strong> was submitted on {formatDate(pendingRequest.createdAt)}. Super Admin has been alerted to review and accept the renewal.
                  </>
                ) : (
                  <>
                    Your request to transition to <strong className="text-slate-900 font-bold">{pendingRequest.requestedPlanName}</strong> ({pendingRequest.requestType.replace('_', ' ')}) was submitted on {formatDate(pendingRequest.createdAt)}. Super Admin will review and approve or reject this request.
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-xs">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
              Awaiting Super Admin Decision
            </span>
          </div>
        </div>
      )}

      {isLoading ? (
        <LoadingState message="Loading subscription & plan entitlements..." />
      ) : error ? (
        <ErrorState title="Failed to load subscription" message={error} onRetry={fetchOrgSubscriptionData} />
      ) : (
        <div className="space-y-8">
          {/* Active Subscription & Usage Metrics Card */}
          <Card>
            <CardHeader
              title={`Current Plan: ${currentPlan?.name || 'Active Subscription'}`}
              description={`${branchLimit} Branches • ${staffLimit} Staff • ${cardLimit} Cards`}
              action={
                <Badge
                  variant={
                    subscription?.status === 'ACTIVE'
                      ? 'success'
                      : subscription?.status === 'PENDING_PAYMENT'
                        ? 'warning'
                        : 'danger'
                  }
                  className="text-xs px-3 py-1"
                >
                  {subscription?.status || 'ACTIVE'}
                </Badge>
              }
            />

            <CardContent className="space-y-6">
              {/* Dates & Status Metadata */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 rounded-xl bg-slate-50 p-4 border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 font-medium">Plan Price:</span>
                  <p className="font-mono text-sm font-bold text-emerald-700">
                    {formatCurrency(currentPlan?.price || 0)} / {currentPlan?.billingInterval.toLowerCase()}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Start Date:</span>
                  <p className="font-semibold text-slate-900">
                    {subscription ? formatDate(subscription.startDate) : '—'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Renewal / End Date:</span>
                  <p className="font-semibold text-slate-900">
                    {subscription ? formatDate(subscription.renewalDate) : '—'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Payment Status:</span>
                  <p className="font-semibold text-emerald-700">
                    {subscription?.paymentStatus || 'SUCCESS'}
                  </p>
                </div>
              </div>

              {/* Real-Time Usage Bars */}
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                {/* Branches */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <Building2 className="h-4 w-4 text-emerald-600" />
                      Branch Locations
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {branchUsage} / {branchLimit}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full bg-emerald-600 transition-all duration-300"
                      style={{ width: `${Math.min((branchUsage / branchLimit) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Staff Accounts */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <Users className="h-4 w-4 text-teal-600" />
                      Staff Accounts
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {staffUsage} / {staffLimit}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full bg-teal-600 transition-all duration-300"
                      style={{ width: `${Math.min((staffUsage / staffLimit) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Active Cards */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <CreditCard className="h-4 w-4 text-sky-600" />
                      Active Cards
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {cardUsage} / {cardLimit}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full bg-sky-500 transition-all duration-300"
                      style={{ width: `${Math.min((cardUsage / cardLimit) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Available Plans / Plan Comparison Grid */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Plans</h2>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {plans.map((plan) => {
                const isCurrent = plan.id === currentPlan?.id;

                return (
                  <div
                    key={plan.id}
                    className={`relative flex flex-col justify-between rounded-xl border p-5 transition-all ${
                      isCurrent
                        ? 'border-emerald-500 bg-emerald-50/40 shadow-md shadow-emerald-500/10'
                        : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    {isCurrent && (
                      <Badge variant="success" className="absolute -top-3 right-4 text-[10px]">
                        Active Plan
                      </Badge>
                    )}

                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                        <p className="mt-1 font-mono text-2xl font-bold text-emerald-700">
                          {formatCurrency(plan.price)}{' '}
                          <span className="text-xs font-normal text-slate-500">
                            /{plan.billingInterval.toLowerCase()}
                          </span>
                        </p>
                      </div>

                      {/* Technical Limits List */}
                      <div className="space-y-2 border-t border-b border-slate-200 py-3 text-xs">
                        <div className="flex items-center justify-between text-slate-700">
                          <span>Branches:</span>
                          <strong className="font-mono text-slate-900 font-bold">{plan.branchLimit}</strong>
                        </div>
                        <div className="flex items-center justify-between text-slate-700">
                          <span>Staff Accounts:</span>
                          <strong className="font-mono text-slate-900 font-bold">{plan.staffLimit}</strong>
                        </div>
                        <div className="flex items-center justify-between text-slate-700">
                          <span>Active Cards:</span>
                          <strong className="font-mono text-slate-900 font-bold">{plan.cardLimit}</strong>
                        </div>
                      </div>

                      {/* Entitlements */}
                      <ul className="space-y-2 text-xs text-slate-700 font-medium">
                        <li className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span>{plan.inventoryLevel} Inventory</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span>{plan.analyticsLevel} Analytics</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span>{plan.supportLevel} Support</span>
                        </li>
                      </ul>
                    </div>

                    {/* Action CTA: [ Request Upgrade / Request Downgrade ] */}
                    <div className="mt-6">
                      {isCurrent ? (
                        <Button variant="outline" size="sm" className="w-full" disabled>
                          Current Plan
                        </Button>
                      ) : pendingRequest ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-slate-400 bg-slate-100 border-slate-200 cursor-not-allowed font-medium"
                          disabled
                          title="You already have a plan change request awaiting Super Admin review"
                        >
                          Request Pending
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          className="w-full"
                          onClick={() => handleOpenContactSuperAdmin(plan)}
                          leftIcon={
                            detectPlanRequestType(plan, currentPlan) === 'UPGRADE' ? (
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            ) : (
                              <ArrowDownRight className="h-3.5 w-3.5" />
                            )
                          }
                        >
                          {detectPlanRequestType(plan, currentPlan) === 'UPGRADE'
                            ? `Upgrade to ${plan.name}`
                            : `Downgrade to ${plan.name}`}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Collapsible Dropdown Sections: Plan Change Requests History & Direct Payment Ledger */}
          <div className="space-y-4">
            {/* 1. Plan Change Requests History Dropdown */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
              <button
                type="button"
                id="toggle-plan-requests-dropdown"
                onClick={() => setIsPlanRequestsOpen((prev) => !prev)}
                className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-slate-50 cursor-pointer"
                aria-expanded={isPlanRequestsOpen}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-base font-bold text-slate-900">Plan Change Requests History</h3>
                    <Badge variant="outline" className="font-mono text-xs">
                      {planRequests.length} {planRequests.length === 1 ? 'Request' : 'Requests'}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600">
                  <span>{isPlanRequestsOpen ? 'Collapse' : 'Drop down to view'}</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      isPlanRequestsOpen ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </button>

              {isPlanRequestsOpen && (
                <div className="border-t border-slate-200">
                  {planRequests.length === 0 ? (
                    <div className="p-4">
                      <EmptyState
                        icon={<Clock className="h-8 w-8 text-slate-400" />}
                        title="No plan change requests recorded"
                        description="Pending and approved plan change requests will appear here."
                      />
                    </div>
                  ) : (
                    <DataTable<PlanChangeRequest>
                      data={planRequests}
                      columns={requestColumns}
                      keyExtractor={(item: PlanChangeRequest) => item.id}
                    />
                  )}
                </div>
              )}
            </div>

            {/* 2. Direct Payment Ledger Dropdown */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
              <button
                type="button"
                id="toggle-direct-ledger-dropdown"
                onClick={() => setIsLedgerOpen((prev) => !prev)}
                className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-slate-50 cursor-pointer"
                aria-expanded={isLedgerOpen}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <Receipt className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-base font-bold text-slate-900">Direct Payment Ledger</h3>
                    <Badge variant="outline" className="font-mono text-xs">
                      {payments.length} {payments.length === 1 ? 'Payment' : 'Payments'}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600">
                  <span>{isLedgerOpen ? 'Collapse' : 'Drop down to view'}</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      isLedgerOpen ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </button>

              {isLedgerOpen && (
                <div className="border-t border-slate-200">
                  {payments.length === 0 ? (
                    <div className="p-4">
                      <EmptyState
                        icon={<Receipt className="h-8 w-8 text-slate-400" />}
                        title="No billing history recorded"
                        description="Verified subscription payments will appear here."
                      />
                    </div>
                  ) : (
                    <DataTable<SubscriptionPayment>
                      data={payments}
                      columns={billingColumns}
                      keyExtractor={(item: SubscriptionPayment) => item.id}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Contact Super Admin / Request Plan Change Modal ── */}
      <Modal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        title="Contact Super Admin / Request Plan Change"
      >
        <form onSubmit={handleContactSubmit} className="space-y-4 py-2">
          {formValidationError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
              <span>{formValidationError}</span>
            </div>
          )}

          {modalApiError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
              <span>{modalApiError}</span>
            </div>
          )}

          {/* Current Plan (Read-Only) */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-1 text-xs">
            <span className="text-slate-500 font-semibold uppercase tracking-wider">Current Organization Plan</span>
            <div className="flex justify-between items-center pt-1">
              <span className="text-sm font-bold text-slate-900">{currentPlan?.name || 'Standard'}</span>
              <span className="font-mono text-emerald-700 font-bold">
                {formatCurrency(currentPlan?.price || 0)} / {currentPlan?.billingInterval.toLowerCase()}
              </span>
            </div>
          </div>

          {/* Requested Plan * */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-1 text-xs">
            <span className="text-slate-500 font-semibold uppercase tracking-wider">Requested Plan *</span>
            <div className="flex justify-between items-center pt-1">
              <span className="text-sm font-bold text-slate-900">
                {selectedTargetPlan?.name || 'Standard'} ({formatCurrency(selectedTargetPlan?.price || 0)}/{selectedTargetPlan?.billingInterval.toLowerCase() || 'monthly'})
              </span>
            </div>
          </div>

          {/* Request Type * (only Upgrade & Downgrade) */}
          <Select
            label="Request Type *"
            id="contact-plan-request-type"
            value={formRequestType}
            onChange={(e) => setFormRequestType(e.target.value as 'UPGRADE' | 'DOWNGRADE')}
            options={[
              { value: 'UPGRADE', label: 'Upgrade' },
              { value: 'DOWNGRADE', label: 'Downgrade' },
            ]}
            disabled={isSubmitting}
          />

          {/* Message / Reason with 60 Character Limit */}
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <label htmlFor="contact-plan-message" className="font-semibold text-slate-700">
                Message / Reason (Optional)
              </label>
              <span className={`text-[10px] font-mono ${formReason.length >= 500 ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
                {formReason.length}/500
              </span>
            </div>
            <textarea
              id="contact-plan-message"
              value={formReason}
              onChange={(e) => {
                setFormReason(e.target.value.slice(0, 500));
                if (formValidationError) setFormValidationError(null);
              }}
              maxLength={500}
              placeholder="Provide context or details for the Super Admin regarding this plan request..."
              rows={3}
              disabled={isSubmitting}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden"
            />
          </div>

          <ModalFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => setShowContactModal(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={isSubmitting}
              disabled={isSubmitting}
              leftIcon={<Send className="h-4 w-4" />}
            >
              Submit Request to Super Admin
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* ── Renew Modal ── */}
      <Modal
        isOpen={showRenewModal}
        onClose={() => {
          setShowRenewModal(false);
          setModalApiError(null);
        }}
        title="Renew Active Subscription"
      >
        <form onSubmit={handleRenewSubmit} className="space-y-4 py-2">
          {modalApiError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
              <span>{modalApiError}</span>
            </div>
          )}

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Plan</span>
              <Badge variant="success" className="text-[10px]">CURRENTLY ACTIVE</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-base font-bold text-slate-900">{currentPlan?.name || 'Active Plan'}</span>
              <span className="font-mono font-bold text-emerald-700">
                {formatCurrency(currentPlan?.price || 0)} / {currentPlan?.billingInterval.toLowerCase()}
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Clicking <strong>Submit Renewal Request</strong> will send an <strong className="text-amber-700">Alert to Super Admin</strong> to review and accept your subscription renewal for <strong>{currentPlan?.name}</strong>. Upon approval, your subscription will be extended by 1 billing cycle ({currentPlan?.billingInterval.toLowerCase()}).
          </p>

          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <label htmlFor="renew-plan-notes" className="font-semibold text-slate-700">
                Renewal Notes / Reference (Optional)
              </label>
              <span className={`text-[10px] font-mono ${renewReason.length >= 500 ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
                {renewReason.length}/500
              </span>
            </div>
            <textarea
              id="renew-plan-notes"
              value={renewReason}
              onChange={(e) => setRenewReason(e.target.value.slice(0, 500))}
              maxLength={500}
              placeholder="e.g. Offline payment made via Bank Transfer Ref #12345, please approve renewal..."
              rows={3}
              disabled={isSubmitting}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden"
            />
          </div>

          <ModalFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setShowRenewModal(false);
                setModalApiError(null);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={isSubmitting}
              disabled={isSubmitting}
              leftIcon={<Send className="h-4 w-4" />}
            >
              Submit Renewal Request
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
