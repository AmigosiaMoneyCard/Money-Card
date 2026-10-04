import 'dart:async';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/kitchen_order.dart';
import '../services/kitchen_service.dart';
import 'api_providers.dart';
import 'branch_provider.dart';

class KitchenOrdersState {
  final List<KitchenOrder> orders;
  final KitchenSummaryData? summary;
  final bool isLoading;
  final String? errorMessage;
  final String selectedTab; // 'ALL', 'PREPARING', 'READY', 'COMPLETED'
  final bool isAudioMuted;
  final bool isReconnecting;

  const KitchenOrdersState({
    this.orders = const [],
    this.summary,
    this.isLoading = false,
    this.errorMessage,
    this.selectedTab = 'ALL',
    this.isAudioMuted = false,
    this.isReconnecting = false,
  });

  KitchenOrdersState copyWith({
    List<KitchenOrder>? orders,
    KitchenSummaryData? summary,
    bool? isLoading,
    String? errorMessage,
    String? selectedTab,
    bool? isAudioMuted,
    bool? isReconnecting,
  }) {
    return KitchenOrdersState(
      orders: orders ?? this.orders,
      summary: summary ?? this.summary,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
      selectedTab: selectedTab ?? this.selectedTab,
      isAudioMuted: isAudioMuted ?? this.isAudioMuted,
      isReconnecting: isReconnecting ?? this.isReconnecting,
    );
  }
}

class KitchenOrdersNotifier extends StateNotifier<KitchenOrdersState> {
  final KitchenService _kitchenService;
  final Ref _ref;
  Timer? _pollingTimer;
  final Set<String> _knownOrderIds = {};
  bool _initialLoadDone = false;

  KitchenOrdersNotifier(this._kitchenService, this._ref)
      : super(const KitchenOrdersState()) {
    // Initial load
    loadOrders(silent: true);
    loadSummary(silent: true);
    // Background polling every 30 seconds to prevent network and server congestion
    _startPolling();
  }

  void _startPolling() {
    _pollingTimer?.cancel();
    _pollingTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      loadOrders(silent: true);
      loadSummary(silent: true);
    });
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    super.dispose();
  }

  void setTab(String tab) {
    state = state.copyWith(selectedTab: tab);
  }

  void toggleAudioMute() {
    state = state.copyWith(isAudioMuted: !state.isAudioMuted);
  }

  Future<void> loadOrders({bool silent = false}) async {
    if (!silent) {
      state = state.copyWith(isLoading: true, errorMessage: null);
    }
    try {
      final currentBranch = _ref.read(currentBranchProvider);
      final orders = await _kitchenService.getKitchenOrders(
        branchId: currentBranch?.id,
      );

      // Play audio chime and haptic alert when new active tickets arrive
      if (_initialLoadDone && !state.isAudioMuted) {
        final hasNewActiveOrders = orders.any((o) =>
            (o.isPending || o.isPreparing) &&
            !_knownOrderIds.contains(o.id.isNotEmpty ? o.id : o.transactionId));
        if (hasNewActiveOrders) {
          SystemSound.play(SystemSoundType.alert);
          HapticFeedback.heavyImpact();
        }
      }

      // Update known order IDs cache
      for (final o in orders) {
        final id = o.id.isNotEmpty ? o.id : o.transactionId;
        if (id.isNotEmpty) {
          _knownOrderIds.add(id);
        }
      }
      _initialLoadDone = true;

      state = state.copyWith(
        orders: orders,
        isLoading: false,
        isReconnecting: false,
        errorMessage: null,
      );
    } catch (e) {
      // Offline grace: preserve existing orders on network drop
      if (silent) {
        state = state.copyWith(
          isLoading: false,
          isReconnecting: true,
        );
      } else {
        state = state.copyWith(
          isLoading: false,
          isReconnecting: true,
          errorMessage: 'Network issue. Showing cached orders.',
        );
      }
    }
  }

  Future<void> loadSummary({bool silent = false}) async {
    try {
      final currentBranch = _ref.read(currentBranchProvider);
      final summary = await _kitchenService.getKitchenSummary(
        branchId: currentBranch?.id,
      );
      state = state.copyWith(summary: summary);
    } catch (_) {
      // Silent ignore on poll
    }
  }

  Future<bool> updateStatus(String transactionId, String newStatus) async {
    // Optimistic UI update
    final prevOrders = state.orders;
    final updatedList = state.orders.map((o) {
      if (o.transactionId == transactionId || o.id == transactionId) {
        return KitchenOrder(
          id: o.id,
          transactionId: o.transactionId,
          orderNumber: o.orderNumber,
          orderStatus: newStatus,
          orderedAt: o.orderedAt,
          preparingAt: newStatus == 'PREPARING' ? DateTime.now() : o.preparingAt,
          readyAt: newStatus == 'READY' ? DateTime.now() : o.readyAt,
          completedAt: newStatus == 'COMPLETED' ? DateTime.now() : o.completedAt,
          items: o.items,
          cardDisplayNumber: o.cardDisplayNumber,
          customerName: o.customerName,
          counterName: o.counterName,
          counterId: o.counterId,
          amount: o.amount,
          preparedByName: o.preparedByName,
        );
      }
      return o;
    }).toList();

    state = state.copyWith(orders: updatedList);

    try {
      await _kitchenService.updateOrderStatus(
        transactionId: transactionId,
        status: newStatus,
      );
      // Refresh summary
      loadSummary(silent: true);
      return true;
    } catch (e) {
      // Rollback on failure
      state = state.copyWith(orders: prevOrders);
      return false;
    }
  }
}

final kitchenOrdersNotifierProvider =
    StateNotifierProvider<KitchenOrdersNotifier, KitchenOrdersState>((ref) {
  final service = ref.watch(kitchenServiceProvider);
  return KitchenOrdersNotifier(service, ref);
});

final activeKitchenOrdersProvider = Provider<List<KitchenOrder>>((ref) {
  final state = ref.watch(kitchenOrdersNotifierProvider);
  return state.orders.where((o) => !o.isCompleted).toList();
});

final preparingOrdersProvider = Provider<List<KitchenOrder>>((ref) {
  final state = ref.watch(kitchenOrdersNotifierProvider);
  return state.orders.where((o) => o.isPreparing).toList();
});

final readyOrdersProvider = Provider<List<KitchenOrder>>((ref) {
  final state = ref.watch(kitchenOrdersNotifierProvider);
  return state.orders.where((o) => o.isReady).toList();
});

final pendingOrdersCountProvider = Provider<int>((ref) {
  final state = ref.watch(kitchenOrdersNotifierProvider);
  if (state.summary != null) return state.summary!.pendingCount;
  return state.orders.where((o) => o.isPending).length;
});

final preparingOrdersCountProvider = Provider<int>((ref) {
  final state = ref.watch(kitchenOrdersNotifierProvider);
  if (state.summary != null) return state.summary!.preparingCount;
  return state.orders.where((o) => o.isPreparing).length;
});

final readyOrdersCountProvider = Provider<int>((ref) {
  final state = ref.watch(kitchenOrdersNotifierProvider);
  if (state.summary != null) return state.summary!.readyCount;
  return state.orders.where((o) => o.isReady).length;
});
