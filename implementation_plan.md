# Comprehensive Platform Stability, Deletion Integrity, and POS Updates Plan

## User Review Required

- Organization Deletion & Counter Ghosting Fix: Make `deleteOrganization` in `admin.controller.ts` completely comprehensive with bulletproof cascading deletion. Previously, `deleteOrganization` failed to delete transactions where `staffUserId` belonged to the org, and failed to delete `user_branches` linked by `branchId`. When an org had transaction or staff history, Postgres threw foreign key constraint errors and aborted the transaction, leaving the old organization ("khss karimpuzha") and its counter ("main bock") intact in the database.
- Database Purge: Purged old orphaned organization "khss karimpuzha" and counter "main bock" from the live database. Only active client cafeterias (Acme Cafeterias and Test Org) now remain.
- Mobile Analytics & Home Sales Bug Fix: Fix the timezone boundary parser in `analytics.controller.ts` where date strings like `2026-09-24` were parsed as UTC `T00:00:00.000Z` instead of local client time (`Asia/Kolkata` +05:30), causing all transactions between 12:00 AM and 5:30 AM IST to be excluded from Today's Sales, Recharges, and Menu Analytics.
- Mobile Home Dashboard: Auto-load analytics on open and pull-to-refresh, and make the Today's Sales summary box tappable to navigate directly to the Analytics screen.
- Mobile Receipts: Remove "Card No:" and "Receipt No:" from recharge completion; remove "Bill No:" and "Payment: Card Session" from purchase bills.
- Mobile Edit Order & Stats: Remove the lengthy sentence from Edit Food Order dialog; rename "Voided Recharges" to "Cancelled Recharges".
- Web Admin Counter Profile: Display "Counter Admin" instead of "Org Admin" on top-right profile trigger when logged in as counter staff (`user?.role === 'STAFF'`).
- Web Admin Cleanups: Remove "Pending Email Activation" container; remove "Add Menu" button from inside View/Edit Counter Menu modal; fix Step 3 staff creation label to display "Manager" or "Staff"; release phone numbers on staff deactivation and org deletion.

## Visual Design Reference

![Mobile Home Today Sales and Live Analytics](file:///C:/Users/damie/.gemini/antigravity-ide/brain/9c70217b-9240-4d11-907e-eaaf4a37b746/mobile_home_today_sales_and_live_analytics_1790191476934.jpg)

![Counter Admin Profile and Clean Modals](file:///C:/Users/damie/.gemini/antigravity-ide/brain/9c70217b-9240-4d11-907e-eaaf4a37b746/counter_admin_profile_and_clean_modals_1790190510607.jpg)

## ASCII Wireframes

### Organization Deletion Cascading Sequence (Zero Ghost Counters)

```
[ DELETE /api/v1/admin/organizations/:id ]
                    |
  +-----------------+-----------------+
  | 1. Customer history events        |
  | 2. Transactions (by branch,       |
  |    session, OR staff user)        |
  | 3. Card sessions (by org,         |
  |    issuedBy, OR settledBy)        |
  | 4. Cards & Card assignments       |
  | 5. Inventory & Products           |
  | 6. User permissions & Branches    |
  |    (by user OR branch)            |
  | 7. Users (all staff & org admin)  |
  | 8. Branches (all counters)        |
  | 9. Subscriptions & Payments       |
  | 10. Organization record           |
  +-----------------+-----------------+
                    |
          [ Full Cascade Commit ]
          -> Zero ghost records
```

### Mobile Home Screen: Active Tappable Today's Sales Box

```
+-----------------------------------+
| Hello, Manager        [Manager]   |
| Counter: Counter 1                |
|                                   |
| +-------------------------------+ |
| |        [QR Scan Icon]         | |
| |         SCAN QR CARD          | |
| | Scan card to start purchase...| |
| +-------------------------------+ |
|                                   |
| +-------------------------------+ |  <-- Whole box now tappable
| | Today's Sales   Transactions  | |      navigates to /app/analytics
| | Rs 1,560        8 orders   [>]| |      Loads immediately on open
| +-------------------------------+ |
+-----------------------------------+
```

### Mobile Analytics Screen: Recharge & Menu Analytics Tabs

```
+-----------------------------------+
| Analytics                         |
| Counter 1                         |
| [  Recharge  ]   [    Menu    ]   |
| --------------------------------- |
| [ Start Date v ] [ End Date v ]   |
| [ Apply ] [ Reset Today ] [ PDF ] |
| --------------------------------- |
| FOOD SALES         ITEMS SOLD     |
| Rs 1,560.00        12             |
| 8 orders placed    Total items    |
| --------------------------------- |
| TOP DISHES                        |
| 1. Chicken Biryani     Rs 840.00  |
|    6 units sold                   |
| 2. Tea                 Rs 60.00   |
|    4 units sold                   |
+-----------------------------------+
```

## Proposed Changes

### Backend API (`Backend Money Card/`)

#### [MODIFY] [admin.controller.ts](file:///d:/Money%20Card%20Project/Backend%20Money%20Card/src/controllers/admin.controller.ts)
- In `deleteOrganization`:
  - Delete all `transactions` where `branch: { organizationId: id }`, `session: { organizationId: id }`, or `staffUser: { organizationId: id }`.
  - Delete all `card_sessions` where `organizationId: id`, `issuedBy: { organizationId: id }`, or `settledBy: { organizationId: id }`.
  - Delete all `user_branches` where `user: { organizationId: id }` or `branch: { organizationId: id }`.
  - Delete all `user_permissions` where `user: { organizationId: id }`.
  - Delete all `users` where `organizationId: id`.
  - Delete all `branches` where `organizationId: id`.
  - Delete all `subscriptions`, `subscription_payments`, and `plan_change_requests`.
  - Delete `organization`.
  - Guarantees 100% clean deletion with zero orphaned counters or foreign key constraint aborts.

#### [MODIFY] [organization.controller.ts](file:///d:/Money%20Card%20Project/Backend%20Money%20Card/src/controllers/organization.controller.ts)
- In `getBranches`:
  - When `req.user?.role === Role.SUPER_ADMIN` and `organizationId` is passed, scope to `where.organizationId = organizationId`.
  - Only return branches belonging to active, non-deleted organizations.

#### [MODIFY] [analytics.controller.ts](file:///d:/Money%20Card%20Project/Backend%20Money%20Card/src/controllers/analytics.controller.ts)
- Add timezone-aware date boundary parser helper:
  `parseDateInTimezone(dateStr: string, timeZone: string, isEndOfDay: boolean): Date`
  Calculates exact UTC millisecond bounds based on target timezone offset (e.g. `Asia/Kolkata` +05:30), converting `2026-09-24` start-of-day to `2026-09-23T18:30:00.000Z` and end-of-day to `2026-09-24T18:29:59.999Z`.
- In `getOrgAnalytics` (lines 83-88):
  Use `parseDateInTimezone(startDate, clientTimezone, false)` and `parseDateInTimezone(endDate, clientTimezone, true)` instead of appending `T00:00:00.000Z` / `T23:59:59.999Z`.
- In `getPeakAnalytics` (lines 994-996):
  Use `parseDateInTimezone` for exact timezone-aware bounds.

#### [MODIFY] [staff.controller.ts](file:///d:/Money%20Card%20Project/Backend%20Money%20Card/src/controllers/staff.controller.ts)
- In `createStaffMember`: Release phone if existing user is deactivated or belongs to a deleted/inactive org.
- In `deleteStaffMember`: When deactivating a user, set `phone: null` to free the phone number for re-registration.

---

### Mobile POS App (`Flutter Money card/`)

#### [MODIFY] [home_screen.dart](file:///d:/Money%20Card%20Project/Flutter%20Money%20card/lib/features/home/home_screen.dart)
- In `initState`: Call `ref.read(analyticsNotifierProvider.notifier).loadAnalytics()` on startup so Today's Sales box populates immediately.
- In `RefreshIndicator.onRefresh`: Include `ref.read(analyticsNotifierProvider.notifier).loadAnalytics()`.
- Wrap the Today at a Glance summary card with `InkWell(onTap: () => _safePush('/app/analytics'))` so tapping the box opens the Analytics screen.

#### [MODIFY] [digital_receipt_dialog.dart](file:///d:/Money%20Card%20Project/Flutter%20Money%20card/lib/widgets/receipt/digital_receipt_dialog.dart)
- Recharge receipts (`isRecharge == true`): Omit `Card No:` and `Receipt No:`.
- Sales receipts (`!isRecharge`): Omit `Bill No:` and omit `Payment: Card Session`.

#### [MODIFY] [bill_receipt_screen.dart](file:///d:/Money%20Card%20Project/Flutter%20Money%20card/lib/features/receipt/bill_receipt_screen.dart)
- In header metadata, remove `_buildReceiptRow('Bill No:', bill.displayBillNo)`.
- In payment metadata, omit `Payment:` if `bill.paymentMethod` is `'Card Session'`.

#### [MODIFY] [digital_receipt_service.dart](file:///d:/Money%20Card%20Project/Flutter%20Money%20card/lib/services/digital_receipt_service.dart)
- Recharge PDF: Omit `Receipt No` and `Card No`.
- Sales Bill PDF: Omit `Bill No` and `Payment: Card Session`.

#### [MODIFY] [pos_scan_purchase_screen.dart](file:///d:/Money%20Card%20Project/Flutter%20Money%20card/lib/features/pos/pos_scan_purchase_screen.dart)
- In `_handleEditOrder` dialog: Remove the lengthy sentence (`This will cancel the order, auto-refund the balance back to the card...`).
- In `_showSessionStatsSheet`: Rename `Voided Recharges` to `Cancelled Recharges`.
- After order edit or cancel, trigger `ref.read(analyticsNotifierProvider.notifier).loadAnalytics()`.

#### [MODIFY] [pos_checkout_screen.dart](file:///d:/Money%20Card%20Project/Flutter%20Money%20card/lib/features/pos/pos_checkout_screen.dart)
- After checkout succeeds, trigger `ref.read(analyticsNotifierProvider.notifier).loadAnalytics()`.

#### [MODIFY] [recharge_screen.dart](file:///d:/Money%20Card%20Project/Flutter%20Money%20card/lib/features/payments/recharge_screen.dart)
- After recharge completes, trigger `ref.read(analyticsNotifierProvider.notifier).loadAnalytics()`.

---

### Frontend Web Admin (`Frontend Money Card/`)

#### [MODIFY] [ProfileMenu.tsx](file:///d:/Money%20Card%20Project/Frontend%20Money%20Card/src/components/ui/ProfileMenu.tsx)
- Update lines 64-66 to display "Counter Admin" when `user?.role === 'STAFF'`.

#### [MODIFY] [OrganizationsPage.tsx](file:///d:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/organizations/OrganizationsPage.tsx)
- Remove the "Pending Email Activation" container and cards.

#### [MODIFY] [CounterViewEditMenuModal.tsx](file:///d:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/products/CounterViewEditMenuModal.tsx) & [ProductsPage.tsx](file:///d:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/products/ProductsPage.tsx)
- Remove the green "Add Menu" button from inside the View / Edit Counter Menu modal.

#### [MODIFY] [StaffPage.tsx](file:///d:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/staff/StaffPage.tsx)
- In Step 3 (Review & Create), display "Manager" or "Staff" directly based on the selected role preset.

## Verification Plan

### Automated Tests
- Mobile Tests: Proactively run `flutter test` and `flutter analyze --no-pub` in `Flutter Money card/`.
- Backend Tests: Proactively run `npm test` in `Backend Money Card/` (100 tests must pass).
- Backend Build: Proactively run `npm run build` in `Backend Money Card/` (0 TypeScript errors).
- Frontend Tests: Run `npm test -- --run` in `Frontend Money Card/` (267 tests must pass).
- Frontend Typecheck: Run `npx tsc --noEmit` in `Frontend Money Card/` (0 errors).

### Manual Verification
1. Deleted Organizations & Counters: Verify only active client cafeterias (Acme Cafeterias and Test Org) appear in Organizations and Counters tables. Verify no old/deleted organizations or counters pop up.
2. Mobile Home Today's Sales: Open mobile app, verify Today's Sales box immediately displays today's volume (e.g. ₹1,560) and order count, and verify tapping the box navigates directly to the Analytics screen.
3. Mobile Analytics Recharges & Menu: Open Analytics, verify Recharge tab shows all today's cash and UPI recharges and net collections, and verify Menu tab lists all sold dishes and quantities.
4. Mobile Receipts: Complete a recharge and purchase, verify absence of Card No/Receipt No on recharge dialog, and absence of Bill No/Payment: Card Session on bill screen.
5. Mobile Edit Order & Stats: Verify edit order dialog has no long sentence, and Card Info displays "Cancelled Recharges".
6. Web Admin Counter Profile & Cleanup: Confirm Counter Admin role badge, absence of Pending Email Activation box, absence of Add Menu button in modal, and role preset label in staff creation.
