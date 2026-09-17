import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';
import '../../models/card_session.dart';
import '../../models/transaction.dart';
import '../../providers/session_operations_provider.dart';
import '../../widgets/common/app_badge.dart';
import '../../widgets/common/app_card.dart';
import '../../widgets/common/section_header.dart';
import '../../widgets/states/app_error_state.dart';
import '../../widgets/states/app_loading_view.dart';
import '../../core/utils/formatters.dart';

/// Authoritative Session Details & Activity Timeline Screen.
/// Displays live balance, customer profile, operational action buttons,
/// and the complete chronological activity timeline (Purchases, Recharges, Issuance)
/// strictly for the CURRENT active card cycle/session.
class SessionDetailsScreen extends ConsumerStatefulWidget {
  final String sessionId;

  const SessionDetailsScreen({
    super.key,
    required this.sessionId,
  });

  @override
  ConsumerState<SessionDetailsScreen> createState() => _SessionDetailsScreenState();
}

class _SessionDetailsScreenState extends ConsumerState<SessionDetailsScreen> {
  final List<String> _ranges = [
    'All Time',
    'Today',
    'Yesterday',
    'This Week',
    'This Month',
    'Last 30 Days',
  ];
  String _selectedRange = 'All Time';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final current = ref.read(sessionDetailsNotifierProvider).session;
      if (current == null || current.id != widget.sessionId) {
        ref.read(sessionDetailsNotifierProvider.notifier).loadSessionById(widget.sessionId);
      }
    });
  }

  bool _isWithinRange(DateTime dt, String range) {
    final now = DateTime.now();
    switch (range.toLowerCase()) {
      case 'today':
        return dt.year == now.year && dt.month == now.month && dt.day == now.day;
      case 'yesterday':
        final yesterday = now.subtract(const Duration(days: 1));
        return dt.year == yesterday.year && dt.month == yesterday.month && dt.day == yesterday.day;
      case 'this week':
        final startOfWeek = DateTime(now.year, now.month, now.day).subtract(Duration(days: now.weekday - 1));
        return dt.isAfter(startOfWeek) || dt.isAtSameMomentAs(startOfWeek);
      case 'this month':
        return dt.year == now.year && dt.month == now.month;
      case 'last 30 days':
        final thirtyDaysAgo = DateTime(now.year, now.month, now.day).subtract(const Duration(days: 30));
        return dt.isAfter(thirtyDaysAgo) || dt.isAtSameMomentAs(thirtyDaysAgo);
      case 'all time':
      default:
        return true;
    }
  }

  String _formatDateTime(String? raw) {
    if (raw == null || raw.isEmpty) return '—';
    final formatted = AppFormatters.formatIsoDate(raw);
    return formatted == '-' ? '—' : formatted;
  }

  @override
  Widget build(BuildContext context) {
    final sessionState = ref.watch(sessionDetailsNotifierProvider);
    final session = sessionState.session;

    if (sessionState.isLoading) {
      return const Scaffold(
        body: AppLoadingView(message: 'Loading session details...'),
      );
    }

    if (sessionState.errorMessage != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Session Details')),
        body: AppErrorState(
          message: sessionState.errorMessage!,
          onRetry: () => ref.read(sessionDetailsNotifierProvider.notifier).loadSessionById(widget.sessionId),
        ),
      );
    }

    if (session == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Session Details')),
        body: const Center(child: Text('Session not found')),
      );
    }

    final isActive = session.status == SessionStatus.active;
    final allTransactions = session.transactions ?? [];
    final filteredTransactions = allTransactions.where((txn) {
      if (_selectedRange == 'All Time') return true;
      final raw = txn.createdAt;
      if (raw == null || raw.isEmpty) return true;
      final dt = DateTime.tryParse(raw)?.toLocal();
      if (dt == null) return true;
      return _isWithinRange(dt, _selectedRange);
    }).toList();

    return Scaffold(
      appBar: AppBar(
        title: Text('Card ${session.displayCardNumber}'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh Session',
            onPressed: () => ref.read(sessionDetailsNotifierProvider.notifier).loadSessionById(widget.sessionId),
          ),
        ],
      ),
      body: ListView(
        padding: AppSpacing.paddingMd,
        children: [
          // ─── Authoritative Balance Card ──────────────────────────────
          AppCard(
            padding: AppSpacing.paddingLg,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Session Balance',
                      style: TextStyle(
                        fontSize: 14,
                        color: AppColors.textSecondaryLight,
                      ),
                    ),
                    AppBadge(
                      label: session.status.value,
                      variant: isActive ? AppBadgeVariant.success : AppBadgeVariant.neutral,
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  '₹${session.balance.toStringAsFixed(2)}',
                  style: const TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                  ),
                ),
                const Divider(height: AppSpacing.lg),
                Row(
                  children: [
                    const Icon(Icons.credit_card, size: 16, color: AppColors.textSecondaryLight),
                    const SizedBox(width: AppSpacing.xs),
                    Text(
                      'Card: ${session.displayCardNumber}',
                      style: const TextStyle(fontSize: 13, color: AppColors.textSecondaryLight),
                    ),

                  ],
                ),
                if (session.customerName != null && session.customerName!.isNotEmpty) ...[
                  const SizedBox(height: AppSpacing.xs),
                  Row(
                    children: [
                      const Icon(Icons.person_outline, size: 16, color: AppColors.primary),
                      const SizedBox(width: AppSpacing.xs),
                      Expanded(
                        child: Text(
                          'Customer: ${session.customerName}${session.customerPhone != null && session.customerPhone!.isNotEmpty ? " (${session.customerPhone})" : ""}',
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimaryLight,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
                const SizedBox(height: AppSpacing.xs),
                Row(
                  children: [
                    const Icon(Icons.access_time, size: 16, color: AppColors.textSecondaryLight),
                    const SizedBox(width: AppSpacing.xs),
                    Text(
                      'Started: ${_formatDateTime(session.startedAt)}',
                      style: const TextStyle(fontSize: 13, color: AppColors.textSecondaryLight),
                    ),
                  ],
                ),
                if (session.settledAt != null) ...[
                  const SizedBox(height: AppSpacing.xs),
                  Row(
                    children: [
                      const Icon(Icons.check_circle_outline, size: 16, color: AppColors.success),
                      const SizedBox(width: AppSpacing.xs),
                      Text(
                        'Settled: ${_formatDateTime(session.settledAt)}',
                        style: const TextStyle(fontSize: 13, color: AppColors.textSecondaryLight),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.lg),

          // ─── Activity & Transactions Timeline ────────────────────────
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Expanded(
                child: SectionHeader(title: 'Transaction History'),
              ),
              const SizedBox(width: AppSpacing.sm),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: AppSpacing.roundedSm,
                  border: Border.all(color: AppColors.borderLight),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.schedule, size: 14, color: AppColors.primary),
                    const SizedBox(width: 4),
                    DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: _ranges.contains(_selectedRange) ? _selectedRange : _ranges.first,
                        isDense: true,
                        icon: const Icon(Icons.arrow_drop_down, size: 18, color: AppColors.primary),
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimaryLight,
                        ),
                        onChanged: (value) {
                          if (value != null) {
                            setState(() {
                              _selectedRange = value;
                            });
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
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.xs),

          // Render Transactions (Purchases, Recharges, Settlement)
          if (filteredTransactions.isNotEmpty)
            ...filteredTransactions.map((txn) => _buildTransactionCard(txn)),

          // Render Card Issuance Base Timeline Event
          if (_selectedRange == 'All Time' || (DateTime.tryParse(session.startedAt) != null && _isWithinRange(DateTime.parse(session.startedAt).toLocal(), _selectedRange)))
            _buildCardIssuedTimelineCard(session),

          if (filteredTransactions.isEmpty) ...[
            const SizedBox(height: AppSpacing.sm),
            Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: Colors.grey.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.grey.shade200),
              ),
              child: Row(
                children: [
                  Icon(Icons.info_outline, size: 18, color: Colors.grey.shade500),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Text(
                      _selectedRange == 'All Time'
                          ? 'No additional transactions in this card session yet.'
                          : 'No transactions found for $_selectedRange.',
                      style: const TextStyle(fontSize: 13, color: AppColors.textSecondaryLight),
                    ),
                  ),
                ],
              ),
            ),
          ],

          const SizedBox(height: AppSpacing.xl),
        ],
      ),
    );
  }

  /// Builds a timeline card for a Purchase, Recharge, or Refund transaction.
  Widget _buildTransactionCard(Transaction txn) {
    final isPurchase = txn.type == TransactionType.purchase;
    final isRecharge = txn.type == TransactionType.recharge;

    Color badgeBg;
    Color badgeFg;
    IconData icon;
    String typeLabel;

    if (isRecharge) {
      badgeBg = AppColors.successLight;
      badgeFg = AppColors.success;
      icon = Icons.arrow_upward;
      final payMethodStr = txn.paymentMethod == PaymentMethod.upi ? 'UPI' : 'Cash';
      typeLabel = 'Wallet Recharge ($payMethodStr)';
    } else if (isPurchase) {
      badgeBg = AppColors.primaryLight;
      badgeFg = AppColors.primary;
      icon = Icons.shopping_bag_outlined;
      typeLabel = 'Purchase';
    } else {
      badgeBg = AppColors.warningLight;
      badgeFg = AppColors.warning;
      icon = Icons.assignment_return_outlined;
      typeLabel = 'Settlement Refund';
    }

    final hasItems = isPurchase && txn.items != null && txn.items!.isNotEmpty;

    return Container(
      key: ValueKey('txn-${txn.id}'),
      margin: const EdgeInsets.only(bottom: AppSpacing.sm),
      decoration: BoxDecoration(
        color: AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Row
          Padding(
            padding: AppSpacing.paddingMd,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: badgeBg,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(icon, color: badgeFg, size: 20),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (hasItems) ...[
                        for (final item in txn.items!)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 2),
                            child: Row(
                              children: [
                                Flexible(
                                  child: Text(
                                    item.itemName ?? 'Item',
                                    style: const TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.bold,
                                      color: AppColors.textPrimaryLight,
                                    ),
                                  ),
                                ),
                                if (item.quantity > 1) ...[
                                  const SizedBox(width: 6),
                                  Text(
                                    '× ${item.quantity}',
                                    style: const TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.textSecondaryLight,
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                      ] else ...[
                        Text(
                          typeLabel,
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: AppColors.textPrimaryLight,
                          ),
                        ),
                      ],
                      const SizedBox(height: 2),
                      Text(
                        _formatDateTime(txn.createdAt),
                        style: const TextStyle(
                          fontSize: 11,
                          color: AppColors.textSecondaryLight,
                        ),
                      ),
                    ],
                  ),
                ),
                Text(
                  '${isRecharge ? "+" : isPurchase ? "-" : ""}₹${txn.amount.toStringAsFixed(2)}',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: isRecharge
                        ? AppColors.success
                        : isPurchase
                            ? AppColors.error
                            : AppColors.textPrimaryLight,
                  ),
                ),
              ],
            ),
          ),

          // Footer details ONLY for recharge or refund (no "paid via" for purchase, no "balance after")
          if (!isPurchase)
            Padding(
              padding: const EdgeInsets.fromLTRB(AppSpacing.md, 0, AppSpacing.md, AppSpacing.sm),
              child: Text(
                isRecharge
                    ? 'Payment: ${txn.paymentMethod == PaymentMethod.upi ? "UPI" : "Cash"}'
                    : 'Refund via: Cash Return',
                style: const TextStyle(
                  fontSize: 11,
                  color: AppColors.textSecondaryLight,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
        ],
      ),
    );
  }

  /// Builds the Card Issuance timeline card representing the start of this cycle.
  Widget _buildCardIssuedTimelineCard(CardSession session) {
    return Container(
      key: const ValueKey('timeline-card-issued'),
      margin: const EdgeInsets.only(bottom: AppSpacing.sm),
      decoration: BoxDecoration(
        color: AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Padding(
        padding: AppSpacing.paddingMd,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(Icons.credit_card, color: Colors.blue.shade700, size: 20),
            ),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Card Issued',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimaryLight,
                        ),
                      ),
                      const AppBadge(
                        label: 'SESSION START',
                        variant: AppBadgeVariant.neutral,
                      ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    _formatDateTime(session.startedAt),
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppColors.textSecondaryLight,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Issued Card: ${session.displayCardNumber}',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      color: AppColors.textPrimaryLight,
                    ),
                  ),
                  if (session.customerName != null && session.customerName!.isNotEmpty)
                    Text(
                      'Issued to: ${session.customerName}${session.customerPhone != null && session.customerPhone!.isNotEmpty ? " (${session.customerPhone})" : ""}',
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.textSecondaryLight,
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
