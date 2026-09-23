# Implementation Plan: Mobile POS QR Actions, UPI Simplification, Consolidated Analytics, and Recharges Management

Technical specification for mobile app updates including Cancel/Edit order with auto-refund on QR scan, removing UPI verification checkbox and reference box, QR Info and More showing recharge/refund counts, consolidated single-box mobile analytics (Total heading with Cash/UPI subheadings), 2-tab Analytics with Recharges list and Cancel dropdown, Done-only transaction completion, and Shorebird staging release.

## Architecture and Visual Design
![Mobile Analytics and QR Action Hub](file:///C:/Users/damie/.gemini/antigravity-ide/brain/9c70217b-9240-4d11-907e-eaaf4a37b746/mobile_analytics_recharges_and_qr_actions_1790149326416.jpg)

![Recharge and Purchase Done Only Receipt](file:///C:/Users/damie/.gemini/antigravity-ide/brain/9c70217b-9240-4d11-907e-eaaf4a37b746/recharge_purchase_done_only_1790148435433.jpg)

![Mobile Dashboard Redesign](file:///C:/Users/damie/.gemini/antigravity-ide/brain/9c70217b-9240-4d11-907e-eaaf4a37b746/mobile_dashboard_nav_and_profile_redesign_1790146443555.jpg)

---

## ASCII Layout Wireframes

### Scanned QR Action Screen: Cancel/Edit Order & Info Buttons
```
+-------------------------------------------------------------+
| [<] Card: MC-1042                               [Scan QR]   |
+-------------------------------------------------------------+
|   MC-1042                                          [ACTIVE] |
|   Customer: John Doe • 9876543210                           |
|   Balance: ₹350.00                              Active Now  |
+-------------------------------------------------------------+
|   CARD ACTIONS & OPERATIONS                                 |
|                                                             |
|   +-----------------------------------------------------+   |
|   | [Cart] Add Products                             [>] |   |
|   | Order food items from menu catalog                  |   |
|   +-----------------------------------------------------+   |
|                                                             |
|   +-----------------------------------------------------+   |
|   | [Cancel] Cancel / Edit Recent Order             [>] |   |
|   | Void latest order (₹120) & auto-refund to card      |   |
|   +-----------------------------------------------------+   |
|                                                             |
|   +-----------------------------------------------------+   |
|   | [Info] Card Info & Statistics                   [>] |   |
|   | Recharges: 3 • Refunds: 1 • Total Spent: ₹450       |   |
|   +-----------------------------------------------------+   |
|                                                             |
|   +-----------------------------------------------------+   |
|   | [Wallet] Recharge Card                          [>] |   |
|   | Load cash or online UPI balance onto card           |   |
|   +-----------------------------------------------------+   |
|                                                             |
|   +-----------------------------------------------------+   |
|   | [Return] Settle / Return Card                   [>] |   |
|   +-----------------------------------------------------+   |
+-------------------------------------------------------------+
```

### Streamlined UPI Recharge Screen (Checkbox & Verification Box Removed)
```
+-------------------------------------------------------------+
| [<] Recharge Card                                           |
+-------------------------------------------------------------+
|   Card: MC-1042                                             |
|   Current Balance: ₹150.00                                  |
|                                                             |
|   Payment Method:                                           |
|   ( ) Cash          (*) UPI                                 |
|                                                             |
|   (UPI verification box and checkbox completely removed)    |
|                                                             |
|   Recharge Amount (₹):                                      |
|   [ 200                                                   ] |
|   Quick picks: [+₹100]  [+₹200]  [+₹500]  [+₹1000]          |
|                                                             |
|   New Balance Preview: ₹350.00                              |
|                                                             |
|   [                (v) Confirm Recharge                   ] |
+-------------------------------------------------------------+
```

### Mobile Analytics: Consolidated Single-Box Metric Cards
```
+-------------------------------------------------------------+
| Analytics - Main Cafeteria                                  |
| [  Overview  ]                    [ Recharges Analytics ]   |
+-------------------------------------------------------------+
| Date Filter: Today (23 Sep 2026)                            |
+-------------------------------------------------------------+
|                                                             |
| +---------------------------------------------------------+ |
| | RECHARGE AMOUNT                                         | |
| | ₹18,450.00                                              | |
| | Cash: ₹11,200.00    |    UPI: ₹7,250.00                 | |
| +---------------------------------------------------------+ |
|                                                             |
| +---------------------------------------------------------+ |
| | REFUND AMOUNT                                           | |
| | ₹1,200.00                                               | |
| | Cash: ₹900.00       |    UPI: ₹300.00                   | |
| +---------------------------------------------------------+ |
|                                                             |
| +---------------------------------------------------------+ |
| | CANCELED RECHARGE AMOUNT                                | |
| | ₹500.00                                                 | |
| | Cash: ₹500.00       |    UPI: ₹0.00                     | |
| +---------------------------------------------------------+ |
|                                                             |
| +---------------------------------------------------------+ |
| | NET AMOUNT                                              | |
| | ₹16,750.00                                              | |
| | Net Cash: ₹9,800.00 |    Net UPI: ₹6,950.00             | |
| +---------------------------------------------------------+ |
|                                                             |
| +---------------------------------------------------------+ |
| | WALLET ACTIVATION                                       | |
| | 42 Cards Issued                                         | |
| | Active: 36          |    Settled: 6                     | |
| +---------------------------------------------------------+ |
|                                                             |
| +---------------------------------------------------------+ |
| | RECHARGE COUNT                                          | |
| | 38 Recharges                                            | |
| | Cash: 22 txns       |    UPI: 16 txns                   | |
| +---------------------------------------------------------+ |
|                                                             |
| +---------------------------------------------------------+ |
| | REFUND COUNT                                            | |
| | 4 Refunds Processed                                     | |
| | Total Returned: ₹1,200.00                               | |
| +---------------------------------------------------------+ |
|                                                             |
| +---------------------------------------------------------+ |
| | CANCELED ORDERS                                         | |
| | 3 Orders Canceled                                       | |
| | Total Refunded: ₹360.00                                 | |
| +---------------------------------------------------------+ |
|                                                             |
| +---------------------------------------------------------+ |
| | CANCELED RECHARGES                                      | |
| | 1 Top-up Voided                                         | |
| | Total Deducted: ₹500.00                                 | |
| +---------------------------------------------------------+ |
+-------------------------------------------------------------+
```

### Recharges Analytics Tab with Cancel Dropdown Option
```
+-------------------------------------------------------------+
| Analytics - Main Cafeteria                                  |
| [  Overview  ]                    [ Recharges Analytics ]*  |
+-------------------------------------------------------------+
| Filter: All Recharges (38 records)                          |
+-------------------------------------------------------------+
| Coupon / Txn ID: RCH-94810234               [  (v) Cancel ] |
| Card: MC-1042                                               |
| Date & Time: 23 Sep 2026, 11:42 AM                          |
| Staff: Alex Kumar (Counter 1)                               |
| Amount: ₹500.00 [UPI Badge]                    [ SUCCESS ]  |
| ----------------------------------------------------------- |
| Coupon / Txn ID: RCH-94801129               [  (v) Cancel ] |
| Card: MC-1008                                               |
| Date & Time: 23 Sep 2026, 10:15 AM                          |
| Staff: Alex Kumar (Counter 1)                               |
| Amount: ₹200.00 [Cash Badge]                   [ SUCCESS ]  |
| ----------------------------------------------------------- |
| Coupon / Txn ID: RCH-94799014                               |
| Card: MC-1025                                               |
| Date & Time: 23 Sep 2026, 09:30 AM                          |
| Staff: Priya Sharma (Counter 1)                             |
| Amount: ₹300.00 [UPI Badge]                  [ CANCELLED ]  |
+-------------------------------------------------------------+
```

---

## Technical Scope and File Breakdown

1. Cancel / Edit Order Button with Auto-Refund upon QR Scan
- User Requirement: When a person orders something but asks to cancel or order something else, provide a direct Cancel/Edit order button when the QR code is scanned to cancel the current order and auto-refund the balance back to the QR card session.
- Files:
  - `Flutter Money card/lib/features/pos/pos_scan_purchase_screen.dart`:
    - Add a dedicated action tile: `[ Cancel / Edit Recent Order ]` directly on the scanned card hub.
    - Handler `_handleQuickCancelRecentOrder()`:
      - Inspects `_activeSession.transactions` for the most recent order with `type == TransactionType.purchase` and `!isCancelled`.
      - If found: opens confirmation dialog stating the order items and total amount, with two options:
        - "Refund & Cancel Order"
        - "Cancel & Re-order Items" (auto-refunds order amount to card and navigates directly to POS Menu Catalog `/app/pos/:sessionId`).
      - Calls `sessionService.cancelOrder(transactionId: latestOrder.id, reason: 'Customer changed mind')`.
      - Automatically reloads the session balance and shows confirmation toast.
      - If no recent order exists: shows informational snackbar "No active recent orders found on this card."

2. UPI Payment Option Streamlining (Remove Checkbox and Verification Box)
- User Requirement: In UPI payment option, remove the checkbox and the UPI payment verification box entirely.
- Files:
  - `Flutter Money card/lib/features/payments/recharge_screen.dart`:
    - Delete lines 349-430 rendering the UPI payment verification text field (`Payment Reference / UTR`) and the staff verification checkbox (`rechargeState.isStaffVerified`).
    - Remove `isStaffVerified` requirement from `_handleConfirmRecharge` validation.
    - Make UPI selection completely direct: selecting UPI simply sets `paymentMethod = PaymentMethod.upi` without prompting for UTR reference or verification toggle.
  - `Flutter Money card/lib/providers/recharge_provider.dart`:
    - Update `canSubmit` getter so it does not mandate reference or verification flags.

3. Scanned QR Info & More Button (Recharge Count and Refund Count)
- User Requirement: When QR code is scanned, provide an Info and More button displaying number of recharges and number of refunds in a separate button/view.
- Files:
  - `Flutter Money card/lib/features/pos/pos_scan_purchase_screen.dart`:
    - Add action tile: `[ Card Info & Statistics ]`.
    - Handler `_showCardSessionInfoSheet()`:
      - Calculates metrics from `session.transactions`:
        - Number of successful recharges and total recharge volume.
        - Number of refunds and total refunded amount.
        - Number of food orders placed and total food purchases.
        - Card issue date, session token, customer details, and current balance.
      - Displays these metrics in a clean modal bottom sheet with distinct stat cards.

4. Mobile Analytics Single-Box Consolidated Metric Cards
- User Requirement: In mobile analytics, provide Recharge amount, refund amount, canceled recharge amount, net amount, wallet activation, recharge count, refund count, canceled orders, canceled recharges in terms of Total as the main heading and Cash, UPI in subheading in a single box.
- Files:
  - `Flutter Money card/lib/features/analytics/analytics_screen.dart`:
    - Create a reusable widget `_buildConsolidatedMetricBox({required String title, required String totalText, String? cashSubtext, String? upiSubtext, IconData? icon, Color? accentColor})`.
    - Layout:
      - Title row: Small muted uppercase title with subtle icon.
      - Main heading: High-contrast large bold Total figure (e.g. `₹18,450.00` or `42 Cards`).
      - Subheadings in the same box: Clean horizontal badges displaying Cash and UPI breakdown.
    - Implement all requested metric cards:
      1. Recharge Amount: Total (heading), Cash & UPI (subheading)
      2. Refund Amount: Total (heading), Cash & UPI (subheading)
      3. Canceled Recharge Amount: Total (heading), Cash & UPI (subheading)
      4. Net Amount: Total (heading), Cash & UPI (subheading)
      5. Wallet Activation: Total Cards Issued (heading), Active & Settled (subheading)
      6. Recharge Count: Total Recharges (heading), Cash & UPI counts (subheading)
      7. Refund Count: Total Refunds (heading), Total volume refunded (subheading)
      8. Canceled Orders: Total Canceled Orders (heading), Total volume refunded (subheading)
      9. Canceled Recharges: Total Voided Recharges (heading), Total volume deducted (subheading)

5. Recharges Analytics Tab with List and Cancel Dropdown Option
- User Requirement: In Analytics, provide 2 buttons (tabs) including Recharges analytics where coupon/transaction id, date, time, staff name, amount are shown, and a dropdown with Cancel option to cancel recharges.
- Files:
  - `Flutter Money card/lib/features/analytics/analytics_screen.dart`:
    - Change TabBar in AppBar to 2 tabs:
      - Tab 1: `Overview`
      - Tab 2: `Recharges Analytics`
    - Recharges Analytics Tab View:
      - Calls `ref.read(sessionServiceProvider).listRecharges(branchId: currentBranch?.id, startDate: _startDate, endDate: _endDate)`.
      - Renders list of recharges displaying:
        - Coupon / Transaction ID (`displayTransactionId`)
        - Physical Card Number / Identifier
        - Date & Time formatted cleanly
        - Staff Name who performed the recharge
        - Amount with Cash/UPI badge
        - Status badge: `SUCCESS` vs `CANCELLED`
        - Action Dropdown / Popup Menu:
          - Option: `[ Cancel Recharge ]` (enabled only for non-cancelled recharges)
          - Selecting opens confirmation dialog explaining that the amount will be voided and deducted from the card.
          - Calls `sessionService.cancelRecharge(transactionId: t.id, reason: selectedReason)`.
          - Automatically refreshes the recharges list and analytics metrics.

6. Transaction Done-Only Completion Flow (No Preview / Download PDF)
- Files:
  - `Flutter Money card/lib/widgets/receipt/digital_receipt_dialog.dart` (recharge & return flow)
  - `Flutter Money card/lib/features/receipt/bill_receipt_screen.dart` (POS checkout flow)
  - Both retain strictly a single full-width `AppButton(label: 'Done', icon: Icons.check, onPressed: _handleDone)`. Preview and download PDF buttons are absent.
  - Test Updates:
    - Update `hardware_hardening_test.dart`, `recharge_test.dart`, and `return_card_test.dart` to assert only `Done` button is present.

7. Navigation & Profile Screen
- Files: `staff_app_shell.dart`, `app_router.dart`, `more_screen.dart`
  - Bottom navigation: Home - Cards - Menu - Analytics
  - Dedicated Profile Screen accessed via top-right profile avatar.

8. Cards Filtering & Home Screen Cleanup
- Files: `card_operations_provider.dart`, `cards_screen.dart`, `home_screen.dart`
  - Cards screen displays Active cards by default.
  - Active Sessions preview container removed from Home.

9. Password Relaxation & Analytics PDF Peak Table Removal
- Files: `change_password_screen.dart`, `analytics_pdf_service.dart`
  - Remove password complexity checks.
  - Remove peak activity periods table from PDF generator.

10. Shorebird Staging Patch Execution
- Command: `"y" | shorebird patch android --target lib/main_staging.dart --flavor staging --release-version 1.0.2+3 --allow-asset-diffs`

---

## Verification Plan

Automated Tests:
- Flutter Code Analysis: `flutter analyze --no-pub` in `Flutter Money card/` (0 issues required)
- Flutter Unit & Widget Tests: `flutter test` in `Flutter Money card/` (all passing)

Manual Verification:
- Cancel / Edit Order on QR: Scan QR card, tap Cancel / Edit Order, verify latest order is cancelled and auto-refunded to card balance.
- UPI Recharge Flow: Open recharge screen, select UPI, verify checkbox and reference text fields are completely gone and recharge confirms cleanly.
- Card Info & Statistics: Scan QR card, tap Card Info & Statistics, verify recharge count and refund count display accurately.
- Mobile Analytics Consolidated Cards: Open Analytics -> Overview, verify all 9 metric cards display Total as main heading and Cash/UPI in subheading within single boxes.
- Recharges Analytics Tab: Open Analytics -> Recharges Analytics, verify list displays Coupon/Txn ID, date/time, staff name, amount, and Cancel dropdown option voids recharge correctly.
- Shorebird CodePush: Verify patch deployment completes cleanly to staging flavor.
