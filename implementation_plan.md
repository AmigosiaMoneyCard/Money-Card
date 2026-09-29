# Implementation Plan - Account Creation Password Validation, Mobile Recharge Limits, and POS Flow Refinements

![Password and Mobile Recharge Limit Mockup](C:\Users\damie\.gemini\antigravity-ide\brain\999581c9-5c30-4195-933d-3667425ed95a\password_and_mobile_recharge_limit_1790663436917.jpg)

Proposed Changes

1. 8-Character Minimum Password Solely for Account Creation
- Creation Flows Scope (8-Character Minimum):
  - In Frontend Money Card/src/features/staff/StaffPage.tsx:
    - In validateBasicInfo (Staff Account Creation flow): formPassword.trim().length < 8 -> 'Password must be at least 8 characters'.
  - In Frontend Money Card/src/features/branches/BranchesPage.tsx:
    - In validatePassword (Counter Manager Account Creation flow): when isRequired is true or password provided, length must be between 8 and 30 characters -> 'Password must be between 8 and 30 characters'.
  - In Frontend Money Card/src/features/auth/ActivateAccountPage.tsx:
    - In account activation/creation password setup: password.length < 8 -> 'Password must be at least 8 characters'.
  - In Backend Money Card/src/validation/user.schema.ts:
    - In createStaffSchema (Staff Account Creation): password: z.string().min(8, 'Password must be at least 8 characters long').max(128).
  - In Backend Money Card/src/controllers/staff.controller.ts:
    - In createStaff: trimmedPassword.length < 8 -> 'Password must be at least 8 characters long'.
  - In Backend Money Card/src/controllers/organization.controller.ts:
    - In createBranch (Counter Manager Creation): password.length < 8 || password.length > 30 -> 'Password must be between 8 and 30 characters'.
    - In bulkCreateBranches: effectivePassword.length < 8 || effectivePassword.length > 30 -> 'Password must be between 8 and 30 characters'.
  - In Frontend Money Card/src/__tests__/counterDetailsValidation.test.ts:
    - Update test assertions for account creation password validation to reflect 8 characters.

- Login & Non-Creation Flows (Unrestricted by 8-Character Minimum):
  - In Frontend Money Card/src/features/auth/LoginPage.tsx:
    - Accepts non-empty string without blocking existing users with shorter passwords.
  - In Flutter Money card/lib/features/auth/login_screen.dart:
    - Accepts non-empty string without blocking existing staff login.
  - In Backend Money Card/src/validation/common.schema.ts:
    - loginPasswordSchema remains min(1) to allow legacy and existing credentials.

2. Mobile POS Wallet Recharge 4-Digit Limit
- In Flutter Money card/lib/features/payments/recharge_screen.dart:
  - Add LengthLimitingTextInputFormatter(4) and FilteringTextInputFormatter.digitsOnly to the amount text field.
  - Validator enforces amount <= 9999 ('Amount cannot exceed Rs. 9,999 (4 digits maximum)').
  - _addQuickAmount prevents cumulative quick-add buttons (+50, +100, +200, +500) from exceeding 9999.
- In Flutter Money card/lib/providers/recharge_provider.dart:
  - In RechargeState.canSubmit: amount <= 9999.
  - In RechargeNotifier.setAmount: reject/cap any input above 9999.

3. POS Mobile App Flow Refinements (Merged from Remote)
- QR Scanner Universal Compatibility & Error Page Removal:
  - Enable scanning of all QR codes without showing blocking 'Wallet Not Registered' screen.
  - Reset camera scanner state immediately upon dialog dismissal or error.
- Automatic Session Expiry Logout:
  - Auto-redirect to login screen on 401 token expiry with minimal warning banner.
- Streamlined Recharge & Direct Navigation:
  - Tapping Recharge directly opens RechargeScreen; Top-up History accessible via History button in AppBar.
  - Intermediate 'Confirm Recharge' popup removed; tapping Recharge directly processes transaction.
- Direct Billing & Orders Button:
  - Tapping Billing directly opens PosCheckoutScreen; Orders button in AppBar accesses active order history.
- Bill Receipt Screen:
  - Bottom 'Done' button replaced with top-right tick button in AppBar.

4. Retained Analytics Parity & QR Scanned Hub Cleanup
- Analytics Parity across Super Admin, Org Admin, and Counter Dashboard:
  - Menu Analytics displays Food Quantity ({itemsSold} Items) and Cancelled Orders ({cancelledOrders} Orders). Dishes Ordered is eliminated.
  - In Flutter Money card/lib/services/analytics_pdf_service.dart: update table row label from 'Total Items Sold' to 'Food Quantity' with '${analytics.productsSoldCount} Items'.
- Mobile POS QR Scanned Action Hub:
  - When card QR is scanned in pos_scan_purchase_screen.dart, Recharge, Billing, and Return & Refund action tiles display only title and icon without subheadings.

UI Layout & ASCII Wireframes

Account Creation Password Field (Staff and Counter Creation):
+-------------------------------------------------------+
| Password (for initial POS login)                      |
| [ **********                                     [Eye]|
| Minimum 8 characters required                         |
+-------------------------------------------------------+

Mobile POS Wallet Recharge 4-Digit Limit:
+-----------------------------------+
| Recharge Card Session             |
+-----------------------------------+
| Payment Method: [ CASH ]  [ UPI ] |
|                                   |
| Recharge Amount (Rs.)             |
| [ Rs. 5000                   ]    |
| 4-digit maximum limit (Rs. 9,999) |
|                                   |
| Quick Add:                        |
| [ +50 ] [ +100 ] [ +200 ] [ +500 ]|
|                                   |
| [ Recharge Wallet               ] |
+-----------------------------------+

Verification & Automated Test Plan

1. Backend Automated Tests:
- Proactively run npm test in Backend Money Card/ (all unit tests must pass).

2. Frontend Automated Tests:
- Proactively run npm test -- --run in Frontend Money Card/ (284 tests across 37 suites must pass).
- Proactively run npx tsc --noEmit in Frontend Money Card/ (0 errors).

3. Mobile POS Automated Tests & Static Analysis:
- Proactively run flutter test in Flutter Money card/ (170 tests must pass).
- Proactively run flutter analyze --no-pub in Flutter Money card/ (0 issues).

4. Shorebird CodePush OTA Patch:
- Proactively publish Shorebird OTA patch when authorized.

5. Version Control:
- Complete rebase and push cleanly to remote origin/staging.
