# Implementation Plan: PWA Billing Receipt Menu Names and Total Bill Update

## Overview
In the Customer PWA Billing Receipt screen (/portal/receipts), replace the negative "Total Deducted" label with a clean "Total Bill" label and ensure all purchased menu item names, quantities, and prices are clearly displayed for each order.

## Visual Design Reference
![Customer Portal and Mobile POS Bill Preview](C:/Users/damie/.gemini/antigravity-ide/brain/5d95263b-cd5f-4577-8545-14c5773f5f9e/mobile_pos_order_search_and_bill_1791177313177.jpg)

## ASCII Wireframe

```
+-------------------------------------------------------------+
| [<] Billing Receipt                   [ Download PDF Receipt ]|
+-------------------------------------------------------------+
|                                                             |
| +---------------------------------------------------------+ |
| | (clock) 06 Oct 2026, 10:15 AM  Order #104 (Counter 1) [PAID] |
| |---------------------------------------------------------| |
| | Chicken Biriyani                                        | |
| |   1 x Rs. 150.00                              Rs. 150.00 | |
| |---------------------------------------------------------| |
| | Fresh Lime Juice                                        | |
| |   2 x Rs. 30.00                                Rs. 60.00 | |
| |---------------------------------------------------------| |
| | Total Bill                                    Rs. 210.00 | |
| +---------------------------------------------------------+ |
|                                                             |
| +---------------------------------------------------------+ |
| | (clock) 06 Oct 2026, 09:40 AM  Order #102 (Counter 1) [PAID] |
| |---------------------------------------------------------| |
| | Veg Sandwich                                            | |
| |   1 x Rs. 70.00                                Rs. 70.00 | |
| |---------------------------------------------------------| |
| | Total Bill                                     Rs. 70.00 | |
| +---------------------------------------------------------+ |
|                                                             |
+-------------------------------------------------------------+
```

## Technical Changes Required

1. Backend Money Card/src/controllers/public.controller.ts:
- In getPublicSessionReceipts():
  - Parse tx.items robustly (handling string JSON or object).
  - Extract items array from rawMeta.items (orderPayload format) or rawMeta if direct array.
  - Map each item with itemName, quantity, unitPrice, and totalPrice.
  - Add fallback item { itemName: 'Food Purchase', quantity: 1, unitPrice: tx.amount, totalPrice: tx.amount } if item array is empty for a positive purchase.
  - Include orderNumber and counterName in the receipt object for enriched customer context.

2. Frontend Money Card/src/types/userPortal.ts:
- Update PublicReceipt interface to include optional orderNumber?: number and counterName?: string.

3. Frontend Money Card/src/features/portal/PortalReceiptsPage.tsx:
- Replace "Total Deducted" label with "Total Bill".
- Change -formatCurrency(rcpt.totalAmount) to positive formatCurrency(rcpt.totalAmount).
- Render menu item names prominently in font-semibold text-slate-900.
- Render quantity and unit price cleanly underneath each item name.
- Display orderNumber and counterName in receipt header when available.
- Ensure graceful fallback if items list is empty.

4. Frontend Money Card/src/features/portal/portalReceiptPdfExport.ts:
- Verify itemized food purchase items populate seamlessly into PDF generation.

5. Frontend Money Card/src/__tests__/portalRechargeAndBillingReceipts.test.ts:
- Add comprehensive unit tests verifying menu item extraction, fallback handling, and "Total Bill" presentation.

## Verification Plan
1. Backend test run: npm test in Backend Money Card.
2. Frontend test run: npm test -- --run in Frontend Money Card.
3. TypeScript check: npx tsc --noEmit in Frontend Money Card.
4. Verify PWA Billing Receipt screen displays menu item names and positive Total Bill.
