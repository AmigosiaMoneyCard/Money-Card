import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';
import '../../core/constants/permission_constants.dart';
import '../../models/analytics.dart';
import '../../models/branch.dart';
import '../../providers/analytics_provider.dart';
import '../../providers/branch_provider.dart';
import '../../widgets/analytics/analytics_pdf_preview_dialog.dart';
import '../../widgets/guards/permission_guard.dart';
import '../../widgets/states/app_empty_state.dart';
import '../../widgets/states/app_loading_view.dart';
import '../../widgets/states/app_unauthorized_state.dart';

class AnalyticsScreen extends ConsumerStatefulWidget {
  const AnalyticsScreen({super.key});

  @override
  ConsumerState<AnalyticsScreen> createState() => _AnalyticsScreenState();
}

class _AnalyticsScreenState extends ConsumerState<AnalyticsScreen> {
  late String _startDate;
  late String _endDate;

  static String _todayStr() {
    final now = DateTime.now();
    final y = now.year.toString().padLeft(4, '0');
    final m = now.month.toString().padLeft(2, '0');
    final d = now.day.toString().padLeft(2, '0');
    return '$y-$m-$d';
  }

  @override
  void initState() {
    super.initState();
    _startDate = _todayStr();
    _endDate = _todayStr();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(analyticsNotifierProvider.notifier).loadAnalytics();
    });
  }

  void _openPdfPreview(
    BuildContext context,
    BranchPerformanceMetric analytics,
    String branchName,
    String timeWindow,
  ) {
    AnalyticsPdfPreviewDialog.show(
      context: context,
      analytics: analytics,
      branchName: branchName,
      timeWindow: timeWindow,
    );
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<Branch?>(currentBranchProvider, (previous, next) {
      if (next != null && next.id != previous?.id) {
        ref.read(analyticsNotifierProvider.notifier).loadAnalytics();
      }
    });

    final analyticsState = ref.watch(analyticsNotifierProvider);
    final notifier = ref.read(analyticsNotifierProvider.notifier);
    final branchState = ref.watch(branchNotifierProvider);
    final currentBranch = branchState.currentBranch;

    return PermissionGuard.single(
      permission: AppPermission.viewAnalytics,
      fallback: const AppUnauthorizedState(),
      child: DefaultTabController(
        length: 2,
        child: Scaffold(
          appBar: AppBar(
            title: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Analytics'),
                      if (currentBranch != null)
                        Text(
                          currentBranch.name,
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.primary,
                            fontWeight: FontWeight.w600,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                    ],
                  ),
                ),
              ],
            ),
            bottom: const TabBar(
              tabs: [
                Tab(icon: Icon(Icons.receipt_long_outlined, size: 18), text: 'Recharge'),
                Tab(icon: Icon(Icons.restaurant_menu_outlined, size: 18), text: 'Menu'),
              ],
              labelColor: AppColors.primary,
              unselectedLabelColor: AppColors.textSecondaryLight,
              indicatorColor: AppColors.primary,
              indicatorWeight: 3,
              labelStyle: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
              unselectedLabelStyle: TextStyle(fontWeight: FontWeight.normal, fontSize: 13),
            ),
          ),
          body: Column(
            children: [
              // Filter Toolbar: Custom Date Range & Actions
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.md,
                  vertical: AppSpacing.sm,
                ),
                decoration: BoxDecoration(
                  color: Colors.white,
                  border: Border(bottom: BorderSide(color: AppColors.borderLight)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Row 1: Start Date and End Date Pickers
                    Row(
                      children: [
                        Expanded(
                          child: GestureDetector(
                            onTap: () async {
                              final picked = await showDatePicker(
                                context: context,
                                initialDate: DateTime.tryParse(_startDate) ?? DateTime.now(),
                                firstDate: DateTime(2020),
                                lastDate: DateTime.now(),
                                helpText: 'Select Start Date',
                              );
                              if (picked != null) {
                                setState(() {
                                  final y = picked.year.toString().padLeft(4, '0');
                                  final m = picked.month.toString().padLeft(2, '0');
                                  final d = picked.day.toString().padLeft(2, '0');
                                  _startDate = '$y-$m-$d';
                                });
                              }
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: AppSpacing.roundedSm,
                                border: Border.all(color: AppColors.borderLight),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.calendar_today, size: 13, color: AppColors.primary),
                                  const SizedBox(width: 5),
                                  Flexible(
                                    child: Text(
                                      _startDate,
                                      style: const TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w500,
                                        color: AppColors.textPrimaryLight,
                                      ),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        Expanded(
                          child: GestureDetector(
                            onTap: () async {
                              final picked = await showDatePicker(
                                context: context,
                                initialDate: DateTime.tryParse(_endDate) ?? DateTime.now(),
                                firstDate: DateTime(2020),
                                lastDate: DateTime.now(),
                                helpText: 'Select End Date',
                              );
                              if (picked != null) {
                                setState(() {
                                  final y = picked.year.toString().padLeft(4, '0');
                                  final m = picked.month.toString().padLeft(2, '0');
                                  final d = picked.day.toString().padLeft(2, '0');
                                  _endDate = '$y-$m-$d';
                                });
                              }
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: AppSpacing.roundedSm,
                                border: Border.all(color: AppColors.borderLight),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.calendar_today, size: 13, color: AppColors.primary),
                                  const SizedBox(width: 5),
                                  Flexible(
                                    child: Text(
                                      _endDate,
                                      style: const TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w500,
                                        color: AppColors.textPrimaryLight,
                                      ),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    // Row 2: Action Buttons (Apply, Reset to Today, View PDF)
                    Row(
                      children: [
                        ElevatedButton(
                          onPressed: () {
                            notifier.setCustomRange(_startDate, _endDate);
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            minimumSize: Size.zero,
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            shape: RoundedRectangleBorder(
                              borderRadius: AppSpacing.roundedSm,
                            ),
                          ),
                          child: const Text(
                            'Apply',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                          ),
                        ),
                        const SizedBox(width: 8),
                        OutlinedButton.icon(
                          onPressed: () {
                            final today = _todayStr();
                            setState(() {
                              _startDate = today;
                              _endDate = today;
                            });
                            notifier.setCustomRange(today, today);
                          },
                          icon: const Icon(Icons.today, size: 13, color: AppColors.primary),
                          label: const Text(
                            'Reset to Today',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: AppColors.primary,
                            ),
                          ),
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: AppColors.primaryLight),
                            backgroundColor: AppColors.primaryLight.withValues(alpha: 0.35),
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            minimumSize: Size.zero,
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            shape: RoundedRectangleBorder(
                              borderRadius: AppSpacing.roundedSm,
                            ),
                          ),
                        ),
                        const Spacer(),
                        ElevatedButton.icon(
                          onPressed: (analyticsState.isLoading || analyticsState.analytics == null)
                              ? null
                              : () => _openPdfPreview(
                                    context,
                                    analyticsState.analytics!,
                                    currentBranch?.name ?? 'Main Cafeteria',
                                    analyticsState.selectedRange,
                                  ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                            disabledBackgroundColor: AppColors.borderLight,
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            minimumSize: Size.zero,
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            shape: RoundedRectangleBorder(
                              borderRadius: AppSpacing.roundedSm,
                            ),
                          ),
                          icon: const Icon(Icons.picture_as_pdf, size: 14),
                          label: const Text(
                            'View PDF',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),

              // Main Tab Content
              Expanded(
                child: TabBarView(
                  children: [
                    // Tab 1: Consolidated Single-Box Metrics Overview
                    RefreshIndicator(
                      onRefresh: () async {
                        await notifier.loadAnalytics();
                      },
                      child: _buildOverviewTab(context, analyticsState, notifier),
                    ),
                    // Tab 2: Menu Analytics & Demand
                    RefreshIndicator(
                      onRefresh: () async {
                        await notifier.loadAnalytics();
                      },
                      child: _buildMenuAnalyticsTab(context, analyticsState, notifier),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }


  static String _formatCompactSubAmount(double amount) {
    if (amount >= 100000) {
      final val = amount / 100000;
      return '${val.toStringAsFixed(val.truncateToDouble() == val ? 0 : 1)}L';
    }
    if (amount >= 10000) {
      final val = amount / 1000;
      return '${val.toStringAsFixed(val.truncateToDouble() == val ? 0 : 1)}k';
    }
    if (amount == amount.roundToDouble()) {
      return amount.toStringAsFixed(0);
    }
    return amount.toStringAsFixed(2);
  }

  Widget _buildOverviewTab(
    BuildContext context,
    AnalyticsState state,
    AnalyticsNotifier notifier,
  ) {
    if (state.isLoading) {
      return const AppLoadingView(message: 'Loading counter analytics...');
    }

    if (state.errorMessage != null) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          const SizedBox(height: 80),
          Center(
            child: Padding(
              padding: AppSpacing.paddingLg,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 48, color: AppColors.error),
                  const SizedBox(height: AppSpacing.md),
                  Text(
                    state.errorMessage!,
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: AppColors.error),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  ElevatedButton(
                    onPressed: notifier.loadAnalytics,
                    child: const Text('Retry'),
                  ),
                ],
              ),
            ),
          ),
        ],
      );
    }

    final data = state.analytics;
    if (data == null) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: const [
          SizedBox(height: 80),
          AppEmptyState(
            title: 'No Analytics Data',
            description: 'No performance metrics available for this counter.',
            icon: Icons.bar_chart_outlined,
          ),
        ],
      );
    }

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 12),
      children: [
        // Row 1: Recharge Amount & Total Sales
        IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(
                child: _buildCompactMetricCard(
                  title: 'Recharge Amount',
                  totalText: '₹${data.rechargeVolume.toStringAsFixed(2)}',
                  line1Text: 'Cash: ₹${_formatCompactSubAmount(data.cashMoney)}',
                  line2Text: 'UPI: ₹${_formatCompactSubAmount(data.upiMoney)}',
                  icon: Icons.account_balance_wallet_outlined,
                  accentColor: AppColors.primaryDark,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _buildCompactMetricCard(
                  title: 'Total Sales',
                  totalText: '₹${data.netMoneyCollected.toStringAsFixed(2)}',
                  line1Text: 'Cash: ₹${_formatCompactSubAmount(data.cashInDrawer)}',
                  line2Text: 'UPI: ₹${_formatCompactSubAmount(data.upiMoney)}',
                  icon: Icons.payments_outlined,
                  accentColor: AppColors.success,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),

        // Row 2: Wallet Refund & Wallet Refund Count (Refunds Together)
        IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(
                child: _buildCompactMetricCard(
                  title: 'Wallet Refund',
                  totalText: '₹${data.refundVolume.toStringAsFixed(2)}',
                  line1Text: 'Cash: ₹${_formatCompactSubAmount(data.refundVolume)}',
                  line2Text: 'UPI: ₹0',
                  icon: Icons.assignment_return_outlined,
                  accentColor: AppColors.error,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _buildCompactMetricCard(
                  title: 'Wallet Refund Count',
                  totalText: '${data.refundCount} Refunds',
                  line1Text: 'Cards: ${data.refundCount}',
                  line2Text: 'Ret: ₹${_formatCompactSubAmount(data.refundVolume)}',
                  icon: Icons.keyboard_return,
                  accentColor: AppColors.warning,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),

        // Row 3: Cancelled Amount & Cancelled Count (Cancelled Together)
        IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(
                child: _buildCompactMetricCard(
                  title: 'Cancelled Amount',
                  totalText: '₹${data.cancelledTopUps.toStringAsFixed(2)}',
                  line1Text: 'Cancelled: ₹${_formatCompactSubAmount(data.cancelledTopUps)}',
                  line2Text: 'UPI: ₹0',
                  icon: Icons.cancel_outlined,
                  accentColor: Colors.deepOrange,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _buildCompactMetricCard(
                  title: 'Cancelled Count',
                  totalText: '${data.cancelledTopUpsCount} Recharges',
                  line1Text: 'Cancelled: ${data.cancelledTopUpsCount}',
                  line2Text: 'Ded: ₹${_formatCompactSubAmount(data.cancelledTopUps)}',
                  icon: Icons.money_off,
                  accentColor: Colors.brown,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),

        // Row 4: Wallet Activation
        IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(
                child: _buildCompactMetricCard(
                  title: 'Wallet Activation',
                  totalText: '${data.cardsGivenOut} Cards',
                  line1Text: 'Active: ${data.activeSessionsCount}',
                  line2Text: 'Settled: ${data.settledSessionsCount}',
                  icon: Icons.credit_card,
                  accentColor: AppColors.primary,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
      ],
    );
  }

  Widget _buildCompactMetricCard({
    required String title,
    required String totalText,
    String? line1Text,
    String? line2Text,
    IconData? icon,
    Color accentColor = AppColors.primary,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              if (icon != null) ...[
                Icon(icon, size: 14, color: accentColor),
                const SizedBox(width: 5),
              ],
              Expanded(
                child: Text(
                  title.toUpperCase(),
                  style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.3,
                    color: AppColors.textSecondaryLight,
                  ),
                  maxLines: 2,
                  softWrap: true,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            totalText,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: accentColor,
            ),
            overflow: TextOverflow.ellipsis,
          ),
          if (line1Text != null || line2Text != null) ...[
            const SizedBox(height: 6),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                if (line1Text != null)
                  Expanded(
                    child: Text(
                      line1Text,
                      style: const TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w500,
                        color: AppColors.textSecondaryLight,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                if (line1Text != null && line2Text != null)
                  const SizedBox(width: 4),
                if (line2Text != null)
                  Expanded(
                    child: Text(
                      line2Text,
                      textAlign: line1Text != null ? TextAlign.end : TextAlign.start,
                      style: const TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w500,
                        color: AppColors.textSecondaryLight,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  // ─── Tab 2: Menu Analytics Tab ───
  Widget _buildMenuAnalyticsTab(
    BuildContext context,
    AnalyticsState state,
    AnalyticsNotifier notifier,
  ) {
    if (state.isLoading) {
      return const AppLoadingView(message: 'Loading menu analytics...');
    }

    if (state.errorMessage != null) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          const SizedBox(height: 80),
          Center(
            child: Padding(
              padding: AppSpacing.paddingLg,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 48, color: AppColors.error),
                  const SizedBox(height: AppSpacing.md),
                  Text(
                    state.errorMessage!,
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: AppColors.error),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  ElevatedButton(
                    onPressed: notifier.loadAnalytics,
                    child: const Text('Retry'),
                  ),
                ],
              ),
            ),
          ),
        ],
      );
    }

    final data = state.analytics;
    if (data == null) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: const [
          SizedBox(height: 80),
          AppEmptyState(
            title: 'No Menu Analytics',
            description: 'No menu performance metrics available for this counter.',
            icon: Icons.restaurant_menu_outlined,
          ),
        ],
      );
    }

    final demands = data.productDemand ?? [];

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 12),
      children: [
        // Summary Cards
        IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(
                child: _buildMenuSummaryCard(
                  title: 'Food Sales',
                  value: '₹${data.purchaseVolume.toStringAsFixed(2)}',
                  subtitle: '${data.purchaseCount} orders placed',
                  icon: Icons.payments_outlined,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _buildMenuSummaryCard(
                  title: 'Cancelled Orders',
                  value: '${data.cancelledOrdersCount} Orders',
                  subtitle: '₹${data.cancelledOrdersVolume.toStringAsFixed(2)} cancelled',
                  icon: Icons.remove_shopping_cart_outlined,
                  color: AppColors.error,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // All Ordered Menu Items Dropdown Accordion
        Material(
          color: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: const BorderSide(color: AppColors.borderLight),
          ),
          clipBehavior: Clip.antiAlias,
          child: Theme(
            data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
            child: ExpansionTile(
              initiallyExpanded: true,
              tilePadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
              leading: Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: AppColors.primaryLight,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(
                  Icons.restaurant_menu,
                  color: AppColors.primary,
                  size: 20,
                ),
              ),
              title: const Text(
                'ALL ORDERED MENU ITEMS',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.5,
                  color: AppColors.textPrimaryLight,
                ),
              ),
              subtitle: Text(
                '${demands.length} items ordered in this period',
                style: const TextStyle(fontSize: 12, color: AppColors.textSecondaryLight),
              ),
              children: [
                const Divider(height: 1, color: AppColors.borderLight),
                const SizedBox(height: 10),
                if (demands.isEmpty)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 20),
                    child: Center(
                      child: Text(
                        'No menu items sold yet in this period',
                        style: TextStyle(color: AppColors.textSecondaryLight, fontSize: 13),
                      ),
                    ),
                  )
                else
                  ...demands.map((item) {
                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceVariantLight,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  item.productName,
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.textPrimaryLight,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  '${item.quantitySold} units sold',
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: AppColors.textSecondaryLight,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Text(
                            '₹${item.totalRevenue.toStringAsFixed(2)}',
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: AppColors.primaryDark,
                            ),
                          ),
                        ],
                      ),
                    );
                  }),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
      ],
    );
  }

  Widget _buildMenuSummaryCard({
    required String title,
    required String value,
    required String subtitle,
    required IconData icon,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Icon(icon, size: 14, color: color),
              const SizedBox(width: 5),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.3,
                    color: AppColors.textSecondaryLight,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: color,
            ),
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 2),
          Text(
            subtitle,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w500,
              color: AppColors.textSecondaryLight,
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}
