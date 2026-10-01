# Implementation Plan — Analytics View PDF Updates & Super Admin Metrics Font Alignment

Align the Analytics View PDF report labels with the updated system vocabulary (Recharges and Refunds) across Web and Mobile, and normalize the Super Admin dashboard metrics font size to match Org Admin metrics.

## Proposed Changes

### 1. Super Admin Dashboard Metrics Font Normalization
File: `Frontend Money Card/src/features/dashboard/SuperAdminDashboard.tsx`
- In `SuperAdminDashboard.tsx` (lines 245-268):
  - Change `value={`${activeOrgsCount} Cafeterias`}` to `value={activeOrgsCount}`
  - Change `value={`${activeCardholdersCount} Cardholders`}` to `value={activeCardholdersCount}`
  - Change `value={`${activeCountersCount} Counters`}` to `value={activeCountersCount}`
  - Change `value={`${activeStaffCount} Members`}` to `value={activeStaffCount}`
- Result: Numbers display directly as clean numbers (`2`, `2`, `2`, `4`), matching the exact font size, weight, and visual density of Org Admin cards (`Total sales`: `₹0`, `Wallet Recharges`: `₹0`, `Wallet In use`: `0`, `Active Staff Members`: `2`).

### 2. Analytics Page & View PDF Alignment (Web App)
File: `Frontend Money Card/src/features/analytics/analyticsPdfExport.ts`
- Line 168: Update KPI card label from `'Recharge'` to `'Recharges'`.
- Line 201: Update KPI card label from `'Money Refunded'` to `'Refunds'`.
- Line 306: Update section header from `'Payment & Refund Breakdown'` to `'Payment & Refunds Breakdown'`.
- Line 329: Update card label from `'Money Refunded'` to `'Refunds'`.

File: `Frontend Money Card/src/features/analytics/OrgAdminAnalyticsComponents.tsx`
- Line 104: Update card label from `'Recharge'` to `'Recharges'`.
- Line 179: Update card label from `'Money Refunded'` to `'Refunds'`.

### 3. Mobile POS Analytics PDF Parity (Flutter)
File: `Flutter Money card/lib/services/analytics_pdf_service.dart`
- Line 229: Update table row title from `'Money Added (Top-ups)'` to `'Recharges (Top-ups)'`.
- Line 236: Update table row title from `'Money Refunded (Wallets Returned)'` to `'Refunds (Wallets Returned)'`.

---

## Visual Design Sketch

![Analytics PDF & Super Admin Metrics Preview](C:\Users\damie\.gemini\antigravity-ide\brain\999581c9-5c30-4195-933d-3667425ed95a\analytics_pdf_and_superadmin_metrics_1790830233898.jpg)

---

## ASCII Wireframes

### Super Admin Dashboard Metrics (After Normalization)
```
+------------------+  +------------------+  +------------------+  +------------------+
| Cafeterias   [#] |  | Active Cardh. [@] |  | Active Count. [#] |  | Staff Members [@] |
|                  |  |                  |  |                  |  |                  |
| 2                |  | 2                |  | 2                |  | 4                |
+------------------+  +------------------+  +------------------+  +------------------+
```
Matches Org Admin visual density:
```
+------------------+  +------------------+  +------------------+  +------------------+
| Total sales  [$] |  | Wallet Recharges |  | Wallet In use    |  | Active Staff     |
|                  |  |                  |  |                  |  |                  |
| ₹0               |  | ₹0               |  | 0                |  | 2                |
+------------------+  +------------------+  +------------------+  +------------------+
```

### Analytics View PDF Report (After Updates)
```
+------------------------------------------------------------------------------------+
| MONEY CARD — ANALYTICS REPORT                                                      |
| Cafeteria Scope: All Counters  |  Date Range: This Month                           |
+------------------------------------------------------------------------------------+
| 1. Financial Overview                                                              |
| +--------------------------------------------------------------------------------+ |
| | TOTAL SALES                                                                    | |
| | ₹0                                                                             | |
| | Total Sales across UPI & Cash Deposits                                         | |
| +--------------------------------------------------------------------------------+ |
| +----------------------+  +----------------------+  +----------------------------+ |
| | Recharges            |  | UPI Recharge         |  | Cash Recharge              | |
| | ₹0                   |  | ₹0                   |  | ₹0                         | |
| +----------------------+  +----------------------+  +----------------------------+ |
| +----------------------+  +----------------------+  +----------------------------+ |
| | Wallet Activations   |  | Refunds              |  | Cancelled Top-ups          | |
| | 0 Wallets            |  | ₹0                   |  | ₹0                         | |
| +----------------------+  +----------------------+  +----------------------------+ |
+------------------------------------------------------------------------------------+
```

---

## Verification Plan

### Automated Tests
- Run `npx tsc --noEmit` in `Frontend Money Card` (verify 0 TypeScript errors).
- Run `npm test -- --run` in `Frontend Money Card` (verify all 284 vitest unit tests pass).
- Run `flutter analyze --no-pub` in `Flutter Money card` (verify 0 errors in Flutter code).

### Manual Verification
- Open Super Admin Dashboard: verify cards show clean digits `2`, `2`, `2`, `4` with identical typography to Org Admin.
- Open Analytics page and click View PDF: verify PDF preview document displays "Recharges" and "Refunds" cards.
