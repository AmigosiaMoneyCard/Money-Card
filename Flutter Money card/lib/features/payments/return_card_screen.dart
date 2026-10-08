import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';
import '../../models/card_session.dart';
import '../../providers/api_providers.dart';
import '../../providers/auth_provider.dart';
import '../../providers/branch_provider.dart';
import '../../providers/card_operations_provider.dart';
import '../../providers/return_card_provider.dart';
import '../../providers/session_operations_provider.dart';
import '../../widgets/common/app_badge.dart';
import '../../widgets/common/app_card.dart';
import '../../widgets/common/app_dialog.dart';
import '../../widgets/dialogs/refund_payment_dialog.dart';
import '../../widgets/receipt/digital_receipt_dialog.dart';
import '../../widgets/states/app_loading_view.dart';

class ReturnCardScreen extends ConsumerStatefulWidget {
  final String sessionId;
  final String? physicalCardNumber;

  const ReturnCardScreen({
    super.key,
    required this.sessionId,
    this.physicalCardNumber,
  });

  @override
  ConsumerState<ReturnCardScreen> createState() => _ReturnCardScreenState();
}

class _ReturnCardScreenState extends ConsumerState<ReturnCardScreen> {
  bool _isRefunding = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(sessionDetailsNotifierProvider.notifier).loadSessionById(widget.sessionId);
      ref.read(returnCardNotifierProvider.notifier).reset();
    });
  }

  Future<void> _handleConfirmReturn(CardSession session) async {
    final currentBranch = ref.read(currentBranchProvider);
    if (currentBranch != null && session.branchId.isNotEmpty && session.branchId != currentBranch.id) {
      await AppDialog.show(
        context,
        title: 'Return Not Allowed at this Kitchen',
        message: 'This wallet was issued at another kitchen. Wallets can only be returned and settled at the kitchen where they were issued.',
        confirmLabel: 'Understood',
      );
      return;
    }

    final returnNotifier = ref.read(returnCardNotifierProvider.notifier);

    final paymentMethod = await RefundPaymentSelectionDialog.show(
      context,
      refundAmount: session.balance,
      title: 'Confirm Wallet Return',
      subtitle: session.balance > 0
          ? 'Refund ₹${session.balance.toStringAsFixed(2)} to customer and settle wallet'
          : 'Settle wallet session and reset to Available',
    );

    if (paymentMethod == null) return;

    final result = await returnNotifier.executeReturn(session.id, paymentMethod: paymentMethod);

    if (result != null && mounted) {
      // Reload card list & sessions list
      ref.read(cardListNotifierProvider.notifier).loadCards();
      ref.read(sessionListNotifierProvider.notifier).loadSessions();

      _showReturnSuccessDialog(result);
    }
  }

  Future<void> _handleReturnWithoutRefund(CardSession session) async {
    final currentBranch = ref.read(currentBranchProvider);
    if (currentBranch != null && session.branchId.isNotEmpty && session.branchId != currentBranch.id) {
      await AppDialog.show(
        context,
        title: 'Return Not Allowed at this Kitchen',
        message: 'This wallet was issued at another kitchen. Wallets can only be returned and settled at the kitchen where they were issued.',
        confirmLabel: 'Understood',
      );
      return;
    }

    final confirmed = await AppDialog.show(
      context,
      title: 'Retain Profit Without Cash Refund',
      message: 'Return physical card and keep remaining balance of ₹${session.balance.toStringAsFixed(2)} as kitchen profit? No cash will be deducted from your drawer.',
      confirmLabel: 'Retain Profit & Return',
      cancelLabel: 'Cancel',
      isDestructive: false,
    );

    if (confirmed != true) return;

    final returnNotifier = ref.read(returnCardNotifierProvider.notifier);
    final result = await returnNotifier.executeReturn(session.id, skipRefund: true);

    if (result != null && mounted) {
      ref.read(cardListNotifierProvider.notifier).loadCards();
      ref.read(sessionListNotifierProvider.notifier).loadSessions();

      _showReturnSuccessDialog(result);
    }
  }

  Future<void> _handleRefundOnly(CardSession session) async {
    final currentBranch = ref.read(currentBranchProvider);
    if (currentBranch != null && session.branchId.isNotEmpty && session.branchId != currentBranch.id) {
      await AppDialog.show(
        context,
        title: 'Refund Not Allowed at this Kitchen',
        message: 'This wallet was issued at another kitchen. Refunds can only be processed at the kitchen where the wallet was issued.',
        confirmLabel: 'Understood',
      );
      return;
    }

    if (session.balance <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No remaining money to refund (Balance: ₹0.00).'),
          backgroundColor: AppColors.info,
        ),
      );
      return;
    }

    final paymentMethod = await RefundPaymentSelectionDialog.show(
      context,
      refundAmount: session.balance,
      title: 'Confirm Balance Refund',
      subtitle: 'Refund ₹${session.balance.toStringAsFixed(2)} to customer',
    );

    if (paymentMethod == null) return;

    setState(() {
      _isRefunding = true;
    });

    try {
      final sessionRepo = ref.read(sessionRepositoryProvider);
      final result = await sessionRepo.refundSession(session.id, paymentMethod: paymentMethod);

      await ref.read(sessionDetailsNotifierProvider.notifier).loadSessionById(widget.sessionId);
      ref.read(cardListNotifierProvider.notifier).loadCards();
      ref.read(sessionListNotifierProvider.notifier).loadSessions();

      if (mounted) {
        setState(() {
          _isRefunding = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Refund of ₹${result.refundedAmount.toStringAsFixed(2)} processed. Wallet remains active.',
            ),
            backgroundColor: AppColors.success,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isRefunding = false;
        });
        final isMismatch = e.toString().contains('RETURN_COUNTER_MISMATCH') ||
            e.toString().contains('where it was issued');
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              isMismatch
                  ? 'This wallet must be returned at the kitchen where it was issued.'
                  : 'Refund failed: $e',
            ),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  void _showReturnSuccessDialog(SessionReturnResult result) {
    final branch = ref.read(currentBranchProvider);
    final user = ref.read(currentUserProvider);
    final session = ref.read(sessionDetailsNotifierProvider).session;

    final rawCard = widget.physicalCardNumber != null ? cleanDisplayCardNumber(widget.physicalCardNumber) : (session?.displayCardNumber ?? 'Card');
    final cleanCard = rawCard.replaceAll('-', '');
    final cardNum = rawCard.toUpperCase().startsWith('MC-')
        ? rawCard
        : (cleanCard.length > 6 ? 'MC-${cleanCard.substring(0, 6).toUpperCase()}' : 'MC-$cleanCard');

    final rawTx = (session?.id ?? widget.sessionId).replaceAll('-', '');
    final shortTxId = rawTx.length > 8 ? rawTx.substring(0, 8).toUpperCase() : rawTx.toUpperCase();

    final bool isRetainedProfit = result.retainedProfit > 0 && result.refundedAmount == 0;
    final effectiveAmount = isRetainedProfit ? result.retainedProfit : result.refundedAmount;

    final itemsList = [
      {
        'name': isRetainedProfit
            ? 'Wallet Return (Retained Profit: ₹${result.retainedProfit.toStringAsFixed(2)})'
            : 'Wallet Return & Balance Refund',
        'quantity': 1,
        'price': effectiveAmount,
        'total': effectiveAmount,
      }
    ];

    DigitalReceiptDialog.show(
      context,
      branchName: branch?.name ?? 'Main Cafeteria',
      transactionId: 'RET-$shortTxId',
      timestamp: DateTime.now(),
      cardIdentifier: cardNum,
      items: itemsList,
      totalAmount: effectiveAmount,
      remainingBalance: 0.0,
      previousBalance: effectiveAmount,
      sessionId: session?.id ?? widget.sessionId,
      staffName: user?.name,
      title: isRetainedProfit ? 'Card Returned (Profit Retained)' : 'Wallet Returned Successfully',
      receiptTitle: isRetainedProfit ? 'RETURN & RETAINED PROFIT' : 'SETTLEMENT RECEIPT',
      paymentMethod: isRetainedProfit ? 'RETAINED PROFIT' : 'CASH REFUND',
      onDone: () {
        ref.read(returnCardNotifierProvider.notifier).reset();
        context.pop(); // Pop return screen
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final sessionState = ref.watch(sessionDetailsNotifierProvider);
    final returnState = ref.watch(returnCardNotifierProvider);
    final session = sessionState.session;

    if (sessionState.isLoading) {
      return const Scaffold(
        body: AppLoadingView(message: 'Loading session details...'),
      );
    }

    if (session == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Return & Refund')),
        body: Center(
          child: Text(
            sessionState.errorMessage ?? 'Session not found.',
            style: const TextStyle(color: AppColors.error),
          ),
        ),
      );
    }

    final isSettled = session.status == SessionStatus.settled;
    final currentBranch = ref.watch(currentBranchProvider);
    final isCounterMismatch = currentBranch != null && session.branchId.isNotEmpty && session.branchId != currentBranch.id;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Return & Refund'),
      ),
      body: SafeArea(
        child: ListView(
          padding: AppSpacing.paddingMd,
          children: [
            if (isCounterMismatch) ...[
              Container(
                padding: AppSpacing.paddingMd,
                margin: const EdgeInsets.only(bottom: AppSpacing.md),
                decoration: BoxDecoration(
                  color: AppColors.warningLight,
                  borderRadius: AppSpacing.roundedSm,
                  border: Border.all(color: AppColors.warning.withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.info_outline, color: AppColors.warning, size: 20),
                    const SizedBox(width: AppSpacing.xs),
                    const Expanded(
                      child: Text(
                        'This wallet was issued at another kitchen. Wallets can only be returned and refunded at the kitchen where they were issued.',
                        style: TextStyle(
                          color: AppColors.textPrimaryLight,
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            // Session Overview Card
            AppCard(
              padding: AppSpacing.paddingLg,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        widget.physicalCardNumber != null ? cleanDisplayCardNumber(widget.physicalCardNumber) : session.displayCardNumber,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      AppBadge(
                        label: session.status.value,
                        variant: isSettled ? AppBadgeVariant.neutral : AppBadgeVariant.success,
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Remaining Balance',
                        style: TextStyle(
                          fontSize: 13,
                          color: AppColors.textSecondaryLight,
                        ),
                      ),
                      Text(
                        '₹${session.balance.toStringAsFixed(2)}',
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          icon: const Icon(Icons.payments_outlined, size: 16),
                          label: const Text('Refund', style: TextStyle(fontWeight: FontWeight.bold)),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: session.balance > 0 && !isCounterMismatch ? AppColors.warning : Colors.grey,
                            side: BorderSide(
                              color: session.balance > 0 && !isCounterMismatch ? AppColors.warning : Colors.grey.shade300,
                            ),
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                          onPressed: isSettled || isCounterMismatch || _isRefunding || returnState.isSubmitting
                              ? null
                              : () => _handleRefundOnly(session),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: ElevatedButton.icon(
                          icon: const Icon(Icons.assignment_return_outlined, size: 16),
                          label: const Text('Return', style: TextStyle(fontWeight: FontWeight.bold)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: isCounterMismatch ? Colors.grey.shade400 : AppColors.error,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            elevation: 0,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                          onPressed: isSettled || isCounterMismatch || _isRefunding || returnState.isSubmitting
                              ? null
                              : () => _handleConfirmReturn(session),
                        ),
                      ),
                    ],
                  ),
                  if (session.balance > 0 && !isSettled) ...[
                    const SizedBox(height: 10),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        icon: const Icon(Icons.savings_outlined, size: 16),
                        label: const Text(
                          'Return Without Refund (Retain Profit)',
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: isCounterMismatch ? Colors.grey : AppColors.success,
                          side: BorderSide(
                            color: isCounterMismatch ? Colors.grey.shade300 : AppColors.success,
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        onPressed: isSettled || isCounterMismatch || _isRefunding || returnState.isSubmitting
                            ? null
                            : () => _handleReturnWithoutRefund(session),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.lg),

            // Error Banner
            if (returnState.errorMessage != null) ...[
              Container(
                padding: AppSpacing.paddingMd,
                decoration: BoxDecoration(
                  color: AppColors.errorLight,
                  borderRadius: AppSpacing.roundedSm,
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline, color: AppColors.error, size: 18),
                    const SizedBox(width: AppSpacing.xs),
                    Expanded(
                      child: Text(
                        returnState.errorMessage!,
                        style: const TextStyle(color: AppColors.error, fontSize: 13),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.md),
            ],
          ],
        ),
      ),
    );
  }
}
