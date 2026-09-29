# Implementation Plan - Minimalist Return & Refund, POS Billing Rename, and Menu Edit Button

![Minimalist Return & Refund and POS Billing UI](C:\Users\damie\.gemini\antigravity-ide\brain\999581c9-5c30-4195-933d-3667425ed95a\minimal_return_refund_and_pos_billing_1790679770487.jpg)

Completed Work Summary (All Tasks Verified & Tested)
- Rename "POS Menu & Purchase" to "Billing" in Billing Page:
  - pos_checkout_screen.dart: Fallback and main AppBar titles updated to 'Billing'.
- Declutter and Minimize Return & Refund Sheet:
  - pos_scan_purchase_screen.dart: Replaced fragmented boxes and banners with a unified card featuring Wallet number, Cycle badge, Available Balance, and side-by-side Refund and Return buttons.
  - pos_scan_purchase_screen.dart: Minimalist 2x2 statistics grid styled in soft off-white (#F8FAFC) cards with Recharges, Refunds, Food Orders, and Cancelled Recharges (with voided amount).
  - pos_scan_purchase_screen.dart: Removed dangling red text line at bottom; customer/session start formatted as a subtle muted footer.
- Menu Page: Change "Edit" Button Color from Black to Emerald Green:
  - products_screen.dart: Changed ElevatedButton backgroundColor from Colors.black to AppColors.primary (Emerald green, #059669).

Automated Verification Results:
- Flutter Test Suite: 171 passed (0 failed).
- Flutter Static Analysis: No issues found (flutter analyze --no-pub passed).
- Frontend Test Suite: 284 passed across 37 test files (0 failed).
- Frontend TypeScript Check: 0 errors (npx tsc --noEmit passed).
- Backend Test Suite: 100 passed across 10 test files (0 failed).
