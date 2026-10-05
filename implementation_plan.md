# Implementation Plan: Analytics Wallets Refinement, Real Counter Password & PWA Portal Improvements

Provide streamlined analytics naming across Super Admin, Org Admin, and Counter Dashboard, serve authentic counter passwords from backend persistence, and refine the Customer Portal PWA with direct view access, item-named transaction history, minimal food preparation tracking, and removal of the view menu option.

![Analytics, Counter Credentials, and Customer Portal UI](C:\Users\damie\.gemini\antigravity-ide\brain\5d95263b-cd5f-4577-8545-14c5773f5f9e\analytics_credentials_portal_sketch_1791182658247.jpg)

## User Requirements & Status
1. Super Admin Dashboard:
   - Overview section minimal and compact:
     - Title: "Overview" (subtitle description removed for clean minimal appearance)
     - Organization filter dropdown ("All Organizations")
     - Time Window with date inputs (dd-mm-yyyy to dd-mm-yyyy)
     - "Today" button and "All Time" button (clears date range)
     - "Refresh" button (renamed from "Refresh Metrics")
     - "Platform Scale" section with 4 minimal metrics (Organizations, Active Cardholders, Active Counters, Staff Members)
     - "Wallet Analytics" section with 4 minimal metrics (Total Sales, Money Added, Active Wallets, Refunds)
   - Action Needed banner: only show the yellow warning box when pending approval requests exist; do not display the "All caught up" banner when there are 0 pending requests.
2. Super Admin Analytics:
   - Removed the "Menu Analytics" tab and page (`OrgAdminMenuAnalyticsSection`) from `SuperAdminAnalyticsView.tsx`, retaining Financial Overview and Wallet Analytics.
3. Org Admin & Counter Admin Menu Analytics:
   - In the "All Ordered Menu Items" table, simplified branch breakdown badges under dishes to display just the counter name (e.g. `Counter 1`) without `: X sold`.
4. Counter Admin and Org Admin Wallets Page:
   - On the Wallets page (`/cards`), add a "Customer Portal" button positioned directly to the left of the "Customer History" button.
   - Clicking "Customer Portal" opens the PWA customer portal view (`getPublicCustomerPortalUrl(...)`) in a new browser tab.
   - Support both Counter Staff view (`CounterStaffCardsView.tsx`), Org Admin view (`OrgAdminCardsView.tsx`), and Blocked Wallets table (`BlockedWalletsTableView.tsx`).
   - Also add a Customer Portal action in the page header next to Refresh.

## Proposed Changes

### Web Admin Analytics

#### `Frontend Money Card/src/features/analytics/OrgAdminAnalyticsComponents.tsx`
- Remove the `Wallet Activations` card (lines 154-169).
- Adjust follow-up metric card grid from `lg:grid-cols-4` to `lg:grid-cols-3` (with `leadingCard`) and `lg:grid-cols-2` (without `leadingCard`).
- Rename `Tile 2: Card Analytics` header to `Wallet Analytics`.
- Rename `Download Card Analytics` button text to `Download Wallet Analytics`.

#### `Frontend Money Card/src/features/analytics/SuperAdminAnalyticsView.tsx`
- In tab navigation, update `<span>Card Analytics</span>` to `<span>Wallet Analytics</span>`.
- Update toast notification text to `Wallet Analytics PDF downloaded.`

#### `Frontend Money Card/src/features/analytics/OrgAdminAnalyticsView.tsx`
- In tab navigation, update `<span>Card Analytics</span>` to `<span>Wallet Analytics</span>`.

#### `Frontend Money Card/src/features/analytics/useOrgAdminAnalytics.ts`
- Update notification messages: `Wallet Analytics PDF downloaded.`

#### `Frontend Money Card/src/features/analytics/OrgAdminCardTracker.tsx`
- Rename card labels:
  - `Active Cards` -> `Active Wallets`
  - `Settled Cards` -> `Settled Wallets`
  - `Blocked Cards` -> `Blocked Wallets`
  - `Blocked Balance` -> `Blocked Balance`
  - `Zero Balance` -> `Zero Balance Wallets`
  - `Inactive Cards` -> `Inactive Wallets`

#### `Frontend Money Card/src/features/analytics/analyticsPdfExport.ts`
- Remove `Wallet Activations` summary box from PDF generation.
- Rename PDF section header from `Card Analytics` to `Wallet Analytics`.

### Backend: Authentic Counter Password Storage

#### `Backend Money Card/prisma/schema.prisma`
- Add `initialPassword String?` to `model User`.
- Run `npx prisma db push` to synchronize PostgreSQL.

#### `Backend Money Card/src/controllers/organization.controller.ts`
- In `createBranch`: Save `initialPassword: effectivePassword` when creating or updating the counter manager user.
- In `updateBranch`: Update `initialPassword: password.trim()` when a new password is provided.
- In `getBranches`: Include `initialPassword` in the manager select and return `password: manager.initialPassword || ''` in `credentials`.
- In `getBranchById`: Include `initialPassword` and return `password: manager.initialPassword || ''` in `credentials`.

### Frontend: Counter Password Display

#### `Frontend Money Card/src/features/branches/BranchesPage.tsx`
- In `handleOpenViewEdit`: Read `branch.credentials?.password` directly from backend API response, falling back to local storage cache if available.
- Remove hardcoded `'12345678'` fallback; if no password is recorded, display `Not set`.
- When "Reveal" is clicked, display the authentic counter password.

### Customer Portal PWA Improvements

#### `Frontend Money Card/src/features/portal/PortalSessionPage.tsx`
- Remove the blocking `if (!isStandalone && !bypassInstall)` install gate that prevented users from directly seeing the active portal screen.
- Retain non-intrusive `<PwaInstallBanner />` at the top of the session view without blocking portal actions.
- Remove the `Today's Menu` quick action button and the `Live Menu Modal` (`isMenuOpen && ...`).
- Remove unused menu states (`menuItems`, `isMenuOpen`, `isLoadingMenu`, `menuSearch`) and `fetchMenu` callback.
- Adjust quick action grid to a streamlined 2-column layout: `Transaction History` and `Purchase Receipts`.
- Redesign the food preparation status card into a minimal, compact strip:
  - Token number badge + Counter name + Compact status pill (`Ready` / `Preparing` / `Queued`).
  - Single-line concise item preview (e.g. `2x Veg Burger, 1x Cold Coffee`).
  - Remove oversized multi-layered cards and large notification banners.

#### `Frontend Money Card/src/features/portal/PortalTransactionsPage.tsx`
- Replace `'Purchase item'` fallback text with actual purchased food item names:
  - Format items from `txn.items`: `txn.items.map(it => it.quantity > 1 ? `${it.quantity}x ${it.itemName}` : it.itemName).join(', ')`.
  - Fall back to `'Purchase'` only if items array is empty.
- Remove the green `<Badge variant="success">SUCCESS</Badge>` box from transaction cards.

## ASCII Wireframes

### 1. Analytics: Wallet Analytics Tabs & Metric Grid

```
+---------------------------------------------------------------------------------------+
|  Overview    [ Financial Overview ]   [ Wallet Analytics ]                            |
+---------------------------------------------------------------------------------------+
|  +-----------------------+  +-----------------------+  +---------------------------+  |
|  | TOTAL SALES           |  | MONEY ADDED           |  | NET CASH FLOW             |  |
|  | Rs 3,466              |  | Rs 3,650              |  | Rs 184                    |  |
|  | 3 orders              |  | 2 recharges           |  | Operating net             |  |
|  +-----------------------+  +-----------------------+  +---------------------------+  |
|                                                                                       |
|  +---------------------------------------------------------------------------------+  |
|  | WALLET FLEET TRACKER                                                            |  |
|  | +---------------+ +---------------+ +---------------+ +---------------+        |  |
|  | | ACTIVE        | | SETTLED       | | BLOCKED       | | BLOCKED       |        |  |
|  | | WALLETS       | | WALLETS       | | WALLETS       | | BALANCE       |        |  |
|  | | 1             | | 0             | | 0             | | Rs 0          |        |  |
|  | +---------------+ +---------------+ +---------------+ +---------------+        |  |
|  | +-------------------------------+ +-------------------------------+             |  |
|  | | ZERO BALANCE WALLETS          | | INACTIVE WALLETS              |             |  |
|  | | 0                             | | 0                             |             |  |
|  | +-------------------------------+ +-------------------------------+             |  |
|  +---------------------------------------------------------------------------------+  |
+---------------------------------------------------------------------------------------+
```

### 2. View / Edit Counter Details Modal (Authentic Password)

```
+---------------------------------------------------------------------------------------+
|  Counter Details: Main Cafeteria Counter 1                                        [X] |
+---------------------------------------------------------------------------------------+
|  Counter Name                                                                         |
|  [ Main Cafeteria Counter 1                                                         ] |
|                                                                                       |
|  Mobile Number                                                                        |
|  [ +91 | 9876543210                                                                 ] |
|                                                                                       |
|  Reset Password                                                                       |
|  [ Enter new password (optional)                                            ] [Eye]   |
|                                                                                       |
|  +---------------------------------------------------------------------------------+  |
|  | CURRENT PASSWORD                                                                |  |
|  | Pass@2026                                                             [Eye] Hide|  |
|  | Real saved password served directly from counter credentials                     |  |
|  +---------------------------------------------------------------------------------+  |
|                                                                                       |
|  [ Copy Credentials ]   [ Send via WhatsApp ]   [ Cancel ]   [ Save Changes ]         |
+---------------------------------------------------------------------------------------+
```

### 3. Customer Portal PWA: Direct Landing & Streamlined Actions (No Menu)

```
+---------------------------------------------------------------------------------------+
|  MONEY CARD PORTAL                                                  [Live Connected]  |
|  +---------------------------------------------------------------------------------+  |
|  | Customer: Rajesh Kumar              Wallet: MC-102               Session: ACTIVE|  |
|  |                                                                                 |  |
|  |                             CURRENT WALLET BALANCE                              |  |
|  |                                   Rs 450.00                                     |  |
|  |                               Main Food Counter                                 |  |
|  |                                                                                 |  |
|  |                         [ Download PDF Receipt ]                                |  |
|  +---------------------------------------------------------------------------------+  |
|                                                                                       |
|  +---------------------------------------------------------------------------------+  |
|  | Food Prep: [Token #4] South Counter | 2x Masala Dosa, 1x Tea     [Cooking Now]  |  |
|  +---------------------------------------------------------------------------------+  |
|                                                                                       |
|  [ Transaction History ]                              [ Purchase Receipts ]           |
+---------------------------------------------------------------------------------------+
```

### 4. PWA Transaction History (Item Names & Clean Design)

```
+---------------------------------------------------------------------------------------+
|  [<-] Transaction History                                                             |
+---------------------------------------------------------------------------------------+
|  +---------------------------------------------------------------------------------+  |
|  | [Bag] 2x Veg Burger, 1x Cold Coffee                              - Rs 240.00    |  |
|  |       05-10-2026 12:45 PM                                        2 items [v]    |  |
|  +---------------------------------------------------------------------------------+  |
|  | [Arrow] Recharge successful                                      + Rs 500.00    |  |
|  |         05-10-2026 12:30 PM                                      UPI Top-up     |  |
|  +---------------------------------------------------------------------------------+  |
|  (Clean rows with item names, no green SUCCESS badges, no generic Purchase item)     |
+---------------------------------------------------------------------------------------+
```

## Verification Plan

### Automated Test Suites
- Frontend Tests: `npm test -- --run` in `Frontend Money Card` (verify all 300+ tests pass).
- TypeScript Validation: `npx tsc --noEmit` in `Frontend Money Card` (zero errors).
- Backend Tests: `npm test` in `Backend Money Card` (verify all 124 tests pass).
- Prisma DB Push: verify schema synchronization with local PostgreSQL.

### Manual Parity & Operational Verification
- Super Admin Analytics: Verify `Wallet Analytics` tab, verify `Wallet Activations` card is gone, verify 6 wallet fleet boxes with `Wallets` labels.
- Org Admin & Counter Dashboard Analytics: Verify identical `Wallet Analytics` tabs and metrics parity.
- View / Edit Counter Details: Verify real password appears upon clicking Reveal, matching the actual password saved during creation/edit.
- Customer Portal PWA: Verify opening `/portal` lands directly on the customer screen without the 2-step install prompt block.
- PWA View Menu Removal: Verify the "Today's Menu" button and menu modal are removed, leaving a 2-button layout (Transaction History and Purchase Receipts).
- PWA Transaction History: Verify item names (e.g. `2x Veg Burger, 1x Cold Coffee`) appear instead of `Purchase item`, and no green SUCCESS badge is shown.
- Food Preparation Box: Verify minimal compact strip layout.
