import 'package:money_card_staff/core/config/app_config.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:money_card_staff/core/constants/permission_constants.dart';
import 'package:money_card_staff/core/errors/api_exception.dart';
import 'package:money_card_staff/core/errors/error_codes.dart';
import 'package:money_card_staff/features/home/home_screen.dart';
import 'package:money_card_staff/models/auth_user.dart';
import 'package:money_card_staff/models/branch.dart';
import 'package:money_card_staff/models/card_session.dart';
import 'package:money_card_staff/providers/api_providers.dart';
import 'package:money_card_staff/providers/auth_provider.dart';
import 'package:money_card_staff/providers/branch_provider.dart';
import 'package:money_card_staff/providers/permission_provider.dart';
import 'package:money_card_staff/providers/session_operations_provider.dart';
import 'package:money_card_staff/repositories/session_repository.dart';

class FakeSessionRepository implements SessionRepository {
  List<CardSession> sessions = [];
  bool shouldThrowError = false;

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);

  @override
  Future<List<CardSession>> listSessions({
    String? branchId,
    String? status,
    int? page,
    int? limit,
  }) async {
    if (shouldThrowError) {
      throw const ApiException(
        code: ApiErrorCode.networkError,
        message: 'Failed to connect to session server',
      );
    }
    var result = branchId != null ? sessions.where((s) => s.branchId == branchId).toList() : sessions;
    if (status != null && status.isNotEmpty && status != 'ALL') {
      result = result.where((s) => s.status.value.toUpperCase() == status.toUpperCase()).toList();
    }
    return result;
  }

  @override
  Future<CardSession> getSessionById(String id) async {
    if (shouldThrowError) {
      throw const ApiException(
        code: ApiErrorCode.networkError,
        message: 'Failed to connect to session server',
      );
    }
    return sessions.firstWhere((s) => s.id == id);
  }

  @override
  Future<CardSession> createSession({
    required String cardId,
    required String branchId,
    String? customerName,
    String? customerPhone,
    double initialAmount = 0,
    String paymentMethod = 'CASH',
  }) async {
    final newSession = CardSession(
      id: 'session-${DateTime.now().millisecondsSinceEpoch}',
      cardId: cardId,
      physicalCardNumber: cardId,
      branchId: branchId,
      status: SessionStatus.active,
      balance: 0.0,
      startedAt: DateTime.now().toIso8601String(),
    );
    sessions.insert(0, newSession);
    return newSession;
  }

  @override
  Future<SessionReturnResult> returnSession(String sessionId) async {
    final idx = sessions.indexWhere((s) => s.id == sessionId);
    if (idx != -1) {
      final old = sessions[idx];
      final updated = CardSession(
        id: old.id,
        cardId: old.cardId,
        physicalCardNumber: old.physicalCardNumber,
        branchId: old.branchId,
        status: SessionStatus.settled,
        balance: 0.0,
        startedAt: old.startedAt,
        settledAt: DateTime.now().toIso8601String(),
      );
      sessions[idx] = updated;
      return SessionReturnResult(
        sessionId: old.id,
        refundedAmount: old.balance,
        sessionStatus: 'SETTLED',
        cardStatus: 'AVAILABLE',
      );
    }
    throw const ApiException(code: ApiErrorCode.notFound, message: 'Session not found');
  }
}

void main() {
  AppConfig.apiMode = ApiMode.mock;
  group('HomeScreen Active Sessions Dashboard Tests', () {
    late FakeSessionRepository fakeSessionRepo;

    const mockUser = AuthUser(
      id: 'staff-1',
      email: 'staff@moneycard.io',
      name: 'Alex Morgan',
      role: 'STAFF',
      organizationId: 'org-demo-001',
      permissions: [
        AppPermission.cardIssue,
        AppPermission.recharge,
        AppPermission.purchase,
        AppPermission.sessionView,
      ],
      assignedBranchIds: ['branch-001'],
    );

    const mockBranch = Branch(
      id: 'branch-001',
      organizationId: 'org-demo-001',
      name: 'Main Cafeteria',
    );

    setUp(() {
      fakeSessionRepo = FakeSessionRepository();
    });

    testWidgets('HomeScreen renders greeting, counter info, role banner and excludes Active Sessions section', (tester) async {
      await tester.binding.setSurfaceSize(const Size(800, 1600));
      addTearDown(() => tester.binding.setSurfaceSize(null));

      final sessionNotifier = SessionListNotifier(fakeSessionRepo, 'branch-001');
      await sessionNotifier.loadSessions();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentUserProvider.overrideWithValue(mockUser),
            permissionCheckerProvider.overrideWithValue(PermissionChecker(mockUser.permissions)),
            currentBranchProvider.overrideWithValue(mockBranch),
            sessionRepositoryProvider.overrideWithValue(fakeSessionRepo),
            sessionListNotifierProvider.overrideWith((ref) => sessionNotifier),
          ],
          child: const MaterialApp(
            home: HomeScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Verify Greeting and Branch info
      expect(find.text('Hello, Alex'), findsOneWidget);
      expect(find.text('Counter: Main Cafeteria'), findsOneWidget);

      // Verify Role Specification Banner
      expect(find.text('Logged in as Counter Manager'), findsOneWidget);

      // Verify Active Sessions is NOT displayed on HomeScreen
      expect(find.text('Active Sessions'), findsNothing);
      expect(find.text('View All'), findsNothing);
    });

    testWidgets('HomeScreen renders SCAN QR CARD and Quick Actions', (tester) async {
      await tester.binding.setSurfaceSize(const Size(800, 1600));
      addTearDown(() => tester.binding.setSurfaceSize(null));

      final sessionNotifier = SessionListNotifier(fakeSessionRepo, 'branch-001');
      await sessionNotifier.loadSessions();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentUserProvider.overrideWithValue(mockUser),
            permissionCheckerProvider.overrideWithValue(PermissionChecker(mockUser.permissions)),
            currentBranchProvider.overrideWithValue(mockBranch),
            sessionRepositoryProvider.overrideWithValue(fakeSessionRepo),
            sessionListNotifierProvider.overrideWith((ref) => sessionNotifier),
          ],
          child: const MaterialApp(
            home: HomeScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Primary scan action
      expect(find.text('SCAN QR CARD'), findsOneWidget);

      // Quick action cards
      expect(find.text('Issue Card'), findsOneWidget);
      expect(find.text('Recharges'), findsOneWidget);
      expect(find.text('Menu'), findsOneWidget);
      expect(find.text('Inventory'), findsOneWidget);
      expect(find.text('Analytics'), findsWidgets);
    });
  });
}
