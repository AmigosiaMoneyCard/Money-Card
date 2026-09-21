import 'package:flutter_test/flutter_test.dart';
import 'package:money_card_staff/core/config/app_config.dart';
import 'package:money_card_staff/core/storage/server_config_storage.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('AppConfig & Environment Detection Tests', () {
    tearDown(() {
      AppConfig.initialize(env: 'staging');
    });

    test('initialize with production sets production URLs and flags', () {
      AppConfig.initialize(env: 'production');
      expect(AppConfig.isProduction, isTrue);
      expect(AppConfig.isStaging, isFalse);
      expect(AppConfig.appName, 'Money Card');
      expect(AppConfig.baseUrl, 'https://money-card-backend.onrender.com/api/v1');
    });

    test('initialize with staging sets staging URLs and flags', () {
      AppConfig.initialize(env: 'staging');
      expect(AppConfig.isStaging, isTrue);
      expect(AppConfig.isProduction, isFalse);
      expect(AppConfig.appName, 'Money Card (Staging)');
      expect(AppConfig.baseUrl, 'https://money-card-backend-staging.onrender.com/api/v1');
    });

    test('initialize with development sets localhost URLs and flags', () {
      AppConfig.initialize(env: 'development');
      expect(AppConfig.isDevelopment, isTrue);
      expect(AppConfig.isProduction, isFalse);
      expect(AppConfig.isStaging, isFalse);
      expect(AppConfig.appName, 'Money Card (Dev)');
      expect(AppConfig.baseUrl, 'http://127.0.0.1:3000/api/v1');
    });

    test('ServerConfigStorage isolates environment keys and clears staging backend in production', () async {
      AppConfig.initialize(env: 'production');
      final storage = ServerConfigStorage();

      // Simulate a contaminated storage pointing to staging backend
      await storage.saveServerUrl('https://money-card-backend-staging.onrender.com/api/v1');
      expect(AppConfig.baseUrl, 'https://money-card-backend-staging.onrender.com/api/v1');

      // Re-initialize: should purge the staging backend contaminated URL in production
      await storage.initialize();
      expect(AppConfig.baseUrl, 'https://money-card-backend.onrender.com/api/v1');
    });

    test('ServerConfigStorage resetToDefault in development restores localhost base URL', () async {
      AppConfig.initialize(env: 'development');
      final storage = ServerConfigStorage();

      await storage.saveServerUrl('http://192.168.1.50:3000/api/v1');
      expect(AppConfig.baseUrl, 'http://192.168.1.50:3000/api/v1');

      await storage.resetToDefault();
      expect(AppConfig.baseUrl, 'http://127.0.0.1:3000/api/v1');
    });
  });
}
