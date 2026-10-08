# Implementation Plan — Remove Hide/Show Toggle in Super Admin Overview

Remove the Hide/Show masking toggle buttons and `<EyeOff>` placeholder state from the Wallet Analytics cards (Money Added, Cancelled, Refunds) on the Super Admin Dashboard Overview, directly showing the unmasked financial amounts. Strictly isolate this change to the Super Admin dashboard, leaving all other views untouched.

![Super Admin Wallet Analytics Overview Without Hide/Show Toggles](file:///C:/Users/damie/.gemini/antigravity-ide/brain/c99edd16-0faf-4782-a7e1-399d96eb8a4b/superadmin_wallet_analytics_unmasked_sketch_1791478883070.jpg)

## ASCII Wireframes

### Super Admin Dashboard — Wallet Analytics Overview (Unmasked Direct View)
```
+-------------------------------------------------------------------------------------------------------------------+
| Wallet Analytics                                                                                                  |
| Net financial transaction breakdown across the platform                                                          |
+-------------------------------------------------------------------------------------------------------------------+
|  TOTAL SALES               |  MONEY ADDED              |  CANCELLED                |  REFUNDS                     |
|  [Cart Icon]               |  [Trend Icon]             |  [Rotate Icon]            |  [Refresh Icon]              |
|                            |                           |                           |                              |
|  Rs. 120.00                |  Rs. 500.00               |  Rs. 0.00                 |  Rs. 0.00                    |
|  1 orders                  |  2 recharges              |  0 cancelled              |  0 refunds                   |
+----------------------------+---------------------------+---------------------------+------------------------------+
(All amounts directly visible without any Hide/Show toggle button or eye icons)
```

## Proposed Changes

1. [SuperAdminDashboard.tsx](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/dashboard/SuperAdminDashboard.tsx):
   - Remove unused state variables: `showMoneyAdded`, `showRefunds`, `showCancelled`.
   - Remove unused `Eye` and `EyeOff` imports.
   - In `Money Added` card (lines 517–546):
     - Remove the `Show/Hide` button with `Eye/EyeOff` toggle.
     - Directly render formatted currency: `formatCurrency(analytics?.moneyAdded ?? analytics?.totalRechargeVolume ?? analytics?.rechargeVolume ?? 0)`.
   - In `Cancelled` card (lines 548–577):
     - Remove the `Show/Hide` button with `Eye/EyeOff` toggle.
     - Directly render formatted currency: `formatCurrency(analytics?.cancelledTopUps ?? 0)`.
   - In `Refunds` card (lines 579–608):
     - Remove the `Show/Hide` button with `Eye/EyeOff` toggle.
     - Directly render formatted currency: `formatCurrency(analytics?.totalRefundVolume ?? analytics?.moneyRefunded ?? 0)`.
   - Maintain complete isolation: No changes to Org Admin or Counter Admin views.

## Verification Plan

- Run TypeScript check: `npx tsc --noEmit` in `Frontend Money Card` (0 errors)
- Run Vitest tests: `npm test -- --run` in `Frontend Money Card` (322 tests passing)
- Verify visually that all 4 cards display their values directly without any button or masking
