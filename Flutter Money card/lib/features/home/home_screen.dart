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
    });
  }

  void _safePush(String route) {
    if (GoRouter.maybeOf(context) != null) {
      context.push(route);
    }
  }

  void _safeGo(String route) {
    if (GoRouter.maybeOf(context) != null) {
      context.go(route);
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

    final canIssueCard = permissionChecker.hasPermission(AppPermission.cardIssue);
    final analyticsState = ref.watch(analyticsNotifierProvider);
    final todayMetric = analyticsState.analytics;

    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            await Future.wait([
              sessionNotifier.loadSessions(),
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

              // 1.5 Prominent Role Specification Banner (Manager vs Staff)
              _buildRoleSpecificationBanner(context, user, permissionChecker),

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
                          'SCAN QR CARD',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                            letterSpacing: 1.1,
                          ),
                        ),
                        const SizedBox(height: 2),
                        const Text(
                          "Scan card to start purchase or view balance",
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

              // 2b. Today at a Glance Summary Card
              AppCard(
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
                      Icons.bar_chart_rounded,
                      color: AppColors.primary,
                      size: 22,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              Row(
                children: [
                  if (canIssueCard) ...[
                    Expanded(
                      child: _buildQuickActionCard(
                        icon: Icons.add_card,
                        label: 'Issue Card',
                        onTap: () => _safePush('/app/cards/issue'),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                  ],
                  Expanded(
                    child: _buildQuickActionCard(
                      icon: Icons.receipt_long_outlined,
                      label: 'Recharges',
                      onTap: () => _safePush('/app/recharges'),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: _buildQuickActionCard(
                      icon: Icons.restaurant_menu_outlined,
                      label: 'Menu',
                      onTap: () => _safeGo('/app/products'),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: _buildQuickActionCard(
                      icon: Icons.inventory_2_outlined,
                      label: 'Inventory',
                      onTap: () => _safePush('/app/inventory'),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: _buildQuickActionCard(
                      icon: Icons.analytics_outlined,
                      label: 'Analytics',
                      onTap: () => _safeGo('/app/analytics'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.xl),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildQuickActionCard({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return AppCard(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: AppColors.primary, size: 22),
          const SizedBox(height: 6),
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimaryLight,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildRoleSpecificationBanner(
    BuildContext context,
    dynamic user,
    dynamic permissionChecker,
  ) {
    if (user == null) return const SizedBox.shrink();

    final isManager = user.role == 'STAFF'
        ? permissionChecker.hasPermission(AppPermission.recharge)
        : (user.role == 'ORG_ADMIN' || user.role == 'SUPER_ADMIN');

    if (isManager) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: AppColors.successLight,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.success.withValues(alpha: 0.35), width: 1.5),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: AppColors.primaryDark,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(
                    Icons.admin_panel_settings,
                    color: Colors.white,
                    size: 18,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text(
                        'Logged in as Counter Manager',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primaryDark,
                        ),
                      ),
                      Text(
                        'Full Control: Card Recharge, Refunds, Menu & Analytics',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                          color: AppColors.textSecondaryLight,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 6,
              runSpacing: 4,
              children: [
                _buildRoleCapabilityChip('Recharge & Issue', AppColors.primaryDark, AppColors.successLight),
                _buildRoleCapabilityChip('Refunds', AppColors.primaryDark, AppColors.successLight),
                _buildRoleCapabilityChip('Menu Management', AppColors.primaryDark, AppColors.successLight),
                _buildRoleCapabilityChip('Analytics', AppColors.primaryDark, AppColors.successLight),
              ],
            ),
          ],
        ),
      );
    }

    // Counter Staff
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: const Color(0xFFF0F9FF), // Sky blue 50
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFF0284C7).withValues(alpha: 0.35), width: 1.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: const Color(0xFF0284C7),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(
                  Icons.badge_rounded,
                  color: Colors.white,
                  size: 18,
                ),
              ),
              const SizedBox(width: 10),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Logged in as Counter Staff',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF0369A1),
                      ),
                    ),
                    Text(
                      'POS Billing, Amount Deduction & Menu Catalog',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                        color: AppColors.textSecondaryLight,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 6,
            runSpacing: 4,
            children: [
              _buildRoleCapabilityChip('POS Billing', const Color(0xFF0369A1), const Color(0xFFE0F2FE)),
              _buildRoleCapabilityChip('Deduct Amount', const Color(0xFF0369A1), const Color(0xFFE0F2FE)),
              _buildRoleCapabilityChip('Menu Catalog', const Color(0xFF0369A1), const Color(0xFFE0F2FE)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildRoleCapabilityChip(String label, Color textColor, Color bgColor) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: textColor.withValues(alpha: 0.2)),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 10.5,
          fontWeight: FontWeight.w600,
          color: textColor,
        ),
      ),
    );
  }
}

