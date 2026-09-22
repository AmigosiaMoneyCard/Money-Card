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
  Branch,
  Staff,
  Card as CardEntity,
  PlanChangeRequest,
  PlanRequestType,
} from '@/types';
import {
  Button,
  Select,
  Badge,
  Modal,
  ModalFooter,
  LoadingState,
  ErrorState,
} from '@/components/ui';
import { notify, formatDate, formatCurrency } from '@/utils';
import { AdminPlansSubscriptionsView } from './AdminPlansSubscriptionsView';
import { UnauthorizedPage } from '@/features/auth';
import {
  Check,
  RefreshCw,
  AlertCircle,
  Send,
  Clock,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
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

  // Individual Plan Collapsible Dropdown State
  const [expandedPlanIds, setExpandedPlanIds] = useState<Record<string, boolean>>({});

  const togglePlanDetails = (planId: string) => {
    setExpandedPlanIds((prev) => ({
      ...prev,
      [planId]: !prev[planId],
    }));
  };

  const allPlansExpanded = plans.length > 0 && plans.every((p) => expandedPlanIds[p.id]);
  const handleToggleAllPlans = () => {
    if (allPlansExpanded) {
      setExpandedPlanIds({});
    } else {
      const next: Record<string, boolean> = {};
      plans.forEach((p) => {
        next[p.id] = true;
      });
      setExpandedPlanIds(next);
    }
  };

  // ── Fetch Organization Subscription Data ───────────────────
  const fetchOrgSubscriptionData = useCallback(async () => {
    setError(null);
    try {
      const [plansRes, subRes, reqsRes, branchRes, staffRes, cardRes] =
        await Promise.all([
          apiService.plans.getPlans(),
          apiService.subscriptions.getSubscription(),
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
        const [plansRes, subRes, reqsRes, branchRes, staffRes, cardRes] =
          await Promise.all([
            apiService.plans.getPlans(),
            apiService.subscriptions.getSubscription(),
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
        'A cafeteria can only make one plan change request at a time. Please wait until your pending request is approved or rejected by Super Admin before submitting another request.'
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
        'A cafeteria can only make one plan change request at a time. Please wait until your pending request is approved or rejected by Super Admin before submitting another request.'
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

  return (
    <div className="space-y-8">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Subscription</h1>
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
          {/* Active Subscription Plan Card (Centered) */}
          <div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="sm:col-span-2 sm:max-w-sm sm:mx-auto lg:col-span-1 lg:col-start-2 w-full space-y-3">
                <h2 className="text-base font-bold text-slate-900">Current Subscription</h2>
                <div className="relative flex flex-col justify-between rounded-xl border-2 border-emerald-500 bg-white p-5 shadow-sm ring-2 ring-emerald-500/10">
                  <div className="space-y-4">
                    {/* Top Bar: Plan Name, Active Badge, and Price */}
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-lg font-bold text-slate-900">
                          {currentPlan?.name ? currentPlan.name.replace(/\s+Plan$/i, '') : 'Standard'}
                        </h3>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-xs">
                          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                          ACTIVE PLAN
                        </span>
                      </div>
                      <p className="mt-1 font-mono text-2xl font-bold text-emerald-700">
                        {formatCurrency(currentPlan?.price || 1999)}{' '}
                        <span className="text-xs font-normal text-slate-500">
                          /{currentPlan?.billingInterval?.toLowerCase() || 'monthly'}
                        </span>
                      </p>
                    </div>

                    {/* Technical Limits & Usage */}
                    <div className="space-y-2 border-t border-b border-slate-200 py-3 text-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Resource Limits & Usage
                      </span>
                      <div className="flex items-center justify-between text-slate-700">
                        <span>Counters:</span>
                        <span className="font-mono text-sm font-bold text-slate-900">
                          {branchUsage} / <span className="text-emerald-700 font-extrabold">{branchLimit}</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-700">
                        <span>Staff Accounts:</span>
                        <span className="font-mono text-sm font-bold text-slate-900">
                          {staffUsage} / <span className="text-emerald-700 font-extrabold">{staffLimit}</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-700">
                        <span>Active Cards:</span>
                        <span className="font-mono text-sm font-bold text-slate-900">
                          {cardUsage} / <span className="text-emerald-700 font-extrabold">{cardLimit}</span>
                        </span>
                      </div>
                    </div>

                    {/* Entitlements */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                        Included Features
                      </span>
                      <ul className="space-y-2 text-xs text-slate-700 font-medium">
                        <li className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span>{currentPlan?.inventoryLevel || 'Advanced'} Inventory</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span>{currentPlan?.analyticsLevel || 'Standard'} Analytics</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span>{currentPlan?.supportLevel || 'Priority'} Support</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* Action CTA: Renew Subscription */}
                  <div className="mt-5 pt-3 border-t border-slate-100">
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full"
                      onClick={() => setShowRenewModal(true)}
                      leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                    >
                      Renew Subscription
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Available Plans Section (Separate Dropdown per Plan) */}
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <Layers className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-base font-bold text-slate-900">Available Plans</h3>
                  <Badge variant="outline" className="font-mono text-xs">
                    {plans.length} Available
                  </Badge>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleAllPlans}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer self-start sm:self-auto"
              >
                {allPlansExpanded ? 'Collapse All Details' : 'Expand All Details'}
              </button>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => {
                const isCurrent = plan.id === currentPlan?.id;
                const isExpanded = !!expandedPlanIds[plan.id];

                return (
                  <div
                    key={plan.id}
                    className={`relative flex flex-col justify-between rounded-xl border-2 p-5 transition-all ${
                      isCurrent
                        ? 'border-emerald-500 bg-emerald-50/40 shadow-md ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    <div className="space-y-4">
                      {/* Plan Header */}
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                          {isCurrent && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-xs">
                              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                              ACTIVE PLAN
                            </span>
                          )}
                        </div>
                        <p className="mt-1 font-mono text-2xl font-bold text-emerald-700">
                          {formatCurrency(plan.price)}{' '}
                          <span className="text-xs font-normal text-slate-500">
                            /{plan.billingInterval.toLowerCase()}
                          </span>
                        </p>
                      </div>

                      {/* Individual Plan Dropdown Toggle */}
                      <button
                        type="button"
                        id={`toggle-plan-${plan.id}-details`}
                        onClick={() => togglePlanDetails(plan.id)}
                        className="flex w-full items-center justify-between rounded-lg bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors border border-slate-200 cursor-pointer"
                        aria-expanded={isExpanded}
                      >
                        <span>{isExpanded ? 'Collapse Details' : 'View Plan Details'}</span>
                        <ChevronDown
                          className={`h-4 w-4 text-emerald-600 transition-transform duration-200 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      {/* Collapsible Details: Technical Limits & Entitlements */}
                      {isExpanded && (
                        <div className="space-y-4 pt-1">
                          {/* Technical Limits List */}
                          <div className="space-y-2 border-t border-b border-slate-200 py-3 text-xs">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                              Resource Limits {isCurrent ? '& Usage' : ''}
                            </span>
                            <div className="flex items-center justify-between text-slate-700">
                              <span>Counters:</span>
                              {isCurrent ? (
                                <span className="font-mono text-sm font-bold text-slate-900">
                                  {branchUsage} / <span className="text-emerald-700 font-extrabold">{branchLimit}</span>
                                </span>
                              ) : (
                                <strong className="font-mono text-slate-900 font-bold">{plan.branchLimit}</strong>
                              )}
                            </div>
                            <div className="flex items-center justify-between text-slate-700">
                              <span>Staff Accounts:</span>
                              {isCurrent ? (
                                <span className="font-mono text-sm font-bold text-slate-900">
                                  {staffUsage} / <span className="text-emerald-700 font-extrabold">{staffLimit}</span>
                                </span>
                              ) : (
                                <strong className="font-mono text-slate-900 font-bold">{plan.staffLimit}</strong>
                              )}
                            </div>
                            <div className="flex items-center justify-between text-slate-700">
                              <span>Active Cards:</span>
                              {isCurrent ? (
                                <span className="font-mono text-sm font-bold text-slate-900">
                                  {cardUsage} / <span className="text-emerald-700 font-extrabold">{cardLimit}</span>
                                </span>
                              ) : (
                                <strong className="font-mono text-slate-900 font-bold">{plan.cardLimit}</strong>
                              )}
                            </div>
                          </div>

                          {/* Entitlements */}
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                              Included Features
                            </span>
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
                        </div>
                      )}
                    </div>

                    {/* Action CTA: [ Request Upgrade / Request Downgrade ] */}
                    <div className="mt-5 pt-3 border-t border-slate-100">
                      {isCurrent ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full bg-emerald-50 text-emerald-800 border-emerald-300 font-bold cursor-default"
                          disabled
                        >
                          Current Active Plan
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
                            : `Enquiry for ${plan.name}`}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
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
            <span className="text-slate-500 font-semibold uppercase tracking-wider">Current Cafeteria Plan</span>
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

          {/* Request Type * (only Upgrade & Enquiry) */}
          <Select
            label="Request Type *"
            id="contact-plan-request-type"
            value={formRequestType}
            onChange={(e) => setFormRequestType(e.target.value as 'UPGRADE' | 'DOWNGRADE')}
            options={[
              { value: 'UPGRADE', label: 'Upgrade' },
              { value: 'DOWNGRADE', label: 'Enquiry' },
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
