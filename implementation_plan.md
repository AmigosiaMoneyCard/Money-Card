# Implementation Plan: Terminology Update — Replace 'Card' and 'Coupon' with 'Wallet'

Update all user-facing occurrences, labels, table headers, placeholders, action buttons, dialogs, receipts, and PDF reports from "Card" and "Coupon" to "Wallet" across the Web Admin Dashboard and Mobile POS App.

## Visual Design Sketch

![Wallet Terminology Redesign Sketch](C:\Users\damie\.gemini\antigravity-ide\brain\9c70217b-9240-4d11-907e-eaaf4a37b746\wallet_terminology_redesign_sketch_1790245268319.jpg)

## User Review Required

- Scope of Changes:
  - All user-facing UI labels, navigation menus, headers, buttons, placeholders, dialogs, badges, and receipts will use **Wallet** (or **Wallets**) instead of **Card** or **Coupon**.
  - Database schema, table names (`Card`, `CardSession`), and API endpoints (`/api/cards`, etc.) remain intact internally to ensure zero breaking changes to existing data and APIs.
- Terminology Mapping:
  - "Cards & History" -> "Wallets & History"
  - "Card Management" / "Counter Cards" -> "Wallet Management" / "Counter Wallets"
  - "Coupon ID" / "Coupon / Card ID" / "Card #" -> "Wallet ID" / "Wallet #"
  - "Card Balance" -> "Wallet Balance"
  - "Issue Card" -> "Issue Wallet"
  - "Return Card" -> "Return Wallet"
  - "Block Card" / "Unblock Card" -> "Block Wallet" / "Unblock Wallet"
  - "Active Cards" / "Total Cards" -> "Active Wallets" / "Total Wallets"
  - "Cards Activated" / "Cards Settled" -> "Wallets Activated" / "Wallets Settled"
  - "Card Analytics" -> "Wallet Analytics"
  - "Enter Coupon ID Manually" -> "Enter Wallet ID Manually"
  - Receipts "Card:" metadata -> "Wallet:"

## Proposed Changes

### Frontend Web Admin Dashboard (`Frontend Money Card`)

#### [MODIFY] [navigation.ts](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/config/navigation.ts)
- Update navigation item label:
  ```ts
  {
    id: 'cards',
    label: 'Wallets & History',
    path: '/cards',
    ...
  }
  ```

#### [MODIFY] [OrgAdminCardsView.tsx](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/cards/OrgAdminCardsView.tsx)
- Change header: "Wallet Management".
- Change table column: "Coupon ID" -> "Wallet ID".
- Change search placeholder: "Search by customer, phone, or wallet ID...".
- Change modal titles:
  - "Session Details — Wallet ${id}"
  - "Wallet Details — Wallet ${id}"
  - "Wallet Analytics"

#### [MODIFY] [CounterStaffCardsView.tsx](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/cards/CounterStaffCardsView.tsx)
- Change header: "Counter Wallets".
- Change table column: "Coupon / Card ID" -> "Wallet ID".
- Change search placeholder: "Search by wallet ID or customer...".
- Change modal titles:
  - "Wallet Details — Wallet ${id}"
  - "Wallet Analytics — Wallet ${id}"

#### [MODIFY] [SessionsPage.tsx](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/sessions/SessionsPage.tsx)
- Change table column: "Coupon ID" -> "Wallet ID".
- Change placeholder: "Search by customer, phone, or wallet ID...".

#### [MODIFY] [OrgAdminDashboard.tsx](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/dashboard/OrgAdminDashboard.tsx)
- Quick Action: "View Cards" -> "View Wallets".
- Checklist: "Wallets auto-register immediately when scanned by staff."
- Metric cards: "Active Wallets Issued", "Wallets Issued in Period", "Active Wallets".

#### [MODIFY] [StaffPage.tsx](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/staff/StaffPage.tsx)
- Audit & Performance: "Wallets Activated", "Wallets Settled".
- Transaction filter placeholder: "Filter by wallet ID, customer...".
- Table column: "Wallet ID".

#### [MODIFY] [PermissionMatrix.tsx](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/staff/PermissionMatrix.tsx)
- Permission descriptions:
  - "Issue & Activate New Wallets"
  - "Return / Settle Wallets & Refunds"
  - "Block / Unblock Compromised Wallets"

#### [MODIFY] [OrgAdminAnalyticsComponents.tsx](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/analytics/OrgAdminAnalyticsComponents.tsx)
- "Wallet Lifecycle & Activity".
- "Active Wallet Recharges", "Closed Wallets", "Active Wallets (Zero Balance)", "Re-Recharged Wallets".

#### [MODIFY] [RechargesTableView.tsx](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/analytics/RechargesTableView.tsx)
- Search placeholder: "Search Wallet ID, Customer Name, Mobile...".

#### [MODIFY] [analyticsPdfExport.ts](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/analytics/analyticsPdfExport.ts)
- Section header: "Wallet Analytics".
- Metric labels: "Active Wallets", "Settled Wallets", "Blocked Wallets", "Inactive Wallets", "Wallets Activated", "Wallets Settled", "Wallet Recharge", "Wallet Returns & Refund Volume".

#### [MODIFY] [SubscriptionsPage.tsx](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/subscriptions/SubscriptionsPage.tsx) & [AdminPlansView.tsx](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/subscriptions/AdminPlansView.tsx)
- Plan limits: "Active Wallets", "Max Active Wallets", "Max Wallets".

#### [MODIFY] [PortalSessionPage.tsx](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/portal/PortalSessionPage.tsx)
- Customer portal: "Wallet Balance", "Wallet Number", "Wallet Status".

---

### Mobile POS App (`Flutter Money card`)

#### [MODIFY] [staff_app_shell.dart](file:///D:/Money%20Card%20Project/Flutter%20Money%20card/lib/widgets/shell/staff_app_shell.dart)
- Bottom nav item: `label: 'Wallets'`.

#### [MODIFY] [qr_scanner_view.dart](file:///D:/Money%20Card%20Project/Flutter%20Money%20card/lib/widgets/scanner/qr_scanner_view.dart)
- "Enter Wallet ID Manually".
- "Enter Wallet ID".
- "If the QR code cannot be scanned, manually enter the Wallet ID or Number:".
- "Wallet ID / Number".
- "e.g. WLT-101 or Wallet ID".

#### [MODIFY] [cards_screen.dart](file:///D:/Money%20Card%20Project/Flutter%20Money%20card/lib/features/cards/cards_screen.dart) & [home_screen.dart](file:///D:/Money%20Card%20Project/Flutter%20Money%20card/lib/features/home/home_screen.dart)
- AppBar title: "Wallets".
- Action buttons: "Issue Wallet", "Return Wallet", "Block Wallet", "Unblock Wallet", "View Wallets".

#### [MODIFY] [digital_receipt_service.dart](file:///D:/Money%20Card%20Project/Flutter%20Money%20card/lib/services/digital_receipt_service.dart)
- Metadata row: `_buildMetaRow('Wallet:', bill.displayCardId)`.

#### [MODIFY] [analytics_pdf_service.dart](file:///D:/Money%20Card%20Project/Flutter%20Money%20card/lib/services/analytics_pdf_service.dart)
- Analytics PDF cell: "Money Refunded (Wallets Returned)".

#### [MODIFY] [app_empty_state.dart](file:///D:/Money%20Card%20Project/Flutter%20Money%20card/lib/widgets/states/app_empty_state.dart)
- `title: 'No Wallets Found'`, `actionLabel: 'Issue Wallet'`.

---

## Wireframe Comparison

### Web Admin Navigation & Table
```
+---------------------------------------------------------------------------------------+
|  [Logo] Cafeteria           Wallet Management                   [Search] [Profile]    |
+---------------------------------------------------------------------------------------+
|  Dashboard        |  [ Issue Wallet ]                                                 |
|  Counters         |  +-------------------------------------------------------------+  |
|  Menu             |  | Wallet ID   | Customer Name | Wallet Balance | Wallet Status|  |
| >Wallets & History|  | WLT-1042    | Sarah Chen    | Rs 450.00      | Active Wallet|  |
|  Staff            |  | WLT-1041    | Michael Scott | Rs 820.00      | Active Wallet|  |
|  Analytics        |  | WLT-1040    | Priya Sharma  | Rs 120.00      | Active Wallet|  |
|  Settings         |  +-------------------------------------------------------------+  |
+---------------------------------------------------------------------------------------+
```

### Mobile POS Navigation & Action Hub
```
+-------------------------------------+
| [Counter 1]                 Wallets |
+-------------------------------------+
| [ Quick Actions ]                   |
| [ Issue Wallet ]  [ Return Wallet ] |
| [ Topup Wallet ]  [ Block Wallet ]  |
+-------------------------------------+
| Active Wallets (18)                 |
| WLT-1042 - Sarah Chen    Rs 450.00  |
| WLT-1041 - Michael Scott Rs 820.00  |
+-------------------------------------+
| [Home]  [Wallets]  [Menu] [Analytics|
+-------------------------------------+
```

---

## Web <-> Mobile App Parity Check

- Parity is strictly maintained across both Web Admin Dashboard and Flutter Mobile POS App.
- Both platforms share identical terminology: "Wallet", "Wallets", "Wallet ID", "Issue Wallet", "Return Wallet".
- Digital receipts and PDF export services on both Web and Mobile are updated in complete parity.

---

## Verification Plan

### Automated Test Suites
- Execute Frontend Vitest tests: `npm test -- --run` in `Frontend Money Card`
- Execute Frontend TypeScript check: `npx tsc --noEmit` in `Frontend Money Card`
- Execute Mobile Flutter tests: `flutter test` in `Flutter Money card`
- Execute Mobile Flutter analyzer: `flutter analyze --no-pub` in `Flutter Money card`

### Manual Verification
- Verify Sidebar navigation says "Wallets & History".
- Verify Cards table displays "Wallet ID" and "Wallet Management".
- Verify Sessions table displays "Wallet ID".
- Verify Mobile POS bottom nav says "Wallets" and scanner dialog says "Enter Wallet ID Manually".
- Verify digital receipts display "Wallet:" metadata.
