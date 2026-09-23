# Implementation Plan — Staff Audit Coupon ID, Action Hub Clean-Up, and Menu Analytics

This plan details technical designs and step-by-step changes for:
1. Updating Coupon ID in Staff Performance & Operational Audit across Dashboard and Staff views.
2. Comprehensive project documentation of architecture, workflows, and completed milestones.
3. Clarifying Counter Manager vs Counter Staff roles and permissions in mobile operations.
4. Mobile Active Card Action Hub clean-up: removing subheadings from all buttons, removing View Session & Transaction History button, merging Cancel/Edit Order into Food Orders with working Cancel and Edit flows, and making Cancel Top-up functional.
5. Menu Analytics overhaul: replacing Avg Order Value with Menu Variety / Dishes Ordered, and displaying every ordered food item instead of only Samosa.

## Visual Interface Design

![Action Hub Clean-up and Menu Analytics Design](file:///C:/Users/damie/.gemini/antigravity-ide/brain/9c70217b-9240-4d11-907e-eaaf4a37b746/mobile_action_hub_and_menu_analytics_1790175298386.jpg)

## ASCII Wireframes

### 1. Active Card Action Hub (Subheadings Removed, Clean Single-Line Buttons)
```
+-------------------------------------------------------------+
|                     Card: MC-001                      [QR]  |
+-------------------------------------------------------------+
| +---------------------------------------------------------+ |
| | MC-001                       [ACTIVE]                   | |
| | Rahul Sharma                                            | |
| | ------------------------------------------------------- | |
| | Balance: Rs 750.00                    Session Active    | |
| +---------------------------------------------------------+ |
|                                                             |
| Card Actions & Operations                                   |
| +---------------------------------------------------------+ |
| | [Wallet]  Recharge Card                             (>) | |
| +---------------------------------------------------------+ |
| | [Cart]    Add Products                              (>) | |
| +---------------------------------------------------------+ |
| | [Clock]   Top-up History                            (>) | |
| +---------------------------------------------------------+ |
| | [Food]    Food Orders                               (>) | |
| +---------------------------------------------------------+ |
| | [Info]    Card Info & Statistics                    (>) | |
| +---------------------------------------------------------+ |
| | [Return]  Settle / Return Card                      (>) | |
| +---------------------------------------------------------+ |
|                                                             |
| [ Scan Another Card ]                                       |
+-------------------------------------------------------------+
```

### 2. Food Orders Sheet (Merged Cancel & Edit Order Flow)
```
+-------------------------------------------------------------+
| Food Orders                                             (X) |
| 2 orders recorded on this card                              |
| ----------------------------------------------------------- |
| +---------------------------------------------------------+ |
| | -Rs 140.00                                              | |
| | 2x Chicken Biryani, 1x Lime Juice                       | |
| | Staff: Counter Cashier 1         12:45 PM               | |
| | [ Edit Order ]                      [ Cancel Order ]    | |
| +---------------------------------------------------------+ |
| +---------------------------------------------------------+ |
| | -Rs 40.00                                               | |
| | 2x Samosa, 1x Tea                                       | |
| | Staff: Counter Cashier 1         11:30 AM               | |
| | [ Edit Order ]                      [ Cancel Order ]    | |
| +---------------------------------------------------------+ |
+-------------------------------------------------------------+
```

### 3. Analytics Menu Tab (Replaced Avg Order Value + All Ordered Items)
```
+-------------------------------------------------------------+
| [ Recharge ]                          [ Menu (Active) ]     |
| ----------------------------------------------------------- |
| [ Food Sales: Rs 4,850 ]      [ Items Sold: 142 Units ]     |
| [ Dishes Ordered: 14 Dishes ] [ Cancelled: 2 (Rs 80) ]      |
|                                                             |
| ALL ORDERED MENU ITEMS                            14 items  |
| ----------------------------------------------------------- |
| [Veg Rice]        42 units sold                  Rs 3,360   |
| [Chicken Curry]   35 units sold                  Rs 4,200   |
| [Sandwich]        28 units sold                  Rs 1,960   |
| [Samosa]          24 units sold                    Rs 360   |
| [Tea]             20 units sold                    Rs 200   |
| [Paneer Tikka]    15 units sold                  Rs 2,250   |
+-------------------------------------------------------------+
```

## Proposed Changes

### Backend Sub-project (`Backend Money Card/`)

#### [MODIFY] [analytics.controller.ts](file:///D:/Money%20Card%20Project/Backend%20Money%20Card/src/controllers/analytics.controller.ts)
- In `getOrgAnalytics` (line 167):
  - Expand `prisma.transaction.findMany` include to fetch `session: { include: { card: true } }`.
  - In `staffTxns.forEach`, populate `cardNumber` on all transaction activity records (`tx.session?.card?.physicalCardNumber || tx.session?.sessionCardNumber || 'MC-Card'`), along with `customerName` and `customerPhone`.
  - In `branchMetricsMap`, calculate `productDemand` dynamically from `tx.items` of all `PURCHASE` transactions for each branch, instead of slicing inventory with fixed counts. Every purchased dish will be recorded with its actual `quantitySold` and `totalRevenue`.

#### [MODIFY] [sessions.routes.ts](file:///D:/Money%20Card%20Project/Backend%20Money%20Card/src/routes/sessions.routes.ts)
- Update authorization on `POST /transactions/:id/cancel-recharge` from `requirePermission(PermissionCode.RECHARGE)` to `requireAnyPermission(PermissionCode.RECHARGE, PermissionCode.PURCHASE)` so counter supervisors and authorized counter cashiers can void accidental top-ups at the counter.

---

### Frontend Sub-project (`Frontend Money Card/`)

#### [MODIFY] [StaffPage.tsx](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/staff/StaffPage.tsx)
- In `handleOpenStaffAudit`, always re-fetch `apiService.analytics.getOverview()` so that staff audit activities and Coupon IDs are always fresh and updated with recent transactions.
- Verify the Coupon ID column accurately formats `act.cardNumber` and does not fall back to empty dashes when card numbers are present.

#### [MODIFY] [analytics.ts](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/services/mock/handlers/analytics.ts)
- In mock analytics handler, ensure all `staffTxns` activity records populate `cardNumber`, `customerName`, and `customerPhone` from `mockStore.sessions` and `mockStore.cards`.

---

### Mobile Sub-project (`Flutter Money card/`)

#### [MODIFY] [pos_scan_purchase_screen.dart](file:///D:/Money%20Card%20Project/Flutter%20Money%20card/lib/features/pos/pos_scan_purchase_screen.dart)
- Action Hub Button Subheading Removal:
  - In `_buildActionTile`, make `subtitle` optional and remove subtitle text from all action tiles (`Recharge Card`, `Add Products`, `Top-up History`, `Food Orders`, `Card Info & Statistics`, `Settle / Return Card`) so they render as clean, focused single-line buttons.
- View Session Button Removal:
  - Delete `OPTION 6: VIEW SESSION & TRANSACTION HISTORY` tile from the Action Hub layout.
- Standalone Cancel / Edit Order Removal & Merge into Food Orders:
  - Remove standalone `OPTION 3: CANCEL / EDIT RECENT ORDER` tile from the main Action Hub list.
  - In `_showFoodOrdersSheet`, update each order card to show two operational action buttons:
    - `Edit Order`: Displays confirmation, cancels the order with auto-refund, and immediately navigates to `/app/pos/${session.id}` with the items from that order pre-populated in the cart so staff can adjust quantities/items.
    - `Cancel Order`: Prompts for reason and cancels the order with instant auto-refund back to card.
- Top-up Cancel Functionality:
  - In `_showTopUpHistorySheet`, keep the sheet responsive and wrap in `StatefulBuilder`.
  - When `Cancel Top-up` is confirmed, call `sessionService.cancelRecharge`, refresh session data, and update the item badge to `CANCELLED` without dismissing the sheet unexpectedly.
  - Check balance sufficiency before attempting void to give clear user feedback if balance was already spent.

#### [MODIFY] [analytics_screen.dart](file:///D:/Money%20Card%20Project/Flutter%20Money%20card/lib/features/analytics/analytics_screen.dart)
- Replace "Avg Order Value" summary card with "Dishes Ordered" / "Menu Variety":
  - Title: `Dishes Ordered` (or `Menu Variety`)
  - Value: `${demands.length} Dishes`
  - Subtitle: `${data.productsSoldCount} total units sold`
  - Icon: `Icons.restaurant_outlined`
- Popular Menu Items Section:
  - Rename header from `POPULAR MENU ITEMS` to `ALL ORDERED MENU ITEMS`.
  - Render every food item present in `data.productDemand` without truncation or limit.

#### [MODIFY] [mock_api_interceptor.dart](file:///D:/Money%20Card%20Project/Flutter%20Money%20card/lib/core/network/interceptors/mock_api_interceptor.dart)
- Populate `productDemand` dynamically from all `PURCHASE` transactions in mock data so that all purchased food items (Veg Rice, Chicken Curry, Sandwich, Samosa, Tea, Coffee, Paneer Tikka) appear in the list.

---

## Verification Plan

### Automated Tests
- Run all frontend Vitest tests: `npm test -- --run` in `Frontend Money Card/`.
- Run all Flutter unit & widget tests: `flutter test` in `Flutter Money card/`.
- Run Flutter static analysis: `flutter analyze --no-pub` in `Flutter Money card/`.
- Run backend unit tests: `npm test` in `Backend Money Card/`.

### Manual & Hardware Verification
- Check Staff Performance & Operational Audit modal in Web app: verify Coupon ID displays actual card numbers for purchases, recharges, and settlements.
- Open Mobile POS Action Hub on Android device: verify all subheadings are removed, View Session button is gone, and standalone Cancel/Edit order button is merged into Food Orders.
- Test "Edit Order" in Food Orders sheet: verify order is cancelled, balance refunded, and cart re-opened.
- Test "Cancel Top-up" in Top-up History: verify balance is deducted and badge updates to CANCELLED.
- Check Analytics Menu tab: verify "Avg Order Value" is replaced with "Dishes Ordered", and all ordered dishes are listed.
