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

  final List<String> _types = [
    'All Types',
    'Purchases',
    'Recharges',
    'Refunds',
  ];
  String _selectedType = 'All Types';

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

  DateTime? _parseDateTime(String? raw) {
    if (raw == null || raw.trim().isEmpty) return null;
    try {
      final parsed = DateTime.tryParse(raw.trim());
      if (parsed == null) return null;
      return parsed.toLocal();
    } catch (_) {
      return null;
    }
  }

  bool _isWithinRange(DateTime dt, String range) {
    final localDt = dt.toLocal();
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final targetDate = DateTime(localDt.year, localDt.month, localDt.day);

    switch (range.toLowerCase()) {
      case 'today':
        return targetDate.isAtSameMomentAs(today) || targetDate.isAfter(today);
      case 'yesterday':
        final yesterday = DateTime(today.year, today.month, today.day - 1);
        return targetDate.isAtSameMomentAs(yesterday);
      case 'this week':
        final startOfWeek = DateTime(today.year, today.month, today.day - (today.weekday - 1));
        return !targetDate.isBefore(startOfWeek);
      case 'this month':
        return (localDt.year == now.year && localDt.month == now.month) || targetDate.isAfter(today);
      case 'last 30 days':
        final thirtyDaysAgo = DateTime(today.year, today.month, today.day - 30);
        return !targetDate.isBefore(thirtyDaysAgo);
      case 'all time':
      default:
        return true;
    }
  }

  bool _matchesType(Transaction txn, String selectedType) {
    switch (selectedType.toLowerCase()) {
      case 'purchases':
        return txn.type == TransactionType.purchase;
      case 'recharges':
        return txn.type == TransactionType.recharge;
      case 'refunds':
        return txn.type == TransactionType.refund;
      case 'all types':
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
      if (!_matchesType(txn, _selectedType)) return false;
      if (_selectedRange == 'All Time') return true;
      final dt = _parseDateTime(txn.createdAt);
      if (dt == null) return true;
      return _isWithinRange(dt, _selectedRange);
    }).toList();

    final startedDt = _parseDateTime(session.startedAt);
    final showCardIssued = (_selectedType == 'All Types' || _selectedType == 'Recharges') &&
        (_selectedRange == 'All Time' || (startedDt != null && _isWithinRange(startedDt, _selectedRange)));

    return Scaffold(
      appBar: AppBar(
        title: Text('Wallet ${session.displayCardNumber}'),
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
                    const Icon(Icons.account_balance_wallet_outlined, size: 16, color: AppColors.textSecondaryLight),
                    const SizedBox(width: AppSpacing.xs),
                    Text(
                      'Wallet: ${session.displayCardNumber}',
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
          const SectionHeader(title: 'Transaction History'),
          const SizedBox(height: AppSpacing.xs),

          // Unified Filter Box: Date Range + Transaction Type in ONE single container box
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: AppSpacing.roundedSm,
              border: Border.all(color: AppColors.borderLight),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.02),
                  blurRadius: 3,
                  offset: const Offset(0, 1),
                ),
              ],
            ),
            child: Row(
              children: [
                // Date Range Filter
                const Icon(Icons.calendar_today_outlined, size: 14, color: AppColors.primary),
                const SizedBox(width: 6),
                Expanded(
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: _ranges.contains(_selectedRange) ? _selectedRange : _ranges.first,
                      isDense: true,
                      isExpanded: true,
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
                          child: Text(range, overflow: TextOverflow.ellipsis),
                        );
                      }).toList(),
                    ),
                  ),
                ),

                // Vertical Divider separating Date and Type within the box
                Container(
                  width: 1,
                  height: 20,
                  color: AppColors.borderLight,
                  margin: const EdgeInsets.symmetric(horizontal: 8),
                ),

                // Transaction Type Filter
                const Icon(Icons.tune, size: 14, color: AppColors.primary),
                const SizedBox(width: 6),
                Expanded(
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: _types.contains(_selectedType) ? _selectedType : _types.first,
                      isDense: true,
                      isExpanded: true,
                      icon: const Icon(Icons.arrow_drop_down, size: 18, color: AppColors.primary),
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimaryLight,
                      ),
                      onChanged: (value) {
                        if (value != null) {
                          setState(() {
                            _selectedType = value;
                          });
                        }
                      },
                      items: _types.map((type) {
                        return DropdownMenuItem<String>(
                          value: type,
                          child: Text(type, overflow: TextOverflow.ellipsis),
                        );
                      }).toList(),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.sm),

          // Render Transactions (Purchases, Recharges, Settlement)
          if (filteredTransactions.isNotEmpty)
            ...filteredTransactions.map((txn) => _buildTransactionCard(txn)),

          // Render Card Issuance Base Timeline Event
          if (showCardIssued)
            _buildCardIssuedTimelineCard(session),

          if (filteredTransactions.isEmpty && !showCardIssued) ...[
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
                      _selectedRange == 'All Time' && _selectedType == 'All Types'
                          ? 'No transactions in this card session yet.'
                          : 'No transactions found for $_selectedRange ($_selectedType).',
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
              child: Icon(Icons.account_balance_wallet_outlined, color: Colors.blue.shade700, size: 20),
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
                        'Wallet Issued',
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
                    'Issued Wallet: ${session.displayCardNumber}',
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
