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
import '../../widgets/common/app_badge.dart';
import '../../widgets/common/app_card.dart';
import '../../widgets/common/section_header.dart';
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
  final List<String> _ranges = [
    'Today',
    'Yesterday',
    'This Week',
    'This Month',
    'Last 30 Days',
    'All Time',
  ];

  @override
  void initState() {
    super.initState();
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
    final assignedBranches = branchState.assignedBranches;

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
                if (assignedBranches.length > 1 && currentBranch != null)
                  _buildBranchSwitcher(context, ref, currentBranch, assignedBranches),
              ],
            ),
            bottom: const TabBar(
              tabs: [
                Tab(icon: Icon(Icons.account_balance, size: 18), text: 'Financial Overview'),
                Tab(icon: Icon(Icons.credit_card, size: 18), text: 'Card Analytics'),
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
              // Filter Toolbar: Time Window Dropdown & View PDF Action
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.md,
                  vertical: AppSpacing.sm,
                ),
                child: Row(
                  children: [
                    // Time Window Dropdown
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: AppSpacing.roundedSm,
                          border: Border.all(color: AppColors.borderLight),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.03),
                              blurRadius: 3,
                              offset: const Offset(0, 1),
                            ),
                          ],
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.schedule, size: 16, color: AppColors.primary),
                            const SizedBox(width: 8),
                            Expanded(
                              child: DropdownButtonHideUnderline(
                                child: DropdownButton<String>(
                                  value: _ranges.contains(analyticsState.selectedRange)
                                      ? analyticsState.selectedRange
                                      : _ranges.first,
                                  isExpanded: true,
                                  icon: const Icon(Icons.arrow_drop_down, color: AppColors.primary),
                                  style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.textPrimaryLight,
                                  ),
                                  onChanged: (value) {
                                    if (value != null) {
                                      notifier.setRange(value);
                                    }
                                  },
                                  items: _ranges.map((range) {
                                    return DropdownMenuItem<String>(
                                      value: range,
                                      child: Text(range),
                                    );
                                  }).toList(),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.sm),

                    // View PDF Action Button
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
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: AppSpacing.roundedSm,
                        ),
                      ),
                      icon: const Icon(Icons.picture_as_pdf, size: 16),
                      label: const Text(
                        'View PDF',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),

              // Main Tab Content
              Expanded(
                child: RefreshIndicator(
                  onRefresh: notifier.loadAnalytics,
                  child: _buildBody(context, analyticsState, notifier),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBranchSwitcher(
    BuildContext context,
    WidgetRef ref,
    Branch currentBranch,
    List<Branch> assignedBranches,
  ) {
    return PopupMenuButton<Branch>(
      initialValue: currentBranch,
      onSelected: (branch) {
        ref.read(branchNotifierProvider.notifier).selectBranch(branch);
      },
      itemBuilder: (context) {
        return assignedBranches.map((branch) {
          final isSelected = branch.id == currentBranch.id;
          return PopupMenuItem<Branch>(
            value: branch,
            child: Row(
              children: [
                Icon(
                  Icons.storefront,
                  size: 18,
                  color: isSelected ? AppColors.primary : AppColors.textSecondaryLight,
                ),
                const SizedBox(width: AppSpacing.sm),
                Text(
                  branch.name,
                  style: TextStyle(
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                    color: isSelected ? AppColors.primaryDark : AppColors.textPrimaryLight,
                  ),
                ),
              ],
            ),
          );
        }).toList();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: AppColors.primaryLight,
          borderRadius: AppSpacing.roundedSm,
          border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.swap_horiz, size: 16, color: AppColors.primaryDark),
            const SizedBox(width: 4),
            const Text(
              'Switch Counter',
              style: TextStyle(
                color: AppColors.primaryDark,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
            const Icon(Icons.arrow_drop_down, size: 16, color: AppColors.primaryDark),
          ],
        ),
      ),
    );
  }

  Widget _buildBody(
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

    return TabBarView(
      children: [
        _buildFinancialOverview(context, data),
        _buildCardAnalytics(context, data),
      ],
    );
  }

  // ─── Tab 1: Financial Overview ───
  Widget _buildFinancialOverview(BuildContext context, BranchPerformanceMetric data) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: AppSpacing.paddingMd,
      children: [
        // Total Revenue & Volume Card
        AppCard(
          padding: AppSpacing.paddingLg,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Financial Overview',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textSecondaryLight,
                    ),
                  ),
                  AppBadge(
                    label: data.status,
                    variant: data.status == 'ACTIVE'
                        ? AppBadgeVariant.success
                        : AppBadgeVariant.neutral,
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                '\u20b9${data.totalRevenue.toStringAsFixed(2)}',
                style: const TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primary,
                ),
              ),
              const Text(
                'Total Revenue (Sales & Recharges)',
                style: TextStyle(fontSize: 12, color: AppColors.textSecondaryLight),
              ),
              const Divider(height: AppSpacing.xl),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _buildSummaryCol('Purchases', '\u20b9${data.purchaseVolume.toStringAsFixed(0)}'),
                  _buildSummaryCol('Recharges', '\u20b9${data.rechargeVolume.toStringAsFixed(0)}'),
                  _buildSummaryCol('Refunds', '\u20b9${data.refundVolume.toStringAsFixed(0)}'),
                  _buildSummaryCol('Tx Count', '${data.transactionCount}'),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.md),

        // Financial Operations Grid
        Row(
          children: [
            Expanded(
              child: _buildMetricTile(
                icon: Icons.point_of_sale,
                label: 'Orders / Purchases',
                value: '${data.purchaseCount}',
                subValue: 'Avg \u20b9${data.avgPurchaseValue.toStringAsFixed(0)}',
                color: AppColors.primary,
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: _buildMetricTile(
                icon: Icons.account_balance_wallet,
                label: 'Card Recharges',
                value: '${data.rechargeCount}',
                subValue: '\u20b9${data.rechargeVolume.toStringAsFixed(0)} volume',
                color: AppColors.success,
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.sm),
        Row(
          children: [
            Expanded(
              child: _buildMetricTile(
                icon: Icons.receipt_long,
                label: 'Avg Transaction',
                value: '\u20b9${data.avgTransactionValue.toStringAsFixed(0)}',
                subValue: 'Across all orders',
                color: AppColors.primaryDark,
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: _buildMetricTile(
                icon: Icons.inventory_2_outlined,
                label: 'Low Stock Alert',
                value: '${data.lowStockItemCount}',
                subValue: 'of ${data.inventoryItemCount} items',
                color: data.lowStockItemCount > 0 ? AppColors.warning : AppColors.success,
              ),
            ),
          ],
        ),
      ],
    );
  }

  // ─── Tab 2: Card Analytics ───
  Widget _buildCardAnalytics(BuildContext context, BranchPerformanceMetric data) {
    final totalSessions = data.sessionCount > 0 ? data.sessionCount : (data.activeSessionsCount + data.settledSessionsCount);
    final activePct = totalSessions > 0 ? ((data.activeSessionsCount / totalSessions) * 100).toStringAsFixed(0) : '0';

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: AppSpacing.paddingMd,
      children: [
        const SectionHeader(title: 'Card Fleet & Session Lifecycle'),
        const SizedBox(height: AppSpacing.sm),

        // Card Operations Grid
        Row(
          children: [
            Expanded(
              child: _buildMetricTile(
                icon: Icons.credit_card,
                label: 'In Circulation',
                value: '${data.activeSessionsCount}',
                subValue: 'Active card sessions',
                color: AppColors.primary,
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: _buildMetricTile(
                icon: Icons.check_circle_outline,
                label: 'Settled Cards',
                value: '${data.settledSessionsCount}',
                subValue: 'Returned & settled',
                color: AppColors.success,
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.sm),
        Row(
          children: [
            Expanded(
              child: _buildMetricTile(
                icon: Icons.history,
                label: 'Total Sessions',
                value: '$totalSessions',
                subValue: 'Lifetime session count',
                color: AppColors.primaryDark,
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: _buildMetricTile(
                icon: Icons.refresh,
                label: 'Card Top-Ups',
                value: '${data.rechargeCount}',
                subValue: 'Wallet recharge actions',
                color: AppColors.info,
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.md),

        // Session Distribution Card
        AppCard(
          padding: AppSpacing.paddingMd,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Circulation vs. Settled Ratio',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(
                '$activePct% of all recorded card sessions are actively circulating with customers.',
                style: const TextStyle(fontSize: 12, color: AppColors.textSecondaryLight),
              ),
              const SizedBox(height: AppSpacing.sm),
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: totalSessions > 0 ? (data.activeSessionsCount / totalSessions) : 0,
                  backgroundColor: AppColors.borderLight,
                  valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary),
                  minHeight: 8,
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(
                          color: AppColors.primary,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        'Active (${data.activeSessionsCount})',
                        style: const TextStyle(fontSize: 11, color: AppColors.textSecondaryLight),
                      ),
                    ],
                  ),
                  Row(
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(
                          color: AppColors.borderLight,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        'Settled (${data.settledSessionsCount})',
                        style: const TextStyle(fontSize: 11, color: AppColors.textSecondaryLight),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSummaryCol(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 12, color: AppColors.textSecondaryLight),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
        ),
      ],
    );
  }

  Widget _buildMetricTile({
    required IconData icon,
    required String label,
    required String value,
    required String subValue,
    required Color color,
  }) {
    return AppCard(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 22),
          const SizedBox(height: AppSpacing.sm),
          Text(
            value,
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          Text(
            label,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
          ),
          Text(
            subValue,
            style: const TextStyle(fontSize: 11, color: AppColors.textSecondaryLight),
          ),
        ],
      ),
    );
  }
}
