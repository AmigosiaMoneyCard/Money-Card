# Implementation Plan: Terminology Standardization, Dynamic Org Dashboard, Analytics On-Demand Reveal, and Menu Simplification

## Overview
This implementation plan covers the system-wide updates across the **Money Card Web App** (`Frontend Money Card`), **Backend** (`Backend Money Card`), and **Mobile App** (`Flutter Money card`):
1. **Terminology Updates**: Replace "Cafeteria" with "Organization" and "Counter" with "Kitchen" in all user-facing UI and mobile screens.
2. **Dynamic Org Admin Dashboard Title**: Change "Organization Dashboard" to `[Org Name] Dashboard` (e.g. `KJC Dashboard`).
3. **Food Purchases Renaming**: Rename "Food Purchases" to "Sales" across navigation, pages, analytics tables, and PDF exports.
4. **Metric Renaming**: Rename "Cancelled recharge" / "Cancelled Top-ups" to "Cancelled", and "Retained Profit" to "Retained amount".
5. **Analytics Privacy & Query Optimization (Eye / Show Button)**: In Super Admin, Org Admin, and Kitchen Admin Analytics, show **only** "Active Wallets" and "Total Sales" immediately; hide/mask all other metrics behind an "Eye / Show" button to reduce immediate read/write load and enhance security.
6. **Subscription Plan Change Bug Fix & Renaming**: Resolve the "Organization context required" error in `subscription.controller.ts` and `SubscriptionsPage.tsx`, and rename "Contact Super Admin / Request Plan Change" to "Plan change".
7. **Menu Management Color Code Removal**: Remove the color-coded type selector (Veg/Non-Veg/Drink colored dots) from the Add Menu modal, and remove the colored dot indicators from created menu item list rows.

---

## Detailed Task Breakdown

### 1. Global Terminology Refactor: Cafeteria → Organization & Counter → Kitchen

#### Web App (`Frontend Money Card`)
- **Navigation & Layout (`src/config/navigation.ts`, `src/components/ui/Breadcrumbs.tsx`, `src/components/ui/ProfileMenu.tsx`)**:
  - `Counters` → `Kitchens`
  - `Counter Admin` → `Kitchen Admin`
  - Breadcrumbs: `branches: 'Kitchens'`, `food-purchases: 'Sales'`
- **Dashboard & Analytics (`src/features/dashboard/`, `src/features/analytics/`)**:
  - "Cafeteria Scope" → "Organization Scope" (or "Kitchen Scope" when filtering branches)
  - "All Cafeterias" → "All Organizations"
  - "All Counters" → "All Kitchens"
  - "Active Counters" → "Active Kitchens"
  - "Food Purchases by Counter" → "Sales by Kitchen"
  - "Loading cafeteria dashboard..." → "Loading organization dashboard..."
- **Staff Management (`src/features/staff/StaffPage.tsx`, `CounterStaffPage.tsx`)**:
  - "Counter Name" → "Kitchen Name"
  - "Counter Managers" → "Kitchen Managers"
  - Role description and modal headers updated to Kitchen.
- **Menu Management (`src/features/products/ProductsPage.tsx`)**:
  - Table headers: "Counter Name" → "Kitchen Name"
  - Search placeholder: "Search counters..." → "Search kitchens..."
  - "Loading cafeteria counters..." → "Loading kitchens..."
- **Subscriptions & Modals (`src/features/subscriptions/SubscriptionsPage.tsx`)**:
  - "Current Cafeteria Plan" → "Current Organization Plan"
  - "A cafeteria can only make one plan change..." → "An organization can only make one plan change..."
- **PDF Reports (`src/features/analytics/analyticsPdfExport.ts`)**:
  - Section headers: "Food Purchases by Counter" → "Sales by Kitchen"
  - "Counter Comparison" → "Kitchen Comparison"

#### Mobile App (`Flutter Money card`)
- **Strings & UI (`lib/features/`, `lib/widgets/`, `lib/providers/`)**:
  - `branch_provider.dart`: "Please contact your Organization Administrator" (was Cafeteria Administrator).
  - `pos_scan_purchase_screen.dart`: "Refund Not Allowed at this Kitchen" (was Counter).
  - `app_empty_state.dart`: "Scan a wallet to start a new organization session."
  - `analytics_screen.dart`: "Counter Analytics" → "Kitchen Analytics", "No performance metrics available for this kitchen."

---

### 2. Dynamic Org Admin Dashboard Title
- **Target File**: `Frontend Money Card/src/features/dashboard/OrgAdminDashboard.tsx`
- **Logic**:
  ```tsx
  <h1 className="text-2xl font-bold text-slate-900">
    {isCounterAdmin
      ? `${user?.organizationName ? `${user.organizationName} Kitchen Dashboard` : 'Kitchen Dashboard'}`
      : `${user?.organizationName ? `${user.organizationName} Dashboard` : 'Organization Dashboard'}`}
  </h1>
  ```
  - Example: If `user.organizationName` is "KJC", it displays "KJC Dashboard".

---

### 3. Rename "Food Purchases" to "Sales"
- **Navigation (`Frontend Money Card/src/config/navigation.ts`)**:
  - Update `id: 'food-purchases'`, `label: 'Sales'`.
- **Breadcrumbs (`Frontend Money Card/src/components/ui/Breadcrumbs.tsx`)**:
  - Update `'food-purchases': 'Sales'`.
- **Food Purchases Page (`Frontend Money Card/src/features/analytics/FoodPurchasesPage.tsx`)**:
  - Page header: `Sales` (was "Food Purchases")
  - Loading / error strings: `Loading sales...`, `Failed to load sales`.
- **Analytics Sections (`Frontend Money Card/src/features/analytics/OrgAdminAnalyticsComponents.tsx`)**:
  - "Food Purchases by Counter" → "Sales by Kitchen"
  - "No food purchases found..." → "No sales found..."

---

### 4. Metric Renaming: Cancelled Recharge → Cancelled & Retained Profit → Retained Amount
- **Target Files**:
  - `Frontend Money Card/src/features/analytics/OrgAdminAnalyticsComponents.tsx`
  - `Frontend Money Card/src/features/analytics/analyticsPdfExport.ts`
  - `Flutter Money card/lib/features/analytics/analytics_screen.dart`
  - `Flutter Money card/lib/features/pos/pos_scan_purchase_screen.dart`
- **Changes**:
  - In `OrgAdminFinancialSection`: Card label `Cancelled Top-ups` → `Cancelled`.
  - In `Flutter analytics_screen.dart`: `Cancelled Amount` → `Cancelled`.
  - In `pos_scan_purchase_screen.dart`: `Cancelled Recharges` → `Cancelled`.
  - In metric breakdowns / float balance: Rename references to "Retained Profit" / "Customer Float Balance" to "Retained amount".

---

### 5. Analytics: Eye / Show Button for On-Demand Metric Reveal
- **Target Files**:
  - `Frontend Money Card/src/features/analytics/OrgAdminAnalyticsComponents.tsx`
  - `Frontend Money Card/src/features/analytics/SuperAdminAnalyticsView.tsx`
  - `Frontend Money Card/src/features/analytics/OrgAdminAnalyticsView.tsx`
  - `Frontend Money Card/src/features/analytics/OrgAdminCardTracker.tsx`
  - `Flutter Money card/lib/features/analytics/analytics_screen.dart`
- **Behavior & Architecture**:
  - **Always Visible**:
    1. **Total Sales**
    2. **Active Wallets** (Wallet In use)
  - **Hidden / Masked by Default**:
    - Recharges (Total, UPI, Cash)
    - Refunds
    - Cancelled
    - Retained amount / Float Balance
    - Zero Balance Wallets, Closed Wallets, Re-recharged Wallets
  - **UI Interaction**:
    - Each hidden card displays a placeholder (e.g. `••••••`) alongside an Eye button / "Show" button (`<Eye className="h-4 w-4" />`).
    - Clicking the Eye / Show button toggles the individual card (or the whole section) to reveal the real calculated number and switches the button to `<EyeOff className="h-4 w-4" />`.
    - Heavy background queries (such as peak demand distribution, card tracker table queries) are only queried or expanded when requested, significantly saving read/write query limits.

---

### 6. Subscription Change "Context Needed" Bug Fix & Renaming
- **Backend Fix (`Backend Money Card/src/controllers/subscription.controller.ts`)**:
  - In `createOrgPlanRequest`:
    ```ts
    let orgId = req.user?.organizationId || req.body?.organizationId || (req.headers['x-organization-id'] as string);
    if (!orgId && req.user?.role === Role.SUPER_ADMIN) {
      const defaultOrg = await prisma.organization.findFirst();
      orgId = defaultOrg?.id;
    }
    if (!orgId) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Organization context required');
    }
    ```
  - In `renewOrgSubscription`: Apply the same fallback logic so renewals never fail with missing context.
- **Frontend Input & Types (`Frontend Money Card/src/types/subscription.ts`, `realClient.ts`)**:
  - Ensure `CreatePlanRequestInput` supports optional `organizationId?: string`.
  - In `SubscriptionsPage.tsx`, pass `organizationId: user?.organizationId` in `createPlanRequest`.
- **Renaming in `SubscriptionsPage.tsx`**:
  - Modal title: Change from `"Contact Super Admin / Request Plan Change"` to `"Plan change"`.
  - Modal submit button & banners: Rename labels from "Request Plan Change" to "Plan change".

---

### 7. Menu Management: Remove Color Codes
- **Add Menu Modal (`Frontend Money Card/src/features/products/CounterAddProductModal.tsx`)**:
  - Remove the "Food Type Selector (Clean Colored Dots, Zero Emojis)" section containing the Veg (green dot), Non-Veg (red dot), and Drink (blue dot) buttons.
  - Simplify the form strictly to: Item Name, Price (₹), and optional description/category without color coding.
- **View / Edit Menu Modal (`Frontend Money Card/src/features/products/CounterViewEditMenuModal.tsx`)**:
  - Remove the colored dot indicator rendered next to product item names.
- **Products Page (`Frontend Money Card/src/features/products/ProductsPage.tsx`)**:
  - Remove the colored dot indicator rendered next to product item names in the main table list.

---

## Verification & Testing Plan
### Automated & Unit Tests
1. **Frontend Tests**:
   - Run `npm test` in `Frontend Money Card` to verify existing tests and update mock test fixtures where label assertions changed (e.g. `Food Purchases` → `Sales`, `All Counters` → `All Kitchens`).
2. **Backend Tests**:
   - Verify `subscription.controller.ts` with valid and fallback `organizationId`.
3. **Flutter Widget/Unit Tests**:
   - Run `flutter test` in `Flutter Money card` to ensure string changes in POS and Analytics screens pass contract checks.

### Manual Verification
1. **Org Admin Dashboard**:
   - Log in as Org Admin for organization "KJC".
   - Confirm heading is "KJC Dashboard".
2. **Navigation & Breadcrumbs**:
   - Verify sidebar displays "Sales" and "Kitchens".
   - Verify breadcrumbs and page titles reflect "Sales" and "Kitchens".
3. **Analytics Eye/Show Feature**:
   - Open Analytics as Super Admin, Org Admin, and Kitchen Admin.
   - Verify only "Total Sales" and "Active Wallets" show values immediately.
   - Verify all other cards show `••••••` with an Eye/Show button.
   - Click "Show" on Recharges and Refunds; verify values unmask immediately.
4. **Subscription Change**:
   - In Org Admin Subscription page, click "Plan change" (renamed).
   - Submit plan change request.
   - Verify no "Context needed" error appears and request succeeds with toast confirmation.
5. **Add Menu & Menu Item Display**:
   - Open "Add Menu".
   - Confirm color selector (green/red/blue dots) is gone.
   - Add a product. Confirm created menu item row has no colored circle dot next to its name.
