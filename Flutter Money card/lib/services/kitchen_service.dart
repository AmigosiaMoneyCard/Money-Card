import '../models/kitchen_order.dart';
import 'api_service.dart';

class KitchenSummaryData {
  final int pendingCount;
  final int preparingCount;
  final int readyCount;
  final int completedCount;
  final int totalActive;

  const KitchenSummaryData({
    required this.pendingCount,
    required this.preparingCount,
    required this.readyCount,
    required this.completedCount,
    required this.totalActive,
  });

  factory KitchenSummaryData.fromJson(Map<String, dynamic> json) {
    return KitchenSummaryData(
      pendingCount: (json['pendingCount'] as num?)?.toInt() ?? 0,
      preparingCount: (json['preparingCount'] as num?)?.toInt() ?? 0,
      readyCount: (json['readyCount'] as num?)?.toInt() ?? 0,
      completedCount: (json['completedCount'] as num?)?.toInt() ?? 0,
      totalActive: (json['totalActive'] as num?)?.toInt() ?? 0,
    );
  }
}

class KitchenService {
  final ApiService _apiService;

  KitchenService(this._apiService);

  Future<List<KitchenOrder>> getKitchenOrders({String? branchId, String? status}) async {
    final queryParameters = <String, dynamic>{};
    if (branchId != null) queryParameters['branchId'] = branchId;
    if (status != null) queryParameters['status'] = status;

    return _apiService.get<List<KitchenOrder>>(
      '/kitchen/orders',
      queryParameters: queryParameters,
      fromJson: (data) {
        if (data is List) {
          return data
              .map((item) => KitchenOrder.fromJson(item as Map<String, dynamic>))
              .toList();
        }
        return [];
      },
    );
  }

  Future<KitchenSummaryData> getKitchenSummary({String? branchId}) async {
    final queryParameters = <String, dynamic>{};
    if (branchId != null) queryParameters['branchId'] = branchId;

    return _apiService.get<KitchenSummaryData>(
      '/kitchen/summary',
      queryParameters: queryParameters,
      fromJson: (data) => KitchenSummaryData.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<KitchenOrder> updateOrderStatus({
    required String transactionId,
    required String status,
  }) async {
    return _apiService.patch<KitchenOrder>(
      '/kitchen/orders/$transactionId/status',
      data: {'status': status},
      fromJson: (data) => KitchenOrder.fromJson(data as Map<String, dynamic>),
    );
  }
}
