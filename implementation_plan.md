# Implementation Plan - POS Mobile App Flow Refinements

## Executive Summary
This implementation plan addresses mobile POS refinements across 6 key functional areas:
1. **QR Scanner Universal Compatibility & Error Page Removal**: Enable scanning of all QR codes without showing the blocking "Wallet Not Registered" screen, fixing the camera scanner freeze/lockup.
2. **Automatic Session Expiry Logout**: Auto-redirect to the login screen with a sleek, minimal warning message when an API session expires (401 / token refresh failure).
3. **Streamlined Recharge Navigation & Top-Up History Relocation**: Clicking "Recharge" directly opens the Recharge page; top-up history is accessible via a new "History" button on the top-right of the Recharge page parallel to the header.
4. **Direct Billing Navigation & Orders Button in POS Menu**: Clicking "Billing" directly opens the POS Menu & Purchase page; order history/management is accessible via a new "Orders" button on the top-right of the POS Menu AppBar.
5. **Recharge Confirmation Removal**: Remove the intermediate "Confirm Recharge" popup; executing a recharge directly transitions to the Recharge Successful receipt.
6. **Bill Page Header Tick Button**: In the Bill/Receipt screen, remove the bottom "Done" button and search toggle, replacing it with a top-right tick (`✓`) button in the AppBar to continue.

---

## Component Breakdown & Detailed Changes

### 1. QR Scanner Resilience & Error Page Removal
- **Files**:
  - `Flutter Money card/lib/features/pos/pos_scan_purchase_screen.dart`
  - `Flutter Money card/lib/widgets/scanner/qr_scanner_view.dart`
  - `Flutter Money card/lib/core/utils/qr_validator.dart`
  - `Flutter Money card/lib/core/network/interceptors/mock_api_interceptor.dart`
  - `Backend Money Card/src/controllers/cards.controller.ts`
- **Changes**:
  - **Remove Unregistered Error Screen**: Delete the full-page blocking state (`_scanErrorMessage != null` rendering `Wallet Not Registered` with `Icons.credit_card_off`).
  - **Camera Scanner Unlocking**:
    - In `QrScannerView`, implement a way to reset `_isProcessingScan` (e.g. expose a controller or key, or automatically reset scanning if a scan callback completes without navigating away).
    - In `pos_scan_purchase_screen.dart`, ensure that if resolution fails, throws an error, or the user cancels the activation dialog, the scanner state is immediately reset (`_resetScan()` / `resumeScanning()`), allowing the camera to scan again without requiring a screen restart.
  - **Universal QR Token Extraction**:
    - In `qr_validator.dart`, relax `extractToken` so it does not discard tokens shorter than 4 characters. Support all strings (length >= 1), trimmed, URLs (extracting last path segment or query param if `/c/`), bare card codes, and prefixed tokens (`mc:`, `qtk_`).
  - **Graceful Error Notification**:
    - If a card resolution truly fails (e.g. network failure), display a lightweight floating `SnackBar` without unmounting the scanner, and keep camera scanning active.
  - **Auto-Registration of New Cards**:
    - Ensure that any unscanned/new QR token is recognized and opens the activation prompt with branch assignment, rather than failing with 404.

### 2. Session Expiration & Auto-Logout
- **Files**:
  - `Flutter Money card/lib/providers/api_providers.dart`
  - `Flutter Money card/lib/providers/auth_provider.dart`
  - `Flutter Money card/lib/routing/app_router.dart`
  - `Flutter Money card/lib/features/auth/login_screen.dart`
- **Changes**:
  - **Trigger AuthNotifier on Session Expiry**:
    - In `api_providers.dart`, update the `onSessionExpired` callback:
      ```dart
      onSessionExpired: () {
        try {
          tokenStorage.clearTokens();
          ref.read(authNotifierProvider.notifier).setSessionExpired();
        } catch (_) {}
      },
      ```
  - **Router Redirection**:
    - `authNotifierProvider` transitions to `AuthStatus.sessionExpired`.
    - `_AuthListenable` in `app_router.dart` receives the state change and GoRouter redirects to `/login`.
  - **Minimal Warning Display**:
    - On `LoginScreen`, show a compact, minimal warning banner: *"Session expired. Please log in again."* with a subtle clock/lock icon.

### 3. Recharge Flow & Top-Up History Placement
- **Files**:
  - `Flutter Money card/lib/features/pos/pos_scan_purchase_screen.dart`
  - `Flutter Money card/lib/features/payments/recharge_screen.dart`
- **Changes**:
  - **Direct Recharge Navigation**:
    - In `pos_scan_purchase_screen.dart`, update the "Recharge" action tile `onTap` to directly call `_openRecharge()` (`context.push('/app/recharge/${session.id}')`) instead of opening the bottom sheet modal.
  - **Top-Up History in Recharge Screen**:
    - In `RechargeScreen` (`recharge_screen.dart`), add an action button in the `AppBar` actions:
      ```dart
      IconButton(
        icon: const Icon(Icons.history),
        tooltip: 'Top-up History',
        onPressed: () => _showTopUpHistorySheet(context, session),
      )
      ```
    - Implement `_showTopUpHistorySheet` displaying previous recharge transactions for this session, showing amounts (`+₹...`), payment methods (CASH/UPI), timestamps, and cancel options.

### 4. Billing Flow & Orders Button in POS Menu
- **Files**:
  - `Flutter Money card/lib/features/pos/pos_scan_purchase_screen.dart`
  - `Flutter Money card/lib/features/pos/pos_checkout_screen.dart`
- **Changes**:
  - **Direct Billing Navigation**:
    - In `pos_scan_purchase_screen.dart`, update the "Billing" action tile `onTap` to directly call `_openAddProducts()` (`context.push('/app/pos/${session.id}')`) instead of opening the bottom sheet modal.
  - **Orders Button in POS Menu**:
    - In `PosCheckoutScreen` (`pos_checkout_screen.dart`), add an action button on the top right in `AppBar`:
      ```dart
      TextButton.icon(
        icon: const Icon(Icons.receipt_long_outlined, size: 18),
        label: const Text('Orders'),
        onPressed: () => _showOrdersHistorySheet(context, session),
      )
      ```
    - Implement `_showOrdersHistorySheet` displaying previous food orders for this session with Edit and Cancel Order capabilities.

### 5. Recharge Confirmation Step Removal
- **Files**:
  - `Flutter Money card/lib/features/payments/recharge_screen.dart`
- **Changes**:
  - In `_handleConfirmRecharge`:
    - Remove the `showDialog<bool>` with title `'Confirm Recharge'`.
    - Directly validate the form and execute `rechargeNotifier.executeRecharge(session.id, branchId: branch?.id)`.
    - On success, reload relevant providers and immediately call `_showRechargeSuccessDialog(result)`.

### 6. Bill Receipt Screen: Bottom "Done" Button Replaced with Top Tick Button
- **Files**:
  - `Flutter Money card/lib/features/receipt/bill_receipt_screen.dart`
- **Changes**:
  - **Remove Bottom Button**:
    - Delete `AppButton(label: 'Done', icon: Icons.check, onPressed: _handleDone)`.
  - **Remove Search Option in AppBar**:
    - Remove `_isSearching` toggle and search icon button from the AppBar actions.
  - **Add Tick Button in AppBar Actions**:
    - Add a prominent check/tick button on the top right of the AppBar:
      ```dart
      IconButton(
        icon: const Icon(Icons.check, size: 26, color: Colors.white),
        tooltip: 'Continue',
        onPressed: _handleDone,
      )
      ```

---

## Wireframe Specifications

### 1. Active Scanned Wallet Screen (Simplified Action Hub)
```
+-------------------------------------------------------+
| Wallet: MC-001                                        |
+-------------------------------------------------------+
| [ MC-001                           [ ACTIVE ] ]       |
| [ Current Balance                   ₹250.00   ]       |
+-------------------------------------------------------+
| Actions                                               |
|                                                       |
| [ ($) Recharge                                    > ] | -> Direct to RechargeScreen
|                                                       |
| [ [=] Billing                                     > ] | -> Direct to PosCheckoutScreen
|                                                       |
| [ (<) Return & Refund                             > ] |
+-------------------------------------------------------+
```

### 2. Recharge Screen (With Top-Right History Button)
```
+-------------------------------------------------------+
| Recharge Card Session                       [History] | -> Opens Top-up History Sheet
+-------------------------------------------------------+
| Payment Method: [ CASH ]  [  UPI ]                    |
|                                                       |
| Recharge Amount (₹): [ 200                         ] |
| Quick: [ +50 ] [ +100 ] [ +200 ] [ +500 ]             |
|                                                       |
| New Balance: ₹450.00                                  |
|                                                       |
| [ Recharge Wallet (₹200)                            ] | -> Directly recharges (No confirm dialog)
+-------------------------------------------------------+
```

### 3. POS Menu & Purchase Screen (With Top-Right Orders Button)
```
+-------------------------------------------------------+
| POS Menu & Purchase                         [Orders]  | -> Opens View/Edit Orders Sheet
| Balance: ₹450.00                                      |
+-------------------------------------------------------+
| [ Search food or products...                        ] |
+-------------------------------------------------------+
| [Items Grid / List]                                   |
| Masala Dosa                ₹60.00             [ + ]   |
| Cold Coffee                ₹40.00             [ + ]   |
+-------------------------------------------------------+
| [ Cart Summary Bar / Checkout Button                ] |
+-------------------------------------------------------+
```

### 4. Bill Receipt Screen (Top Tick Button, No Bottom Done Button)
```
+-------------------------------------------------------+
| Bill                                              [✓] | -> Continue / Done action
+-------------------------------------------------------+
| +---------------------------------------------------+ |
| |                  MONEY CARD                       | |
| |                MAIN CAFETERIA                     | |
| |                                                   | |
| | Bill No: BILL-#A1B2C3                             | |
| | Date: 29 Sep 2026, 11:45 AM                       | |
| | Card: MC-001                                      | |
| | ------------------------------------------------- | |
| | 1x Masala Dosa                            ₹60.00  | |
| | 1x Cold Coffee                            ₹40.00  | |
| | ------------------------------------------------- | |
| | Total Amount:                            ₹100.00  | |
| | Amount Deducted:                         ₹100.00  | |
| | Remaining Balance:                       ₹350.00  | |
| |                                                   | |
| |                   Thank You!                      | |
| +---------------------------------------------------+ |
+-------------------------------------------------------+
```

---

## Verification & Testing Plan
1. **QR Scanning Test**:
   - Scan standard URLs (`https://.../c/MC-001`), bare tokens (`MC-001`, `101`), raw strings.
   - Verify scanner does not freeze or show "Wallet Not Registered".
   - Verify camera scanner resumes immediately after canceling or completing activation.
2. **Session Expiry Test**:
   - Simulate 401 response or invalid token; verify app logs out and redirects to `/login` with a clean warning message.
3. **Recharge Flow Test**:
   - Verify clicking "Recharge" directly opens `RechargeScreen`.
   - Verify "History" button on the top-right displays the top-up history sheet.
   - Verify tapping "Recharge Wallet" executes immediately without a "Confirm Recharge" dialog, showing the success receipt.
4. **Billing Flow Test**:
   - Verify clicking "Billing" directly opens `PosCheckoutScreen`.
   - Verify "Orders" button in the AppBar opens previous orders with Edit/Cancel options.
5. **Bill Receipt Test**:
   - Verify bottom "Done" button is removed.
   - Verify search bar is removed from the AppBar.
   - Verify top-right tick (`✓`) button finishes and returns cleanly.
