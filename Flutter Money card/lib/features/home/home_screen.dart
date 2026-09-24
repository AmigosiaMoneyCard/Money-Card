import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';
import '../../core/constants/permission_constants.dart';
import '../../providers/analytics_provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/branch_provider.dart';
import '../../providers/card_operations_provider.dart';
import '../../providers/permission_provider.dart';
import '../../providers/pos_cart_provider.dart';
import '../../providers/session_operations_provider.dart';
import '../../widgets/common/app_card.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final sessionState = ref.read(sessionListNotifierProvider);
      if (sessionState.sessions.isEmpty && !sessionState.isLoading) {
        ref.read(sessionListNotifierProvider.notifier).loadSessions();
      }
      ref.read(analyticsNotifierProvider.notifier).loadAnalytics();
    });
  }

  void _safePush(String route) {
    if (GoRouter.maybeOf(context) != null) {
      context.push(route);
    }
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(currentBranchProvider, (previous, next) {
      if (previous?.id != next?.id) {
        ref.read(sessionListNotifierProvider.notifier).loadSessions(force: true);
        ref.read(cardListNotifierProvider.notifier).loadCards(force: true);
        ref.read(posCatalogNotifierProvider.notifier).loadProducts(force: true);
      }
    });

    final user = ref.watch(currentUserProvider);
    final currentBranch = ref.watch(currentBranchProvider);
    final sessionNotifier = ref.read(sessionListNotifierProvider.notifier);
    final permissionChecker = ref.watch(permissionCheckerProvider);

    final analyticsState = ref.watch(analyticsNotifierProvider);
    final todayMetric = analyticsState.analytics;

    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            await Future.wait([
              sessionNotifier.loadSessions(),
              ref.read(analyticsNotifierProvider.notifier).loadAnalytics(),
              ref.read(authNotifierProvider.notifier).refreshCurrentUser(),
            ]);
          },
          child: ListView(
            padding: AppSpacing.paddingMd,
            physics: const AlwaysScrollableScrollPhysics(),
            children: [
              // 1. Staff Greeting & Active Branch Banner
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Hello, ${(user?.name != null && user!.name.trim().isNotEmpty) ? user.name.trim().split(' ').first : 'Staff'}',
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                            color: AppColors.textPrimaryLight,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          currentBranch != null
                              ? 'Counter: ${currentBranch.name}'
                              : 'Ready to serve customers',
                          style: const TextStyle(
                            fontSize: 13,
                            color: AppColors.textSecondaryLight,
                            fontWeight: FontWeight.w500,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  if (user != null)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.primaryLight,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Text(
                        user.role == 'STAFF'
                            ? (permissionChecker.hasPermission(AppPermission.recharge)
                                ? 'Manager'
                                : 'Staff')
                            : user.role,
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primaryDark,
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),

              const SizedBox(height: AppSpacing.md),


              // 2. Primary Action: Large Prominent SCAN CARD Box
              Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: () => _safePush('/app/scanner'),
                  borderRadius: AppSpacing.roundedLg,
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 28, horizontal: AppSpacing.lg),
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      borderRadius: AppSpacing.roundedLg,
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.primary.withValues(alpha: 0.25),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(AppSpacing.md),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.2),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.qr_code_scanner,
                            size: 40,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        const Text(
                          'SCAN QR WALLET',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                            letterSpacing: 1.1,
                          ),
                        ),
                        const SizedBox(height: 2),
                        const Text(
                          "Scan wallet to start purchase or view balance",
                          style: TextStyle(
                            fontSize: 13,
                            color: Colors.white70,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.md),

              // 2b. Today at a Glance Summary Card (Clickable to Analytics)
              Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: () => _safePush('/app/analytics'),
                  borderRadius: AppSpacing.roundedMd,
                  child: AppCard(
                    padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 14),
                    child: Row(
                      children: [
                        // Revenue
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Today\'s Sales',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: AppColors.textSecondaryLight,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              const SizedBox(height: 2),
                              analyticsState.isLoading
                                  ? const Text(
                                      '···',
                                      style: TextStyle(
                                        fontSize: 20,
                                        fontWeight: FontWeight.bold,
                                        color: AppColors.primary,
                                      ),
                                    )
                                  : Text(
                                      todayMetric != null
                                          ? '₹${todayMetric.purchaseVolume.toStringAsFixed(0)}'
                                          : '—',
                                      style: const TextStyle(
                                        fontSize: 20,
                                        fontWeight: FontWeight.bold,
                                        color: AppColors.primary,
                                      ),
                                    ),
                            ],
                          ),
                        ),
                        Container(
                          width: 1,
                          height: 36,
                          color: AppColors.borderLight,
                          margin: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
                        ),
                        // Transactions
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Transactions',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: AppColors.textSecondaryLight,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              const SizedBox(height: 2),
                              analyticsState.isLoading
                                  ? const Text(
                                      '···',
                                      style: TextStyle(
                                        fontSize: 20,
                                        fontWeight: FontWeight.bold,
                                        color: AppColors.textPrimaryLight,
                                      ),
                                    )
                                  : Text(
                                      todayMetric != null
                                          ? '${todayMetric.purchaseCount} orders'
                                          : '—',
                                      style: const TextStyle(
                                        fontSize: 20,
                                        fontWeight: FontWeight.bold,
                                        color: AppColors.textPrimaryLight,
                                      ),
                                    ),
                            ],
                          ),
                        ),
                        const Icon(
                          Icons.arrow_forward_ios_rounded,
                          color: AppColors.textTertiaryLight,
                          size: 14,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.xl),
            ],
          ),
        ),
      ),
    );
  }

}

