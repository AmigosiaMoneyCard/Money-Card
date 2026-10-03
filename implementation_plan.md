# Implementation Plan — Mobile Analytics Checkbox PDF Download & Cancel Recharge Guard

## Overview
This plan implements two major features across the mobile POS app and backend:
1. Mobile Analytics PDF Checkbox Download:
   - Update the mobile PDF report to strictly include ONLY the metrics and data present on the Analytics screen tabs:
     - Financial Overview (Recharge tab): Recharge Amount, Total Sales, Wallet Refund, Cancelled Amount, and Wallet Activation.
     - Menu Analytics tab: Food Sales, Cancelled Orders, and the Ordered Menu Items table.
     - Remove unrelated operational/inventory metrics (e.g. low stock alerts, inventory counts).
   - In the export modal/sheet, provide clickable checkboxes for:
     - `[x] Financial Overview` (Recharge, sales, refunds, cancellations & wallet activations)
     - `[x] Menu Analytics` (Food sales, cancelled orders & ordered menu items table)
   - Allow selecting either one or both:
     - If Financial Overview only is checked -> downloads the single-section Financial Overview PDF.
     - If Menu Analytics only is checked -> downloads the single-section Menu Analytics PDF.
     - If both are checked -> downloads a unified PDF containing both sections.
     - If neither is checked -> "Download Selected PDF" button is disabled.
2. Top-up History Cancel Recharge Guard (Retained from previous plan):
   - When a wallet is recharged, the cashier has the option to cancel that recharge.
   - If the cashier does not cancel that recharge and recharges the wallet again, any previous recharge in the top-up history can no longer be cancelled.
   - Only the latest (most recent) uncancelled recharge can ever be cancelled. Any recharge followed by a subsequent recharge is permanently locked from cancellation with the message "Cannot cancel: wallet was recharged again".

---

## Visual Design Mockup & ASCII Wireframes

### Mobile Analytics Checkbox PDF Export Mockup
![Checkbox PDF Export Mockup](C:\Users\damie\.gemini\antigravity-ide\brain\999581c9-5c30-4195-933d-3667425ed95a\mobile_pdf_checkboxes_1791022675513.jpg)

### Top-up History Cancel Guard Mockup
![Mobile Top-up Cancel Guard](C:\Users\damie\.gemini\antigravity-ide\brain\999581c9-5c30-4195-933d-3667425ed95a\mobile_topup_cancel_guard_1791022125827.jpg)

### Mobile Analytics Export PDF Checkbox Bottom Sheet
```
+-------------------------------------------------------------+
|                    Export Analytics PDF                 [X] |
+-------------------------------------------------------------+
| Select the reports you want to download:                    |
|                                                             |
| +---------------------------------------------------------+ |
| | [X] Financial Overview                                  | |
| | Recharge, total sales, refunds, cancellations & wallets | |
| +---------------------------------------------------------+ |
|                                                             |
| +---------------------------------------------------------+ |
| | [X] Menu Analytics                                      | |
| | Food sales, cancelled orders & ordered menu items table | |
| +---------------------------------------------------------+ |
|                                                             |
| [ Download Selected PDF (2 selected) ]                    |
| (Disabled if 0 selected; downloads 1 or both)               |
+-------------------------------------------------------------+
```

### Top-up History Bottom Sheet (Cancel Guard Wireframe)
```
+-------------------------------------------------------------+
|                     Top-up History                      [X] |
| Wallet: MC_1001 • Balance: Rs. 700.00                       |
+-------------------------------------------------------------+
|                                                             |
| Top Card: Latest Recharge (Allowed to Cancel)               |
| +---------------------------------------------------------+ |
| | Top-up                               24 May, 11:35 AM   | |
| | Rs. 200.00                                              | |
| | via UPI (Ref: UPI837456)            [ Cancel Recharge ] | |
| +---------------------------------------------------------+ |
|                                                             |
| Bottom Card: Previous Recharge (Recharged Again -> Locked)   |
| +---------------------------------------------------------+ |
| | Top-up                               20 May, 09:15 AM   | |
| | Rs. 500.00                                              | |
| | via CASH (Ref: CASH29481)           [ Cancel (Disabled)]| |
| | Cannot cancel: wallet was recharged again.              | |
| +---------------------------------------------------------+ |
|                                                             |
+-------------------------------------------------------------+
```

---

## Technical Design & Component Breakdown

### 1. Mobile Analytics PDF Service (`Flutter Money card`)
- File: `Flutter Money card/lib/services/analytics_pdf_service.dart`
  - Update `AnalyticsPdfSectionOptions`:
    - `includeFinancialOverview` (bool, default true)
    - `includeMenuAnalytics` (bool, default true)
    - Remove `includeOperations` (operations/inventory metrics retired from this report).
  - Method `generateAnalyticsPdf`:
    - If `includeFinancialOverview`:
      - Render Section 1: Overview & Financial Revenue Summary:
        - Recharge Amount: `${analytics.rechargeCount} top-ups`, `INR ${rechargeVolume}`
        - Total Sales: `${analytics.transactionCount} transactions`, `INR ${netMoneyCollected}`
        - Wallet Refund: `${analytics.refundCount} refunds`, `- INR ${refundVolume}`
        - Cancelled Amount: `${analytics.cancelledTopUpsCount} cancelled`, `INR ${cancelledTopUps}`
        - Wallet Activation: `${analytics.cardsGivenOut} cards issued`, `${analytics.activeSessionsCount} active | ${analytics.settledSessionsCount} settled`
    - If `includeMenuAnalytics`:
      - Render Section 2: Menu Analytics:
        - Food Sales: `${analytics.purchaseCount} orders placed`, `INR ${purchaseVolume}`
        - Cancelled Orders: `${analytics.cancelledOrdersCount} orders cancelled`, `INR ${cancelledOrdersVolume}`
        - All Ordered Menu Items Table: Rank `#`, `Product Name`, `Units Sold`, `Revenue Generated (INR)`.
    - Generate appropriate filename based on selection:
      - Both: `MoneyCard_Analytics_<branch>_<date>.pdf`
      - Financial only: `MoneyCard_Financial_Overview_<branch>_<date>.pdf`
      - Menu only: `MoneyCard_Menu_Analytics_<branch>_<date>.pdf`

### 2. Mobile Analytics Export Bottom Sheet with Checkboxes (`Flutter Money card`)
- File: `Flutter Money card/lib/features/analytics/analytics_screen.dart` & `Flutter Money card/lib/widgets/analytics/analytics_pdf_preview_dialog.dart`
  - When the user taps the PDF / Export button:
    - Display an interactive bottom sheet containing two clickable cards with Flutter `Checkbox` widgets:
      - Card 1: `Financial Overview` checkbox (with subtitle explaining recharge, sales, refunds, cancellations, and wallet activations).
      - Card 2: `Menu Analytics` checkbox (with subtitle explaining food sales, cancelled orders, and ordered menu items table).
    - Clicking anywhere on a card toggles its checkbox state.
    - At the bottom of the sheet: "Download Selected PDF" button.
      - If 1 item selected: button displays "Download Selected PDF (1)".
      - If both selected: button displays "Download Selected PDF (2)".
      - If 0 selected: button is disabled (`onPressed: null`).
    - Tapping download invokes `AnalyticsPdfService.generateAnalyticsPdf` with the selected options and triggers download/share.

### 3. Top-up History Cancel Recharge Guard (`Flutter Money card` & `Backend Money Card`)
- File: `Flutter Money card/lib/features/payments/recharge_screen.dart`
  - In `_showTopUpHistorySheet`:
    - Chronologically sort all session recharges (`sortedTopUps` by `createdAt` ascending).
    - Determine `latestRechargeId = sortedTopUps.isNotEmpty ? sortedTopUps.last.id : null`.
    - For each recharge `t`:
      - `hasSubsequentRecharge = sortedTopUps.isNotEmpty && (t.id != latestRechargeId)`.
      - `canCancelRecharge = t.canCancel && session.balance >= t.amount && session.isActive && !hasSubsequentRecharge`.
      - If `hasSubsequentRecharge && t.canCancel`, render caption: `Cannot cancel: wallet was recharged again`.
  - In `_handleCancelRecharge`:
    - Safety guard: reject cancellation if `hasSubsequentRecharge` is true.
- File: `Flutter Money card/lib/features/pos/pos_scan_purchase_screen.dart`
  - Apply identical `hasSubsequentRecharge` check and disable Cancel button on older recharges.
- File: `Flutter Money card/lib/features/sessions/session_details_screen.dart`
  - Apply identical guard in transaction timeline.
- File: `Flutter Money card/lib/core/network/interceptors/mock_api_interceptor.dart`
  - In `cancel-recharge` mock handler:
    - Check if target transaction has any subsequent recharge in the session.
    - If so, return 400 error `CANNOT_CANCEL_PREVIOUS_RECHARGE`.
- File: `Backend Money Card/src/controllers/sessions.controller.ts`
  - In `cancelRecharge` endpoint handler:
    - Count recharges in session created after target transaction:
      `prisma.transaction.count({ where: { sessionId: session.id, type: 'RECHARGE', createdAt: { gt: txRecord.createdAt } } })`.
    - If count > 0, return 400 error `CANNOT_CANCEL_PREVIOUS_RECHARGE` (`Cannot cancel recharge because a subsequent recharge exists on this wallet`).

---

## Worktree Changes Summary

| Subsystem | File Path | Nature of Change |
|---|---|---|
| Mobile PDF Service | `Flutter Money card/lib/services/analytics_pdf_service.dart` | Limit PDF to Financial Overview and Menu Analytics; support generating either one or both |
| Mobile Analytics UI | `Flutter Money card/lib/features/analytics/analytics_screen.dart` | Export modal with clickable checkboxes for Financial Overview and Menu Analytics |
| Mobile PDF Dialog | `Flutter Money card/lib/widgets/analytics/analytics_pdf_preview_dialog.dart` | Align preview options with Financial and Menu checkboxes |
| Mobile Payments | `Flutter Money card/lib/features/payments/recharge_screen.dart` | Disable cancel on previous recharges when wallet recharged again |
| Mobile POS | `Flutter Money card/lib/features/pos/pos_scan_purchase_screen.dart` | Apply subsequent recharge cancel guard in scan purchase sheet |
| Mobile Sessions | `Flutter Money card/lib/features/sessions/session_details_screen.dart` | Apply subsequent recharge cancel guard in session details |
| Mobile Mock API | `Flutter Money card/lib/core/network/interceptors/mock_api_interceptor.dart` | Mock error for cancelling previous recharge |
| Backend API | `Backend Money Card/src/controllers/sessions.controller.ts` | Reject cancel recharge if newer recharge exists in session |
| Backend Tests | `Backend Money Card/test/unit/cancel_recharge_guard.test.ts` | Unit tests for subsequent recharge cancel prevention |
| Mobile Tests | `Flutter Money card/test/features/payments/recharge_test.dart` | Widget tests for disabled cancel button on previous recharge |
| Mobile PDF Tests | `Flutter Money card/test/features/analytics/analytics_test.dart` | Widget/unit tests for checkbox PDF download options |

---

## Verification Plan

### Automated Tests
1. Mobile App Tests:
   `cd "Flutter Money card"; flutter test`
2. Backend API Tests:
   `cd "Backend Money Card"; npm test`
3. Frontend Web Tests:
   `cd "Frontend Money Card"; npm test -- --run`

### Manual Verification
1. Checkbox PDF Download:
   - In Mobile POS App -> Analytics -> tap "View PDF".
   - Bottom sheet opens with clickable checkboxes:
     - [X] Financial Overview
     - [X] Menu Analytics
   - Uncheck Menu Analytics -> tap "Download Selected PDF (1)" -> only Financial Overview PDF is downloaded.
   - Uncheck Financial Overview, check Menu Analytics -> tap "Download Selected PDF (1)" -> only Menu Analytics PDF is downloaded.
   - Check both -> tap "Download Selected PDF (2)" -> unified PDF with both sections is downloaded.
   - Uncheck both -> button is disabled.
2. Cancel Recharge Guard:
   - Recharge card with Rs. 500 -> Cancel button is enabled.
   - Recharge card again with Rs. 200 without cancelling the first.
   - Open Top-up History -> Rs. 200 recharge has active Cancel button; Rs. 500 recharge has disabled Cancel button with text "Cannot cancel: wallet was recharged again".
