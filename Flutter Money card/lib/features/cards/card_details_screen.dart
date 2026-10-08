import 'package:flutter/services.dart';
import 'package:flutter/material.dart' hide Card;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';
import '../../core/constants/permission_constants.dart';
import '../../models/card.dart';
import '../../models/card_session.dart';
import '../../providers/auth_provider.dart';
import '../../providers/branch_provider.dart';
import '../../providers/card_operations_provider.dart';
import '../../providers/session_operations_provider.dart';
import '../../widgets/common/app_badge.dart';
import '../../widgets/common/app_button.dart';
import '../../widgets/common/app_card.dart';
import '../../widgets/common/app_dialog.dart';
import '../../widgets/common/section_header.dart';
import '../../widgets/guards/permission_guard.dart';
import '../../widgets/states/app_loading_view.dart';
import '../../widgets/scanner/qr_scanner_view.dart';
import '../../providers/api_providers.dart';

class CardDetailsScreen extends ConsumerStatefulWidget {
  final String cardId;
  final Card? initialCard;
  final CardSession? initialSession;

  const CardDetailsScreen({
    super.key,
    required this.cardId,
    this.initialCard,
    this.initialSession,
  });

  @override
  ConsumerState<CardDetailsScreen> createState() => _CardDetailsScreenState();
}

class _CardDetailsScreenState extends ConsumerState<CardDetailsScreen> {
  final _reasonController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (widget.initialCard != null) {
        ref.read(cardDetailsNotifierProvider.notifier).setResolvedCard(
              widget.initialCard!,
              widget.initialSession,
            );
      } else {
        ref.read(cardDetailsNotifierProvider.notifier).loadCardById(widget.cardId);
      }
    });
  }

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }


  AppBadgeVariant _getCardStatusVariant(CardStatus status) {
    switch (status) {
      case CardStatus.available:
        return AppBadgeVariant.primary;
      case CardStatus.active:
        return AppBadgeVariant.success;
      case CardStatus.blocked:
        return AppBadgeVariant.error;
    }
  }

  Future<void> _handleStartSession(Card card) async {
    var branch = ref.read(currentBranchProvider);
    if (branch == null) {
      final branchState = ref.read(branchNotifierProvider);
      if (branchState.assignedBranches.isNotEmpty) {
        branch = branchState.assignedBranches.first;
        ref.read(branchNotifierProvider.notifier).selectBranch(branch);
      }
    }

    if (branch == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select an active counter before activating a card.')),
      );
      return;
    }

    final nameCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    String? phoneError;

    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          scrollable: true,
          insetPadding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 24.0),
          title: Row(
            children: const [
              Icon(Icons.account_balance_wallet_outlined, color: AppColors.primary, size: 22),
              SizedBox(width: 8),
              Expanded(
                child: Text('Confirm Wallet Activation', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          content: Container(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: 8),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceVariantLight,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.borderLight),
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Wallet Number:', style: TextStyle(fontSize: 13, color: AppColors.textSecondaryLight)),
                          Text(
                            card.physicalCardNumber,
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Counter:', style: TextStyle(fontSize: 13, color: AppColors.textSecondaryLight)),
                          Text(branch?.name ?? 'Main Branch', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: const [
                          Text('Starting Balance:', style: TextStyle(fontSize: 13, color: AppColors.textSecondaryLight)),
                          Text(
                            '\u20b90.00',
                            style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary, fontSize: 14),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: nameCtrl,
                  autofocus: true,
                  textInputAction: TextInputAction.next,
                  scrollPadding: const EdgeInsets.only(bottom: 140),
                  decoration: const InputDecoration(
                    labelText: 'Customer Name (Optional)',
                    hintText: 'e.g. John Doe',
                    prefixIcon: Icon(Icons.person_outline, size: 18),
                    isDense: true,
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: phoneCtrl,
                  keyboardType: TextInputType.number,
                  textInputAction: TextInputAction.done,
                  scrollPadding: const EdgeInsets.only(bottom: 140),
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(10),
                  ],
                  onChanged: (val) {
                    if (phoneError != null) {
                      setDialogState(() {
                        phoneError = null;
                      });
                    }
                  },
                  decoration: InputDecoration(
                    labelText: 'Phone Number (Optional, 10 Digits)',
                    hintText: 'e.g. 9876543210',
                    prefixIcon: const Icon(Icons.phone_outlined, size: 18),
                    errorText: phoneError,
                    counterText: '',
                    isDense: true,
                    border: const OutlineInputBorder(),
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () {
                final phone = phoneCtrl.text.trim();

                if (phone.isNotEmpty && phone.length != 10) {
                  setDialogState(() {
                    phoneError = 'Phone number must be exactly 10 digits';
                  });
                  return;
                }

                Navigator.of(context).pop(true);
              },
              child: const Text('Confirm & Activate'),
            ),
          ],
        ),
      ),
    );

    if (confirm != true) return;

    final customerNameVal = nameCtrl.text.trim();
    final session = await ref.read(sessionDetailsNotifierProvider.notifier).createSession(
          cardId: card.id,
          branchId: branch.id,
          customerName: customerNameVal,
          customerPhone: phoneCtrl.text.trim(),
        );

    if (session != null && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Active session created successfully!'),
          backgroundColor: AppColors.success,
        ),
      );
      // Reload card and card lists
      ref.read(cardDetailsNotifierProvider.notifier).setResolvedCard(
            card.copyWith(status: CardStatus.active),
            session,
          );
      ref.read(cardListNotifierProvider.notifier).loadCards();
      ref.read(availableCardsNotifierProvider.notifier).loadAvailableCards();
    }
  }

  Future<void> _handleBlockCard() async {
    final currentUser = ref.read(currentUserProvider);
    final blockerName = currentUser?.name ?? 'Staff';

    String selectedReason = 'Lost or Stolen Wallet';
    final additionalReasonCtrl = TextEditingController();

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (dialogCtx, setDialogState) => AlertDialog(
          scrollable: true,
          shape: const RoundedRectangleBorder(borderRadius: AppSpacing.roundedLg),
          title: Row(
            children: const [
              Icon(Icons.block, color: AppColors.error, size: 24),
              SizedBox(width: AppSpacing.xs),
              Text('Block Wallet', style: TextStyle(fontWeight: FontWeight.bold)),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Are you sure you want to block this wallet? It will be disabled for purchases.',
                style: TextStyle(fontSize: 13, color: AppColors.textSecondaryLight),
              ),
              const SizedBox(height: AppSpacing.md),
              const Text(
                'Reason',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textPrimaryLight),
              ),
              const SizedBox(height: 6),
              DropdownButtonFormField<String>(
                initialValue: selectedReason,
                decoration: InputDecoration(
                  isDense: true,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                ),
                items: const [
                  DropdownMenuItem(value: 'Lost or Stolen Wallet', child: Text('Lost or Stolen Wallet', style: TextStyle(fontSize: 13))),
                  DropdownMenuItem(value: 'Damaged / Hardware Failure', child: Text('Damaged Card', style: TextStyle(fontSize: 13))),
                  DropdownMenuItem(value: 'Suspicious Activity / Fraud', child: Text('Suspicious Activity / Fraud', style: TextStyle(fontSize: 13))),
                  DropdownMenuItem(value: 'Customer Request', child: Text('Customer Request', style: TextStyle(fontSize: 13))),
                  DropdownMenuItem(value: 'Staff Discretion', child: Text('Staff Discretion', style: TextStyle(fontSize: 13))),
                  DropdownMenuItem(value: 'Other Reason', child: Text('Other Reason', style: TextStyle(fontSize: 13))),
                ],
                onChanged: (val) {
                  if (val != null) {
                    setDialogState(() {
                      selectedReason = val;
                    });
                  }
                },
              ),
              if (selectedReason == 'Other Reason') ...[
                const SizedBox(height: AppSpacing.sm),
                TextField(
                  controller: additionalReasonCtrl,
                  decoration: InputDecoration(
                    hintText: 'Specify reason...',
                    hintStyle: const TextStyle(fontSize: 12),
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
              ],
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.error,
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: () => Navigator.of(ctx).pop(true),
              child: const Text('Block Wallet'),
            ),
          ],
        ),
      ),
    );

    if (confirm == true) {
      final additional = additionalReasonCtrl.text.trim();
      final combinedReason = additional.isNotEmpty
          ? 'Blocked by $blockerName - $selectedReason: $additional'
          : 'Blocked by $blockerName - $selectedReason';

      final success = await ref.read(cardDetailsNotifierProvider.notifier).blockCard(
            reason: combinedReason,
          );
      if (success && mounted) {
        ref.read(cardListNotifierProvider.notifier).loadCards();
        ref.read(availableCardsNotifierProvider.notifier).loadAvailableCards();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Wallet has been blocked: $combinedReason'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  Future<void> _handleUnblockCard() async {
    final confirm = await AppDialog.show(
      context,
      title: 'Unblock Wallet',
      message: 'Unblocking this wallet will make it available for transactions again.',
      confirmLabel: 'Unblock',
    );

    if (confirm == true) {
      final success = await ref.read(cardDetailsNotifierProvider.notifier).unblockCard();
      if (success && mounted) {
        ref.read(cardListNotifierProvider.notifier).loadCards();
        ref.read(availableCardsNotifierProvider.notifier).loadAvailableCards();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Wallet unblocked successfully.'),
            backgroundColor: AppColors.success,
          ),
        );
      }
    }
  }

  Future<void> _handleResolveBlockedCard(Card card, CardSession? activeSession) async {
    final lockedBalance = activeSession?.balance ?? 0.0;
    final cardIdentifier = card.physicalCardNumber.isNotEmpty ? card.physicalCardNumber : card.qrToken;
    final newCardController = TextEditingController();
    String selectedMode = 'REPLACE'; // 'REPLACE' or 'REFUND'
    String selectedPaymentMethod = 'CASH'; // 'CASH' or 'UPI'
    String? localError;
    bool isSubmitting = false;

    await showDialog(
      context: context,
      barrierDismissible: !isSubmitting,
      builder: (dialogCtx) => StatefulBuilder(
        builder: (ctx, setDialogState) {
          return AlertDialog(
            scrollable: true,
            shape: const RoundedRectangleBorder(borderRadius: AppSpacing.roundedLg),
            title: Row(
              children: [
                const Icon(Icons.published_with_changes, color: AppColors.primary, size: 22),
                const SizedBox(width: AppSpacing.xs),
                Expanded(
                  child: Text(
                    'Resolve Blocked: $cardIdentifier',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            content: Container(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Locked Balance Banner
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceVariantLight,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppColors.borderLight),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'LOCKED WALLET BALANCE',
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.textSecondaryLight),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '₹${lockedBalance.toStringAsFixed(2)}',
                          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppColors.primary),
                        ),
                        if (activeSession?.customerName != null && activeSession!.customerName!.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(
                            'Customer: ${activeSession.customerName} ${activeSession.customerPhone != null ? "(${activeSession.customerPhone})" : ""}',
                            style: const TextStyle(fontSize: 11, color: AppColors.textSecondaryLight),
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),

                  // Mode Selector Tabs (Green: Replace, Blue: Refund)
                  Row(
                    children: [
                      // Green: Replace Card & Transfer
                      Expanded(
                        child: InkWell(
                          onTap: () {
                            setDialogState(() {
                              selectedMode = 'REPLACE';
                              localError = null;
                            });
                          },
                          borderRadius: BorderRadius.circular(8),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 6),
                            decoration: BoxDecoration(
                              color: selectedMode == 'REPLACE' ? AppColors.success.withValues(alpha: 0.12) : AppColors.surfaceVariantLight,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: selectedMode == 'REPLACE' ? AppColors.success : AppColors.borderLight,
                                width: selectedMode == 'REPLACE' ? 2 : 1,
                              ),
                            ),
                            child: Column(
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(Icons.swap_horiz, size: 16, color: selectedMode == 'REPLACE' ? AppColors.success : AppColors.textSecondaryLight),
                                    const SizedBox(width: 4),
                                    Text(
                                      'Replace Card',
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.bold,
                                        color: selectedMode == 'REPLACE' ? AppColors.success : AppColors.textSecondaryLight,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 2),
                                const Text('Migrate Balance', style: TextStyle(fontSize: 9, color: AppColors.textSecondaryLight)),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),

                      // Blue: Cash Refund & Settle
                      Expanded(
                        child: InkWell(
                          onTap: () {
                            setDialogState(() {
                              selectedMode = 'REFUND';
                              localError = null;
                            });
                          },
                          borderRadius: BorderRadius.circular(8),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 6),
                            decoration: BoxDecoration(
                              color: selectedMode == 'REFUND' ? Colors.blue.withValues(alpha: 0.12) : AppColors.surfaceVariantLight,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: selectedMode == 'REFUND' ? Colors.blue : AppColors.borderLight,
                                width: selectedMode == 'REFUND' ? 2 : 1,
                              ),
                            ),
                            child: Column(
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(Icons.payments_outlined, size: 16, color: selectedMode == 'REFUND' ? Colors.blue : AppColors.textSecondaryLight),
                                    const SizedBox(width: 4),
                                    Text(
                                      'Cash Refund',
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.bold,
                                        color: selectedMode == 'REFUND' ? Colors.blue : AppColors.textSecondaryLight,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 2),
                                const Text('Settle & Close', style: TextStyle(fontSize: 9, color: AppColors.textSecondaryLight)),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.md),

                  // Mode A Content: Replace Card & Scan QR / Enter Card
                  if (selectedMode == 'REPLACE') ...[
                    const Text('New Replacement Card', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 6),
                    TextField(
                      controller: newCardController,
                      decoration: InputDecoration(
                        hintText: 'Enter new card # or scan QR',
                        hintStyle: const TextStyle(fontSize: 12),
                        isDense: true,
                        prefixIcon: const Icon(Icons.credit_card, size: 18),
                        suffixIcon: IconButton(
                          icon: const Icon(Icons.qr_code_scanner, color: AppColors.primary),
                          tooltip: 'Scan QR Code with Camera',
                          onPressed: () async {
                            final scanned = await Navigator.of(context).push<String>(
                              MaterialPageRoute(
                                builder: (scanCtx) => Scaffold(
                                  appBar: AppBar(title: const Text('Scan Replacement Card')),
                                  body: QrScannerView(
                                    title: 'Scan Replacement Card',
                                    prompt: 'Point camera at new physical card QR code',
                                    onQrScanned: (token) {
                                      Navigator.of(scanCtx).pop(token);
                                    },
                                  ),
                                ),
                              ),
                            );
                            if (scanned != null && scanned.isNotEmpty) {
                              setDialogState(() {
                                newCardController.text = scanned.trim();
                              });
                            }
                          },
                        ),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Scan camera QR or type card number. New cards will auto-register on the fly.',
                      style: TextStyle(fontSize: 10, color: AppColors.textSecondaryLight),
                    ),
                  ],

                  // Mode B Content: Cash Refund
                  if (selectedMode == 'REFUND') ...[
                    const Text('Payout Method', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            style: OutlinedButton.styleFrom(
                              backgroundColor: selectedPaymentMethod == 'CASH' ? Colors.blue.withValues(alpha: 0.1) : null,
                              side: BorderSide(color: selectedPaymentMethod == 'CASH' ? Colors.blue : AppColors.borderLight),
                            ),
                            onPressed: () => setDialogState(() => selectedPaymentMethod = 'CASH'),
                            child: const Text('Cash', style: TextStyle(fontSize: 12)),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: OutlinedButton(
                            style: OutlinedButton.styleFrom(
                              backgroundColor: selectedPaymentMethod == 'UPI' ? Colors.purple.withValues(alpha: 0.1) : null,
                              side: BorderSide(color: selectedPaymentMethod == 'UPI' ? Colors.purple : AppColors.borderLight),
                            ),
                            onPressed: () => setDialogState(() => selectedPaymentMethod = 'UPI'),
                            child: const Text('UPI', style: TextStyle(fontSize: 12)),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Pay ₹${lockedBalance.toStringAsFixed(2)} back to customer from drawer and close wallet.',
                      style: const TextStyle(fontSize: 10, color: AppColors.textSecondaryLight),
                    ),
                  ],

                  // Error Display
                  if (localError != null) ...[
                    const SizedBox(height: 8),
                    Text(localError!, style: const TextStyle(color: AppColors.error, fontSize: 11)),
                  ],
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: isSubmitting ? null : () => Navigator.of(ctx).pop(),
                child: const Text('Cancel'),
              ),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: selectedMode == 'REPLACE' ? AppColors.success : Colors.blue,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                onPressed: isSubmitting
                    ? null
                    : () async {
                        if (selectedMode == 'REPLACE') {
                          final targetCard = newCardController.text.trim();
                          if (targetCard.isEmpty) {
                            setDialogState(() {
                              localError = 'Please scan or enter a new card number.';
                            });
                            return;
                          }
                          setDialogState(() {
                            isSubmitting = true;
                            localError = null;
                          });
                          final success = await ref
                              .read(cardDetailsNotifierProvider.notifier)
                              .replaceCard(targetCardId: targetCard);
                          if (success && mounted) {
                            Navigator.of(ctx).pop();
                            ref.read(cardListNotifierProvider.notifier).loadCards();
                            ref.read(availableCardsNotifierProvider.notifier).loadAvailableCards();
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('Card replaced! ₹${lockedBalance.toStringAsFixed(2)} migrated to $targetCard.'),
                                backgroundColor: AppColors.success,
                              ),
                            );
                            ref.read(cardDetailsNotifierProvider.notifier).loadCardById(card.id);
                          } else if (mounted) {
                            setDialogState(() {
                              isSubmitting = false;
                              localError = ref.read(cardDetailsNotifierProvider).errorMessage ?? 'Failed to replace card';
                            });
                          }
                        } else {
                          // REFUND
                          if (activeSession == null) {
                            setDialogState(() {
                              localError = 'No active session found to refund.';
                            });
                            return;
                          }
                          setDialogState(() {
                            isSubmitting = true;
                            localError = null;
                          });
                          try {
                            final sessionRepo = ref.read(sessionRepositoryProvider);
                            await sessionRepo.returnSession(
                              activeSession.id,
                              paymentMethod: selectedPaymentMethod,
                            );
                            if (mounted) {
                              Navigator.of(ctx).pop();
                              ref.read(cardListNotifierProvider.notifier).loadCards();
                              ref.read(availableCardsNotifierProvider.notifier).loadAvailableCards();
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('Refunded ₹${lockedBalance.toStringAsFixed(2)} via $selectedPaymentMethod. Session closed.'),
                                  backgroundColor: Colors.blue,
                                ),
                              );
                              ref.read(cardDetailsNotifierProvider.notifier).loadCardById(card.id);
                            }
                          } catch (e: any) {
                            if (mounted) {
                              setDialogState(() {
                                isSubmitting = false;
                                localError = e.toString();
                              });
                            }
                          }
                        }
                      },
                child: isSubmitting
                    ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : Text(selectedMode == 'REPLACE' ? 'Transfer & Issue' : 'Refund & Close'),
              ),
            ],
          );
        },
      ),
    );
  }


  @override
  Widget build(BuildContext context) {
    final cardState = ref.watch(cardDetailsNotifierProvider);
    final card = cardState.card;
    final activeSession = cardState.activeSession;

    if (cardState.isLoading) {
      return const Scaffold(
        body: AppLoadingView(message: 'Loading wallet details...'),
      );
    }

    if (card == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Wallet Details')),
        body: Center(
          child: Text(
            cardState.errorMessage ?? 'Wallet not found.',
            style: const TextStyle(color: AppColors.error),
          ),
        ),
      );
    }

    final isAvailable = card.status == CardStatus.available;
    final isActive = card.status == CardStatus.active;
    final isBlocked = card.status == CardStatus.blocked;

    return Scaffold(
      appBar: AppBar(
        title: Text('Wallet ${card.physicalCardNumber}'),
      ),
      body: ListView(
        padding: AppSpacing.paddingMd,
        children: [
          // Unified Minimal Wallet & Session Card
          AppCard(
            padding: AppSpacing.paddingMd,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Text(
                          card.physicalCardNumber,
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.5,
                          ),
                        ),
                        if (isActive && activeSession != null && activeSession.cycleNumber != null) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(4),
                              border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
                            ),
                            child: Text(
                              'Cycle ${activeSession.cycleNumber}',
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: AppColors.primary,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    AppBadge(
                      label: card.status.value,
                      variant: _getCardStatusVariant(card.status),
                    ),
                  ],
                ),
                if (isActive && activeSession != null) ...[
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Current Balance',
                            style: TextStyle(
                              fontSize: 12,
                              color: AppColors.textSecondaryLight,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '₹${activeSession.balance.toStringAsFixed(2)}',
                            style: const TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                              color: AppColors.primary,
                            ),
                          ),
                        ],
                      ),
                      if (activeSession.customerName != null && activeSession.customerName!.isNotEmpty)
                        Text(
                          'Customer: ${activeSession.customerName}',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                            color: AppColors.textSecondaryLight,
                          ),
                        ),
                    ],
                  ),
                ],
                if (isBlocked) ...[
                  const SizedBox(height: AppSpacing.sm),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: AppColors.errorLight,
                      borderRadius: AppSpacing.roundedSm,
                      border: Border.all(color: AppColors.error.withValues(alpha: 0.3)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.block, size: 14, color: AppColors.error),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            card.blockedReason != null && card.blockedReason!.isNotEmpty
                                ? 'Blocked: ${card.blockedReason}'
                                : 'Wallet is Blocked',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              color: AppColors.error,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.md),

          // Actions Section
          const SectionHeader(title: 'Wallet Actions'),
          const SizedBox(height: AppSpacing.sm),

          // Start Session Action (when available)
          if (isAvailable)
            PermissionGuard.single(
              permission: AppPermission.cardIssue,
              child: AppButton(
                label: 'Start Active Session',
                icon: Icons.play_arrow,
                isLoading: cardState.isSubmitting,
                onPressed: cardState.isSubmitting ? null : () => _handleStartSession(card),
              ),
            ),

          // POS Purchase & Recharge Actions (when active)
          if (isActive && activeSession != null) ...[
            PermissionGuard.single(
              permission: AppPermission.recharge,
              child: AppButton(
                label: 'Recharge',
                icon: Icons.add_card,
                onPressed: () => context.push(
                  '/app/recharge/${activeSession.id}?card=${card.physicalCardNumber}',
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            PermissionGuard.single(
              permission: AppPermission.purchase,
              child: AppOutlinedButton(
                label: 'Billing',
                icon: Icons.point_of_sale,
                onPressed: () => context.push('/app/pos/${activeSession.id}'),
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            PermissionGuard.single(
              permission: AppPermission.cardReturn,
              child: AppOutlinedButton(
                label: 'Return & Refund',
                icon: Icons.assignment_return_outlined,
                onPressed: () => context.push(
                  '/app/return/${activeSession.id}?card=${card.physicalCardNumber}',
                ),
              ),
            ),
          ],

          // Block / Unblock Actions
          if (isBlocked) ...[
            if (activeSession != null && activeSession.balance > 0) ...[
              const SizedBox(height: AppSpacing.sm),
              PermissionGuard.single(
                permission: AppPermission.cardIssue,
                child: AppButton(
                  label: 'Replace Card / Refund',
                  icon: Icons.published_with_changes,
                  backgroundColor: AppColors.primary,
                  isLoading: cardState.isSubmitting,
                  onPressed: cardState.isSubmitting ? null : () => _handleResolveBlockedCard(card, activeSession),
                ),
              ),
            ],
            const SizedBox(height: AppSpacing.sm),
            PermissionGuard.single(
              permission: AppPermission.cardUnblock,
              child: AppOutlinedButton(
                label: 'Unblock Wallet',
                icon: Icons.lock_open,
                isLoading: cardState.isSubmitting,
                onPressed: cardState.isSubmitting ? null : _handleUnblockCard,
              ),
            ),
          ] else ...[
            const SizedBox(height: AppSpacing.sm),
            PermissionGuard.single(
              permission: AppPermission.cardBlock,
              child: AppOutlinedButton(
                label: 'Block Wallet',
                icon: Icons.block,
                textColor: AppColors.error,
                borderColor: AppColors.error,
                onPressed: cardState.isSubmitting ? null : _handleBlockCard,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
