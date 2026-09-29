# Implementation Plan - Mobile POS Action Naming, Cancel Recharge, Bill Checkbox, and Return Statistics

![Mobile POS Billing and Refund UI](C:\Users\damie\.gemini\antigravity-ide\brain\999581c9-5c30-4195-933d-3667425ed95a\mobile_pos_billing_and_refund_parity_1790678398120.jpg)

Completed Work Summary (All Tasks Verified & Tested)
- Rename "Recharge Card Session" to "Recharge" across Scanned QR Flow:
  - recharge_screen.dart: AppBar title set to 'Recharge'.
  - card_details_screen.dart: Action button updated to 'Recharge'.
  - pos_scan_purchase_screen.dart: Action hub button updated to 'Recharge'.
- Restore "Cancel Recharge" Option in History Page:
  - recharge_screen.dart: Cancel Recharge button and dialog added in top-up history sheet.
  - pos_scan_purchase_screen.dart: Void Top-up renamed to Cancel Recharge with confirmation dialog.
  - session_details_screen.dart: Cancel Recharge button wired in activity timeline for active recharge entries.
- Bill Page Header Checkbox in Emerald Green with White Tick:
  - bill_receipt_screen.dart: Top-right done button styled as 32x32 Emerald green container (#059669) with 6px rounded corners and pure White tick mark (Icons.check).
- Remove Cancellation Reason from Food Orders Placed Page:
  - pos_checkout_screen.dart: Cancellation reason display removed from Food Orders Placed sheet.
  - pos_scan_purchase_screen.dart: Cancellation reason display removed from food orders listing.
- Return & Refund Sheet - Replace Duplicate "Current Balance" Box:
  - pos_scan_purchase_screen.dart: Replaced redundant Current Balance card with Total Activity displaying non-cancelled transaction count and Active Cycle status.

Automated Verification Results:
- Flutter Test Suite: 171 passed (0 failed).
- Flutter Static Analysis: No issues found (flutter analyze --no-pub passed).
- Frontend Test Suite: 284 passed across 37 test files (0 failed).
- Frontend TypeScript Check: 0 errors (npx tsc --noEmit passed).
- Backend Test Suite: 100 passed across 10 test files (0 failed).
- Git: Local commit created cleanly on staging branch.
