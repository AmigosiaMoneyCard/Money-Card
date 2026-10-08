# Implementation Plan: Super Admin Organizations Renaming, Blocked Cards View Details Modal, and Unblock Simplification

![UI Design Sketch](C:\Users\damie\.gemini\antigravity-ide\brain\c99edd16-0faf-4782-a7e1-399d96eb8a4b\blocked_view_modal_organizations_sketch_1791465222430.jpg)

## 1. Overview & Requirements

1. **Super Admin Organizations Renaming**:
   - In Super Admin `OrganizationsPage.tsx`, rename header `Platform Cafeterias` to `Organizations`.
   - Rename details modal title `Cafeteria Overview` to `Organization Overview`.

2. **Blocked Wallet Analytics Inquiries & Parity**:
   - **Replace Card (Transfer Balance)**:
     - Migrates the locked balance to the new replacement physical card via `TRANSFER` transaction.
     - Logs `CARD_REPLACED` event on source card and `CARD_ISSUED` on target card.
     - **Blocked Returns Box**: In `analytics.controller.ts`, the `CARD_REPLACED` event tracks `Balance migrated: ₹X`. We ensure both `blockedReturnedCount` and `blockedReturnedAmount` accurately reflect the replaced card and its migrated balance.
     - **Revenue / Recharges Boxes**: Unaffected (0 delta) to prevent double-counting of initial recharge money.
   - **Cash / UPI Refund**:
     - Settles the session with `TransactionType.REFUND_RETURN`.
     - **Refund Analytics Box**: Reflects immediately in `Refunds` (`moneyRefunded`), `Cash Refunds` / `Cash Out` (or UPI Refunds), and reduces `Net Money Collected`.

3. **Blocked Cards Table 'View' Button & Details Modal**:
   - In `BlockedWalletsTableView.tsx`, add a `[View]` button to the Actions column.
   - Clicking `[View]` opens a dedicated modal titled `Blocked Wallet Details: <CardID>`.
   - Displays all key card audit attributes in clean structured cards:
     - **Customer**: Name and Phone number
     - **Locked Balance**: Large formatted balance badge
     - **Blocked Reason**: Full text of the block reason
     - **Counter / Kitchen**: Assigned counter name (e.g. `Counter 1`)
     - **Blocked By**: Staff or admin who blocked the card
     - **Blocked Date**: Formatted date & time
   - Streamline table columns for optimal readability and viewport fit.

4. **Unblock Confirmation Modal Text Simplification**:
   - In `BlockedWalletsTableView.tsx` Unblock modal, remove the sentence:
     `Unblocking will restore the card to Active status and allow purchases and recharges to resume immediately.`
   - Keep the clean confirmation header and key card parameters.

---

## 2. ASCII Wireframes

### Wireframe 1: Super Admin Organizations Page
```
+------------------------------------------------------------------------------------+
| Organizations                                                [+ Add Organization]  |
+------------------------------------------------------------------------------------+
| Search organizations...                                                            |
+------------------------------------------------------------------------------------+
| Organization Name       | Plan       | Status    | Counters | Created     | Actions|
| Downtown Cafeteria      | Premium    | [ACTIVE]  | 3        | 12 Jan 2026 | [View] |
+------------------------------------------------------------------------------------+
```

### Wireframe 2: Blocked Cards Table with View Button
```
+------------------------------------------------------------------------------------------------------+
| Blocked Wallets                                                                                      |
+------------------------------------------------------------------------------------------------------+
| Wallet ID       | Customer             | Locked Bal | Actions                                        |
+-----------------+----------------------+------------+------------------------------------------------+
| KD1NIICJY       | Rohan (+91 98765...) | ₹2,500     | [View]  [Unblock]  [Replace / Refund]  [History] |
| MC-98124        | Priya (+91 98111...) | ₹120       | [View]  [Unblock]  [Replace / Refund]  [History] |
+------------------------------------------------------------------------------------------------------+
```

### Wireframe 3: Blocked Wallet Details Modal (Opened via [View] Button)
```
+-----------------------------------------------------------------------+
| Blocked Wallet Details: KD1NIICJY                                 [X] |
+-----------------------------------------------------------------------+
|  CUSTOMER DETAILS                                                     |
|  Rohan Sharma  (+91 9876543210)                                       |
+-----------------------------------------------------------------------+
|  LOCKED BALANCE                                                       |
|  ₹2,500                                                               |
+-----------------------------------------------------------------------+
|  BLOCKED REASON                                                       |
|  Card physically damaged / magnetic stripe corrupted                  |
+-----------------------------------------------------------------------+
|  COUNTER / KITCHEN                                                    |
|  Counter 1                                                            |
+-----------------------------------------------------------------------+
|  BLOCKED BY                               | BLOCKED DATE & TIME       |
|  Counter Manager (Damien)                 | 08 Oct 2026, 04:30 PM     |
+-----------------------------------------------------------------------+
|  [ Close ]              [ Unblock Card ]        [ Replace / Refund ]  |
+-----------------------------------------------------------------------+
```

### Wireframe 4: Simplified Unblock Card Modal
```
+-----------------------------------------------------------------------+
| Unblock Card                                                      [X] |
+-----------------------------------------------------------------------+
|  [Alert] Are you sure you want to unblock this card?                  |
+-----------------------------------------------------------------------+
|  Wallet ID: KD1NIICJY                                                 |
|  Locked Balance: ₹2,500                                               |
|  Original Reason: Customer requested temporary hold                   |
+-----------------------------------------------------------------------+
|  [ Cancel ]                                          [ Confirm Unblock]|
+-----------------------------------------------------------------------+
```

---

## 3. Worktree & File Changes

1. `Frontend Money Card/src/features/organizations/OrganizationsPage.tsx`:
   - Line 741: Change `Platform Cafeterias` to `Organizations`.
   - Line 997: Change modal title `Cafeteria Overview` to `Organization Overview`.

2. `Frontend Money Card/src/features/cards/BlockedWalletsTableView.tsx`:
   - Add `selectedCardForDetails` state to trigger the details modal.
   - In table rows, add `[View]` button (`leftIcon={<Eye className="h-3.5 w-3.5" />}`).
   - Render `Blocked Wallet Details` modal showing Customer, Locked Balance, Blocked Reason, Counter, Blocked By, Blocked Date.
   - In Unblock Modal, remove the sentence `Unblocking will restore the card to Active status and allow purchases and recharges to resume immediately.`.

3. `Backend Money Card/src/controllers/cards.controller.ts`:
   - Ensure `CARD_REPLACED` audit event reason includes `Balance migrated: ₹${lockedBalance.toFixed(2)}` so analytics `blockedReturnedAmount` parses it reliably.

---

## 4. Verification & Testing Plan
- Run `npx tsc --noEmit` in `Frontend Money Card` to verify 0 type errors.
- Run `npm test -- --run` in `Frontend Money Card` to verify all 322 tests pass.
- Run `npm test` in `Backend Money Card` to verify all 129 backend tests pass.
- Verify modal title and page headers match the renamed labels.
- Verify Unblock modal renders without the removed sentence.
