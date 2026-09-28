# Implementation Plan - Cumulative Work Specification

![Mobile Action Hub Clean Actions](C:\Users\damie\.gemini\antigravity-ide\brain\999581c9-5c30-4195-933d-3667425ed95a\mobile_action_hub_clean_actions_1790592271039.jpg)
![Staff Modal and Dashboard KPIs](C:\Users\damie\.gemini\antigravity-ide\brain\999581c9-5c30-4195-933d-3667425ed95a\staff_modal_and_dashboard_kpis_1790592845035.jpg)
![Subscription Card with Dates](C:\Users\damie\.gemini\antigravity-ide\brain\999581c9-5c30-4195-933d-3667425ed95a\subscription_card_with_dates_1790593096377.jpg)

# Summary of Modules

Module 1: Mobile POS Active Card Actions Hub (Retained Pending Work)
- Restore Billing option unconditionally when a customer wallet QR is scanned at the counter POS.
- Rename section header from 'Wallet Actions & Operations' to 'Actions'.
- Remove sub-headings / subtitles from each action button (Recharge, Billing, Return & Refund).
- Add 'PURCHASE' to MANAGER_PERMISSIONS in Frontend constants.ts.
- Grant 'PURCHASE' permission to user Damien (phone 9539518192) in Supabase staging database.

Module 2: Counter & Staff Created Success Modals (Retained Pending Work)
- In Counter Created modal (BranchesPage.tsx):
  - Add an eye icon toggle button to reveal or mask the password.
  - Remove modal sub-heading description ('Share the login credentials with the counter manager via WhatsApp or copy directly.').
- In Staff Created modal (StaffPage.tsx):
  - Add an eye icon toggle button to reveal or mask the password.
  - Remove sub-heading text ('Account activated immediately. Share these login credentials...').
  - Remove the blue 'Direct WhatsApp Dispatch' callout box.

Module 3: Mobile App Wallet Return & Settlement Success Screen (Retained Pending Work)
- In pos_scan_purchase_screen.dart:
  - Simplify the settlement success view to show only the green checkmark, '[Wallet Number] Returned Successfully', and the two navigation buttons ('Scan Another Wallet' and 'Back to Home').
  - Remove the breakdown box (Refunded Amount, Wallet Status AVAILABLE, Session Status SETTLED) and the descriptive paragraph.

Module 4: Dashboard KPI Renaming (Retained Pending Work)
- In OrgAdminDashboard.tsx (Org Admin & Counter Dashboards):
  - Rename 'Purchase Sales Volume' StatCard to 'Total sales'.
  - Rename 'Wallets Issued in Period' / 'Active Wallets Issued' StatCard to 'Wallet In use'.

Module 5: Wallet Analytics — Counter 1 Modal (Retained Pending Work)
- In OrgAdminCardsView.tsx (Wallet Analytics — [Counter Name] modal):
  - Remove the 'Ready Wallets' operational metric card ('0 Ready to issue').
  - Adjust the operational metrics row from 3 columns to 2 columns for 'Blocked Wallets' and 'Refunds'.

Module 6: Analytics View PDF Export Update (Retained Pending Work)
- In analyticsPdfExport.ts (Web View PDF for Org Admin, Super Admin, Counter Dashboard):
  - Align Section 1 (Financial Overview) so the follow-up cards (Wallet Activations, Money Refunded, Cancelled Top-ups, and Cafeterias for Super Admin) display in a clean, balanced grid matching the Web analytics page layout.

Module 7: Org Admin Subscription Page Dates (New Work)
- In SubscriptionsPage.tsx:
  - In the Current Subscription card, add a dedicated 'Subscription Period' section displaying 'Start Date' and 'Renewal Date' cleanly formatted using formatDate.

# Wireframe Specifications

Wireframe 1: Mobile POS Actions Hub (Module 1)
```
+----------------------------------------------------+
| Wallet: MC-001                                     |
+----------------------------------------------------+
| MC-001                           [ ACTIVE ]        |
| Current Balance: ₹750.00                           |
+----------------------------------------------------+
| Actions                                            |
|                                                    |
| [Icon] Recharge                                >   |
| [Icon] Billing                                 >   |  <-- Always visible
| [Icon] Return & Refund                         >   |
+----------------------------------------------------+
```

Wireframe 2: Counter Created Modal (Module 2)
```
+----------------------------------------------------+
| Counter Created Successfully!                  [X] |
+----------------------------------------------------+
| Counter Login Credentials                          |
|                                                    |
| Counter Name: Counter 1                            |
| Mobile Number: 9539518192                          |
| Password: •••••• [Eye Icon]                        |
| Web Portal: https://.../login                      |
+----------------------------------------------------+
| [ Copy Credentials ]        [ Send via WhatsApp ]  |
|                                                    |
|                      [ Close ]                     |
+----------------------------------------------------+
```

Wireframe 3: Staff Created Modal (Module 2)
```
+----------------------------------------------------+
| Staff Account Created                          [X] |
+----------------------------------------------------+
|                [ Smartphone Icon ]                 |
|             [ Ready for Mobile POS Login ]         |
|                     Damien                         |
|                                                    |
| Assigned Counter: Counter 1                        |
| Login Phone Number: 9539518192                     |
| POS Password: •••••• [Eye Icon]                    |
+----------------------------------------------------+
| [ Copy Credentials ]        [ Send via WhatsApp ]  |
+----------------------------------------------------+
```

Wireframe 4: Mobile App Wallet Return & Settlement (Module 3)
```
+----------------------------------------------------+
|                                                    |
|                [ Checkmark Icon ]                  |
|                                                    |
|         MC-001 Returned Successfully               |
|                                                    |
|          [ Scan Another Wallet ]                   |
|          [ Back to Home ]                          |
|                                                    |
+----------------------------------------------------+
```

Wireframe 5: Dashboard KPI Cards (Module 4)
```
+------------------+------------------+------------------+------------------+
| Total sales      | Total Recharges  | Wallet In use    | Total Wallets    |
| ₹4,87,350.25     | ₹2,98,640.80     | 1,452            | 1,500            |
+------------------+------------------+------------------+------------------+
```

Wireframe 6: Wallet Analytics Counter Modal (Module 5)
```
+----------------------------------------------------+
| Wallet Analytics — Counter 1                   [X] |
+----------------------------------------------------+
| Total Wallets | Active Wallets | Inactive | Bal    |
+----------------------------------------------------+
| Blocked Wallets (Security locked)                  |
| Refunds (X refunds)                                |
+----------------------------------------------------+
|                      [ Close ]                     |
+----------------------------------------------------+
```

Wireframe 7: Org Admin Current Subscription Card (Module 7)
```
+----------------------------------------------------+
| Enterprise                         [ ACTIVE PLAN ] |
| ₹4,999 /monthly                                    |
+----------------------------------------------------+
| Resource Limits & Usage                            |
| Counters:       1 / 10                             |
| Staff Accounts: 2 / 25                             |
| Active Wallets: 1 / 1000                           |
+----------------------------------------------------+
| Subscription Period                                |
| Start Date:   28 Sep 2026                          |
| Renewal Date: 28 Oct 2026                          |
+----------------------------------------------------+
| Included Features                                  |
| [Check] Advanced Inventory                         |
| [Check] Standard Analytics                         |
| [Check] Priority Support                           |
+----------------------------------------------------+
| [ Renew Subscription ]                             |
+----------------------------------------------------+
```

# Proposed Technical Changes Across Files

1. File: Flutter Money card/lib/features/pos/pos_scan_purchase_screen.dart
- Rename SectionHeader title from 'Wallet Actions & Operations' to 'Actions' in _buildActiveCardActionHub().
- Remove 'if (canPurchase)' restriction around the Billing action tile so it is always rendered for active card sessions.
- Remove 'subtitle' parameter from Recharge, Billing, and Return & Refund action tiles.
- In _buildActionTile(), ensure text vertically centers cleanly when subtitle is null.
- In the return and settlement success view (around line 430), simplify display:
  - Header: '[Card Number] Returned Successfully'.
  - Remove the detailed stats container (Refunded Amount, Wallet Status, Session Status) and the explanation paragraph.
  - Retain the two buttons: 'Scan Another Wallet' and 'Back to Home'.

2. File: Frontend Money Card/src/features/branches/BranchesPage.tsx
- In showWhatsAppModal (Counter Created Successfully):
  - Add state 'showPasswordInModal' (boolean, default false).
  - Add an eye icon button beside the password text to toggle between masked bullets ('••••••••') and clear text.
  - Remove the modal 'description' prop.

3. File: Frontend Money Card/src/features/staff/StaffPage.tsx
- In showStaffCreatedModal (Staff Account Created):
  - Add state 'showStaffPasswordInModal' (boolean, default false).
  - Add an eye icon button beside the password text to toggle between masked bullets ('••••••••') and clear text.
  - Remove the paragraph '<p className="text-xs text-slate-600 mt-1">Account activated immediately...</p>'.
  - Remove the blue 'Direct WhatsApp Dispatch' container.

4. File: Frontend Money Card/src/features/staff/constants.ts
- In MANAGER_PERMISSIONS array, add 'PURCHASE' so counter managers receive full cashier and billing rights by default.

5. Database: Supabase Staging PostgreSQL
- Execute SQL: INSERT INTO user_permissions ("userId", permission) VALUES ('94183d0c-c570-45ce-84e6-efcd78d26c13', 'PURCHASE') ON CONFLICT DO NOTHING; to grant PURCHASE to staff user Damien.

6. File: Frontend Money Card/src/features/dashboard/OrgAdminDashboard.tsx
- In StatCard inside filtered date section (lines 567-584):
  - Change label='Purchase Sales Volume' to label='Total sales'.
  - Change label={startDate || endDate ? 'Wallets Issued in Period' : 'Active Wallets Issued'} to label='Wallet In use'.

7. File: Frontend Money Card/src/features/cards/OrgAdminCardsView.tsx
- In the 'Wallet Analytics — [Counter Name]' modal (around line 858):
  - Remove the Ready Wallets card ('Ready Wallets', readyCards, 'Ready to issue').
  - Change the surrounding grid from 'sm:grid-cols-3' to 'sm:grid-cols-2' for Blocked Wallets and Refunds.

8. File: Frontend Money Card/src/features/analytics/analyticsPdfExport.ts
- In Section 1 (Financial Overview):
  - Update the follow-up cards (Wallet Activations, Money Refunded, Cancelled Top-ups, and Cafeterias for Super Admin) to form a clean, balanced grid matching the Web analytics page layout.

9. File: Frontend Money Card/src/features/subscriptions/SubscriptionsPage.tsx
- In the Current Subscription card (around line 458):
  - Add a 'Subscription Period' section between 'Resource Limits & Usage' and 'Included Features'.
  - Render 'Start Date' formatted via formatDate(subscription.startDate).
  - Render 'Renewal Date' formatted via formatDate(subscription.renewalDate || subscription.endDate).

# Verification Plan
- Run Flutter unit tests: flutter test test/features/pos/pos_scan_purchase_test.dart
- Run full Flutter test suite: flutter test
- Run Flutter analyzer: flutter analyze --no-pub
- Run Web frontend test suite: npm test -- --run in Frontend Money Card/
- Run Web TypeScript validation: npx tsc --noEmit in Frontend Money Card/
- Proactively publish Shorebird OTA Patch #7 for staging release 1.0.3+4

