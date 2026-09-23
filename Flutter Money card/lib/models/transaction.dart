enum TransactionType {
  recharge('RECHARGE'),
  purchase('PURCHASE'),
  refund('REFUND');

  const TransactionType(this.value);

  final String value;

  static TransactionType fromString(String? val) {
    if (val == null) return TransactionType.purchase;
    final upper = val.toUpperCase();
    if (upper.contains('RECHARGE')) return TransactionType.recharge;
    if (upper.contains('PURCHASE')) return TransactionType.purchase;
    if (upper.contains('REFUND') || upper.contains('SETTLEMENT')) return TransactionType.refund;
    for (final type in TransactionType.values) {
      if (type.value == upper) return type;
    }
    return TransactionType.purchase;
  }
}

enum TransactionStatus {
  pending('PENDING'),
  success('SUCCESS'),
  failed('FAILED'),
  refunded('REFUNDED');

  const TransactionStatus(this.value);

  final String value;

  static TransactionStatus fromString(String? val) {
    if (val == null) return TransactionStatus.pending;
    final upper = val.toUpperCase();
    for (final status in TransactionStatus.values) {
      if (status.value == upper) return status;
    }
    return TransactionStatus.pending;
  }
}

enum PaymentMethod {
  cash('CASH'),
  upi('UPI'),
  cardBalance('CARD_BALANCE');

  const PaymentMethod(this.value);

  final String value;

  static PaymentMethod fromString(String? val) {
    if (val == null) return PaymentMethod.cash;
    final upper = val.toUpperCase();
    if (upper == 'UPI') return PaymentMethod.upi;
    if (upper == 'CASH') return PaymentMethod.cash;
    if (upper.contains('CARD') || upper.contains('BALANCE')) return PaymentMethod.cardBalance;
    for (final method in PaymentMethod.values) {
      if (method.value == upper) return method;
    }
    return PaymentMethod.cash;
  }
}

class PurchaseItem {
  final String productId;
  final int quantity;
  final String? itemName;
  final double? unitPrice;
  final double? totalAmount;

  const PurchaseItem({
    required this.productId,
    required this.quantity,
    this.itemName,
    this.unitPrice,
    this.totalAmount,
  });

  factory PurchaseItem.fromJson(Map<String, dynamic> json) {
    return PurchaseItem(
      productId: json['productId'] as String? ?? '',
      quantity: (json['quantity'] as num?)?.toInt() ?? 1,
      itemName: (json['itemName'] ?? json['name'] ?? json['productName']) as String?,
      unitPrice: (json['unitPrice'] as num?)?.toDouble() ?? (json['price'] as num?)?.toDouble(),
      totalAmount: (json['totalAmount'] as num?)?.toDouble() ?? (json['subtotal'] as num?)?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() => {
        'productId': productId,
        'quantity': quantity,
        if (itemName != null) 'itemName': itemName,
        if (unitPrice != null) 'unitPrice': unitPrice,
        if (totalAmount != null) 'totalAmount': totalAmount,
      };
}

class Transaction {
  final String id;
  final String sessionId;
  final String branchId;
  final TransactionType type;
  final double amount;
  final double? balanceBefore;
  final double? balanceAfter;
  final TransactionStatus status;
  final List<PurchaseItem>? items;
  final PaymentMethod? paymentMethod;
  final String? externalReference;
  final String? staffName;
  final String? branchName;
  final String? createdAt;
  final bool isCancelled;
  final String? cancellationReason;
  final String? cancelledAt;
  final String? cancelledByUserName;
  final String? cardNumber;
  final String? customerName;
  final String? customerPhone;

  const Transaction({
    required this.id,
    required this.sessionId,
    required this.branchId,
    required this.type,
    required this.amount,
    this.balanceBefore,
    this.balanceAfter,
    required this.status,
    this.items,
    this.paymentMethod,
    this.externalReference,
    this.staffName,
    this.branchName,
    this.createdAt,
    this.isCancelled = false,
    this.cancellationReason,
    this.cancelledAt,
    this.cancelledByUserName,
    this.cardNumber,
    this.customerName,
    this.customerPhone,
  });

  factory Transaction.fromJson(Map<String, dynamic> json) {
    final itemsRaw = json['items'];
    final bool isCancelled = json['isCancelled'] == true ||
        (itemsRaw is Map<String, dynamic> && itemsRaw['isCancelled'] == true);
    final String? cancelReason = json['cancellationReason'] as String? ??
        (itemsRaw is Map<String, dynamic> ? itemsRaw['cancellationReason'] as String? : null);
    final String? cancelTime = json['cancelledAt'] as String? ??
        (itemsRaw is Map<String, dynamic> ? itemsRaw['cancelledAt'] as String? : null);
    final String? cancelBy = json['cancelledByUserName'] as String? ??
        (itemsRaw is Map<String, dynamic> ? itemsRaw['cancelledByUserName'] as String? : null);

    List<PurchaseItem>? parsedItems;
    if (itemsRaw is List) {
      parsedItems = itemsRaw
          .map((item) => PurchaseItem.fromJson(item as Map<String, dynamic>))
          .toList();
    } else if (itemsRaw is Map<String, dynamic> && itemsRaw['orderItems'] is List) {
      parsedItems = (itemsRaw['orderItems'] as List)
          .map((item) => PurchaseItem.fromJson(item as Map<String, dynamic>))
          .toList();
    }

    final staff = json['staff'];
    final sName = json['staffName'] as String? ??
        (staff is Map ? staff['name'] as String? : null);
    final branch = json['branch'];
    final bName = json['branchName'] as String? ??
        (branch is Map ? branch['name'] as String? : null);

    return Transaction(
      id: json['id'] as String? ?? '',
      sessionId: json['sessionId'] as String? ?? '',
      branchId: json['branchId'] as String? ?? '',
      type: TransactionType.fromString(json['type'] as String?),
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      balanceBefore: (json['balanceBefore'] as num?)?.toDouble(),
      balanceAfter: (json['balanceAfter'] as num?)?.toDouble(),
      status: TransactionStatus.fromString(json['status'] as String?),
      items: parsedItems,
      paymentMethod: json['paymentMethod'] != null
          ? PaymentMethod.fromString(json['paymentMethod'] as String?)
          : null,
      externalReference: json['externalReference'] as String?,
      staffName: sName,
      branchName: bName,
      createdAt: json['createdAt'] as String?,
      isCancelled: isCancelled,
      cancellationReason: cancelReason,
      cancelledAt: cancelTime,
      cancelledByUserName: cancelBy,
      cardNumber: json['cardNumber'] as String?,
      customerName: json['customerName'] as String?,
      customerPhone: json['customerPhone'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'sessionId': sessionId,
        'branchId': branchId,
        'type': type.value,
        'amount': amount,
        if (balanceBefore != null) 'balanceBefore': balanceBefore,
        if (balanceAfter != null) 'balanceAfter': balanceAfter,
        'status': status.value,
        if (items != null) 'items': items!.map((i) => i.toJson()).toList(),
        if (paymentMethod != null) 'paymentMethod': paymentMethod!.value,
        if (externalReference != null) 'externalReference': externalReference,
        if (staffName != null) 'staffName': staffName,
        if (branchName != null) 'branchName': branchName,
        if (createdAt != null) 'createdAt': createdAt,
        'isCancelled': isCancelled,
        if (cancellationReason != null) 'cancellationReason': cancellationReason,
        if (cancelledAt != null) 'cancelledAt': cancelledAt,
        if (cancelledByUserName != null) 'cancelledByUserName': cancelledByUserName,
        if (cardNumber != null) 'cardNumber': cardNumber,
        if (customerName != null) 'customerName': customerName,
      };

  String get displayTransactionId => id.length > 8 ? id.substring(0, 8).toUpperCase() : id.toUpperCase();
}
