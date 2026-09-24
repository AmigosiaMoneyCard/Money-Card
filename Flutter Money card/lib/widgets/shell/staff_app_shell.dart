import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';
import '../../core/constants/permission_constants.dart';
import '../../models/branch.dart';
import '../../providers/auth_provider.dart';
import '../../providers/branch_provider.dart';
import '../../providers/card_operations_provider.dart';
import '../../providers/permission_provider.dart';
import '../../providers/session_operations_provider.dart';
import '../no_internet_banner.dart';

class StaffAppShell extends ConsumerStatefulWidget {
  final Widget child;
  final String currentPath;

  const StaffAppShell({
    super.key,
    required this.child,
    required this.currentPath,
  });

  @override
  ConsumerState<StaffAppShell> createState() => _StaffAppShellState();
}

class _StaffAppShellState extends ConsumerState<StaffAppShell> with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(authNotifierProvider.notifier).refreshCurrentUser();
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      // Programmatic refresh on app resume
      ref.read(authNotifierProvider.notifier).refreshCurrentUser();
      ref.read(branchNotifierProvider.notifier).refreshBranchesSilently();
      ref.read(sessionListNotifierProvider.notifier).loadSessions();
      ref.read(cardListNotifierProvider.notifier).loadCards();
    }
  }

  int _calculateSelectedIndex(bool isManager) {
    if (widget.currentPath.startsWith('/app/cards')) return 1;
    if (widget.currentPath.startsWith('/app/products')) return 2;
    if (isManager && widget.currentPath.startsWith('/app/analytics')) return 3;
    return 0; // Home
  }

  void _onItemTapped(int index, BuildContext context, bool isManager) {
    switch (index) {
      case 0:
        context.go('/app/home');
        break;
      case 1:
        context.go('/app/cards');
        break;
      case 2:
        context.go('/app/products');
        break;
      case 3:
        if (isManager) {
          context.go('/app/analytics');
        }
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);
    final permissionChecker = ref.watch(permissionCheckerProvider);
    final isManager = user?.role == 'STAFF'
        ? permissionChecker.hasPermission(AppPermission.recharge)
        : (user?.role == 'ORG_ADMIN' || user?.role == 'SUPER_ADMIN');

    final branchState = ref.watch(branchNotifierProvider);
    final currentBranch = branchState.currentBranch;
    final assignedBranches = branchState.assignedBranches;

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(AppSpacing.xs),
              decoration: const BoxDecoration(
                color: AppColors.primaryLight,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.credit_card,
                size: 20,
                color: AppColors.primaryDark,
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            const Text(
              'Money Card',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(width: AppSpacing.sm),
            if (currentBranch != null)
              _buildBranchSelector(context, ref, currentBranch, assignedBranches),
          ],
        ),
        actions: [
          _buildUserProfileMenu(context, ref, user?.name ?? 'Staff'),
        ],
      ),
      body: Column(
        children: [
          const NoInternetBanner(),
          Expanded(child: SafeArea(child: widget.child)),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _calculateSelectedIndex(isManager),
        onDestinationSelected: (idx) => _onItemTapped(idx, context, isManager),
        destinations: [
          const NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'Home',
          ),
          const NavigationDestination(
            icon: Icon(Icons.account_balance_wallet_outlined),
            selectedIcon: Icon(Icons.account_balance_wallet),
            label: 'Wallets',
          ),
          const NavigationDestination(
            icon: Icon(Icons.restaurant_menu_outlined),
            selectedIcon: Icon(Icons.restaurant_menu),
            label: 'Menu',
          ),
          if (isManager)
            const NavigationDestination(
              icon: Icon(Icons.bar_chart_outlined),
              selectedIcon: Icon(Icons.bar_chart),
              label: 'Analytics',
            ),
        ],
      ),
    );
  }

  Widget _buildBranchSelector(
    BuildContext context,
    WidgetRef ref,
    Branch currentBranch,
    List<Branch> assignedBranches,
  ) {
    if (assignedBranches.length <= 1) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
          color: AppColors.primaryLight,
          borderRadius: AppSpacing.roundedSm,
        ),
        child: Text(
          currentBranch.name,
          style: const TextStyle(
            color: AppColors.primaryDark,
            fontSize: 12,
            fontWeight: FontWeight.w600,
          ),
        ),
      );
    }

    return PopupMenuButton<Branch>(
      initialValue: currentBranch,
      onSelected: (branch) {
        ref.read(branchNotifierProvider.notifier).selectBranch(branch);
      },
      itemBuilder: (context) {
        return assignedBranches.map((branch) {
          return PopupMenuItem<Branch>(
            value: branch,
            child: Row(
              children: [
                Icon(
                  Icons.storefront,
                  size: 18,
                  color: branch.id == currentBranch.id
                      ? AppColors.primary
                      : AppColors.textSecondaryLight,
                ),
                const SizedBox(width: AppSpacing.sm),
                Text(
                  branch.name,
                  style: TextStyle(
                    fontWeight: branch.id == currentBranch.id
                        ? FontWeight.bold
                        : FontWeight.normal,
                  ),
                ),
              ],
            ),
          );
        }).toList();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
          color: AppColors.primaryLight,
          borderRadius: AppSpacing.roundedSm,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              currentBranch.name,
              style: const TextStyle(
                color: AppColors.primaryDark,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(width: 2),
            const Icon(
              Icons.arrow_drop_down,
              size: 16,
              color: AppColors.primaryDark,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildUserProfileMenu(BuildContext context, WidgetRef ref, String userName) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: Center(
        child: InkWell(
          onTap: () => context.push('/app/profile'),
          borderRadius: BorderRadius.circular(20),
          child: const CircleAvatar(
            radius: 16,
            backgroundColor: AppColors.primaryLight,
            child: Icon(Icons.person, size: 18, color: AppColors.primary),
          ),
        ),
      ),
    );
  }
}
