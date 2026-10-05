# Implementation Plan: Dashboard Refinements, Sales Accuracy, Unreturned Card Profit & Kitchen 3-Tab Workflow

Refine Super Admin and Counter Dashboard metrics, correct Total Sales and previous recharge balance calculations, add Unreturned Card Balance Profit tracking, remove the Getting Started checklist, and introduce a unified 3-tab (In Queue / In Progress / Ready) kitchen and manager food progress workflow with "Return to cooking" and active Edit Order integration.

![Workflow Architecture Sketch](C:\Users\damie\.gemini\antigravity-ide\brain\5d95263b-cd5f-4577-8545-14c5773f5f9e\mobile_pos_order_search_and_bill_1791177313177.jpg)

## User Requirements & Implementation Scope

Key items implemented:
- Super Admin Renaming & Box Deduplication: Renamed "Money Added" to "Recharge Amount", renamed "Cancelled Top-ups" to "Cancelled Recharged", and replaced the duplicated "Active Wallets / In use" box with a distinct operational metric ("Net Recharge Inflow").
- Counter Dashboard: Added the "Cancelled Recharged" metric card to the counter dashboard metrics grid.
- Getting Started Checklist Removal: Completely removed the "Getting Started Checklist" from Org Admin and Counter Admin dashboards.
- Total Sales Calculation Fix: Corrected the "Total Sales" box in Web Admin and Mobile POS to display actual food sales / purchase volume (`salesVolume` / `totalPurchaseVolume`) instead of `netMoneyCollected` (`recharges - refunds`).
- Mobile Recharge Previous Balance Fix: Corrected the Previous Balance display on the Recharge Successful dialog so it accurately reflects the pre-recharge balance (even when ₹0.00) using `result.balanceBefore ?? (newBal - rechargeAmt)`.
- Unreturned Card Balance Profit: Added ability to return cards without cash refund (when customer forfeits balance or does not request a refund), tracking this retained balance in backend analytics as "Retained Card Profit" for the cafeteria.
- Scenario Logic Explanation: Clarified why cancelling a food purchase must be handled as a Purchase Cancellation / Wallet Restoration rather than a cash refund.
- 3-Tab KDS & Food Progress: Upgraded Kitchen Orders and Manager Food Progress from 2 tabs to 3 tabs: "In Queue", "In Progress", and "Ready".
- Return to Cooking & Edit Order: Renamed the undo button to "Return to cooking", cleared `readyAt` when reverted, and ensured the Counter Manager Billing Orders sheet displays the active "Edit" button instead of the green "READY" badge.

## Scenario Logic Explanation: Order Cancellation vs Cash Refund

In the scenario where:
1. Customer recharges card for ₹200 -> Card Balance = ₹200, Total Recharges = ₹200.
2. Customer orders food for ₹100 -> Card Balance = ₹100, Food Sales = ₹100.
3. Customer immediately cancels the order (accidentally punched or changed mind) -> ₹100 must be returned to the card balance so it becomes ₹200 again.

Why this should NOT be processed on the "Return & Refund" page:
- A "Refund" represents a cash/UPI outflow where staff takes physical money out of the counter cash drawer and hands it back to the customer.
- If staff goes to "Return & Refund" and processes ₹100, the system records:
  - Food Sales = ₹100 (still counted as sold food revenue!)
  - Refunds = ₹100 (cash out of drawer recorded!)
  - Net Revenue = ₹200 (recharge) - ₹100 (refund) = ₹100.
  - Cash Drawer Discrepancy: The cash drawer is expected to be short by ₹100, even though no physical cash was handed to the customer.
  - Card Balance: The card balance would now be ₹0 or unchanged depending on screen, instead of returning to ₹200.
  - Later, when the customer spends their ₹200 balance, Food Sales would become ₹100 + ₹200 = ₹300 on only ₹200 of actual customer money!

The Correct Operational Logic:
- This is a **Purchase Cancellation / Item Void (Order Reversal)**, NOT a Cash Refund.
- Action: In Mobile POS -> Billing / Orders -> tap "Cancel Order" on the purchase transaction.
- System Actions (`/card-sessions/transactions/:id/cancel-order`):
  1. Transaction status is marked `isCancelled: true`.
  2. The ₹100 is immediately refunded back to the **Card Wallet Balance** (`balanceAfter = balanceBefore + 100` -> Balance returns to ₹200).
  3. Food Sales volume is reduced by ₹100 (excluded from sales totals).
  4. Cash drawer is completely untouched (₹0 cash out).
  5. Refunds metric remains ₹0 (no cash was paid out).
- Result: Recharges = ₹200, Food Sales = ₹0, Cash in Drawer = ₹200, Card Balance = ₹200. Clean and 100% accurate.

## Proposed Changes

### Web Admin (`Frontend Money Card`)

#### `Frontend Money Card/src/features/dashboard/SuperAdminDashboard.tsx`
- Rename "Money Added" to "Recharge Amount" (line 524).
- Remove the duplicated "Active Wallets / In use" box (lines 540-554) which repeats the "Active Cardholders" metric from Row 1.
- Replace it with "Net Recharge Inflow" (`moneyAdded - moneyRefunded`) or "Average Order Spend" (`totalPurchaseVolume / foodOrdersCount`), providing unique analytical value.

#### `Frontend Money Card/src/features/analytics/OrgAdminAnalyticsComponents.tsx`
- Line 78: Correct the highlighted top card label and value. Currently it displays `netMoneyCollected` under "Total Sales". Update to display actual total food sales volume (`analytics.totalPurchaseVolume ?? analytics.salesVolume ?? 0`), with order count subtitle.
- Line 177: Rename "Cancelled Top-ups" to "Cancelled Recharged".
- In the overview cards, add an operational KPI for "Retained Card Profit" (unreturned balance profit from settled cards).

#### `Frontend Money Card/src/features/analytics/analyticsPdfExport.ts`
- Line 144, 154: Align "Total Sales" with actual food sales volume.
- Line 200: Rename "Cancelled Top-ups" to "Cancelled Recharged".
- Include "Retained Card Profit" in the summary PDF report.

#### `Frontend Money Card/src/features/dashboard/OrgAdminDashboard.tsx`
- Lines 364-445: Completely remove the "Getting Started Checklist" card from both Org Admin and Counter Admin views. Remove related setup calculation hooks and state.
- Lines 552-605: For Counter Dashboard (`isCounterAdmin`), add a dedicated StatCard for "Cancelled Recharged" (`analytics?.cancelledTopUps ?? 0`) with reversed recharges count.
- Update "Money Added" label to "Recharge Amount" for consistency.

### Backend Engine (`Backend Money Card`)

#### `Backend Money Card/prisma/schema.prisma`
- Add `retainedProfit Float @default(0.0)` to `model CardSession` to record unreturned balance when a card is settled without cash refund.
- Run `npx prisma generate` and synchronize migration.

#### `Backend Money Card/src/controllers/sessions.controller.ts`
- In `returnSession`: Accept `skipRefund: boolean` in request body.
  - If `skipRefund === true` or customer does not request refund:
    - Set `settledSession.refundAmount = 0.0`.
    - Set `settledSession.retainedProfit = session.balance`.
    - Do NOT create a `REFUND_RETURN` transaction (no cash leaves the drawer).
    - Release card back to `AVAILABLE`.
  - If `skipRefund === false` (normal refund):
    - Process standard cash/UPI refund as before.

#### `Backend Money Card/src/controllers/analytics.controller.ts`
- In `getOrgAnalytics`:
  - Calculate `totalRetainedProfit` from settled sessions (`sum(retainedProfit)`).
  - Ensure `salesVolume` / `totalPurchaseVolume` reflects pure active food purchases.
  - Provide `retainedCardProfit` in the JSON response for Super Admin, Org Admin, Counter Dashboard, and Mobile POS.

#### `Backend Money Card/src/controllers/kitchen.controller.ts`
- In `updateOrderStatus`:
  - When status is updated to `PREPARING` or `PENDING` (undo from READY), explicitly set `readyAt: null` in the metadata so the order is no longer classified as ready.

### Mobile POS App (`Flutter Money card`)

#### `Flutter Money card/lib/features/payments/recharge_screen.dart`
- In `_showRechargeSuccessDialog` (lines 113-117):
  - Fix previous balance calculation:
    ```dart
    final prevBal = result.balanceBefore ?? ((newBal - rechargeAmt).clamp(0.0, double.infinity));
    ```
  - Eliminates the `> 0` check that caused ₹0.00 balances to be discarded and replaced with the new balance.

#### `Flutter Money card/lib/features/payments/return_card_screen.dart`
- In `RefundPaymentSelectionDialog`:
  - Add option: "Return Without Cash Refund (Retain Profit)" alongside Cash and UPI.
  - Passes `skipRefund: true` to `sessionService.returnCardSession`.
  - When selected, settles the card without deducting cash from the counter drawer and tracks the unreturned balance as profit.

#### `Flutter Money card/lib/features/analytics/analytics_screen.dart`
- Line 440: Fix "Total Sales" card. Change value binding from `data.netMoneyCollected` to `data.salesVolume` (or `data.totalPurchaseVolume`).
- Add "Retained Card Profit" metric card showing unreturned card balance retained by the counter.

#### `Flutter Money card/lib/features/kitchen/kitchen_orders_screen.dart`
- Upgrade from 2 tabs to 3 tabs:
  - Tab 1: `In Queue (${queuedOrders.length})` (`order.isPending`)
  - Tab 2: `In Progress (${preparingOrders.length})` (`order.isPreparing`)
  - Tab 3: `Ready (${readyOrders.length})` (`order.isReady`)
- Line 584: Rename action button in Ready tab from `'Undo / Return to Cooking'` to `'Return to cooking'`.

#### `Flutter Money card/lib/features/orders/live_order_tracker_screen.dart`
- In "Food Progress" screen:
  - Upgrade TabController from 2 tabs to 3 tabs:
    - Tab 1: `In Queue (${queuedOrders.length})` (`order.isPending`)
    - Tab 2: `In Progress (${preparingOrders.length})` (`order.isPreparing`)
    - Tab 3: `Ready (${readyOrders.length})` (`order.isReady`)

#### `Flutter Money card/lib/providers/kitchen_orders_provider.dart`
- In `updateStatus`:
  - When updating status to `PREPARING` or `PENDING`, set `readyAt: null` in the optimistic `KitchenOrder` model.

#### `Flutter Money card/lib/features/pos/pos_checkout_screen.dart` & `pos_scan_purchase_screen.dart`
- In the Billing Orders bottom sheet:
  - When opening, call `ref.read(kitchenOrdersNotifierProvider.notifier).loadOrders(silent: true)` to ensure live kitchen status parity.
  - If kitchen status was returned to cooking (`isPreparing` or `isPending`), do NOT show the green "READY" badge. Show the active "Edit" and "Cancel" buttons.

## ASCII Wireframes

### 1. Web Super Admin & Counter Dashboard Refined Grid

```
+---------------------------------------------------------------------------------------------------------+
| SUPER ADMIN DASHBOARD / COUNTER DASHBOARD                                                               |
+---------------------------------------------------------------------------------------------------------+
|  [ Total Sales ]        [ Recharge Amount ]     [ Net Recharge Inflow ]   [ Refunds ]                   |
|    Rs 12,450.00               Rs 18,200.00               Rs 17,400.00           Rs 800.00               |
|    48 orders billed           62 recharges               Net money added        4 cash refunds          |
+---------------------------------------------------------------------------------------------------------+
|  [ Cancelled Recharged ]  [ Retained Card Profit ]                                                      |
|    Rs 400.00                    Rs 350.00                                                               |
|    2 top-ups reversed           Unclaimed wallet balance                                                |
+---------------------------------------------------------------------------------------------------------+
(Getting Started Checklist removed cleanly - Zero clutter)
```

### 2. Kitchen Orders & Food Progress (3-Tab Architecture)

```
+---------------------------------------------------------------------------------------------------------+
| [<-] Kitchen Orders / Food Progress                                                  [ (R) Refresh ]    |
+---------------------------------------------------------------------------------------------------------+
|    [ In Queue (3) ]       |        [ In Progress (2) ]       |            [ Ready (4) ]                 |
+---------------------------------------------------------------------------------------------------------+
|                                                                                                         |
|  READY FOR PICKUP TAB ITEM:                                                                             |
|  +---------------------------------------------------------------------------------------------------+  |
|  | Ticket #104 | Wallet: MC-8821                                           12:42 PM (Prepped: 6m)    |  |
|  | 2x Veg Burger, 1x Cold Coffee                                           Rs 240.00                 |  |
|  | [ Prepped in 6m - Ready for pickup ]                                                              |  |
|  |                                                                                                   |  |
|  | [ Return to cooking ]                                                                             |  |
|  +---------------------------------------------------------------------------------------------------+  |
+---------------------------------------------------------------------------------------------------------+
```

### 3. Counter Manager Billing Orders Sheet (Active Edit on Undo)

```
+---------------------------------------------------------------------------------------------------------+
| Billed Orders for Wallet MC-8821                                                                        |
+---------------------------------------------------------------------------------------------------------+
| - Rs 240.00                                                            12:40 PM                         |
|   2x Veg Burger, 1x Cold Coffee                                                                         |
|                                                                                                         |
|   Status: [ IN PROGRESS - COOKING ]                                                                     |
|   [ Edit Order ]    [ Cancel Order ]                                                                    |
|   (Green READY button replaced with Edit action when kitchen undoes order)                              |
+---------------------------------------------------------------------------------------------------------+
```

## Verification Plan

### Automated Test Suites
- Frontend Tests: `npm test -- --run` in `Frontend Money Card` (verify all 41 test files and 308+ tests pass).
- Frontend Type Check: `npx tsc --noEmit` in `Frontend Money Card` (0 errors).
- Backend Tests: `npm test` in `Backend Money Card` (verify all 13 test files and 124 tests pass).
- Backend Lint: `npm run lint` in `Backend Money Card` (0 errors).
- Mobile Tests: `flutter test` in `Flutter Money card` (verify all 186 tests pass).
- Mobile Analysis: `flutter analyze --no-pub` in `Flutter Money card` (0 issues).

### Manual Parity & Operational Verification
- Super Admin Dashboard: Verify "Money Added" renamed to "Recharge Amount", duplicate Active Wallets replaced with distinct metric, "Cancelled Top-ups" renamed to "Cancelled Recharged".
- Counter Dashboard: Verify "Cancelled Recharged" card is present and accurate.
- Getting Started Checklist: Verify checklist is absent from Org Admin and Counter Admin dashboards.
- Total Sales Calculation: Verify "Total Sales" displays actual purchase volume in both Web and Mobile POS.
- Recharge Previous Balance: Perform recharge starting from ₹0.00 and ₹50.00; verify Previous Balance displays accurately.
- Retained Card Profit: Settle card without refund; verify cash drawer is untouched and retained balance is tracked as profit.
- Kitchen 3 Tabs: Verify "In Queue", "In Progress", and "Ready" tabs in Kitchen Orders and Live Food Progress.
- Return to cooking: Tap "Return to cooking" on a ready order; verify order moves back to In Progress and Billing Orders drawer shows "Edit Order" instead of "READY".
