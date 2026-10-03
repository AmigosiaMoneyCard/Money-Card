# Implementation Plan — Card Analytics Blocked Balance Tile (Super Admin, Org Admin, Counter Admin)

## Visual Image Sketch

![Card Analytics Blocked Balance Overview](C:/Users/damie/.gemini/antigravity-ide/brain/999581c9-5c30-4195-933d-3667425ed95a/analytics_card_analytics_blocked_balance_1791003009874.jpg)

---

## Technical Context & Overview

In the Analytics dashboard (`/analytics`) across Super Admin, Org Admin, and Counter Admin roles, the **Card Analytics** tab renders a fleet summary (`OrgAdminCardTracker.tsx`) featuring 5 KPI tiles:
1. Active Cards (count)
2. Settled Cards (count)
3. **Blocked Balance** (locked balance amount e.g. `Rs 0.00` / `Rs 0`)
4. Zero Balance (count)
5. Inactive Cards (count)

Per the user request:
- Remove the **Blocked Cards** count tile / tab.
- Include a **Blocked Balance** box displaying the locked balance amount inside Card Analytics.
- Maintain full parity across Super Admin (`SuperAdminAnalyticsView.tsx`), Org Admin (`OrgAdminAnalyticsView.tsx`), Counter Admin (`isCounterStaff = true` mode in `OrgAdminAnalyticsView.tsx`), and the View PDF export (`analyticsPdfExport.ts`).

---

## Wireframe: Updated Card Analytics 5-Column KPI Row

```
========================================================================================================================
Card Analytics KPI Fleet Overview (Super Admin, Org Admin, Counter Admin)
========================================================================================================================
+-------------------+ +-------------------+ +-------------------+ +-------------------+ +-------------------+
| ACTIVE CARDS      | | SETTLED CARDS     | | BLOCKED BALANCE   | | ZERO BALANCE      | | INACTIVE CARDS    |
| [CreditCard Icon] | | [CheckCircle Icon]| | [Lock Icon]       | | [AlertCircle Icon]| | [Clock Icon]      |
|                   | |                   | |                   | |                   | |                   |
| 1,240             | | 850               | | Rs 0.00           | | 42                | | 15                |
+-------------------+ +-------------------+ +-------------------+ +-------------------+ +-------------------+
```

---

## Worktree Changes Summary

### 1. Type Definitions (`Frontend Money Card/src/types/analytics.ts`)
- Added `blockedBalance?: number;` to `CardFleetAnalytics` and `AnalyticsOverview`.

### 2. Mock Analytics Handler (`Frontend Money Card/src/services/mock/handlers/analytics.ts`)
- Computed `blockedBalance` by summing balances of active sessions belonging to blocked cards.
- Returned `blockedBalance` inside `cardFleetAnalytics` and top-level response.

### 3. Backend Analytics Controller (`Backend Money Card/src/controllers/analytics.controller.ts`)
- Calculated `blockedBalance` and included in response payload.

### 4. Card Tracker Component (`Frontend Money Card/src/features/analytics/OrgAdminCardTracker.tsx`)
- Replaced Blocked Cards count with Blocked Balance tile displaying formatted currency and lock icon.

### 5. Analytics Views
- Passed `blockedBalance` in `OrgAdminAnalyticsView.tsx` and `SuperAdminAnalyticsView.tsx`.
- Removed separate Blocked Cards tab and component.

### 6. PDF Export Parity (`Frontend Money Card/src/features/analytics/analyticsPdfExport.ts`)
- Replaced `Blocked Wallets` with `Blocked Balance` in `lifecycleKpis` array.

---

## Verification Plan

### Automated Local Verification
- Vitest in Frontend: `npm test -- --run`.
- TypeScript checks: `npx tsc --noEmit` in Frontend and Backend.
- Backend tests: `npm test`.
- Zero emojis across all files.
