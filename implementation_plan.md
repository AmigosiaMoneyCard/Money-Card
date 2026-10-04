# Implementation Plan: Global Security & Audit Log, Organization Data Export, End-of-Day Summary & Mobile Cash/UPI Refund Workflow

Implement comprehensive platform security, compliance export, automated operational reporting, and cashier drawer-accurate card return workflows across Web Admin, Mobile POS, and Backend.

![Security Audit and Refund Workflow Mockup](file:///C:/Users/damie/.gemini/antigravity-ide/brain/218ce084-c8ce-49ca-a93b-bc0ce2200b0c/security_audit_refund_workflow_ui_1791129616172.jpg)

---

## User Requirements & Scope

1. **Global Security and Audit Log (Super Admin)**:
   - Centralized security log tracking failed logins, card block events, role elevations/permission grants, and plan overrides across all cafeteria organizations.
   - Searchable, filterable by action and severity (`INFO`, `WARN`, `HIGH`), with actor, IP, timestamp, and metadata.
2. **Organization Data Export (Super Admin & Org Admin)**:
   - One-click export of an entire organization's records (cards, sessions, products, transactions, branches) for backups or compliance.
   - Downloadable in JSON format with structured tables.
3. **Automated End-of-Day Summary (PDF)**:
   - Closing PDF report summarizing daily revenue, cash vs UPI collections, unreturned card liabilities (active card balances in circulation), and top-selling food items.
   - Accessible in Web Admin Reports and Mobile POS Analytics.
4. **Mobile POS Card Return & Refund Payment Method Selection**:
   - When staff initiates "Return Card" or "Refund Balance":
     - If remaining balance is zero: return card immediately without prompting for payment method.
     - If remaining balance is greater than zero: display a quick two-button toggle between **Cash** (selected by default) and **UPI**, with exact refund amount.
     - Tapping Confirm settles the card and records transaction with selected `paymentMethod` (`CASH` vs `UPI`).
5. **Mobile POS Analytics Wallet Refund Sublabel**:
   - In Mobile Counter Manager Analytics -> Recharge page, restore the Cash / UPI sub-label breakdown under the "Wallet Refund" box (`Cash: ₹...` and `UPI: ₹...`) while maintaining clean design on the other metric cards.

---

## ASCII Wireframes

### 1. Mobile App Card Return & Refund Dialog

```
+-----------------------------------------------------+
|                  Card Return                     X  |
+-----------------------------------------------------+
|                Processing Refund                    |
|                                                     |
|                Amount to Refund:                    |
|                 ₹150.00 Rupees                      |
|                                                     |
|    +-----------------------+ +--------------------+ |
|    | [x] Cash (Selected)   | | [ ] UPI            | |
|    +-----------------------+ +--------------------+ |
|                                                     |
|       Ensure accurate drawer counting before        |
|             confirming cash payout.                 |
|                                                     |
|    +-----------------------------------------------+|
|    |               Confirm Return                  ||
|    +-----------------------------------------------+|
+-----------------------------------------------------+
```

### 2. Mobile App Analytics: Wallet Refund Box with Sub-labels

```
+----------------------------------+  +----------------------------------+
| Recharge Amount       [Wallet]   |  | Total Sales          [Payments]  |
| ₹12,450.00                       |  | ₹11,200.00                       |
| Cash: ₹8,200   UPI: ₹4,250       |  |                                  |
+----------------------------------+  +----------------------------------+

+----------------------------------+  +----------------------------------+
| Wallet Refund           [Return] |  | Wallet Refund Count    [Refresh] |
| ₹1,250.00                        |  | 9 Refunds                        |
| Cash: ₹950     UPI: ₹300         |  |                                  |
+----------------------------------+  +----------------------------------+

+----------------------------------+  +----------------------------------+
| Cancelled Amount        [Cancel] |  | Cancelled Count          [Money] |
| ₹500.00                          |  | 2 Recharges                      |
+----------------------------------+  +----------------------------------+
```

### 3. Super Admin Global Security & Audit Log

```
+----------------------------------------------------------------------------------------------------------------+
|  Global Security & Audit Log                                      [ Search logs... ] [ Filter Severity v ]     |
+----------------------------------------------------------------------------------------------------------------+
| Timestamp            Severity   Action           Actor             Entity/Organization       Details           |
|----------------------------------------------------------------------------------------------------------------|
| 2026-10-04 21:15:10  [HIGH]     CARD_BLOCKED     Admin R. Verma    Card #MC-0042 (Apex Org)  Physical damaged  |
| 2026-10-04 20:45:22  [WARN]     FAILED_LOGIN     Unknown           admin@apex.com (Apex Org) Invalid password  |
| 2026-10-04 19:30:05  [INFO]     PLAN_OVERRIDE    Super Admin       Zenith Cafeteria          Max cards: 200    |
| 2026-10-04 18:12:44  [INFO]     ROLE_ELEVATION   Org Owner         Staff S. Khan -> Counter  Assigned Counter1 |
+----------------------------------------------------------------------------------------------------------------+
| Showing 1-20 of 142 audit events                                                            [ Previous ] [ Next ] |
+----------------------------------------------------------------------------------------------------------------+
```

### 4. Organization Data Export Modal

```
+-------------------------------------------------------------+
| Export Organization Data                                  X |
+-------------------------------------------------------------+
| Organization: Apex Cafeteria (ID: org_apex_01)             |
| Records included:                                           |
|   - 142 Cards & Status History                              |
|   - 389 Card Sessions & Balances                            |
|   - 1,240 Transactions (Purchases, Recharges, Refunds)      |
|   - 48 Menu Products & Branch Catalogs                      |
|                                                             |
| Export Format:                                              |
|   (o) Complete JSON Archive (.json)                         |
|   ( ) Tabular CSV Package (.zip)                            |
|                                                             |
| [ Cancel ]                               [ Download Export ]|
+-------------------------------------------------------------+
```

---

## Technical Design & Component Breakdown

### Sub-Project 1: Backend (`Backend Money Card/`)

1. **Audit Log System**:
   - `prisma/schema.prisma`: Add `AuditLog` model:
     - `id`, `organizationId` (nullable), `userId` (nullable), `userName` (string), `action` (string), `severity` (`INFO`, `WARN`, `HIGH`), `details` (Json), `ipAddress` (string?), `createdAt` (DateTime).
     - Relation to Organization and User.
   - `src/services/auditLog.service.ts`: Helper `recordAuditEvent({ action, severity, organizationId, userId, userName, details, ipAddress })`.
   - Instrumentation:
     - Failed login attempts in `auth.controller.ts`.
     - Card block/unblock in `cards.controller.ts`.
     - Plan overrides in `admin.controller.ts`.
     - Staff role updates in `staff.controller.ts`.
   - `src/controllers/admin.controller.ts` & `src/routes/admin.routes.ts`:
     - Route `GET /api/admin/audit-logs` (Super Admin only) with pagination and filters.

2. **Organization Data Export**:
   - `src/controllers/organization.controller.ts` & `src/routes/organization.routes.ts`:
     - Route `GET /api/organization/export` (Org Admin: own org) and `GET /api/admin/organizations/:id/export` (Super Admin: any org).
     - Queries organization, branches, staff, products, cards, card sessions, and transactions.
     - Streams JSON export payload.

3. **Refund Payment Method & Analytics Parity**:
   - `src/controllers/sessions.controller.ts`:
     - Update `returnSession`: accept `paymentMethod` (`CASH` | `UPI`, default `CASH`).
     - Save `paymentMethod: (paymentMethod || 'CASH').toUpperCase()` on `tx.transaction.create` for `REFUND_RETURN`.
     - Update `refundSessionBalance`: accept `paymentMethod` (`CASH` | `UPI`, default `CASH`).
   - `src/controllers/analytics.controller.ts`:
     - Breakdown `cashRefunds` and `upiRefunds`:
       `cashRefunds`: sum of `REFUND_RETURN` with `paymentMethod === 'CASH'`.
       `upiRefunds`: sum of `REFUND_RETURN` with `paymentMethod === 'UPI'`.
     - Return `cashRefunds` and `upiRefunds` in `financialAnalytics` response.

---

### Sub-Project 2: Frontend Web Admin (`Frontend Money Card/`)

1. **Global Security & Audit Log View**:
   - `src/features/admin/GlobalAuditLogPage.tsx`:
     - Table with columns: Timestamp, Severity Badge, Action, Actor, Organization/Entity, Details, IP.
     - Severity filter (`ALL`, `HIGH`, `WARN`, `INFO`), action filter, and search.
   - Navigation: Add "Audit Log" item in Super Admin sidebar under `src/config/navigation.ts`.

2. **Organization Data Export**:
   - `src/features/organization/OrgDataExportModal.tsx`:
     - Modal displaying total records to export and download button triggering `apiService.organization.exportData()`.
   - Add "Export Data" button in Organization Settings / Super Admin Org details view.

3. **End-of-Day Summary PDF**:
   - `src/features/reports/EndOfDaySummaryPdf.ts`:
     - PDF generator rendering today's closing summary: Net sales, Cash in drawer vs UPI, Active card liabilities (unclaimed balances), Top-selling products, and Refund totals.
   - Add "End-of-Day Summary PDF" button in Reports page.

---

### Sub-Project 3: Mobile POS App (`Flutter Money card/`)

1. **Refund Payment Method Dialog**:
   - `lib/widgets/dialogs/refund_payment_dialog.dart`:
     - If `refundAmount <= 0`: settles immediately.
     - If `refundAmount > 0`: shows clean modal with exact amount, two-button toggle between "Cash" and "UPI" (Cash default), and "Confirm Return" button.
     - Returns selected payment method string (`'CASH'` or `'UPI'`).
   - `lib/features/payments/return_card_screen.dart`:
     - Use `showRefundPaymentDialog` before calling `executeReturn(sessionId, paymentMethod)`.
   - `lib/features/pos/pos_scan_purchase_screen.dart`:
     - Use `showRefundPaymentDialog` on return card button before calling `returnSession(sessionId, paymentMethod)`.
   - `lib/services/session_service.dart` & `lib/repositories/session_repository.dart`:
     - Update `returnSession(String sessionId, {String paymentMethod = 'CASH'})` and `refundSession(String sessionId, {String paymentMethod = 'CASH'})` to send `{ paymentMethod }` in request body.

2. **Mobile Analytics Wallet Refund Sub-labels**:
   - `lib/models/analytics.dart`: Add `cashRefunds` and `upiRefunds` fields to `FinancialAnalytics`.
   - `lib/features/analytics/analytics_screen.dart`:
     - Restore `line1Text: 'Cash: ₹${_formatCompactSubAmount(data.cashRefunds)}'` and `line2Text: 'UPI: ₹${_formatCompactSubAmount(data.upiRefunds)}'` under `Wallet Refund`.

3. **Mobile End-of-Day Summary PDF**:
   - `lib/services/analytics_pdf_service.dart`: Add `generateEndOfDaySummaryPdf(...)` for cashier shift closing.

---

## Verification Plan

### Automated Tests
1. **Backend**:
   - Run `npm test` verifying Prisma schema, audit log recorder, refund payment method propagation, and export endpoints.
2. **Frontend**:
   - Run `npx tsc --noEmit` and `npm test -- --run` verifying TypeScript types and component rendering.
3. **Flutter POS**:
   - Run `flutter analyze --no-pub` and `flutter test` verifying dialog behavior, model parsing, and return workflows.

### Manual Verification
- Test 0-balance return: confirm card returns instantly with zero prompts.
- Test >0 balance return: verify modal shows Cash / UPI toggle, Cash is default, selecting UPI records `UPI` in transaction.
- Check Mobile Analytics: verify `Wallet Refund` displays Cash and UPI sublabels accurately.
- Verify Super Admin Audit Log and Data Export download in Web Admin.
