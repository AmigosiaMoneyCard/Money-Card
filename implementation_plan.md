# Implementation Plan - Blocked Wallets Strict Segmentation, Clean Table UI, and PWA Card Blocked Status

## Overview
This plan implements three targeted requirements across the Web Admin/Counter Dashboard, Blocked Wallets table, and PWA Customer Portal:
1. Strict Segmentation: Blocked cards must never appear in the Live Active Wallets list (in Counter Staff or Org Admin dashboards). Blocked cards must strictly appear only in the Blocked Wallets section.
2. Clean Blocked Wallets Table:
   - In the Customer column, leave the field blank if no customer details are entered (remove "Unassigned Card").
   - In the Blocked Reason column, display only the reason text, removing the red "Blocked" badge box.
3. PWA Customer Portal:
   - When a blocked card is scanned or opened, display the title "Card Blocked" with a clear message instead of "Invalid QR Code".

## Proposed Changes

### 1. Web Frontend (`Frontend Money Card`)

#### `src/features/cards/CounterStaffCardsView.tsx`
- In `liveCards` memo:
  - Add explicit filter `if (c.status === 'BLOCKED') return false;` to guarantee blocked cards are excluded from Live Active Wallets even if an `activeSession` record exists on the card.
- In `totalBalance` analytics calculation:
  - Ensure only unblocked active cards are aggregated into remaining wallet balance.

#### `src/features/cards/OrgAdminCardsView.tsx`
- In `getBranchCards` callback:
  - Add explicit filter `if (c.status === 'BLOCKED') return false;` so blocked cards are omitted from cafeteria counter card counts and the "Wallet Details" active modal.
- In `branchCardsForDetails`:
  - Exclude blocked cards so they only appear under the Blocked Wallets tab.

#### `src/features/dashboard/OrgAdminDashboard.tsx`
- In `remainingWalletsBalance`:
  - Filter `cardsList.filter((c) => c.status === 'ACTIVE')` before calculating total remaining balance so locked balances of blocked cards are excluded from active money in wallets.

#### `src/features/cards/BlockedWalletsTableView.tsx`
- Customer Column:
  - When `customerName` and `customerPhone` are absent, render empty content (`null`) instead of `<span className="text-slate-400 italic">Unassigned Card</span>`.
- Blocked Reason Column:
  - Remove the `<Badge variant="danger">Blocked</Badge>` component.
  - Render only the clean reason text (`{reasonText}`) directly with tooltip and line-clamp.

#### `src/features/portal/QrResolutionPage.tsx`
- In `runResolution()` and `handleResolve()` error handlers:
  - Check if error code is `CARD_BLOCKED` or error message contains "block".
  - Set `setErrorTitle('Card Blocked')` and display the server message (or fallback: 'This card has been blocked. Please visit the cafeteria desk.') instead of 'Invalid QR Code' or 'Wallet Blocked'.

#### `src/features/portal/PortalSessionPage.tsx`
- In `fetchSessionDetail()` error handler:
  - If error indicates blocked status, set error message to 'Card Blocked. Please visit the cafeteria desk.'

---

### 2. Backend Engine (`Backend Money Card`)

#### `src/controllers/public.controller.ts`
- In `getPublicSessionDetail`:
  - Check if `session.card?.status === 'BLOCKED'`.
  - Return `sendError(res, 403, 'CARD_BLOCKED', 'This card has been blocked by store staff. Please visit cafeteria desk.')` so public session lookups for blocked cards consistently return `CARD_BLOCKED`.

---

## Visual Design Reference
![Blocked Wallets Clean Table and PWA Sketch](file:///C:/Users/damie/.gemini/antigravity-ide/brain/40124c13-8182-4da5-8dae-66d3097486e9/blocked_wallets_clean_table_pwa_sketch_1791358350038.jpg)

---

## ASCII Wireframes

### Counter / Org Admin Cards View — Strict Segmentation
```
+-----------------------------------------------------------------------------------------+
| [ Live Active Wallets (12) ]    [ Blocked Wallets (2) ]                                  |
+-----------------------------------------------------------------------------------------+
|  Active Wallets Table:                                                                  |
|  (Contains only ACTIVE cards. Blocked cards strictly excluded from this view)           |
|                                                                                         |
|  Wallet ID        | Balance | Customer       | Issued Date | Actions                    |
|  MC-001           | ₹500    | Alex Morgan    | 7 Oct 2026  | [View Details]             |
|  MC-002           | ₹350    | Priya Sharma   | 7 Oct 2026  | [View Details]             |
+-----------------------------------------------------------------------------------------+
```

### Clean Blocked Wallets Table (Customer blank if unassigned, clean reason without badge)
```
+--------------------------------------------------------------------------------------------------------------------+
| Wallet ID       | Customer        | Locked Bal | Blocked Reason                        | Blocked By | Date       | ... |
+-----------------+-----------------+------------+---------------------------------------+------------+------------+-----+
| KD1NIICJY       |                 | ₹950       | [Blocked by Manager (STAFF)] Lost Card| Manager    | 7 Oct 2026 | ... |
| (Counter 1)     | (Blank, empty)  |            | (Clean reason, no red badge)          |            |            |     |
+-----------------+-----------------+------------+---------------------------------------+------------+------------+-----+
| MC-003          | David Miller    | ₹1,200     | Suspicious multiple recharges flagged | Admin      | 6 Oct 2026 | ... |
| (Main Counter)  | +91 9988776655  |            |                                       |            |            |     |
+--------------------------------------------------------------------------------------------------------------------+
```

### PWA Customer Portal — Card Blocked State
```
+---------------------------------------+
|             MONEY CARD                |
|                                       |
|               ( [ ! ] )               |
|                                       |
|             Card Blocked              |
|                                       |
|   This card has been blocked by       |
|   store staff. Please visit the       |
|   cafeteria desk.                     |
|                                       |
|     [ Scan Another Wallet ]           |
|                                       |
+---------------------------------------+
(Zero 'Invalid QR Code' message when card is blocked)
```

---

## Verification Plan

### Automated Tests
1. Frontend Unit Tests:
   - Run `npm test -- --run` in `Frontend Money Card` to ensure all tests pass.
   - Update tests in `staffRoleAndBlockedWallets.test.ts` and `portalQrRedirectAndTokenParsing.test.ts` to reflect the clean reason format, blank customer column, and 'Card Blocked' title.
2. Frontend Type Checks:
   - Run `npx tsc --noEmit` to confirm 0 TypeScript compilation errors.
3. Backend Unit Tests:
   - Run `npm test` in `Backend Money Card` to verify public controller and session endpoints pass.

### Manual Verification Steps
1. Block a wallet from Counter Manager or Org Admin.
2. Verify it vanishes immediately from Live Active Wallets.
3. Switch to Blocked Wallets tab: verify it appears with blank customer column (if unassigned) and clean reason text without red badge.
4. Scan the blocked card's QR code in PWA customer portal: verify the modal/page displays "Card Blocked" rather than "Invalid QR Code".
