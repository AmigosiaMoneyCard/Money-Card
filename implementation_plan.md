# Implementation Plan: Kitchen Terminology Standardization & Menu Analytics Cancelled Orders Eye Toggle

## Overview
This plan specifies changes across Web App (Frontend Money Card), Mobile POS (Flutter Money card), and Backend (Backend Money Card):
1. Add Show button mode (eye mask toggle) to Cancelled Orders box in Menu Analytics in Web App.
2. Standardize all user-facing domain terminology from Counter / Counters to Kitchen / Kitchens across Web, Mobile, and Backend.
3. Retain and verify the pending test suite fix in Flutter POS analytics_test.dart.

![Menu Analytics Cancelled Orders Sketch](file:///C:/Users/damie/.gemini/antigravity-ide/brain/c99edd16-0faf-4782-a7e1-399d96eb8a4b/menu_analytics_cancelled_orders_sketch_1791442214986.jpg)

## ASCII Wireframes

### Menu Analytics Cancelled Orders Card with Show Mode
```
+-----------------------------------------------------------------------+
|  CANCELLED ORDERS                                 [ (o) Show ]  [ X ] |
|                                                                       |
|  ••••••                                                               |
+-----------------------------------------------------------------------+
  Clicking "Show" toggles state:
+-----------------------------------------------------------------------+
|  CANCELLED ORDERS                                 [ (/) Hide ]  [ X ] |
|                                                                       |
|  0 Orders                                                             |
+-----------------------------------------------------------------------+
```

### Kitchens Staff Management Table & Dropdowns
```
+-----------------------------------------------------------------------+
|  STAFF MANAGEMENT                                                     |
|  [ Search staff... ]   Filter: [ All Kitchens | v ]  [ + Add Staff ]  |
+-----------------------------------------------------------------------+
|  Kitchen Name         | Staff Members       | Actions                 |
|-----------------------+---------------------+-------------------------|
|  Main Kitchen         | 3 Active Members    | [ View / Edit Staff ]   |
|  North Kitchen        | 2 Active Members    | [ View / Edit Staff ]   |
+-----------------------------------------------------------------------+
```

### Mobile POS Sessions & Return Screens
```
+---------------------------------------------------+
|  Active Sessions                                  |
|  Kitchen: Main Kitchen                            |
|---------------------------------------------------|
|  Card #1029 - John Doe            Balance: Rs 150 |
+---------------------------------------------------+
|  [ Modal: Return Card Guard ]                     |
|  Return Not Allowed at this Kitchen               |
|  This wallet was issued at another kitchen.       |
|  Wallets can only be returned and settled at the  |
|  kitchen where they were issued.                  |
|                                    [ Dismiss ]    |
+---------------------------------------------------+
```

## Worktree Changes & File Modifications

### 1. Web App: Menu Analytics Cancelled Orders Eye Toggle
- File: `Frontend Money Card/src/features/analytics/OrgAdminAnalyticsComponents.tsx`
  - Function: `OrgAdminMenuAnalyticsSection`
  - Add state: `const [showCancelledOrders, setShowCancelledOrders] = useState(false);`
  - In Cancelled Orders card header: Add toggle button with `Eye` / `EyeOff` icons, styled identically to existing metric eye buttons (`px-2 py-0.5 rounded-md text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80`).
  - In card metric body: Render `showCancelledOrders ? `${cancelledOrders} Orders` : '••••••'`.

### 2. Web App: Global User-Facing Counter to Kitchen Replacement
- Files:
  - `Frontend Money Card/src/features/staff/StaffPage.tsx`
    - Replace `Counter Name` with `Kitchen Name`.
    - Replace `All Counters` with `All Kitchens`.
    - Replace `Counter Manager` with `Kitchen Manager`.
    - Replace `Counter Staff` with `Kitchen Staff`.
    - Replace modal and filter headers.
  - `Frontend Money Card/src/features/staff/CounterStaffPage.tsx`
    - Update page title, breadcrumb references, and subheaders to Kitchen Staff / Kitchen Manager.
  - `Frontend Money Card/src/features/cards/OrgAdminCardsView.tsx` & `CounterStaffCardsView.tsx`
    - Update tab label `COUNTERS` to `Kitchens`.
    - Replace `All Counters` with `All Kitchens`.
    - Replace `Counter Analytics` with `Kitchen Analytics`.
    - Replace `Search counters...` with `Search kitchens...`.
  - `Frontend Money Card/src/features/cards/BlockedWalletsTableView.tsx`
    - Update `Blocked by (counter manager...)` to `Blocked by (kitchen manager...)`.
  - `Frontend Money Card/src/features/dashboard/OrgAdminDashboardView.tsx` & `CounterDashboardView.tsx`
    - Update section headers: `Kitchen Overview`, `Top Kitchens`, etc.
  - `Frontend Money Card/src/features/analytics/OrgAdminAnalyticsComponents.tsx`
    - Replace `foodPurchasesByCounter` presentation labels with `Sales by Kitchen`.
    - Replace `Cross-Counter` labels with `Cross-Kitchen`.
  - `Frontend Money Card/src/features/analytics/analyticsPdfExport.ts`
    - Update PDF section titles: `Kitchen Comparison`, `Kitchen Performance`, `All Kitchens`, `Cross-Kitchen Sales`.
  - `Frontend Money Card/src/features/subscriptions/AdminPlansView.tsx`, `AdminPlansSubscriptionsView.tsx`, `SubscriptionsPage.tsx`
    - Replace `Counters:` with `Kitchens:`.
    - Replace `Max Counters` with `Max Kitchens`.
    - Replace `Counter Limit` with `Kitchen Limit`.
  - `Frontend Money Card/src/features/portal/PortalTransactionsPage.tsx`, `PortalHomePage.tsx`
    - Replace receipt `Counter:` with `Kitchen:`.
  - `Frontend Money Card/src/utils/cardBlockMessages.ts`
    - Replace `counter manager` with `kitchen manager`.
  - `Frontend Money Card/src/__tests__/*`
    - Update tests expecting user-facing Counter labels (`staffMinimalTable.test.ts`, `staffRoleAndBlockedWallets.test.ts`, `sidebarBranchSelection.test.ts`, `portalRechargeAndBillingReceipts.test.ts`, `orgAdminAnalyticsPdfCustomization.test.ts`, `foodPurchasesNavigation.test.ts`, etc.) to expect Kitchen labels.

### 3. Mobile POS (Flutter Money card): Counter to Kitchen Replacement
- Files:
  - `Flutter Money card/lib/widgets/states/app_empty_state.dart`
    - Update empty state descriptions: `No physical wallets are assigned to this kitchen yet`, `No menu items or products found for the selected kitchen`.
  - `Flutter Money card/lib/services/digital_receipt_service.dart` & `bill_receipt_screen.dart`
    - Update receipt meta row: `Kitchen:` instead of `Counter:`.
  - `Flutter Money card/lib/services/analytics_pdf_service.dart`
    - Update PDF labels to `Kitchen Performance`, `Kitchen:`.
  - `Flutter Money card/lib/providers/auth_provider.dart`
    - Update login error message: `This account is assigned to Kitchen Manager. Please select Kitchen Manager to log in.`
  - `Flutter Money card/lib/features/sessions/sessions_screen.dart`
    - Update header and filter labels: `Kitchen: ${currentBranch?.name ?? 'All Assigned Kitchens'}` and `this kitchen`.
  - `Flutter Money card/lib/features/recharges/recharges_screen.dart`
    - Update `Cash in kitchen drawer` and `Staff: Kitchen Staff`.
  - `Flutter Money card/lib/features/products/products_screen.dart`
    - Update `Please select an active kitchen first.` and `Kitchen: ${currentBranch.name}`.
  - `Flutter Money card/lib/features/pos/pos_checkout_screen.dart` & `pos_scan_purchase_screen.dart`
    - Update `Return Not Allowed at this Kitchen`.
    - Update `Refund Not Allowed at this Kitchen`.
    - Update mismatch dialog messages: `This wallet was issued at another kitchen. Wallets can only be returned and settled at the kitchen where they were issued.`
    - Update `Staff: Kitchen Staff`.
  - `Flutter Money card/lib/features/payments/return_card_screen.dart`
    - Update dialog titles and messages from Counter to Kitchen.
    - Update prompt: `Return physical card and keep remaining balance of Rs ... as kitchen profit? No cash will be deducted from your drawer.`
  - `Flutter Money card/lib/features/counter_dashboard/counter_dashboard_screen.dart` & `analytics_screen.dart`
    - Update UI headers and labels: `Kitchen Dashboard`, `Kitchen Analytics`, `Kitchen Performance`.
  - `Flutter Money card/test/*`
    - Retain and verify `test/features/analytics/analytics_test.dart` assertions matching the new labels.

### 4. Backend (Backend Money Card): User-Facing Error & Validation Messages
- Files:
  - `Backend Money Card/src/controllers/organization.controller.ts`
    - Update validation messages: `Kitchen name is required`, `Kitchen name must be between 2 and 20 characters`, `Kitchen name can only contain letters, numbers, spaces, hyphens, and ampersands`.
    - Update limit message: `Your organization has reached its kitchen limit of ${effectiveLimits.branchLimit}. Please upgrade your plan or request a custom limit override to create more kitchens.`
  - `Backend Money Card/src/controllers/staff.controller.ts`
    - Update permission and scope errors: `No branch assigned to your kitchen account`, `Cannot assign staff to kitchens outside your kitchen scope`, `Cannot access staff member outside your kitchen scope`, `Cannot manage staff member outside your kitchen scope`, `Kitchen managers cannot delete their own account.`, `Cannot delete staff member outside your kitchen scope`, `Cannot change password for staff member outside your kitchen scope`.
  - `Backend Money Card/src/controllers/sessions.controller.ts`
    - Update message: `This card must be returned at the kitchen where it was issued` (while preserving enum code `RETURN_COUNTER_MISMATCH`).

## Verification Plan
1. Web App:
   - Run `npx tsc --noEmit` to confirm 0 type errors.
   - Run `npm test -- --run` across all frontend tests (255+ passing).
2. Mobile POS:
   - Run `flutter analyze --no-pub` to confirm 0 issues.
   - Run `flutter test` across all 186 Flutter tests (186/186 passing).
3. Backend:
   - Run `npm test` across all backend unit and integration tests (100 passing).
4. Zero unrequested changes:
   - Preserve database models, schema columns, internal iteration counters, and machine enum codes.
