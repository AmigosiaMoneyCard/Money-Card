# Implementation Plan — Fresh Shorebird Staging Release APK

## Visual Image Sketch

![Fresh Shorebird Staging APK Release](C:/Users/damie/.gemini/antigravity-ide/brain/999581c9-5c30-4195-933d-3667425ed95a/fresh_shorebird_staging_apk_release_1790920231790.jpg)

---

## Technical Context & Root Cause

When distributing the existing staging APK file to another person, they observe outdated data and behavior because the standalone base APK file on disk (`build/app/outputs/flutter-apk/app-staging-release.apk`) was generated on September 23, 2026 for release `1.0.3+4`.

While Shorebird OTA patches (`shorebird patch`) deliver incremental updates over the internet to already installed devices after restart, sending the raw APK file to a new device installs the old base binary. If installed fresh on a device without immediate internet access or prior to downloading an OTA patch, the user sees the old base application code and seed state.

Building a fresh Shorebird release APK (`shorebird release android --artifact apk`) bakes all latest source changes directly into the base binary, updates the release version in Shorebird's cloud console to `1.0.4+5`, and outputs a new standalone staging APK ready for distribution.

---

## Wireframe: Shorebird Release Workflow & Artifact Generation

```
=============================================================================================================
Shorebird Release Pipeline (Flavor: Staging, Platform: Android)
=============================================================================================================
1. Version Synchronization
   pubspec.yaml:                version: 1.0.4+5 (incremented from 1.0.3+4)
   lib/core/config/app_config.dart: appVersion: '1.0.4'

2. Pre-Build Validation
   +-------------------------------------------------------------------------------------------------------+
   | flutter analyze --no-pub  -->  0 issues found                                                        |
   | flutter test              -->  171 passing tests                                                     |
   +-------------------------------------------------------------------------------------------------------+

3. Shorebird Release Command
   Command: "y" | shorebird release android --target lib/main_staging.dart --flavor staging --artifact apk
   Action:  Compiles new AOT engine, bundles latest assets & code, uploads release 1.0.4+5 to Shorebird.

4. Output Artifacts
   Target Path: Flutter Money card/build/app/outputs/flutter-apk/app-staging-release.apk
   Direct Copy: Flutter Money card/build/app/outputs/apk/staging/release/app-staging-release.apk
=============================================================================================================
```

---

## Worktree Changes Summary

1. `Flutter Money card/pubspec.yaml`:
   - Increment `version` from `1.0.3+4` to `1.0.4+5`.

2. `Flutter Money card/lib/core/config/app_config.dart`:
   - Update `appVersion` constant from `'1.0.1'` to `'1.0.4'`.

3. Autonomous Pre-Build Verification:
   - Run `flutter analyze --no-pub`.
   - Run `flutter test`.

4. Shorebird Release Build Execution:
   - Run `"y" | shorebird release android --target lib/main_staging.dart --flavor staging --artifact apk`.

5. Artifact Verification:
   - Verify newly generated APK in `Flutter Money card/build/app/outputs/flutter-apk/app-staging-release.apk`.
   - Confirm active release status via `shorebird releases list --flavor staging`.

---

## Verification Plan

### Automated Pre-Release Checks
- Run `flutter test` in `Flutter Money card/` (all 171 tests must pass).
- Run `flutter analyze --no-pub` in `Flutter Money card/` (0 issues).

### Build & Artifact Verification
- Check command exit code is 0.
- Inspect file size and timestamp of `build/app/outputs/flutter-apk/app-staging-release.apk`.
- Run `shorebird releases list --flavor staging` and confirm `1.0.4+5` is listed with active status.
