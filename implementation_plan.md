# Implementation Plan — Staff Roles, Wallet Analytics, and Blocked Wallets

Manage staff permissions between Manager and Kitchen Staff, restrict Daily Activity Summary to Counter Managers, clean up Counter Wallet Analytics modal, fix Money Added metric across dashboards, and design Blocked Cards view in Wallets & Customer History.

![Staff Roles and Wallet Analytics Architecture](C:/Users/damie/.gemini/antigravity-ide/brain/999581c9-5c30-4195-933d-3667425ed95a/staff_roles_and_wallet_analytics_1791064663842.jpg)

---

## 1. Requirements Breakdown

1. **Staff Settings Permission & Role Switcher (`StaffPage.tsx`)**:
   - In Staff Settings / Edit Staff modal (e.g. for Akhil or any staff member), provide a segmented role selector between **Counter Manager** (Full POS Billing & Management) and **Kitchen Staff** (KDS & Menu Control).
   - Switching roles updates `formPermissions` (`MANAGER_PERMISSIONS` vs `KITCHEN_PERMISSIONS`) and saves `staffType` + `permissions` to the backend.

2. **Daily Activity Summary Role Restriction (`StaffPage.tsx`)**:
   - In the staff management table and counter staff card view, hide the "Summary" action button for Kitchen Staff.
   - Kitchen staff handle food preparation and have no cash drawer, recharge, or POS customer billing activity. Only Counter Managers have Daily Activity Summaries.

3. **Counter Dashboard Wallet Analytics Cleanup (`CounterStaffCardsView.tsx`)**:
   - In Counter Dashboard -> Wallets & Customer History -> Wallet Analytics modal:
     - Change title to `Wallet Analytics` (remove dynamic single wallet suffix `— Wallet KD1DG3Z8J (iti block)`).
     - Remove the `Blocked Wallets 0 Security locked` box from the modal, keeping the financial metrics clean.

4. **Money Added Box Operational Across Dashboards**:
   - In SuperAdmin, OrgAdmin, and Counter Dashboards, ensure the `Money Added` box is functional and displays live recharge volume and recharge count.
   - Fix backend `analytics.controller.ts` where object key spread overwrote `OR` clauses, and add missing `bm.moneyAdded` increment in the transaction aggregation loop.
   - Ensure frontend stat cards read `moneyAdded ?? totalRechargeVolume ?? rechargeVolume` and `${rechargeCount ?? totalRechargeCount} recharges`.

5. **Blocked Cards Integration in Wallets & Customer History**:
   - Design and apply a clean segmented filter tab in `CounterStaffCardsView.tsx` (`[ Live Active Wallets (N) ]` | `[ Blocked Wallets (N) ]`).
   - When "Blocked Wallets" is selected, display locked cards with coupon/card number, customer name & phone, locked balance, block reason, and direct "Unblock Wallet" action.

---

## 2. ASCII Wireframes

### Staff Settings: Role Switcher (Edit Modal)

```
+------------------------------------------------------------------------+
| Staff Settings: Akhil                                              [X] |
+------------------------------------------------------------------------+
| [ Overview ]  [ Counters (1) ]                                         |
|                                                                        |
| Staff Role & Mobile App Mode                                           |
| +----------------------------------+ +-------------------------------+ |
| | (*) Counter Manager              | | ( ) Kitchen Staff             | |
| | Full POS billing, card top-up,   | | KDS interface, orders queue,  | |
| | returns, and queue tracking.     | | and menu view / edit.         | |
| | [ Full POS Access ]              | | [ KDS & Menu Control ]        | |
| +----------------------------------+ +-------------------------------+ |
|                                                                        |
| Full Name                     Phone Number                             |
| [ Akhil                     ] [ 9876543210                  ]          |
|                                                                        |
| Account Access Status: [ Active  (o) ]                                 |
|                                                                        |
| Current Password: [ •••••••• ] (eye)   [ Copy ] [ WhatsApp ]           |
|                                                                        |
| [ Delete Staff ]                     [ Close ] [ Save Staff Info ]     |
+------------------------------------------------------------------------+
```

### Staff Management Table: Role-Guarded Actions

```
+------------------------------------------------------------------------------------------------+
| Staff Management                                                             [ + Add Staff ]   |
+------------------------------------------------------------------------------------------------+
| Name            Role              Counter         Status     Actions                           |
|------------------------------------------------------------------------------------------------|
| Akhil           Counter Manager   Main Cafeteria  Active     [ View Details ] [ Edit ] [Summary|
| Liam Chen       Kitchen Staff     Kitchen Counter Active     [ View Details ] [ Edit ]         |
+------------------------------------------------------------------------------------------------+
                                                               (Summary button hidden for Kitchen)
```

### Counter Dashboard: Clean Wallet Analytics Modal

```
+------------------------------------------------------------------------+
| Wallet Analytics                                                   [X] |
+------------------------------------------------------------------------+
| Date Range: From [ 2026-10-04 ] to [ 2026-10-04 ]   [ Reset to Today ] |
|                                                                        |
| +------------------+ +------------------+ +------------------+         |
| | Wallets in Use   | | Money Added      | | Food Sales       |         |
| | 3,874            | | ₹12,450          | | ₹19,830          |         |
| | Active wallets   | | 18 recharges     | | 254 orders       |         |
| +------------------+ +------------------+ +------------------+         |
|                                                                        |
| +------------------+ +------------------+                              |
| | Remaining Bal.   | | Refunds          |                              |
| | ₹7,620           | | ₹1,940           |                              |
| | Money in wallets | | 11 refunds       |                              |
| +------------------+ +------------------+                              |
| (Blocked Wallets box removed from modal)                               |
|                                                                        |
|                                                              [ Close ] |
+------------------------------------------------------------------------+
```

### Wallets & Customer History: Segmented Blocked Cards View

```
+------------------------------------------------------------------------------------------------+
| Wallets & Customer History                                                           [Refresh] |
+------------------------------------------------------------------------------------------------+
| [ Live Active Wallets (12) ]  [ Blocked Wallets (3) ]                                          |
|                                                                                                |
| [ Search by wallet ID or customer...                                         ]                 |
|                                                                                                |
| Card ID      Customer Name      Phone        Locked Balance   Reason            Actions        |
|------------------------------------------------------------------------------------------------|
| KD1DG3Z8J    Rohit Singh        9876543210   ₹570.00          Lost card         [ Unblock ]    |
| MC-78921     Anita Roy          9812345678   ₹320.00          Damaged chip      [ Unblock ]    |
| QR-44102     Vikram Patel       9898989898   ₹1,050.00        Security review   [ Unblock ]    |
+------------------------------------------------------------------------------------------------+
```

---

## 3. Step-by-Step Implementation

### Step 1: Backend Fixes in `analytics.controller.ts`
- Fix Prisma `txWhere` object spread collision by using `{ AND: andClauses }` so `effectiveBranchId` and `orgId` clauses do not overwrite each other.
- Add `bm.moneyAdded += tx.amount` in the transaction aggregation loop so counter-specific performance records retain accurate `moneyAdded`.
- Ensure date parsing handles local day boundaries reliably without dropping records.

### Step 2: Staff Settings Role Switcher & Audit Guard in `StaffPage.tsx`
- Add role toggle cards (`Counter Manager` vs `Kitchen Staff`) in `showStaffModal` Overview tab.
- Selecting a role automatically syncs `formPermissions` (`MANAGER_PERMISSIONS` vs `KITCHEN_PERMISSIONS`).
- Update `handleSaveProfile` to send `permissions: formPermissions` and `staffType: formRoleType` via `apiService.staff.updateStaff`.
- In the staff table (`counterStaffColumns`) and mobile counter staff cards, wrap the `Summary` button in `{getStaffRoleLabel(staff) === 'Counter Manager' && ...}`.

### Step 3: Counter Dashboard Wallet Analytics Cleanup in `CounterStaffCardsView.tsx`
- Set modal title to clean `Wallet Analytics`.
- Remove the `Blocked Wallets` card from the modal metrics layout.
- Organize Row 2 cleanly with `Refunds`.

### Step 4: Fix Money Added Box Across Dashboards
- In `CounterStaffCardsView.tsx`, ensure `moneyAdded` and `rechargeOrders` use correct fallbacks.
- In `OrgAdminDashboard.tsx`, change `label="Wallet Recharges"` to `label="Money Added"` and verify fallback to `analytics?.moneyAdded ?? analytics?.totalRechargeVolume`.
- In `SuperAdminDashboard.tsx`, load analytics overview and display live `Money Added` and recharge count.

### Step 5: Implement Blocked Cards Tab in `CounterStaffCardsView.tsx`
- Add state `activeWalletTab: 'active' | 'blocked'`.
- Compute `blockedCards = allCards.filter(c => c.status === 'BLOCKED')`.
- Render a dedicated blocked cards table showing Wallet ID, Customer, Phone, Locked Balance, Block Reason, and Unblock action button.
- Integrate unblock handler calling `apiService.cards.unblockCard(card.id)` with refresh.

---

## 4. Verification & Testing

- Proactively execute `npx tsc --noEmit` and `npm test -- --run` in `Frontend Money Card`.
- Proactively execute `npm test` in `Backend Money Card`.
- Verify 0 TypeScript errors and 100% test pass rate across all suites.
- Maintain strict zero emojis policy and no markdown subheadings in responses.
