import '../core/constants/api_endpoints.dart';
import '../models/analytics.dart';
import 'api_service.dart';

class AnalyticsService {
  final ApiService _apiService;

  AnalyticsService(this._apiService);

  /// Fetch branch-scoped performance analytics (GET /api/v1/analytics)
  Future<BranchPerformanceMetric> getBranchAnalytics({
    required String branchId,
    String? range,
    String? startDate,
    String? endDate,
  }) async {
    final queryParameters = <String, dynamic>{
      'branchId': branchId,
      // Use explicit date range if provided; otherwise fall back to range preset
      if (startDate != null && startDate.isNotEmpty) 'startDate': startDate,
      if (endDate != null && endDate.isNotEmpty) 'endDate': endDate,
      if ((startDate == null || startDate.isEmpty) && range != null && range.isNotEmpty)
        'range': range,
      'timezone': 'Asia/Kolkata',
    };

    return _apiService.get<BranchPerformanceMetric>(
      ApiEndpoints.analytics,
      queryParameters: queryParameters,
      fromJson: (data) {
        if (data is Map<String, dynamic>) {
          if (data['branchPerformance'] is List && (data['branchPerformance'] as List).isNotEmpty) {
            final list = (data['branchPerformance'] as List)
                .map((e) => BranchPerformanceMetric.fromJson(e as Map<String, dynamic>))
                .toList();
            final match = list.where((item) => item.branchId == branchId).firstOrNull;
            return match ?? list.first;
          }
          return BranchPerformanceMetric.fromJson(data);
        }
        return const BranchPerformanceMetric(branchId: '', branchName: '');
      },
    );
  }
}
