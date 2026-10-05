# Implementation Plan: Super Admin Minimal Overview, Analytics Menu Tab Removal, and Customer Portal PWA Button

## User Requirements
1. Super Admin Dashboard:
   - Make the Overview section minimal and compact while including:
     - Title: "Overview"
     - Subtitle description: "Platform scale and operational wallet analytics under a unified organization and time window filter."
     - Organization filter dropdown ("All Organizations")
     - Time Window with date inputs (dd-mm-yyyy to dd-mm-yyyy)
     - "Today" button and "All Time" button (clears date range)
     - "Refresh Metrics" button
     - "Platform Scale" section with 4 minimal metrics:
       - Organizations (count + "Active platforms")
       - Active Cardholders (count + "Across all organizations")
       - Active Counters (count + "Active POS counters")
       - Staff Members (count + "Registered staff")
     - "Wallet Analytics" section with 4 minimal metrics:
       - Total Sales (currency + "X orders")
       - Money Added (currency + "X recharges")
       - Active Wallets (count + "In use")
       - Refunds (currency + "X refunds")
2. Super Admin Analytics:
   - Remove the "Menu Analytics" tab and page (`OrgAdminMenuAnalyticsSection`) from `SuperAdminAnalyticsView.tsx`, retaining Financial Overview and Card Analytics.
3. Counter Admin and Org Admin Wallets Page:
   - On the Wallets page (`/cards`), add a "Customer Portal" button positioned directly to the left of the "Customer History" button.
   - Clicking "Customer Portal" opens the PWA customer portal view (`getPublicCustomerPortalUrl(...)`) in a new browser tab.
   - Support both Counter Staff view (`CounterStaffCardsView.tsx`), Org Admin view (`OrgAdminCardsView.tsx`), and Blocked Wallets table (`BlockedWalletsTableView.tsx`).
   - Also add a Customer Portal action in the page header next to Refresh.

## Proposed Changes

### 1. Super Admin Dashboard Minimal Overview
File: `Frontend Money Card/src/features/dashboard/SuperAdminDashboard.tsx`
- Restore CardHeader description: "Platform scale and operational wallet analytics under a unified organization and time window filter."
- In the filter toolbar, ensure clean compact layout with:
  - Organization Select
  - Time Window date inputs
  - "Today" preset button
  - "All Time" preset button (resets `startDate` and `endDate` to empty string)
  - Action button renamed back to "Refresh Metrics"
- Refactor the 8 stat cards into a lightweight, minimal card style:
  - Compact padding (`p-3.5 sm:p-4`)
  - Crisp typography (`font-mono text-xl sm:text-2xl font-bold`)
  - Sleek icon container (`h-8 w-8` rounded-lg)
  - Muted secondary labels ("Active platforms", "Across all organizations", "Active POS counters", "Registered staff", "X orders", "X recharges", "In use", "X refunds")
- Update unit tests in `Frontend Money Card/src/__tests__/superAdminDashboardUnifiedFilters.test.ts` to assert "All Time" button and "Refresh Metrics" label.

### 2. Super Admin Analytics Menu Tab Removal
File: `Frontend Money Card/src/features/analytics/SuperAdminAnalyticsView.tsx`
- Change active tab type from `'overview' | 'cards' | 'menu'` to `'overview' | 'cards'`.
- Remove the "Menu Analytics" button from the tab navigation.
- Remove the conditional rendering of `OrgAdminMenuAnalyticsSection`.
- Remove unused imports (`UtensilsCrossed`, `OrgAdminMenuAnalyticsSection`).

### 3. Customer Portal Button in Wallets Page
Files:
- `Frontend Money Card/src/utils/formatters.ts`: Update `getPublicCustomerPortalUrl(token?: string)` so that when no token is provided, it returns `${origin}/portal` (or staging domain equivalent).
- `Frontend Money Card/src/features/cards/CounterStaffCardsView.tsx`:
  - In each active card row action buttons, add `Customer Portal` button to the left of `Customer History`.
  - In the page header next to Refresh, add `Customer Portal` button.
  - Clicking opens `getPublicCustomerPortalUrl(card.qrToken)` in a new tab.
- `Frontend Money Card/src/features/cards/OrgAdminCardsView.tsx`:
  - In each counter row action buttons, add `Customer Portal` button to the left of `Customer History`.
  - In the page header next to Refresh, add `Customer Portal` button.
  - Clicking opens `getPublicCustomerPortalUrl()` (or active card token for that branch) in a new tab.
- `Frontend Money Card/src/features/cards/BlockedWalletsTableView.tsx`:
  - In each blocked card row action buttons, add `Customer Portal` button to the left of `Customer History`.

## ASCII Wireframes

### Super Admin Dashboard Minimal Overview
```
+-------------------------------------------------------------------------------------------------------------------------+
| Welcome back, Super Admin                                                                                     [Refresh] |
+-------------------------------------------------------------------------------------------------------------------------+
| Quick Actions: [ + Add Organization ]   [ Bell Review Requests ]   [ Layers Manage Plans ]   [ BarChart View Reports ]  |
+-------------------------------------------------------------------------------------------------------------------------+
|                                                                                                                         |
| +-- OVERVIEW ---------------------------------------------------------------------------------------------------------+ |
| | Overview                                                                                                            | |
| | Platform scale and operational wallet analytics under a unified organization and time window filter.                | |
| |                                                                                                                     | |
| | [ Organization: [ All Organizations       v] ]  [ Time Window: [dd-mm-yyyy] to [dd-mm-yyyy] [Today] [All Time] ]   | |
| |                                                                                                   [Refresh Metrics] | |
| | ------------------------------------------------------------------------------------------------------------------- | |
| | PLATFORM SCALE                                                                                                      | |
| | +---------------------+ +---------------------+ +---------------------+ +---------------------+                 | |
| | | [Building]          | | [Users]             | | [Store]             | | [UserCheck]         |                 | |
| | | Organizations       | | Active Cardholders  | | Active Counters     | | Staff Members       |                 | |
| | | 1                   | | 1                   | | 1                   | | 3                   |                 | |
| | | Active platforms    | | Across all orgs     | | Active POS counters | | Registered staff    |                 | |
| | +---------------------+ +---------------------+ +---------------------+ +---------------------+                 | |
| |                                                                                                                     | |
| | WALLET ANALYTICS                                                                                                    | |
| | +---------------------+ +---------------------+ +---------------------+ +---------------------+                 | |
| | | [ShoppingBag]       | | [TrendingUp]        | | [CreditCard]        | | [RefreshCw]         |                 | |
| | | Total Sales         | | Money Added         | | Active Wallets      | | Refunds             |                 | |
| | | Rs.3,466            | | Rs.3,650            | | 1                   | | Rs.0                |                 | |
| | | 3 orders            | | 2 recharges         | | In use              | | 0 refunds           |                 | |
| | +---------------------+ +---------------------+ +---------------------+ +---------------------+                 | |
| +---------------------------------------------------------------------------------------------------------------------+ |
+-------------------------------------------------------------------------------------------------------------------------+
```

### Counter Admin & Org Admin Wallets Table (Action Buttons)
```
+-------------------------------------------------------------------------------------------------------------------------+
| Wallets & Customer History                                                  [ Customer Portal (PWA) ]   [ Refresh ]     |
+-------------------------------------------------------------------------------------------------------------------------+
| [ Search wallet ID or customer...           [X] ]                                                                       |
+-------------------------------------------------------------------------------------------------------------------------+
| [ Live Active Wallets (1) ]   [ Blocked Wallets (0) ]                                                                   |
+-------------------------------------------------------------------------------------------------------------------------+
| WALLET ID            LIVE BALANCE   ACTIONS                                                                             |
| ----------------------------------------------------------------------------------------------------------------------- |
| [Card] KD1IRUG9      Rs.450.00      [ Customer Portal ] [ Customer History ] [ Wallet Analytics ] [ Wallet Details ]    |
|                                     ^-- NEW BUTTON TO THE LEFT OF CUSTOMER HISTORY                                      |
+-------------------------------------------------------------------------------------------------------------------------+
```

## Verification Plan

### Automated Tests
1. Frontend Tests: Run `npm test -- --run` in `Frontend Money Card` (verify all test suites pass, including updated `superAdminDashboardUnifiedFilters.test.ts`).
2. Frontend Type Check: Run `npx tsc --noEmit` in `Frontend Money Card` (verify 0 errors).
3. Mobile Parity Check: Verify no regressions across Mobile POS (`flutter analyze --no-pub`).
