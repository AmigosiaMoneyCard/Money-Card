# Implementation Plan: Remove Food & Order Metrics from Dashboards

Remove the 'Food & Order Metrics' section containing the 4 KPI boxes (Food Sales, Items Sold, Dishes Ordered, Cancelled Orders) and 'Open Menu Analytics' button strictly from the dashboards (Super Admin, Org Admin, and Counter Dashboards), while keeping them intact within the Menu Analytics tab.

## Visual Design Sketch

![Clean Dashboard Overview Sketch](C:\Users\damie\.gemini\antigravity-ide\brain\9c70217b-9240-4d11-907e-eaaf4a37b746\clean_dashboard_overview_sketch_1790222958194.jpg)

## Proposed Changes

### Frontend Web Admin Dashboard

#### [MODIFY] [OrgAdminDashboard.tsx](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/dashboard/OrgAdminDashboard.tsx)
- Serves both Org Admin Dashboard and Counter Dashboard (STAFF role).
- Remove the 'Dedicated Food & Order Metrics Section' (lines 595-635) containing:
  - Header: 'Food & Order Metrics' with 'Open Menu Analytics' button.
  - 4 StatCards: Food Sales, Items Sold, Dishes Ordered, Cancelled Orders.
- Remove unused imports `UtensilsCrossed`, `Ban`, `ChefHat`.

#### [MODIFY] [SuperAdminDashboard.tsx](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/dashboard/SuperAdminDashboard.tsx)
- Serves Super Admin Dashboard.
- Remove the 'Platform Food & Order Performance' section (lines 279-319) containing:
  - Header: 'Platform Food & Order Performance' with 'Open Menu Analytics' button.
  - 4 StatCards: Platform Food Sales, Total Items Sold, Dishes Ordered, Cancelled Orders.
- Clean up unused `analytics` state and `apiService.analytics.getOverview()` call in `fetchPlatformData`.
- Remove unused imports `UtensilsCrossed`, `ChefHat`, `Ban`.

---

## Wireframe Comparison

### Cleaned Dashboard (Org Admin & Counter Dashboard)
```
+--------------------------------------------------------------------------------------------------------+
| Quick Actions: [ View Cards ]  [ Team Members ]  [ Menu Products ]  [ Analytics ]                      |
+--------------------------------------------------------------------------------------------------------+
| Overview Filters: [ All Cafeterias v ]  [ Date Range: 2026-09-24 to 2026-09-24 ]  [ Refresh Data ]     |
+--------------------------------------------------------------------------------------------------------+
| [Purchase Sales Volume]    [Card Wallet Recharges]    [Active Cards Issued]    [Active Staff Members]  |
| Rs 14,800.00               Rs 22,500.00               128 Cards                14 Staff                |
+--------------------------------------------------------------------------------------------------------+
```

### Cleaned Dashboard (Super Admin Dashboard)
```
+--------------------------------------------------------------------------------------------------------+
| Quick Actions: [ Add Cafeteria ]  [ Review Requests ]  [ Manage Plans ]  [ View Reports ]              |
+--------------------------------------------------------------------------------------------------------+
| Platform SaaS Metrics:                                                                                 |
| [Cafeterias]               [Active Cardholders]       [Active Counters]        [Staff Members]         |
| 3 Cafeterias               142 Cardholders            8 Counters               24 Members              |
+--------------------------------------------------------------------------------------------------------+
```

### Menu Analytics Tab (Unchanged - Retains All 4 KPI Cards & Collapsible Table)
```
+--------------------------------------------------------------------------------------------------------+
| Tabs: [ Financial Overview ]  [ Card Analytics ]  [ Menu Analytics * ]                                 |
+--------------------------------------------------------------------------------------------------------+
| [Food Sales]               [Items Sold]               [Dishes Ordered]         [Cancelled Orders]      |
| Rs 14,800.00               384 Units                  18 Ordered               92 Cancels              |
| 52 orders                  Units sold                 Dish varieties                                   |
+--------------------------------------------------------------------------------------------------------+
| [v] All Ordered Menu Items  [ 18 Dishes ]                                [ Search dishes... ]  [Hide]  |
| [ 4-Column Collapsible Dish Table ]                                                                    |
+--------------------------------------------------------------------------------------------------------+
```

---

## Verification Plan

### Automated Tests
- Run `npm test -- --run` in `Frontend Money Card/` to ensure all 272 tests continue passing.
- Run `npx tsc --noEmit` in `Frontend Money Card/` to verify zero TypeScript errors after removing unused variables and imports.
- Run `npm test` in `Backend Money Card/` (100 tests passing).
- Run `flutter test` in `Flutter Money card/` (168 tests passing).

### Manual Verification
- Log in as Super Admin: Confirm the 4 food boxes are removed from Super Admin Dashboard, and View Reports / Menu Analytics retains them.
- Log in as Org Admin: Confirm the 4 food boxes are removed from Org Admin Dashboard, and Analytics -> Menu Analytics retains them.
- Log in as Counter Staff: Confirm the 4 food boxes are removed from Counter Dashboard.
