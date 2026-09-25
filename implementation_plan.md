# Confirm Wallet Activation Dialog and Blank Customer Fallback Implementation Plan

![Confirm Wallet Activation Dialog](C:/Users/damie/.gemini/antigravity-ide/brain/999581c9-5c30-4195-933d-3667425ed95a/wallet_activation_dialog_cleanup_1790310511069.jpg)

## Layout Wireframe

```
+-------------------------------------------------------------+
|              [Icon] Confirm Wallet Activation               |
+-------------------------------------------------------------+
|  +-------------------------------------------------------+  |
|  | Wallet Number:                              WLT-1042  |  |
|  +-------------------------------------------------------+  |
|                                                             |
|  +-------------------------------------------------------+  |
|  | [User Icon] Customer Name (Optional)                  |  |
|  +-------------------------------------------------------+  |
|                                                             |
|  +-------------------------------------------------------+  |
|  | [Phone Icon] Phone Number (Optional, 10 Digits)       |  |
|  +-------------------------------------------------------+  |
|                                                             |
|                     [Cancel]  [Confirm & Activate]          |
+-------------------------------------------------------------+
```

## Technical Design and Proposed Changes

- Dialog Declutter:
  - Remove redundant heading label "Customer Details (Optional):".
  - Remove redundant footer text "Customer details are optional. Then the card becomes active."
  - Retain the Wallet Number summary card at the top.
  - Keep exactly two input fields: Customer Name and Phone Number.
  - Update hint text to remove "(default: Walk-in)" and "Walk-in Customer" references (use clean "e.g. John Doe").

- Blank Fallback for Name and Phone:
  - When the staff user leaves Customer Name empty, pass an empty string or null instead of defaulting to "Walk-in Customer".
  - When the staff user leaves Phone Number empty, pass an empty string or null.
  - Ensure backend session creation receives empty/null customer details without synthetic fallback values.

## Worktree Modifications

- Target File 1: [pos_scan_purchase_screen.dart](file:///D:/Money%20Card%20Project/Flutter%20Money%20card/lib/features/pos/pos_scan_purchase_screen.dart)
  - Method / Location: `_handleQrCode(String code)` (around lines 147-236).
  - Actions:
    1. Remove "Customer Details (Optional):" heading label.
    2. Remove "Customer details are optional. Then the card becomes active." footer text.
    3. Update name input hint text from `'e.g. John Doe (default: Walk-in)'` to `'e.g. John Doe'`.
    4. Update session creation name value from `nameCtrl.text.trim().isNotEmpty ? nameCtrl.text.trim() : 'Walk-in Customer'` to `nameCtrl.text.trim()`.

- Target File 2: [card_details_screen.dart](file:///D:/Money%20Card%20Project/Flutter%20Money%20card/lib/features/cards/card_details_screen.dart)
  - Method / Location: `_showActivationDialog` (around lines 163-250).
  - Actions:
    1. Remove "Customer Details (Optional):" heading label.
    2. Remove "Customer details are optional. Then the card becomes active." footer text.
    3. Update hint text to `'e.g. John Doe'`.
    4. Update session creation name value to `nameCtrl.text.trim()` instead of defaulting to `'Walk-in Customer'`.

- Target File 3: [issue_card_screen.dart](file:///D:/Money%20Card%20Project/Flutter%20Money%20card/lib/features/cards/issue_card_screen.dart)
  - Method / Location: `_confirmAndIssueCard` (around lines 136-242).
  - Actions:
    1. Remove "Customer Details (Optional):" heading label.
    2. Remove "Customer details are saved to Customer History. Then the card becomes active." footer text.
    3. Update hint text from `'e.g. Walk-in Customer'` to `'e.g. John Doe'`.
    4. Update resolved name to `nameCtrl.text.trim()` instead of defaulting to `'Walk-in Customer'`.

## Verification and Test Plan

- Proactively execute `flutter test` across all mobile widget and unit test suites.
- Proactively execute `flutter analyze --no-pub` to verify zero static analysis warnings or errors.
- Proactively execute Web and Backend test suites to confirm total project integrity.
