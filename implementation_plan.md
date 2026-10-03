# Cross-Counter Wallet Usage and Food Purchase Analytics — Implementation Plan

![Food Purchases by Counter Analytics](file:///C:/Users/damie/.gemini/antigravity-ide/brain/999581c9-5c30-4195-933d-3667425ed95a/analytics_counter_and_food_purchased_1791054776238.jpg)

## Current State (What Already Exists)

The system has a multi-tenant, multi-counter foundation:
- Super Admin creates Org Admin.
- Org Admin creates Branches (Counters).
- Staff members are assigned to Branches via UserBranch.
- Card Sessions are tied to an issuing Branch (`CardSession.branchId`).
- Transactions have a `branchId` field and store items in a JSON column.
- Wallet recharge already supports cross-counter operation and attributes the transaction to the recharging counter via `effectiveBranchId`.

---

## What Needs to Be Implemented

### 1. Cross-Counter Purchases
- In `Backend Money Card/src/controllers/sessions.controller.ts` (`purchaseSession`):
  - Remove the restriction blocking staff from other branches of the same organization.
  - Set `Transaction.branchId` to the purchasing counter (`effectiveBranchId`), NOT `session.branchId`.
  - Validate that purchased products belong to the organization and are accessible at the purchasing counter.

### 2. Issuing Counter Enforcement for Returns and Refunds
- In `Backend Money Card/src/controllers/sessions.controller.ts`:
  - In `returnSession`, add a guard ensuring STAFF can only settle sessions where `session.branchId` matches their assigned counter (`RETURN_COUNTER_MISMATCH`).
  - In `refundSessionBalance`, verify consistent error handling with `RETURN_COUNTER_MISMATCH`.
- In `Flutter Money card`:
  - `pos_scan_purchase_screen.dart`: Display issuing counter badge; disable settlement button if scanned at a foreign counter with message: "Issued at Counter A. Return must be processed at Counter A".
  - `return_card_screen.dart`: Check `session.branchId != currentBranch.id`, display banner, and disable return/refund buttons.
  - `recharge_screen.dart`: Guard refund button for foreign counter sessions; handle 403 `RETURN_COUNTER_MISMATCH`.

### 3. Analytics: Counter Name and Food Purchased Tracking
In the analytics section, provide a detailed activity log and aggregation showing:
- Counter Name: Both the Issuing Counter (where wallet originated) and Purchased At Counter (where food was ordered).
- Food Purchased: Exact items bought (item name, quantity, unit price, subtotal).
- Total amount, card number, and timestamp.

---

## ASCII Wireframe — Food Purchases by Counter

```
╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
║  ANALYTICS — Food Purchases by Counter                               [Date Range Picker] [Cafeteria]║
╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
║  [Total Sales]        [Total Orders]        [Cross-Counter Revenue]        [Top Dish]               ║
║    ₹12,450.00             1,890                   ₹4,115.50               Veg Biryani (210)         ║
╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
║  Food Purchases Table                                                                               ║
║  Date & Time      | Card ID  | Issuing Counter | Purchased At Counter | Food Items Purchased | Total║
║  Today, 01:15 PM  | MC-101   | Counter A       | Counter B            | 2x Veg Biryani,      | ₹280 ║
║                   |          | (Main)          | (North Cafeteria)    | 1x Lime Soda         |      ║
║  Today, 01:10 PM  | MC-104   | Counter B       | Counter B            | 1x Paneer Butter,    | ₹210 ║
║                   |          | (North)         | (North Cafeteria)    | 2x Butter Naan       |      ║
║  Today, 12:45 PM  | MC-102   | Counter A       | Counter C            | 1x Masala Dosa,      | ₹130 ║
║                   |          | (Main)          | (South Food Court)   | 1x Filter Coffee     |      ║
╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
║  Menu Demand by Counter Summary                                                                     ║
║  Item Name           | Counter A Sold | Counter B Sold | Counter C Sold | Total Revenue             ║
║  Veg Biryani         | 120 units      | 65 units       | 25 units       | ₹21,000.00                ║
║  Paneer Butter Naan  | 80 units       | 70 units       | 40 units       | ₹22,800.00                ║
╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
```

---

## Step-by-Step Changes Across the Worktree

### Step 1 — Backend: Session Purchase and Return Controller Updates
- File: `Backend Money Card/src/controllers/sessions.controller.ts`
  - In `purchaseSession`:
    - Check staff branch belongs to same organization (remove strict `session.branchId` check).
    - Set `Transaction.branchId` to `effectiveBranchId` (the purchasing counter).
  - In `returnSession`:
    - Add guard: `if (req.user?.role === 'STAFF' && !req.user.assignedBranchIds.includes(session.branchId)) return sendError(res, 403, 'RETURN_COUNTER_MISMATCH', 'This card must be returned at the counter where it was issued')`.
  - In `refundSessionBalance`:
    - Ensure matching error code `RETURN_COUNTER_MISMATCH`.

### Step 2 — Backend: Analytics Endpoint for Purchases and Counter Breakdown
- File: `Backend Money Card/src/controllers/analytics.controller.ts`
  - In `getOrgAnalytics` / new `getCrossCounterAnalytics`:
    - Include detailed purchase records with:
      - `transactionId`, `createdAt`
      - `cardNumber` (`sessionCardNumber` or `physicalCardNumber`)
      - `issuingBranchId`, `issuingBranchName`
      - `purchasingBranchId`, `purchasingBranchName`
      - `items` array with `productName`, `quantity`, `unitPrice`, `subtotal`
      - `totalAmount`
    - Include `menuDemandByCounter`: item sales broken down per counter.
- File: `Backend Money Card/src/routes/analytics.routes.ts`
  - Register `/api/analytics/purchases-by-counter` or include in existing analytics endpoint.

### Step 3 — Frontend Web: Analytics UI with Counter Name and Food Purchased
- File: `Frontend Money Card/src/features/analytics/OrgAdminAnalyticsComponents.tsx`
  - Create `FoodPurchasesByCounterTable`:
    - Displays Date & Time, Card ID, Issuing Counter, Purchased At Counter, Food Items (using `extractTransactionItems`), and Total Amount.
    - Responsive mobile wrapper (`overflow-x-auto`, badge styling).
  - Update `OrgAdminMenuAnalyticsSection`:
    - Display per-counter breakdown tags on ordered menu items.
- File: `Frontend Money Card/src/features/analytics/OrgAdminAnalyticsView.tsx`
  - Integrate `FoodPurchasesByCounterTable` into the Analytics view.
- File: `Frontend Money Card/src/features/analytics/analyticsPdfExport.ts`
  - Add "Food Purchases by Counter" section in generated PDF including counter name and items list.

### Step 4 — Mobile POS Flutter: Multi-Screen Parity
- File: `Flutter Money card/lib/features/pos/pos_scan_purchase_screen.dart`
  - When card is resolved, display issuing counter badge if different from active counter.
  - In `_handleSettleReturn`: Check `session.branchId == currentBranch.id`; if mismatched, show warning dialog and block action.
- File: `Flutter Money card/lib/features/payments/return_card_screen.dart`
  - If `session.branchId != currentBranch.id`, display persistent banner: "Card issued at [Counter Name]. Returns must be completed at the issuing counter." Disable Confirm & Settle and Refund buttons.
- File: `Flutter Money card/lib/features/payments/recharge_screen.dart`
  - Guard settlement action and handle `RETURN_COUNTER_MISMATCH` with descriptive toast/dialog.
- File: `Flutter Money card/lib/services/analytics_pdf_service.dart`
  - Add counter name and food purchase breakdown to Mobile Analytics PDF export.

### Step 5 — Automated Test Suites
- Backend Tests:
  - `Backend Money Card/test/unit/cross_counter_purchase.test.ts`:
    - Test purchase by Counter B staff on Counter A wallet (succeeds, sets `Transaction.branchId = Counter B`).
    - Test return by Counter B staff on Counter A wallet (fails with 403 `RETURN_COUNTER_MISMATCH`).
    - Test return by Counter A staff on Counter A wallet (succeeds).
    - Test analytics endpoint returns counter names and food item details.
- Frontend Tests:
  - `Frontend Money Card/src/__tests__/foodPurchasesAnalytics.test.ts`:
    - Test table rendering with issuing counter, purchasing counter, and food items.
- Mobile Flutter Tests:
  - `Flutter Money card/test/features/sessions/return_routing_test.dart`:
    - Test return button disabled or blocked when branch does not match issuing counter.
