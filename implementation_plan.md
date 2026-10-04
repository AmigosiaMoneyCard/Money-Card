# Implementation Plan: Mobile Kitchen Operations Suite & Network Resilience

Comprehensive plan covering network latency optimizations and operational enhancements for the Mobile Kitchen Staff (KDS) application.

## Part 1: Network Resilience & Performance Optimizations

### Root Causes
1. Render Free Tier Sleep: Render sleeps after 15 minutes of inactivity; waking up requires 45-60s.
2. Short Client Timeouts: Flutter previously configured 4s `connectTimeout` and 8s `receiveTimeout` in [app_config.dart](file:///D:/Money%20Card%20Project/Flutter%20Money%20card/lib/core/config/app_config.dart), causing immediate timeout errors during cloud network delays.
3. Duplicate Web Requests: Frontend components concurrently dispatch 5-6 identical `/branches` and `/analytics` queries, triggering 60+ parallel SQL queries on Supabase.

### Proposed Changes
- **Flutter App** ([app_config.dart](file:///D:/Money%20Card%20Project/Flutter%20Money%20card/lib/core/config/app_config.dart)):
  - Increase `connectTimeout`, `receiveTimeout`, and `sendTimeout` to `Duration(seconds: 30)`.
- **Web Frontend** ([client.ts](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/services/api/client.ts)):
  - Add in-flight request deduplication for idempotent `GET` requests so concurrent component calls share a single HTTP request.
- **Backend Engine** ([analytics.controller.ts](file:///D:/Money%20Card%20Project/Backend%20Money%20Card/src/controllers/analytics.controller.ts)):
  - Add a 20-second in-memory response cache for `getOrgAnalytics` to return instant responses for repeated analytics queries.

---

## Part 2: Mobile Kitchen Staff Operations Suite

### 1. Audio Chime & Haptic Vibration on New Orders
- **File**: [kitchen_orders_provider.dart](file:///D:/Money%20Card%20Project/Flutter%20Money%20card/lib/providers/kitchen_orders_provider.dart)
- Track known order IDs in `_knownOrderIds`.
- On incoming order fetch, detect if new active tickets (`isPending` or `isPreparing`) have arrived.
- Trigger `SystemSound.play(SystemSoundType.alert)` and `HapticFeedback.heavyImpact()`.
- Add an audio toggle icon in the KDS app bar so kitchen staff can mute/unmute chimes if needed.

### 2. Elapsed Time Urgency Badges & Color Coding
- **File**: [kitchen_orders_screen.dart](file:///D:/Money%20Card%20Project/Flutter%20Money%20card/lib/features/kitchen/kitchen_orders_screen.dart)
- Implement dynamic elapsed time classification:
  - `< 10 minutes`: Normal badge (e.g. `4m elapsed`, subtle slate/green styling).
  - `10 - 15 minutes`: Amber urgency badge (`11m • RUSH`) with amber border highlight (`Colors.amber.shade400`, 1.5px).
  - `>= 15 minutes`: Red urgency badge (`16m • DELAYED`) with bold red border highlight (`Colors.red.shade400`, 2px) and red alert icon.

### 3. Batch Item Aggregator Card
- **File**: [kitchen_orders_screen.dart](file:///D:/Money%20Card%20Project/Flutter%20Money%20card/lib/features/kitchen/kitchen_orders_screen.dart)
- Add a top summary card above the Active Prep order list.
- Consolidate item quantities across all pending and cooking orders into a real-time aggregated count:
  - Example: `5x Masala Dosa` | `3x Filter Coffee` | `2x Idli Vada`.
  - Enables chefs to batch-prepare popular items simultaneously rather than checking tickets one by one.

### 4. Auto-Reconnection & Offline Grace
- **File**: [kitchen_orders_provider.dart](file:///D:/Money%20Card%20Project/Flutter%20Money%20card/lib/providers/kitchen_orders_provider.dart)
- If background polling encounters a temporary Wi-Fi drop:
  - Preserve all existing cached orders on screen instead of showing a blank error state.
  - Display a non-intrusive syncing badge in the app bar ("Reconnecting...").
  - Implement exponential backoff retry (5s, 10s, 20s) until connectivity restores.

---

## Visual UI Sketch

![Mobile KDS Enhanced UI](file:///C:/Users/damie/.gemini/antigravity-ide/brain/218ce084-c8ce-49ca-a93b-bc0ce2200b0c/mobile_kds_enhanced_ui_1791119977125.jpg)

## ASCII Wireframe

```text
+--------------------------------------------------------------------+
| Kitchen Display System               [ Audio: ON ] [ Reconnect ]   |
| [ Active Prep (4) ]                  [ Ready for Pickup (1) ]      |
+--------------------------------------------------------------------+
| Batch Prep Summary (8 Items Total):                                |
| [ 4x Masala Dosa ]   [ 2x Filter Coffee ]   [ 2x Idli Vada ]       |
+--------------------------------------------------------------------+
| +----------------------------------------------------------------+ |
| | Order #104 (Token 04)                        [ 16m • DELAYED ] | |
| | RED BORDER HIGHLIGHT (>15m)                                    | |
| | - 2x Masala Dosa (Extra crispy)                                | |
| | - 1x Filter Coffee                                             | |
| | [ Start Cooking ]                          [ Mark Ready ]      | |
| +----------------------------------------------------------------+ |
| +----------------------------------------------------------------+ |
| | Order #105 (Token 05)                           [ 11m • RUSH ] | |
| | AMBER BORDER HIGHLIGHT (10-15m)                                | |
| | - 1x Masala Dosa                                               | |
| | [ Cooking in Progress... ]                 [ Mark Ready ]      | |
| +----------------------------------------------------------------+ |
| +----------------------------------------------------------------+ |
| | Order #106 (Token 06)                            [ 3m elapsed ]| |
| | NORMAL BORDER                                                  | |
| | - 1x Idli Vada                                                 | |
| | [ Start Cooking ]                          [ Mark Ready ]      | |
| +----------------------------------------------------------------+ |
+--------------------------------------------------------------------+
```

## Verification Plan

### Automated Tests
- Run `flutter test` in `Flutter Money card` (verify all mobile unit and widget tests pass).
- Run `flutter analyze --no-pub` in `Flutter Money card` (zero lint/type issues).
- Run `npm test -- --run` in `Frontend Money Card` (297 tests pass).
- Run `npm test` in `Backend Money Card` (124 tests pass).

### Manual Verification
- Place a test order in POS and verify the kitchen screen rings an audio chime and triggers haptic vibration.
- Verify ticket cards color-code correctly based on elapsed minutes (<10m, 10-15m, >15m).
- Confirm the Batch Item Aggregator displays accurate sums of all pending items.
- Simulate a momentary Wi-Fi disconnect and confirm the KDS retains tickets gracefully and reconnects automatically.
