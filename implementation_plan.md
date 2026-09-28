# Implementation Plan: Mobile POS Separate Refund vs Return and Card Summary Box Relocation

![Mobile Refund & Return Hub Layout](C:\Users\damie\.gemini\antigravity-ide\brain\999581c9-5c30-4195-933d-3667425ed95a\mobile_refund_return_hub_layout_1790580423777.jpg)

## User Requirements
1. Separate Refund Money vs Return Card in Mobile App:
   - In Return & Refund bottom sheet:
     - The Refund button inside the top box must strictly refund the remaining available money to the customer (balance set to 0.0, transaction recorded) without returning or settling the card. The card and session remain ACTIVE.
     - The separate Return button under the top box returns the card (settles the session, sets card to AVAILABLE, and refunds any leftover balance if present).
2. Card Number, Current Balance and Active Box Relocation:
   - Cut the Current Session / Balance Card from the Recharge screen (`recharge_screen.dart`).
   - Paste / relocate this box onto the Scanned QR screen (`pos_scan_purchase_screen.dart`), replacing the old header box above "Wallet Actions & Operations".

## Visual Architecture & Wireframes

### Screen 1: Scanned QR Action Hub
```
+------------------------------------------+
| < Wallet: MC-0001                        |
+------------------------------------------+
| +--------------------------------------+ |
| | MC-0001                     [ACTIVE] | |
| |                                      | |
| | Current Balance                      | |
| | ₹250.00                              | |
| +--------------------------------------+ |
|                                          |
| Wallet Actions & Operations              |
|                                          |
| +--------------------------------------+ |
| | [Wallet Icon]  Recharge            > | |
| +--------------------------------------+ |
| | [POS Icon]     Billing             > | |
| +--------------------------------------+ |
| | [Return Icon]  Return & Refund     > | |
| +--------------------------------------+ |
+------------------------------------------+
```

### Screen 2: Return & Refund Bottom Sheet
```
+------------------------------------------+
| Return & Refund                      [X] |
+------------------------------------------+
| +--------------------------------------+ |
| | Wallet No: MC-0001                   | |
| | Money Available: ₹250.00             | |
| |                                      | |
| | [              Refund              ] | |
| +--------------------------------------+ |
|                                          |
| [              Return                ]   |
|                                          |
| +--------------------------------------+ |
| | Present Card Cycle       [MC-0001_1] | |
| +--------------------------------------+ |
|                                          |
| [Recharges: 3]     [Refunds: 0]          |
| [Food Orders: 5]   [Current Balance]     |
+------------------------------------------+
```

### Screen 3: Recharge Screen (Cleaned Up)
```
+------------------------------------------+
| < Recharge Card Session                  |
+------------------------------------------+
| Payment Method                           |
| [ CASH ]   [ UPI ]                       |
|                                          |
| Recharge Amount (₹)                      |
| [ 100                                  ] |
|                                          |
| [ +₹50 ]  [ +₹100 ]  [ +₹200 ]  [ +₹500 ]|
|                                          |
| [           Confirm Recharge           ] |
+------------------------------------------+
```

## Technical Breakdown and Worktree Changes

1. Backend Money Card:
   - [sessions.controller.ts](file:///D:/Money%20Card%20Project/Backend%20Money%20Card/src/controllers/sessions.controller.ts):
     - Add `refundSessionBalance`: checks session active, checks balance > 0, performs atomic transaction reducing balance to 0.0, creates `REFUND_RETURN` transaction record with `paymentMethod: 'DIRECT_REFUND'`, leaves session status ACTIVE and card status ACTIVE, broadcasts balance update, and returns `{ session, refundAmount }`.
   - [sessions.routes.ts](file:///D:/Money%20Card%20Project/Backend%20Money%20Card/src/routes/sessions.routes.ts):
     - Register `POST /:id/refund` route with `requirePermission(PermissionCode.REFUND)`.

2. Flutter Money card Client Services & State:
   - [api_endpoints.dart](file:///D:/Money%20Card%20Project/Flutter%20Money%20card/lib/core/constants/api_endpoints.dart):
     - Add `static String refundSession(String id) => '/card-sessions/$id/refund';`
   - [session_service.dart](file:///D:/Money%20Card%20Project/Flutter%20Money%20card/lib/services/session_service.dart):
     - Add `refundSession(String sessionId)` method calling `POST /card-sessions/:id/refund`.
   - [session_repository.dart](file:///D:/Money%20Card%20Project/Flutter%20Money%20card/lib/repositories/session_repository.dart):
     - Add `refundSession(String sessionId) => _sessionService.refundSession(sessionId);`
   - [mock_api_interceptor.dart](file:///D:/Money%20Card%20Project/Flutter%20Money%20card/lib/core/network/interceptors/mock_api_interceptor.dart):
     - Handle `POST /card-sessions/:id/refund`: deducts balance to 0.0, records REFUND transaction, keeps session and card status ACTIVE, returns 200.

3. Flutter UI Updates:
   - [recharge_screen.dart](file:///D:/Money%20Card%20Project/Flutter%20Money%20card/lib/features/payments/recharge_screen.dart):
     - Cut lines 267-312 (the card number, current balance, active badge container) from the top of the body so the screen starts cleanly with Payment Method and Amount input.
   - [pos_scan_purchase_screen.dart](file:///D:/Money%20Card%20Project/Flutter%20Money%20card/lib/features/pos/pos_scan_purchase_screen.dart):
     - Replace the old compact summary card in `_buildActiveCardActionHub()` with the clean AppCard cut from `recharge_screen.dart` (showing Card display number, green ACTIVE badge, Current Balance label, and bold green balance).
     - In `_showReturnRefundSheet()`:
       - Update the Refund button handler `_handleRefundOnly`: calls `sessionRepo.refundSession(session.id)`.
       - On success, updates `_activeSession` balance to 0.0 without touching session status or card status. Shows snackbar "Refund of ₹... processed. Wallet remains active."
       - The Return button continues to trigger `_handleSettleReturn()`, which settles the session and frees the card to AVAILABLE.

## Verification & Autonomous Testing
- Proactively run `npm test` in `Backend Money Card` to ensure all 100 backend tests pass.
- Proactively run `flutter test` in `Flutter Money card` to ensure widget and unit tests pass.
- Proactively run `flutter analyze --no-pub` to verify zero static analysis warnings or errors.
