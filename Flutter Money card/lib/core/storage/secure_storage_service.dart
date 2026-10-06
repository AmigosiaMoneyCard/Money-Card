import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'token_storage.dart';

/// Secure token storage implementation backed by [FlutterSecureStorage] with fallback for older Android devices.
class SecureTokenStorage implements TokenStorage {
  final FlutterSecureStorage _storage;
  String? _cachedAccess;
  String? _cachedRefresh;
  String? _fallbackAccess;
  String? _fallbackRefresh;

  static const String _keyAccessToken = 'mc_access_token';
  static const String _keyRefreshToken = 'mc_refresh_token';

  SecureTokenStorage({FlutterSecureStorage? storage})
      : _storage = storage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(
                resetOnError: true,
              ),
              iOptions: IOSOptions(
                accessibility: KeychainAccessibility.first_unlock,
              ),
            );

  @override
  Future<void> saveTokens({
    required String accessToken,
    String? refreshToken,
  }) async {
    _cachedAccess = accessToken;
    if (refreshToken != null) {
      _cachedRefresh = refreshToken;
    }
    try {
      await _storage.write(key: _keyAccessToken, value: accessToken);
      if (refreshToken != null) {
        await _storage.write(key: _keyRefreshToken, value: refreshToken);
      }
    } catch (_) {
      _fallbackAccess = accessToken;
      _fallbackRefresh = refreshToken;
    }
  }

  @override
  Future<String?> getAccessToken() async {
    if (_cachedAccess != null && _cachedAccess!.isNotEmpty) {
      return _cachedAccess;
    }
    try {
      final token = await _storage.read(key: _keyAccessToken);
      if (token != null && token.isNotEmpty) {
        _cachedAccess = token;
      }
      return token;
    } catch (_) {
      return _fallbackAccess;
    }
  }

  @override
  Future<String?> getRefreshToken() async {
    if (_cachedRefresh != null && _cachedRefresh!.isNotEmpty) {
      return _cachedRefresh;
    }
    try {
      final token = await _storage.read(key: _keyRefreshToken);
      if (token != null && token.isNotEmpty) {
        _cachedRefresh = token;
      }
      return token;
    } catch (_) {
      return _fallbackRefresh;
    }
  }

  @override
  Future<void> clearTokens() async {
    _cachedAccess = null;
    _cachedRefresh = null;
    _fallbackAccess = null;
    _fallbackRefresh = null;
    try {
      await _storage.delete(key: _keyAccessToken);
      await _storage.delete(key: _keyRefreshToken);
    } catch (_) {
      // Ignored
    }
  }

  @override
  Future<bool> hasAccessToken() async {
    final token = await getAccessToken();
    return token != null && token.isNotEmpty;
  }
}

/// In-memory token storage for tests and mock environments.
class InMemoryTokenStorage implements TokenStorage {
  String? _accessToken;
  String? _refreshToken;

  @override
  Future<void> saveTokens({required String accessToken, String? refreshToken}) async {
    _accessToken = accessToken;
    if (refreshToken != null) {
      _refreshToken = refreshToken;
    }
  }

  @override
  Future<String?> getAccessToken() async => _accessToken;

  @override
  Future<String?> getRefreshToken() async => _refreshToken;

  @override
  Future<void> clearTokens() async {
    _accessToken = null;
    _refreshToken = null;
  }

  @override
  Future<bool> hasAccessToken() async => _accessToken != null && _accessToken!.isNotEmpty;
}
