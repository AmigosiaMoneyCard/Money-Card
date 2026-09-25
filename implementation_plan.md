# Implementation Plan — Build and Install Money Card Localhost APK on Device

Configure and install the dedicated localhost APK with the display name "Money Card - Localhost" directly onto the connected Android phone.

![Phone Home Screen with Money Card - Localhost App](C:/Users/damie/.gemini/antigravity-ide/brain/999581c9-5c30-4195-933d-3667425ed95a/phone_home_screen_localhost_apk_1790320041461.jpg)

## Layout Wireframes

```
+-------------------------------------------------------+
|  [Phone Home Screen]                                  |
|                                                       |
|   [ (C) ]                   [ (S) ]                   |
|  Money Card -             Money Card                  |
|   Localhost                 Staging                   |
|  (com.moneycard...      (com.moneycard...             |
|   .localhost)               .staging)                 |
|                                                       |
|  * Coexists side-by-side with staging app on phone.   |
|  * Targets local backend: http://192.168.105.39:3000  |
+-------------------------------------------------------+
```

## User Requirements and Scope

- Change the mobile application display name to "Money Card - Localhost".
- Use a dedicated package ID suffix (.localhost) so it installs alongside the existing staging APK without overwriting it.
- Set the default base URL to the local backend server (with USB reverse loopback and Wi-Fi LAN failover).
- Build the APK and install it directly onto the connected Android device SM G570F (42000c30e0f7b407).

## Proposed Technical Changes

Android Build Configuration:
- File: [build.gradle.kts](file:///D:/Money%20Card%20Project/Flutter%20Money%20card/android/app/build.gradle.kts)
- Add the development product flavor under productFlavors:
  - dimension = "environment"
  - applicationIdSuffix = ".localhost"
  - resValue("string", "app_name", "Money Card - Localhost")

Flutter Application Configuration:
- File: [app_config.dart](file:///D:/Money%20Card%20Project/Flutter%20Money%20card/lib/core/config/app_config.dart)
- Update AppConfig.appName for isDevelopment to return 'Money Card - Localhost'.

Entry Point Creation:
- File: [main_development.dart](file:///D:/Money%20Card%20Project/Flutter%20Money%20card/lib/main_development.dart)
- Initialize environment with env: 'development' and call entry.main().

USB Port Forwarding:
- Execute adb reverse tcp:3000 tcp:3000 so localhost loopback (127.0.0.1:3000) on the device connects directly to the backend running on the computer.

Installation Execution:
- Build and install the APK targeting device 42000c30e0f7b407.

## Verification and Test Plan

- Proactively execute flutter analyze --no-pub to verify 0 Dart errors.
- Confirm successful APK build and installation on SM G570F (device 42000c30e0f7b407).
- Verify the app launches and displays "Money Card - Localhost" on the phone home screen.
- Verify seamless login using the local staff credentials (phone: 9876543210, password: password123).
