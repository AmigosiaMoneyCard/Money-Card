import 'package:flutter/material.dart' hide Card;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';
import '../../models/branch.dart';
import '../../models/card.dart';
import '../../providers/branch_provider.dart';
import '../../providers/card_operations_provider.dart';
import '../../widgets/common/app_badge.dart';
import '../../widgets/common/app_card.dart';
import '../../widgets/states/app_empty_state.dart';
import '../../widgets/states/app_loading_view.dart';

class CardsScreen extends ConsumerStatefulWidget {
  const CardsScreen({super.key});

  @override
  ConsumerState<CardsScreen> createState() => _CardsScreenState();
}

class _CardsScreenState extends ConsumerState<CardsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(cardListNotifierProvider.notifier).loadCards(force: true);
    });
  }

  AppBadgeVariant _getStatusVariant(CardStatus status) {
    switch (status) {
      case CardStatus.available:
        return AppBadgeVariant.primary;
      case CardStatus.active:
        return AppBadgeVariant.success;
      case CardStatus.blocked:
        return AppBadgeVariant.error;
    }
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<Branch?>(currentBranchProvider, (previous, next) {
      if (next != null && next.id != previous?.id) {
        ref.read(cardListNotifierProvider.notifier).loadCards(force: true);
      }
    });

    final cardListState = ref.watch(cardListNotifierProvider);
    final notifier = ref.read(cardListNotifierProvider.notifier);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Active Wallets'),
      ),
      body: Column(
        children: [
          // Search Header
          Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: TextField(
              onChanged: notifier.setSearchQuery,
              decoration: const InputDecoration(
                hintText: 'Search active wallets by wallet number...',
                prefixIcon: Icon(Icons.search, size: 20),
                isDense: true,
              ),
            ),
          ),
          const Divider(height: 1),

          // Cards List Content
          Expanded(
            child: RefreshIndicator(
              onRefresh: notifier.loadCards,
              child: _buildListContent(context, cardListState, notifier),
            ),
          ),
        ],
      ),
    );
  }


  Widget _buildListContent(
    BuildContext context,
    CardListState state,
    CardListNotifier notifier,
  ) {
    if (state.isLoading) {
      return const AppLoadingView(message: 'Loading counter wallets...');
    }

    if (state.errorMessage != null) {
      return Center(
        child: Padding(
          padding: AppSpacing.paddingLg,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                state.errorMessage!,
                style: const TextStyle(color: AppColors.error),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.md),
              ElevatedButton(
                onPressed: notifier.loadCards,
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    if (state.cards.isEmpty) {
      return RefreshIndicator(
        onRefresh: () => notifier.loadCards(),
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          children: const [
            SizedBox(height: 100),
            AppEmptyState(
              title: 'No Wallets Found',
              description: 'No wallets match the selected filter.',
              icon: Icons.account_balance_wallet_outlined,
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => notifier.loadCards(),
      child: ListView.separated(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: AppSpacing.paddingMd,
        itemCount: state.cards.length,
        separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
        itemBuilder: (context, index) {
        final card = state.cards[index];
        return AppCard(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 12),
          onTap: () => context.push('/app/cards/${card.id}'),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(AppSpacing.sm),
                decoration: BoxDecoration(
                  color: AppColors.primaryLight,
                  borderRadius: AppSpacing.roundedSm,
                ),
                child: const Icon(Icons.account_balance_wallet_outlined, color: AppColors.primaryDark, size: 20),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      card.physicalCardNumber,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      card.status == CardStatus.active ? 'Active Session' : 'Ready for Issuance',
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.textSecondaryLight,
                      ),
                    ),
                  ],
                ),
              ),
              AppBadge(
                label: card.status.value,
                variant: _getStatusVariant(card.status),
              ),
              const SizedBox(width: AppSpacing.xs),
              const Icon(Icons.chevron_right, size: 18, color: AppColors.textTertiaryLight),
            ],
          ),
        );
      },
      ),
    );
  }
}

