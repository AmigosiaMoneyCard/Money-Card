import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/errors/api_exception.dart';
import '../models/transaction.dart';
import '../services/session_service.dart';
import 'api_providers.dart';
import 'branch_provider.dart';

const Object _rechargeSentinel = Object();

class RechargesState {
  final bool isLoading;
  final bool isActionLoading;
  final List<Transaction> recharges;
  final Map<String, dynamic> summary;
  final String selectedPreset;
  final String? startDate;
  final String? endDate;
  final String paymentMethod;
  final String statusFilter;
  final String? search;
  final String? errorMessage;

  const RechargesState({
    this.isLoading = false,
    this.isActionLoading = false,
    this.recharges = const [],
    this.summary = const {},
    this.selectedPreset = 'today',
    this.startDate,
    this.endDate,
    this.paymentMethod = 'ALL',
    this.statusFilter = 'ALL',
    this.search,
    this.errorMessage,
  });

  RechargesState copyWith({
    bool? isLoading,
    bool? isActionLoading,
    List<Transaction>? recharges,
    Map<String, dynamic>? summary,
    String? selectedPreset,
    String? startDate,
    String? endDate,
    String? paymentMethod,
    String? statusFilter,
    String? search,
    Object? errorMessage = _rechargeSentinel,
  }) {
    return RechargesState(
      isLoading: isLoading ?? this.isLoading,
      isActionLoading: isActionLoading ?? this.isActionLoading,
      recharges: recharges ?? this.recharges,
      summary: summary ?? this.summary,
      selectedPreset: selectedPreset ?? this.selectedPreset,
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      statusFilter: statusFilter ?? this.statusFilter,
      search: search ?? this.search,
      errorMessage: errorMessage == _rechargeSentinel
          ? this.errorMessage
          : errorMessage as String?,
    );
  }
}

class RechargesNotifier extends StateNotifier<RechargesState> {
  final SessionService _sessionService;
  final String? _currentBranchId;

  RechargesNotifier(this._sessionService, this._currentBranchId)
      : super(const RechargesState()) {
    final today = _todayStr();
    state = state.copyWith(startDate: today, endDate: today, selectedPreset: 'today');
    loadRecharges();
  }

  static String _todayStr() {
    final now = DateTime.now();
    final y = now.year.toString().padLeft(4, '0');
    final m = now.month.toString().padLeft(2, '0');
    final d = now.day.toString().padLeft(2, '0');
    return '$y-$m-$d';
  }

  Future<void> loadRecharges() async {
    state = state.copyWith(isLoading: true, errorMessage: null);

    try {
      final res = await _sessionService.listRecharges(
        branchId: _currentBranchId,
        startDate: state.startDate,
        endDate: state.endDate,
        paymentMethod: state.paymentMethod != 'ALL' ? state.paymentMethod : null,
        status: state.statusFilter != 'ALL' ? state.statusFilter : null,
        search: state.search,
      );

      final rawList = res['items'] as List<dynamic>? ?? [];
      final list = rawList.map((e) => Transaction.fromJson(e as Map<String, dynamic>)).toList();
      final summary = res['summary'] as Map<String, dynamic>? ?? {};

      state = state.copyWith(
        isLoading: false,
        recharges: list,
        summary: summary,
        errorMessage: null,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: e is ApiException ? e.message : e.toString(),
      );
    }
  }

  void resetToToday() {
    final today = _todayStr();
    state = state.copyWith(
      selectedPreset: 'today',
      startDate: today,
      endDate: today,
    );
    loadRecharges();
  }

  void setPreset(String preset) {
    final now = DateTime.now();
    final todayStr = _todayStr();
    String start = todayStr;
    String end = todayStr;

    switch (preset) {
      case 'today':
        start = todayStr;
        end = todayStr;
        break;
      case 'yesterday':
        final yest = now.subtract(const Duration(days: 1));
        final yestStr = '${yest.year}-${yest.month.toString().padLeft(2, '0')}-${yest.day.toString().padLeft(2, '0')}';
        start = yestStr;
        end = yestStr;
        break;
      case 'last7':
        final l7 = now.subtract(const Duration(days: 7));
        start = '${l7.year}-${l7.month.toString().padLeft(2, '0')}-${l7.day.toString().padLeft(2, '0')}';
        end = todayStr;
        break;
      case 'last30':
        final l30 = now.subtract(const Duration(days: 30));
        start = '${l30.year}-${l30.month.toString().padLeft(2, '0')}-${l30.day.toString().padLeft(2, '0')}';
        end = todayStr;
        break;
      case 'thisMonth':
        start = '${now.year}-${now.month.toString().padLeft(2, '0')}-01';
        end = todayStr;
        break;
    }

    state = state.copyWith(
      selectedPreset: preset,
      startDate: start,
      endDate: end,
    );
    loadRecharges();
  }

  void setCustomDates(String start, String end) {
    state = state.copyWith(
      selectedPreset: 'custom',
      startDate: start,
      endDate: end,
    );
    loadRecharges();
  }

  void setPaymentMethod(String method) {
    if (state.paymentMethod == method) return;
    state = state.copyWith(paymentMethod: method);
    loadRecharges();
  }

  void setStatusFilter(String status) {
    if (state.statusFilter == status) return;
    state = state.copyWith(statusFilter: status);
    loadRecharges();
  }

  void setSearch(String? search) {
    state = state.copyWith(search: search);
    loadRecharges();
  }

  Future<bool> cancelRecharge(String transactionId, String reason) async {
    state = state.copyWith(isActionLoading: true);
    try {
      await _sessionService.cancelRecharge(
        transactionId: transactionId,
        reason: reason,
      );
      state = state.copyWith(isActionLoading: false);
      await loadRecharges();
      return true;
    } catch (e) {
      state = state.copyWith(
        isActionLoading: false,
        errorMessage: e is ApiException ? e.message : e.toString(),
      );
      return false;
    }
  }
}

final rechargesNotifierProvider =
    StateNotifierProvider.autoDispose<RechargesNotifier, RechargesState>((ref) {
  final sessionService = ref.watch(sessionServiceProvider);
  final currentBranch = ref.watch(currentBranchProvider);
  return RechargesNotifier(sessionService, currentBranch?.id);
});
