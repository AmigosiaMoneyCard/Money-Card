class KitchenOrderItem {
  final String productId;
  final String itemName;
  final double unitPrice;
  final int quantity;
  final double subtotal;

  const KitchenOrderItem({
    required this.productId,
    required this.itemName,
    required this.unitPrice,
    required this.quantity,
    required this.subtotal,
  });

  factory KitchenOrderItem.fromJson(Map<String, dynamic> json) {
    return KitchenOrderItem(
      productId: json['productId'] as String? ?? '',
      itemName: json['itemName'] as String? ?? 'Item',
      unitPrice: (json['unitPrice'] as num?)?.toDouble() ?? 0.0,
      quantity: (json['quantity'] as num?)?.toInt() ?? 1,
      subtotal: (json['subtotal'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() => {
        'productId': productId,
        'itemName': itemName,
        'unitPrice': unitPrice,
        'quantity': quantity,
        'subtotal': subtotal,
      };
}

class KitchenOrder {
  final String id;
  final String transactionId;
  final int orderNumber;
  final String orderStatus;
  final DateTime orderedAt;
  final DateTime? preparingAt;
  final DateTime? readyAt;
  final DateTime? completedAt;
  final List<KitchenOrderItem> items;
  final String cardDisplayNumber;
  final String? customerName;
  final String counterName;
  final String counterId;
  final double amount;
  final String? preparedByName;

  const KitchenOrder({
    required this.id,
    required this.transactionId,
    required this.orderNumber,
    required this.orderStatus,
    required this.orderedAt,
    this.preparingAt,
    this.readyAt,
    this.completedAt,
    required this.items,
    required this.cardDisplayNumber,
    this.customerName,
    required this.counterName,
    required this.counterId,
    required this.amount,
    this.preparedByName,
  });

  bool get isPending => orderStatus.toUpperCase() == 'PENDING';
  bool get isPreparing => orderStatus.toUpperCase() == 'PREPARING';
  bool get isReady => orderStatus.toUpperCase() == 'READY';
  bool get isCompleted => orderStatus.toUpperCase() == 'COMPLETED';

  int get elapsedMinutes {
    final diff = DateTime.now().difference(orderedAt);
    return diff.inMinutes.clamp(0, 999);
  }

  int get prepTimeMinutes {
    if (readyAt != null) {
      final diff = readyAt!.difference(orderedAt).inMinutes;
      return diff < 1 ? 1 : diff;
    }
    return elapsedMinutes;
  }

  bool get canUndoReady {
    if (!isReady || readyAt == null) return false;
    final diff = DateTime.now().difference(readyAt!).inMinutes;
    return diff <= 5;
  }

  factory KitchenOrder.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'] as List<dynamic>? ?? [];
    return KitchenOrder(
      id: json['id'] as String? ?? '',
      transactionId: json['transactionId'] as String? ?? (json['id'] as String? ?? ''),
      orderNumber: (json['orderNumber'] as num?)?.toInt() ?? 101,
      orderStatus: (json['orderStatus'] as String? ?? 'PENDING').toUpperCase(),
      orderedAt: json['orderedAt'] != null
          ? DateTime.tryParse(json['orderedAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
      preparingAt: json['preparingAt'] != null
          ? DateTime.tryParse(json['preparingAt'].toString())
          : null,
      readyAt: json['readyAt'] != null
          ? DateTime.tryParse(json['readyAt'].toString())
          : null,
      completedAt: json['completedAt'] != null
          ? DateTime.tryParse(json['completedAt'].toString())
          : null,
      items: rawItems
          .map((i) => KitchenOrderItem.fromJson(i as Map<String, dynamic>))
          .toList(),
      cardDisplayNumber: json['cardDisplayNumber'] as String? ?? 'CARD',
      customerName: json['customerName'] as String?,
      counterName: json['counterName'] as String? ?? 'Counter',
      counterId: json['counterId'] as String? ?? '',
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      preparedByName: json['preparedByName'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'transactionId': transactionId,
        'orderNumber': orderNumber,
        'orderStatus': orderStatus,
        'orderedAt': orderedAt.toIso8601String(),
        if (preparingAt != null) 'preparingAt': preparingAt!.toIso8601String(),
        if (readyAt != null) 'readyAt': readyAt!.toIso8601String(),
        if (completedAt != null) 'completedAt': completedAt!.toIso8601String(),
        'items': items.map((i) => i.toJson()).toList(),
        'cardDisplayNumber': cardDisplayNumber,
        if (customerName != null) 'customerName': customerName,
        'counterName': counterName,
        'counterId': counterId,
        'amount': amount,
        if (preparedByName != null) 'preparedByName': preparedByName,
      };
}
