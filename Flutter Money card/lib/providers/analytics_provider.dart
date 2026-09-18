import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/errors/api_exception.dart';
import '../models/analytics.dart';
import '../repositories/analytics_repository.dart';
import 'api_providers.dart';
import 'branch_provider.dart';

const Object _analyticsSentinel = Object();

class AnalyticsState {
  final bool isLoading;
  final BranchPerformanceMetric? analytics;
  final String selectedRange; // kept for PDF label display
  final String? customStartDate;
  final String? customEndDate;
  final String? errorMessage;

  const AnalyticsState({
    this.isLoading = false,
    this.analytics,
    this.selectedRange = 'Custom Range',
    this.customStartDate,
    this.customEndDate,
    this.errorMessage,
  });

  AnalyticsState copyWith({
    bool? isLoading,
    BranchPerformanceMetric? analytics,
    String? selectedRange,
    String? customStartDate,
    String? customEndDate,
    Object? errorMessage = _analyticsSentinel,
  }) {
    return AnalyticsState(
      isLoading: isLoading ?? this.isLoading,
      analytics: analytics ?? this.analytics,
      selectedRange: selectedRange ?? this.selectedRange,
      customStartDate: customStartDate ?? this.customStartDate,
      customEndDate: customEndDate ?? this.customEndDate,
      errorMessage: errorMessage == _analyticsSentinel
          ? this.errorMessage
          : errorMessage as String?,
    );
  }
}

class AnalyticsNotifier extends StateNotifier<AnalyticsState> {
  final AnalyticsRepository _analyticsRepository;
  final String? _currentBranchId;

  AnalyticsNotifier(this._analyticsRepository, this._currentBranchId)
      : super(const AnalyticsState()) {
    // Default to today's date on init
    final today = _todayStr();
    state = state.copyWith(customStartDate: today, customEndDate: today);
    loadAnalytics();
  }

  static String _todayStr() {
    final now = DateTime.now();
    final y = now.year.toString().padLeft(4, '0');
    final m = now.month.toString().padLeft(2, '0');
    final d = now.day.toString().padLeft(2, '0');
    return '$y-$m-$d';
  }

  Future<void> loadAnalytics() async {
    final branchId = _currentBranchId;
    if (branchId == null) return;

    state = state.copyWith(isLoading: true, errorMessage: null);

    try {
      final data = await _analyticsRepository.getBranchAnalytics(
        branchId: branchId,
        startDate: state.customStartDate,
        endDate: state.customEndDate,
      );

      state = state.copyWith(
        isLoading: false,
        analytics: data,
      );
    } on ApiException catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.message);
    } catch (_) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Unable to load branch analytics.',
      );
    }
  }

  /// Set a custom date range and reload analytics.
  void setCustomRange(String startDate, String endDate) {
    final label = '$startDate to $endDate';
    state = state.copyWith(
      customStartDate: startDate,
      customEndDate: endDate,
      selectedRange: label,
    );
    loadAnalytics();
  }

  /// Legacy alias kept in case it is still referenced elsewhere.
  void setRange(String range) {
    // No-op: preset ranges are removed; use setCustomRange instead.
  }
}

final StateNotifierProvider<AnalyticsNotifier, AnalyticsState> analyticsNotifierProvider =
    StateNotifierProvider<AnalyticsNotifier, AnalyticsState>((ref) {
  final analyticsRepository = ref.watch(analyticsRepositoryProvider);
  final currentBranch = ref.watch(currentBranchProvider);
  final notifier = AnalyticsNotifier(analyticsRepository, currentBranch?.id);
  return notifier;
});
