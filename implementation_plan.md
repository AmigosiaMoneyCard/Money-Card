# Implementation Plan - Mobile POS Action Naming, Cancel Recharge, Bill Checkbox, and Return Statistics

![Mobile POS Billing and Refund UI](C:\Users\damie\.gemini\antigravity-ide\brain\999581c9-5c30-4195-933d-3667425ed95a\mobile_pos_billing_and_refund_parity_1790678398120.jpg)

Completed Work Summary (Archived from Active Plan)
- 8-Character Minimum Password Solely for Account Creation (Merged & Verified)
- Mobile POS Wallet Recharge 4-Digit Limit (Rs. 9,999 cap) (Merged & Verified)
- POS Mobile App Flow Refinements (Direct Recharge/Billing, Tick button, Auto-Logout) (Merged & Verified)
- Retained Analytics Parity & QR Scanned Hub Cleanup (Merged & Verified)
- Backend Cross-Origin Resource Policy Configuration (Helmet crossOriginResourcePolicy: 'cross-origin') (Merged & Verified)
- Localhost Mobile POS Connection & Transparent Host Resolution (Merged & Verified)

Active Status & Worktree Specifications

1. Rename "Recharge Card Session" to "Recharge" across Scanned QR Flow
- File: Flutter Money card/lib/features/payments/recharge_screen.dart
  - Line 321: Change AppBar title from 'Recharge Card' to 'Recharge'.
  - Line 335: Change AppBar title from 'Recharge Card Session' to 'Recharge'.
- File: Flutter Money card/lib/features/cards/card_details_screen.dart
  - Line 677: Update action button label from 'Recharge Wallet (Cash / UPI)' to 'Recharge'.
- File: Flutter Money card/lib/features/pos/pos_scan_purchase_screen.dart
  - Line 934: In _showRechargeHubSheet, update button label from 'Recharge Wallet / Add Money' to 'Recharge'.

2. Restore "Cancel Recharge" Option in History Page
- File: Flutter Money card/lib/features/payments/recharge_screen.dart
  - In _showTopUpHistorySheet (top-up history sheet), for each non-cancelled recharge entry, add a dedicated action button labeled 'Cancel Recharge'.
  - On tap: trigger confirmation dialog and call sessionService.cancelRecharge to void the top-up and restore card balance.
- File: Flutter Money card/lib/features/pos/pos_scan_purchase_screen.dart
  - Line 1045: Rename button label from 'Void Top-up' to 'Cancel Recharge'.
- File: Flutter Money card/lib/features/sessions/session_details_screen.dart
  - In activity timeline, display 'Cancel Recharge' button for active sessions on recharge entries that are not cancelled.

3. Bill Page Header Checkbox in Emerald Green with White Tick
- File: Flutter Money card/lib/features/receipt/bill_receipt_screen.dart
  - In AppBar actions, style the completion action as a dedicated checkbox container:
    - 32x32 dp square container with 6px rounded corners.
    - Background color: AppColors.primary (Emerald green, #059669).
    - Child icon: Icons.check in pure white (Colors.white, 22px).
    - Preserves existing tap callback (_handleDone) and test selectors.

4. Remove Cancellation Reason from Food Orders Placed Page
- File: Flutter Money card/lib/features/pos/pos_checkout_screen.dart
  - Lines 965-970: Remove the 'Reason: ${t.cancellationReason}' block from the 'Food Orders Placed' bottom sheet.
- File: Flutter Money card/lib/features/pos/pos_scan_purchase_screen.dart
  - Lines 1308-1314: Remove the 'Reason: ${t.cancellationReason}' block from the food orders listing.

5. Return & Refund Sheet - Replace Duplicate "Current Balance" Box
- File: Flutter Money card/lib/features/pos/pos_scan_purchase_screen.dart
  - Lines 1585-1600: In _showReturnRefundSheet 2x2 statistics grid, remove the 4th box ('Current Balance') which is already shown in the top header.
  - Replace the 4th box with 'Total Activity' displaying total completed card actions count (allTx.where((t) => !t.isCancelled).length) with 'Active Cycle' status, providing distinct and meaningful insight into the card lifecycle.

UI Layout & ASCII Wireframe

Bill Receipt Screen Header:
+------------------------------------------+
|  [<-]                Bill           [[v]]|
+------------------------------------------+
  [[v]] = Emerald green square checkbox with white tick mark

Return & Refund 2x2 Statistics Grid:
+--------------------+---------------------+
| Recharges          | Refunds             |
| 3 times            | 0 times             |
| Rs. 750.00 total   | Rs. 0.00 total      |
+--------------------+---------------------+
| Food Orders        | Total Activity      |
| 2 orders           | 5 actions           |
| Rs. 240.00 spent   | Active Cycle        |
+--------------------+---------------------+
(Replaced duplicate Current Balance box with Total Activity)

Verification & Automated Test Execution Plan
1. Flutter Automated Tests: Execute flutter test to verify all screens, widget tests, and receipt interactions.
2. Flutter Static Analysis: Execute flutter analyze --no-pub to verify 0 Dart warnings.
3. Web App Parity Check: Verify Frontend Money Card tests (npm test -- --run) and TypeScript (npx tsc --noEmit).
4. Backend API Parity Check: Verify Backend Money Card tests (npm test).
