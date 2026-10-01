# Implementation Plan — Activity Summary Labels, Mobile Recharge Choice UI, Cancel Guard & Menu Page Fix

Address the user requests across the Web Admin and Mobile POS apps:
1. Web Staff Daily Activity Summary: Rename to "Wallet issued" and "Wallet closed", and display the card name/number instead of "Settled".
2. Mobile Recharge: Require explicit selection between Cash and UPI (no direct default to Cash) with prominent, high-contrast selectable UI cards.
3. Mobile Recharges History: Make the "Cancel Recharge" button inaccessible when a top-up cannot be cancelled (insufficient balance or settled session).
4. Mobile Menu Page: Fix product catalog loading and reflection so all menu items appear on the Menu page.

---

## Proposed Changes

### 1. Web App — Staff Daily Activity Summary
File: `Frontend Money Card/src/features/staff/StaffPage.tsx`
- In `getActivityDetails`:
  - `CARD_ACTIVATION`:
    - Set `title = 'Wallet issued'` (was `'New Wallet Issued'`)
    - Set `badgeLabel = 'Issued'`
  - `CARD_SETTLEMENT`:
    - Set `title = 'Wallet closed'` (was `'Wallet Closed / Returned'`)
    - Set `badgeLabel = 'Closed'`
    - When settled: replace `'Settled'` in `amountText` with the card identifier/name: `act.cardNumber ? `#${act.cardNumber}` : (act.customerName || 'Closed')`.
- In Activity Filter Dropdown (lines 2593-2598):
  - Change `<option value="CARD_ACTIVATION">New Wallets Issued</option>` to `<option value="CARD_ACTIVATION">Wallet issued</option>`
  - Change `<option value="CARD_SETTLEMENT">Wallets Closed</option>` to `<option value="CARD_SETTLEMENT">Wallet closed</option>`

### 2. Mobile App — Recharge Cash vs UPI Explicit Selection & Visible UI
File: `Flutter Money card/lib/providers/recharge_provider.dart`
- In `RechargeState`:
  - Change `paymentMethod` to nullable `PaymentMethod? paymentMethod = null` (no pre-selected default to Cash).
  - Update `canSubmit`: require `paymentMethod != null && amount > 0 && amount <= 9999 && !isSubmitting`.
- In `RechargeNotifier`:
  - `reset()` resets `paymentMethod` to `null`.
  - Add `setPaymentMethod(PaymentMethod? method)`.
File: `Flutter Money card/lib/features/payments/recharge_screen.dart`
- Replace `SegmentedButton` with two large, prominent, high-contrast selection cards side-by-side:
  - **CASH card**:
    - Unselected: White background, slate border, slate text.
    - Selected: Emerald-50 background, 2px solid emerald-600 border, emerald-900 bold text, checkmark badge.
  - **UPI card**:
    - Unselected: White background, slate border, slate text.
    - Selected: Purple-50 background, 2px solid purple-600 border, purple-900 bold text, checkmark badge.
- If no method is selected, show an inline guidance notice: "Please select Cash or UPI to proceed."
- Keep the submit button disabled until a method is chosen.

### 3. Mobile App & Backend — Inaccessible Cancel Top-up When Non-Cancellable
File: `Backend Money Card/src/controllers/sessions.controller.ts`
- In `listRecharges`:
  - For each transaction, determine:
    `const canCancel = !isCancelled && t.session?.status === 'ACTIVE' && Number(t.session?.balance ?? 0) >= t.amount;`
  - Include `canCancel`, `sessionStatus: t.session?.status`, and `sessionBalance: Number(t.session?.balance ?? 0)` in each transaction response item.
File: `Flutter Money card/lib/models/transaction.dart`
- Add `final bool canCancel;` to `Transaction` model (parsed from JSON, defaults to `!isCancelled`).
File: `Flutter Money card/lib/features/recharges/recharges_screen.dart`
- In `_buildTransactionCard`:
  - If `tx.isCancelled`: display `CANCELLED` badge.
  - Else if `!tx.canCancel`: display a disabled `Cannot Void` badge (with tooltip/note) instead of the active `Cancel Top-up` button.
  - Else: display the active `Cancel Top-up` button.
File: `Flutter Money card/lib/features/payments/recharge_screen.dart`
- In `_showTopUpHistorySheet`:
  - Check `final canCancel = !t.isCancelled && session.isActive && session.balance >= t.amount;`
  - If `!canCancel`, show `CANNOT VOID` badge instead of the clickable `Cancel Recharge` button.
File: `Flutter Money card/lib/features/sessions/session_details_screen.dart`
- In timeline card (line 672):
  - Check `if (isRecharge && !txn.isCancelled && session.isActive && session.balance >= txn.amount)` before rendering the Cancel button.

### 4. Mobile App & Backend — Menu Reflecting in Menu Page Fix
File: `Backend Money Card/src/controllers/products.controller.ts`
- In `getProducts`:
  - When filtering by `branchId`, include org-level items with `branchId: null`:
    ```ts
    if (branchId && branchId !== 'ALL') {
      whereClause.OR = [
        { branchId },
        { branchId: null },
        { inventoryItems: { some: { branchId } } },
      ];
    }
    ```
File: `Flutter Money card/lib/services/product_service.dart`
- In `getProducts`:
  - When `branchId` is empty or null, omit `branchId` query param so org products return rather than an empty query.
File: `Flutter Money card/lib/providers/pos_cart_provider.dart`
- In `PosCatalogNotifier.loadProducts()`:
  - Remove hardcoded `status: 'ACTIVE'` query parameter so all menu items (both active and inactive) are fetched into the catalog.
  - Allow optional `branchId` parameter: `Future<void> loadProducts({String? branchId, bool force = false})`.
- In `PosCatalogState`:
  - Add `List<Product> get managementProducts` getter: returns all menu items matching category and search (without filtering out inactive items), so the Menu management screen reflects the complete menu.
File: `Flutter Money card/lib/features/products/products_screen.dart`
- Use `catalogState.managementProducts` instead of `filteredProducts` so staff can see and manage all menu items.
- In `initState`, retrieve `currentBranch` and trigger `loadProducts(force: true)`.

---

## ASCII Wireframes

### Mobile App — Recharge Payment Method Selector (High-Contrast Tiles)
```
+-------------------------------------------------------------+
| Payment Method                                              |
|                                                             |
| +-------------------------+     +-------------------------+ |
| | [Payments Icon]         |     | [QR / Wallet Icon]      | |
| |                         |     |                         | |
| | CASH                    |     | UPI                     | |
| | Physical Cash           |     | Online Transfer         | |
| |                         |     |                         | |
| | [ Selected ✓ ]          |     | [ Select ]              | |
| +-------------------------+     +-------------------------+ |
|   (Emerald Border / Tint)         (Clean Slate Border)      |
|                                                             |
| Recharge Amount (₹)                                         |
| [ ₹ 200                                                   ] |
|                                                             |
| [ Recharge Wallet                                         ] |
+-------------------------------------------------------------+
```

### Mobile App — Recharges History (Non-Cancellable Top-up Protected)
```
+-------------------------------------------------------------+
| +₹500.00  [ Cash ]                          [ Cannot Void ] |
| Wallet: MC-101   Customer: John Doe                         |
| (Customer already spent balance — void is locked)           |
+-------------------------------------------------------------+
| +₹200.00  [ UPI ]                       [ Cancel Top-up ]   |
| Wallet: MC-102   Customer: Alice Smith                      |
| (Balance is intact — void is permitted)                     |
+-------------------------------------------------------------+
```

### Web App — Staff Daily Activity Summary
```
+----------------------------------------------------------------------------------------------+
| 09:30 AM    Wallet issued   [Issued]                              #MC-101                    |
| 10:15 AM    Recharge (Cash) [Cash]                                +₹500.00                   |
| 10:45 AM    Wallet closed   [Closed]                              #MC-101                    |
+----------------------------------------------------------------------------------------------+
```

---

## Verification Plan

### Automated Tests
- Run `npx tsc --noEmit` in `Frontend Money Card` (0 errors).
- Run `npm test -- --run` in `Frontend Money Card` (all 284 vitest unit tests pass).
- Run `flutter analyze --no-pub` in `Flutter Money card` (0 issues).
- Run `flutter test` in `Flutter Money card` (verify unit/widget tests pass).
- Run backend tests: `npm test` in `Backend Money Card`.

### Manual Verification
- Open Web Staff page -> click Daily Activity Summary on any staff member -> verify "Wallet issued" and "Wallet closed" titles appear with card number/name instead of "Settled".
- Open Mobile POS -> Recharge -> verify Cash is NOT pre-selected; test tapping Cash and UPI; confirm clear, visible styling; submit enabled only after selecting a method.
- Open Mobile POS -> Recharges History -> verify transactions whose card balance has already been spent show "Cannot Void" and cannot be clicked.
- Open Mobile POS -> Menu page -> verify all products appear properly in the catalog.
