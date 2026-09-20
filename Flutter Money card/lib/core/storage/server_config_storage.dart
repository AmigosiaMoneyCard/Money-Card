import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/app_config.dart';

/// Service to persist custom server base URL across app restarts on physical devices.
class ServerConfigStorage {
  final FlutterSecureStorage _storage;
  String? _inMemoryFallback;

  static String get _keyServerUrl => 'mc_custom_server_url_${AppConfig.environment}';

  ServerConfigStorage({FlutterSecureStorage? storage})
      : _storage = storage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(
                resetOnError: true,
              ),
              iOptions: IOSOptions(
                accessibility: KeychainAccessibility.first_unlock,
              ),
            );

  Future<void> saveServerUrl(String url) async {
    final normalized = AppConfig.normalizeUrl(url);
    try {
      await _storage.write(key: _keyServerUrl, value: normalized);
    } catch (_) {
      _inMemoryFallback = normalized;
    }
    AppConfig.setBaseUrl(normalized);
  }

  Future<String?> getServerUrl() async {
    try {
      final saved = await _storage.read(key: _keyServerUrl);
      if (saved != null && saved.isNotEmpty) {
        return saved;
      }
      final legacy = await _storage.read(key: 'mc_custom_server_url');
      if (legacy != null && legacy.isNotEmpty) {
        return legacy;
      }
    } catch (_) {
      if (_inMemoryFallback != null && _inMemoryFallback!.isNotEmpty) {
        return _inMemoryFallback;
      }
    }
    return null;
  }

  Future<void> resetToDefault() async {
    try {
      await _storage.delete(key: _keyServerUrl);
      await _storage.delete(key: 'mc_custom_server_url');
    } catch (_) {
      _inMemoryFallback = null;
    }
    AppConfig.setBaseUrl(
      AppConfig.isProduction
          ? AppConfig.productionBaseUrl
          : (AppConfig.isDevelopment ? AppConfig.defaultBaseUrl : AppConfig.stagingBaseUrl),
    );
  }

  /// Initializes AppConfig from persistent storage on startup with cross-environment isolation
  Future<void> initialize() async {
    final savedUrl = await getServerUrl();
    if (savedUrl != null && savedUrl.isNotEmpty) {
      // Guard: Purge staging or local/development backend contamination in production
      if (AppConfig.isProduction &&
          (savedUrl.contains('money-card-backend-staging') ||
           savedUrl.contains('127.0.0.1') ||
           savedUrl.contains('localhost') ||
           savedUrl.contains('10.0.2.2') ||
           savedUrl.contains('192.168.'))) {
        await resetToDefault();
        return;
      }
      // Guard: Purge production backend contamination in staging
      if (AppConfig.isStaging &&
          savedUrl.contains('money-card-backend.onrender.com') &&
          !savedUrl.contains('money-card-backend-staging')) {
        await resetToDefault();
        return;
      }
      AppConfig.setBaseUrl(savedUrl);
    } else {
      AppConfig.setBaseUrl(
        AppConfig.isProduction
            ? AppConfig.productionBaseUrl
            : (AppConfig.isDevelopment ? AppConfig.defaultBaseUrl : AppConfig.stagingBaseUrl),
      );
    }
  }
}
