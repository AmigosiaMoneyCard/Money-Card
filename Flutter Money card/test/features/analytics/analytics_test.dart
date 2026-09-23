import 'package:money_card_staff/core/config/app_config.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:money_card_staff/core/constants/permission_constants.dart';
import 'package:money_card_staff/features/analytics/analytics_screen.dart';
import 'package:money_card_staff/models/analytics.dart';
import 'package:money_card_staff/models/auth_user.dart';
import 'package:money_card_staff/models/branch.dart';
import 'package:money_card_staff/providers/analytics_provider.dart';
import 'package:money_card_staff/providers/auth_provider.dart';
import 'package:money_card_staff/providers/branch_provider.dart';
import 'package:money_card_staff/providers/api_providers.dart';
import 'package:money_card_staff/services/session_service.dart';
import 'package:money_card_staff/repositories/analytics_repository.dart';
import 'package:money_card_staff/repositories/branch_repository.dart';

class FakeBranchRepository implements BranchRepository {
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);

  @override
  Future<List<Branch>> getBranches({bool forceRefresh = false}) async => const [];
}

class FakeSessionService implements SessionService {
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);

  @override
  Future<Map<String, dynamic>> listRecharges({
    String? branchId,
    String? startDate,
    String? endDate,
    String? paymentMethod,
    String? status,
    String? search,
    int? page,
    int? limit,
  }) async {
    return {'items': []};
  }
}

class FakeAnalyticsRepository implements AnalyticsRepository {
  BranchPerformanceMetric metric = const BranchPerformanceMetric(
    branchId: 'b-1',
    branchName: 'Main Cafeteria',
    transactionCount: 148,
    purchaseCount: 96,
    purchaseVolume: 18450.0,
    rechargeCount: 52,
    rechargeVolume: 24800.0,
    totalRevenue: 43250.0,
    netMoneyCollected: 43250.0,
    activeSessionsCount: 12,
    settledSessionsCount: 84,
    avgTransactionValue: 292.23,
    avgPurchaseValue: 192.19,
    inventoryItemCount: 10,
    lowStockItemCount: 2,
    productDemand: [
      ProductDemand(
        productId: 'p-1',
        productName: 'Veg Burger',
        quantitySold: 42,
        totalRevenue: 5040.0,
      ),
    ],
    peakPeriods: [
      PeakPeriod(
        timeSlot: '12:00 PM – 1:00 PM',
        activityLevel: 'Highest',
        transactionCount: 54,
        purchaseVolume: 7200.0,
      ),
    ],
  );

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);

  @override
  Future<BranchPerformanceMetric> getBranchAnalytics({
    required String branchId,
    String? range,
    String? startDate,
    String? endDate,
  }) async {
    return metric;
  }
}

void main() {
  AppConfig.apiMode = ApiMode.mock;
  group('Staff Analytics Unit & Widget Tests', () {
    late FakeAnalyticsRepository fakeRepo;

    setUp(() {
      fakeRepo = FakeAnalyticsRepository();
    });

    test('AnalyticsNotifier loads branch metrics and changes date range', () async {
      final notifier = AnalyticsNotifier(fakeRepo, 'b-1');
      await notifier.loadAnalytics();

      expect(notifier.state.analytics, isNotNull);
      expect(notifier.state.analytics?.totalRevenue, 43250.0);
      expect(notifier.state.analytics?.transactionCount, 148);
      notifier.setCustomRange('2026-09-01', '2026-09-20');
      expect(notifier.state.selectedRange, '2026-09-01 to 2026-09-20');
      expect(notifier.state.customStartDate, '2026-09-01');
      expect(notifier.state.customEndDate, '2026-09-20');
    });

    testWidgets('AnalyticsScreen enforces permission guard and displays metrics without limits', (tester) async {
      const authorizedUser = AuthUser(
        id: 'staff-1',
        email: 'staff@moneycard.io',
        name: 'Alex Morgan',
        role: 'STAFF',
        organizationId: 'org-1',
        permissions: [AppPermission.viewAnalytics],
        assignedBranchIds: ['b-1'],
      );

      final analyticsNotifier = AnalyticsNotifier(fakeRepo, 'b-1');
      await analyticsNotifier.loadAnalytics();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentUserProvider.overrideWithValue(authorizedUser),
            branchNotifierProvider.overrideWith((ref) => BranchNotifier(FakeBranchRepository())),
            analyticsNotifierProvider.overrideWith((ref) => analyticsNotifier),
            sessionServiceProvider.overrideWithValue(FakeSessionService()),
          ],
          child: const MaterialApp(
            home: AnalyticsScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('₹24800.00'), findsOneWidget);
      expect(find.text('RECHARGE AMOUNT'), findsOneWidget);
      expect(find.text('Reset to Today'), findsOneWidget);
      expect(find.text('Apply'), findsOneWidget);
      expect(find.text('View PDF'), findsOneWidget);

      await tester.drag(find.byType(ListView).first, const Offset(0, -300));
      await tester.pumpAndSettle();
      expect(find.text('NET AMOUNT'), findsOneWidget);
      expect(find.text('₹43250.00'), findsOneWidget);

      // Verify tapping Reset to Today
      await tester.tap(find.text('Reset to Today'));
      await tester.pumpAndSettle();
      expect(find.text('Reset to Today'), findsOneWidget);

      // Verify NO transaction limits or quotas exist
      expect(find.textContaining(RegExp(r'limit', caseSensitive: false)), findsNothing);
      expect(find.textContaining(RegExp(r'quota', caseSensitive: false)), findsNothing);
    });

    testWidgets('AnalyticsScreen displays unauthorized state when VIEW_ANALYTICS is missing', (tester) async {
      const unauthorizedUser = AuthUser(
        id: 'staff-1',
        email: 'staff@moneycard.io',
        name: 'Alex Morgan',
        role: 'STAFF',
        organizationId: 'org-1',
        permissions: [AppPermission.cardView], // Missing viewAnalytics
        assignedBranchIds: ['b-1'],
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentUserProvider.overrideWithValue(unauthorizedUser),
          ],
          child: const MaterialApp(
            home: AnalyticsScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Access Restricted'), findsOneWidget);
    });

    testWidgets('AnalyticsScreen allows switching between assigned branches seamlessly', (tester) async {
      const authorizedUser = AuthUser(
        id: 'staff-1',
        email: 'staff@moneycard.io',
        name: 'Alex Morgan',
        role: 'STAFF',
        organizationId: 'org-1',
        permissions: [AppPermission.viewAnalytics],
        assignedBranchIds: ['b-1', 'b-2'],
        assignedBranches: [
          Branch(id: 'b-1', organizationId: 'org-1', name: 'Main Central 1', status: 'ACTIVE'),
          Branch(id: 'b-2', organizationId: 'org-1', name: 'Main Central 2', status: 'ACTIVE'),
        ],
      );

      final analyticsNotifier = AnalyticsNotifier(fakeRepo, 'b-1');
      await analyticsNotifier.loadAnalytics();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentUserProvider.overrideWithValue(authorizedUser),
            branchNotifierProvider.overrideWith((ref) {
              final notifier = BranchNotifier(FakeBranchRepository());
              notifier.syncWithUser(authorizedUser);
              return notifier;
            }),
            analyticsNotifierProvider.overrideWith((ref) => analyticsNotifier),
            sessionServiceProvider.overrideWithValue(FakeSessionService()),
          ],
          child: const MaterialApp(
            home: AnalyticsScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Main Central 1'), findsOneWidget);
    });

    testWidgets('AnalyticsScreen switches to Recharges Analytics tab and displays recharges view', (tester) async {
      const authorizedUser = AuthUser(
        id: 'staff-1',
        email: 'staff@moneycard.io',
        name: 'Alex Morgan',
        role: 'STAFF',
        organizationId: 'org-1',
        permissions: [AppPermission.viewAnalytics],
        assignedBranchIds: ['b-1'],
      );

      final notifier = AnalyticsNotifier(fakeRepo, 'b-1');
      await notifier.loadAnalytics();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentUserProvider.overrideWithValue(authorizedUser),
            branchNotifierProvider.overrideWith((ref) => BranchNotifier(FakeBranchRepository())),
            analyticsNotifierProvider.overrideWith((ref) => notifier),
            sessionServiceProvider.overrideWithValue(FakeSessionService()),
          ],
          child: const MaterialApp(
            home: AnalyticsScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Tap Menu Tab
      await tester.tap(find.text('Menu'));
      await tester.pumpAndSettle();

      expect(find.text('Food Sales'), findsOneWidget);
      expect(find.text('Items Sold'), findsOneWidget);

      // Tap Recharge Tab
      await tester.tap(find.text('Recharge'));
      await tester.pumpAndSettle();

      expect(find.text('RECHARGE AMOUNT'), findsOneWidget);
      expect(find.text('REFUND AMOUNT'), findsOneWidget);
    });
  });
}
