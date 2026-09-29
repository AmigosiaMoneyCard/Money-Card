import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';
import '../../core/utils/formatters.dart';
import '../../models/card_session.dart';
import '../../models/transaction.dart';
import '../../providers/auth_provider.dart';
import '../../providers/branch_provider.dart';
import '../../providers/recharge_provider.dart';
import '../../providers/session_operations_provider.dart';
import '../../providers/card_operations_provider.dart';
import '../../providers/analytics_provider.dart';
import '../../widgets/common/app_button.dart';
import '../../widgets/common/app_card.dart';
import '../../widgets/receipt/digital_receipt_dialog.dart';
import '../../widgets/states/app_loading_view.dart';

class RechargeScreen extends ConsumerStatefulWidget {
  final String sessionId;
  final String? physicalCardNumber;

  const RechargeScreen({
    super.key,
    required this.sessionId,
    this.physicalCardNumber,
  });

  @override
  ConsumerState<RechargeScreen> createState() => _RechargeScreenState();
}

class _RechargeScreenState extends ConsumerState<RechargeScreen> {
  final _amountController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  final List<double> _quickAmounts = [50.0, 100.0, 200.0, 500.0];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(sessionDetailsNotifierProvider.notifier).loadSessionById(widget.sessionId);
      ref.read(rechargeNotifierProvider.notifier).reset();
    });
  }

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  void _onAmountChanged(String val) {
    final parsed = double.tryParse(val.trim()) ?? 0.0;
    ref.read(rechargeNotifierProvider.notifier).setAmount(parsed);
  }

  void _addQuickAmount(double amount) {
    final current = double.tryParse(_amountController.text.trim()) ?? 0.0;
    final total = current + amount;
    _amountController.text = total.toStringAsFixed(0);
    ref.read(rechargeNotifierProvider.notifier).setAmount(total);
  }

  Future<void> _handleConfirmRecharge(CardSession session) async {
    final rechargeState = ref.read(rechargeNotifierProvider);
    final rechargeNotifier = ref.read(rechargeNotifierProvider.notifier);

    if (!_formKey.currentState!.validate() || !rechargeState.canSubmit) {
      return;
    }

    final branch = ref.read(currentBranchProvider);
    final result = await rechargeNotifier.executeRecharge(
      session.id,
      branchId: branch?.id,
    );

    if (result != null && mounted) {
      // Synchronize active sessions, cards registry, available inventory, and analytics
      ref.read(sessionListNotifierProvider.notifier).loadSessions();
      ref.read(cardListNotifierProvider.notifier).loadCards();
      ref.read(availableCardsNotifierProvider.notifier).loadAvailableCards();
      ref.read(analyticsNotifierProvider.notifier).loadAnalytics();

      _showRechargeSuccessDialog(result);
    }
  }

  void _showRechargeSuccessDialog(RechargeResult result) {
    final branch = ref.read(currentBranchProvider);
    final user = ref.read(currentUserProvider);
    final session = ref.read(sessionDetailsNotifierProvider).session;
    final cardNum = widget.physicalCardNumber != null ? cleanDisplayCardNumber(widget.physicalCardNumber) : (session?.displayCardNumber ?? 'Card');
    final rechargeState = ref.read(rechargeNotifierProvider);

    final itemsList = [
      {
        'name': 'Card Balance Recharge (${result.paymentMethod.value})',
        'quantity': 1,
        'price': result.amount,
        'total': result.amount,
      }
    ];

    final rechargeAmt = result.amount > 0 ? result.amount : rechargeState.amount;
    final newBal = result.balance;
    final prevBal = (result.balanceBefore != null && result.balanceBefore! > 0)
        ? result.balanceBefore!
        : ((session?.balance != null && session!.balance > 0)
            ? session.balance
            : (newBal - rechargeAmt).clamp(0.0, double.infinity));

    DigitalReceiptDialog.show(
      context,
      branchName: branch?.name ?? 'Main Cafeteria',
      transactionId: result.transactionId.isNotEmpty
          ? result.transactionId
          : 'RCH-${DateTime.now().millisecondsSinceEpoch}',
      timestamp: DateTime.now(),
      cardIdentifier: cardNum,
      items: itemsList,
      totalAmount: rechargeAmt,
      remainingBalance: newBal,
      previousBalance: prevBal,
      amountDeducted: rechargeAmt,
      subtotal: rechargeAmt,
      sessionId: session?.id ?? widget.sessionId,
      staffName: user?.name,
      title: 'Recharge Successful',
      receiptTitle: 'RECHARGE RECEIPT',
      paymentMethod: result.paymentMethod.value,
      paymentReference: rechargeState.paymentReference,
      onDone: () {
        ref.read(rechargeNotifierProvider.notifier).reset();
        context.pop(); // Return to previous screen
      },
    );
  }

  String _formatDateTime(String? raw) {
    if (raw == null || raw.isEmpty) return '—';
    final formatted = AppFormatters.formatIsoDate(raw);
    return formatted == '-' ? '—' : formatted;
  }

  void _showTopUpHistorySheet(BuildContext context, CardSession session) {
    final allTx = session.transactions ?? [];
    final topUps = allTx.where((t) => t.type == TransactionType.recharge).toList();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetCtx) => Container(
        constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.85),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          children: [
            Container(
              margin: const EdgeInsets.only(top: 10, bottom: 6),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Top-up History',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      Text(
                        'Wallet: ${session.displayCardNumber} • Balance: ₹${session.balance.toStringAsFixed(2)}',
                        style: const TextStyle(fontSize: 13, color: AppColors.primary, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.of(sheetCtx).pop(),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: topUps.isEmpty
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(AppSpacing.lg),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: const [
                            Icon(Icons.history_toggle_off, size: 48, color: AppColors.textTertiaryLight),
                            SizedBox(height: 12),
                            Text(
                              'No top-ups recorded yet',
                              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.textSecondaryLight),
                            ),
                          ],
                        ),
                      ),
                    )
                  : ListView.separated(
                      padding: AppSpacing.paddingMd,
                      itemCount: topUps.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 10),
                      itemBuilder: (ctx, idx) {
                        final t = topUps[idx];
                        final isCash = t.paymentMethod == PaymentMethod.cash;

                        return Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: t.isCancelled ? Colors.grey.shade100 : Colors.white,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: t.isCancelled ? Colors.grey.shade300 : AppColors.borderLight,
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    '+₹${t.amount.toStringAsFixed(2)}',
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                      color: t.isCancelled ? Colors.grey : AppColors.success,
                                      decoration: t.isCancelled ? TextDecoration.lineThrough : null,
                                    ),
                                  ),
                                  if (t.isCancelled)
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: Colors.grey.shade200,
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: const Text('CANCELLED', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey)),
                                    ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Row(
                                    children: [
                                      Icon(isCash ? Icons.payments_outlined : Icons.account_balance_wallet_outlined, size: 14, color: AppColors.textSecondaryLight),
                                      const SizedBox(width: 4),
                                      Text(
                                        isCash ? 'CASH' : 'UPI',
                                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textSecondaryLight),
                                      ),
                                      if (t.paymentReference != null && t.paymentReference!.isNotEmpty) ...[
                                        const SizedBox(width: 6),
                                        Text('(${t.paymentReference})', style: const TextStyle(fontSize: 11, color: AppColors.textTertiaryLight)),
                                      ],
                                    ],
                                  ),
                                  Text(
                                    _formatDateTime(t.createdAt),
                                    style: const TextStyle(fontSize: 11, color: AppColors.textTertiaryLight),
                                  ),
                                ],
                              ),
                              if (t.isCancelled && t.cancellationReason != null) ...[
                                const SizedBox(height: 4),
                                Text(
                                  'Reason: ${t.cancellationReason}',
                                  style: const TextStyle(fontSize: 11, color: Colors.black54, fontStyle: FontStyle.italic),
                                ),
                              ],
                            ],
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final sessionState = ref.watch(sessionDetailsNotifierProvider);
    final rechargeState = ref.watch(rechargeNotifierProvider);
    final rechargeNotifier = ref.read(rechargeNotifierProvider.notifier);
    final session = sessionState.session;

    if (sessionState.isLoading) {
      return const Scaffold(
        body: AppLoadingView(message: 'Loading session details...'),
      );
    }

    if (session == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Recharge Card')),
        body: Center(
          child: Text(
            sessionState.errorMessage ?? 'Session not found.',
            style: const TextStyle(color: AppColors.error),
          ),
        ),
      );
    }

    final newPreviewBalance = session.balance + rechargeState.amount;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Recharge Card Session'),
        actions: [
          TextButton.icon(
            style: TextButton.styleFrom(
              foregroundColor: AppColors.primary,
            ),
            icon: const Icon(Icons.history, size: 20),
            label: const Text('History', style: TextStyle(fontWeight: FontWeight.bold)),
            onPressed: () => _showTopUpHistorySheet(context, session),
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: AppSpacing.paddingMd,
            children: [
              // Payment Method Selector
              const Text(
                'Payment Method',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: AppSpacing.xs),
              SegmentedButton<PaymentMethod>(
                segments: const [
                  ButtonSegment(
                    value: PaymentMethod.cash,
                    label: Text('CASH'),
                    icon: Icon(Icons.payments_outlined),
                  ),
                  ButtonSegment(
                    value: PaymentMethod.upi,
                    label: Text('UPI'),
                    icon: Icon(Icons.account_balance_wallet_outlined),
                  ),
                ],
                selected: {rechargeState.paymentMethod},
                onSelectionChanged: (set) {
                  if (set.isNotEmpty) {
                    rechargeNotifier.setPaymentMethod(set.first);
                  }
                },
              ),
              const SizedBox(height: AppSpacing.lg),



              // Amount Input Field
              const Text(
                'Recharge Amount (₹)',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: AppSpacing.xs),
              TextFormField(
                controller: _amountController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                onChanged: _onAmountChanged,
                decoration: const InputDecoration(
                  hintText: 'Enter amount (e.g. 200)',
                  prefixIcon: Icon(Icons.currency_rupee, size: 20),
                  isDense: true,
                ),
                validator: (val) {
                  if (val == null || val.trim().isEmpty) {
                    return 'Amount is required';
                  }
                  final parsed = double.tryParse(val.trim());
                  if (parsed == null || parsed <= 0) {
                    return 'Amount must be greater than 0';
                  }
                  return null;
                },
              ),
              const SizedBox(height: AppSpacing.sm),

              // Quick Amount Chips
              Wrap(
                spacing: AppSpacing.sm,
                children: _quickAmounts.map((amt) {
                  return ActionChip(
                    label: Text('+₹${amt.toStringAsFixed(0)}'),
                    onPressed: () => _addQuickAmount(amt),
                  );
                }).toList(),
              ),
              const SizedBox(height: AppSpacing.lg),

              // Expected New Balance Preview
              if (rechargeState.amount > 0) ...[
                AppCard(
                  padding: AppSpacing.paddingMd,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Expected New Balance:',
                        style: TextStyle(fontSize: 13, color: AppColors.textSecondaryLight),
                      ),
                      Text(
                        '₹${newPreviewBalance.toStringAsFixed(2)}',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
              ],

              // Error Banner
              if (rechargeState.errorMessage != null) ...[
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
                          rechargeState.errorMessage!,
                          style: const TextStyle(color: AppColors.error, fontSize: 13),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
              ],

              // Submit Button
              AppButton(
                label: 'Recharge Wallet',
                icon: Icons.account_balance_wallet,
                isLoading: rechargeState.isSubmitting,
                onPressed: rechargeState.canSubmit
                    ? () => _handleConfirmRecharge(session)
                    : null,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
