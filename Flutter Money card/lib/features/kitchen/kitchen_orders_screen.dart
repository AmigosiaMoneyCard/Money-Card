import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';
import '../../models/kitchen_order.dart';
import '../../providers/kitchen_orders_provider.dart';

class KitchenOrdersScreen extends ConsumerStatefulWidget {
  const KitchenOrdersScreen({super.key});

  @override
  ConsumerState<KitchenOrdersScreen> createState() => _KitchenOrdersScreenState();
}

class _KitchenOrdersScreenState extends ConsumerState<KitchenOrdersScreen>
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

    final activeOrders = state.orders.where((o) => o.isPending || o.isPreparing).toList();
    final readyOrders = state.orders.where((o) => o.isReady).toList();

    return Scaffold(
      backgroundColor: AppColors.backgroundLight,
      appBar: AppBar(
        title: const Text(
          'Kitchen Display System',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh Queue',
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
            Tab(text: 'Active Prep (${activeOrders.length})'),
            Tab(text: 'Ready for Pickup (${readyOrders.length})'),
          ],
        ),
      ),
      body: SafeArea(
        child: TabBarView(
          controller: _tabController,
          children: [
            // Active orders tab
            _buildOrderList(
              orders: activeOrders,
              emptyTitle: 'Kitchen Queue Clear',
              emptyDescription: 'No food orders pending preparation right now.',
              onRefresh: () async {
                await notifier.loadOrders();
                await notifier.loadSummary();
              },
              notifier: notifier,
              isActiveTab: true,
            ),
            // Ready orders tab
            _buildOrderList(
              orders: readyOrders,
              emptyTitle: 'No Orders Ready',
              emptyDescription: 'Orders marked done will appear here for pickup.',
              onRefresh: () async {
                await notifier.loadOrders();
                await notifier.loadSummary();
              },
              notifier: notifier,
              isActiveTab: false,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOrderList({
    required List<KitchenOrder> orders,
    required String emptyTitle,
    required String emptyDescription,
    required Future<void> Function() onRefresh,
    required KitchenOrdersNotifier notifier,
    required bool isActiveTab,
  }) {
    if (orders.isEmpty) {
      return RefreshIndicator(
        onRefresh: onRefresh,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: AppSpacing.paddingXl,
          children: [
            const SizedBox(height: 60),
            Center(
              child: Container(
                padding: const EdgeInsets.all(AppSpacing.lg),
                decoration: const BoxDecoration(
                  color: AppColors.primaryLight,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.restaurant,
                  size: 48,
                  color: AppColors.primaryDark,
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            Text(
              emptyTitle,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimaryLight,
              ),
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              emptyDescription,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 14,
                color: AppColors.textSecondaryLight,
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView.separated(
        padding: AppSpacing.paddingMd,
        itemCount: orders.length,
        separatorBuilder: (context, index) => const SizedBox(height: AppSpacing.sm),
        itemBuilder: (context, index) {
          final order = orders[index];
          return _buildKitchenOrderCard(order, notifier);
        },
      ),
    );
  }

  Widget _buildKitchenOrderCard(KitchenOrder order, KitchenOrdersNotifier notifier) {
    Color statusColor;
    Color statusBg;
    String statusText;

    if (order.isPending) {
      statusColor = Colors.orange.shade800;
      statusBg = Colors.orange.shade50;
      statusText = 'QUEUED / PENDING';
    } else if (order.isPreparing) {
      statusColor = Colors.blue.shade800;
      statusBg = Colors.blue.shade50;
      statusText = 'COOKING / IN PROGRESS';
    } else {
      statusColor = AppColors.primaryDark;
      statusBg = AppColors.primaryLight;
      statusText = 'FINISHED / READY';
    }

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: AppSpacing.roundedMd,
        side: BorderSide(
          color: order.isPreparing ? Colors.blue.shade300 : AppColors.borderLight,
          width: order.isPreparing ? 1.5 : 1.0,
        ),
      ),
      child: Padding(
        padding: AppSpacing.paddingMd,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header Row: Ticket #, Card, and Elapsed Time
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.primary,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        'Ticket #${order.orderNumber}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
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
                    statusText,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: statusColor,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.xs),

            // Time and Counter
            Row(
              children: [
                const Icon(Icons.timer_outlined, size: 14, color: AppColors.textTertiaryLight),
                const SizedBox(width: 4),
                Text(
                  '${order.elapsedMinutes}m elapsed',
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.textTertiaryLight,
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                Text(
                  order.counterName,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.textTertiaryLight,
                  ),
                ),
              ],
            ),

            const Divider(height: 20),

            // Item Checklist
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: order.items.map((item) {
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 3),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.backgroundLight,
                          borderRadius: BorderRadius.circular(4),
                          border: Border.all(color: AppColors.borderLight),
                        ),
                        child: Text(
                          '${item.quantity}x',
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: Text(
                          item.itemName,
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimaryLight,
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),

            const SizedBox(height: AppSpacing.md),

            // Action Buttons
            if (order.isPending)
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () => notifier.updateStatus(order.transactionId, 'PREPARING'),
                  icon: const Icon(Icons.play_arrow, size: 18),
                  label: const Text('START PREPARING'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blue.shade700,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: AppSpacing.roundedMd,
                    ),
                  ),
                ),
              ),

            if (order.isPreparing)
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () => notifier.updateStatus(order.transactionId, 'READY'),
                  icon: const Icon(Icons.check_circle_outline, size: 18),
                  label: const Text('MARK AS READY / DONE'),
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

            if (order.isReady)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 8),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: AppColors.primaryLight,
                  borderRadius: AppSpacing.roundedMd,
                ),
                child: const Text(
                  'Waiting for counter pickup / handover',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primaryDark,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
