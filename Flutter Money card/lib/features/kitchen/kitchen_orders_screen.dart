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
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

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
    _searchController.dispose();
    super.dispose();
  }

  bool _matchesSearch(KitchenOrder order) {
    if (_searchQuery.isEmpty) return true;
    final q = _searchQuery.toLowerCase();
    if (order.cardDisplayNumber.toLowerCase().contains(q)) return true;
    if (order.orderNumber.toString().contains(q)) return true;
    return false;
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(kitchenOrdersNotifierProvider);
    final notifier = ref.read(kitchenOrdersNotifierProvider.notifier);

    final activeOrders = state.orders.where((o) => (o.isPending || o.isPreparing) && _matchesSearch(o)).toList();
    final readyOrders = state.orders.where((o) => o.isReady && _matchesSearch(o)).toList();

    return Scaffold(
      backgroundColor: AppColors.backgroundLight,
      appBar: AppBar(
        title: const Text(
          'Kitchen Orders',
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
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 6),
              child: TextField(
                controller: _searchController,
                onChanged: (val) {
                  setState(() {
                    _searchQuery = val.trim();
                  });
                },
                decoration: InputDecoration(
                  hintText: 'Search wallet ID, ticket #...',
                  prefixIcon: const Icon(Icons.search, size: 20),
                  suffixIcon: _searchController.text.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear, size: 18),
                          onPressed: () {
                            _searchController.clear();
                            setState(() {
                              _searchQuery = '';
                            });
                          },
                        )
                      : null,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: Color(0xFFE0E0E0)),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: Color(0xFFE0E0E0)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: AppColors.primary),
                  ),
                ),
              ),
            ),
            if (state.hasNewOrderPulse)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Colors.teal.shade700, Colors.green.shade800],
                  ),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.notifications_active, color: Colors.white, size: 20),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        state.latestNewOrderNumber != null
                            ? 'NEW ORDER ARRIVED: Ticket #${state.latestNewOrderNumber}'
                            : 'NEW ORDER ARRIVED FROM POS',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                          letterSpacing: 0.3,
                        ),
                      ),
                    ),
                    InkWell(
                      onTap: () => notifier.dismissPulse(),
                      child: const Padding(
                        padding: EdgeInsets.all(4.0),
                        child: Icon(Icons.close, color: Colors.white, size: 18),
                      ),
                    ),
                  ],
                ),
              ),
            if (state.isReconnecting)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                color: Colors.amber.shade100,
                child: Row(
                  children: [
                    SizedBox(
                      width: 14,
                      height: 14,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.amber.shade900,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Reconnecting to kitchen server... Showing cached tickets',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: Colors.amber.shade900,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            Expanded(
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
              _searchQuery.isNotEmpty ? 'No Matching Tickets' : emptyTitle,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimaryLight,
              ),
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              _searchQuery.isNotEmpty
                  ? 'No kitchen orders found matching "$_searchQuery".'
                  : emptyDescription,
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
      statusText = 'COOKING';
    } else {
      statusColor = AppColors.primaryDark;
      statusBg = AppColors.primaryLight;
      statusText = 'READY';
    }

    final elapsed = order.elapsedMinutes;
    final isUrgent = order.isPending || order.isPreparing;
    final isDelayed = isUrgent && elapsed >= 15;
    final isRush = isUrgent && elapsed >= 10 && elapsed < 15;

    BorderSide cardBorder;
    if (isDelayed) {
      cardBorder = BorderSide(color: Colors.red.shade400, width: 2.0);
    } else if (isRush) {
      cardBorder = BorderSide(color: Colors.amber.shade500, width: 1.5);
    } else {
      cardBorder = BorderSide(
        color: order.isPreparing ? Colors.blue.shade300 : AppColors.borderLight,
        width: order.isPreparing ? 1.5 : 1.0,
      );
    }

    return Card(
      elevation: isDelayed ? 3 : 2,
      shape: RoundedRectangleBorder(
        borderRadius: AppSpacing.roundedMd,
        side: cardBorder,
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

            // Time and Counter with Urgency Indicators
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
                if (isDelayed) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.red.shade50,
                      borderRadius: BorderRadius.circular(4),
                      border: Border.all(color: Colors.red.shade300),
                    ),
                    child: Text(
                      'DELAYED (${elapsed}m)',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: Colors.red.shade700,
                      ),
                    ),
                  ),
                ] else if (isRush) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.amber.shade50,
                      borderRadius: BorderRadius.circular(4),
                      border: Border.all(color: Colors.amber.shade400),
                    ),
                    child: Text(
                      'RUSH (${elapsed}m)',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: Colors.amber.shade800,
                      ),
                    ),
                  ),
                ],
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Text(
                    order.counterName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.textTertiaryLight,
                    ),
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
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => notifier.updateStatus(order.transactionId, 'PREPARING'),
                      icon: const Icon(Icons.play_arrow, size: 16),
                      label: const Text('PREPARING'),
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
                  const SizedBox(width: 8),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => notifier.updateStatus(order.transactionId, 'READY'),
                      icon: const Icon(Icons.check_circle_outline, size: 16),
                      label: const Text('MARK READY'),
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
              ),

            if (order.isPreparing)
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () => notifier.updateStatus(order.transactionId, 'READY'),
                  icon: const Icon(Icons.check_circle_outline, size: 18),
                  label: const Text('MARK READY FOR PICKUP'),
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

            if (order.isReady) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 8),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: AppColors.primaryLight,
                  borderRadius: AppSpacing.roundedMd,
                ),
                child: Text(
                  'Prepped in ${order.prepTimeMinutes}m - Ready for pickup',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primaryDark,
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.xs),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () => notifier.updateStatus(order.transactionId, 'PREPARING'),
                  icon: const Icon(Icons.undo, size: 16),
                  label: const Text('Undo / Return to Cooking'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.orange.shade800,
                    side: BorderSide(color: Colors.orange.shade400),
                    padding: const EdgeInsets.symmetric(vertical: 10),
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
