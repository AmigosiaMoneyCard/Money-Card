# Implementation Plan — Set Collapsible Tables to Default Collapsed

Set the default state of collapsible dropdown tables in the Web Admin dashboard to collapsed (closed) on initial page load, requiring the user to click to drop down and inspect details, reducing initial rendering overhead and read-write load.

![Default Collapsed Tables UI](file:///C:/Users/damie/.gemini/antigravity-ide/brain/c99edd16-0faf-4782-a7e1-399d96eb8a4b/collapsed_tables_default_ui_1791467350056.jpg)

## ASCII Wireframes

### 1. All Ordered Menu Items Table (Default Collapsed)
```
+---------------------------------------------------------------------------------+
| All Ordered Menu Items                                [Search dish...]  [Show v]|
| 24 dishes sold across counters                                                  |
+---------------------------------------------------------------------------------+
(Table body hidden by default until user clicks Show or types in search box)

When Expanded:
+---------------------------------------------------------------------------------+
| All Ordered Menu Items                                [Search dish...]  [Hide ^]|
| 24 dishes sold across counters                                                  |
+---------------------------------------------------------------------------------+
| Dish Name & Category       | Units Sold | Revenue (INR) | Avg Price             |
|----------------------------|------------|---------------|-----------------------|
| Chicken Biryani            | 142        | Rs. 28,400    | Rs. 200               |
| Paneer Butter Masala       | 98         | Rs. 14,700    | Rs. 150               |
+---------------------------------------------------------------------------------+
```

### 2. Food Purchases by Counter Table (Default Collapsed)
```
+---------------------------------------------------------------------------------+
| Food Purchases by Kitchen Counter                                         [ v ] |
| Cross-counter sales volume breakdown                                            |
+---------------------------------------------------------------------------------+
(Table body hidden by default until user clicks dropdown toggle)

When Expanded:
+---------------------------------------------------------------------------------+
| Food Purchases by Kitchen Counter                                         [ ^ ] |
| Cross-counter sales volume breakdown                                            |
+---------------------------------------------------------------------------------+
| Kitchen Counter    | Orders | Items Sold | Net Sales (INR) | Revenue Share      |
|--------------------|--------|------------|-----------------|--------------------|
| Main Counter       | 312    | 650        | Rs. 65,400      | 62.4%              |
| Beverages Counter  | 188    | 240        | Rs. 18,200      | 17.4%              |
+---------------------------------------------------------------------------------+
```

### 3. Counter Overview Breakdown (Default Collapsed Accordion)
```
+---------------------------------------------------------------------------------+
| Counter 1: Main Counter                                   [Edit] [View Details v] |
| Staff: 3 Members | Menu: 18 Items | Valuation: Rs. 45,000 | Status: All Stocked |
+---------------------------------------------------------------------------------+
(Deep-dive staff list & menu stock grid hidden until clicking View Details)
```

## Technical Changes

1. [OrgAdminAnalyticsComponents.tsx](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/analytics/OrgAdminAnalyticsComponents.tsx):
   - In `OrgAdminProductDemandTable` (line 968): change `useState(true)` to `useState(false)`. Retain auto-expansion when `searchDishTerm` is entered.
   - In `FoodPurchasesByCounterTable` (line 1145): change `useState(true)` to `useState(false)`.

2. [AllBranchesOverviewModal.tsx](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/branches/AllBranchesOverviewModal.tsx):
   - Confirm `expandedBranchIds` defaults to `new Set()` (closed) so each counter row displays `[View Details]` by default without pre-expanding deep-dive details.

3. [menuAnalyticsDropdownTable.test.ts](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/__tests__/menuAnalyticsDropdownTable.test.ts):
   - Update tests to assert default `isTableOpen = false` state and verify user toggle and auto-expansion behavior.

## Verification Plan

- Run frontend tests: `npm test -- --run src/__tests__/menuAnalyticsDropdownTable.test.ts`
- Run full frontend test suite: `npm test -- --run` (all tests passing)
- Run typecheck: `npx tsc --noEmit` (0 errors)
