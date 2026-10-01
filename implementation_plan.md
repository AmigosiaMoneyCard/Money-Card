# Implementation Plan: Counter Dashboard Customer History and Empty Customer Detail Neutrality

## Overview
Add the Customer History box and modal to the Counter Dashboard Wallets page (`CounterStaffCardsView.tsx`), establishing full parity with Org Admin (`OrgAdminCardsView.tsx`). Additionally, within the Customer History modal (such as `Customer History — block 1`) and related modals, if no customer name or phone number is entered, leave the customer field blank instead of displaying the placeholder "Walk-in Customer".

![Customer History Counter View and Blank Customer Layout](file:///C:/Users/damie/.gemini/antigravity-ide/brain/999581c9-5c30-4195-933d-3667425ed95a/customer_history_counter_view_1790846535358.jpg)

---

## Wireframe & Layout Specifications

### 1. Counter Dashboard: Wallets and Customer History Page Header & Actions

```
+---------------------------------------------------------------------------------------------------------------+
| [CreditCard] Wallets & Customer History  [ N Live Active ]       [Customer History]  [Refresh]               |
+---------------------------------------------------------------------------------------------------------------+
| [Search by wallet ID or customer...]                                                                          |
+---------------------------------------------------------------------------------------------------------------+
| Wallet ID       | Live Balance  | Actions                                                                     |
|-----------------+---------------+-----------------------------------------------------------------------------|
| MC 101          | Rs. 250.00    | [Customer History]  [Wallet Analytics]  [Wallet Details]                      |
| MC 102          | Rs. 120.00    | [Customer History]  [Wallet Analytics]  [Wallet Details]                      |
+---------------------------------------------------------------------------------------------------------------+
```

### 2. Customer History Modal (Counter Scoped, e.g. `Customer History — block 1`)

```
+---------------------------------------------------------------------------------------------------------------+
| Customer History — block 1                                                                              [ X ] |
|---------------------------------------------------------------------------------------------------------------|
| [ Search by customer, phone, or wallet ID... ]                                            [ N Sessions ]      |
+---------------------------------------------------------------------------------------------------------------+
| Customer                                    | Wallet ID                          | Action                     |
|---------------------------------------------+------------------------------------+----------------------------|
| [Avatar "A"] Alice Green                    | MC 101                             | [ View ]                   |
|              +91 98765 43210                |                                    |                            |
|---------------------------------------------+------------------------------------+----------------------------|
| [User Icon]                                 | MC 102                             | [ View ]                   |
|              (blank name & phone)           |                                    |                            |
|---------------------------------------------+------------------------------------+----------------------------|
| [User Icon]                                 | MC 103                             | [ View ]                   |
|              +91 91234 56789 (phone only)   |                                    |                            |
+---------------------------------------------------------------------------------------------------------------+
|                                                                                               [ Close ]       |
+---------------------------------------------------------------------------------------------------------------+
```

---

## Worktree Changes

### 1. Counter Staff Wallets View (`Frontend Money Card/src/features/cards/CounterStaffCardsView.tsx`)
- State management:
  - Add `isCustomerHistoryOpen`, `historySearchQuery`, `counterSessions`, `isLoadingSessions`, `selectedSessionForDetail`, `sessionTxns`, and `isLoadingTxns`.
- Handlers:
  - Add `handleOpenCustomerHistory(card?)`: Fetches sessions for the counter via `apiService.sessions.getSessions({ branchId: staffBranchId, limit: 100 })`. If triggered from a specific card, presets `historySearchQuery` to that card's identifier.
  - Add `handleOpenSessionDetail(session)`: Fetches individual session transactions via `apiService.sessions.getSessionTransactions(session.id)`.
- UI Integration:
  - Add `[ Customer History ]` button in the header bar next to `Refresh`.
  - Add `[ Customer History ]` action button in each live card row to the left of `[ Wallet Analytics ]`, restoring the 3-action button group parity with Org Admin.
  - Render `Customer History — ${branchName}` modal with search input, session badge count, and session list.
  - Render `Session Details — Wallet ...` modal for transaction inspection.
  - If no customer name is entered, render an empty string / blank space instead of `"Walk-in Customer"`.
  - In `Card Details Modal` (line 450), replace `"Walk-in Customer"` fallback with blank text.
  - Remove emoji `⚠️` from search error message on line 324 to adhere to the strict zero-emoji policy.

### 2. Org Admin Wallets View (`Frontend Money Card/src/features/cards/OrgAdminCardsView.tsx`)
- In `Customer History — ${selectedBranchForHistory.name}` modal:
  - Replace `{session.customerName || 'Walk-in Customer'}` with `{session.customerName || ''}`. If name is not provided, display blank space.
- In `Session Details — Wallet ...` modal:
  - Replace `{selectedSessionForDetail.customerName || 'Walk-in Customer'}` with `{selectedSessionForDetail.customerName || ''}`.
- In `Branch Card Details Modal` (`selectedBranchForDetails`):
  - Replace `{card.activeSession.customerName || 'Walk-in Customer'}` with `{card.activeSession.customerName || ''}`.

### 3. Sessions Page (`Frontend Money Card/src/features/sessions/SessionsPage.tsx`)
- Update customer name rendering on lines 349 and 514 to leave blank when no customer name is entered.

### 4. Tests (`Frontend Money Card/src/__tests__/counterCardsLiveAndSearch.test.ts`)
- Update action button expectations to include `Customer History` alongside `Card Analytics` and `Card Details`.
- Add test coverage for blank customer name display when neither name nor phone is provided.

---

## Verification Plan

### Automated Tests
- Run `npm test -- --run` in `Frontend Money Card`: Ensure all 284+ tests pass.
- Run `npx tsc --noEmit` in `Frontend Money Card`: Ensure zero TypeScript compilation errors.
- Run `flutter test` and `flutter analyze --no-pub` in `Flutter Money card`: Verify mobile app remains unaffected and clean.

### Manual Verification
- Log in as Counter Staff (e.g. counter `block 1`).
- Navigate to `/cards` (Wallets & Customer History).
- Verify the `[ Customer History ]` button appears in the header and in each card's actions.
- Click `[ Customer History ]` and confirm the modal opens titled `Customer History — block 1`.
- Verify sessions without a customer name or number display a blank customer name without the "Walk-in Customer" string.
- Click `[ View ]` on a session to inspect transaction breakdown and verify the customer name remains blank when not entered.
