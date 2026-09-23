# Menu Analytics Tab, Dashboard Food Order Metrics, and Local Timezone Date Reset Fix

This document outlines the technical design, component breakdown, and step-by-step implementation for:
1. **Fixing the Date Preset & "Reset to Today" Timezone Bug**: Resolving the issue where clicking "Reset to Today" (or loading date presets) in India (IST / UTC+5:30) resulted in yesterday's date (`2026-09-23`) instead of today's date (`2026-09-24`) due to UTC `toISOString().split('T')[0]` formatting.
2. **Adding Food Order Metrics Across Dashboards**: Adding dedicated KPI cards (Food Sales, Items Sold, Dishes Ordered, Cancelled Orders) across Counter Dashboard, Org Admin Dashboard, and Super Admin Dashboard.
3. **Introducing "Menu Analytics" Tab**: Adding a 3rd top tab in Web Analytics (`OrgAdminAnalyticsView` and `SuperAdminAnalyticsView`) with:
   - Specific KPI label formats & clean subtexts:
     - **Food Sales**: Display amount with simple subtitle `${orders} orders` (removed "Total amount").
     - **Items Sold**: Display `${productsSoldCount} Units` with a small subtitle `Units sold`.
     - **Dishes Ordered**: Display `${dishesOrderedCount} Ordered` with a small subtitle `Dish varieties`.
     - **Cancelled Orders**: Display `${cancelledOrdersCount} Cancels` with no voided amount subtitle.
   - Minimal 4-column "All Ordered Menu Items" table: `Dish Name`, `Price`, `Quantity Sold`, and `Total Revenue` (strictly removed `(R)` from header). Category, Status, and Cancelled Quantity are removed.

![Menu Analytics Tab with Clean 4-Column Table](C:/Users/damie/.gemini/antigravity-ide/brain/9c70217b-9240-4d11-907e-eaaf4a37b746/menu_analytics_4_columns_table_sketch_1790195557898.jpg)

## User Review Required

> [!IMPORTANT]
> User-specified refinements:
> 1. In Food Sales KPI card: Removed "Total amount" text; displays currency value and clean order count subtitle (e.g. `8,125 orders`).
> 2. In Items Sold KPI card: Kept very small subtitle `Units sold`.
> 3. In Dishes Ordered KPI card: Formatted as `${count} Ordered` (e.g. `384 Ordered`) with small subtitle `Dish varieties`.
> 4. In Cancelled Orders KPI card: Formatted as `${count} Cancels` (e.g. `92 Cancels`) with total voided amount subtitle removed.
> 5. In All Ordered Menu Items table: Removed `(R)` from the `Total Revenue` header; table columns are strictly: `Dish Name`, `Price`, `Quantity Sold`, `Total Revenue`.

## Proposed Layouts and Wireframes

### 1. Web Analytics - Menu Analytics Tab Wireframe

```
+----------------------------------------------------------------------------------------------------+
| Analytics                                                  [All Cafeterias v] [2026-09-24 to ...]  |
|                                                            [ Apply ] [ Reset Today ] [ View PDF ]  |
+----------------------------------------------------------------------------------------------------+
| [ Financial Overview ]   [ Card Analytics ]   [ Menu Analytics (Active) ]                          |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
| +---------------------+ +---------------------+ +---------------------+ +------------------------+ |
| | FOOD SALES          | | ITEMS SOLD          | | DISHES ORDERED      | | CANCELLED ORDERS       | |
| | Rs 345,670.00       | | 24,890 Units        | | 384 Ordered         | | 92 Cancels             | |
| | 8,125 orders        | | Units sold          | | Dish varieties      | |                        | |
| +---------------------+ +---------------------+ +---------------------+ +------------------------+ |
|                                                                                                    |
| +------------------------------------------------------------------------------------------------+ |
| | All Ordered Menu Items                                                [Search dishes...]       | |
| +------------------------------------------------------------------------------------------------+ |
| | Dish Name                      | Price          | Quantity Sold         | Total Revenue        | |
| |--------------------------------+----------------+-----------------------+----------------------| |
| | Chicken Biryani                | Rs 280.00      | 1,450                 | Rs 406,000.00        | |
| | Masala Dosa                    | Rs 120.00      | 1,120                 | Rs 134,400.00        | |
| | Paneer Makhani                 | Rs 240.00      | 980                   | Rs 235,200.00        | |
| | Cold Coffee                    | Rs 80.00       | 750                   | Rs 60,000.00         | |
| +------------------------------------------------------------------------------------------------+ |
+----------------------------------------------------------------------------------------------------+
```

### 2. Counter Dashboard and Org Admin Dashboard - Food Metrics Section Wireframe

```
+----------------------------------------------------------------------------------------------------+
| Overview                                                   [Time Window: 2026-09-24 to 2026-09-24] |
+----------------------------------------------------------------------------------------------------+
| FINANCIAL & CARD METRICS                                                                           |
| +---------------------+ +---------------------+ +---------------------+ +------------------------+ |
| | Purchase Volume     | | Wallet Recharges    | | Cards Issued        | | Active Staff           | |
| | Rs 345,670.00       | | Rs 412,000.00       | | 148 Cards           | | 8 Members              | |
| +---------------------+ +---------------------+ +---------------------+ +------------------------+ |
|                                                                                                    |
| FOOD & ORDER METRICS                                                    [Open Menu Analytics ->]   |
| +---------------------+ +---------------------+ +---------------------+ +------------------------+ |
| | Food Sales          | | Items Sold          | | Dishes Ordered      | | Cancelled Orders       | |
| | Rs 345,670.00       | | 24,890 Units        | | 384 Ordered         | | 92 Cancels             | |
| | 8,125 orders        | | Units sold          | | Dish varieties      | |                        | |
| +---------------------+ +---------------------+ +---------------------+ +------------------------+ |
+----------------------------------------------------------------------------------------------------+
```

### 3. Super Admin Dashboard - Food & Order Metrics Section Wireframe

```
+----------------------------------------------------------------------------------------------------+
| PLATFORM SAAS METRICS                                                                              |
| +---------------------+ +---------------------+ +---------------------+ +------------------------+ |
| | Cafeterias          | | Active Cardholders  | | Active Counters     | | Staff Members          | |
| | 12 Cafeterias       | | 4,210 Cardholders   | | 28 Counters         | | 64 Members             | |
| +---------------------+ +---------------------+ +---------------------+ +------------------------+ |
|                                                                                                    |
| PLATFORM FOOD & ORDER PERFORMANCE                                       [View Reports ->]          |
| +---------------------+ +---------------------+ +---------------------+ +------------------------+ |
| | Platform Food Sales | | Total Items Sold    | | Dishes Ordered      | | Cancelled Orders       | |
| | Rs 1,420,500.00     | | 94,120 Units        | | 1,240 Ordered       | | 312 Cancels            | |
| | Platform orders     | | Units sold          | | Dish varieties      | |                        | |
| +---------------------+ +---------------------+ +---------------------+ +------------------------+ |
+----------------------------------------------------------------------------------------------------+
```

## Proposed Changes

### Core Timezone & Date Formatting Fix (`Frontend Money Card/`)

#### [MODIFY] [formatters.ts](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/utils/formatters.ts)
- Add and export `formatLocalDate(d: Date = new Date()): string`:
  ```ts
  export function formatLocalDate(d: Date = new Date()): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  ```
- Re-export in `src/utils/index.ts`.

#### [MODIFY] [useOrgAdminAnalytics.ts](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/analytics/useOrgAdminAnalytics.ts)
- In `getPresetDates(preset)`: Replace all `toISOString().split('T')[0]` calls with `formatLocalDate()`.
  - `today`: returns `{ startDate: formatLocalDate(now), endDate: formatLocalDate(now) }` (accurately evaluates to `2026-09-24`).
  - `yesterday`: returns `{ startDate: formatLocalDate(yest), endDate: formatLocalDate(yest) }`.
  - `last7`, `last30`, `thisMonth`: use `formatLocalDate()`.
- In initial state for `startDate` and `endDate`: Default to `getPresetDates('today')` using local time.
- Update `activeTab` type from `'overview' | 'cards'` to `'overview' | 'cards' | 'menu'`.

#### [MODIFY] [OrgAdminDashboard.tsx](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/dashboard/OrgAdminDashboard.tsx)
- In `getPresetDates(preset)`: Replace all `toISOString().split('T')[0]` calls with `formatLocalDate()`.
- In "Reset to Today" button onClick: Sets today's date using `getPresetDates('today').startDate` (`formatLocalDate(new Date())`).
- Add the "Food & Order Metrics" section inside the Overview container:
  - Food Sales (`formatCurrency(analytics?.totalPurchaseVolume || 0)`, subtitle `${orders} orders`)
  - Items Sold (`${analytics?.productsSoldCount || 0} Units`, subtitle 'Units sold')
  - Dishes Ordered (`${analytics?.dishesOrderedCount || 0} Ordered`, subtitle 'Dish varieties')
  - Cancelled Orders (`${analytics?.cancelledOrdersCount || 0} Cancels`)
  - Button to navigate to `/analytics?tab=menu`.

#### [MODIFY] [OrgAdminCardsView.tsx](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/cards/OrgAdminCardsView.tsx)
- Replace `new Date().toISOString().split('T')[0]` with `formatLocalDate(new Date())` in `customStartDate`, `customEndDate`, `appliedStartDate`, `appliedEndDate`, and in `handleResetToToday`.

#### [MODIFY] [CounterStaffCardsView.tsx](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/cards/CounterStaffCardsView.tsx)
- Replace `new Date().toISOString().split('T')[0]` with `formatLocalDate(new Date())` in `customStartDate`, `customEndDate`, `appliedStartDate`, `appliedEndDate`, and in `handleResetToToday`.

#### [MODIFY] [PeakPage.tsx](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/peak/PeakPage.tsx)
- Replace `new Date().toISOString().split('T')[0]` with `formatLocalDate(new Date())` in `handleResetToToday` and date initializers.

#### [MODIFY] [SuperAdminAnalyticsView.tsx](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/analytics/SuperAdminAnalyticsView.tsx)
- Use standard `formatLocalDate` from `src/utils`.
- Add 3rd tab button: `Menu Analytics`.
- When `activeTab === 'menu'`, render `<OrgAdminMenuAnalyticsSection />`.

#### [MODIFY] [StaffPage.tsx](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/staff/StaffPage.tsx)
- Replace local `getTodayDateStr` with shared `formatLocalDate`.

#### [MODIFY] [staffActivityFilter.test.ts](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/__tests__/staffActivityFilter.test.ts)
- Update test expectations to verify that `getPresetDates` outputs local dates (`formatLocalDate`) accurately.

---

### Backend Sub-Project (`Backend Money Card/`)

#### [MODIFY] [analytics.controller.ts](file:///D:/Money%20Card%20Project/Backend%20Money%20Card/src/controllers/analytics.controller.ts)
- In `getOrgAnalytics`:
  - Fetch existing products for the organization/tenant to resolve prices (`prisma.product.findMany`).
  - Track `totalPurchaseCount` (food orders count), `rootProductsSoldCount` (total dish units sold across filtered orders), and `allProductDemandMap`.
  - Process items inside active `PURCHASE` transactions:
    - Aggregate `quantitySold`, `totalRevenue`, and `orderCount` per product into `allProductDemandMap`.
  - Format `allProductDemand`: Array of `{ productId, productName, unitPrice, quantitySold, totalRevenue, orderCount }` sorted by `quantitySold` descending.
  - Return in `sendSuccess`:
    - `foodOrdersCount`: Total purchase orders placed.
    - `productsSoldCount`: Total units/dishes sold.
    - `dishesOrderedCount`: Number of unique menu item varieties ordered (`allProductDemand.length`).
    - `allProductDemand`: Full array of ordered menu items.
    - `cancelledOrdersCount`: Already tracked count.
    - `cancelledOrdersVolume`: Already tracked volume.

---

### Frontend UI Components & Types (`Frontend Money Card/`)

#### [MODIFY] [analytics.ts](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/types/analytics.ts)
- Add `ProductDemandItem` interface:
  ```ts
  export interface ProductDemandItem {
    productId: string;
    productName: string;
    unitPrice: number;
    quantitySold: number;
    totalRevenue: number;
    orderCount: number;
  }
  ```
- Enrich `AnalyticsOverview` with `productsSoldCount`, `dishesOrderedCount`, `foodOrdersCount`, and `allProductDemand`.

#### [MODIFY] [mock handlers (analytics.ts)](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/services/mock/handlers/analytics.ts)
- Include mock values for `productsSoldCount`, `dishesOrderedCount`, `foodOrdersCount`, and sample `allProductDemand` records.

#### [MODIFY] [OrgAdminAnalyticsComponents.tsx](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/analytics/OrgAdminAnalyticsComponents.tsx)
- Create `OrgAdminMenuAnalyticsSection` component:
  - 4 KPI summary cards:
    - **Food Sales**: `formatCurrency(totalPurchaseVolume)`, subtitle `${orders} orders` (no "Total amount").
    - **Items Sold**: `${productsSoldCount} Units`, subtitle `Units sold`.
    - **Dishes Ordered**: `${dishesOrderedCount} Ordered`, subtitle `Dish varieties`.
    - **Cancelled Orders**: `${cancelledOrdersCount} Cancels` (no voided amount subtitle).
  - Search bar for filtering item names.
  - Strictly 4-column clean table:
    1. `Dish Name`
    2. `Price`
    3. `Quantity Sold`
    4. `Total Revenue` (strictly no `(R)` in header)
  - Zero category column, zero status column, zero cancelled quantity column.
  - Responsive horizontal scroll wrapper with minimum width for mobile compatibility.
  - Clean empty state when no items were ordered in the date window.

#### [MODIFY] [OrgAdminAnalyticsView.tsx](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/analytics/OrgAdminAnalyticsView.tsx)
- Add 3rd tab button: `Menu Analytics` with `UtensilsCrossed` icon.
- When `activeTab === 'menu'`, render `<OrgAdminMenuAnalyticsSection />`.

#### [MODIFY] [SuperAdminDashboard.tsx](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/dashboard/SuperAdminDashboard.tsx)
- Fetch `apiService.analytics.getOverview()` in `fetchPlatformData`.
- Display a dedicated "Platform Food & Order Performance" section with 4 KPI cards: Platform Food Sales, Total Items Sold, Dishes Ordered (`${count} Ordered`), Cancelled Orders (`${count} Cancels`).

---

## Verification Plan

### Automated Tests
1. **Frontend Vitest Suite**:
   ```bash
   cd "D:\Money Card Project\Frontend Money Card"
   npm test -- --run
   ```
   Verify all 267+ tests pass.
2. **Frontend Type Check**:
   ```bash
   cd "D:\Money Card Project\Frontend Money Card"
   npx tsc --noEmit
   ```
   Verify 0 TypeScript errors.
3. **Backend Vitest Suite**:
   ```bash
   cd "D:\Money Card Project\Backend Money Card"
   npm test
   ```
   Verify all 100 backend tests pass.
4. **Flutter Mobile Suite**:
   ```bash
   cd "D:\Money Card Project\Flutter Money card"
   flutter test
   flutter analyze --no-pub
   ```
   Verify 0 issues and all tests passing.

### Manual Verification
1. **Reset to Today Verification**:
   - In Counter Dashboard, Org Admin Dashboard, Analytics Page, and Cards Page, click "Reset to Today".
   - Verify start and end dates immediately set to `2026-09-24` (and never `2026-09-23`).
2. **KPI Labels & Subtitles Verification**:
   - Verify Food Sales displays clean orders count without "Total amount".
   - Verify Items Sold displays small subtitle "Units sold".
   - Verify Dishes Ordered displays `${count} Ordered` with small subtitle "Dish varieties".
   - Verify Cancelled Orders displays `${count} Cancels` without voided amount subtitle.
3. **Menu Items Table Verification**:
   - Verify table has strictly 4 columns: `Dish Name`, `Price`, `Quantity Sold`, `Total Revenue`.
   - Verify `Total Revenue` header does not contain `(R)`.
