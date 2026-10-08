import 'package:flutter/services.dart';
import 'package:flutter/material.dart' hide Card;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/config/app_config.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';
import '../../core/constants/permission_constants.dart';
import '../../core/errors/api_exception.dart';
import '../../models/card.dart';
import '../../models/card_session.dart';
import '../../models/product.dart';
import '../../models/transaction.dart';
import '../../providers/analytics_provider.dart';
import '../../providers/api_providers.dart';
import '../../providers/kitchen_orders_provider.dart';
import '../../providers/branch_provider.dart';
import '../../providers/card_operations_provider.dart';
import '../../providers/permission_provider.dart';
import '../../providers/pos_cart_provider.dart';
import '../../providers/session_operations_provider.dart';
import '../../widgets/common/app_badge.dart';
import '../../widgets/common/app_button.dart';
import '../../widgets/common/app_card.dart';
import '../../widgets/common/app_dialog.dart';
import '../../widgets/common/section_header.dart';
import '../../widgets/dialogs/refund_payment_dialog.dart';
import '../../widgets/scanner/qr_scanner_view.dart';
import '../../widgets/states/app_loading_view.dart';
import '../../core/utils/formatters.dart';

class PosScanPurchaseScreen extends ConsumerStatefulWidget {
  const PosScanPurchaseScreen({super.key});

  @override
  ConsumerState<PosScanPurchaseScreen> createState() => _PosScanPurchaseScreenState();
}

class _PosScanPurchaseScreenState extends ConsumerState<PosScanPurchaseScreen> {
  // Resolution state
  String? _scannedQrToken;
  bool _isResolving = false;
  Card? _resolvedCard;
  CardSession? _activeSession;

  // Settlement success state
  SessionReturnResult? _settlementResult;

  @override
  void initState() {
    super.initState();
  }

  void _resetScan() {
    setState(() {
      _scannedQrToken = null;
      _isResolving = false;
      _resolvedCard = null;
      _activeSession = null;
      _settlementResult = null;
    });
  }

  Future<void> _handleQrScanned(String qrToken) async {
    debugPrint('SCANNED QR RAW VALUE: $qrToken');
    if (_isResolving || qrToken == _scannedQrToken) return;

    setState(() {
      _scannedQrToken = qrToken;
      _isResolving = true;
      _resolvedCard = null;
      _activeSession = null;
      _settlementResult = null;
    });

    try {
      final cardRepo = ref.read(cardRepositoryProvider);
      final result = await cardRepo.resolveCardByQr(qrToken);

      if (!mounted) return;

      // Tactile haptic feedback on successful card scan
      HapticFeedback.mediumImpact();

      // ─── Available Card Detected: Prompt for Customer Details Before Issuing ───
      if (result.card.status == CardStatus.available ||
          (result.session == null && result.card.status != CardStatus.blocked)) {
        var branch = ref.read(currentBranchProvider);
        if (branch == null) {
          final branchState = ref.read(branchNotifierProvider);
          if (branchState.assignedBranches.isNotEmpty) {
            branch = branchState.assignedBranches.first;
            ref.read(branchNotifierProvider.notifier).selectBranch(branch);
          }
        }

        if (branch != null) {
          setState(() {
            _isResolving = false;
          });

          final nameCtrl = TextEditingController();
          final phoneCtrl = TextEditingController();
          String? phoneError;

          final confirm = await showDialog<bool>(
            context: context,
            barrierDismissible: false,
            builder: (context) => StatefulBuilder(
              builder: (ctx, setDialogState) => AlertDialog(
                scrollable: true,
                insetPadding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 24.0),
                title: Row(
                  children: const [
                    Icon(Icons.credit_card, color: AppColors.primary, size: 22),
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
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Wallet Number:', style: TextStyle(fontSize: 13, color: AppColors.textSecondaryLight)),
                            Text(
                              result.card.displayCardNumber,
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
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
                          if (phoneError != null) setDialogState(() => phoneError = null);
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

          if (confirm != true) {
            if (!mounted) return;
            setState(() {
              _isResolving = false;
              _scannedQrToken = null;
            });
            return;
          }

          final sessionRepo = ref.read(sessionRepositoryProvider);
          final customerNameVal = nameCtrl.text.trim();
          final newSession = await sessionRepo.createSession(
            cardId: result.card.id,
            branchId: branch.id,
            customerName: customerNameVal,
            customerPhone: phoneCtrl.text.trim(),
          );

          final activeCard = result.card.copyWith(
            status: CardStatus.active,
            currentBranchId: branch.id,
          );

          if (!mounted) return;

          setState(() {
            _isResolving = false;
            _resolvedCard = activeCard;
            _activeSession = newSession;
          });

          ref.read(availableCardsNotifierProvider.notifier).loadAvailableCards();
          ref.read(cardListNotifierProvider.notifier).loadCards();
          ref.read(sessionListNotifierProvider.notifier).loadSessions();
          ref.read(sessionDetailsNotifierProvider.notifier).loadSessionById(newSession.id);

          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  const Icon(Icons.check_circle, color: Colors.white, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Wallet ${activeCard.displayCardNumber} activated successfully!',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
              backgroundColor: AppColors.success,
              duration: const Duration(seconds: 2),
            ),
          );
          return;
        }
      }

      setState(() {
        _isResolving = false;
        _resolvedCard = result.card;
        _activeSession = result.session;
      });

      if (result.session != null) {
        ref.read(sessionDetailsNotifierProvider.notifier).loadSessionById(result.session!.id);
        _refreshSession();
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isResolving = false;
        _scannedQrToken = null;
      });
      final errorMsg = e is ApiException
          ? e.message
          : e.toString().replaceAll('ApiException: ', '').replaceAll('Exception: ', '');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.error_outline, color: Colors.white, size: 20),
              const SizedBox(width: 8),
              Expanded(child: Text(errorMsg)),
            ],
          ),
          backgroundColor: AppColors.error,
          behavior: SnackBarBehavior.floating,
          duration: const Duration(seconds: 3),
        ),
      );
    }
  }

  Future<void> _refreshSession() async {
    final sessionId = _activeSession?.id;
    if (sessionId == null) return;

    try {
      final sessionRepo = ref.read(sessionRepositoryProvider);
      final updatedSession = await sessionRepo.getSessionById(sessionId);

      if (mounted) {
        setState(() {
          _activeSession = updatedSession;
        });
        ref.read(sessionListNotifierProvider.notifier).loadSessions();
      }
    } catch (_) {
      // Ignore background refresh errors
    }
  }

  String _formatDateTime(String? raw) {
    if (raw == null || raw.isEmpty) return '—';
    final formatted = AppFormatters.formatIsoDate(raw);
    return formatted == '-' ? '—' : formatted;
  }

  // ==========================================
  // ACTION HANDLERS
  // ==========================================

  Future<void> _openAddProducts() async {
    final session = _activeSession;
    if (session == null) return;

    if (GoRouter.maybeOf(context) != null) {
      await context.push('/app/pos/${session.id}');
    }
    await _refreshSession();
    ref.read(analyticsNotifierProvider.notifier).loadAnalytics();
  }

  Future<void> _openRecharge() async {
    final session = _activeSession;
    if (session == null) return;

    if (GoRouter.maybeOf(context) != null) {
      await context.push('/app/recharge/${session.id}');
    }
    await _refreshSession();
    ref.read(analyticsNotifierProvider.notifier).loadAnalytics();
  }

  Future<void> _handleSettleReturn() async {
    final session = _activeSession;
    final card = _resolvedCard;
    if (session == null || card == null) return;

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

    final paymentMethod = await RefundPaymentSelectionDialog.show(
      context,
      refundAmount: session.balance,
      title: 'Confirm Wallet Return & Settlement',
      subtitle: session.balance > 0
          ? 'Refund remaining balance of ₹${session.balance.toStringAsFixed(2)} to customer and settle wallet'
          : 'Settle wallet session and reset to Available',
    );

    if (paymentMethod == null) return;

    setState(() {
      _isResolving = true;
    });

    try {
      final sessionRepo = ref.read(sessionRepositoryProvider);
      final result = await sessionRepo.returnSession(session.id, paymentMethod: paymentMethod);

      // Refresh global stores
      ref.read(sessionListNotifierProvider.notifier).loadSessions();
      ref.read(cardListNotifierProvider.notifier).loadCards();
      ref.read(analyticsNotifierProvider.notifier).loadAnalytics();

      if (mounted) {
        setState(() {
          _isResolving = false;
          _settlementResult = result;
          _activeSession = _activeSession?.copyWith(
            status: SessionStatus.settled,
            balance: 0.0,
          );
          _resolvedCard = _resolvedCard?.copyWith(
            status: CardStatus.available,
          );
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isResolving = false;
        });
        final isMismatch = e.toString().contains('RETURN_COUNTER_MISMATCH') ||
            e.toString().contains('where it was issued');
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              isMismatch
                  ? 'This wallet must be returned at the kitchen where it was issued.'
                  : 'Settlement failed: $e',
            ),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  // ==========================================
  // BUILD METHOD
  // ==========================================

  @override
  Widget build(BuildContext context) {
    // 1. Settlement Success State
    if (_settlementResult != null && _resolvedCard != null) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Wallet Return & Settlement'),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () {
              if (GoRouter.maybeOf(context) != null) {
                context.go('/app/home');
              } else {
                Navigator.of(context).maybePop();
              }
            },
          ),
        ),
        body: Center(
          child: Padding(
            padding: AppSpacing.paddingLg,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  decoration: BoxDecoration(
                    color: AppColors.successLight,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.check_circle, size: 54, color: AppColors.success),
                ),
                const SizedBox(height: AppSpacing.md),
                Text(
                  '${_resolvedCard!.displayCardNumber.toUpperCase().startsWith("MC-") ? _resolvedCard!.displayCardNumber : "MC-${_resolvedCard!.displayCardNumber}"} Returned Successfully',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimaryLight,
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                AppButton(
                  label: 'Scan Another Wallet',
                  icon: Icons.qr_code_scanner,
                  onPressed: _resetScan,
                ),
                const SizedBox(height: AppSpacing.sm),
                AppOutlinedButton(
                  label: 'Back to Home',
                  icon: Icons.home_outlined,
                  onPressed: () {
                    if (GoRouter.maybeOf(context) != null) {
                      context.go('/app/home');
                    } else {
                      Navigator.of(context).maybePop();
                    }
                  },
                ),
              ],
            ),
          ),
        ),
      );
    }

    // 2. Card Resolved but BLOCKED
    if (_resolvedCard != null && _resolvedCard!.status == CardStatus.blocked) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Scan QR Wallet'),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => context.pop(),
          ),
        ),
        body: Padding(
          padding: AppSpacing.paddingLg,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  color: AppColors.errorLight,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.block, size: 48, color: AppColors.error),
              ),
              const SizedBox(height: AppSpacing.md),
              Text(
                _resolvedCard!.displayCardNumber,
                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: AppSpacing.xs),
              const AppBadge(
                label: 'BLOCKED',
                variant: AppBadgeVariant.error,
              ),
              const SizedBox(height: AppSpacing.md),
              const Text(
                'Cannot perform operations on a blocked wallet. This wallet is blocked and cannot be used. Please contact your manager.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: AppColors.error,
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              Row(
                children: [
                  Expanded(
                    child: AppOutlinedButton(
                      label: 'Cancel',
                      icon: Icons.close,
                      onPressed: () => context.pop(),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: AppButton(
                      label: 'Scan Another',
                      icon: Icons.qr_code_scanner,
                      onPressed: _resetScan,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      );
    }

    // 4. Card Resolved but AVAILABLE (No Active Session)
    if (_resolvedCard != null && (_activeSession == null || _activeSession!.status != SessionStatus.active)) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Scan QR Wallet'),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => context.pop(),
          ),
        ),
        body: Padding(
          padding: AppSpacing.paddingLg,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  color: AppColors.warningLight.withValues(alpha: 0.2),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.info_outline, size: 48, color: AppColors.warning),
              ),
              const SizedBox(height: AppSpacing.md),
              Text(
                _resolvedCard!.displayCardNumber,
                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: AppSpacing.xs),
              const AppBadge(
                label: 'AVAILABLE',
                variant: AppBadgeVariant.primary,
              ),
              const SizedBox(height: AppSpacing.md),
              const Text(
                'Wallet has no active session.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimaryLight,
                ),
              ),
              const SizedBox(height: 4),
              const Text(
                'A wallet session must be issued before making purchases or recharging.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 13,
                  color: AppColors.textSecondaryLight,
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              AppButton(
                label: 'Issue Wallet Session First',
                icon: Icons.add_card,
                onPressed: () {
                  context.pushReplacement(
                    '/app/cards/issue',
                  );
                },
              ),
              const SizedBox(height: AppSpacing.sm),
              AppOutlinedButton(
                label: 'Scan Another Wallet',
                icon: Icons.qr_code_scanner,
                onPressed: _resetScan,
              ),
            ],
          ),
        ),
      );
    }

    // 5. Card Resolved & Active Session Exists -> SHOW ACTIVE CARD ACTION HUB!
    if (_resolvedCard != null && _activeSession != null) {
      return _buildActiveCardActionHub();
    }

    // 6. Default: Live Camera Scanner View
    return Scaffold(
      body: Stack(
        children: [
          QrScannerView(
            title: 'Scan QR Wallet',
            prompt: 'Point camera at customer\'s wallet QR code',
            onQrScanned: _handleQrScanned,
            isProcessing: _isResolving,
          ),
          if (AppConfig.useMockApi)
            Positioned(
              top: 16,
              left: 16,
              right: 16,
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: () {
                    if (GoRouter.maybeOf(context) != null) {
                      context.push('/app/more/mock-qr');
                    }
                  },
                  borderRadius: AppSpacing.roundedSm,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.black87,
                      borderRadius: AppSpacing.roundedSm,
                      border: Border.all(
                        color: AppColors.primaryLight.withValues(alpha: 0.6),
                      ),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: const [
                        Icon(Icons.qr_code_2, color: AppColors.primaryLight, size: 18),
                        SizedBox(width: 8),
                        Flexible(
                          child: Text(
                            'Mock Mode: Tap to view scannable Mock QRs',
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          if (_isResolving)
            Container(
              color: Colors.black54,
              child: const Center(
                child: AppLoadingView(
                  message: 'Resolving card & session...',
                ),
              ),
            ),
        ],
      ),
    );
  }

  // ==========================================
  // ACTIVE CARD ACTION HUB WIDGET
  // ==========================================

  Widget _buildActiveCardActionHub() {
    final card = _resolvedCard!;
    final session = _activeSession!;
    final permissions = ref.watch(permissionCheckerProvider);

    final canRecharge = permissions.hasPermission(AppPermission.recharge);
    final canSettleReturn = permissions.hasPermission(AppPermission.cardReturn) ||
        permissions.hasPermission(AppPermission.refund);

    return Scaffold(
      appBar: AppBar(
        title: Text('Wallet: ${card.displayCardNumber}'),
      ),
      body: RefreshIndicator(
        onRefresh: _refreshSession,
        child: ListView(
          padding: AppSpacing.paddingMd,
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            // 1. Authoritative Card Summary Header (relocated from recharge screen)
            AppCard(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          card.displayCardNumber,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.xs),
                      const AppBadge(
                        label: 'ACTIVE',
                        variant: AppBadgeVariant.success,
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Expanded(
                        child: Text(
                          'Current Balance',
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 13,
                            color: AppColors.textSecondaryLight,
                          ),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.xs),
                      Text(
                        '₹${session.balance.toStringAsFixed(2)}',
                        style: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.md),

            // 2. Action Hub Section Header
            const SectionHeader(
              title: 'Actions',
            ),
            const SizedBox(height: AppSpacing.sm),

            // OPTION 1: RECHARGE (Direct to RechargeScreen)
            if (canRecharge) ...[
              _buildActionTile(
                icon: Icons.account_balance_wallet_outlined,
                iconColor: AppColors.success,
                title: 'Recharge',
                onTap: _openRecharge,
              ),
              const SizedBox(height: AppSpacing.sm),
            ],

            // OPTION 2: BILLING (Direct to PosCheckoutScreen)
            _buildActionTile(
              icon: Icons.point_of_sale_outlined,
              iconColor: AppColors.primary,
              title: 'Billing',
              onTap: _openAddProducts,
            ),
            const SizedBox(height: AppSpacing.sm),

            // OPTION 3: RETURN & REFUND (Merged Settle / Return Wallet + Wallet Info & Statistics)
            if (canSettleReturn) ...[
              _buildActionTile(
                icon: Icons.assignment_return_outlined,
                iconColor: AppColors.warning,
                title: 'Return & Refund',
                isDestructive: (_activeSession ?? session).balance > 0,
                onTap: () => _showReturnRefundSheet(context, _activeSession ?? session, card),
              ),
              const SizedBox(height: AppSpacing.md),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildActionTile({
    required IconData icon,
    required Color iconColor,
    required String title,
    String? subtitle,
    required VoidCallback onTap,
    bool isDestructive = false,
  }) {
    return AppCard(
      onTap: onTap,
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 14),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(AppSpacing.sm),
            decoration: BoxDecoration(
              color: iconColor.withValues(alpha: 0.12),
              borderRadius: AppSpacing.roundedSm,
            ),
            child: Icon(icon, color: iconColor, size: 24),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: isDestructive ? AppColors.error : AppColors.textPrimaryLight,
                  ),
                ),
                if (subtitle != null && subtitle.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.textSecondaryLight,
                    ),
                  ),
                ],
              ],
            ),
          ),
          const Icon(
            Icons.chevron_right,
            color: AppColors.textSecondaryLight,
            size: 20,
          ),
        ],
      ),
    );
  }

  // ==========================================
  // RECHARGE HUB SHEET (Merged Recharge + History)
  // ==========================================

  // ignore: unused_element
  void _showRechargeHubSheet(BuildContext context, CardSession session, Card card) {
    final allTx = session.transactions ?? [];
    final topUps = allTx.where((t) => t.type == TransactionType.recharge).toList();

    // Chronologically sort all recharges (earliest first)
    final sortedTopUps = List<Transaction>.from(topUps)
      ..sort((a, b) {
        final aDate = a.createdAt != null ? DateTime.tryParse(a.createdAt!) : null;
        final bDate = b.createdAt != null ? DateTime.tryParse(b.createdAt!) : null;
        if (aDate == null || bDate == null) return 0;
        return aDate.compareTo(bDate);
      });

    final String? latestRechargeId = sortedTopUps.isNotEmpty ? sortedTopUps.last.id : null;

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
                        'Recharge',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      Text(
                        'Wallet: ${card.displayCardNumber} • Balance: ₹${session.balance.toStringAsFixed(2)}',
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
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 6),
              child: AppButton(
                label: 'Recharge',
                icon: Icons.account_balance_wallet,
                backgroundColor: AppColors.success,
                onPressed: () {
                  Navigator.of(sheetCtx).pop();
                  _openRecharge();
                },
              ),
            ),
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.fromLTRB(AppSpacing.md, 10, AppSpacing.md, 4),
              child: Row(
                children: const [
                  Icon(Icons.history, size: 16, color: AppColors.textSecondaryLight),
                  SizedBox(width: 6),
                  Text(
                    'Top-up History',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textSecondaryLight),
                  ),
                ],
              ),
            ),
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
                        final bool hasSubsequentRecharge = sortedTopUps.isNotEmpty && (t.id != latestRechargeId);
                        final bool canCancelRecharge = t.canCancel &&
                            session.balance >= t.amount &&
                            session.isActive &&
                            !hasSubsequentRecharge;

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
                                  Row(
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
                                      const SizedBox(width: 8),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: isCash ? AppColors.successLight : Colors.purple.shade50,
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        child: Text(
                                          isCash ? 'Cash' : 'UPI',
                                          style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.bold,
                                            color: isCash ? AppColors.primaryDark : Colors.purple.shade700,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  if (t.isCancelled)
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: Colors.grey.shade200,
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: const Text('CANCELLED', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey)),
                                    )
                                  else if (!canCancelRecharge)
                                    OutlinedButton.icon(
                                      style: OutlinedButton.styleFrom(
                                        foregroundColor: AppColors.textTertiaryLight,
                                        side: BorderSide(color: Colors.grey.shade300, width: 1),
                                        visualDensity: VisualDensity.compact,
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 0),
                                      ),
                                      icon: const Icon(Icons.cancel_outlined, size: 14, color: AppColors.textTertiaryLight),
                                      label: const Text('Cancel', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                                      onPressed: null,
                                    )
                                  else
                                    OutlinedButton.icon(
                                      style: OutlinedButton.styleFrom(
                                        foregroundColor: AppColors.error,
                                        side: const BorderSide(color: AppColors.error, width: 1),
                                        visualDensity: VisualDensity.compact,
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 0),
                                      ),
                                      icon: const Icon(Icons.cancel_outlined, size: 14),
                                      label: const Text('Cancel Recharge', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                                      onPressed: () {
                                        Navigator.of(sheetCtx).pop();
                                        _handleCancelRecharge(t.id, t.amount, session);
                                      },
                                    ),
                                ],
                              ),
                              if (hasSubsequentRecharge && !t.isCancelled) ...[
                                const SizedBox(height: 4),
                                const Text(
                                  'Cannot cancel: wallet was recharged again',
                                  style: TextStyle(fontSize: 11, color: AppColors.textTertiaryLight, fontStyle: FontStyle.italic),
                                ),
                              ],
                              const SizedBox(height: 4),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    'Staff: ${t.staffName ?? 'Staff Cashier'}',
                                    style: const TextStyle(fontSize: 12, color: AppColors.textSecondaryLight),
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

  // ==========================================
  // BILLING HUB SHEET (Merged Add Products + Food Orders)
  // ==========================================

  // ignore: unused_element
  void _showBillingHubSheet(BuildContext context, CardSession session, Card card) {
    ref.read(kitchenOrdersNotifierProvider.notifier).loadOrders();
    final allTx = session.transactions ?? [];
    final orders = allTx.where((t) => t.type == TransactionType.purchase).toList();

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
                        'Billing',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      Text(
                        'Wallet: ${card.displayCardNumber} • Balance: ₹${session.balance.toStringAsFixed(2)}',
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
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 6),
              child: AppButton(
                label: 'Start Billing / Add Products',
                icon: Icons.add_shopping_cart,
                backgroundColor: AppColors.primary,
                onPressed: () {
                  Navigator.of(sheetCtx).pop();
                  _openAddProducts();
                },
              ),
            ),
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.fromLTRB(AppSpacing.md, 10, AppSpacing.md, 4),
              child: Row(
                children: const [
                  Icon(Icons.fastfood_outlined, size: 16, color: AppColors.textSecondaryLight),
                  SizedBox(width: 6),
                  Text(
                    'Food Orders',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textSecondaryLight),
                  ),
                ],
              ),
            ),
            Expanded(
              child: orders.isEmpty
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(AppSpacing.lg),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: const [
                            Icon(Icons.fastfood_outlined, size: 48, color: AppColors.textTertiaryLight),
                            SizedBox(height: 12),
                            Text(
                              'No food orders placed yet',
                              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.textSecondaryLight),
                            ),
                          ],
                        ),
                      ),
                    )
                  : ListView.separated(
                      padding: AppSpacing.paddingMd,
                      itemCount: orders.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 10),
                      itemBuilder: (ctx, idx) {
                        final t = orders[idx];
                        final items = t.items ?? [];
                        final kitchenOrders = ref.watch(kitchenOrdersNotifierProvider).orders;
                        final matchingKo = kitchenOrders.where(
                          (ko) => ko.transactionId == t.id || (t.id.isNotEmpty && ko.transactionId.contains(t.id)),
                        ).firstOrNull;
                        final isFinishServed = matchingKo != null && (matchingKo.isReady || matchingKo.isCompleted);

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
                                    '-₹${t.amount.toStringAsFixed(2)}',
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                      color: t.isCancelled ? Colors.grey : AppColors.error,
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
                                    )
                                  else if (isFinishServed)
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(
                                        color: Colors.green.shade50,
                                        borderRadius: BorderRadius.circular(4),
                                        border: Border.all(color: Colors.green.shade200),
                                      ),
                                      child: Text(
                                        matchingKo.isCompleted ? 'SERVED' : 'READY',
                                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.green.shade800),
                                      ),
                                    )
                                  else
                                    Row(
                                      children: [
                                        OutlinedButton.icon(
                                          style: OutlinedButton.styleFrom(
                                            foregroundColor: AppColors.primary,
                                            side: const BorderSide(color: AppColors.primary, width: 1),
                                            visualDensity: VisualDensity.compact,
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 0),
                                          ),
                                          icon: const Icon(Icons.edit_outlined, size: 14),
                                          label: const Text('Edit', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                                          onPressed: () {
                                            Navigator.of(sheetCtx).pop();
                                            _handleEditOrder(t, session);
                                          },
                                        ),
                                        const SizedBox(width: 6),
                                        OutlinedButton.icon(
                                          style: OutlinedButton.styleFrom(
                                            foregroundColor: AppColors.error,
                                            side: const BorderSide(color: AppColors.error, width: 1),
                                            visualDensity: VisualDensity.compact,
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 0),
                                          ),
                                          icon: const Icon(Icons.remove_shopping_cart_outlined, size: 14),
                                          label: const Text('Cancel Order', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                                          onPressed: () {
                                            Navigator.of(sheetCtx).pop();
                                            _handleCancelOrder(t.id, t.amount, session);
                                          },
                                        ),
                                      ],
                                    ),
                                ],
                              ),
                              if (items.isNotEmpty) ...[
                                const SizedBox(height: 6),
                                Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: AppColors.surfaceVariantLight,
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: items.map((item) {
                                      return Padding(
                                        padding: const EdgeInsets.symmetric(vertical: 2),
                                        child: Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            Text(
                                              '${item.quantity}x ${item.itemName ?? "Item"}',
                                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
                                            ),
                                            if (item.totalAmount != null)
                                              Text(
                                                '₹${item.totalAmount!.toStringAsFixed(2)}',
                                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                                              ),
                                          ],
                                        ),
                                      );
                                    }).toList(),
                                  ),
                                ),
                              ],
                              const SizedBox(height: 6),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    'Staff: ${t.staffName ?? 'Kitchen Staff'}',
                                    style: const TextStyle(fontSize: 12, color: AppColors.textSecondaryLight),
                                  ),
                                  Text(
                                    _formatDateTime(t.createdAt),
                                    style: const TextStyle(fontSize: 11, color: AppColors.textTertiaryLight),
                                  ),
                                ],
                              ),
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

  // ==========================================
  // RETURN & REFUND HUB SHEET (Merged Return + Info/Stats)
  // ==========================================

  void _showReturnRefundSheet(BuildContext context, CardSession session, Card card) {
    final allTx = session.transactions ?? [];
    final recharges = allTx.where((t) => t.type == TransactionType.recharge && !t.isCancelled).toList();
    final cancelledRecharges = allTx.where((t) => t.type == TransactionType.recharge && t.isCancelled).toList();
    final purchases = allTx.where((t) => t.type == TransactionType.purchase && !t.isCancelled).toList();
    final cancelledPurchases = allTx.where((t) => t.type == TransactionType.purchase && t.isCancelled).toList();
    final returns = allTx.where((t) => t.type == TransactionType.refund).toList();

    final totalRechargeVol = recharges.fold<double>(0.0, (sum, t) => sum + t.amount);
    final totalSpent = purchases.fold<double>(0.0, (sum, t) => sum + t.amount);
    final totalRefundVol = returns.fold<double>(0.0, (sum, t) => sum + t.amount) +
        cancelledPurchases.fold<double>(0.0, (sum, t) => sum + t.amount);
    final totalCancelledRechargeVol = cancelledRecharges.fold<double>(0.0, (sum, t) => sum + t.amount);

    final cycleNumber = session.cycleNumber ?? 1;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetCtx) => Container(
        constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.9),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
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
                  const Text(
                    'Return & Refund',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
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
              child: ListView(
                padding: AppSpacing.paddingMd,
                children: [
                  // 1. UNIFIED CARD & ACTIONS
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceLight,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.borderLight),
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
                                  'Wallet: ${card.displayCardNumber}',
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.textPrimaryLight,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: AppColors.primary.withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(4),
                                    border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
                                  ),
                                  child: Text(
                                    'Cycle $cycleNumber',
                                    style: const TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.primary,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                const Text(
                                  'Available',
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: AppColors.textSecondaryLight,
                                  ),
                                ),
                                Text(
                                  '₹${session.balance.toStringAsFixed(2)}',
                                  style: const TextStyle(
                                    fontSize: 17,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.success,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                        if (ref.watch(currentBranchProvider) != null &&
                            session.branchId.isNotEmpty &&
                            session.branchId != ref.watch(currentBranchProvider)!.id) ...[
                          const SizedBox(height: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(
                              color: AppColors.warningLight,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Text(
                              'Issued at another kitchen. Return/refund only at issuing kitchen.',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: AppColors.warning,
                              ),
                            ),
                          ),
                        ],
                        const SizedBox(height: 14),
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton.icon(
                                icon: const Icon(Icons.payments_outlined, size: 16),
                                label: const Text('Refund', style: TextStyle(fontWeight: FontWeight.bold)),
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: session.balance > 0 &&
                                          (ref.watch(currentBranchProvider) == null ||
                                              session.branchId.isEmpty ||
                                              session.branchId == ref.watch(currentBranchProvider)!.id)
                                      ? AppColors.warning
                                      : Colors.grey,
                                  side: BorderSide(
                                    color: session.balance > 0 &&
                                            (ref.watch(currentBranchProvider) == null ||
                                                session.branchId.isEmpty ||
                                                session.branchId == ref.watch(currentBranchProvider)!.id)
                                        ? AppColors.warning
                                        : Colors.grey.shade300,
                                  ),
                                  padding: const EdgeInsets.symmetric(vertical: 10),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                ),
                                onPressed: (ref.watch(currentBranchProvider) != null &&
                                        session.branchId.isNotEmpty &&
                                        session.branchId != ref.watch(currentBranchProvider)!.id)
                                    ? null
                                    : () {
                                        Navigator.of(sheetCtx).pop();
                                        _handleRefundOnly(session);
                                      },
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: ElevatedButton.icon(
                                icon: const Icon(Icons.assignment_return_outlined, size: 16),
                                label: const Text('Return', style: TextStyle(fontWeight: FontWeight.bold)),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: (ref.watch(currentBranchProvider) != null &&
                                          session.branchId.isNotEmpty &&
                                          session.branchId != ref.watch(currentBranchProvider)!.id)
                                      ? Colors.grey.shade400
                                      : AppColors.error,
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(vertical: 10),
                                  elevation: 0,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                ),
                                onPressed: (ref.watch(currentBranchProvider) != null &&
                                        session.branchId.isNotEmpty &&
                                        session.branchId != ref.watch(currentBranchProvider)!.id)
                                    ? null
                                    : () {
                                        Navigator.of(sheetCtx).pop();
                                        _handleSettleReturn();
                                      },
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),

                  // 2. MINIMALIST 2x2 STATISTICS GRID
                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: AppColors.borderLight),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Recharges', style: TextStyle(fontSize: 12, color: AppColors.textSecondaryLight, fontWeight: FontWeight.w600)),
                              const SizedBox(height: 4),
                              Text('${recharges.length} times', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimaryLight)),
                              Text('₹${totalRechargeVol.toStringAsFixed(2)} total', style: const TextStyle(fontSize: 11, color: AppColors.textSecondaryLight)),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: AppColors.borderLight),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Refunds', style: TextStyle(fontSize: 12, color: AppColors.textSecondaryLight, fontWeight: FontWeight.w600)),
                              const SizedBox(height: 4),
                              Text('${returns.length + cancelledPurchases.length} times', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimaryLight)),
                              Text('₹${totalRefundVol.toStringAsFixed(2)} total', style: const TextStyle(fontSize: 11, color: AppColors.textSecondaryLight)),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: AppColors.borderLight),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Food Orders', style: TextStyle(fontSize: 12, color: AppColors.textSecondaryLight, fontWeight: FontWeight.w600)),
                              const SizedBox(height: 4),
                              Text('${purchases.length} orders', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimaryLight)),
                              Text('₹${totalSpent.toStringAsFixed(2)} spent', style: const TextStyle(fontSize: 11, color: AppColors.textSecondaryLight)),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: AppColors.borderLight),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Cancelled', style: TextStyle(fontSize: 12, color: AppColors.textSecondaryLight, fontWeight: FontWeight.w600)),
                              const SizedBox(height: 4),
                              Text(
                                '${cancelledRecharges.length} times',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: cancelledRecharges.isNotEmpty ? AppColors.error : AppColors.textPrimaryLight,
                                ),
                              ),
                              Text('₹${totalCancelledRechargeVol.toStringAsFixed(2)} voided', style: const TextStyle(fontSize: 11, color: AppColors.textSecondaryLight)),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.md),
                  if (session.customerName != null && session.customerName!.isNotEmpty) ...[
                    Text(
                      'Customer: ${session.customerName}${session.customerPhone != null && session.customerPhone!.isNotEmpty ? " (${session.customerPhone})" : ""}',
                      style: const TextStyle(fontSize: 12, color: AppColors.textSecondaryLight),
                    ),
                    const SizedBox(height: 2),
                  ],
                  Text(
                    'Session Started: ${_formatDateTime(session.startedAt)}',
                    style: const TextStyle(fontSize: 11, color: AppColors.textTertiaryLight),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
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

    final confirm = await AppDialog.show(
      context,
      title: 'Confirm Balance Refund',
      message: 'Refund available money of ₹${session.balance.toStringAsFixed(2)} to customer?',
      confirmLabel: 'Refund Money',
      isDestructive: true,
    );

    if (confirm != true) return;

    setState(() {
      _isResolving = true;
    });

    try {
      final sessionRepo = ref.read(sessionRepositoryProvider);
      final result = await sessionRepo.refundSession(session.id);

      await _refreshSession();
      ref.read(sessionListNotifierProvider.notifier).loadSessions();
      ref.read(analyticsNotifierProvider.notifier).loadAnalytics();

      if (mounted) {
        setState(() {
          _isResolving = false;
          _activeSession = _activeSession?.copyWith(balance: 0.0);
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
          _isResolving = false;
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

  // ==========================================
  // CANCELLATION HANDLERS
  // ==========================================

  Future<void> _handleCancelRecharge(String txId, double amount, CardSession session) async {
    final allRecharges = (session.transactions ?? [])
        .where((t) => t.type == TransactionType.recharge)
        .toList()
      ..sort((a, b) {
        final aDate = a.createdAt != null ? DateTime.tryParse(a.createdAt!) : null;
        final bDate = b.createdAt != null ? DateTime.tryParse(b.createdAt!) : null;
        if (aDate == null || bDate == null) return 0;
        return aDate.compareTo(bDate);
      });

    final String? latestRechargeId = allRecharges.isNotEmpty ? allRecharges.last.id : null;
    if (allRecharges.isNotEmpty && txId != latestRechargeId) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Cannot cancel recharge because the wallet was recharged again afterwards.'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    final currentBal = _activeSession?.balance ?? session.balance;
    if (currentBal < amount) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Cannot cancel top-up: Customer already spent ₹${(amount - currentBal).toStringAsFixed(2)}. Current balance is only ₹${currentBal.toStringAsFixed(2)}.',
          ),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

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
                'This will cancel the recharge and deduct ₹${amount.toStringAsFixed(2)} from the card balance.',
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
                  DropdownMenuItem(value: 'Duplicate Scan', child: Text('Duplicate Scan')),
                  DropdownMenuItem(value: 'Payment Failed', child: Text('Payment Failed')),
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
              child: const Text('Cancel Recharge', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
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
      await _refreshSession();
      ref.read(sessionListNotifierProvider.notifier).loadSessions();
      ref.read(analyticsNotifierProvider.notifier).loadAnalytics();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Top-up of ₹${amount.toStringAsFixed(2)} cancelled successfully.'),
          backgroundColor: AppColors.success,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      final msg = e is ApiException ? e.message : e.toString();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Cancellation failed: $msg'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  Future<void> _handleCancelOrder(String txId, double amount, CardSession session) async {
    final kitchenOrders = ref.read(kitchenOrdersNotifierProvider).orders;
    final matchingKo = kitchenOrders.where(
      (ko) => ko.transactionId == txId || (txId.isNotEmpty && ko.transactionId.contains(txId)),
    ).firstOrNull;
    if (matchingKo != null && (matchingKo.isReady || matchingKo.isCompleted)) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Cannot cancel order that has already been prepared or served'),
            backgroundColor: AppColors.error,
          ),
        );
      }
      return;
    }

    String selectedReason = 'Ordered Wrong Item';
    final customReasonCtrl = TextEditingController();

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (dialogCtx, setModalState) => AlertDialog(
          title: Row(
            children: const [
              Icon(Icons.remove_shopping_cart_outlined, color: AppColors.error, size: 24),
              SizedBox(width: 8),
              Text('Cancel Food Order?', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'This will cancel the order and refund ₹${amount.toStringAsFixed(2)} back to the customer\'s card balance.',
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
                  DropdownMenuItem(value: 'Ordered Wrong Item', child: Text('Ordered Wrong Item')),
                  DropdownMenuItem(value: 'Item Out of Stock', child: Text('Item Out of Stock')),
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
              child: const Text('Keep Order'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
              onPressed: () => Navigator.of(ctx).pop(true),
              child: const Text('Refund & Cancel', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
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
      await sessionService.cancelOrder(transactionId: txId, reason: reason);
      await _refreshSession();
      ref.read(sessionListNotifierProvider.notifier).loadSessions();
      ref.read(analyticsNotifierProvider.notifier).loadAnalytics();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Order cancelled and ₹${amount.toStringAsFixed(2)} refunded to card.'),
          backgroundColor: AppColors.success,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      final msg = e is ApiException ? e.message : e.toString();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Order cancellation failed: $msg'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  Future<void> _handleEditOrder(Transaction orderTx, CardSession session) async {
    final kitchenOrders = ref.read(kitchenOrdersNotifierProvider).orders;
    final matchingKo = kitchenOrders.where(
      (ko) => ko.transactionId == orderTx.id || (orderTx.id.isNotEmpty && ko.transactionId.contains(orderTx.id)),
    ).firstOrNull;
    if (matchingKo != null && (matchingKo.isReady || matchingKo.isCompleted)) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Cannot edit order that has already been prepared or served'),
            backgroundColor: AppColors.error,
          ),
        );
      }
      return;
    }

    final items = orderTx.items ?? [];
    final itemsSummary = items.isNotEmpty
        ? items.map((i) => '${i.quantity}x ${i.itemName ?? "Item"}').join(', ')
        : 'Order #${orderTx.displayTransactionId}';

    final confirmAction = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Row(
          children: const [
            Icon(Icons.edit_note_outlined, color: AppColors.primary, size: 24),
            SizedBox(width: 8),
            Text('Edit Food Order?', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Order: $itemsSummary',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
            ),
            const SizedBox(height: 8),
            Text(
              'Amount to refund: ₹${orderTx.amount.toStringAsFixed(2)}',
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.primaryDark),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Keep Order'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Proceed to Edit', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );

    if (confirmAction != true) return;

    try {
      final sessionService = ref.read(sessionServiceProvider);
      await sessionService.cancelOrder(
        transactionId: orderTx.id,
        reason: 'Staff edited and revised order',
      );
      await _refreshSession();
      ref.read(sessionListNotifierProvider.notifier).loadSessions();
      ref.read(analyticsNotifierProvider.notifier).loadAnalytics();

      // Pre-fill the cart with items from this order
      final catalogProducts = ref.read(posCatalogNotifierProvider).products;

      ref.read(posCartNotifierProvider.notifier).clearCart();
      for (final it in items) {
        final matchingProduct = catalogProducts
            .where((p) => p.id == it.productId || p.itemName.toLowerCase() == (it.itemName ?? '').toLowerCase())
            .firstOrNull;
        final product = matchingProduct ??
            Product(
              id: it.productId,
              branchId: session.branchId,
              itemName: it.itemName ?? 'Food Item',
              price: it.unitPrice ?? (it.totalAmount != null && it.quantity > 0 ? it.totalAmount! / it.quantity : 0.0),
              category: const ['General'],
              status: 'ACTIVE',
            );
        for (int q = 0; q < it.quantity; q++) {
          ref.read(posCartNotifierProvider.notifier).addToCart(product);
        }
      }

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Order cancelled & ₹${orderTx.amount.toStringAsFixed(2)} refunded. Modifying cart...'),
          backgroundColor: AppColors.success,
        ),
      );

      if (GoRouter.maybeOf(context) != null) {
        await context.push('/app/pos/${session.id}');
      }
      await _refreshSession();
    } catch (e) {
      if (!mounted) return;
      final msg = e is ApiException ? e.message : e.toString();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to edit order: $msg'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

}
