import 'package:money_card_staff/core/config/app_config.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:money_card_staff/features/payments/recharge_screen.dart';
import 'package:money_card_staff/models/branch.dart';
import 'package:money_card_staff/models/card_session.dart';
import 'package:money_card_staff/models/transaction.dart';
import 'package:money_card_staff/providers/branch_provider.dart';
import 'package:money_card_staff/providers/recharge_provider.dart';
import 'package:money_card_staff/providers/session_operations_provider.dart';
import 'package:money_card_staff/repositories/session_repository.dart';

class FakeRechargeSessionRepository implements SessionRepository {
  double currentBalance = 200.0;
  String? lastExternalReference;
  List<Transaction>? mockTransactions;

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);

  @override
  Future<CardSession> getSessionById(String id) async {
    return CardSession(
      id: id,
      cardId: 'card-1',
      branchId: 'b-1',
      status: SessionStatus.active,
      balance: currentBalance,
      startedAt: '2026-08-14T10:00:00Z',
      transactions: mockTransactions,
    );
  }

  @override
  Future<RechargeResult> recharge({
    required String sessionId,
    required double amount,
    required PaymentMethod paymentMethod,
    String? externalReference,
    String? branchId,
  }) async {
    currentBalance += amount;
    lastExternalReference = externalReference;
    return RechargeResult(
      transactionId: 'tx-rec-1',
      amount: amount,
      balance: currentBalance,
      paymentMethod: paymentMethod,
      status: 'SUCCESS',
    );
  }
}

void main() {
  AppConfig.apiMode = ApiMode.mock;
  group('Staff Recharge Unit & Widget Tests', () {
    late FakeRechargeSessionRepository fakeRepo;

    setUp(() {
      fakeRepo = FakeRechargeSessionRepository();
    });

    test('RechargeNotifier validates Cash and UPI workflows with reference', () async {
      final sessionNotifier = SessionDetailsNotifier(fakeRepo);
      final notifier = RechargeNotifier(fakeRepo, sessionNotifier);

      expect(notifier.state.paymentMethod, isNull);
      expect(notifier.state.canSubmit, isFalse); // Amount is 0 and no method selected

      // Set Amount
      notifier.setAmount(150.0);
      expect(notifier.state.canSubmit, isFalse); // Method still not selected

      // Select Cash
      notifier.setPaymentMethod(PaymentMethod.cash);
      expect(notifier.state.canSubmit, isTrue);

      // Switch to UPI
      notifier.setPaymentMethod(PaymentMethod.upi);
      expect(notifier.state.canSubmit, isTrue); // Streamlined UPI without verification checkbox

      // Set Reference (optional)
      notifier.setPaymentReference('UTR-123456');
      expect(notifier.state.paymentReference, 'UTR-123456');
      expect(notifier.state.canSubmit, isTrue);

      // Verify 4-digit limit (amount cannot exceed 9999)
      notifier.setAmount(10000.0);
      expect(notifier.state.amount, 150.0); // blocked, remains 150.0

      // Execute Recharge
      final result = await notifier.executeRecharge('sess-1');
      expect(result, isNotNull);
      expect(result?.amount, 150.0);
      expect(result?.balance, 350.0);
      expect(result?.paymentMethod, PaymentMethod.upi);
      expect(fakeRepo.lastExternalReference, 'UTR-123456');
    });

    testWidgets('RechargeScreen renders Cash and UPI inputs and executes recharge', (tester) async {
      const mockBranch = Branch(
        id: 'b-1',
        organizationId: 'org-1',
        name: 'Main Cafeteria',
        upiId: 'canteen.main@icici',
      );

      final sessionNotifier = SessionDetailsNotifier(fakeRepo);
      await sessionNotifier.loadSessionById('sess-1');

      final rechargeNotifier = RechargeNotifier(fakeRepo, sessionNotifier);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentBranchProvider.overrideWithValue(mockBranch),
            sessionDetailsNotifierProvider.overrideWith((ref) => sessionNotifier),
            rechargeNotifierProvider.overrideWith((ref) => rechargeNotifier),
          ],
          child: const MaterialApp(
            home: RechargeScreen(
              sessionId: 'sess-1',
              physicalCardNumber: 'MC-101',
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('CASH'), findsOneWidget);
      expect(find.text('UPI'), findsOneWidget);
      expect(find.text('Recharge Amount (₹)'), findsNothing);

      // Select Cash payment method
      await tester.tap(find.text('CASH'));
      await tester.pumpAndSettle();

      expect(find.text('Recharge Amount (₹)'), findsOneWidget);

      // Tap quick amount +₹100
      await tester.tap(find.text('+₹100'));
      await tester.pumpAndSettle();

      expect(find.text('Expected New Balance:'), findsOneWidget);
      expect(find.text('₹300.00'), findsOneWidget);

      // Tap Recharge Wallet button
      await tester.tap(find.text('Recharge Wallet'));
      await tester.pumpAndSettle();

      // Success dialog renders
      expect(find.text('Recharge Successful'), findsOneWidget);
      expect(find.text('₹100.00'), findsWidgets);
      expect(find.text('₹300.00'), findsWidgets);
      expect(find.text('Generate & View PDF'), findsNothing);
      expect(find.text('Download PDF'), findsNothing);
      expect(find.text('Share PDF'), findsNothing);
      expect(find.text('Done'), findsOneWidget);
    });

    testWidgets('RechargeScreen executes manual UPI recharge flow', (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      const mockBranch = Branch(
        id: 'b-1',
        organizationId: 'org-1',
        name: 'Main Cafeteria',
      );

      final sessionNotifier = SessionDetailsNotifier(fakeRepo);
      await sessionNotifier.loadSessionById('sess-1');

      final rechargeNotifier = RechargeNotifier(fakeRepo, sessionNotifier);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentBranchProvider.overrideWithValue(mockBranch),
            sessionDetailsNotifierProvider.overrideWith((ref) => sessionNotifier),
            rechargeNotifierProvider.overrideWith((ref) => rechargeNotifier),
          ],
          child: const MaterialApp(
            home: RechargeScreen(
              sessionId: 'sess-1',
              physicalCardNumber: 'MC-101',
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Select UPI
      await tester.tap(find.text('UPI'));
      await tester.pumpAndSettle();

      // Tap quick amount +₹200
      await tester.tap(find.text('+₹200'));
      await tester.pumpAndSettle();

      // Scroll ListView down to reveal Recharge Wallet button
      await tester.drag(find.byType(ListView), const Offset(0, -400));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Recharge Wallet'));
      await tester.pumpAndSettle();

      expect(find.text('Recharge Successful'), findsOneWidget);
      expect(find.text('₹200.00'), findsWidgets);
      expect(find.text('Generate & View PDF'), findsNothing);
      expect(find.text('Download PDF'), findsNothing);
      expect(find.text('Share PDF'), findsNothing);
      expect(find.text('Done'), findsOneWidget);
    });

    testWidgets('Top-up History disables cancel button on earliest recharge when subsequent recharge is cancelled or added', (tester) async {
      const mockBranch = Branch(
        id: 'b-1',
        organizationId: 'org-1',
        name: 'Main Cafeteria',
        status: 'ACTIVE',
      );

      final sessionNotifier = SessionDetailsNotifier(fakeRepo);
      final rechargeNotifier = RechargeNotifier(fakeRepo, sessionNotifier);

      fakeRepo.mockTransactions = [
        const Transaction(
          id: 'tx-1',
          sessionId: 'sess-1',
          branchId: 'b-1',
          type: TransactionType.recharge,
          amount: 500.0,
          status: TransactionStatus.success,
          paymentMethod: PaymentMethod.cash,
          createdAt: '2026-10-03T10:00:00Z',
          isCancelled: false,
          canCancel: true,
        ),
        const Transaction(
          id: 'tx-2',
          sessionId: 'sess-1',
          branchId: 'b-1',
          type: TransactionType.recharge,
          amount: 200.0,
          status: TransactionStatus.success,
          paymentMethod: PaymentMethod.upi,
          createdAt: '2026-10-03T10:15:00Z',
          isCancelled: true,
          cancellationReason: 'Wrong Amount Entered',
          canCancel: false,
        ),
      ];
      fakeRepo.currentBalance = 500.0;

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentBranchProvider.overrideWithValue(mockBranch),
            sessionDetailsNotifierProvider.overrideWith((ref) => sessionNotifier),
            rechargeNotifierProvider.overrideWith((ref) => rechargeNotifier),
          ],
          child: const MaterialApp(
            home: RechargeScreen(
              sessionId: 'sess-1',
              physicalCardNumber: 'MC-101',
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Tap History button in AppBar
      await tester.tap(find.text('History'));
      await tester.pumpAndSettle();

      expect(find.text('Top-up History'), findsOneWidget);
      expect(find.text('CANCELLED'), findsOneWidget);
      expect(find.text('Cannot cancel: wallet was recharged again'), findsOneWidget);
    });

    testWidgets('Top-up History disables cancel on earlier recharge when wallet is recharged again without cancellation', (tester) async {
      const mockBranch = Branch(
        id: 'b-1',
        organizationId: 'org-1',
        name: 'Main Cafeteria',
        status: 'ACTIVE',
      );

      final sessionNotifier = SessionDetailsNotifier(fakeRepo);
      final rechargeNotifier = RechargeNotifier(fakeRepo, sessionNotifier);

      fakeRepo.mockTransactions = [
        const Transaction(
          id: 'tx-1',
          sessionId: 'sess-1',
          branchId: 'b-1',
          type: TransactionType.recharge,
          amount: 300.0,
          status: TransactionStatus.success,
          paymentMethod: PaymentMethod.cash,
          createdAt: '2026-10-03T10:00:00Z',
          isCancelled: false,
          canCancel: true,
        ),
        const Transaction(
          id: 'tx-2',
          sessionId: 'sess-1',
          branchId: 'b-1',
          type: TransactionType.recharge,
          amount: 500.0,
          status: TransactionStatus.success,
          paymentMethod: PaymentMethod.upi,
          createdAt: '2026-10-03T10:20:00Z',
          isCancelled: false,
          canCancel: true,
        ),
      ];
      fakeRepo.currentBalance = 800.0;

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentBranchProvider.overrideWithValue(mockBranch),
            sessionDetailsNotifierProvider.overrideWith((ref) => sessionNotifier),
            rechargeNotifierProvider.overrideWith((ref) => rechargeNotifier),
          ],
          child: const MaterialApp(
            home: RechargeScreen(
              sessionId: 'sess-1',
              physicalCardNumber: 'MC-101',
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Tap History button in AppBar
      await tester.tap(find.text('History'));
      await tester.pumpAndSettle();

      expect(find.text('Top-up History'), findsOneWidget);
      // Earlier tx-1 has disabled cancel with 'Cannot cancel: wallet was recharged again'
      expect(find.text('Cannot cancel: wallet was recharged again'), findsOneWidget);
      // Latest tx-2 has active Cancel Recharge button
      expect(find.text('Cancel Recharge'), findsOneWidget);
    });
  });
}
