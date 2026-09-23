import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';
import '../../core/constants/permission_constants.dart';
import '../../core/utils/formatters.dart';
import '../../models/analytics.dart';
import '../../models/branch.dart';
import '../../providers/analytics_provider.dart';
import '../../providers/api_providers.dart';
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

  bool _isLoadingRecharges = false;
  List<dynamic> _rechargesList = [];
  String? _rechargesError;

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
      _fetchRecharges();
    });
  }

  Future<void> _fetchRecharges() async {
    setState(() {
      _isLoadingRecharges = true;
      _rechargesError = null;
    });

    try {
      final currentBranch = ref.read(currentBranchProvider);
      final sessionService = ref.read(sessionServiceProvider);
      final res = await sessionService.listRecharges(
        branchId: currentBranch?.id,
        startDate: _startDate,
        endDate: _endDate,
      );

      if (mounted) {
        setState(() {
          _isLoadingRecharges = false;
          _rechargesList = (res['items'] as List<dynamic>?) ?? [];
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoadingRecharges = false;
          _rechargesError = e.toString().replaceAll('ApiException: ', '');
        });
      }
    }
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

  String _formatDateTime(String? raw) {
    if (raw == null || raw.isEmpty) return '—';
    final formatted = AppFormatters.formatIsoDate(raw);
    return formatted == '-' ? '—' : formatted;
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<Branch?>(currentBranchProvider, (previous, next) {
      if (next != null && next.id != previous?.id) {
        ref.read(analyticsNotifierProvider.notifier).loadAnalytics();
        _fetchRecharges();
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
                Tab(icon: Icon(Icons.dashboard_outlined, size: 18), text: 'Overview'),
                Tab(icon: Icon(Icons.receipt_long_outlined, size: 18), text: 'Recharges Analytics'),
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
                            _fetchRecharges();
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
                            _fetchRecharges();
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
                        await _fetchRecharges();
                      },
                      child: _buildOverviewTab(context, analyticsState, notifier),
                    ),
                    // Tab 2: Recharges Analytics List with Cancel Option
                    RefreshIndicator(
                      onRefresh: _fetchRecharges,
                      child: _buildRechargesAnalyticsTab(context),
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
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 16),
      children: [
        // 1. RECHARGE AMOUNT
        _buildConsolidatedMetricBox(
          title: 'Recharge Amount',
          totalText: '₹${data.rechargeVolume.toStringAsFixed(2)}',
          cashSubtext: 'Cash: ₹${data.cashMoney.toStringAsFixed(2)}',
          upiSubtext: 'UPI: ₹${data.upiMoney.toStringAsFixed(2)}',
          icon: Icons.account_balance_wallet_outlined,
          accentColor: AppColors.primaryDark,
        ),

        // 2. REFUND AMOUNT
        _buildConsolidatedMetricBox(
          title: 'Refund Amount',
          totalText: '₹${data.refundVolume.toStringAsFixed(2)}',
          cashSubtext: 'Cash: ₹${data.refundVolume.toStringAsFixed(2)}',
          upiSubtext: 'UPI: ₹0.00',
          icon: Icons.assignment_return_outlined,
          accentColor: AppColors.error,
        ),

        // 3. CANCELED RECHARGE AMOUNT
        _buildConsolidatedMetricBox(
          title: 'Canceled Recharge Amount',
          totalText: '₹${data.cancelledTopUps.toStringAsFixed(2)}',
          cashSubtext: 'Cash Voided: ₹${data.cancelledTopUps.toStringAsFixed(2)}',
          upiSubtext: 'UPI Voided: ₹0.00',
          icon: Icons.cancel_outlined,
          accentColor: Colors.deepOrange,
        ),

        // 4. NET AMOUNT
        _buildConsolidatedMetricBox(
          title: 'Net Amount',
          totalText: '₹${data.netMoneyCollected.toStringAsFixed(2)}',
          cashSubtext: 'Net Cash: ₹${data.cashInDrawer.toStringAsFixed(2)}',
          upiSubtext: 'Net UPI: ₹${data.upiMoney.toStringAsFixed(2)}',
          icon: Icons.payments_outlined,
          accentColor: AppColors.success,
        ),

        // 5. WALLET ACTIVATION
        _buildConsolidatedMetricBox(
          title: 'Wallet Activation',
          totalText: '${data.cardsGivenOut} Cards Issued',
          cashSubtext: 'Active: ${data.activeSessionsCount}',
          upiSubtext: 'Settled: ${data.settledSessionsCount}',
          icon: Icons.credit_card,
          accentColor: AppColors.primary,
        ),

        // 6. RECHARGE COUNT
        _buildConsolidatedMetricBox(
          title: 'Recharge Count',
          totalText: '${data.rechargeCount} Recharges',
          cashSubtext: 'Cash: ${data.cashCount} txns',
          upiSubtext: 'UPI: ${data.upiCount} txns',
          icon: Icons.sync,
          accentColor: AppColors.info,
        ),

        // 7. REFUND COUNT
        _buildConsolidatedMetricBox(
          title: 'Refund Count',
          totalText: '${data.refundCount} Refunds',
          cashSubtext: 'Processed: ${data.refundCount} cards',
          upiSubtext: 'Returned: ₹${data.refundVolume.toStringAsFixed(0)}',
          icon: Icons.keyboard_return,
          accentColor: AppColors.warning,
        ),

        // 8. CANCELED ORDERS
        _buildConsolidatedMetricBox(
          title: 'Canceled Orders',
          totalText: '${data.cancelledOrdersCount} Orders',
          cashSubtext: 'Voided: ${data.cancelledOrdersCount} orders',
          upiSubtext: 'Refunded: ₹${data.cancelledOrdersVolume.toStringAsFixed(0)}',
          icon: Icons.remove_shopping_cart_outlined,
          accentColor: Colors.red.shade700,
        ),

        // 9. CANCELED RECHARGES
        _buildConsolidatedMetricBox(
          title: 'Canceled Recharges',
          totalText: '${data.cancelledTopUpsCount} Recharges',
          cashSubtext: 'Voided: ${data.cancelledTopUpsCount} top-ups',
          upiSubtext: 'Deducted: ₹${data.cancelledTopUps.toStringAsFixed(0)}',
          icon: Icons.money_off,
          accentColor: Colors.brown,
        ),

        const SizedBox(height: 16),
      ],
    );
  }

  Widget _buildConsolidatedMetricBox({
    required String title,
    required String totalText,
    String? cashSubtext,
    String? upiSubtext,
    String? extraSubtext,
    IconData? icon,
    Color accentColor = AppColors.primary,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderLight),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              if (icon != null) ...[
                Icon(icon, size: 16, color: accentColor),
                const SizedBox(width: 6),
              ],
              Text(
                title.toUpperCase(),
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.5,
                  color: AppColors.textSecondaryLight,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            totalText,
            style: TextStyle(
              fontSize: 26,
              fontWeight: FontWeight.bold,
              color: accentColor,
            ),
          ),
          const SizedBox(height: 10),
          if (cashSubtext != null || upiSubtext != null)
            Row(
              children: [
                if (cashSubtext != null)
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppColors.successLight.withValues(alpha: 0.4),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: AppColors.success.withValues(alpha: 0.2)),
                      ),
                      child: Text(
                        cashSubtext,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppColors.primaryDark,
                        ),
                      ),
                    ),
                  ),
                if (cashSubtext != null && upiSubtext != null)
                  const SizedBox(width: 8),
                if (upiSubtext != null)
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.purple.shade50,
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: Colors.purple.shade200),
                      ),
                      child: Text(
                        upiSubtext,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: Colors.purple.shade800,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          if (extraSubtext != null) ...[
            if (cashSubtext != null || upiSubtext != null)
              const SizedBox(height: 6),
            Text(
              extraSubtext,
              style: const TextStyle(fontSize: 12, color: AppColors.textSecondaryLight),
            ),
          ],
        ],
      ),
    );
  }

  // ─── Tab 2: Recharges Analytics List with Cancel Dropdown ───
  Widget _buildRechargesAnalyticsTab(BuildContext context) {
    if (_isLoadingRecharges) {
      return const AppLoadingView(message: 'Loading recharges history...');
    }

    if (_rechargesError != null) {
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
                    _rechargesError!,
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: AppColors.error),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  ElevatedButton(
                    onPressed: _fetchRecharges,
                    child: const Text('Retry'),
                  ),
                ],
              ),
            ),
          ),
        ],
      );
    }

    if (_rechargesList.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: const [
          SizedBox(height: 80),
          AppEmptyState(
            title: 'No Recharges Found',
            description: 'No recharge records match the selected date filter.',
            icon: Icons.receipt_long_outlined,
          ),
        ],
      );
    }

    return ListView.builder(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 16),
      itemCount: _rechargesList.length,
      itemBuilder: (ctx, index) {
        final item = _rechargesList[index] as Map<String, dynamic>;
        return _buildRechargeListItem(item);
      },
    );
  }

  Widget _buildRechargeListItem(Map<String, dynamic> item) {
    final txId = item['id'] as String? ?? '';
    final displayId = txId.length > 8 ? txId.substring(0, 8).toUpperCase() : txId.toUpperCase();
    final cardNum = item['cardNumber'] as String? ?? 'MC-Card';
    final staff = item['staffName'] as String? ?? 'Staff';
    final amount = (item['amount'] as num?)?.toDouble() ?? 0.0;
    final method = item['paymentMethod'] as String? ?? 'CASH';
    final isCancelled = item['isCancelled'] == true;
    final createdAt = item['createdAt'] as String?;
    final dateStr = createdAt != null ? _formatDateTime(createdAt) : '—';

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isCancelled ? Colors.grey.shade100 : Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: isCancelled ? Colors.grey.shade300 : AppColors.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Text(
                    'Coupon ID: #$displayId',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: isCancelled ? Colors.grey : AppColors.textPrimaryLight,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: method == 'CASH' ? AppColors.successLight : Colors.purple.shade50,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      method,
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: method == 'CASH' ? AppColors.primaryDark : Colors.purple.shade700,
                      ),
                    ),
                  ),
                ],
              ),
              if (isCancelled)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade200,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: const Text(
                    'CANCELLED',
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.black54),
                  ),
                )
              else
                PopupMenuButton<String>(
                  icon: const Icon(Icons.more_vert, size: 20, color: AppColors.textSecondaryLight),
                  onSelected: (val) {
                    if (val == 'CANCEL') {
                      _handleCancelRechargeFromAnalytics(item);
                    }
                  },
                  itemBuilder: (ctx) => [
                    const PopupMenuItem(
                      value: 'CANCEL',
                      child: Row(
                        children: [
                          Icon(Icons.cancel_outlined, size: 16, color: AppColors.error),
                          SizedBox(width: 8),
                          Text('Cancel Recharge', style: TextStyle(color: AppColors.error, fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ),
                  ],
                ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Card: $cardNum', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
              Text(
                '₹${amount.toStringAsFixed(2)}',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: isCancelled ? Colors.grey : AppColors.success,
                  decoration: isCancelled ? TextDecoration.lineThrough : null,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Staff: $staff', style: const TextStyle(fontSize: 12, color: AppColors.textSecondaryLight)),
              Text(dateStr, style: const TextStyle(fontSize: 11, color: AppColors.textTertiaryLight)),
            ],
          ),
          if (isCancelled && item['cancellationReason'] != null) ...[
            const SizedBox(height: 4),
            Text(
              'Reason: ${item['cancellationReason']}',
              style: const TextStyle(fontSize: 11, color: Colors.black54, fontStyle: FontStyle.italic),
            ),
          ],
        ],
      ),
    );
  }

  Future<void> _handleCancelRechargeFromAnalytics(Map<String, dynamic> item) async {
    final txId = item['id'] as String;
    final amount = (item['amount'] as num?)?.toDouble() ?? 0.0;
    final cardNum = item['cardNumber'] ?? 'Card';

    String selectedReason = 'Wrong Amount Entered';
    final customReasonCtrl = TextEditingController();

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (dialogCtx, setModalState) => AlertDialog(
          title: Row(
            children: const [
              Icon(Icons.warning_amber_rounded, color: AppColors.error, size: 24),
              SizedBox(width: 8),
              Text('Cancel Recharge?', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Cancel recharge of ₹${amount.toStringAsFixed(2)} on $cardNum? This will void the top-up and deduct ₹${amount.toStringAsFixed(2)} from the card balance.',
                style: const TextStyle(fontSize: 14, color: AppColors.textPrimaryLight),
              ),
              const SizedBox(height: 16),
              const Text(
                'Select Cancellation Reason:',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textSecondaryLight),
              ),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                initialValue: selectedReason,
                items: const [
                  DropdownMenuItem(value: 'Wrong Amount Entered', child: Text('Wrong Amount Entered')),
                  DropdownMenuItem(value: 'Customer Changed Mind', child: Text('Customer Changed Mind')),
                  DropdownMenuItem(value: 'Duplicate Scan', child: Text('Duplicate Scan')),
                  DropdownMenuItem(value: 'Other Reason', child: Text('Other Reason')),
                ],
                onChanged: (val) {
                  if (val != null) {
                    setModalState(() => selectedReason = val);
                  }
                },
                decoration: InputDecoration(
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                ),
              ),
              if (selectedReason == 'Other Reason') ...[
                const SizedBox(height: 10),
                TextField(
                  controller: customReasonCtrl,
                  decoration: InputDecoration(
                    hintText: 'Enter specific reason...',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  ),
                ),
              ],
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: const Text('Keep Recharge'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
              onPressed: () => Navigator.of(ctx).pop(true),
              child: const Text('Confirm Cancel', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );

    if (confirm != true) return;

    final reason = selectedReason == 'Other Reason' && customReasonCtrl.text.trim().isNotEmpty
        ? customReasonCtrl.text.trim()
        : selectedReason;

    try {
      final sessionService = ref.read(sessionServiceProvider);
      await sessionService.cancelRecharge(transactionId: txId, reason: reason);
      await _fetchRecharges();
      ref.read(analyticsNotifierProvider.notifier).loadAnalytics();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Recharge of ₹${amount.toStringAsFixed(2)} cancelled successfully.'),
          backgroundColor: AppColors.success,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Cancellation failed: $e'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }
}
