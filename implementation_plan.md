# Implementation Plan: Match Blocked Wallets Page Exactly to Org Admin Standard and Scope Dashboard Cards

## Executive Summary
This updated plan ensures that the Blocked Wallets page in Wallets & Customer History (`/cards`) exactly matches the rich, comprehensive Organization Admin standard. It features top KPI summary metric cards (Total Blocked Cards and Locked Balance), full-detail table columns (Wallet ID, Customer, Locked Balance, Blocked Reason, Blocked By, Blocked Date, and Actions), and a secure Unblock confirmation modal. Simultaneously, the "Blocked Wallets 0 Security locked" stat card is removed from the Counter Dashboard overview grid (`/dashboard` when `isCounterAdmin === true`), while remaining active on the Organization Admin Dashboard (`!isCounterAdmin`).

![Counter Dashboard and Wallets & Customer History Scope](file:///C:/Users/damie/.gemini/antigravity-ide/brain/218ce084-c8ce-49ca-a93b-bc0ce2200b0c/counter_dashboard_scope_update_1791099287220.jpg)

## Requirements & Scope Clarification
- Requirement 1: In Counter Dashboard (`/dashboard` when `isCounterAdmin === true`), remove the "Blocked Wallets 0 Security locked" stat card from the Overview section. Counter Dashboard displays 5 operational stat cards: Total Sales, Money Added, Wallet In use, Remaining Balance, and Refunds.
- Requirement 2: In Organization Admin Dashboard (`/dashboard` when `!isCounterAdmin`), keep the "Blocked Wallets" stat card active with its live count and "Security locked" subtext.
- Requirement 3: On the Wallets & Customer History page (`/cards`), the Blocked Wallets view must be formatted exactly like the rich Org Admin standard:
  - 2 Top KPI Summary Cards:
    1. Total Blocked Cards (count of blocked cards with "Blocked" badge)
    2. Locked Balance (sum of balances preserved in blocked wallets)
  - Dedicated search input filtering by wallet ID, customer, phone, or block reason.
  - Complete 7-Column Data Table:
    1. Wallet ID (with red shield icon and counter/branch tag)
    2. Customer (Name and phone number, or Unassigned Card)
    3. Locked Balance (currency formatted)
    4. Blocked Reason (Blocked badge + reason message)
    5. Blocked By (Admin/Staff member who blocked the card)
    6. Blocked Date (formatted date)
    7. Actions (Customer History view and Unblock action)
  - Interactive Unblock Confirmation Modal with safety warning, locked balance review, and confirmation triggers.
- Requirement 4: Both Counter Staff (`CounterStaffCardsView.tsx`) and Organization Admin (`OrgAdminCardsView.tsx`) will have access to this standardized Blocked Wallets management experience.
- Requirement 5: In the individual card Wallet Analytics modal within Counter Wallets & Customer History (`selectedCardForAnalytics`), the redundant Blocked Wallets stat card remains excluded (5 metrics), while in Organization Admin's Wallet Analytics modal (`selectedBranchForAnalytics`), it is retained (6 metrics).

## ASCII Wireframes

### Standardized Blocked Wallets Page Layout (Exact Org Admin Standard)

```text
+-----------------------------------------------------------------------------------------------+
| Wallets & Customer History                                                        [ Refresh ] |
+-----------------------------------------------------------------------------------------------+
| [ Live Active Wallets (148) ]  [ Blocked Wallets (2) ]                                        |
+-----------------------------------------------------------------------------------------------+
|                                                                                               |
| +-----------------------------------------------+  +----------------------------------------+ |
| | Total Blocked Cards                           |  | Locked Balance                         | |
| | 2  [ Blocked ]                                |  | Rs 150.00                              | |
| | Cards reported lost, damaged, or suspended    |  | Safe and preserved in blocked wallets  | |
| +-----------------------------------------------+  +----------------------------------------+ |
|                                                                                               |
| [ Search by card ID, customer, phone, or reason...                                          ] |
|                                                                                               |
| +-------------------------------------------------------------------------------------------+ |
| | Wallet ID   Customer       Locked Bal  Blocked Reason        Blocked By  Blocked Date Actions| |
| | ----------------------------------------------------------------------------------------- | |
| | KD1DG3Z8J   Jane Doe       Rs 150.00   [Blocked] Lost card   Admin       Oct 04, 2026 [Hist] | |
| | (Counter 1) 9876543210                 Reported by customer                           [Unblk]| |
| |                                                                                           | |
| | MC004       Unassigned     Rs 0.00     [Blocked] Damaged     Staff Akhil Oct 03, 2026 [Hist] | |
| | (Counter 1) —                          Chip damaged                                   [Unblk]| |
| +-------------------------------------------------------------------------------------------+ |
+-----------------------------------------------------------------------------------------------+
```

### Unblock Confirmation Modal

```text
+-----------------------------------------------------------------------------------------------+
| Modal: Unblock Card                                                                       [X] |
+-----------------------------------------------------------------------------------------------+
| /!\ Are you sure you want to unblock this card?                                               |
|     Unblocking will restore the card to Active status and allow purchases and recharges.      |
|                                                                                               |
| Card / Wallet ID:  KD1DG3Z8J                                                                  |
| Locked Balance:    Rs 150.00                                                                  |
| Original Reason:   Lost card reported by customer                                             |
+-----------------------------------------------------------------------------------------------+
|                                                                    [ Cancel ] [ Confirm ]     |
+-----------------------------------------------------------------------------------------------+
```

### Counter Dashboard Overview Layout (isCounterAdmin Mode — 5 Cards)

```text
+-----------------------------------------------------------------------------------------------+
| Counter Dashboard                                                                             |
| [ View Wallets ]  [ Add Team Member ]  [ Add Menu Item ]  [ Analytics ]                       |
+-----------------------------------------------------------------------------------------------+
| Overview                                                                                      |
| +-------------------+  +-------------------+  +-------------------+                           |
| | Total Sales       |  | Money Added       |  | Wallet In use     |                           |
| | Rs 1,875          |  | Rs 2,150          |  | 148               |                           |
| | 38 orders         |  | 24 recharges      |  | Active wallets    |                           |
| +-------------------+  +-------------------+  +-------------------+                           |
|                                                                                               |
| +-------------------+  +-------------------+                                                  |
| | Remaining Balance |  | Refunds           |                                                  |
| | Rs 42,560         |  | Rs 112            |                                                  |
| | Money in wallets  |  | 8 refunds         |                                                  |
| +-------------------+  +-------------------+                                                  |
| (Blocked Wallets box is removed from Counter Dashboard)                                       |
+-----------------------------------------------------------------------------------------------+
```

## Technical Architecture & File Changes

### 1. `Frontend Money Card/src/features/dashboard/OrgAdminDashboard.tsx`
- In `OrgAdminDashboard.tsx` around line 590:
  - Wrap the "Blocked Wallets" `StatCard` in a `{!isCounterAdmin && (...)}` condition.
  - When `isCounterAdmin` is true (Counter Dashboard), the Blocked Wallets card is hidden.
  - When `!isCounterAdmin` is true (Organization Admin Dashboard), the Blocked Wallets card is rendered with `{blockedWalletsCount}` and "Security locked" subtext.

### 2. `Frontend Money Card/src/features/cards/CounterStaffCardsView.tsx`
- Upgrade the `walletTab === 'BLOCKED'` view to the exact Org Admin standard:
  - Add the 2 KPI summary cards: `Total Blocked Cards` and `Locked Balance`.
  - Add full 7 table columns: `Wallet ID`, `Customer`, `Locked Balance`, `Blocked Reason`, `Blocked By`, `Blocked Date`, and `Actions`.
  - Add the Unblock Confirmation Modal with safety alert, card ID, locked balance, and reason summary.
  - Retain the Customer History quick action button on each blocked row.

### 3. `Frontend Money Card/src/features/cards/OrgAdminCardsView.tsx`
- Add segmented tab navigation (`Live Counters` / `Blocked Wallets`) so Organization Admin has the exact same standardized Blocked Wallets table with cross-counter filtering, KPI cards, and unblock actions.

### 4. `Frontend Money Card/src/__tests__/staffRoleAndBlockedWallets.test.ts`
- Add unit test verification ensuring:
  - Counter Dashboard layout omits the Blocked Wallets box when `isCounterAdmin === true`.
  - Organization Admin Dashboard layout retains the Blocked Wallets box when `isCounterAdmin === false`.
  - Blocked Wallets view calculates Total Blocked Cards and Locked Balance accurately.
  - Table columns and fields (reason, blocked by, date, locked balance) render properly.

## Verification & Test Plan (Post-Approval)
1. Apply the conditional hide for Blocked Wallets on Counter Dashboard in `OrgAdminDashboard.tsx`.
2. Implement the standardized Blocked Wallets layout with KPI cards, full columns, and unblock confirmation in `CounterStaffCardsView.tsx` and `OrgAdminCardsView.tsx`.
3. Run `npx tsc --noEmit` in `Frontend Money Card` to ensure 0 TypeScript errors.
4. Run `npm test -- --run` in `Frontend Money Card` to ensure all 291+ tests pass.
5. Run `npm test` in `Backend Money Card` to ensure all 121 backend tests pass.
6. Verify responsive mobile layout compatibility for small viewports.
7. Create a clean local git commit on the staging branch once verified.
