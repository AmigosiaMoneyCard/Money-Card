import '../models/analytics.dart';
import '../services/analytics_service.dart';

class AnalyticsRepository {
  final AnalyticsService _analyticsService;

  AnalyticsRepository(this._analyticsService);

  Future<BranchPerformanceMetric> getBranchAnalytics({
    required String branchId,
    String? range,
    String? startDate,
    String? endDate,
  }) async {
    return _analyticsService.getBranchAnalytics(
      branchId: branchId,
      range: range,
      startDate: startDate,
      endDate: endDate,
    );
  }
}
