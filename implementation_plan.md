# Implementation Plan - Dashboard, Analytics PDF, Modal & Subscription Updates

![Staff Modal and Dashboard KPIs](C:\Users\damie\.gemini\antigravity-ide\brain\999581c9-5c30-4195-933d-3667425ed95a\staff_modal_and_dashboard_kpis_1790592845035.jpg)
![Subscription Card with Dates](C:\Users\damie\.gemini\antigravity-ide\brain\999581c9-5c30-4195-933d-3667425ed95a\subscription_card_with_dates_1790593096377.jpg)
![Financial Overview Layout](C:\Users\damie\.gemini\antigravity-ide\brain\999581c9-5c30-4195-933d-3667425ed95a\analytics_financial_overview_no_cancelled_orders_1790584913428.jpg)

# Summary of Requested Updates

1. Dashboard KPI Renaming (Counter Dashboard & Org Admin Dashboard)
- In OrgAdminDashboard.tsx:
  - Rename the first filtered metric card from 'Purchase Sales Volume' to 'Total sales'.
  - Rename the third filtered metric card from 'Wallets Issued in Period' / 'Active Wallets Issued' to 'Wallet In use'.
- Applies identically to both Organization Dashboard (Org Admin) and Counter Dashboard (Counter Manager).

2. Wallet Analytics — Counter 1 Modal Cleanup
- In OrgAdminCardsView.tsx (opened via 'View Analytics' on counter row):
  - Remove the 'Ready Wallets 0 Ready to issue' card.
  - Rebalance the operational metrics row from 3 columns to 2 columns for 'Blocked Wallets' and 'Refunds'.

3. View PDF Export Symmetrical Grid
- In analyticsPdfExport.ts (Section 1 - Financial Overview for Org Admin, Super Admin, and Counter Dashboard):
  - Align Section 1 into a clean, balanced grid matching the Web analytics page layout.
  - Top: Total Sales highlight banner across the full width.
  - Middle: 3 Recharge cards across (Recharge Total, UPI Recharge, Cash Recharge) in equal 3-column width.
  - Bottom: 3 Follow-up cards across (Wallet Activations, Money Refunded, Cancelled Top-ups) in equal 3-column width.

4. Org Admin Subscriptions Page — Subscription Period Dates
- In SubscriptionsPage.tsx:
  - In the Current Subscription card (Enterprise active plan), add a dedicated 'Subscription Period' section between 'Resource Limits & Usage' and 'Included Features'.
  - Display 'Start Date' formatted with formatDate(subscription.startDate).
  - Display 'Renewal Date' formatted with formatDate(subscription.renewalDate || subscription.endDate).

5. Retained Pending & Completed Items
- Mobile POS Active Card Actions: Section header renamed to 'Actions', button sub-headings removed, 'Billing' tile restored unconditionally.
- Mobile POS Wallet Return: Simplified to show only '[Wallet number] Returned Successfully' with 'Scan Another Wallet' and 'Back to Home' buttons.
- Counter & Staff Created Modals: Eye toggle icon added to reveal/mask password, subheadings removed, direct WhatsApp dispatch box removed in staff modal.

# Wireframe Specifications

Wireframe 1: Counter & Org Admin Dashboard Overview KPIs
```
+---------------------------------------------------------------------------------------+
| Overview                                                                              |
+---------------------------------------------------------------------------------------+
| [Cafeteria Scope: All Cafeterias]   [Time Window: 2026-09-01 to 2026-09-29] [Refresh]  |
+-------------------+-------------------+-------------------+---------------------------+
| Total sales       | Wallet Recharges  | Wallet In use     | Active Staff Members      |
| ₹4,87,350.25      | ₹2,98,640.80      | 1,452             | 8                         |
+-------------------+-------------------+-------------------+---------------------------+
```

Wireframe 2: Wallet Analytics — Counter 1 Modal
```
+---------------------------------------------------------------------------------------+
| Wallet Analytics — Counter 1                                                      [X] |
+---------------------------------------------------------------------------------------+
| [Time Window: 2026-09-29 to 2026-09-29]                           [ Reset to Today ]  |
+-------------------+-------------------+-------------------+---------------------------+
| Wallets in Use    | Money Added       | Food Sales        | Remaining Balance         |
| 14                | ₹12,500.00        | ₹8,420.00         | ₹4,080.00                 |
+-------------------+-------------------+-------------------+---------------------------+
| Blocked Wallets                       | Refunds                                       |
| 2 (Security locked)                   | ₹350.00 (1 refunds)                           |
+---------------------------------------+-----------------------------------------------+
|                                                                             [ Close ] |
+---------------------------------------------------------------------------------------+
```

Wireframe 3: Section 1 PDF Export (Balanced Symmetrical Grid)
```
+---------------------------------------------------------------------------------------+
| 1. Financial Overview                                                                 |
+---------------------------------------------------------------------------------------+
| TOTAL SALES                                                                           |
| Rs. 2,98,640                                                                          |
| Total Sales across UPI & Cash Deposits                                                |
+---------------------------+---------------------------+-------------------------------+
| Recharge                  | UPI Recharge              | Cash Recharge                 |
| Rs. 3,12,000              | Rs. 1,98,000              | Rs. 1,14,000                  |
| Total card deposits       | 42 top-ups                | 28 top-ups                    |
+---------------------------+---------------------------+-------------------------------+
| Wallet Activations        | Money Refunded            | Cancelled Top-ups             |
| 1,452 Wallets             | Rs. 13,360                | Rs. 0                         |
| Issued in period          | Returned to customers     | 0 recharges reversed          |
+---------------------------+---------------------------+-------------------------------+
```

Wireframe 4: Org Admin Current Subscription Card (Enterprise Plan)
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

# Proposed Technical Implementation Across Worktree

1. File: Frontend Money Card/src/features/dashboard/OrgAdminDashboard.tsx
- Lines 567-584:
  - StatCard label='Total sales' displaying totalPurchaseVolume.
  - StatCard label='Wallet In use' displaying filteredCardsIssuedCount.

2. File: Frontend Money Card/src/features/cards/OrgAdminCardsView.tsx
- Lines 784-895:
  - In 'Wallet Analytics — [Counter Name]' modal, remove readyCards calculation and the Ready Wallets card.
  - Set operational metrics row to grid-cols-1 sm:grid-cols-2 for Blocked Wallets and Refunds.

3. File: Frontend Money Card/src/features/analytics/analyticsPdfExport.ts
- Lines 158-228 in buildOrgAnalyticsJsPdf():
  - Symmetrical 3-column rows for Section 1 follow-up cards:
    - Row 2: Recharge, UPI Recharge, Cash Recharge.
    - Row 3: Wallet Activations, Money Refunded, Cancelled Top-ups.
    - Width calculation: cardW = (contentWidth - 6) / 3.

4. File: Frontend Money Card/src/features/subscriptions/SubscriptionsPage.tsx
- Lines 458-480:
  - Add 'Subscription Period' section between 'Resource Limits & Usage' and 'Included Features'.
  - Render 'Start Date' formatted via formatDate(subscription?.startDate).
  - Render 'Renewal Date' formatted via formatDate(subscription?.renewalDate || subscription?.endDate).

# Verification Plan
- Web App unit test execution: npm test -- --run in Frontend Money Card/ (284 tests passing).
- Web App TypeScript compiler check: npx tsc --noEmit in Frontend Money Card/ (0 errors).
- Mobile App widget and unit test execution: flutter test in Flutter Money card/ (170 tests passing).
- Mobile App static analysis: flutter analyze --no-pub in Flutter Money card/ (0 issues).
- Shorebird OTA patch validation: Patch 7 published to staging release 1.0.3+4.
- Git Status check: All commits saved to local staging branch (commit 66f4d6e).
