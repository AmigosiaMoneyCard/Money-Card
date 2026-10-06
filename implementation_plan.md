# Implementation Plan: System-Wide Audit Fixes

## Overview
Address and fix 6 specific issues identified during the system-wide audit across Backend, Frontend Web, and Flutter Mobile:
1. Isolate counter sales and financial volume metrics in Backend Analytics so Total Sales only counts food sold at the selected counter.
2. Preserve original order metadata when cancelling purchase orders in Backend Sessions controller.
3. Exclude cancelled orders from Customer PWA Billing Receipts and PDF exports.
4. Correctly display cancelled recharge transactions with a Cancelled badge in the Customer PWA.
5. Fix Mobile Digital Receipt Dialog to properly accept valid zero previous balances.
6. Align dashboard metric card labels to "Cancelled Recharges".

## Visual Reference
![Customer Portal and Analytics Dashboard Preview](C:/Users/damie/.gemini/antigravity-ide/brain/5d95263b-cd5f-4577-8545-14c5773f5f9e/mobile_pos_order_search_and_bill_1791177313177.jpg)

## ASCII Wireframes

### Customer Portal Recharge History (Active vs Cancelled)
```
+-------------------------------------------------------------+
| [<] Recharge History                                        |
+-------------------------------------------------------------+
|                                                             |
| +---------------------------------------------------------+ |
| | (v) Recharge (CASH)                         +Rs. 200.00 | |
| |     06 Oct 2026, 10:15 AM                   [ SUCCESS ] | |
| +---------------------------------------------------------+ |
|                                                             |
| +---------------------------------------------------------+ |
| | (x) Recharge (UPI)                             Rs. 100.00| |
| |     06 Oct 2026, 09:30 AM                   [ CANCELLED ] | |
| +---------------------------------------------------------+ |
|                                                             |
+-------------------------------------------------------------+
```

### Dashboard Metric Cards Alignment
```
+-------------------+ +-------------------+ +-------------------+ +-------------------+
| Total Sales       | | Recharge Amount   | | Cancelled Recharges| | Refunds           |
| Rs. 1,450.00      | | Rs. 3,200.00      | | Rs. 300.00        | | Rs. 150.00        |
| 12 orders         | | 18 recharges      | | 2 cancelled       | | 1 refunds         |
+-------------------+ +-------------------+ +-------------------+ +-------------------+
```

## Technical Changes Required

1. Backend Money Card/src/controllers/analytics.controller.ts:
- In getOverview():
  - When effectiveBranchId is present, ensure totalPurchaseVolume and foodOrdersCount only accumulate transactions where tx.branchId === effectiveBranchId.
  - Ensure totalRechargeVolume, cashRechargeVolume, and upiRechargeVolume only accumulate if tx.branchId === effectiveBranchId.
  - Ensure totalRefundVolume only accumulates if tx.branchId === effectiveBranchId.
  - Scope allProductDemandMap to purchases matching tx.branchId === effectiveBranchId when effectiveBranchId is active.

2. Backend Money Card/src/controllers/sessions.controller.ts:
- In cancelOrder():
  - Spread ...existingMeta into cancelMeta so orderNumber, counterName, counterId, items list, and other payload attributes are preserved alongside isCancelled: true.

3. Backend Money Card/src/controllers/public.controller.ts:
- In getPublicSessionReceipts():
  - Filter out transactions where rawMeta?.isCancelled is true so cancelled orders are never returned as active billing receipts.
- In getPublicSessionTransactions():
  - Set status to 'CANCELLED' if (tx.items as any)?.isCancelled is true, otherwise 'SUCCESS'.

4. Frontend Money Card/src/features/portal/PortalTransactionsPage.tsx:
- In the recharge list rendering:
  - If txn.status === 'CANCELLED', display a muted styling with a Cancelled badge and neutral text instead of green +Rs. currency amount.

5. Frontend Money Card/src/features/portal/portalReceiptPdfExport.ts:
- Filter out transactions and receipts where items or metadata indicate isCancelled: true.

6. Flutter Money card/lib/widgets/receipt/digital_receipt_dialog.dart:
- In _buildOverviewTab or Builder in DigitalReceiptDialog:
  - Use widget.bill.previousBalance directly instead of the widget.bill.previousBalance > 0 condition that broke Rs. 0.00 balances.

7. Frontend Money Card/src/features/dashboard/SuperAdminDashboard.tsx & OrgAdminDashboard.tsx:
- Update "Cancelled Top-ups" label to "Cancelled Recharges".

## Verification Plan
1. Backend test suite: npm test in Backend Money Card (all 124 tests passing).
2. Backend typecheck: npx tsc --noEmit in Backend Money Card (0 errors).
3. Frontend test suite: npm test -- --run in Frontend Money Card (all 312 tests passing).
4. Frontend typecheck: npx tsc --noEmit in Frontend Money Card (0 errors).
5. Flutter analysis: flutter analyze --no-pub in Flutter Money card (0 errors).
6. Flutter tests: flutter test in Flutter Money card (all 186 tests passing).
