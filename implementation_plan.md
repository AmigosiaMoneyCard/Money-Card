# Implementation Plan: Mobile Kitchen Orders Pending Badge, Minimal Ticket Badge, and Full-Screen QR Scanner

## Overview
This plan implements the requested UI refinements in the staff mobile application for kitchen orders:
1. Status Badge: Change the status text on pending orders from "QUEUED / PENDING" to "PENDING".
2. Minimal Ticket Badge: Redesign the "Ticket #101" box to be minimal, replacing the bulky solid green block with a refined, subtle bordered badge with compact padding.
3. Full-Screen QR Scanner: Transition the kitchen dashboard wallet QR scanner from a partial bottom sheet to a dedicated, immersive full-screen camera viewfinder route (`fullscreenDialog: true`).

![Kitchen Orders UI Refinements](file:///C:/Users/damie/.gemini/antigravity-ide/brain/40124c13-8182-4da5-8dae-66d3097486e9/kitchen_minimal_ticket_fullscreen_qr_1791350735537.jpg)

---

## Technical Design & Component Breakdown

### 1. Status Text: "PENDING"
- Mobile File: `Flutter Money card/lib/features/kitchen/kitchen_orders_screen.dart`
  - In `_buildKitchenOrderCard`: Update line 388 where `order.isPending` is evaluated. Change `statusText = 'QUEUED / PENDING'` to `statusText = 'PENDING'`.
- Mobile Parity File: `Flutter Money card/lib/features/orders/live_order_tracker_screen.dart`
  - In `_buildOrderCard`: Update line 280 from `statusLabel = 'QUEUED / PENDING'` to `statusLabel = 'PENDING'` to maintain complete consistency across kitchen and order tracking screens.

### 2. Minimal Ticket Box
- Mobile File: `Flutter Money card/lib/features/kitchen/kitchen_orders_screen.dart`
  - Replace the heavy solid green `Container` (lines 433-447) with a minimal, elegant badge:
    - Subtle slate or soft emerald background: `const Color(0xFFF1F5F9)` (slate-100) or `AppColors.primary.withOpacity(0.08)`.
    - 1px border: `Border.all(color: const Color(0xFFE2E8F0))` (slate-200) or `Border.all(color: AppColors.primary.withOpacity(0.25))`.
    - Compact padding: `const EdgeInsets.symmetric(horizontal: 8, vertical: 2.5)`.
    - Refined typography: `TextStyle(color: const Color(0xFF334155), fontWeight: FontWeight.w600, fontSize: 12.5)`.

### 3. Full-Screen QR Scanner
- Mobile File: `Flutter Money card/lib/features/kitchen/kitchen_orders_screen.dart`
  - In `_openQrScanner`: Replace `showModalBottomSheet` with `Navigator.of(context).push(MaterialPageRoute(fullscreenDialog: true, builder: (ctx) => ...))`.
  - Present a full-screen `Scaffold` with a sleek dark top bar, back navigation arrow, and full-viewport `QrScannerView`.
  - On scan completion: Close the scanner via `Navigator.of(ctx).pop()`, extract the clean card number via `cleanDisplayCardNumber(token)`, strip any 'MC-', 'CARD-', or 'WALLET-' prefix, set `_searchController.text`, update `_searchQuery`, and filter active orders.

---

## ASCII Wireframes

### Wireframe 1: Kitchen Order Card Header (Minimal Ticket Badge + "PENDING")
```
+-----------------------------------------------------------------------+
| [ #101 ]  Card: MC-4029                                     [ PENDING ]|
|   12m elapsed                                                         |
| --------------------------------------------------------------------- |
| 2x Veg Deluxe Thali (Extra Roti)                                      |
| 1x Fresh Lime Soda                                                    |
|                                                                       |
| [ Customer: Aarav S. ]                       [ Action: Start Cooking ]|
+-----------------------------------------------------------------------+
```

### Wireframe 2: Full-Screen Kitchen QR Scanner View
```
+-----------------------------------------------------------------------+
| [<- Back]                     Scan Wallet QR             [Torch Off]  |
+-----------------------------------------------------------------------+
|                                                                       |
|                                                                       |
|                         +-------------------+                         |
|                         |                   |                         |
|                         |    [Camera View]  |                         |
|                         |    QR Target Area |                         |
|                         |                   |                         |
|                         +-------------------+                         |
|                                                                       |
|                  Point camera at customer wallet QR                   |
|                                                                       |
|                                                                       |
+-----------------------------------------------------------------------+
```

---

## File Change Matrix

| File Path | Sub-project | Proposed Changes |
|---|---|---|
| `Flutter Money card/lib/features/kitchen/kitchen_orders_screen.dart` | Mobile POS | Change statusText to 'PENDING'. Replace bulky Ticket container with minimal badge. Replace showModalBottomSheet with full-screen MaterialPageRoute. |
| `Flutter Money card/lib/features/orders/live_order_tracker_screen.dart` | Mobile POS | Change statusLabel to 'PENDING' for order tracking parity. |

---

## Verification & Testing Plan
1. Static Analysis:
   - Run `flutter analyze --no-pub` in `Flutter Money card` to guarantee 0 errors and 0 warnings.
2. Unit and Widget Tests:
   - Run `flutter test` in `Flutter Money card` to confirm all 186 unit/widget tests continue to pass.
