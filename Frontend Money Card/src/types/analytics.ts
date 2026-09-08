export interface BranchPerformanceMetric {
  branchId: string;
  branchName: string;
  status: 'ACTIVE' | 'INACTIVE';
  transactionCount: number;
  purchaseCount: number;
  purchaseVolume: number;
  rechargeCount: number;
  rechargeVolume: number;
  cardRechargeCount?: number;
  cardRechargeVolume?: number;
  cashRechargeCount?: number;
  cashRechargeVolume?: number;
  upiRechargeCount?: number;
  upiRechargeVolume?: number;
  refundCount: number;
  refundVolume: number;
  totalRevenue: number;
  sessionCount: number;
  activeSessionsCount: number;
  settledSessionsCount: number;
  avgTransactionValue: number;
  avgPurchaseValue: number;
  productsSoldCount: number;
  inventoryItemCount: number;
  lowStockItemCount: number;
}

export interface StaffActivityItem {
  id: string;
  type:
    | 'CARD_ACTIVATION'
    | 'RECHARGE_CASH'
    | 'RECHARGE_UPI'
    | 'PURCHASE'
    | 'REFUND'
    | 'CARD_SETTLEMENT'
    | 'CARD_BLOCKED'
    | 'CARD_UNBLOCKED';
  title: string;
  description: string;
  amount?: number;
  cardNumber?: string;
  customerName?: string;
  customerPhone?: string;
  branchId?: string;
  branchName?: string;
  timestamp: string;
  paymentMethod?: string;
}

export interface StaffPerformanceMetric {
  staffId: string;
  staffName: string;
  staffEmail: string;
  role: string;
  status: 'ACTIVE' | 'INACTIVE';
  branchId?: string;
  branchName?: string;
  cardsActivatedCount: number;
  cardsSettledCount: number;
  totalTransactionsCount: number;
  totalVolumeHandled: number;
  rechargeCount: number;
  rechargeVolume: number;
  cardRechargeCount: number;
  cardRechargeVolume: number;
  upiRechargeCount: number;
  upiRechargeVolume: number;
  purchaseCount: number;
  purchaseVolume: number;
  refundCount: number;
  refundVolume: number;
  activities: StaffActivityItem[];
}

export interface AnalyticsOverview {
  totalTransactions: number;
  totalRechargeVolume: number;
  totalPurchaseVolume: number;
  totalRefundVolume: number;
  activeSessionsCount: number;
  activeCardsCount: number;
  lowStockItemsCount: number;
  branchPerformance?: BranchPerformanceMetric[];
  staffPerformance?: StaffPerformanceMetric[];
  activeCardsRechargeCount?: number;
  reRechargedCardsCount?: number;
  closedCardsCount?: number;
  zeroBalanceActiveCardsCount?: number;
}

export interface AnalyticsFilter {
  organizationId?: string;
  branchId?: string;
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  category?: string;
}

export interface AnalyticsExportResponseData {
  filename: string;
  content: string;
  mimeType: string;
}

export interface ReportItem {
  id: string;
  title: string;
  type: string;
  generatedAt: string;
  downloadUrl: string;
}

export interface HourlyActivityMetric {
  hour: number;
  hourLabel: string;
  transactionCount: number;
  rechargeCount: number;
  purchaseCount: number;
  sessionCount: number;
  totalVolume: number;
  isPeak: boolean;
}

export interface ProductDemandMetric {
  productId: string;
  productName: string;
  category: string;
  quantitySold: number;
  revenue: number;
  peakHourQuantity: number;
  offPeakQuantity: number;
  stockStatus: 'NORMAL' | 'LOW' | 'OUT_OF_STOCK';
  currentStock?: number;
}

export interface PeakPeriodComparison {
  peakHoursRange: string;
  peakTransactions: number;
  offPeakTransactions: number;
  peakVolume: number;
  offPeakVolume: number;
  busiestHour: string;
  busiestBranchName: string;
}

export interface PeakAnalyticsOverview {
  hourlyDistribution: HourlyActivityMetric[];
  productDemand: ProductDemandMetric[];
  comparison: PeakPeriodComparison;
  totalTransactions: number;
  totalPurchaseVolume: number;
  totalRechargeVolume: number;
  busiestDay?: string;
}
