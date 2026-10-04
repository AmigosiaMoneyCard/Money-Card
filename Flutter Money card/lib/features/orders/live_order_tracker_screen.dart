import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';
import '../../models/kitchen_order.dart';
import '../../providers/kitchen_orders_provider.dart';

class LiveOrderTrackerScreen extends ConsumerStatefulWidget {
  const LiveOrderTrackerScreen({super.key});

  @override
  ConsumerState<LiveOrderTrackerScreen> createState() => _LiveOrderTrackerScreenState();
}

class _LiveOrderTrackerScreenState extends ConsumerState<LiveOrderTrackerScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(kitchenOrdersNotifierProvider.notifier).loadOrders();
      ref.read(kitchenOrdersNotifierProvider.notifier).loadSummary();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(kitchenOrdersNotifierProvider);
    final notifier = ref.read(kitchenOrdersNotifierProvider.notifier);

    final inProgressOrders = state.orders.where((o) => o.isPreparing || o.isPending).toList();
    final readyOrders = state.orders.where((o) => o.isReady).toList();

    return Scaffold(
      backgroundColor: AppColors.backgroundLight,
      appBar: AppBar(
        title: const Text(
          'Food Progress',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh',
            onPressed: () {
              notifier.loadOrders();
              notifier.loadSummary();
            },
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppColors.primary,
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.textSecondaryLight,
          tabs: [
            Tab(text: 'In Progress (${inProgressOrders.length})'),
            Tab(text: 'Ready (${readyOrders.length})'),
          ],
        ),
      ),
      body: SafeArea(
        child: TabBarView(
          controller: _tabController,
          children: [
            _buildList(inProgressOrders, 'No Orders In Progress', 'Orders being cooked in the kitchen will show here.', notifier, false),
            _buildList(readyOrders, 'No Orders Ready', 'Orders plated and ready for pickup will appear here.', notifier, true),
          ],
        ),
      ),
    );
  }

  Widget _buildList(
    List<KitchenOrder> orders,
    String emptyTitle,
    String emptyDesc,
    KitchenOrdersNotifier notifier,
    bool isReadyTab,
  ) {
    if (orders.isEmpty) {
      return Center(
        child: Padding(
          padding: AppSpacing.paddingXl,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.inventory_2_outlined, size: 48, color: Colors.grey.shade400),
              const SizedBox(height: AppSpacing.md),
              Text(
                emptyTitle,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimaryLight,
                ),
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(
                emptyDesc,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 13,
                  color: AppColors.textSecondaryLight,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () async {
        await notifier.loadOrders();
        await notifier.loadSummary();
      },
      child: ListView.separated(
        padding: AppSpacing.paddingMd,
        itemCount: orders.length,
        separatorBuilder: (context, index) => const SizedBox(height: AppSpacing.sm),
        itemBuilder: (context, index) {
          final order = orders[index];
          return _buildTrackerCard(order, notifier, isReadyTab);
        },
      ),
    );
  }

  Widget _buildTrackerCard(KitchenOrder order, KitchenOrdersNotifier notifier, bool isReadyTab) {
    Color statusColor;
    Color statusBg;
    String statusLabel;

    if (order.isPending) {
      statusColor = Colors.orange.shade800;
      statusBg = Colors.orange.shade50;
      statusLabel = 'QUEUED / PENDING';
    } else if (order.isPreparing) {
      statusColor = Colors.blue.shade800;
      statusBg = Colors.blue.shade50;
      statusLabel = 'COOKING';
    } else if (order.isReady) {
      statusColor = AppColors.primaryDark;
      statusBg = AppColors.primaryLight;
      statusLabel = 'READY';
    } else {
      statusColor = AppColors.textSecondaryLight;
      statusBg = AppColors.backgroundLight;
      statusLabel = 'COMPLETED / DISPATCHED';
    }

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: AppSpacing.roundedMd,
        side: BorderSide(
          color: order.isReady ? AppColors.primary : AppColors.borderLight,
          width: order.isReady ? 1.5 : 1.0,
        ),
      ),
      child: Padding(
        padding: AppSpacing.paddingMd,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.primary,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        'Ticket #${order.orderNumber}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                        ),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Text(
                      'Card: ${order.cardDisplayNumber}',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textSecondaryLight,
                      ),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: statusBg,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    statusLabel,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: statusColor,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              '${order.elapsedMinutes}m elapsed • ₹${order.amount.toStringAsFixed(0)}',
              style: const TextStyle(fontSize: 12, color: AppColors.textTertiaryLight),
            ),
            const Divider(height: 16),
            ...order.items.map(
              (item) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 2),
                child: Text(
                  '${item.quantity}x ${item.itemName}',
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: AppColors.textPrimaryLight,
                  ),
                ),
              ),
            ),
            if (order.isReady) ...[
              const SizedBox(height: AppSpacing.md),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () async {
                    final success = await notifier.updateStatus(order.transactionId, 'COMPLETED');
                    if (mounted && success) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Ticket #${order.orderNumber} handed over to customer!'),
                          backgroundColor: AppColors.primary,
                          duration: const Duration(seconds: 2),
                        ),
                      );
                    }
                  },
                  icon: const Icon(Icons.check_circle, size: 18),
                  label: const Text('CONFIRM HANDOVER / COMPLETE'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: AppSpacing.roundedMd,
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
