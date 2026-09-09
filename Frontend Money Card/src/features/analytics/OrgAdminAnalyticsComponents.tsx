import { Link } from 'react-router-dom';
import {
  TrendingUp,
  CreditCard,
  BarChart3,
  Layers,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  ArrowUpDown,
  Building2,
  Eye,
  Users,
  UserCheck,
  ArrowRight,
  SlidersHorizontal,
  Check,
  Download,
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

interface KpiCardsProps {
  analytics: AnalyticsOverview;
}

export function OrgAdminKpiCards({ analytics }: KpiCardsProps) {
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
        icon={<CreditCard className="h-5 w-5 text-emerald-600" />}
      />
      <StatCard
        label="Total Transactions"
        value={analytics.totalTransactions.toLocaleString()}
        icon={<BarChart3 className="h-5 w-5 text-emerald-600" />}
      />
      <StatCard
        label="Active Card Sessions"
        value={analytics.activeSessionsCount.toLocaleString()}
        icon={<Layers className="h-5 w-5 text-emerald-600" />}
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
  return (
    <div className="space-y-3">
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
  pdfSections: OrgPdfSectionOptions;
  activeSectionsCount: number;
  onToggleSection: (sectionKey: keyof OrgPdfSectionOptions) => void;
  onSetAllSections: (enable: boolean) => void;
  onDownloadPdf: () => void;
}

export function OrgAdminPdfModal({
  isOpen,
  onClose,
  pdfPreviewUrl,
  pdfSections,
  activeSectionsCount,
  onToggleSection,
  onSetAllSections,
  onDownloadPdf,
}: PdfModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cafeteria Analytics Report — PDF Preview" size="xl">
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                <SlidersHorizontal className="h-4 w-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">Customize Report Sections</h4>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="pdf-opt-select-all"
                onClick={() => onSetAllSections(true)}
                className="rounded-md px-2 py-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                Select All
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                id="pdf-opt-clear-all"
                onClick={() => onSetAllSections(false)}
                className="rounded-md px-2 py-1 text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Clear All
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2.5">
            <button
              type="button"
              id="pdf-toggle-executive-kpis"
              onClick={() => onToggleSection('includeExecutiveKpis')}
              className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-all cursor-pointer ${
                pdfSections.includeExecutiveKpis
                  ? 'border-emerald-300 bg-emerald-50/60 text-emerald-950 shadow-2xs ring-1 ring-emerald-400/30'
                  : 'border-slate-200 bg-slate-50/60 text-slate-500 hover:border-slate-300 hover:bg-slate-100/50 opacity-70'
              }`}
            >
              <div
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                  pdfSections.includeExecutiveKpis
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-slate-300 bg-white'
                }`}
              >
                {pdfSections.includeExecutiveKpis && <Check className="h-3 w-3 stroke-[3]" />}
              </div>
              <span className="text-xs font-semibold">1. Executive KPIs</span>
            </button>

            <button
              type="button"
              id="pdf-toggle-branch-comparison"
              onClick={() => onToggleSection('includeBranchComparison')}
              className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-all cursor-pointer ${
                pdfSections.includeBranchComparison
                  ? 'border-emerald-300 bg-emerald-50/60 text-emerald-950 shadow-2xs ring-1 ring-emerald-400/30'
                  : 'border-slate-200 bg-slate-50/60 text-slate-500 hover:border-slate-300 hover:bg-slate-100/50 opacity-70'
              }`}
            >
              <div
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                  pdfSections.includeBranchComparison
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-slate-300 bg-white'
                }`}
              >
                {pdfSections.includeBranchComparison && <Check className="h-3 w-3 stroke-[3]" />}
              </div>
              <span className="text-xs font-semibold">2. Counter Comparison</span>
            </button>

            <button
              type="button"
              id="pdf-toggle-staff-performance"
              onClick={() => onToggleSection('includeStaffPerformance')}
              className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-all cursor-pointer ${
                pdfSections.includeStaffPerformance
                  ? 'border-emerald-300 bg-emerald-50/60 text-emerald-950 shadow-2xs ring-1 ring-emerald-400/30'
                  : 'border-slate-200 bg-slate-50/60 text-slate-500 hover:border-slate-300 hover:bg-slate-100/50 opacity-70'
              }`}
            >
              <div
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                  pdfSections.includeStaffPerformance
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-slate-300 bg-white'
                }`}
              >
                {pdfSections.includeStaffPerformance && <Check className="h-3 w-3 stroke-[3]" />}
              </div>
              <span className="text-xs font-semibold">3. Staff Performance</span>
            </button>
          </div>
        </div>

        {pdfPreviewUrl && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-lg">
            <iframe
              src={`${pdfPreviewUrl}#toolbar=0`}
              className="w-full h-[70vh] rounded-lg"
              title="Cafeteria Analytics Report PDF Preview"
            />
          </div>
        )}

        <ModalFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onDownloadPdf}
            leftIcon={<Download className="h-4 w-4" />}
            id="download-customized-pdf-btn"
          >
            {activeSectionsCount === 0
              ? 'Download PDF (Empty)'
              : `Download PDF (${activeSectionsCount} Section${activeSectionsCount > 1 ? 's' : ''})`}
          </Button>
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
