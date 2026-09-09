import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';
import '../../models/branch.dart';
import '../../providers/branch_provider.dart';
import '../../providers/pos_cart_provider.dart';
import '../../widgets/common/app_badge.dart';
import '../../widgets/common/app_card.dart';
import '../../widgets/states/app_empty_state.dart';
import '../../widgets/states/app_loading_view.dart';

class ProductsScreen extends ConsumerStatefulWidget {
  const ProductsScreen({super.key});

  @override
  ConsumerState<ProductsScreen> createState() => _ProductsScreenState();
}

class _ProductsScreenState extends ConsumerState<ProductsScreen> {
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(posCatalogNotifierProvider.notifier).loadProducts();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<Branch?>(currentBranchProvider, (previous, next) {
      if (next != null && next.id != previous?.id) {
        ref.read(posCatalogNotifierProvider.notifier).loadProducts(force: true);
      }
    });

    final catalogState = ref.watch(posCatalogNotifierProvider);
    final notifier = ref.read(posCatalogNotifierProvider.notifier);
    final branchState = ref.watch(branchNotifierProvider);
    final currentBranch = branchState.currentBranch;
    final assignedBranches = branchState.assignedBranches;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Products & Menu'),
        actions: [
          if (assignedBranches.length > 1 && currentBranch != null)
            Padding(
              padding: const EdgeInsets.only(right: AppSpacing.sm),
              child: _buildBranchSwitcher(context, ref, currentBranch, assignedBranches),
            ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Branch Information Card
            Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.md,
                AppSpacing.sm,
                AppSpacing.md,
                AppSpacing.xs,
              ),
              child: AppCard(
                padding: AppSpacing.paddingSm,
                child: Row(
                  children: [
                    const Icon(Icons.storefront, size: 20, color: AppColors.primary),
                    const SizedBox(width: AppSpacing.xs),
                    Expanded(
                      child: Text(
                        'Counter: ${currentBranch?.name ?? "Main Cafeteria"}',
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                        ),
                      ),
                    ),
                    if (assignedBranches.length > 1 && currentBranch != null)
                      _buildBranchSwitcher(context, ref, currentBranch, assignedBranches),
                  ],
                ),
              ),
            ),

            // Search Bar
            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.md,
                vertical: AppSpacing.xs,
              ),
              child: TextField(
                controller: _searchController,
                decoration: InputDecoration(
                  hintText: 'Search products by name...',
                  prefixIcon: const Icon(Icons.search, size: 20),
                  suffixIcon: _searchController.text.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear, size: 18),
                          onPressed: () {
                            _searchController.clear();
                            notifier.setSearchQuery('');
                          },
                        )
                      : null,
                  isDense: true,
                ),
                onChanged: notifier.setSearchQuery,
              ),
            ),

            // Multi-Select Category Filters
            if (catalogState.availableCategories.isNotEmpty)
              Container(
                height: 48,
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
                  itemCount: catalogState.availableCategories.length,
                  separatorBuilder: (_, _) => const SizedBox(width: AppSpacing.xs),
                  itemBuilder: (context, index) {
                    final category = catalogState.availableCategories[index];
                    final isSelected = catalogState.selectedCategory == category;

                    return FilterChip(
                      label: Text(category),
                      selected: isSelected,
                      onSelected: (_) => notifier.setCategoryFilter(category),
                      backgroundColor: AppColors.surfaceLight,
                      selectedColor: AppColors.primaryLight,
                      labelStyle: TextStyle(
                        fontSize: 12,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                        color: isSelected ? AppColors.primaryDark : AppColors.textPrimaryLight,
                      ),
                    );
                  },
                ),
              ),

            const Divider(height: 1),

            // Products Catalog List
            Expanded(
              child: RefreshIndicator(
                onRefresh: () async {
                  await notifier.loadProducts(force: true);
                },
                child: _buildProductsList(catalogState, notifier),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBranchSwitcher(
    BuildContext context,
    WidgetRef ref,
    Branch currentBranch,
    List<Branch> assignedBranches,
  ) {
    return PopupMenuButton<Branch>(
      initialValue: currentBranch,
      onSelected: (branch) {
        ref.read(branchNotifierProvider.notifier).selectBranch(branch);
        ref.read(posCatalogNotifierProvider.notifier).loadProducts(force: true);
      },
      itemBuilder: (context) {
        return assignedBranches.map((branch) {
          final isSelected = branch.id == currentBranch.id;
          return PopupMenuItem<Branch>(
            value: branch,
            child: Row(
              children: [
                Icon(
                  Icons.storefront,
                  size: 18,
                  color: isSelected ? AppColors.primary : AppColors.textSecondaryLight,
                ),
                const SizedBox(width: AppSpacing.sm),
                Text(
                  branch.name,
                  style: TextStyle(
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                    color: isSelected ? AppColors.primaryDark : AppColors.textPrimaryLight,
                  ),
                ),
              ],
            ),
          );
        }).toList();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: AppColors.primaryLight,
          borderRadius: AppSpacing.roundedSm,
          border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
        ),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.swap_horiz, size: 14, color: AppColors.primaryDark),
            SizedBox(width: 4),
            Text(
              'Switch',
              style: TextStyle(
                color: AppColors.primaryDark,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
            Icon(Icons.arrow_drop_down, size: 14, color: AppColors.primaryDark),
          ],
        ),
      ),
    );
  }

  Widget _buildProductsList(PosCatalogState state, PosCatalogNotifier notifier) {
    if (state.isLoading) {
      return const AppLoadingView(message: 'Loading product catalog...');
    }

    if (state.errorMessage != null) {
      return Center(
        child: Padding(
          padding: AppSpacing.paddingLg,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48, color: AppColors.error),
              const SizedBox(height: AppSpacing.sm),
              Text(
                state.errorMessage!,
                style: const TextStyle(color: AppColors.error),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.md),
              ElevatedButton(
                onPressed: () => notifier.loadProducts(force: true),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    final products = state.filteredProducts;

    if (products.isEmpty) {
      if (state.searchQuery.isNotEmpty || state.selectedCategory != 'All') {
        return const AppEmptyState(
          title: 'No Matching Products',
          description: 'No products match your search or category filter.',
          icon: Icons.search_off,
        );
      }
      return AppEmptyState.noProducts();
    }

    return ListView.separated(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: AppSpacing.paddingMd,
      itemCount: products.length,
      separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
      itemBuilder: (context, index) {
        final product = products[index];
        final isActive = product.status.toUpperCase() == 'ACTIVE';
        final isOut = product.isOutOfStock;

        return AppCard(
          padding: AppSpacing.paddingMd,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(AppSpacing.sm),
                decoration: BoxDecoration(
                  color: isOut ? AppColors.errorLight.withValues(alpha: 0.3) : AppColors.primaryLight,
                  borderRadius: AppSpacing.roundedSm,
                ),
                child: Icon(
                  Icons.restaurant_menu,
                  color: isOut ? AppColors.error : AppColors.primary,
                  size: 24,
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            product.itemName,
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: isOut ? AppColors.textSecondaryLight : null,
                            ),
                          ),
                        ),
                        if (isOut)
                          const AppBadge(
                            label: 'Out of Stock',
                            variant: AppBadgeVariant.error,
                          )
                        else ...[
                          AppBadge(
                            label: product.status,
                            variant: isActive ? AppBadgeVariant.success : AppBadgeVariant.neutral,
                          ),
                          const SizedBox(width: 4),
                          AppBadge(
                            label: '${product.currentStock} in stock',
                            variant: product.currentStock <= 10 ? AppBadgeVariant.warning : AppBadgeVariant.primary,
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '₹${product.price.toStringAsFixed(2)}',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: isOut ? AppColors.textSecondaryLight : AppColors.primary,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    if (product.category.isNotEmpty)
                      Wrap(
                        spacing: 4,
                        runSpacing: 4,
                        children: product.category.map((cat) {
                          return Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.surfaceLight,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: AppColors.borderLight),
                            ),
                            child: Text(
                              cat,
                              style: const TextStyle(
                                fontSize: 11,
                                color: AppColors.textSecondaryLight,
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
