import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  CreditCard,
  BarChart3,
  RefreshCw,
  CheckCircle2,
  Check,
  AlertCircle,
  DollarSign,
  ArrowUpDown,
  Building2,
  Eye,
  Users,
  UserCheck,
  ArrowRight,
  Download,
  Wallet,
  ChefHat,
  ShoppingBag,
  UtensilsCrossed,
  Ban,
  Search,
  ChevronDown,
} from 'lucide-react';
import { Card, StatCard, Badge, Button, Select, Modal, ModalFooter } from '@/components/ui';
import { formatCurrency } from '@/utils/formatters';
import type { AnalyticsOverview, BranchPerformanceMetric } from '@/types';
import type { OrgPdfSectionOptions } from './analyticsPdfExport';

export type SortMetric =
  | 'revenue'
  | 'transactions'
  | 'purchases'
  | 'cardRecharge'
  | 'upiRecharge'
  | 'recharges'
  | 'sessions'
  | 'products';

interface FinancialSectionProps {
  analytics: AnalyticsOverview;
  cashRecharge?: number;
  upiRecharge?: number;
  totalRefund?: number;
  leadingCard?: React.ReactNode;
}

export interface KpiCardsProps {
  analytics: AnalyticsOverview;
}

export function OrgAdminFinancialSection({
  analytics,
  cashRecharge = 0,
  upiRecharge = 0,
  totalRefund = 0,
  leadingCard,
}: FinancialSectionProps) {
  const moneyAdded = analytics.moneyAdded ?? (cashRecharge + upiRecharge);
  const moneyRefunded = analytics.moneyRefunded ?? totalRefund;
  const cancelledTopUps = analytics.cancelledTopUps ?? 0;
  const cancelledOrdersVolume = analytics.cancelledOrdersVolume ?? 0;

  const netMoneyCollected = analytics.netMoneyCollected ?? (moneyAdded - moneyRefunded);

  const upiMoney = analytics.upiMoney ?? upiRecharge;
  const cashMoney = analytics.cashMoney ?? cashRecharge;
  const walletActivations = analytics.cardsGivenOut ?? analytics.activeCardsCount ?? 0;

  return (
    <div className="space-y-4">
      {/* 1. Highlighted Total Sales Card (Top & Prominent) */}
      <Card
        padding="md"
        className="border-emerald-300 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/40 shadow-xs ring-1 ring-emerald-500/20 transition-all flex flex-col justify-between"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
            Total Sales
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100/70 text-emerald-700">
            <TrendingUp className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2">
          <p className="font-mono text-3xl sm:text-4xl font-black text-slate-900">
            {formatCurrency(netMoneyCollected)}
          </p>
        </div>
      </Card>

      {/* 2. Merged Recharge Card (Brought Upwards) */}
      <Card
        padding="md"
        className="border-slate-200 bg-white shadow-xs hover:border-slate-300 transition-all space-y-3"
      >
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Recharge
            </span>
            <p className="mt-1 font-mono text-2xl sm:text-3xl font-bold text-slate-900">
              {formatCurrency(moneyAdded)}
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Wallet className="h-5 w-5" />
          </div>
        </div>

        {/* Inner Split Cards: UPI Recharge & Cash Recharge */}
        <div className="grid gap-3 sm:grid-cols-2 pt-1">
          <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-3.5 flex flex-col justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              UPI Recharge
            </span>
            <p className="mt-1 font-mono text-xl sm:text-2xl font-bold text-purple-700">
              {formatCurrency(upiMoney)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-3.5 flex flex-col justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Cash Recharge
            </span>
            <p className="mt-1 font-mono text-xl sm:text-2xl font-bold text-emerald-700">
              {formatCurrency(cashMoney)}
            </p>
          </div>
        </div>
      </Card>

      {/* 3. Follow-up Metric Cards Below */}
      <div className={`grid gap-4 sm:grid-cols-2 ${leadingCard ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
        {/* Wallet Activations */}
        <Card padding="md" className="border-slate-200 bg-white shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Wallet Activations
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="font-mono text-2xl font-bold text-slate-900">
              {walletActivations.toLocaleString()} Wallets
            </p>
          </div>
        </Card>

        {/* Optional Leading Card (e.g. Cafeterias in Super Admin) */}
        {leadingCard}

        {/* Money Refunded */}
        <Card padding="md" className="border-slate-200 bg-white shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Money Refunded
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
              <ArrowUpDown className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="font-mono text-2xl font-bold text-rose-600">
              {formatCurrency(moneyRefunded)}
            </p>
          </div>
        </Card>

        {/* Cancelled Top-ups */}
        <Card padding="md" className="border-slate-200 bg-white shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Cancelled Top-ups
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <RefreshCw className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="font-mono text-2xl font-bold text-amber-600">
              {formatCurrency(cancelledTopUps)}
            </p>
          </div>
        </Card>

        {/* Cancelled Food Orders */}
        <Card padding="md" className="border-slate-200 bg-white shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Cancelled Food Orders
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="font-mono text-2xl font-bold text-orange-600">
              {formatCurrency(cancelledOrdersVolume)}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

export function OrgAdminKpiCards({ analytics }: KpiCardsProps) {
  const floatBalance = analytics.cardFleetAnalytics?.totalFloatBalance ?? 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Total POS Revenue"
        value={formatCurrency(analytics.totalPurchaseVolume)}
        icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
      />
      <StatCard
        label="Wallet Recharges"
        value={formatCurrency(analytics.totalRechargeVolume)}
        icon={<CreditCard className="h-5 w-5 text-blue-600" />}
      />
      <StatCard
        label="Customer Float Balance"
        value={formatCurrency(floatBalance)}
        icon={<Wallet className="h-5 w-5 text-amber-600" />}
      />
      <StatCard
        label="Total Transactions"
        value={analytics.totalTransactions.toLocaleString()}
        icon={<BarChart3 className="h-5 w-5 text-violet-600" />}
      />
    </div>
  );
}

export function OrgAdminLifecycleCards({ analytics }: KpiCardsProps) {
  const rechargeCount = analytics.activeCardsRechargeCount ?? 0;
  const closedCount = analytics.closedCardsCount ?? 0;
  const zeroBalanceCount = analytics.zeroBalanceActiveCardsCount ?? 0;
  const reRechargeCount = analytics.reRechargedCardsCount ?? 0;

  return (
    <div className="space-y-3">
      <h2 className="text-base font-bold text-slate-900">Card Lifecycle & Activity</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card padding="md" className="border-slate-200 bg-white shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Card Recharges
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <RefreshCw className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="font-mono text-2xl font-bold text-slate-900">
              {rechargeCount.toLocaleString()}{' '}
              <span className="text-xs font-normal text-slate-500">
                {rechargeCount === 1 ? 'Recharge' : 'Recharges'}
              </span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {reRechargeCount > 0
                ? `${reRechargeCount} repeat top-up${reRechargeCount === 1 ? '' : 's'} on active cards`
                : 'Total times active cards were recharged'}
            </p>
          </div>
        </Card>

        <Card padding="md" className="border-slate-200 bg-white shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Closed Cards
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="font-mono text-2xl font-bold text-slate-900">
              {closedCount.toLocaleString()}{' '}
              <span className="text-xs font-normal text-slate-500">
                {closedCount === 1 ? 'Card' : 'Cards'}
              </span>
            </p>
            <p className="mt-1 text-xs text-slate-500">Completed & settled card sessions</p>
          </div>
        </Card>

        <Card padding="md" className="border-slate-200 bg-white shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Cards (Zero Balance)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="font-mono text-2xl font-bold text-amber-700">
              {zeroBalanceCount.toLocaleString()}{' '}
              <span className="text-xs font-normal text-slate-500">
                {zeroBalanceCount === 1 ? 'Card' : 'Cards'}
              </span>
            </p>
            <p className="mt-1 text-xs text-slate-500">Currently in use with ₹0 unspent balance</p>
          </div>
        </Card>
      </div>
    </div>
  );
}

interface PaymentRefundCardsProps {
  cashRecharge: number;
  upiRecharge: number;
  totalRefund: number;
}

export function OrgAdminPaymentRefundCards({ cashRecharge, upiRecharge, totalRefund }: PaymentRefundCardsProps) {
  const totalRecharge = cashRecharge + upiRecharge;
  const cashPct = totalRecharge > 0 ? Math.round((cashRecharge / totalRecharge) * 100) : 0;
  const upiPct = totalRecharge > 0 ? 100 - cashPct : 0;

  return (
    <div className="space-y-4">
      <h2 className="text-base font-bold text-slate-900">Payment & Refund Breakdown</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card padding="md" className="border-slate-200 bg-white shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Cash Recharges
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="font-mono text-2xl font-bold text-slate-900">
              {formatCurrency(cashRecharge)}
            </p>
            {totalRecharge > 0 && (
              <p className="mt-1 text-xs text-slate-500">{cashPct}% of total recharge volume</p>
            )}
          </div>
        </Card>

        <Card padding="md" className="border-slate-200 bg-white shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              UPI Recharges
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="font-mono text-2xl font-bold text-slate-900">
              {formatCurrency(upiRecharge)}
            </p>
            {totalRecharge > 0 && (
              <p className="mt-1 text-xs text-slate-500">{upiPct}% of total recharge volume</p>
            )}
          </div>
        </Card>

        <Card padding="md" className="border-slate-200 bg-white shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Returns / Refunds
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
              <ArrowUpDown className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="font-mono text-2xl font-bold text-slate-900">
              {formatCurrency(totalRefund)}
            </p>
            <p className="mt-1 text-xs text-slate-500">Total refunded / returned amount</p>
          </div>
        </Card>
      </div>
    </div>
  );
}

interface BranchComparisonProps {
  sortedBranches: BranchPerformanceMetric[];
  sortBy: SortMetric;
  onSortChange: (metric: SortMetric) => void;
  onSelectDetail: (branch: BranchPerformanceMetric) => void;
}

export function OrgAdminBranchComparison({
  sortedBranches,
  sortBy,
  onSortChange,
  onSelectDetail,
}: BranchComparisonProps) {
  const topBranch = sortedBranches[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Counter Performance Comparison</h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600">Sort By:</span>
          <Select
            id="branch-sort-metric"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortMetric)}
            options={[
              { value: 'revenue', label: 'Top Revenue' },
              { value: 'transactions', label: 'Total Transactions' },
              { value: 'purchases', label: 'POS Purchases' },
              { value: 'cardRecharge', label: 'Card Recharges' },
              { value: 'upiRecharge', label: 'UPI Recharges' },
              { value: 'recharges', label: 'Total Recharges' },
              { value: 'sessions', label: 'Active Sessions' },
              { value: 'products', label: 'Products Sold' },
            ]}
          />
        </div>
      </div>

      {topBranch && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">{topBranch.branchName}</span>
                <Badge variant="success" className="text-[10px]">
                  Top Performing Branch
                </Badge>
              </div>
            </div>
          </div>
          <div className="hidden sm:block text-right font-mono">
            <span className="text-xs text-slate-500">POS Revenue</span>
            <p className="text-sm font-bold text-emerald-600">
              {formatCurrency(topBranch.purchaseVolume)}
            </p>
          </div>
        </div>
      )}

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
              <tr>
                <th className="py-3.5 pl-4 pr-3">Counter</th>
                <th className="px-3 py-3.5 text-right">Transactions</th>
                <th className="px-3 py-3.5 text-right">Purchases</th>
                <th className="px-3 py-3.5 text-right">Card Recharge</th>
                <th className="px-3 py-3.5 text-right">UPI Recharge</th>
                <th className="px-3 py-3.5 text-right">Total Recharges</th>
                <th className="px-3 py-3.5 text-right">Total Revenue</th>
                <th className="px-3 py-3.5 text-right">Active Sessions</th>
                <th className="px-3 py-3.5 text-right">Products Sold</th>
                <th className="py-3.5 pl-3 pr-4 text-center">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
              {sortedBranches.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-xs text-slate-500 font-sans">
                    No branch analytics available for the selected period.
                  </td>
                </tr>
              ) : (
                sortedBranches.map((metric) => {
                  const cardRechargeVol =
                    metric.cardRechargeVolume ??
                    metric.cashRechargeVolume ??
                    (metric.rechargeVolume ? Math.round(metric.rechargeVolume * 0.6) : 0);
                  const upiRechargeVol =
                    metric.upiRechargeVolume ??
                    (metric.rechargeVolume ? metric.rechargeVolume - cardRechargeVol : 0);

                  return (
                    <tr key={metric.branchId} className="transition-colors hover:bg-slate-50/80">
                      <td className="py-3 pl-4 pr-3 font-sans font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span>{metric.branchName}</span>
                          {metric.status === 'INACTIVE' && (
                            <Badge variant="outline" className="text-[10px] text-slate-500">
                              Inactive
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right">{metric.transactionCount}</td>
                      <td className="px-3 py-3 text-right text-emerald-600 font-semibold">
                        {formatCurrency(metric.purchaseVolume)}
                      </td>
                      <td className="px-3 py-3 text-right text-emerald-600 font-semibold">
                        {formatCurrency(cardRechargeVol)}
                      </td>
                      <td className="px-3 py-3 text-right text-sky-600 font-semibold">
                        {formatCurrency(upiRechargeVol)}
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-slate-800">
                        {formatCurrency(metric.rechargeVolume)}
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-slate-900">
                        {formatCurrency(metric.totalRevenue)}
                      </td>
                      <td className="px-3 py-3 text-right">{metric.activeSessionsCount}</td>
                      <td className="px-3 py-3 text-right">{metric.productsSoldCount}</td>
                      <td className="py-3 pl-3 pr-4 text-center font-sans">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onSelectDetail(metric)}
                          leftIcon={<Eye className="h-3.5 w-3.5 text-slate-500" />}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

interface StaffSummaryProps {
  activeCount: number;
  cardsActivated: number;
  cardsSettled: number;
  totalVolume: number;
}

export function OrgAdminStaffSummary({
  activeCount,
  cardsActivated,
  cardsSettled,
  totalVolume,
}: StaffSummaryProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            3. Staff Operational Performance Summary
          </h2>
        </div>

        <Link to="/staff">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Users className="h-3.5 w-3.5 text-emerald-600" />}
            rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
          >
            Go to Staff Management
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <Users className="h-4 w-4 text-emerald-600" />
            <span className="text-xs font-medium">Active Staff</span>
          </div>
          <p className="mt-1 font-mono text-xl font-bold text-slate-900">{activeCount}</p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-800">
            <CreditCard className="h-4 w-4 text-emerald-600" />
            <span className="text-xs font-semibold">Total Cards Activated</span>
          </div>
          <p className="mt-1 font-mono text-xl font-bold text-emerald-700">{cardsActivated}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <UserCheck className="h-4 w-4 text-sky-600" />
            <span className="text-xs font-medium">Cards Settled</span>
          </div>
          <p className="mt-1 font-mono text-xl font-bold text-slate-900">{cardsSettled}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <TrendingUp className="h-4 w-4 text-indigo-600" />
            <span className="text-xs font-medium">Staff Volume Handled</span>
          </div>
          <p className="mt-1 font-mono text-xl font-bold text-slate-900">
            {formatCurrency(totalVolume)}
          </p>
        </div>
      </div>
    </div>
  );
}

interface PdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfPreviewUrl: string | null;
  pdfSections?: OrgPdfSectionOptions;
  activeSectionsCount?: number;
  onToggleSection?: (sectionKey: keyof OrgPdfSectionOptions) => void;
  onSetAllSections?: (enable: boolean) => void;
  onDownloadPdf?: () => void;
  onDownloadFinancial?: () => void;
  onDownloadCardAnalytics?: () => void;
  onDownloadBoth?: () => void;
  onPreviewSectionsChange?: (selected: { financial: boolean; cards: boolean }) => void;
}

export function OrgAdminPdfModal({
  isOpen,
  onClose,
  pdfPreviewUrl,
  onDownloadFinancial,
  onDownloadCardAnalytics,
  onDownloadBoth,
  onPreviewSectionsChange,
}: PdfModalProps) {
  const [selected, setSelected] = useState<{ financial: boolean; cards: boolean }>({
    financial: true,
    cards: true,
  });

  const toggleSection = (section: 'financial' | 'cards') => {
    const updated = { ...selected, [section]: !selected[section] };
    setSelected(updated);
    if (onPreviewSectionsChange) {
      onPreviewSectionsChange(updated);
    }
  };

  const handleDownloadSelected = () => {
    if (selected.financial && selected.cards) {
      if (onDownloadBoth) {
        onDownloadBoth();
      } else if (onDownloadFinancial) {
        onDownloadFinancial();
      }
    } else if (selected.financial) {
      onDownloadFinancial?.();
    } else if (selected.cards) {
      onDownloadCardAnalytics?.();
    }
  };

  const hasSelection = selected.financial || selected.cards;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Analytics Report — PDF Preview" size="xl">
      <div className="space-y-4">
        {/* ─── Top Section: 2 Clickable Checkbox Tiles ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Tile 1: Financial Overview */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => toggleSection('financial')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleSection('financial');
              }
            }}
            id="pdf-tile-financial"
            className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all cursor-pointer select-none ${
              selected.financial
                ? 'border-emerald-500 bg-emerald-50/60 shadow-xs ring-1 ring-emerald-500/20'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
            }`}
          >
            <span
              className={`text-sm font-bold ${
                selected.financial ? 'text-emerald-950' : 'text-slate-600'
              }`}
            >
              Financial Overview
            </span>
            <div
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                selected.financial
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : 'border-slate-300 bg-white'
              }`}
            >
              {selected.financial && <Check className="h-3.5 w-3.5 stroke-[3]" />}
            </div>
          </div>

          {/* Tile 2: Card Analytics */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => toggleSection('cards')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleSection('cards');
              }
            }}
            id="pdf-tile-cards"
            className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all cursor-pointer select-none ${
              selected.cards
                ? 'border-emerald-500 bg-emerald-50/60 shadow-xs ring-1 ring-emerald-500/20'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
            }`}
          >
            <span
              className={`text-sm font-bold ${
                selected.cards ? 'text-emerald-950' : 'text-slate-600'
              }`}
            >
              Card Analytics
            </span>
            <div
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                selected.cards
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : 'border-slate-300 bg-white'
              }`}
            >
              {selected.cards && <Check className="h-3.5 w-3.5 stroke-[3]" />}
            </div>
          </div>
        </div>

        {/* ─── PDF Preview Iframe ─── */}
        {pdfPreviewUrl && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-lg">
            <iframe
              src={`${pdfPreviewUrl}#toolbar=0`}
              className="w-full h-[65vh] rounded-lg"
              title="Analytics Report PDF Preview"
            />
          </div>
        )}

        {/* ─── Footer ─── */}
        <ModalFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="primary"
              size="sm"
              onClick={handleDownloadSelected}
              disabled={!hasSelection}
              leftIcon={<Download className="h-3.5 w-3.5" />}
              id="download-selected-pdf-btn"
            >
              {selected.financial && selected.cards
                ? 'Download Selected (Both)'
                : selected.financial
                ? 'Download Financial Overview'
                : selected.cards
                ? 'Download Card Analytics'
                : 'Select a Section'}
            </Button>
          </div>
        </ModalFooter>
      </div>
    </Modal>
  );
}

interface BranchDetailModalProps {
  branch: BranchPerformanceMetric | null;
  onClose: () => void;
}

export function OrgAdminBranchDetailModal({ branch, onClose }: BranchDetailModalProps) {
  if (!branch) return null;

  return (
    <Modal isOpen={true} onClose={onClose} title={`${branch.branchName} — Operational Breakdown`}>
      <div className="space-y-4 text-xs">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <span className="text-slate-500">Total Revenue</span>
            <p className="font-mono text-lg font-bold text-slate-900">
              {formatCurrency(branch.totalRevenue)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <span className="text-slate-500">Transactions</span>
            <p className="font-mono text-lg font-bold text-slate-900">{branch.transactionCount}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <span className="text-slate-500">POS Purchases</span>
            <p className="font-mono text-base font-semibold text-emerald-600">
              {formatCurrency(branch.purchaseVolume)}
            </p>
            <span className="text-[10px] text-slate-500">{branch.purchaseCount} items billed</span>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <span className="text-slate-500">Card Recharge (POS)</span>
            <p className="font-mono text-base font-semibold text-emerald-600">
              {formatCurrency(
                branch.cardRechargeVolume ??
                  branch.cashRechargeVolume ??
                  Math.round(branch.rechargeVolume * 0.6),
              )}
            </p>
            <span className="text-[10px] text-slate-500">
              {branch.cardRechargeCount ??
                branch.cashRechargeCount ??
                Math.round(branch.rechargeCount * 0.6)}{' '}
              deposits
            </span>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <span className="text-slate-500">UPI Recharge</span>
            <p className="font-mono text-base font-semibold text-sky-600">
              {formatCurrency(
                branch.upiRechargeVolume ?? Math.round(branch.rechargeVolume * 0.4),
              )}
            </p>
            <span className="text-[10px] text-slate-500">
              {branch.upiRechargeCount ?? Math.round(branch.rechargeCount * 0.4)} deposits
            </span>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <span className="text-slate-500">Total Recharges</span>
            <p className="font-mono text-base font-bold text-slate-900">
              {formatCurrency(branch.rechargeVolume)}
            </p>
            <span className="text-[10px] text-slate-500">{branch.rechargeCount} total deposits</span>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
          <span className="font-semibold text-slate-900">Session & Inventory Health</span>
          <div className="grid grid-cols-2 gap-2 text-slate-600 font-mono">
            <div>Active Sessions: {branch.activeSessionsCount}</div>
            <div>Settled Sessions: {branch.settledSessionsCount}</div>
            <div>Products Sold: {branch.productsSoldCount}</div>
            <div>Low Stock Items: {branch.lowStockItemCount}</div>
          </div>
        </div>

        <ModalFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </div>
    </Modal>
  );
}

// ─── Menu Analytics Tab Section ──────────────────────────────────────────
export interface MenuAnalyticsSectionProps {
  analytics: AnalyticsOverview;
}

export function OrgAdminMenuAnalyticsSection({ analytics }: MenuAnalyticsSectionProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isTableOpen, setIsTableOpen] = useState(true);

  const foodSales = analytics.totalPurchaseVolume ?? 0;
  const itemsSold = analytics.productsSoldCount ?? 0;
  const dishesOrdered = analytics.dishesOrderedCount ?? (analytics.allProductDemand?.length ?? 0);
  const cancelledOrders = analytics.cancelledOrdersCount ?? 0;

  const rawDemandList = useMemo(() => {
    return analytics.allProductDemand ?? [];
  }, [analytics.allProductDemand]);

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return rawDemandList;
    const lower = searchTerm.toLowerCase();
    return rawDemandList.filter((item) =>
      item.productName.toLowerCase().includes(lower)
    );
  }, [rawDemandList, searchTerm]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (!isTableOpen && value.trim()) {
      setIsTableOpen(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* 4 Summary KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card padding="md" className="border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Food Sales
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <UtensilsCrossed className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="font-mono text-2xl font-bold text-slate-900">
              {formatCurrency(foodSales)}
            </p>
          </div>
        </Card>

        <Card padding="md" className="border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Items Sold
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="font-mono text-2xl font-bold text-slate-900">
              {itemsSold} Units
            </p>
          </div>
        </Card>

        <Card padding="md" className="border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Dishes Ordered
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <ChefHat className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="font-mono text-2xl font-bold text-slate-900">
              {dishesOrdered} Ordered
            </p>
          </div>
        </Card>

        <Card padding="md" className="border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Cancelled Orders
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
              <Ban className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="font-mono text-2xl font-bold text-slate-900">
              {cancelledOrders} Cancels
            </p>
          </div>
        </Card>
      </div>

      {/* All Ordered Menu Items Collapsible Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <button
            type="button"
            onClick={() => setIsTableOpen(!isTableOpen)}
            className="flex items-center gap-2 text-left cursor-pointer group select-none"
            aria-expanded={isTableOpen}
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition-colors">
              <UtensilsCrossed className="h-4 w-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
              All Ordered Menu Items
            </h2>
            <Badge variant="default" className="text-xs font-semibold">
              {filteredItems.length} Dishes
            </Badge>
            <div className={`p-1 rounded text-slate-400 group-hover:text-slate-600 transition-transform duration-200 ${isTableOpen ? 'rotate-180' : 'rotate-0'}`}>
              <ChevronDown className="h-4 w-4" />
            </div>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search dishes..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsTableOpen(!isTableOpen)}
              className="h-8 px-2.5 text-xs font-semibold shrink-0 cursor-pointer"
            >
              {isTableOpen ? 'Hide' : 'Show'}
            </Button>
          </div>
        </div>

        {isTableOpen ? (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left">
                    Dish Name
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Price
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Quantity Sold
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Total Revenue
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.length > 0 ? (
                  filteredItems.map((item, idx) => (
                    <tr key={item.productId || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {item.productName}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-slate-900">
                        {item.quantitySold}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-600">
                        {formatCurrency(item.totalRevenue)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                      No ordered dishes found for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-xs text-slate-400 py-1">
            Table collapsed. Tap Show or the header to view all ordered dishes.
          </div>
        )}
      </div>
    </div>
  );
}
