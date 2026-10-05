# Implementation Plan - Super Admin Dashboard Unified Overview with Organization & Custom Date Range Filters

## Overview & Scope of Work
Unify the Super Admin Dashboard platform metrics (Organizations, Active Cardholders, Active Counters, Staff Members) and operational metrics (Wallet Analytics: Total Sales, Money Added, Active Wallets, Refunds) under one roof inside a single cohesive Overview card container.
Equip this unified container with:
1. Organization Filter: Dropdown to filter across all organizations or a specific active organization.
2. Custom Time Range Filter: Start date, End date, Reset to Today button, and All Time clear button.
3. Refresh Data button: Dedicated refresh trigger for filtered metrics.

![Super Admin Unified Overview Dashboard](C:\Users\damie\.gemini\antigravity-ide\brain\5d95263b-cd5f-4577-8545-14c5773f5f9e\superadmin_dashboard_overview_1791174697682.jpg)

## Proposed Changes

File: `Frontend Money Card/src/features/dashboard/SuperAdminDashboard.tsx`
- Add filter state: `selectedOrgId` (string, default `''`), `startDate` (string, default `''`), and `endDate` (string, default `''`).
- Update analytics loading logic: re-fetch analytics data whenever `selectedOrgId`, `startDate`, or `endDate` change via `apiService.analytics.getOverview({ organizationId: selectedOrgId || undefined, startDate: startDate || undefined, endDate: endDate || undefined })`.
- Compute dynamic platform stats:
  - Organizations: `selectedOrgId ? 1 : activeOrgsCount`
  - Active Cardholders: when an org is selected, show that org's active cardholders; when All Organizations is selected, aggregate across all active organizations.
  - Active Counters: when an org is selected, show that org's counter count; when All Organizations is selected, aggregate across all active organizations.
  - Staff Members: when an org is selected, show that org's staff count; when All Organizations is selected, aggregate across all active organizations.
- Compute dynamic wallet analytics:
  - Total Sales: formatted `totalPurchaseVolume` or `salesVolume` with order count description.
  - Money Added: formatted `moneyAdded` or `totalRechargeVolume` with recharge count description.
  - Active Wallets: `activeCardsCount` with "In use" description.
  - Refunds: formatted `totalRefundVolume` or `moneyRefunded` with refund count description.
- Wrap both rows inside a single unified `Card` container with a top filter toolbar containing Organization Select, Date Range pickers, Reset to Today button, All Time button, and Refresh button.
- Ensure full mobile viewport responsiveness (zero horizontal overflow, flexible wrap controls).

File: `Frontend Money Card/src/__tests__/superAdminDashboardUnifiedFilters.test.ts`
- Unit test suite validating:
  - API query parameter construction with org filter and custom date range.
  - Platform metric calculations for all organizations vs single organization.
  - Wallet analytics metric mapping.

## Parity Checks
- Web App to Mobile POS Parity: Super Admin dashboard is exclusive to the Web Admin portal. The Flutter POS app is for counter staff and kitchen operations; no Flutter models or screens require modification.
- PDF Export Parity: Super Admin analytics reporting is handled on `/analytics` via `SuperAdminAnalyticsView.tsx` which already supports organization and date filtering. No PDF export changes required.

## ASCII Wireframe

```
+-------------------------------------------------------------------------------------------------------------------------+
| Welcome back, Super Admin                                                                                     [Refresh] |
+-------------------------------------------------------------------------------------------------------------------------+
| [Urgent / Status Banner: Action Needed / All systems normal]                                                            |
+-------------------------------------------------------------------------------------------------------------------------+
| Quick Actions: [ + Add Organization ]   [ Bell Review Requests ]   [ Layers Manage Plans ]   [ BarChart View Reports ]  |
+-------------------------------------------------------------------------------------------------------------------------+
|                                                                                                                         |
| +-- UNIFIED OVERVIEW CONTAINER ("UNDER ONE ROOF") --------------------------------------------------------------------+ |
| | Overview                                                                                                            | |
| |                                                                                                                     | |
| | [ Organization: [ All Organizations       v] ]  [ Date Range: [2026-10-01] to [2026-10-05] [Today] [All Time] ]   | |
| |                                                                                                   [Refresh Metrics] | |
| | ------------------------------------------------------------------------------------------------------------------- | |
| | PLATFORM METRICS                                                                                                    | |
| | +---------------------+ +---------------------+ +---------------------+ +---------------------+                 | |
| | | [Building]          | | [Users]             | | [Store]             | | [UserCheck]         |                 | |
| | | Organizations       | | Active Cardholders  | | Active Counters     | | Staff Members       |                 | |
| | | 1                   | | 1                   | | 1                   | | 3                   |                 | |
| | | Active platforms    | | Across cards        | | Active POS counters | | Registered staff    |                 | |
| | +---------------------+ +---------------------+ +---------------------+ +---------------------+                 | |
| |                                                                                                                     | |
| | WALLET ANALYTICS                                                                                                    | |
| | +---------------------+ +---------------------+ +---------------------+ +---------------------+                 | |
| | | [ShoppingBag]       | | [TrendingUp]        | | [CreditCard]        | | [RefreshCw]         |                 | |
| | | Total Sales         | | Money Added         | | Active Wallets      | | Refunds             |                 | |
| | | Rs.820              | | Rs.2,000            | | 1                   | | Rs.0                |                 | |
| | | 2 orders            | | 1 recharges         | | In use              | | 0 refunds           |                 | |
| | +---------------------+ +---------------------+ +---------------------+ +---------------------+                 | |
| +---------------------------------------------------------------------------------------------------------------------+ |
+-------------------------------------------------------------------------------------------------------------------------+
```

## Verification Plan
1. Frontend Tests: Run `npm test -- --run` in `Frontend Money Card` to ensure all existing and new tests pass.
2. Frontend Type Check: Run `npx tsc --noEmit` in `Frontend Money Card` to verify zero TypeScript errors.
3. Mobile Parity Check: Run `flutter analyze --no-pub` in `Flutter Money card` to verify zero analyzer issues.
