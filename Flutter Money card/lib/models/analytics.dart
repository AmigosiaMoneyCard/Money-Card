class ProductDemand {
  final String productId;
  final String productName;
  final int quantitySold;
  final double totalRevenue;

  const ProductDemand({
    required this.productId,
    required this.productName,
    required this.quantitySold,
    required this.totalRevenue,
  });

  factory ProductDemand.fromJson(Map<String, dynamic> json) {
    return ProductDemand(
      productId: json['productId'] as String? ?? '',
      productName: json['productName'] as String? ?? json['itemName'] as String? ?? '',
      quantitySold: (json['quantitySold'] as num?)?.toInt() ?? 0,
      totalRevenue: (json['totalRevenue'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() => {
        'productId': productId,
        'productName': productName,
        'quantitySold': quantitySold,
        'totalRevenue': totalRevenue,
      };
}

class PeakPeriod {
  final String timeSlot;
  final String activityLevel; // 'Highest', 'High', 'Moderate', 'Normal'
  final int transactionCount;
  final double purchaseVolume;

  const PeakPeriod({
    required this.timeSlot,
    required this.activityLevel,
    required this.transactionCount,
    required this.purchaseVolume,
  });

  factory PeakPeriod.fromJson(Map<String, dynamic> json) {
    return PeakPeriod(
      timeSlot: json['timeSlot'] as String? ?? '',
      activityLevel: json['activityLevel'] as String? ?? 'Normal',
      transactionCount: (json['transactionCount'] as num?)?.toInt() ?? 0,
      purchaseVolume: (json['purchaseVolume'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() => {
        'timeSlot': timeSlot,
        'activityLevel': activityLevel,
        'transactionCount': transactionCount,
        'purchaseVolume': purchaseVolume,
      };
}

class BranchPerformanceMetric {
  final String branchId;
  final String branchName;
  final String status;
  final int transactionCount;
  final int purchaseCount;
  final double purchaseVolume;
  final int rechargeCount;
  final double rechargeVolume;
  final int refundCount;
  final double refundVolume;
  final double totalRevenue;
  final int sessionCount;
  final int activeSessionsCount;
  final int settledSessionsCount;
  final double avgTransactionValue;
  final double avgPurchaseValue;
  final int productsSoldCount;
  final int inventoryItemCount;
  final int lowStockItemCount;
  final List<ProductDemand>? productDemand;
  final List<PeakPeriod>? peakPeriods;

  final double moneyAdded;
  final double moneyRefunded;
  final double cancelledTopUps;
  final int cancelledTopUpsCount;
  final double netMoneyCollected;
  final double cashInDrawer;
  final double upiMoney;
  final int upiCount;
  final double cashMoney;
  final int cashCount;
  final int cardsGivenOut;
  final int cardsReturned;
  final int cancelledOrdersCount;
  final double cancelledOrdersVolume;

  const BranchPerformanceMetric({
    required this.branchId,
    required this.branchName,
    this.status = 'ACTIVE',
    this.transactionCount = 0,
    this.purchaseCount = 0,
    this.purchaseVolume = 0.0,
    this.rechargeCount = 0,
    this.rechargeVolume = 0.0,
    this.refundCount = 0,
    this.refundVolume = 0.0,
    this.totalRevenue = 0.0,
    this.sessionCount = 0,
    this.activeSessionsCount = 0,
    this.settledSessionsCount = 0,
    this.avgTransactionValue = 0.0,
    this.avgPurchaseValue = 0.0,
    this.productsSoldCount = 0,
    this.inventoryItemCount = 0,
    this.lowStockItemCount = 0,
    this.productDemand,
    this.peakPeriods,
    this.moneyAdded = 0.0,
    this.moneyRefunded = 0.0,
    this.cancelledTopUps = 0.0,
    this.cancelledTopUpsCount = 0,
    this.netMoneyCollected = 0.0,
    this.cashInDrawer = 0.0,
    this.upiMoney = 0.0,
    this.upiCount = 0,
    this.cashMoney = 0.0,
    this.cashCount = 0,
    this.cardsGivenOut = 0,
    this.cardsReturned = 0,
    this.cancelledOrdersCount = 0,
    this.cancelledOrdersVolume = 0.0,
  });

  factory BranchPerformanceMetric.fromJson(Map<String, dynamic> json) {
    final rechVol = (json['rechargeVolume'] as num?)?.toDouble() ?? 0.0;
    final refVol = (json['refundVolume'] as num?)?.toDouble() ?? 0.0;
    final cashVol = (json['cashMoney'] as num?)?.toDouble() ??
        (json['cashRechargeVolume'] as num?)?.toDouble() ??
        0.0;
    final cancelTopUps = (json['cancelledTopUps'] as num?)?.toDouble() ??
        (json['cancelledTopUpsVolume'] as num?)?.toDouble() ??
        0.0;

    return BranchPerformanceMetric(
      branchId: json['branchId'] as String? ?? '',
      branchName: json['branchName'] as String? ?? '',
      status: json['status'] as String? ?? 'ACTIVE',
      transactionCount: (json['transactionCount'] as num?)?.toInt() ?? 0,
      purchaseCount: (json['purchaseCount'] as num?)?.toInt() ?? 0,
      purchaseVolume: (json['purchaseVolume'] as num?)?.toDouble() ?? 0.0,
      rechargeCount: (json['rechargeCount'] as num?)?.toInt() ?? 0,
      rechargeVolume: rechVol,
      refundCount: (json['refundCount'] as num?)?.toInt() ?? 0,
      refundVolume: refVol,
      totalRevenue: (json['totalRevenue'] as num?)?.toDouble() ?? 0.0,
      sessionCount: (json['sessionCount'] as num?)?.toInt() ?? 0,
      activeSessionsCount: (json['activeSessionsCount'] as num?)?.toInt() ?? 0,
      settledSessionsCount: (json['settledSessionsCount'] as num?)?.toInt() ?? 0,
      avgTransactionValue: (json['avgTransactionValue'] as num?)?.toDouble() ?? 0.0,
      avgPurchaseValue: (json['avgPurchaseValue'] as num?)?.toDouble() ?? 0.0,
      productsSoldCount: (json['productsSoldCount'] as num?)?.toInt() ?? 0,
      inventoryItemCount: (json['inventoryItemCount'] as num?)?.toInt() ?? 0,
      lowStockItemCount: (json['lowStockItemCount'] as num?)?.toInt() ?? 0,
      productDemand: (json['productDemand'] as List<dynamic>?)
          ?.map((e) => ProductDemand.fromJson(e as Map<String, dynamic>))
          .toList(),
      peakPeriods: (json['peakPeriods'] as List<dynamic>?)
          ?.map((e) => PeakPeriod.fromJson(e as Map<String, dynamic>))
          .toList(),
      moneyAdded: (json['moneyAdded'] as num?)?.toDouble() ?? rechVol,
      moneyRefunded: (json['moneyRefunded'] as num?)?.toDouble() ?? refVol,
      cancelledTopUps: cancelTopUps,
      cancelledTopUpsCount: (json['cancelledTopUpsCount'] as num?)?.toInt() ?? 0,
      netMoneyCollected: (json['netMoneyCollected'] as num?)?.toDouble() ?? (rechVol - refVol),
      cashInDrawer: (json['cashInDrawer'] as num?)?.toDouble() ?? (cashVol - refVol),
      upiMoney: (json['upiMoney'] as num?)?.toDouble() ?? (json['upiRechargeVolume'] as num?)?.toDouble() ?? 0.0,
      upiCount: (json['upiCount'] as num?)?.toInt() ?? (json['upiRechargeCount'] as num?)?.toInt() ?? 0,
      cashMoney: cashVol,
      cashCount: (json['cashCount'] as num?)?.toInt() ?? (json['cashRechargeCount'] as num?)?.toInt() ?? 0,
      cardsGivenOut: (json['cardsGivenOut'] as num?)?.toInt() ?? (json['sessionCount'] as num?)?.toInt() ?? 0,
      cardsReturned: (json['cardsReturned'] as num?)?.toInt() ?? (json['settledSessionsCount'] as num?)?.toInt() ?? 0,
      cancelledOrdersCount: (json['cancelledOrdersCount'] as num?)?.toInt() ?? 0,
      cancelledOrdersVolume: (json['cancelledOrdersVolume'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() => {
        'branchId': branchId,
        'branchName': branchName,
        'status': status,
        'transactionCount': transactionCount,
        'purchaseCount': purchaseCount,
        'purchaseVolume': purchaseVolume,
        'rechargeCount': rechargeCount,
        'rechargeVolume': rechargeVolume,
        'refundCount': refundCount,
        'refundVolume': refundVolume,
        'totalRevenue': totalRevenue,
        'sessionCount': sessionCount,
        'activeSessionsCount': activeSessionsCount,
        'settledSessionsCount': settledSessionsCount,
        'avgTransactionValue': avgTransactionValue,
        'avgPurchaseValue': avgPurchaseValue,
        'productsSoldCount': productsSoldCount,
        'inventoryItemCount': inventoryItemCount,
        'lowStockItemCount': lowStockItemCount,
        'moneyAdded': moneyAdded,
        'moneyRefunded': moneyRefunded,
        'cancelledTopUps': cancelledTopUps,
        'cancelledTopUpsCount': cancelledTopUpsCount,
        'netMoneyCollected': netMoneyCollected,
        'cashInDrawer': cashInDrawer,
        'upiMoney': upiMoney,
        'upiCount': upiCount,
        'cashMoney': cashMoney,
        'cashCount': cashCount,
        'cardsGivenOut': cardsGivenOut,
        'cardsReturned': cardsReturned,
        'cancelledOrdersCount': cancelledOrdersCount,
        'cancelledOrdersVolume': cancelledOrdersVolume,
        if (productDemand != null)
          'productDemand': productDemand!.map((e) => e.toJson()).toList(),
        if (peakPeriods != null)
          'peakPeriods': peakPeriods!.map((e) => e.toJson()).toList(),
      };
}

class AnalyticsOverview {
  final int totalTransactions;
  final double totalRechargeVolume;
  final double totalPurchaseVolume;
  final double totalRefundVolume;
  final int activeSessionsCount;
  final int activeCardsCount;
  final int lowStockItemsCount;
  final List<BranchPerformanceMetric>? branchPerformance;
  final List<ProductDemand>? topProductDemand;
  final List<PeakPeriod>? peakPeriods;

  const AnalyticsOverview({
    this.totalTransactions = 0,
    this.totalRechargeVolume = 0.0,
    this.totalPurchaseVolume = 0.0,
    this.totalRefundVolume = 0.0,
    this.activeSessionsCount = 0,
    this.activeCardsCount = 0,
    this.lowStockItemsCount = 0,
    this.branchPerformance,
    this.topProductDemand,
    this.peakPeriods,
  });

  factory AnalyticsOverview.fromJson(Map<String, dynamic> json) {
    return AnalyticsOverview(
      totalTransactions: (json['totalTransactions'] as num?)?.toInt() ?? 0,
      totalRechargeVolume: (json['totalRechargeVolume'] as num?)?.toDouble() ?? 0.0,
      totalPurchaseVolume: (json['totalPurchaseVolume'] as num?)?.toDouble() ?? 0.0,
      totalRefundVolume: (json['totalRefundVolume'] as num?)?.toDouble() ?? 0.0,
      activeSessionsCount: (json['activeSessionsCount'] as num?)?.toInt() ?? 0,
      activeCardsCount: (json['activeCardsCount'] as num?)?.toInt() ?? 0,
      lowStockItemsCount: (json['lowStockItemsCount'] as num?)?.toInt() ?? 0,
      branchPerformance: (json['branchPerformance'] as List<dynamic>?)
          ?.map((e) => BranchPerformanceMetric.fromJson(e as Map<String, dynamic>))
          .toList(),
      topProductDemand: (json['topProductDemand'] as List<dynamic>?)
          ?.map((e) => ProductDemand.fromJson(e as Map<String, dynamic>))
          .toList(),
      peakPeriods: (json['peakPeriods'] as List<dynamic>?)
          ?.map((e) => PeakPeriod.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  Map<String, dynamic> toJson() => {
        'totalTransactions': totalTransactions,
        'totalRechargeVolume': totalRechargeVolume,
        'totalPurchaseVolume': totalPurchaseVolume,
        'totalRefundVolume': totalRefundVolume,
        'activeSessionsCount': activeSessionsCount,
        'activeCardsCount': activeCardsCount,
        'lowStockItemsCount': lowStockItemsCount,
        if (branchPerformance != null)
          'branchPerformance': branchPerformance!.map((e) => e.toJson()).toList(),
        if (topProductDemand != null)
          'topProductDemand': topProductDemand!.map((e) => e.toJson()).toList(),
        if (peakPeriods != null)
          'peakPeriods': peakPeriods!.map((e) => e.toJson()).toList(),
      };
}
