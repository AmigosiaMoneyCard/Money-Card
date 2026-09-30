# Implementation Plan - Cards Page Billing Rename and Two-Column Compact Grid Analytics

![Cards Page Billing Action](C:\Users\damie\.gemini\antigravity-ide\brain\999581c9-5c30-4195-933d-3667425ed95a\cards_page_billing_rename_action_1790743908377.jpg)
![Mobile Analytics Hub](C:\Users\damie\.gemini\antigravity-ide\brain\999581c9-5c30-4195-933d-3667425ed95a\analytics_and_mobile_action_hub_1790656747216.jpg)

Proposed Worktree Specifications

1. Rename "New POS Purchase" to "Billing" in Cards Details Screen
- File: Flutter Money card/lib/features/cards/card_details_screen.dart
  - Line 583: Update AppOutlinedButton label from 'New POS Purchase' to 'Billing'.
  - Route /app/pos/${activeSession.id}, icon Icons.point_of_sale, and AppPermission.purchase check remain untouched.
  - Aligns terminology with the scanned QR sheet and POS checkout screen.

2. Analytics Recharge Tab: Two-Column Compact Grid
- File: Flutter Money card/lib/features/analytics/analytics_screen.dart
  - In _buildOverviewTab:
    - Replace the 8 full-width, vertically stacked bulky cards with a responsive 2-column grid layout (4 rows of 2 cards).
    - Preserves all 8 metric boxes and their data:
      1. RECHARGE AMOUNT: Total volume, Cash breakdown, UPI breakdown.
      2. REFUND AMOUNT: Total volume, Cash breakdown, UPI: Rs. 0.00.
      3. CANCELED RECHARGE AMOUNT: Total volume, Cash Voided, UPI Voided: Rs. 0.00.
      4. TOTAL SALES: Net collected, Net Cash, Net UPI.
      5. WALLET ACTIVATION: Cards Issued count, Active sessions, Settled sessions.
      6. RECHARGE COUNT: Total recharges, Cash transactions, UPI transactions.
      7. REFUND COUNT: Total refunds, Processed cards, Returned amount.
      8. CANCELED RECHARGES: Total voided top-ups, Voided count, Deducted amount.
    - Compact Metric Card Design (_buildCompactMetricCard):
      - Card padding: 12px with subtle border (#E2E8F0) and 10px rounded corners.
      - Header: 14px icon + 10px uppercase bold title.
      - Primary metric: 18px bold text in accent color.
      - Breakdown: subtle, clean 11px inline text lines (for example: "Cash: Rs. 5,000" and "UPI: Rs. 2,500") without heavy colored background containers.
      - Reduces vertical page height by more than 50% while retaining every single metric.

3. Analytics Menu Tab: Two-Column Compact Grid & Minimalist List
- File: Flutter Money card/lib/features/analytics/analytics_screen.dart
  - In _buildMenuAnalyticsTab:
    - Display the summary cards in a clean 2-column compact grid:
      - Row 1: Food Sales (Rs. X.XX, N orders) and Food Quantity (N items sold).
      - Row 2: Cancelled Orders (N orders, Rs. X.XX voided).
    - Keep "ALL ORDERED MENU ITEMS" ExpansionTile with clean, minimalist item rows.

UI Layout & ASCII Wireframes

Cards Details Screen (Action Buttons):
+------------------------------------------+
|  [<-]  Wallet MC-101                     |
+------------------------------------------+
| +--------------------------------------+ |
| | MC-101   [Cycle 1]          [ACTIVE] | |
| | Current Balance        Customer:     | |
| | Rs. 450.00             John Doe      | |
| +--------------------------------------+ |
|                                          |
| Action Buttons:                          |
| [ + Recharge ]                           |
| [ Billing ]                              |  <-- Renamed from "New POS Purchase"
| [ Return & Refund ]                      |
| [ Block Wallet ]                         |
+------------------------------------------+

Analytics Recharge Tab (Two-Column Compact Grid):
+------------------------------------------+
|  [<-]  Analytics  •  Main Cafeteria      |
|  [  RECHARGE  ]      [     MENU     ]    |
+------------------------------------------+
| [2026-09-30] to [2026-09-30]             |
| [Apply]  [Reset to Today]    [View PDF]  |
+------------------------------------------+
| +-------------------+ +----------------+ |
| | RECHARGE AMOUNT   | | REFUND AMOUNT  | |
| | Rs. 24,800.00     | | Rs. 320.00     | |
| | Cash: Rs. 18,000  | | Cash: Rs. 320  | |
| | UPI:  Rs. 6,800   | | UPI:  Rs. 0    | |
| +-------------------+ +----------------+ |
| +-------------------+ +----------------+ |
| | CANCELED RECHARGE | | TOTAL SALES    | |
| | Rs. 500.00        | | Rs. 43,250.00  | |
| | Voided: Rs. 500   | | Cash: Rs. 30k  | |
| | UPI:    Rs. 0     | | UPI:  Rs. 13k  | |
| +-------------------+ +----------------+ |
| +-------------------+ +----------------+ |
| | WALLET ACTIVATION | | RECHARGE COUNT | |
| | 48 Cards Issued   | | 64 Recharges   | |
| | Active: 32        | | Cash: 42 txns  | |
| | Settled: 16       | | UPI:  22 txns  | |
| +-------------------+ +----------------+ |
| +-------------------+ +----------------+ |
| | REFUND COUNT      | | CANCELED COUNT | |
| | 4 Refunds         | | 2 Recharges    | |
| | Processed: 4      | | Voided: 2      | |
| | Returned: Rs. 320 | | Deducted: Rs500| |
| +-------------------+ +----------------+ |
+------------------------------------------+

Analytics Menu Tab (Two-Column Compact Grid):
+------------------------------------------+
|  [<-]  Analytics  •  Main Cafeteria      |
|  [  RECHARGE  ]      [     MENU     ]    |
+------------------------------------------+
| +-------------------+ +----------------+ |
| | FOOD SALES        | | FOOD QUANTITY  | |
| | Rs. 18,450.00     | | 142 Items      | |
| | 38 orders placed  | | Total sold     | |
| +-------------------+ +----------------+ |
| +--------------------------------------+ |
| | CANCELLED ORDERS                     | |
| | 2 Orders  •  Rs. 240.00 voided       | |
| +--------------------------------------+ |
|                                          |
| v ALL ORDERED MENU ITEMS (12 items)      |
|   Veg Biryani (42 units)     Rs. 5,040   |
|   Masala Dosa (35 units)     Rs. 2,800   |
|   Filter Coffee (65 units)   Rs. 1,300   |
+------------------------------------------+

Verification & Automated Test Execution Plan
1. Flutter Unit & Widget Tests: Run flutter test autonomously across all analytics and card tests.
2. Flutter Static Analysis: Run flutter analyze --no-pub to verify 0 warnings.
3. Full Test Parity: Proactively run frontend (npm test -- --run) and backend (npm test).
4. Version Control: Autonomous local commit on branch staging with zero emojis.
