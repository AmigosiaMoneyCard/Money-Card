# Implementation Plan: Kitchen KDS Chime & Prep Timer, Support Impersonation, and Customer PDF Receipts

![Kitchen KDS and Support Impersonation UI](C:\Users\damie\.gemini\antigravity-ide\brain\218ce084-c8ce-49ca-a93b-bc0ce2200b0c\kitchen_kds_and_support_impersonation_ui_1791139001701.jpg)

## Requirements Overview

1. Order Audio Chime & Visual Pulse (Kitchen KDS):
- When a new paid order arrives at the kitchen display screen from the counter POS, display a prominent pulsating visual alert banner ("New Order Arrived") and play a pleasant, non-intrusive audio chime.
- Include a sound toggle (Mute / Unmute) so kitchen staff can control audio chimes according to kitchen noise preferences.

2. Prep Timer & Order Ready Toggle:
- Display real-time prep elapsed timers (e.g., "04:12 min", shifting from emerald to amber after 10 mins) on kitchen order tickets based on order timestamp.
- Add a fast one-tap "Mark Ready for Pickup" button transitioning ticket status to `READY`, moving it to the pickup queue and notifying the customer pickup screen.

3. Support Impersonation ("View as Org Admin"):
- On the Super Admin dashboard and Organizations list, provide a "View as Org Admin" button for each cafeteria organization.
- Launch a read-only Org Admin view for that specific organization with a sticky amber top banner: "Viewing as Org Admin: [Org Name] (Read-Only Mode) — Exit Impersonation".
- Clicking "Exit Impersonation" immediately returns Super Admin to the platform management view.

4. Customer Portal Download PDF Receipt:
- In the Customer Portal (scanned wallet QR interface), provide a one-click "Download PDF Receipt" action.
- Generates a branded, downloadable PDF receipt with organization name, counter branch, wallet ID, session timestamp, itemized food items with quantities and prices, and settlement balance.

---

## ASCII Wireframes

```
Kitchen KDS Screen (Audio Chime, Visual Pulse & Prep Timer):
+--------------------------------------------------------------------------+
| Kitchen Orders — Counter 1           [ Sound: ON ] [ Refresh ] [ Filter ]|
+--------------------------------------------------------------------------+
| >>> NEW ORDER ARRIVED: Order #314 (Just now) <<< [Pulsating Banner]      |
+------------------------------------+-------------------------------------+
| PENDING / PREPARING (2)            | READY FOR PICKUP (1)                |
| +--------------------------------+ | +---------------------------------+ |
| | Order #314          04:12 min  | | | Order #313             READY    | |
| | Rahul S.            Token #14  | | | Priya M.               Token #12| |
| | 2x Veg Burger         INR 140  | | | 1x Cold Coffee          INR 80  | |
| | 1x Cold Coffee         INR 80  | | |                                 | |
| |                                | | | [ Customer Picked Up ]          | |
| | [ Mark Ready for Pickup ]      | | +---------------------------------+ |
| +--------------------------------+ |                                     |
+------------------------------------+-------------------------------------+

Super Admin Support Impersonation (Read-Only Mode):
+--------------------------------------------------------------------------+
| Viewing as Org Admin: Fresh Bites Cafeteria (Read-Only)  [Exit Support]  |
+--------------------------------------------------------------------------+
| Cafeteria Dashboard | Counters | Menu Catalog | Wallets | Analytics      |
| [ Read-Only Mode: All write operations and deletions are locked ]        |
+--------------------------------------------------------------------------+

Customer Wallet Portal (Download PDF Receipt):
+--------------------------------------------------------------------------+
| Fresh Bites Cafeteria — Counter 1                                        |
| Wallet: KD1UEJQV0                                                        |
| Balance: INR 850.00                                                      |
| +----------------------------------------------------------------------+ |
| | [ Download PDF Receipt ]                                             | |
| +----------------------------------------------------------------------+ |
| Activity (2 items)                                                       |
| - 1x Veg Burger, 1x Cold Coffee      -INR 150    4 Oct 2026, 06:30 PM    |
| - Wallet Recharge (Cash)             +INR 1,000  4 Oct 2026, 05:15 PM    |
+--------------------------------------------------------------------------+
```

---

## Technical Design & Component Breakdown

### 1. Kitchen KDS Audio Chime & Visual Pulse
- Files:
  - Mobile: `Flutter Money card/lib/features/kitchen/kitchen_orders_screen.dart`
  - Mobile Provider: `Flutter Money card/lib/providers/kitchen_orders_provider.dart`
  - Web KDS / Staff View (if viewing live tracker): `Frontend Money Card/src/features/portal/` or order tracker.
- Logic:
  - Track previous order IDs set (`previousOrderIds`).
  - When refreshed or polled, detect new IDs (`newOrderIds = currentIds.difference(previousOrderIds)`).
  - If new IDs detected and not initial load:
    - Set `hasNewOrderPulse = true` for 6 seconds.
    - If `soundEnabled == true`, play synthesized web audio chime (via Web Audio API or Flutter audio feedback).
    - Sound toggle switch stored in local preferences.

### 2. Prep Timer & Order Ready Toggle
- Files:
  - Mobile KDS Screen: `Flutter Money card/lib/features/kitchen/kitchen_orders_screen.dart`
  - Order Tracker: `Flutter Money card/lib/features/orders/live_order_tracker_screen.dart`
  - Model: `Flutter Money card/lib/models/kitchen_order.dart`
  - Backend Controller: `Backend Money Card/src/controllers/sessions.controller.ts` (accepts status update to `READY`)
- Logic:
  - Add periodic `Timer.periodic(Duration(seconds: 30))` updating ticket elapsed times (`formatPrepTime(orderedAt)`).
  - Add `Mark Ready for Pickup` button on active tickets.
  - Calling `updateOrderStatus(orderId, 'READY')` moves ticket from In Progress to Ready for Pickup column.

### 3. Super Admin Support Impersonation ("View as Org Admin")
- Files:
  - Super Admin Dashboard: `Frontend Money Card/src/features/dashboard/SuperAdminDashboard.tsx`
  - Organizations Page: `Frontend Money Card/src/features/organizations/OrganizationsPage.tsx`
  - Auth Context & State: `Frontend Money Card/src/app/providers/AuthProvider.tsx`
  - Layout Banner: `Frontend Money Card/src/app/layouts/DashboardLayout.tsx`
- Logic:
  - In `AuthProvider.tsx`: add `impersonatedOrg: { id: string; name: string } | null`, `startImpersonation(org)`, `exitImpersonation()`.
  - When impersonating:
    - User's effective organization context switches to `impersonatedOrg.id`.
    - Dashboard and pages load scoped data for that organization.
    - `isReadOnlyImpersonation = true` flags write buttons (Add Staff, Delete Counter, Change Subscription) as disabled or read-only view.
    - Top sticky bar rendered in `DashboardLayout.tsx`: `Viewing as Org Admin: ${impersonatedOrg.name} (Read-Only Mode)` with an `Exit Impersonation` button.

### 4. Customer Portal Download PDF Receipt
- Files:
  - Customer Session Screen: `Frontend Money Card/src/features/portal/PortalSessionPage.tsx`
  - Customer Transactions Screen: `Frontend Money Card/src/features/portal/PortalTransactionsPage.tsx`
  - Receipt PDF Utility: `Frontend Money Card/src/features/portal/portalReceiptPdfExport.ts`
- Logic:
  - Build `generateCustomerSessionReceiptPdf(sessionData, transactions, orgName, branchName)` using `jsPDF`.
  - Clean receipt format:
    - Cafeteria title and counter name.
    - Wallet number, customer name, date and time.
    - Summary box: Issued Balance, Total Spent, Final Balance.
    - Table of itemized dishes purchased with unit price and quantities.
    - Verification stamp.
  - One-click button in `PortalSessionPage.tsx` and `PortalTransactionsPage.tsx`: `Download PDF Receipt`.

---

## Verification Results

1. Frontend Money Card:
- vitest: 39 test files passed, 298 tests passed.
- tsc: 0 type errors.

2. Flutter Money card:
- flutter analyze --no-pub: No issues found.
- flutter test: All 186 tests passed.

3. Backend Money Card:
- vitest: 13 test files passed, 124 tests passed.

