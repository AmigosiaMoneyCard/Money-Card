# Implementation Plan - Parallel Cash and UPI Metrics in Mobile Analytics

![Mobile Analytics Hub](C:\Users\damie\.gemini\antigravity-ide\brain\999581c9-5c30-4195-933d-3667425ed95a\analytics_and_mobile_action_hub_1790656747216.jpg)
![Cards Page Billing Action](C:\Users\damie\.gemini\antigravity-ide\brain\999581c9-5c30-4195-933d-3667425ed95a\cards_page_billing_rename_action_1790743908377.jpg)

Proposed Worktree Specifications

1. Format Sub-Metrics Parallel to Each Other on a Single Row
- File: Flutter Money card/lib/features/analytics/analytics_screen.dart
  - In _buildCompactMetricCard:
    - Replace the vertical column stacking of line1Text and line2Text with a single horizontal Row(mainAxisAlignment: MainAxisAlignment.spaceBetween).
    - Left element: line1Text (for example: Cash: Rs. 18k or Active: 32) aligned to left.
    - Right element: line2Text (for example: UPI: Rs. 6.8k or Settled: 16) aligned to right with TextAlign.end.
    - Reduces card height from stacked 4-line layout to a sleek 3-line layout (Header, Total, Parallel Subtext).
  - Helper _formatCompactSubAmount:
    - Cleanly formats sub-amounts (without trailing .00 for whole numbers, using k/L for large sums) to ensure Cash and UPI fit comfortably side-by-side on any mobile screen width without text wrapping.
  - Box Content Alignment:
    1. Recharge Amount: Cash: Rs. X parallel to UPI: Rs. Y.
    2. Refund Amount: Cash: Rs. X parallel to UPI: Rs. 0.
    3. Canceled Recharge Amount: Cash: Rs. X parallel to UPI: Rs. 0.
    4. Total Sales: Cash: Rs. X parallel to UPI: Rs. Y.
    5. Wallet Activation: Active: N parallel to Settled: N.
    6. Recharge Count: Cash: N parallel to UPI: N.
    7. Refund Count: Cards: N parallel to Ret: Rs. X.
    8. Canceled Recharges: Void: N parallel to Ded: Rs. X.

UI Layout & ASCII Wireframe

Recharge Tab (Parallel Cash and UPI in Each Box):
+-------------------------------------------------------+
|  [<-]  Analytics  •  Main Cafeteria                   |
|  [  RECHARGE  ]                 [     MENU     ]      |
+-------------------------------------------------------+
| [2026-09-30] to [2026-09-30]                          |
| [Apply]  [Reset to Today]                 [View PDF]  |
+-------------------------------------------------------+
| +------------------------+ +------------------------+ |
| | RECHARGE AMOUNT        | | REFUND AMOUNT          | |
| | Rs. 24,800.00          | | Rs. 320.00             | |
| | Cash: Rs.18k  UPI:Rs.6k8 | Cash: Rs.320   UPI:Rs.0 | |
| +------------------------+ +------------------------+ |
| +------------------------+ +------------------------+ |
| | CANCELED RECHARGE      | | TOTAL SALES            | |
| | Rs. 500.00             | | Rs. 43,250.00          | |
| | Cash: Rs.500  UPI:Rs.0 | | Cash: Rs.30k  UPI:Rs.13k | |
| +------------------------+ +------------------------+ |
| +------------------------+ +------------------------+ |
| | WALLET ACTIVATION      | | RECHARGE COUNT         | |
| | 48 Cards               | | 64 Recharges           | |
| | Active: 32  Settled: 16| | Cash: 42       UPI: 22 | |
| +------------------------+ +------------------------+ |
| +------------------------+ +------------------------+ |
| | REFUND COUNT           | | CANCELED RECHARGES     | |
| | 4 Refunds              | | 2 Recharges            | |
| | Cards: 4      Ret:Rs.320 | Void: 2      Ded:Rs.500 | |
| +------------------------+ +------------------------+ |
+-------------------------------------------------------+

Verification & Automated Test Execution Plan
1. Flutter Unit & Widget Tests: Proactively run flutter test across analytics tests and entire mobile suite.
2. Flutter Static Analysis: Run flutter analyze --no-pub to verify 0 warnings.
3. Full Test Parity: Verify frontend (npm test -- --run) and backend (npm test).
4. Version Control: Autonomous local commit on branch staging with zero emojis.
