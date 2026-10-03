# Implementation Plan — Mobile Analytics, View PDF Update & Earliest Recharge Cancellation Guard

## Overview
This plan implements the enhancements across the mobile POS app, web app, and backend:
1. Mobile App View PDF Update:
   - Synchronize `AnalyticsPdfService` in `Flutter Money card` with the updated Financial Overview and Menu Analytics screens.
   - Section 1 (Overview & Financial Revenue Summary): Update table rows to match the new screen metrics (`Recharge Amount`, `Total Sales`, `Wallet Refund`, `Cancelled Amount`, `Food Sales`, and `Wallet Activation`).
   - Section 2 (Operations & Inventory Health): Remove the retired `Food Quantity` row and add `Cancelled Orders` with order count and cancelled monetary volume.
2. Top-up History Earliest Recharge Cancellation Guard:
   - Resolve the cancel recharge issue in the Top-up History sheet when a QR code is scanned:
     - When inspecting top-ups for a card session, if a subsequent top-up has been cancelled, the earliest top-up must not be permitted to be refunded/cancelled.
     - Enforce this guard at both the UI layer (disabled Cancel button with informative reason) and the API/backend layer (validation error `CANNOT_CANCEL_EARLIEST_RECHARGE`).
     - Standardize the status badge across all POS views to `CANCELLED` (replacing legacy `VOIDED`).
3. Mobile Analytics Grouping & Menu Cleanup:
   - In Financial Overview: Group recharge amount with total sales, group wallet refund with wallet refund count, group cancelled amount with cancelled count, and keep wallet activation clean.
   - Remove `Food Quantity` box from both mobile app and web app menu analytics.

---

## Visual Design Mockup & ASCII Wireframes

![Mobile PDF Update & Cancel Recharge Guard](C:\Users\damie\.gemini\antigravity-ide\brain\999581c9-5c30-4195-933d-3667425ed95a\mobile_pdf_and_cancel_recharge_guard_1791020158026.jpg)

### Mobile Top-up History Bottom Sheet (Earliest Recharge Guard)
```
+-------------------------------------------------------------+
|                     Top-up History                      [X] |
| Wallet: MC_1001 • Balance: Rs. 500.00                       |
+-------------------------------------------------------------+
|                                                             |
| +---------------------------------------------------------+ |
| | +Rs. 200.00                              [ CANCELLED ]  | |
| | UPI (Ref: 98124)                 03 Oct 2026, 11:15 AM  | |
| | Reason: Wrong Amount Entered                            | |
| +---------------------------------------------------------+ |
|                                                             |
| +---------------------------------------------------------+ |
| | +Rs. 500.00                       [ Cancel (Disabled) ] | |
| | CASH                             03 Oct 2026, 09:30 AM  | |
| | Staff: Cashier counter                                  | |
| | Cannot cancel: subsequent recharge was cancelled        | |
| +---------------------------------------------------------+ |
|                                                             |
+-------------------------------------------------------------+
```

### Mobile Analytics Exported PDF Table Structure
```
+--------------------------------------------------------------------------+
| 1. Overview & Financial Revenue Summary                                  |
+--------------------------------------------------------------------------+
| Metric Description           | Activity Count    | Financial Volume (INR)|
+------------------------------+-------------------+-----------------------+
| Recharge Amount              | 52 top-ups        | Rs. 24,800.00         |
| Total Sales                  | 148 transactions  | Rs. 43,250.00         |
| Wallet Refund                | 14 refunds        | - Rs. 1,420.00        |
| Cancelled Amount             | 3 cancelled       | Rs. 650.00            |
| Food Sales                   | 96 orders         | Rs. 18,450.00         |
| Wallet Activation            | 128 cards issued  | 110 active            |
+--------------------------------------------------------------------------+

+--------------------------------------------------------------------------+
| 2. Operations & Inventory Health                                         |
+--------------------------------------------------------------------------+
| Operational Indicator        | Quantity / Value  | Operational Health    |
+------------------------------+-------------------+-----------------------+
| Active Customer Sessions     | 110 cards         | Normal Traffic        |
| Settled Customer Sessions    | 18 cards          | Completed & Cleared   |
| Cancelled Orders             | 4 orders          | Rs. 220.00 cancelled  |
| Low Stock Alert Items        | 2 items           | Restock Advised       |
| Tracked Inventory Products   | 24 items          | Live Catalog Tracked  |
+--------------------------------------------------------------------------+
```

---

## Technical Design & Component Breakdown

### 1. Mobile App Top-up History UI & Logic (`Flutter Money card`)
- File: `Flutter Money card/lib/features/payments/recharge_screen.dart`
  - In `_showTopUpHistorySheet`:
    - Sort all session recharges chronologically ascending (`createdAt`).
    - Identify the earliest recharge (`sortedTopUps.first`).
    - Check if any subsequent recharge is cancelled (`sortedTopUps.skip(1).any((t) => t.isCancelled)`).
    - If the item is the earliest recharge and a subsequent recharge is cancelled:
      - Disable the Cancel button (`onPressed: null`).
      - Display an explanatory text: `Cannot cancel: subsequent recharge was cancelled`.
  - In `_handleCancelRecharge`:
    - Add safety check: reject cancellation if `txId` is the earliest recharge and any subsequent recharge is cancelled, displaying an error SnackBar.
- File: `Flutter Money card/lib/features/pos/pos_scan_purchase_screen.dart`
  - In `_showTopUpHistorySheet`:
    - Replace badge `VOIDED` with `CANCELLED`.
    - Apply identical guard: disable button when `isEarliestBlockedByCancelledNext` is true.
  - In `_handleCancelRecharge`:
    - Add identical guard check.
- File: `Flutter Money card/lib/features/sessions/session_details_screen.dart`
  - In `_buildTransactionCard`:
    - Apply identical guard to disable `Cancel Recharge` on earliest recharge when subsequent recharge is cancelled.
  - In `_handleCancelRecharge`:
    - Add safety check.
- File: `Flutter Money card/lib/core/network/interceptors/mock_api_interceptor.dart`
  - In `cancel-recharge` mock handler:
    - Sort session recharges by `createdAt` ascending.
    - If `txId` is the earliest recharge and `sessionRecharges.skip(1).any((t) => t['isCancelled'] == true)`, return 400 `CANNOT_CANCEL_EARLIEST_RECHARGE`.

### 2. Backend Business Rule Validation (`Backend Money Card`)
- File: `Backend Money Card/src/controllers/sessions.controller.ts`
  - In `cancelRecharge` handler:
    - Fetch all recharge transactions for `session.id` ordered by `createdAt: 'asc'`.
    - If `sessionRecharges.length > 1` and `sessionRecharges[0].id === txRecord.id`:
      - Check if any subsequent recharge (`sessionRecharges.slice(1)`) has `isCancelled: true`.
      - If so, return `sendError(res, 400, 'CANNOT_CANCEL_EARLIEST_RECHARGE', 'Cannot cancel earliest recharge when a subsequent recharge was cancelled')`.

### 3. Mobile View PDF Service (`Flutter Money card`)
- File: `Flutter Money card/lib/services/analytics_pdf_service.dart`
  - In Section 1 (Overview & Financial Revenue Summary):
    - Update table rows to match app screen:
      - `Recharge Amount`: `${analytics.rechargeCount} top-ups`, `currencyFmt.format(analytics.rechargeVolume)`
      - `Total Sales`: `${analytics.transactionCount} total txns`, `currencyFmt.format(analytics.netMoneyCollected)`
      - `Wallet Refund`: `${analytics.refundCount} refunds`, `- ${currencyFmt.format(analytics.refundVolume)}`
      - `Cancelled Amount`: `${analytics.cancelledTopUpsCount} cancelled`, `currencyFmt.format(analytics.cancelledTopUps)`
      - `Food Sales`: `${analytics.purchaseCount} orders`, `currencyFmt.format(analytics.purchaseVolume)`
      - `Wallet Activation`: `${analytics.cardsGivenOut} cards issued`, `${analytics.activeSessionsCount} active`
  - In Section 2 (Operations & Inventory Health):
    - Remove retired `Food Quantity` row.
    - Add `Cancelled Orders` row: `${analytics.cancelledOrdersCount} orders`, `currencyFmt.format(analytics.cancelledOrdersVolume) cancelled`.

---

## Worktree Changes Summary

| Subsystem | File Path | Nature of Change |
|---|---|---|
| Mobile Payments | `Flutter Money card/lib/features/payments/recharge_screen.dart` | Block earliest recharge cancellation if subsequent recharge is cancelled |
| Mobile POS | `Flutter Money card/lib/features/pos/pos_scan_purchase_screen.dart` | Apply earliest recharge guard and replace VOIDED with CANCELLED |
| Mobile Sessions | `Flutter Money card/lib/features/sessions/session_details_screen.dart` | Apply earliest recharge guard in session details timeline |
| Mobile Mock API | `Flutter Money card/lib/core/network/interceptors/mock_api_interceptor.dart` | Reject cancelling earliest recharge if subsequent recharge is cancelled |
| Mobile PDF | `Flutter Money card/lib/services/analytics_pdf_service.dart` | Update View PDF table metrics, remove Food Quantity, add Cancelled Orders |
| Backend API | `Backend Money Card/src/controllers/sessions.controller.ts` | Enforce CANNOT_CANCEL_EARLIEST_RECHARGE business validation |
| Backend Tests | `Backend Money Card/test/unit/cancel_recharge_guard.test.ts` | Unit tests for earliest recharge cancellation restriction |
| Mobile Tests | `Flutter Money card/test/features/payments/recharge_screen_test.dart` | Unit/widget tests verifying earliest recharge button is disabled |
| Mobile Analytics | `Flutter Money card/lib/features/analytics/analytics_screen.dart` | Group refunds and cancellations together, remove Recharge Count and Food Quantity, replace void with cancelled |
| Web Analytics | `Frontend Money Card/src/features/analytics/OrgAdminAnalyticsComponents.tsx` | Remove Food Quantity card from menu analytics |

---

## Verification Plan

### Automated Tests
1. Backend Typecheck and Tests:
   `cd "Backend Money Card"; npx tsc --noEmit`
   `cd "Backend Money Card"; npm test`
2. Flutter POS Analysis and Tests:
   `cd "Flutter Money card"; flutter analyze --no-pub`
   `cd "Flutter Money card"; flutter test`
3. Frontend Web Typecheck and Tests:
   `cd "Frontend Money Card"; npx tsc --noEmit`
   `cd "Frontend Money Card"; npm test -- --run`

### Manual Verification
1. Mobile App View PDF:
   - Go to Analytics -> tap "View PDF".
   - Verify Overview table displays Recharge Amount, Total Sales, Wallet Refund, Cancelled Amount, Food Sales, and Wallet Activation.
   - Verify Operations table displays Cancelled Orders and does not contain Food Quantity.
2. Top-up History Earliest Recharge Guard:
   - Scan an active card with multiple top-ups.
   - Cancel the latest top-up.
   - Observe the Top-up History sheet: the earliest top-up now has its Cancel button disabled with the explanation "Cannot cancel: subsequent recharge was cancelled".
