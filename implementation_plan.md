# Implementation Plan — Mobile Analytics Recharge Cards Simplification

## Overview
Simplify the metric cards in the mobile app's Counter Manager Analytics screen under the **Recharge** tab (`Flutter Money card/lib/features/analytics/analytics_screen.dart`).

Remove secondary sub-labels (Cash, UPI, Cards, Ret, Cancelled, Ded) from the following five metric boxes while keeping their primary headline values clean and bold:
1. **Total Sales**: Remove `Cash:` and `UPI:` sub-labels.
2. **Wallet Refund**: Remove `Cash:` and `UPI:` sub-labels.
3. **Wallet Refund Count**: Remove `Cards:` and `Ret:` sub-labels.
4. **Cancelled Amount**: Remove `Cancelled:` and `UPI:` sub-labels.
5. **Cancelled Count**: Remove `Cancelled:` and `Ded:` sub-labels.

---

## Visual Design Reference

![Minimal Analytics Recharge Metric Cards](C:\Users\damie\.gemini\antigravity-ide\brain\218ce084-c8ce-49ca-a93b-bc0ce2200b0c\mobile_analytics_recharge_boxes_ui_1791122617179.jpg)

---

## ASCII Wireframes

### Recharge Tab Metric Cards Layout
```text
+------------------------------------------+------------------------------------------+
| RECHARGE AMOUNT                          | TOTAL SALES                              |
| ₹1,350.00                                | ₹1,250.00                                |
| Cash: ₹250.00       UPI: ₹1,100.00       | (Sub-labels removed - clean value only)  |
+------------------------------------------+------------------------------------------+
| WALLET REFUND                            | WALLET REFUND COUNT                      |
| ₹200.00                                  | 2 Refunds                                |
| (Sub-labels removed - clean value only)  | (Sub-labels removed - clean value only)  |
+------------------------------------------+------------------------------------------+
| CANCELLED AMOUNT                         | CANCELLED COUNT                          |
| ₹50.00                                   | 1 Recharges                              |
| (Sub-labels removed - clean value only)  | (Sub-labels removed - clean value only)  |
+------------------------------------------+------------------------------------------+
| WALLET ACTIVATION                                                                   |
| 10 Cards                                                                            |
| Active: 8           Settled: 2                                                      |
+-------------------------------------------------------------------------------------+
```

---

## Proposed Changes

### Mobile POS (`Flutter Money card/`)

#### [analytics_screen.dart](file:///d:/Money%20Card%20Project/Flutter%20Money%20card/lib/features/analytics/analytics_screen.dart)
- In the `ListView` of the Recharge analytics view (lines 435–508):
  - **Total Sales**: Remove `line1Text: 'Cash: ...'` and `line2Text: 'UPI: ...'`.
  - **Wallet Refund**: Remove `line1Text: 'Cash: ...'` and `line2Text: 'UPI: ...'`.
  - **Wallet Refund Count**: Remove `line1Text: 'Cards: ...'` and `line2Text: 'Ret: ...'`.
  - **Cancelled Amount**: Remove `line1Text: 'Cancelled: ...'` and `line2Text: 'UPI: ...'`.
  - **Cancelled Count**: Remove `line1Text: 'Cancelled: ...'` and `line2Text: 'Ded: ...'`.
- `_buildCompactMetricCard` already conditionally renders the bottom line row only when `line1Text != null || line2Text != null`. Omitting these arguments automatically produces a clean, centered, minimal card layout.

---

## Verification Plan

### Automated Verification
- Run `flutter analyze --no-pub` in `Flutter Money card` (verify zero lint or type errors).
- Run `flutter test` in `Flutter Money card` (verify all unit and widget tests pass).
- Run `npm test -- --run` in `Frontend Money Card` (verify web tests continue to pass).
- Run `npm test` in `Backend Money Card` (verify backend tests continue to pass).

### Manual Verification
- Navigate to the mobile Analytics screen -> Recharge tab.
- Confirm Total Sales, Wallet Refund, Wallet Refund Count, Cancelled Amount, and Cancelled Count display their headline amounts and counts cleanly without Cash, UPI, Cards, Ret, Cancelled, or Ded sub-labels.
