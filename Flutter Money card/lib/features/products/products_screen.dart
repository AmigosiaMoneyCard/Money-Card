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
import '../../providers/api_providers.dart';

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
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showAddProductBottomSheet(context, ref, currentBranch),
        icon: const Icon(Icons.add),
        label: const Text('Add Menu Item'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
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
                        'Cafeteria: ${currentBranch?.name ?? "Main Cafeteria"}',
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

        return AppCard(
          padding: AppSpacing.paddingMd,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(AppSpacing.sm),
                decoration: const BoxDecoration(
                  color: AppColors.primaryLight,
                  borderRadius: AppSpacing.roundedSm,
                ),
                child: const Icon(
                  Icons.restaurant_menu,
                  color: AppColors.primary,
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
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        AppBadge(
                          label: product.status,
                          variant: isActive ? AppBadgeVariant.success : AppBadgeVariant.neutral,
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '₹${product.price.toStringAsFixed(2)}',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
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

  void _showAddProductBottomSheet(BuildContext context, WidgetRef ref, Branch? currentBranch) {
    if (currentBranch == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select an active cafeteria counter first.'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    final nameController = TextEditingController();
    final priceController = TextEditingController();
    String selectedCategory = 'Veg';
    bool isSaving = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Container(
              padding: EdgeInsets.only(
                left: AppSpacing.md,
                right: AppSpacing.md,
                top: AppSpacing.md,
                bottom: MediaQuery.of(context).viewInsets.bottom + AppSpacing.md,
              ),
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Container(
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                          color: AppColors.borderLight,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Add Menu Item',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: AppColors.textPrimaryLight,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppColors.primaryLight,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            'Counter: ${currentBranch.name}',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: AppColors.primaryDark,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.md),
                    TextField(
                      controller: nameController,
                      decoration: InputDecoration(
                        labelText: 'Item Name',
                        hintText: 'e.g. Veg Biryani',
                        prefixIcon: const Icon(Icons.restaurant_menu),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    TextField(
                      controller: priceController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: InputDecoration(
                        labelText: 'Price (₹)',
                        hintText: 'e.g. 50.00',
                        prefixIcon: const Icon(Icons.currency_rupee),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    const Text(
                      'Category',
                      style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Wrap(
                      spacing: 8,
                      children: ['Veg', 'Non-Veg', 'Beverages', 'Snacks', 'Meals'].map((cat) {
                        final isSel = selectedCategory == cat;
                        return ChoiceChip(
                          label: Text(cat),
                          selected: isSel,
                          onSelected: (_) => setModalState(() => selectedCategory = cat),
                          selectedColor: AppColors.primaryLight,
                          labelStyle: TextStyle(
                            fontWeight: isSel ? FontWeight.bold : FontWeight.normal,
                            color: isSel ? AppColors.primaryDark : AppColors.textPrimaryLight,
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        onPressed: isSaving
                            ? null
                            : () async {
                                final name = nameController.text.trim();
                                final price = double.tryParse(priceController.text.trim());
                                if (name.isEmpty) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text('Please enter an item name')),
                                  );
                                  return;
                                }
                                if (price == null || price <= 0) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text('Please enter a valid price')),
                                  );
                                  return;
                                }

                                setModalState(() => isSaving = true);
                                try {
                                  await ref.read(productRepositoryProvider).createProduct(
                                        branchId: currentBranch.id,
                                        itemName: name,
                                        category: [selectedCategory],
                                        price: price,
                                        status: 'ACTIVE',
                                      );
                                  if (context.mounted) {
                                    Navigator.pop(ctx);
                                    ref.read(posCatalogNotifierProvider.notifier).loadProducts(force: true);
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Text('Added "$name" to ${currentBranch.name}!'),
                                        backgroundColor: AppColors.success,
                                      ),
                                    );
                                  }
                                } catch (e) {
                                  setModalState(() => isSaving = false);
                                  if (context.mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Text('Failed to add item: $e'),
                                        backgroundColor: AppColors.error,
                                      ),
                                    );
                                  }
                                }
                              },
                        child: isSaving
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                              )
                            : const Text('Add to Menu', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }
}
