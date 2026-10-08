# Implementation Plan — Streamline Blocked Wallets Table

Streamline the Blocked Wallets table on the Cards / Wallets page by removing redundant columns (`Customer`, `Locked Balance`, `Blocked Reason`, `Blocked By`, `Blocked Date`) and the counter name subtitle under the Wallet ID. Also remove the `Unblock` and `Replace / Refund` buttons from table rows, keeping only `View` (and `Customer History`) because all comprehensive wallet information and resolution actions already exist inside the `View` modal.

![Streamlined Blocked Wallets Table and View Modal](file:///C:/Users/damie/.gemini/antigravity-ide/brain/c99edd16-0faf-4782-a7e1-399d96eb8a4b/blocked_table_streamlined_sketch_1791468563704.jpg)

## ASCII Wireframes

### 1. Streamlined Blocked Wallets Table
```
+---------------------------------------------------------------------------------+
| Blocked Wallets (4)                                     [Search blocked card...]|
+---------------------------------------------------------------------------------+
| WALLET ID                                                             | ACTIONS |
|-----------------------------------------------------------------------|---------|
| [Card] KD1NIICJY                                 [View] [Customer History]      |
| [Card] KD1DG3Z8J                                 [View] [Customer History]      |
| [Card] MC004                                     [View] [Customer History]      |
+---------------------------------------------------------------------------------+
```

### 2. Blocked Wallet Details Modal (Opened via [View] Button)
```
+---------------------------------------------------------------------------------+
| Blocked Details: KD1NIICJY                                                  [X] |
+---------------------------------------------------------------------------------+
| LOCKED BALANCE                                                                  |
| Rs. 2,500                                                                       |
+---------------------------------------------------------------------------------+
| CUSTOMER DETAILS                                                                |
| Rahul Sharma                                                     +91 9876543210 |
+---------------------------------------------------------------------------------+
| BLOCKED REASON                                                                  |
| Lost card reported by cardholder                                                |
+---------------------------------------------------------------------------------+
| COUNTER             | BLOCKED BY                    | BLOCKED DATE              |
| Counter 1           | Damien Martin                 | 04 Oct 2026, 10:30 AM     |
+---------------------------------------------------------------------------------+
| [Close]                                            [Unblock] [Replace / Refund] |
+---------------------------------------------------------------------------------+
```

## Proposed Changes

1. [BlockedWalletsTableView.tsx](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/cards/BlockedWalletsTableView.tsx):
   - Table Headers: Remove `Customer`, `Locked Balance`, `Blocked Reason`, `Blocked By`, and `Blocked Date` `<th>` elements. Keep only `Wallet ID` and `Actions`.
   - Table Rows:
     - Under `Wallet ID`: Remove `{branchName && (<span ...>{branchName}</span>)}` so only the card identifier with icon is displayed.
     - Remove the 5 redundant `<td>` columns (`Customer`, `Locked Balance`, `Blocked Reason`, `Blocked By`, `Blocked Date`).
     - In `Actions` `<td>`: Remove the `Unblock` button and `Replace / Refund` button. Retain the `View` button and optional `Customer History` button.
     - Adjust table container styling so it is lightweight without needing `min-w-[700px]`.
   - Blocked Wallet Details Modal (`Blocked Details: <WalletID>`): Retain full rich view containing Locked Balance, Customer Details, Blocked Reason, Counter, Blocked By, Blocked Date, Unblock action, and Replace / Refund action.

## Verification Plan

- Run frontend typecheck: `npx tsc --noEmit` (0 errors)
- Run frontend tests: `npm test -- --run` (all 43 test files, 322 tests passing)
