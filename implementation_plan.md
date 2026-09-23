# Implementation Plan — Fix Cancellation API Exceptions, Remove Home Recharge Button, Reason Options, and Menu Dropdown

This plan details technical designs and step-by-step changes to:
1. Fix the backend TypeScript build failure that prevented deployment of `cancelRecharge` and `cancelOrder` endpoints to Render staging, causing 404 API exceptions on mobile cancellation actions.
2. Robustly parse purchase items and handle branch matching in `analytics.controller.ts` so all ordered food items display in analytics.
3. Remove the "Recharges" button from the mobile Home screen.
4. Remove the "Customer Changed Mind" reason from both top-up void and food order cancellation dialogs across the mobile app.
5. Convert the "ALL ORDERED MENU ITEMS" section in mobile Menu Analytics into an expandable dropdown accordion card.

## Visual Interface Design

![Mobile Cancellation, Home Clean-up, and Menu Dropdown Design](file:///C:/Users/damie/.gemini/antigravity-ide/brain/9c70217b-9240-4d11-907e-eaaf4a37b746/mobile_topup_cancel_and_menu_dropdown_1790182631377.jpg)

## ASCII Wireframes

### 1. Mobile Home Screen (Recharge Button Removed)
```
+-------------------------------------------------------------+
| Hello, Alex                           [Manager]             |
| Counter: Main Cafeteria                                     |
| ----------------------------------------------------------- |
|                                                             |
| +---------------------------------------------------------+ |
| |                    [ QR Icon ]                          | |
| |                   SCAN QR CARD                          | |
| |           Tap to Scan and Open Card Hub                 | |
| +---------------------------------------------------------+ |
|                                                             |
| +---------------------------------------------------------+ |
| | Today's Sales                  Transactions             | |
| | Rs 3,450                       18 orders            [=] | |
| +---------------------------------------------------------+ |
|                                                             |
| (Recharges button removed — clean focused dashboard)        |
+-------------------------------------------------------------+
```

### 2. Cancel Top-up Dialog (Customer Changed Mind Removed)
```
+-------------------------------------------------------------+
| [!] Cancel Top-up?                                          |
| ----------------------------------------------------------- |
| This will void the top-up and deduct Rs 500.00 from the     |
| card balance.                                               |
|                                                             |
| Select Cancellation Reason:                                 |
| +---------------------------------------------------------+ |
| | Wrong Amount Entered                                [v] | |
| +---------------------------------------------------------+ |
| | - Wrong Amount Entered                                  | |
| | - Duplicate Scan                                        | |
| | - Payment Failed                                        | |
| | - Other Reason                                          | |
| +---------------------------------------------------------+ |
|                                                             |
| [ Keep Top-up ]                         [ Confirm Void ]    |
+-------------------------------------------------------------+
```

### 3. Cancel Food Order Dialog (Customer Changed Mind Removed)
```
+-------------------------------------------------------------+
| [X] Cancel Food Order?                                      |
| ----------------------------------------------------------- |
| This will cancel the order and refund Rs 120.00 back to     |
| the customer's card balance.                                |
|                                                             |
| Select Cancellation Reason:                                 |
| +---------------------------------------------------------+ |
| | Ordered Wrong Item                                  [v] | |
| +---------------------------------------------------------+ |
| | - Ordered Wrong Item                                    | |
| | - Item Out of Stock                                     | |
| | - Other Reason                                          | |
| +---------------------------------------------------------+ |
|                                                             |
| [ Keep Order ]                          [ Refund & Cancel ] |
+-------------------------------------------------------------+
```

### 4. Menu Analytics Tab — Expandable Dropdown Accordion
```
+-------------------------------------------------------------+
| [ Food Sales: Rs 4,850 ]      [ Items Sold: 142 Units ]     |
| [ Dishes Ordered: 14 Dishes ] [ Cancelled: 2 (Rs 80) ]      |
|                                                             |
| +---------------------------------------------------------+ |
| | ALL ORDERED MENU ITEMS                        14 items  | |
| | Tap to view breakdown of all sold dishes            [^] | |
| | ------------------------------------------------------- | |
| | [Veg Rice]        42 units sold                Rs 3,360 | |
| | [Chicken Curry]   35 units sold                Rs 4,200 | |
| | [Sandwich]        28 units sold                Rs 1,960 | |
| | [Samosa]          24 units sold                  Rs 360 | |
| | [Tea]             20 units sold                  Rs 200 | |
| | [Paneer Tikka]    15 units sold                Rs 2,250 | |
| +---------------------------------------------------------+ |
+-------------------------------------------------------------+
```

## Root Cause Analysis for API Exception

The mobile app threw `ApiException: [not_found] / Cannot POST /api/v1/card-sessions/transactions/:id/...` because Render staging backend has been failing to build since the recent commits.
In `Backend Money Card/src/services/balanceStream.service.ts`:
- `BalanceUpdatePayload.type` was typed as `'RECHARGE' | 'PURCHASE' | 'REFUND' | 'INIT'`, but `sessions.controller.ts` passed `'RECHARGE_CANCELLED'` and `'PURCHASE_CANCELLED'`.
- Running `tsc` threw `TS2322: Type '"RECHARGE_CANCELLED"' is not assignable to type ...`.
- Render's deployment pipeline uses `npm run build` (`prisma generate && tsc`), which caused all deploys to fail with `build_failed`.
- The live Render server was stuck on an outdated build from September 19 that lacked the `cancelRecharge` and `cancelOrder` routes entirely.

## Proposed Changes

### Backend Sub-project (`Backend Money Card/`)

#### [MODIFY] [balanceStream.service.ts](file:///D:/Money%20Card%20Project/Backend%20Money%20Card/src/services/balanceStream.service.ts)
- Update `BalanceUpdatePayload` union type to include `'RECHARGE_CANCELLED'` and `'PURCHASE_CANCELLED'`.
- This resolves the `tsc` compiler error and enables clean `npm run build` on Render staging.

#### [MODIFY] [analytics.controller.ts](file:///D:/Money%20Card%20Project/Backend%20Money%20Card/src/controllers/analytics.controller.ts)
- In `txWhere`, ensure transaction queries match transactions by both `branchId` and `session.branchId` (`OR: [{ branchId: effectiveBranchId }, { session: { branchId: effectiveBranchId } }]`) so transactions with null `branchId` are not dropped.
- In `transactions.forEach`, robustly parse `tx.items`:
  - Handle stringified JSON via `JSON.parse` fallback.
  - Check both top-level arrays and `.orderItems` / `.items` fields.
  - Fallback `branchId` to `tx.branchId || tx.session?.branchId || effectiveBranchId`.
  - Extract item names from `it.itemName || it.productName || it.name || it.item_name`.
  - Extract quantities and subtotals accurately.

---

### Mobile Sub-project (`Flutter Money card/`)

#### [MODIFY] [home_screen.dart](file:///D:/Money%20Card%20Project/Flutter%20Money%20card/lib/features/home/home_screen.dart)
- Remove the `_buildQuickActionCard` for `Recharges` row beneath Today's Sales summary.
- Staff recharge directly via the scan flow on the active card Action Hub.

#### [MODIFY] [home_dashboard_test.dart](file:///D:/Money%20Card%20Project/Flutter%20Money%20card/test/features/home/home_dashboard_test.dart)
- Update test assertion to verify `find.text('Recharges')` finds nothing on `HomeScreen`.

#### [MODIFY] [pos_scan_purchase_screen.dart](file:///D:/Money%20Card%20Project/Flutter%20Money%20card/lib/features/pos/pos_scan_purchase_screen.dart)
- Top-up Cancellation Dialog:
  - Remove `Customer Changed Mind` from the reason dropdown items.
  - Retain: `Wrong Amount Entered` (default), `Duplicate Scan`, `Payment Failed`, and `Other Reason`.
- Food Order Cancellation Dialog:
  - Remove `Customer Changed Mind` from the reason dropdown items.
  - Change default selection to `Ordered Wrong Item`.
  - Retain: `Ordered Wrong Item` (default), `Item Out of Stock`, and `Other Reason`.
- Better Error Messages:
  - In `catch (e)`, unwrap `ApiException` to display the backend's exact error message (e.g. `e.message`) instead of raw exception string `Cancellation failed: ApiException: ...`.

#### [MODIFY] [recharges_screen.dart](file:///D:/Money%20Card%20Project/Flutter%20Money%20card/lib/features/recharges/recharges_screen.dart)
- Remove `Customer Changed Mind` from the top-up void reason dropdown.

#### [MODIFY] [analytics_screen.dart](file:///D:/Money%20Card%20Project/Flutter%20Money%20card/lib/features/analytics/analytics_screen.dart)
- Convert "ALL ORDERED MENU ITEMS" into an expandable dropdown accordion card:
  - Use a styled `Container` with an `ExpansionTile` or stateful expansion toggle.
  - Header: `ALL ORDERED MENU ITEMS` with dish count badge (`${demands.length} items`) and expand/collapse chevron icon.
  - Subtitle: `Tap to view ordered dishes` or summary text.
  - Dropdown content: Render each ordered menu item with dish icon, item name, unit count, and total revenue.
  - Default state: Expanded so staff see items immediately, with ability to collapse into a clean single-line header.

---

## Verification Plan

### Automated Tests
- Run `npm run build` in `Backend Money Card/` to guarantee 0 TypeScript errors and confirm successful Prisma generation.
- Run `npm test` in `Backend Money Card/` (10 test files, 100 tests).
- Run `flutter analyze --no-pub` in `Flutter Money card/` to verify zero static analysis errors.
- Run `flutter test` in `Flutter Money card/` to verify all unit and widget tests pass.
- Run `npx tsc --noEmit` and `npm test -- --run` in `Frontend Money Card/`.

### Manual & Staging Verification
- Push to `origin/staging` and verify Render staging deployment succeeds with `status: "live"`.
- Verify on mobile:
  - Verify Home screen no longer displays the "Recharges" quick action button.
  - Open active card session and tap "Top-up History" -> "Cancel Top-up". Verify reason dropdown does not include "Customer Changed Mind", and void completes successfully without API exception.
  - In "Food Orders", tap "Cancel Order" and "Edit Order". Verify reason dropdown does not include "Customer Changed Mind", and cancellation/edit succeeds without API exception.
  - Open "Analytics" -> "Menu" tab. Verify "ALL ORDERED MENU ITEMS" renders as an expandable dropdown card showing all recently purchased dishes.
