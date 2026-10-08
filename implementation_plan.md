# Implementation Plan — Block Cards Support, Clean Blocked Reason Format, and Customer Portal Removal

## Overview
This plan implements three specific user requirements across the Money Card system:
1. Blocked Reason Display: In Wallets & Customer History (Blocked Wallets table), instead of `[Blocked by Manager (STAFF - Counter 1)] Lost or Stolen Wallet...`, format it cleanly as `Blocked by (counter manager name) - (Reason)` without brackets, without role/branch clutter, and without ellipsis truncation (`...` or `....`).
2. Customer Portal Removal: In Org Admin Wallets and Counter Admin Wallets & Customer History, remove all Customer Portal buttons (from top header and table row actions) so users go straight to wallet management actions.
3. Card Blocking for Counter Admin and Org Admin: Add card blocking actions and an intuitive Block Wallet modal to both Counter Admin (`CounterStaffCardsView`) and Org Admin (`OrgAdminCardsView`) with full backend sync and mobile parity.

---

## Visual UI Sketch
![Wallets and Customer History Blocked Reason and Card Blocking](file:///C:/Users/damie/.gemini/antigravity-ide/brain/40124c13-8182-4da5-8dae-66d3097486e9/block_card_clean_reason_wallets_sketch_1791363462902.jpg)

---

## UI Layout & ASCII Wireframes

### 1. Org Admin & Counter Admin Header (Customer Portal Removed)
```
+--------------------------------------------------------------------------------------------------------+
| [Card Icon] Wallets & Customer History                                                  [ Refresh ]    |
+--------------------------------------------------------------------------------------------------------+
| [ Counters Tab ]  [ Blocked Wallets Tab (N) ]                                                          |
+--------------------------------------------------------------------------------------------------------+
```

### 2. Counter Admin Live Active Cards Table (Customer Portal Removed, Block Wallet Added)
```
+--------------------------------------------------------------------------------------------------------+
| Coupon/Card ID    Customer          Live Balance     Actions                                           |
+--------------------------------------------------------------------------------------------------------+
| KD1IRUG9          Alex Rivera       INR 450          [ History ] [ Analytics ] [ Details ] [ Block ]   |
| KD1NIICJY                           INR 950          [ History ] [ Analytics ] [ Details ] [ Block ]   |
+--------------------------------------------------------------------------------------------------------+
```

### 3. Org Admin Counter Overview (Customer Portal Removed)
```
+--------------------------------------------------------------------------------------------------------+
| Cafeteria Counter    Active Wallets    Total Balance    Actions                                        |
+--------------------------------------------------------------------------------------------------------+
| Counter 1            12 Wallets        INR 5,400        [ History ] [ Analytics ] [ Details (12) ]     |
+--------------------------------------------------------------------------------------------------------+
```

### 4. Org Admin Counter Wallet Details Modal (Block Wallet Action Added)
```
+--------------------------------------------------------------------------------------------------------+
| Wallet Details — Counter 1                                                                         [X] |
+--------------------------------------------------------------------------------------------------------+
| Card/Coupon ID    Status       Live Customer      Balance       Actions                                |
+--------------------------------------------------------------------------------------------------------+
| KD1IRUG9          Active       Alex Rivera        INR 450       [ Block Wallet ]                       |
| KD1J2K3L          Available    —                  INR 0         [ Block Wallet ]                       |
+--------------------------------------------------------------------------------------------------------+
|                                                                                              [ Close ] |
+--------------------------------------------------------------------------------------------------------+
```

### 5. Block Wallet Confirmation Modal
```
+--------------------------------------------------------------------------------------------------------+
| [Shield Icon] Block Wallet KD1IRUG9                                                                [X] |
+--------------------------------------------------------------------------------------------------------+
| Are you sure you want to block this wallet? It will be disabled for purchases and recharges.          |
|                                                                                                        |
| Block Reason:                                                                                          |
| [ Lost or Stolen Wallet                                                                            v ] |
|                                                                                                        |
| Additional Notes (Optional):                                                                           |
| [ Enter optional details...                                                                          ] |
|                                                                                                        |
|                                                                     [ Cancel ]  [ Confirm Block ]      |
+--------------------------------------------------------------------------------------------------------+
```

### 6. Blocked Wallets Table (Customer Portal Removed, Clean Reason, No Ellipsis)
```
+---------------------------------------------------------------------------------------------------------------------------------------+
| Wallet ID     Customer    Locked Balance   Blocked Reason                                 Blocked By   Blocked Date   Actions         |
+---------------------------------------------------------------------------------------------------------------------------------------+
| KD1NIICJY                 INR 950          Blocked by Manager - Lost or Stolen Wallet     Manager      7 Oct 2026     [ History ] [ Unblock ] |
+---------------------------------------------------------------------------------------------------------------------------------------+
```

---

## Technical Design & Component Breakdown

### 1. Frontend: Blocked Reason Parsing & Display
- File: `Frontend Money Card/src/features/cards/BlockedWalletsTableView.tsx`
- File: `Frontend Money Card/src/utils/cardBlockMessages.ts`
- Implementation:
  - Create `cleanBlockReasonDisplay(rawReason?: string | null, blocker?: string | null): string`:
    - Regex pattern match for legacy or Flutter bracketed strings: `^\[Blocked by ([^(\]]+)(?:\s*\([^)]*\))?\]\s*(.*)$`.
    - Extract blocker name (`Manager`) and clean reason (`Lost or Stolen Wallet`).
    - Format output: `Blocked by ${name} - ${reason}`.
    - If raw reason does not have brackets:
      - If already starts with `Blocked by `, clean any extra dots/spaces.
      - If it is a standalone category (e.g. `Lost or Stolen Wallet`) and blocker is known, format as `Blocked by ${blocker} - ${rawReason}`.
      - Strip any trailing ellipsis dots (`...` or `....`).
  - In `BlockedWalletsTableView.tsx`:
    - Remove `line-clamp-2` and `max-w-xs` from the `Blocked Reason` table cell so reasons are never truncated with dots.
    - Remove the `Customer Portal` button from table row actions.

### 2. Frontend: Remove Customer Portal Buttons
- File: `Frontend Money Card/src/features/cards/OrgAdminCardsView.tsx`
  - Remove top header `Customer Portal` button.
  - Remove counter row action `Customer Portal` button.
- File: `Frontend Money Card/src/features/cards/CounterStaffCardsView.tsx`
  - Remove top header `Customer Portal` button.
  - Remove live active card row action `Customer Portal` button.
- File: `Frontend Money Card/src/features/cards/BlockedWalletsTableView.tsx`
  - Remove `Customer Portal` button from action buttons.

### 3. Frontend: Enable Card Blocking for Counter Admin & Org Admin
- Reusable / Integrated Modal: `BlockCardModal`
  - State: `cardToBlock: CardEntity | null`, `blockReason: string`, `blockNotes: string`, `isSubmitting: boolean`.
  - Reason options:
    - `Lost or Stolen Wallet`
    - `Damaged Card / Hardware Fault`
    - `Suspicious Activity / Fraud`
    - `Customer Request`
    - `Staff Discretion`
    - `Other Reason`
  - Submit logic:
    - Formats reason as `Blocked by ${userName} - ${blockReason}` (with notes appended if present).
    - Calls `apiService.cards.blockCard(cardToBlock.id, finalReason)`.
    - On success: notifies `Wallet ${identifier} blocked successfully.`, closes modal, reloads cards data.
- Counter Admin Integration (`CounterStaffCardsView.tsx`):
  - Add `Block Wallet` button to each live card row action list (`variant="outline"`, red hover, ban icon).
  - Add `Block Wallet` button inside `selectedCardForDetails` (Wallet Details Modal) footer.
- Org Admin Integration (`OrgAdminCardsView.tsx`):
  - In `selectedBranchForDetails` modal (when Org Admin clicks `Wallet Details (N)` for any counter):
    - Add `Actions` column to the table.
    - Render `Block Wallet` button for active or available cards.
    - Connect to `BlockCardModal` to block cards counter-wise.

### 4. Mobile POS Parity (Flutter)
- File: `Flutter Money card/lib/features/cards/card_details_screen.dart`
  - In `_handleBlockCard()`:
    - Change combined reason formatting from `[Blocked by $defaultBlockerStr] $selectedReason` to `Blocked by $blockerName - $selectedReason` (and optional notes), removing brackets and role/counter parentheses.

---

## Verification & Testing Plan
1. Run TypeScript type checks (`npx tsc --noEmit` in `Frontend Money Card`).
2. Run Frontend Vitest test suite (`npm test -- --run` in `Frontend Money Card`).
3. Run Backend test suite (`npm test` in `Backend Money Card`).
4. Run Flutter test suite (`flutter test` in `Flutter Money card`).
5. Run Flutter analyzer (`flutter analyze --no-pub` in `Flutter Money card`).
6. Verify zero horizontal overflow and mobile responsiveness on all modified screens.
