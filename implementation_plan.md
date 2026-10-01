# Implementation Plan - Rename Daily Activity Summary Metric Cards

![Daily Activity Summary UI Preview](C:\Users\damie\.gemini\antigravity-ide\brain\999581c9-5c30-4195-933d-3667425ed95a\counter_daily_activity_summary_metrics_1790828616364.jpg)

User Request:
In Org Admin and Counter Dashboard Staff page, in the "Counter 1 — Daily Activity Summary" modal:
- Rename "Money Loaded" to "Recharges"
- Rename "Orders Sold" to "Food Sales"
- Rename "Money Refunded" to "Refunds"

Proposed Worktree Specifications:

1. Update Metric Cards & Activity Filter in Staff Daily Activity Summary Modal
- File: Frontend Money Card/src/features/staff/StaffPage.tsx
  - In the 5-metric strip (lines 2568-2585):
    - Replace label "Money Loaded" with "Recharges"
    - Replace label "Orders Sold" with "Food Sales"
    - Replace label "Money Refunded" with "Refunds"
  - In the activity type filter dropdown (lines 2598-2602):
    - Change `<option value="RECHARGE">Money Loaded</option>` to `<option value="RECHARGE">Recharges</option>`
    - Change `<option value="PURCHASE">Orders Sold</option>` to `<option value="PURCHASE">Food Sales</option>`
    - Change `<option value="REFUND">Money Refunded</option>` to `<option value="REFUND">Refunds</option>`
  - In activity list item title formatter (lines 967, 973, 991):
    - Update `title = 'Money Loaded (Cash)'` to `title = 'Recharge (Cash)'`
    - Update `title = 'Money Loaded (UPI)'` to `title = 'Recharge (UPI)'`
    - Update `title = 'Money Refunded'` to `title = 'Refund'`

ASCII Wireframes:

Staff Modal: Counter 1 — Daily Activity Summary:
+----------------------------------------------------------------------------------------------------+
|  Counter 1 — Daily Activity Summary                                                            [X] |
+----------------------------------------------------------------------------------------------------+
|  (C1) Counter 1  [Manager]                                                      [ Today        v ] |
|                                                                                                    |
|  +----------------+----------------+----------------+----------------+----------------+            |
|  | Wallets Issued | Wallets Closed | Recharges      | Food Sales     | Refunds        |            |
|  | 42             | 08             | Rs. 14,560.00  | Rs. 8,795.50   | Rs. 1,230.15   |            |
|  +----------------+----------------+----------------+----------------+----------------+            |
|                                                                                                    |
|  [ All Activities v ]  [ Search by wallet or note...                                  ]            |
|    - All Activities                                                                                |
|    - New Wallets Issued                                                                            |
|    - Wallets Closed                                                                                |
|    - Recharges        <-- (formerly Money Loaded)                                                  |
|    - Food Sales       <-- (formerly Orders Sold)                                                   |
|    - Refunds          <-- (formerly Money Refunded)                                                |
|                                                                                                    |
|  +----------------------------------------------------------------------------------------------+  |
|  | [Cash]  Recharge (Cash)              MC-101                    +Rs. 500.00       10:24 AM    |  |
|  | [Order] Order / Meal Sold            MC-102                     Rs. 160.00       10:18 AM    |  |
|  | [Refund] Refund                      MC-105                    -Rs. 200.00       09:55 AM    |  |
|  +----------------------------------------------------------------------------------------------+  |
|                                                                                                    |
|                                                                                        [ Close ]   |
+----------------------------------------------------------------------------------------------------+

Verification Plan:
1. Automated Frontend Tests: Proactively run npm test -- --run in Frontend Money Card.
2. Type Check: Proactively run npx tsc --noEmit in Frontend Money Card.
3. Responsive Check: Confirm 5-metric strip grid remains fully responsive across narrow mobile and tablet viewports.
4. Git Commit: Autonomous local commit on branch staging with zero emojis.
