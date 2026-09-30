# Implementation Plan - Minimal Card Details, Return & Settle Two-Button Flow, and Block Wallet Dialog

![Minimal Card Details, Return & Settle, and Block Wallet UI](C:\Users\damie\.gemini\antigravity-ide\brain\999581c9-5c30-4195-933d-3667425ed95a\minimal_cards_and_return_refund_parity_1790743012642.jpg)

Proposed Worktree Specifications

1. Merge Card Details Header and Active Session Cards into One Minimal Card
- File: Flutter Money card/lib/features/cards/card_details_screen.dart
  - Lines 470-650: In CardDetailsScreen, merge the two stacked cards (Card Header Summary card + Active Session card) into a single, minimal, unified card:
    - Top row: Physical card number (card.physicalCardNumber), Cycle badge (Cycle N) if active, and Card Status badge (ACTIVE, AVAILABLE, BLOCKED).
    - Session row (if active):
      - Left: 'Current Balance' label and balance display in bold (Rs. 450.00).
      - Right: Customer name and phone in subtle secondary text.
    - Minimal Blocked Banner (if blocked): compact single-line indicator with reason.
    - Removes the separate 'Active Session' section header, duplicate session active badge, and extra divider/timestamp clutter.

2. Return & Settle Screen: Remove "Refund Calculation" Tab & Provide Separate Refund and Return Buttons
- File: Flutter Money card/lib/features/payments/return_card_screen.dart
  - Remove the redundant 'Refund Calculation' card (lines 196-223) which duplicated the remaining balance.
  - In the Overview Card, provide TWO dedicated, side-by-side action buttons matching the Scanned QR Return & Refund sheet:
    - Refund Button:
      - Icon: Icons.payments_outlined
      - Label: 'Refund'
      - Outlined button with amber styling.
      - Action: calls _handleRefundOnly(session) to refund available money to customer while keeping the wallet session active.
    - Return Button:
      - Icon: Icons.assignment_return_outlined
      - Label: 'Return'
      - Elevated button with AppColors.error (red).
      - Action: calls _handleConfirmReturn(session) to settle the session, return card to AVAILABLE, and display the digital settlement receipt.
  - Updates AppBar title to 'Return & Refund' for consistency across the app.
- File: Flutter Money card/test/features/payments/return_card_test.dart
  - Update widget test expectations:
    - Verify balance appears once in the overview card (expect(find.text('Rs. 320.00'), findsOneWidget)).
    - Tap find.widgetWithText(ElevatedButton, 'Return') to execute and verify the return settlement workflow.

3. Minimalist Block Wallet Dialog
- File: Flutter Money card/lib/features/cards/card_details_screen.dart
  - In _handleBlockCard:
    - Remove the bulky, nested 'Blocked By (Default):' container box from the dialog body. Staff details remain automatically formatted in the backend payload.
    - Remove heavy dividers and stacked explanatory text.
    - Redesign dialog into a clean, compact modal:
      - Header: 'Block Wallet' with subtle red block icon (Icons.block).
      - Subtitle: 'This wallet will be disabled from making purchases or transactions.'
      - Clean reason dropdown (Lost or Stolen, Damaged Card, Suspicious Activity, Customer Request, Other).
      - Conditional clean single-line input field only when 'Other Reason' is selected.
      - Flat actions: TextButton 'Cancel' and compact ElevatedButton 'Block Wallet' (AppColors.error).

UI Layout & ASCII Wireframe

Card Details Screen (Merged Single Minimal Card):
+------------------------------------------+
|  [<-]  Wallet MC-101                     |
+------------------------------------------+
| +--------------------------------------+ |
| | MC-101   [Cycle 1]          [ACTIVE] | |
| |                                      | |
| | Current Balance        Customer:     | |
| | Rs. 450.00             John Doe      | |
| +--------------------------------------+ |
|                                          |
| Action Buttons:                          |
| [ Recharge ]                             |
| [ New POS Purchase ]                     |
| [ Return & Refund ]                      |
| [ Block Wallet ]                         |
+------------------------------------------+

Return & Settle Screen (Single Overview Card + 2 Buttons):
+------------------------------------------+
|  [<-]  Return & Refund                   |
+------------------------------------------+
| +--------------------------------------+ |
| | MC-101                      [ACTIVE] | |
| | Remaining Balance                    | |
| | Rs. 450.00                           | |
| |                                      | |
| | [ Refund ]           [ Return ]      | |
| +--------------------------------------+ |
| (Refund Calculation tab removed)         |
+------------------------------------------+

Minimal Block Wallet Dialog:
+------------------------------------------+
| [!] Block Wallet                         |
| This wallet will be disabled from        |
| making purchases or transactions.        |
|                                          |
| Reason                                   |
| [ Lost or Stolen Wallet                v]|
|                                          |
|            [ Cancel ]  [ Block Wallet ]  |
+------------------------------------------+

Verification & Automated Test Execution Plan
1. Flutter Unit & Widget Tests: Run flutter test autonomously to verify ReturnCardScreen, CardDetailsScreen, and all mobile tests.
2. Flutter Static Analysis: Run flutter analyze --no-pub to verify 0 Dart warnings.
3. Web App & Backend Parity: Proactively run npm test -- --run and npm test across Frontend and Backend.
4. Version Control: Auto-commit changes locally on branch staging without emojis.
