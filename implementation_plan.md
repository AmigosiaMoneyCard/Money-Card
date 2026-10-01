# Implementation Plan: Mobile Recharge Progressive Amount Display, Cancel Label Parity, and Refund Cancellation Analysis

This plan addresses:
1. Mobile Recharge Screen: Remove the "Select one to proceed" helper text. Hide the recharge amount section (amount field, quick chips, balance preview, error banner, and recharge button) completely until staff clicks either Cash or UPI.
2. Mobile Recharges History & Session Details: Rename the "CANNOT VOID" badge to "Cancel" with disabled styling (`onPressed: null`) so that non-voidable transactions display a disabled "Cancel" button.
3. Cash Refund Cancellation Architectural Review: Analysis and recommendation on whether staff should be able to cancel a cash refund.

---

## Domain Analysis & Recommendation: Should We Allow Canceling a Cash Refund?

Recommendation: NO (Do not add a Cancel option for Cash Refunds).

Financial and Operational Reasons:
1. Physical Cash Discrepancy: When a cash refund is issued at card return/settlement, physical cash is handed out of the register to the customer. Canceling the transaction in software does not guarantee the customer returns the cash, introducing register shortage discrepancies.
2. Session Lifecycle & State Integrity: A cash refund occurs during wallet settlement (`CARD_SETTLEMENT`). Settlement closes the card session (`SessionStatus.COMPLETED`) and detaches the physical card back to `AVAILABLE` inventory. Canceling a refund would require resurrecting a closed session and reclaiming a card that may already have been re-issued to another patron.
3. Audit and Fraud Prevention: In POS standards, completed settlement refunds must be irreversible audit records. If cash was refunded by mistake, the operational standard is simply to issue a new session or perform a fresh cash recharge.

---

## User Interface Wireframe

### Mobile Recharge Screen — Initial State (No Payment Method Selected)

```
+-----------------------------------------------------------+
| < Recharge                                        History |
+-----------------------------------------------------------+
|                                                           |
| Payment Method                                            |
|                                                           |
| +-------------------------+   +-------------------------+ |
| |        ( ) Cash         |   |        ( ) UPI          | |
| |                         |   |                         | |
| +-------------------------+   +-------------------------+ |
|                                                           |
| (Amount input, quick chips, and submit button are HIDDEN) |
|                                                           |
+-----------------------------------------------------------+
```

### Mobile Recharge Screen — After Clicking Cash or UPI

```
+-----------------------------------------------------------+
| < Recharge                                        History |
+-----------------------------------------------------------+
|                                                           |
| Payment Method                                            |
|                                                           |
| +-------------------------+   +-------------------------+ |
| | [x] CASH          (V)   |   |        ( ) UPI          | |
| | (Emerald border & bg)   |   |                         | |
| +-------------------------+   +-------------------------+ |
|                                                           |
| Recharge Amount (INR)                                     |
| [ INR  Enter amount (max 9,999)                         ] |
|                                                           |
| [+50]  [+100]  [+200]  [+500]                             |
|                                                           |
| Expected New Balance:                           INR 350.00|
|                                                           |
| [================ Recharge Wallet ======================] |
+-----------------------------------------------------------+
```

### Mobile Recharges History — Disabled Cancel Button

```
+-----------------------------------------------------------+
| Top-up History                                            |
+-----------------------------------------------------------+
| +INR 200.00   [Cash]                                      |
| Wallet: #MC-101                                           |
| Customer: John Doe                                        |
| Time: 12:10 PM                                            |
|                                                           |
| [ Cancel ] <-- Disabled greyed-out button (non-clickable) |
| (Balance already spent or session closed)                 |
+-----------------------------------------------------------+
```

---

## Technical Design & Exact Code Changes

### 1. Flutter Mobile: `Flutter Money card/lib/features/payments/recharge_screen.dart`
- In `build` method:
  - Remove the helper text:
    `if (rechargeState.paymentMethod == null) const Text('Select one to proceed', ...)`
  - Wrap the amount section in `if (rechargeState.paymentMethod != null) ...[`:
    - Amount input label and `TextFormField`
    - Quick amount chips (`_quickAmounts`)
    - Expected new balance card preview
    - Error banner
    - Submit `AppButton` (`Recharge Wallet`)
  - In `_showTopUpHistorySheet`:
    - For non-cancellable transactions (`!t.canCancel || session.balance < t.amount || !session.isActive`), replace the "CANNOT VOID" container with a disabled `OutlinedButton` displaying label `'Cancel'` with `onPressed: null`.

### 2. Flutter Mobile: `Flutter Money card/lib/features/recharges/recharges_screen.dart`
- In `_buildTransactionCard`:
  - For transactions where `!tx.canCancel`:
    - Replace the "CANNOT VOID" badge with a disabled `OutlinedButton` with icon `Icons.cancel_outlined`, label `Text('Cancel')`, and `onPressed: null` (or disabled badge container with `'Cancel'`).

### 3. Flutter Mobile: `Flutter Money card/lib/features/sessions/session_details_screen.dart`
- In `_buildTransactionCard`:
  - For recharge transactions where `!txn.canCancel || session.balance < txn.amount`:
    - Replace the "CANNOT VOID" container with a disabled `OutlinedButton` with label `'Cancel'` and `onPressed: null`.

### 4. Automated Tests: `Flutter Money card/test/features/payments/recharge_test.dart`
- Verify that widget tests assert amount input is not visible until payment method is tapped.
- Ensure all 171+ Flutter tests continue to pass.

---

## Verification Plan

1. Proactive Flutter Tests:
   - Run `flutter analyze --no-pub` to ensure 0 lint or analyzer errors.
   - Run `flutter test` to ensure 100% test pass rate.
2. Web & Backend Regression:
   - Run `npx tsc --noEmit` and `npm test -- --run` in `Frontend Money Card`.
   - Run `npm test` in `Backend Money Card`.
3. Local Git:
   - Auto-approved commit on `staging`.
   - Ask user before pushing to remote or Shorebird.
