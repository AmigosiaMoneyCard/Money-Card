# Implementation Plan: Header Cleanup, Dashboard Metrics Refinement & Counter Staff Visibility

Clean up the top-right header by removing the cafeteria badge across Super Admin, Org Admin, and Counter Admin; replace duplicate Active Wallets box in Super Admin with Cancelled Top-ups; add Cancelled Top-ups card in Counter Dashboard to fill the grid space; and fix manager staff visibility in Counter Admin.

![Dashboard Layout Reference](C:\Users\damie\.gemini\antigravity-ide\brain\5d95263b-cd5f-4577-8545-14c5773f5f9e\superadmin_minimal_overview_customer_portal_1791178796374.jpg)

## User Review Required

Key changes to confirm:
- Top-Right Header Badge: Remove the "Cafeteria: Platform Super Admin" (and cafeteria name badge) completely from the top-right navigation bar in `DashboardLayout.tsx` for Super Admin, Org Admin, and Counter Admin.
- Super Admin Dashboard Box Replacement: Replace the duplicate "Active Wallets (1 In use)" card in Super Admin Wallet Analytics with "Cancelled Top-ups" showing total cancelled recharge amount and count.
- Counter Dashboard Cancelled Top-ups: Ensure Counter Dashboard displays "Cancelled Top-ups" (showing cancelled recharge amount such as ₹300) in the 6-card grid to occupy the previously blank slot.
- Counter Admin Staff Visibility: Fix `getStaffList` in `staff.controller.ts` by removing the `id: { not: req.user.id }` filter so that the Counter Manager sees both their own manager account and kitchen staff in Counter Admin -> Staff.

## Proposed Changes

Frontend Money Card

`src/app/layouts/DashboardLayout.tsx`:
- Remove the top-right organization context badge (`div` containing `Shield`, `Cafeteria:`, and `orgContextLabel`).
- Retain Back button, breadcrumbs, spacer, and User Profile menu for a clean top-right navigation bar.

`src/features/dashboard/SuperAdminDashboard.tsx`:
- In the Wallet Analytics section (Row 2), update card 3 to display "Cancelled Top-ups" instead of the duplicate Active Wallets or Net Inflow.
- Value: `formatCurrency(analytics?.cancelledTopUps ?? 0)`.
- Subtext: `${analytics?.cancelledTopUpsCount ?? 0} cancelled`.
- Icon: `RotateCcw`.

`src/features/dashboard/OrgAdminDashboard.tsx`:
- In the Counter Dashboard stat card grid (`isCounterAdmin`), ensure the card is labeled "Cancelled Top-ups".
- Value: `formatCurrency(analytics?.cancelledTopUps ?? 0)`.
- Subtext: `${analytics?.cancelledTopUpsCount ?? 0} cancelled`.
- Icon: `RotateCcw`.
- Fills the 6th slot in the 2x3 grid so there is no blank space.

Backend Money Card

`src/controllers/staff.controller.ts`:
- In `getStaffList`:
  - Remove `id: { not: req.user.id }` condition which previously excluded the authenticated manager from their own staff list.
  - Remove `NOT: { name: { in: orgBranchNames } }` to avoid filtering out any real staff accounts whose names might coincide with branch names, relying on `isCounterAccount: false` which is already strictly enforced on real staff vs machine counter accounts.

## ASCII Layout Wireframes

1. Top-Right Navigation Bar (Clean & Streamlined)

```
+---------------------------------------------------------------------------------------------------------+
| [<- Back]  Dashboard / Overview                                                     [(A) User Profile v]|
+---------------------------------------------------------------------------------------------------------+
```

2. Super Admin Wallet Analytics (4 Balanced Boxes)

```
+---------------------------------------------------------------------------------------------------------+
| Wallet Analytics                                                                                        |
+------------------------------------+------------------------------------+-------------------------------+
| Total Sales                        | Recharge Amount                    | Cancelled Top-ups             |
| Rs 18,450.00                       | Rs 24,800.00                       | Rs 300.00                     |
| 96 orders                          | 52 recharges                       | 1 cancelled                   |
+------------------------------------+------------------------------------+-------------------------------+
| Refunds                            |                                                                    |
| Rs 1,200.00                        |                                                                    |
| 3 refunds                          |                                                                    |
+------------------------------------+------------------------------------+-------------------------------+
```

3. Counter Dashboard Overview Grid (6 Cards, Zero Blank Spaces)

```
+---------------------------------------------------------------------------------------------------------+
| Overview                                                                                                |
| Time Window: [ 05-10-2026 to 05-10-2026 ] [ Reset to Today ]                         [ Refresh Data ]   |
+------------------------------------+------------------------------------+-------------------------------+
| Total sales                        | Recharge Amount                    | Wallet In use                 |
| Rs 18,450.00                       | Rs 24,800.00                       | 1                             |
| 96 orders                          | 52 recharges                       | Active wallets                |
+------------------------------------+------------------------------------+-------------------------------+
| Remaining Balance                  | Cancelled Top-ups                  | Refunds                       |
| Rs 450.00                          | Rs 300.00                          | Rs 0.00                       |
| Money in wallets                   | 1 cancelled                        | 0 refunds                     |
+------------------------------------+------------------------------------+-------------------------------+
```

4. Counter Admin Staff List (Both Manager & Kitchen Staff Visible)

```
+---------------------------------------------------------------------------------------------------------+
| Staff Members                                                        [+ Add Team Member]                |
| Search: [                     ]   Role: [ All Roles v ]   Status: [ All Status v ]                      |
+---------------------------------------------------------------------------------------------------------+
| Name                Role               Phone         Assigned Counter     Status         Actions        |
+---------------------------------------------------------------------------------------------------------+
| Alex Morgan         Counter Manager    9876543210    Counter 1            ACTIVE         [Details] [Edit]|
| Chef Rahul          Kitchen Staff      9876543211    Counter 1            ACTIVE         [Details] [Edit]|
+---------------------------------------------------------------------------------------------------------+
```

## Verification Plan

Automated Test Suites
- Frontend Tests: `npm test -- --run` in `Frontend Money Card` (verify all test files pass).
- Frontend Type Check: `npx tsc --noEmit` in `Frontend Money Card` (0 errors).
- Backend Tests: `npm test` in `Backend Money Card` (verify all 13 test files and 124 tests pass).

Manual & Visual Verification
- Header Inspection: Log in as Super Admin, Org Admin, and Counter Admin; confirm "Cafeteria:" badge is removed from top right.
- Super Admin Dashboard: Verify "Cancelled Top-ups" displays in Wallet Analytics row replacing duplicate Active Wallets.
- Counter Dashboard: Verify 6 stat cards render in 2x3 grid, showing Cancelled Top-ups (₹300.00) with no blank slot.
- Counter Admin Staff: Log in as Counter Manager, open `/staff`, and verify both the manager staff and kitchen staff accounts appear in the table.
