# Implementation Plan - Mobile Staging Legacy Backend URL Purge and Login Restoration

![Mobile Staff Login Staging](C:\Users\damie\.gemini\antigravity-ide\brain\999581c9-5c30-4195-933d-3667425ed95a\mobile_staff_login_staging_1790590597301.jpg)

# Problem Analysis
Staff members created in the staging database exist and are verified active in Supabase PostgreSQL (e.g. Damien, phone 9539518192, Counter 1). However, logging in from the mobile POS staging APK fails with a "not found" 404 error.
Investigation confirmed that the old Render staging URL (https://money-card-backend-staging.onrender.com) was shut down and returns HTTP 404 (x-render-routing: no-server). The active live staging backend is https://money-card-backend-staging-681a.onrender.com.
Existing installed instances of the mobile POS app have the legacy URL saved in FlutterSecureStorage (keys mc_custom_server_url_staging or mc_custom_server_url).
Because ServerConfigStorage.initialize() previously checked savedUrl.contains('money-card-backend-staging'), it failed to identify the legacy URL as obsolete and did not purge it. As a result, requests continued hitting the dead Render service.

# Technical Design and URL Routing Lifecycle

```
[ App Launch / Main Entry Point ]
             |
             v
[ ServerConfigStorage.initialize() ]
             |
             +---> Read savedUrl from secure storage
             |
             +---> Check Active Environment:
             |      |
             |      +--> Staging:
             |      |     Is savedUrl pointing to defunct Render staging backend?
             |      |     (contains 'money-card-backend-staging' and NOT 'money-card-backend-staging-681a')
             |      |     OR contains 'money-card-backend-0nx1' (prod contamination)
             |      |     OR contains 'money-card-backend.onrender.com' without '-staging-681a'
             |      |     --> YES: PURGE storage, reset to AppConfig.stagingBaseUrl
             |      |
             |      +--> Production:
             |            Is savedUrl pointing to defunct Render prod backend?
             |            (contains 'money-card-backend.onrender.com' and NOT 'money-card-backend-0nx1')
             |            OR contains staging / localhost / emulator / LAN IP
             |            --> YES: PURGE storage, reset to AppConfig.productionBaseUrl
             |
             v
[ AppConfig.baseUrl set to Live Backend ]
(Staging: https://money-card-backend-staging-681a.onrender.com/api/v1)
             |
             v
[ Staff Login Request ] --> POST /api/v1/auth/login --> HTTP 200 OK
```

# Proposed Changes

File: Flutter Money card/lib/core/storage/server_config_storage.dart
- Update initialize() to guard against legacy Render URLs:
  - In staging: purge any saved URL containing 'money-card-backend.onrender.com' or 'money-card-backend-staging' that does not contain 'money-card-backend-staging-681a'.
  - In production: purge any saved URL containing 'money-card-backend.onrender.com' that does not contain 'money-card-backend-0nx1'.

File: Flutter Money card/test/core/storage/server_config_storage_test.dart
- Add unit test verifying that ServerConfigStorage.initialize() in staging purges legacy Render staging URL without '-681a' and resets to AppConfig.stagingBaseUrl.
- Add unit test verifying that ServerConfigStorage.initialize() in production purges legacy Render production URL without '-0nx1' and resets to AppConfig.productionBaseUrl.

# Verification Plan
- Proactively run Flutter unit tests: flutter test test/core/storage/server_config_storage_test.dart
- Proactively run Flutter analyzer: flutter analyze --no-pub
- Verify with curl that live staging auth endpoint accepts requests and handles staff authentication
- Commit changes to local Git and push to origin/staging
- Proactively publish Shorebird OTA Patch #6 for staging release 1.0.3+4

