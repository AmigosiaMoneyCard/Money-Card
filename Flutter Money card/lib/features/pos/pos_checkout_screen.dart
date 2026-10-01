import '../../widgets/states/app_unauthorized_state.dart';
import '../../providers/permission_provider.dart';
import '../../core/constants/permission_constants.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';
import '../../core/errors/api_exception.dart';
import '../../core/utils/formatters.dart';
import '../../models/branch.dart';
import '../../models/card_session.dart';
import '../../models/product.dart';
import '../../models/receipt_bill.dart';
import '../../models/transaction.dart';
import '../../providers/analytics_provider.dart';
import '../../providers/api_providers.dart';
import '../../providers/auth_provider.dart';
import '../../providers/branch_provider.dart';
import '../../providers/pos_cart_provider.dart';
import '../../providers/session_operations_provider.dart';
import '../../widgets/common/app_badge.dart';
import '../../widgets/common/app_bottom_sheet.dart';
import '../../widgets/common/app_button.dart';
import '../../widgets/common/app_card.dart';
import '../../widgets/states/app_empty_state.dart';
import '../../widgets/states/app_loading_view.dart';
import '../receipt/bill_receipt_screen.dart';

class PosCheckoutScreen extends ConsumerStatefulWidget {
  final String sessionId;

  const PosCheckoutScreen({
    super.key,
    required this.sessionId,
  });

  @override
  ConsumerState<PosCheckoutScreen> createState() => _PosCheckoutScreenState();
}

class _PosCheckoutScreenState extends ConsumerState<PosCheckoutScreen> {
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(sessionDetailsNotifierProvider.notifier).loadSessionById(widget.sessionId);
      final catalogState = ref.read(posCatalogNotifierProvider);
      if (catalogState.products.isEmpty && !catalogState.isLoading) {
        ref.read(posCatalogNotifierProvider.notifier).loadProducts();
      }
      ref.read(posCartNotifierProvider.notifier).clearCart();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _showCartBottomSheet() {
    AppBottomSheet.show(
      context,
      title: 'Current Cart',
      trailing: TextButton(
        onPressed: () {
          ref.read(posCartNotifierProvider.notifier).clearCart();
          Navigator.of(context).pop();
        },
        child: const Text('Clear Cart', style: TextStyle(color: AppColors.error)),
      ),
      child: Consumer(
        builder: (context, ref, _) {
          final cartState = ref.watch(posCartNotifierProvider);
          final cartNotifier = ref.read(posCartNotifierProvider.notifier);

          if (cartState.isEmpty) {
            return const Padding(
              padding: EdgeInsets.all(AppSpacing.lg),
              child: Center(
                child: Text('Your cart is empty.'),
              ),
            );
          }

          return Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ConstrainedBox(
                constraints: const BoxConstraints(maxHeight: 280),
                child: ListView.separated(
                  shrinkWrap: true,
                  itemCount: cartState.cartItemList.length,
                  separatorBuilder: (_, _) => const Divider(height: 1),
                  itemBuilder: (context, idx) {
                    final item = cartState.cartItemList[idx];
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  item.product.itemName,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w600,
                                    fontSize: 14,
                                  ),
                                ),
                                Text(
                                  '₹${item.unitPrice.toStringAsFixed(2)} × ${item.quantity}',
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: AppColors.textSecondaryLight,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Text(
                            '₹${item.itemTotal.toStringAsFixed(2)}',
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 15,
                              color: AppColors.primary,
                            ),
                          ),
                          const SizedBox(width: AppSpacing.md),
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              IconButton(
                                icon: const Icon(Icons.remove_circle_outline, size: 20),
                                onPressed: () => cartNotifier.decreaseQuantity(item.product.id),
                              ),
                              Text(
                                '${item.quantity}',
                                style: const TextStyle(fontWeight: FontWeight.bold),
                              ),
                              IconButton(
                                icon: const Icon(
                                  Icons.add_circle_outline,
                                  size: 20,
                                ),
                                onPressed: () => cartNotifier.increaseQuantity(item.product.id),
                              ),
                            ],
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
              const Divider(height: 1),
              Padding(
                padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Bill Total',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    Text(
                      '₹${cartState.totalAmount.toStringAsFixed(2)}',
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                      ),
                    ),
                  ],
                ),
              ),
              Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  AppButton(
                    label: 'Confirm & Charge Balance',
                    icon: Icons.check_circle_outline,
                    isLoading: cartState.isSubmitting,
                    onPressed: () {
                      Navigator.of(context).pop();
                      _handleConfirmPurchase();
                    },
                  ),
                ],
              ),
            ],
          );
        },
      ),
    );
  }

  Future<void> _handleConfirmPurchase() async {
    final cartState = ref.read(posCartNotifierProvider);
    final sessionState = ref.read(sessionDetailsNotifierProvider);

    if (cartState.isEmpty) return;

    final currentBalance = sessionState.session?.balance ?? 0.0;
    if (cartState.totalAmount > currentBalance) {
      final shortfall = cartState.totalAmount - currentBalance;
      await showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          icon: const Icon(Icons.warning_amber_rounded, color: AppColors.warning, size: 40),
          title: const Text(
            'Card Balance Insufficient',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
            textAlign: TextAlign.center,
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'This purchase cannot be completed because the card does not have enough balance.',
                style: TextStyle(color: AppColors.textSecondaryLight, fontSize: 14),
              ),
              const SizedBox(height: AppSpacing.md),
              Container(
                padding: const EdgeInsets.all(AppSpacing.sm),
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
                        const Text('Available Balance:'),
                        Text('₹${currentBalance.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold)),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Purchase Total:'),
                        Text('₹${cartState.totalAmount.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary)),
                      ],
                    ),
                    const Divider(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Amount Short:', style: TextStyle(fontWeight: FontWeight.w600, color: AppColors.error)),
                        Text('₹${shortfall.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.error)),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              const Text(
                'Please recharge the card first or reduce the cart items.',
                style: TextStyle(fontSize: 12, color: AppColors.textSecondaryLight),
              ),
            ],
          ),
          actions: [
            ElevatedButton(
              onPressed: () => Navigator.of(context).pop(),
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, foregroundColor: Colors.white),
              child: const Text('OK, Got It'),
            ),
          ],
        ),
      );
      return;
    }

    // Directly execute purchase without intermediate confirm dialog
    final result = await ref
        .read(posCartNotifierProvider.notifier)
        .executePurchase(widget.sessionId);

    if (result != null && mounted) {
      // Update session balance in riverpod
      ref
          .read(sessionDetailsNotifierProvider.notifier)
          .updateSessionBalance(result.balance);

      // Show Purchase Success Dialog
      _showPurchaseSuccessDialog(result);
    } else if (mounted) {
      final error = ref.read(posCartNotifierProvider).errorMessage ?? 'Purchase failed';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  void _showPurchaseSuccessDialog(PurchaseResult result) {
    final branch = ref.read(currentBranchProvider);
    final user = ref.read(currentUserProvider);
    final cart = ref.read(posCartNotifierProvider);
    final session = ref.read(sessionDetailsNotifierProvider).session;

    final billItems = cart.items.values.map((item) => ReceiptBillItem(
      name: item.product.itemName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.itemTotal,
    )).toList();

    final totalAmount = result.amount > 0 ? result.amount : cart.totalAmount;
    final remainingBalance = result.balance;
    final previousBalance = (result.balanceBefore != null && result.balanceBefore! > 0)
        ? result.balanceBefore!
        : ((session?.balance != null && session!.balance > 0)
            ? session.balance
            : (remainingBalance + totalAmount));
    final amountDeducted = totalAmount;

    final bill = ReceiptBill(
      organizationName: 'MONEY CARD',
      branchName: branch?.name ?? 'Main Cafeteria',
      receiptTitle: 'SALES RECEIPT',
      transactionId: result.transactionId.isNotEmpty
          ? result.transactionId
          : 'TXN-${DateTime.now().millisecondsSinceEpoch}',
      timestamp: DateTime.now(),
      cardIdentifier: session?.displayCardNumber ?? 'Active Card',
      sessionId: session?.id ?? widget.sessionId,
      staffName: user?.name,
      items: billItems,
      subtotal: totalAmount,
      totalAmount: totalAmount,
      previousBalance: previousBalance,
      amountDeducted: amountDeducted,
      remainingBalance: remainingBalance,
      paymentMethod: 'Card Session',
      sessionStatus: 'ACTIVE',
    );

    ref.read(posCartNotifierProvider.notifier).clearCart();
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (context) => BillReceiptScreen(
          bill: bill,
          onDone: () {
            if (Navigator.of(context).canPop()) {
              Navigator.of(context).pop();
            }
          },
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final hasPurchasePermission = ref.watch(hasPermissionProvider(AppPermission.purchase));
    if (!hasPurchasePermission) {
      return Scaffold(
        appBar: AppBar(title: const Text('Billing')),
        body: const SafeArea(child: AppUnauthorizedState()),
      );
    }

    final catalogState = ref.watch(posCatalogNotifierProvider);
    final catalogNotifier = ref.read(posCatalogNotifierProvider.notifier);
    final cartState = ref.watch(posCartNotifierProvider);
    final cartNotifier = ref.read(posCartNotifierProvider.notifier);
    final sessionState = ref.watch(sessionDetailsNotifierProvider);
    final session = sessionState.session;

    // React to branch changes
    ref.listen<Branch?>(currentBranchProvider, (previous, next) {
      if (next != null && next.id != previous?.id) {
        ref.read(posCatalogNotifierProvider.notifier).loadProducts(force: true);
      }
    });

    // Notify user of cart errors (such as out-of-stock prevention)
    ref.listen<PosCartState>(posCartNotifierProvider, (previous, next) {
      if (next.errorMessage != null && next.errorMessage != previous?.errorMessage) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(next.errorMessage!),
            backgroundColor: AppColors.error,
            behavior: SnackBarBehavior.floating,
            duration: const Duration(seconds: 3),
          ),
        );
      }
    });

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Billing'),
            if (session != null)
              Text(
                'Balance: ₹${session.balance.toStringAsFixed(2)}',
                style: const TextStyle(fontSize: 12, color: AppColors.primary),
              ),
          ],
        ),
        actions: [
          TextButton.icon(
            style: TextButton.styleFrom(
              foregroundColor: AppColors.primary,
            ),
            icon: const Icon(Icons.receipt_long_outlined, size: 20),
            label: const Text('Orders', style: TextStyle(fontWeight: FontWeight.bold)),
            onPressed: () {
              if (session != null) {
                _showOrdersBottomSheet(context, session);
              }
            },
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: Column(
        children: [
          // 1. Prominent Search Bar
          Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.md,
              AppSpacing.sm,
              AppSpacing.md,
              AppSpacing.xs,
            ),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search food or products',
                prefixIcon: const Icon(Icons.search, color: AppColors.primary, size: 22),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 20),
                        onPressed: () {
                          _searchController.clear();
                          catalogNotifier.setSearchQuery('');
                          setState(() {});
                        },
                      )
                    : null,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                filled: true,
                fillColor: AppColors.surfaceLight,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.borderLight),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.borderLight),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
                ),
                isDense: true,
              ),
              onChanged: (val) {
                catalogNotifier.setSearchQuery(val);
                setState(() {});
              },
            ),
          ),
          const Divider(height: 1),

          // Error Banner if purchase failed
          if (cartState.errorMessage != null) ...[
            Container(
              padding: AppSpacing.paddingMd,
              color: AppColors.errorLight,
              child: Row(
                children: [
                  const Icon(Icons.error_outline, color: AppColors.error, size: 20),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Text(
                      cartState.errorMessage!,
                      style: const TextStyle(color: AppColors.error, fontSize: 13),
                    ),
                  ),
                ],
              ),
            ),
          ],

          // 3. Product Catalog List
          Expanded(
            child: _buildCatalogContent(catalogState, cartState, cartNotifier),
          ),

          // 4. Bottom Floating Cart Bar (persists across search & filters)
          if (!cartState.isEmpty)
            Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: AppColors.surfaceLight,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.08),
                    blurRadius: 8,
                    offset: const Offset(0, -2),
                  ),
                ],
              ),
              child: SafeArea(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (session != null && cartState.totalAmount > session.balance) ...[
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        margin: const EdgeInsets.only(bottom: 8),
                        decoration: BoxDecoration(
                          color: AppColors.errorLight,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: AppColors.error.withValues(alpha: 0.3)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.warning_amber_rounded, size: 16, color: AppColors.error),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                'Short by ₹${(cartState.totalAmount - session.balance).toStringAsFixed(2)} — please recharge card',
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.error,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                    Row(
                      children: [
                        Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${cartState.totalItemCount} items selected',
                              style: const TextStyle(
                                fontSize: 12,
                                color: AppColors.textSecondaryLight,
                              ),
                            ),
                            Text(
                              '₹${cartState.totalAmount.toStringAsFixed(2)}',
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: AppColors.primary,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(width: AppSpacing.lg),
                        Expanded(
                          child: AppButton(
                            label: 'Preview Order (${cartState.totalItemCount})',
                            icon: Icons.shopping_cart_checkout,
                            height: 48,
                            isLoading: cartState.isSubmitting,
                            onPressed: cartState.isSubmitting ? null : _showCartBottomSheet,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildCatalogContent(
    PosCatalogState catalogState,
    PosCartState cartState,
    PosCartNotifier cartNotifier,
  ) {
    if (catalogState.isLoading) {
      return const AppLoadingView(message: 'Loading menu items...');
    }

    if (catalogState.filteredProducts.isEmpty) {
      return RefreshIndicator(
        onRefresh: () => ref.read(posCatalogNotifierProvider.notifier).loadCatalog(),
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          children: const [
            SizedBox(height: 80),
            AppEmptyState(
              title: 'No products found',
              description: 'No food items match your search or filter.',
              icon: Icons.search_off,
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => ref.read(posCatalogNotifierProvider.notifier).loadCatalog(),
      child: ListView.separated(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: AppSpacing.paddingMd,
        itemCount: catalogState.filteredProducts.length,
        separatorBuilder: (_, _) => const SizedBox(height: 10),
        itemBuilder: (context, index) {
          final product = catalogState.filteredProducts[index];
          final cartItem = cartState.items[product.id];
          final quantityInCart = cartItem?.quantity ?? 0;
          final isVeg = product.category.any((c) => c.toLowerCase() == 'veg');
          final isNonVeg = product.category.any((c) => c.toLowerCase() == 'non-veg');

          return AppCard(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // Veg/Non-veg icon container
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: isVeg
                        ? AppColors.successLight
                        : (isNonVeg ? AppColors.errorLight : AppColors.primaryLight),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    isVeg
                        ? Icons.eco
                        : (isNonVeg ? Icons.kebab_dining : Icons.fastfood_outlined),
                    color: isVeg
                        ? AppColors.success
                        : (isNonVeg ? AppColors.error : AppColors.primary),
                    size: 24,
                  ),
                ),
                const SizedBox(width: 12),

                // Middle: Product Name, Category tag, and Price
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              product.itemName,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.bold,
                                color: AppColors.textPrimaryLight,
                              ),
                            ),
                          ),
                          if (product.category.isNotEmpty) ...[
                            const SizedBox(width: 6),
                            AppBadge(
                              label: product.category.first,
                              variant: isVeg
                                  ? AppBadgeVariant.success
                                  : (isNonVeg ? AppBadgeVariant.error : AppBadgeVariant.neutral),
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '₹${product.price.toStringAsFixed(2)}',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),

                // Right: Add Button or Stepper
                if (quantityInCart == 0)
                  SizedBox(
                    height: 36,
                    child: ElevatedButton.icon(
                      icon: const Icon(Icons.add, size: 16),
                      label: const Text('Add', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        padding: const EdgeInsets.symmetric(horizontal: 14),
                        elevation: 0,
                      ),
                      onPressed: () => cartNotifier.addToCart(product),
                    ),
                  )
                else
                  Container(
                    height: 36,
                    decoration: BoxDecoration(
                      color: AppColors.primaryLight,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        InkWell(
                          onTap: () => cartNotifier.decreaseQuantity(product.id),
                          borderRadius: BorderRadius.circular(8),
                          child: const Padding(
                            padding: EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                            child: Icon(Icons.remove, size: 18, color: AppColors.primaryDark),
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 4),
                          child: Text(
                            '$quantityInCart',
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: AppColors.primaryDark,
                            ),
                          ),
                        ),
                        InkWell(
                          onTap: () => cartNotifier.increaseQuantity(product.id),
                          borderRadius: BorderRadius.circular(8),
                          child: const Padding(
                            padding: EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                            child: Icon(Icons.add, size: 18, color: AppColors.primaryDark),
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }

  void _showOrdersBottomSheet(BuildContext context, CardSession session) {
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
                        'Food Orders Placed',
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
                                    border: Border.all(color: AppColors.borderLight),
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

  Future<void> _handleCancelOrder(String txId, double amount, CardSession session) async {
    final reasons = [
      'Customer requested cancellation',
      'Incorrect items added',
      'Food not available',
      'Duplicate order placed',
      'Order changed before preparation',
      'Other Reason',
    ];
    String selectedReason = reasons.first;
    final customReasonCtrl = TextEditingController();

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => AlertDialog(
          title: Row(
            children: const [
              Icon(Icons.remove_shopping_cart_outlined, color: AppColors.error, size: 24),
              SizedBox(width: 8),
              Text('Cancel Food Order', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Are you sure you want to cancel this order? ₹${amount.toStringAsFixed(2)} will be refunded to wallet ${session.displayCardNumber}.',
                style: const TextStyle(fontSize: 14),
              ),
              const SizedBox(height: 12),
              const Text('Cancellation Reason:', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
              const SizedBox(height: 6),
              DropdownButtonFormField<String>(
                initialValue: selectedReason,
                isExpanded: true,
                items: reasons.map((r) => DropdownMenuItem(value: r, child: Text(r, style: const TextStyle(fontSize: 13)))).toList(),
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
      await ref.read(sessionDetailsNotifierProvider.notifier).loadSessionById(session.id);
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
      await ref.read(sessionDetailsNotifierProvider.notifier).loadSessionById(session.id);
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

  String _formatDateTime(String? raw) {
    if (raw == null || raw.isEmpty) return '—';
    final formatted = AppFormatters.formatIsoDate(raw);
    return formatted == '-' ? '—' : formatted;
  }
}
