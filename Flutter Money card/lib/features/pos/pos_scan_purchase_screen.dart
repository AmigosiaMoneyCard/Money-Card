import 'package:flutter/services.dart';
import 'package:flutter/material.dart' hide Card;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/config/app_config.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';
import '../../core/constants/permission_constants.dart';
import '../../models/card.dart';
import '../../models/card_session.dart';
import '../../models/transaction.dart';
import '../../providers/api_providers.dart';
import '../../providers/branch_provider.dart';
import '../../providers/card_operations_provider.dart';
import '../../providers/permission_provider.dart';
import '../../providers/session_operations_provider.dart';
import '../../widgets/common/app_badge.dart';
import '../../widgets/common/app_button.dart';
import '../../widgets/common/app_card.dart';
import '../../widgets/common/app_dialog.dart';
import '../../widgets/common/section_header.dart';
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
  String? _scanErrorMessage;
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
      _scanErrorMessage = null;
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
      _scanErrorMessage = null;
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
                      child: Text('Confirm Card Activation', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
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
                            const Text('Card Number:', style: TextStyle(fontSize: 13, color: AppColors.textSecondaryLight)),
                            Text(
                              result.card.displayCardNumber,
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      const Text(
                        'Customer Details (Optional):',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textSecondaryLight),
                      ),
                      const SizedBox(height: 8),
                      TextField(
                        controller: nameCtrl,
                        autofocus: true,
                        textInputAction: TextInputAction.next,
                        scrollPadding: const EdgeInsets.only(bottom: 140),
                        decoration: const InputDecoration(
                          labelText: 'Customer Name (Optional)',
                          hintText: 'e.g. John Doe (default: Walk-in)',
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
                      const SizedBox(height: AppSpacing.xs),
                      const Text(
                        'Customer details are optional. Then the card becomes active.',
                        style: TextStyle(fontSize: 11, color: AppColors.textSecondaryLight),
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
          final customerNameVal = nameCtrl.text.trim().isNotEmpty ? nameCtrl.text.trim() : 'Walk-in Customer';
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
                      'Card ${activeCard.displayCardNumber} activated successfully!',
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
        _scanErrorMessage = e.toString().replaceAll('ApiException: ', '');
      });
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
  }

  Future<void> _openRecharge() async {
    final session = _activeSession;
    if (session == null) return;

    if (GoRouter.maybeOf(context) != null) {
      await context.push('/app/recharge/${session.id}');
    }
    await _refreshSession();
  }

  Future<void> _handleSettleReturn() async {
    final session = _activeSession;
    final card = _resolvedCard;
    if (session == null || card == null) return;

    final confirm = await AppDialog.show(
      context,
      title: 'Confirm Card Return & Settlement',
      message: session.balance > 0
          ? 'Refund remaining balance of ₹${session.balance.toStringAsFixed(2)} to customer and settle this card session?'
          : 'Settle this card session and return card ${card.displayCardNumber} to AVAILABLE state?',
      confirmLabel: 'Confirm & Settle',
      isDestructive: session.balance > 0,
    );

    if (confirm != true) return;

    setState(() {
      _isResolving = true;
    });

    try {
      final sessionRepo = ref.read(sessionRepositoryProvider);
      final result = await sessionRepo.returnSession(session.id);

      // Refresh global stores
      ref.read(sessionListNotifierProvider.notifier).loadSessions();
      ref.read(cardListNotifierProvider.notifier).loadCards();

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
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Settlement failed: $e'),
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
          title: const Text('Card Return & Settlement'),
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
                const Text(
                  'Card Returned Successfully',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimaryLight,
                  ),
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  'Card: ${_resolvedCard!.displayCardNumber.toUpperCase().startsWith("MC-") ? _resolvedCard!.displayCardNumber : "MC-${_resolvedCard!.displayCardNumber}"}',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: AppSpacing.sm),
                Container(
                  padding: AppSpacing.paddingMd,
                  decoration: BoxDecoration(
                    color: AppColors.primaryLight,
                    borderRadius: AppSpacing.roundedSm,
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Refunded Amount:'),
                          Text(
                            '₹${_settlementResult!.refundedAmount.toStringAsFixed(2)}',
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                              color: AppColors.primaryDark,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: const [
                          Text('Card Status:'),
                          AppBadge(label: 'AVAILABLE', variant: AppBadgeVariant.primary),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: const [
                          Text('Session Status:'),
                          AppBadge(label: 'SETTLED', variant: AppBadgeVariant.neutral),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                const Text(
                  'This card has been returned to inventory and is ready for new issuance.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 13,
                    color: AppColors.textSecondaryLight,
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                AppButton(
                  label: 'Scan Another Card',
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

    // 2. Unregistered Error State
    if (_scanErrorMessage != null) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Scan QR Card'),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => context.pop(),
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
                  decoration: const BoxDecoration(
                    color: AppColors.errorLight,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.credit_card_off, size: 48, color: AppColors.error),
                ),
                const SizedBox(height: AppSpacing.md),
                const Text(
                  'Card Not Registered',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: AppColors.error,
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                const Text(
                  'This QR card is not registered in your counter. Try scanning a different card.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 14,
                    color: AppColors.textSecondaryLight,
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
        ),
      );
    }

    // 3. Card Resolved but BLOCKED
    if (_resolvedCard != null && _resolvedCard!.status == CardStatus.blocked) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Scan QR Card'),
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
                'Cannot perform operations on a blocked card. This card is blocked and cannot be used. Please contact your manager.',
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
          title: const Text('Scan QR Card'),
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
                'Card has no active session.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimaryLight,
                ),
              ),
              const SizedBox(height: 4),
              const Text(
                'A card session must be issued before making purchases or recharging.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 13,
                  color: AppColors.textSecondaryLight,
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              AppButton(
                label: 'Issue Card Session First',
                icon: Icons.add_card,
                onPressed: () {
                  context.pushReplacement(
                    '/app/cards/issue',
                  );
                },
              ),
              const SizedBox(height: AppSpacing.sm),
              AppOutlinedButton(
                label: 'Scan Another Card',
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
            title: 'Scan QR Card',
            prompt: 'Point camera at customer\'s Money Card QR code',
            onQrScanned: _handleQrScanned,
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

    final canPurchase = permissions.hasPermission(AppPermission.purchase);
    final canRecharge = permissions.hasPermission(AppPermission.recharge);
    final canViewSession = permissions.hasPermission(AppPermission.sessionView);
    final canSettleReturn = permissions.hasPermission(AppPermission.cardReturn) ||
        permissions.hasPermission(AppPermission.refund);

    return Scaffold(
      appBar: AppBar(
        title: Text('Card: ${card.displayCardNumber}'),
        actions: [
          IconButton(
            icon: const Icon(Icons.qr_code_scanner),
            tooltip: 'Scan Another Card',
            onPressed: _resetScan,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _refreshSession,
        child: ListView(
          padding: AppSpacing.paddingMd,
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            // 1. Authoritative Compact Card Summary Header
            AppCard(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.md,
                vertical: 12,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              card.displayCardNumber,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 0.5,
                                color: AppColors.textPrimaryLight,
                              ),
                            ),
                            if (session.customerName != null && session.customerName!.trim().isNotEmpty) ...[
                              const SizedBox(height: 2),
                              Row(
                                children: [
                                  const Icon(Icons.person, size: 14, color: AppColors.primary),
                                  const SizedBox(width: 4),
                                  Expanded(
                                    child: Text(
                                      session.customerName!.trim(),
                                      style: const TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w600,
                                        color: AppColors.textPrimaryLight,
                                      ),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ],
                        ),
                      ),
                      const SizedBox(width: AppSpacing.xs),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (session.balance < 100) ...[
                            const AppBadge(
                              label: 'LOW BAL',
                              variant: AppBadgeVariant.warning,
                            ),
                            const SizedBox(width: AppSpacing.xs),
                          ],
                          const AppBadge(
                            label: 'ACTIVE',
                            variant: AppBadgeVariant.success,
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  const Divider(height: 1),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text.rich(
                          TextSpan(
                            children: [
                              const TextSpan(
                                text: 'Balance: ',
                                style: TextStyle(
                                  fontSize: 13,
                                  color: AppColors.textSecondaryLight,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              TextSpan(
                                text: '₹${session.balance.toStringAsFixed(2)}',
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.primary,
                                ),
                              ),
                            ],
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: AppSpacing.xs),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(
                              color: AppColors.success,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 4),
                          const Text(
                            'Session Active',
                            style: TextStyle(
                              fontSize: 12,
                              color: AppColors.textSecondaryLight,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(Icons.access_time, size: 14, color: AppColors.textSecondaryLight),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          'Started: ${_formatDateTime(session.startedAt)}',
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.textSecondaryLight,
                            fontWeight: FontWeight.w500,
                          ),
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
              title: 'Card Actions & Operations',
            ),
            const SizedBox(height: AppSpacing.sm),

            // OPTION 1: RECHARGE CARD (ADD MONEY) - FIRST OPTION
            if (canRecharge) ...[
              _buildActionTile(
                icon: Icons.account_balance_wallet_outlined,
                iconColor: AppColors.success,
                title: 'Recharge Card',
                subtitle: 'Load cash or online UPI balance onto card',
                onTap: _openRecharge,
              ),
              const SizedBox(height: AppSpacing.sm),
            ],

            // OPTION 2: ADD PRODUCTS (FOOD PURCHASE) - SECOND OPTION
            if (canPurchase) ...[
              _buildActionTile(
                icon: Icons.add_shopping_cart,
                iconColor: AppColors.primary,
                title: 'Add Products',
                subtitle: 'Order food items from menu catalog',
                onTap: _openAddProducts,
              ),
              const SizedBox(height: AppSpacing.sm),
            ],

            // OPTION 3: CANCEL / EDIT RECENT ORDER
            _buildActionTile(
              icon: Icons.edit_note_outlined,
              iconColor: AppColors.error,
              title: 'Cancel / Edit Order',
              subtitle: 'Cancel current order with auto-refund',
              onTap: _handleQuickCancelRecentOrder,
            ),
            const SizedBox(height: AppSpacing.sm),

            // OPTION 4: TOP-UP HISTORY
            _buildActionTile(
              icon: Icons.receipt_long_outlined,
              iconColor: Colors.purple,
              title: 'Top-up History',
              subtitle: 'View recharges or cancel wrong top-ups',
              onTap: () => _showTopUpHistorySheet(context, session),
            ),
            const SizedBox(height: AppSpacing.sm),

            // OPTION 5: FOOD ORDERS
            _buildActionTile(
              icon: Icons.fastfood_outlined,
              iconColor: AppColors.primaryDark,
              title: 'Food Orders',
              subtitle: 'View total orders placed or cancel order',
              onTap: () => _showFoodOrdersSheet(context, session),
            ),
            const SizedBox(height: AppSpacing.sm),

            // OPTION 6: CARD INFO & STATISTICS
            _buildActionTile(
              icon: Icons.info_outline,
              iconColor: AppColors.info,
              title: 'Card Info & Statistics',
              subtitle: 'Number of recharges, refunds, and card summary',
              onTap: () => _showCardSessionInfoSheet(context, session),
            ),
            const SizedBox(height: AppSpacing.sm),

            // OPTION 5: SETTLE / RETURN CARD
            if (canSettleReturn) ...[
              _buildActionTile(
                icon: Icons.assignment_return_outlined,
                iconColor: AppColors.warning,
                title: 'Settle / Return Card',
                subtitle: session.balance > 0
                    ? 'Refund ₹${session.balance.toStringAsFixed(2)} and close card'
                    : 'Close session & return card to available stock',
                isDestructive: session.balance > 0,
                onTap: _handleSettleReturn,
              ),
              const SizedBox(height: AppSpacing.sm),
            ],

            // OPTION 6: VIEW SESSION & TRANSACTION HISTORY
            if (canViewSession) ...[
              _buildActionTile(
                icon: Icons.history_outlined,
                iconColor: AppColors.textSecondaryLight,
                title: 'View Session & Transaction History',
                subtitle: 'View full audit log of all card events',
                onTap: () {
                  if (GoRouter.maybeOf(context) != null) {
                    context.push('/app/sessions/${session.id}');
                  }
                },
              ),
              const SizedBox(height: AppSpacing.md),
            ],

            // Footer Action: Scan Another Card
            AppOutlinedButton(
              label: 'Scan Another Card',
              icon: Icons.qr_code_scanner,
              onPressed: _resetScan,
            ),
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
  // TOP-UP HISTORY BOTTOM SHEET & CANCEL FLOW
  // ==========================================

  void _showTopUpHistorySheet(BuildContext context, CardSession session) {
    final allTx = session.transactions ?? [];
    final topUps = allTx.where((t) => t.type == TransactionType.recharge).toList();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetCtx) => Container(
        constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.8),
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
                        'Card Balance: ₹${session.balance.toStringAsFixed(2)}',
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
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textSecondaryLight),
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
                                      child: const Text(
                                        'CANCELLED',
                                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.black54),
                                      ),
                                    )
                                  else
                                    OutlinedButton.icon(
                                      style: OutlinedButton.styleFrom(
                                        foregroundColor: AppColors.error,
                                        side: const BorderSide(color: AppColors.error),
                                        visualDensity: VisualDensity.compact,
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 0),
                                      ),
                                      icon: const Icon(Icons.cancel_outlined, size: 14),
                                      label: const Text('Cancel Top-up', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                                      onPressed: () {
                                        Navigator.of(sheetCtx).pop();
                                        _handleCancelRecharge(t.id, t.amount, session);
                                      },
                                    ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    'Staff: ${t.staffName ?? 'Counter Staff'}',
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
  // FOOD ORDERS BOTTOM SHEET & CANCEL FLOW
  // ==========================================

  void _showFoodOrdersSheet(BuildContext context, CardSession session) {
    final allTx = session.transactions ?? [];
    final orders = allTx.where((t) => t.type == TransactionType.purchase).toList();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetCtx) => Container(
        constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.8),
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
                        'Food Orders',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      Text(
                        '${orders.length} orders recorded on this card',
                        style: const TextStyle(fontSize: 13, color: AppColors.textSecondaryLight),
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
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textSecondaryLight),
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
                                      child: const Text(
                                        'CANCELLED',
                                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.black54),
                                      ),
                                    )
                                  else
                                    OutlinedButton.icon(
                                      style: OutlinedButton.styleFrom(
                                        foregroundColor: AppColors.error,
                                        side: const BorderSide(color: AppColors.error),
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
                                    'Staff: ${t.staffName ?? 'Counter Staff'}',
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
  // CANCELLATION HANDLERS
  // ==========================================

  Future<void> _handleCancelRecharge(String txId, double amount, CardSession session) async {
    if (session.balance < amount) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Cannot cancel top-up: Customer already spent ₹${(amount - session.balance).toStringAsFixed(2)}. Current balance is only ₹${session.balance.toStringAsFixed(2)}.',
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
              Text('Cancel Top-up?', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'This will void the top-up and deduct ₹${amount.toStringAsFixed(2)} from the card balance.',
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
              child: const Text('Keep Top-up'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
              onPressed: () => Navigator.of(ctx).pop(true),
              child: const Text('Confirm Void', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
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
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Top-up of ₹${amount.toStringAsFixed(2)} cancelled successfully.'),
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

  Future<void> _handleCancelOrder(String txId, double amount, CardSession session) async {
    String selectedReason = 'Customer Changed Mind';
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
                  DropdownMenuItem(value: 'Customer Changed Mind', child: Text('Customer Changed Mind')),
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
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Order cancelled and ₹${amount.toStringAsFixed(2)} refunded to card.'),
          backgroundColor: AppColors.success,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Order cancellation failed: $e'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  Future<void> _handleQuickCancelRecentOrder() async {
    final session = _activeSession;
    if (session == null) return;

    final allTx = session.transactions ?? [];
    final activeOrders = allTx.where((t) => t.type == TransactionType.purchase && !t.isCancelled).toList();
    if (activeOrders.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No active recent orders found to cancel on this card.'),
          backgroundColor: AppColors.info,
        ),
      );
      return;
    }

    final latestOrder = activeOrders.first;
    final items = latestOrder.items ?? [];
    final itemsSummary = items.isNotEmpty
        ? items.map((i) => '${i.quantity}x ${i.itemName ?? "Item"}').join(', ')
        : 'Order #${latestOrder.displayTransactionId}';

    final confirmAction = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Row(
          children: const [
            Icon(Icons.remove_shopping_cart_outlined, color: AppColors.error, size: 24),
            SizedBox(width: 8),
            Text('Cancel & Refund Order', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Latest Order: $itemsSummary',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
            ),
            const SizedBox(height: 8),
            Text(
              'Amount to refund: ₹${latestOrder.amount.toStringAsFixed(2)}',
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.primaryDark),
            ),
            const SizedBox(height: 8),
            const Text(
              'This will immediately cancel the order and auto-refund the balance back to this card.',
              style: TextStyle(fontSize: 13, color: AppColors.textSecondaryLight),
            ),
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
            child: const Text('Cancel Order', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );

    if (confirmAction != true) return;

    try {
      final sessionService = ref.read(sessionServiceProvider);
      await sessionService.cancelOrder(transactionId: latestOrder.id, reason: 'Customer changed mind');
      await _refreshSession();
      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Order cancelled. ₹${latestOrder.amount.toStringAsFixed(2)} auto-refunded to card.'),
          backgroundColor: AppColors.success,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to cancel order: $e'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  void _showCardSessionInfoSheet(BuildContext context, CardSession session) {
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

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetCtx) => Container(
        constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.8),
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.lg),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Card Info & Statistics',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    Text(
                      'Card #${session.displayCardNumber}',
                      style: const TextStyle(fontSize: 13, color: AppColors.textSecondaryLight),
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.of(sheetCtx).pop(),
                ),
              ],
            ),
            const Divider(height: AppSpacing.md),
            Row(
              children: [
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.successLight.withValues(alpha: 0.3),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppColors.success.withValues(alpha: 0.2)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Recharges', style: TextStyle(fontSize: 12, color: AppColors.textSecondaryLight, fontWeight: FontWeight.w600)),
                        const SizedBox(height: 4),
                        Text('${recharges.length} times', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.success)),
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
                      color: AppColors.warningLight.withValues(alpha: 0.3),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppColors.warning.withValues(alpha: 0.2)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Refunds', style: TextStyle(fontSize: 12, color: AppColors.textSecondaryLight, fontWeight: FontWeight.w600)),
                        const SizedBox(height: 4),
                        Text('${returns.length + cancelledPurchases.length} times', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.warning)),
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
                      color: AppColors.primaryLight.withValues(alpha: 0.3),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Food Orders', style: TextStyle(fontSize: 12, color: AppColors.textSecondaryLight, fontWeight: FontWeight.w600)),
                        const SizedBox(height: 4),
                        Text('${purchases.length} orders', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.primaryDark)),
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
                      color: Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: Colors.grey.shade300),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Current Balance', style: TextStyle(fontSize: 12, color: AppColors.textSecondaryLight, fontWeight: FontWeight.w600)),
                        const SizedBox(height: 4),
                        Text('₹${session.balance.toStringAsFixed(2)}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimaryLight)),
                        Text(session.status.value.toUpperCase(), style: const TextStyle(fontSize: 11, color: AppColors.textSecondaryLight)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),
            if (session.customerName != null && session.customerName!.isNotEmpty) ...[
              Text('Customer: ${session.customerName} (${session.customerPhone ?? "No phone"})', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
              const SizedBox(height: 4),
            ],
            Text('Session Started: ${_formatDateTime(session.startedAt)}', style: const TextStyle(fontSize: 12, color: AppColors.textSecondaryLight)),
            if (cancelledRecharges.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text('Voided Recharges: ${cancelledRecharges.length}', style: const TextStyle(fontSize: 12, color: AppColors.error)),
            ],
          ],
        ),
      ),
    );
  }
}
