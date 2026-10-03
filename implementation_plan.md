# Implementation Plan — Card Analytics Blocked Balance Tile (Super Admin, Org Admin, Counter Admin)

## Visual Image Sketch

![Card Analytics Blocked Balance Overview](C:/Users/damie/.gemini/antigravity-ide/brain/999581c9-5c30-4195-933d-3667425ed95a/analytics_card_analytics_blocked_balance_1791003009874.jpg)

---

## Technical Context & Overview

In the Analytics dashboard (`/analytics`) across Super Admin, Org Admin, and Counter Admin roles, the **Card Analytics** tab currently renders a fleet summary (`OrgAdminCardTracker.tsx`) featuring 5 KPI tiles:
1. Active Cards (count)
2. Settled Cards (count)
3. **Blocked Cards** (count: e.g. `0`)
4. Zero Balance (count)
5. Inactive Cards (count)

Per the user request:
- Remove the **Blocked Cards** count tile.
- Include a **Blocked Balance** box displaying the locked balance amount (e.g. `₹0` / `₹0.00`) inside Card Analytics.
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

## Proposed Worktree Changes

### 1. Type Definitions (`Frontend Money Card/src/types/analytics.ts`)
- Update `CardFleetAnalytics` interface:
  - Add `blockedBalance?: number;`
- Update `AnalyticsOverview` interface:
  - Add `blockedBalance?: number;`

### 2. Mock Analytics Handler (`Frontend Money Card/src/services/mock/handlers/analytics.ts`)
- Compute `blockedBalance`:
  - Sum the balances of active sessions belonging to cards with status `BLOCKED`.
- Return `blockedBalance` inside `cardFleetAnalytics` and at top level of the analytics payload.

### 3. Backend Analytics Controller (`Backend Money Card/src/controllers/analytics.controller.ts`)
- In `getOrgAnalytics`:
  - Calculate `blockedBalance`:
    `const blockedBalance = Number(activeSessionsList.filter((s) => s.card?.status === 'BLOCKED').reduce((acc, s) => acc + (s.balance || 0), 0).toFixed(2));`
  - Include `blockedBalance` in `cardFleetAnalytics` and top-level response payload.

### 4. Card Tracker Component (`Frontend Money Card/src/features/analytics/OrgAdminCardTracker.tsx`)
- Update `OrgAdminCardTrackerProps`:
  - Add `blockedBalance?: number;`
- Replace **Blocked Cards** tile with **Blocked Balance** tile:
  - Label: `Blocked Balance`
  - Value: `formatCurrency(blockedBalance ?? cardFleet?.blockedBalance ?? 0)`
  - Icon: `Lock` icon from `lucide-react` with subtle rose/slate background badge (`bg-rose-50 text-rose-600`).
  - Text: styled consistently with financial amounts (`font-mono text-2xl font-bold text-rose-600`).

### 5. Org Admin & Counter Admin Analytics View (`Frontend Money Card/src/features/analytics/OrgAdminAnalyticsView.tsx`)
- Pass `blockedBalance={analytics?.blockedBalance ?? analytics?.cardFleetAnalytics?.blockedBalance ?? 0}` into `<OrgAdminCardTracker />`.

### 6. Super Admin Analytics View (`Frontend Money Card/src/features/analytics/SuperAdminAnalyticsView.tsx`)
- Pass `blockedBalance={analytics?.blockedBalance ?? analytics?.cardFleetAnalytics?.blockedBalance ?? 0}` into `<OrgAdminCardTracker />`.

### 7. PDF Export Parity (`Frontend Money Card/src/features/analytics/analyticsPdfExport.ts`)
- In `buildOrgAnalyticsJsPdf`, update `lifecycleKpis` array:
  - Replace `{ label: 'Blocked Wallets', val: ... }` with `{ label: 'Blocked Balance', val: formatCurrency(fleet?.blockedBalance ?? analytics.blockedBalance ?? 0), sub: 'Locked in blocked cards' }`.
- Maintain identical labeling, currency format, and column width across exported report PDFs.

---

## Verification Plan

### Automated Local Verification
- Proactively run Vitest in Frontend: `npm test -- --run` (all 285 tests must pass).
- Proactively run TypeScript checks: `npx tsc --noEmit` in both Frontend and Backend (0 errors).
- Proactively run Backend tests: `npm test` (all 104 tests must pass).
- Confirm zero emoji presence across all touched files.
