# Implementation Plan: Staff Deletion, Blocked Card Modal Title & Analytics Privacy Icon

![UI Design Sketch](C:\Users\damie\.gemini\antigravity-ide\brain\c99edd16-0faf-4782-a7e1-399d96eb8a4b\analytics_icon_blocked_modal_sketch_1791461822467.jpg)

## 1. Overview & Requirements
1. **Kitchen Admin Staff Deletion**:
   - Kitchen Admin (role STAFF managing counter) must be able to delete counter staff members directly without confusion.
   - Prevent the self-deletion trap where the Kitchen Admin's own account displayed a delete button that triggered 'Kitchen managers cannot delete their own account.'
   - In Counter Staff table, add a direct Delete action button for counter team members, while marking the Kitchen Admin's own row as '(You)' with delete disabled/hidden.
   - In Edit Staff modal, hide the Delete button when viewing own account.

2. **Blocked Card Modal Renaming**:
   - In `ResolveBlockedWalletModal.tsx`, change modal title from `Resolve Blocked Wallet: ${cardIdentifier}` to `Blocked: ${cardIdentifier}` (e.g. `Blocked: KD1NIICJY`).

3. **Analytics Impact of 'Transfer ₹X'**:
   - Explanation of how card balance replacement works in analytics and which boxes are impacted:
     - Transfer transaction is recorded as `TRANSFER` type with `TRANSFER` payment method.
     - Cash and Revenue boxes (Money Added, Total Recharges, UPI Money, Cash in Drawer, Total Revenue): Unchanged (0 delta). Money was already collected during initial recharge; no new cash entered or left.
     - Card Analytics: Blocked card remains BLOCKED / settled. New replacement card becomes ACTIVE with the ₹X balance. Blocked wallets count decreases by 1.
     - If Cash/UPI Refund mode is chosen instead: Money Refunded increases by ₹X, Cash/UPI Out increases by ₹X, and Net Money Collected decreases by ₹X.

4. **Analytics Privacy Masked State (Replace '••••••' with Simple Icon)**:
   - In `OrgAdminAnalyticsComponents.tsx`, `OrgAdminCardTracker.tsx`, and `SuperAdminDashboard.tsx`, replace the text `'••••••'` (which resembles a password input) with a clean, sleek `<EyeOff className="h-5 w-5 text-slate-300 inline-block align-middle" />` icon placeholder.

---

## 2. ASCII Wireframes

### Wireframe 1: Counter Staff Table with Direct Delete and '(You)' Tag
```
+--------------------------------------------------------------------------------------------------+
| Kitchen Staff Management                                              [+ Add Team Member]       |
+--------------------------------------------------------------------------------------------------+
| Staff Name             | Phone Number   | Role            | Status    | Actions                  |
+------------------------+----------------+-----------------+-----------+--------------------------+
| Damien (You)           | +91 9876543210 | Kitchen Manager | [ACTIVE]  | [Edit]   [Summary]       |
| Priya Sharma           | +91 9876543211 | Kitchen Staff   | [ACTIVE]  | [Edit]   [Summary] [Del] |
| Rajesh Kumar           | +91 9876543212 | Kitchen Staff   | [ACTIVE]  | [Edit]   [Summary] [Del] |
+--------------------------------------------------------------------------------------------------+
```

### Wireframe 2: Blocked Card Modal Title Renaming
```
+-----------------------------------------------------------------------+
| Blocked: KD1NIICJY                                                [X] |
+-----------------------------------------------------------------------+
|  LOCKED BALANCE                                       [CreditCard]    |
|  ₹2,500                                                               |
|  Rohan Sharma (+91 9876543210)                                        |
+-----------------------------------------------------------------------+
|  [  <-> Replace Card  ]          [  Cash / UPI Refund  ]              |
+-----------------------------------------------------------------------+
|  New Physical Card                                                    |
|  [ Type card number or scan...                   ] [ Scan ]           |
|                                                                       |
|  Reason (Optional)                                                    |
|  [ Damaged or lost card replaced                 ]                    |
+-----------------------------------------------------------------------+
|  [ Cancel ]                                   [ Transfer ₹2,500 ]     |
+-----------------------------------------------------------------------+
```

### Wireframe 3: Analytics Privacy Masking (Icon instead of ••••••)
```
Before:
+-------------------------------+   +-------------------------------+
| Total Recharges       [Wallet]|   | UPI Recharge     [CreditCard] |
| ••••••                        |   | ••••••                        |
+-------------------------------+   +-------------------------------+

After (Sleek Privacy EyeOff Icon):
+-------------------------------+   +-------------------------------+
| Total Recharges       [Wallet]|   | UPI Recharge     [CreditCard] |
| [EyeOff Icon]                 |   | [EyeOff Icon]                 |
+-------------------------------+   +-------------------------------+
```

---

## 3. Worktree & File Changes

1. `Frontend Money Card/src/features/cards/ResolveBlockedWalletModal.tsx`:
   - Line 211: Rename `title={`Resolve Blocked Wallet: ${cardIdentifier}`}` to `title={`Blocked: ${cardIdentifier}`}`.

2. `Frontend Money Card/src/features/staff/CounterStaffPage.tsx`:
   - In staff table actions column: Add direct `[Delete]` button (`Trash2`) for staff members where `staff.id !== user?.id`.
   - In staff table name column: Add `(You)` badge for `staff.id === user?.id`.
   - In `showStaffDetailsModal` footer: Only show `Delete Staff` button when `selectedStaff?.id !== user?.id`.

3. `Frontend Money Card/src/features/analytics/OrgAdminAnalyticsComponents.tsx`:
   - Replace occurrences of `'••••••'` with `<EyeOff className="h-5 w-5 text-slate-300 inline-block align-middle" />` for masked metric values.

4. `Frontend Money Card/src/features/analytics/OrgAdminCardTracker.tsx`:
   - Replace occurrences of `'••••••'` with `<EyeOff className="h-4 w-4 text-slate-300 inline-block align-middle" />`.

5. `Frontend Money Card/src/features/dashboard/SuperAdminDashboard.tsx`:
   - Replace occurrences of `'••••••'` in metric cards with `<EyeOff className="h-5 w-5 text-slate-300 inline-block align-middle" />`.

6. `Backend Money Card/src/controllers/staff.controller.ts`:
   - Ensure clear error handling for self-deletion check: `You cannot delete your own account.`.

---

## 4. Verification & Testing Plan
- Run `npx tsc --noEmit` in `Frontend Money Card` to verify 0 type errors.
- Run `npm test -- --run` in `Frontend Money Card` to verify all unit tests pass.
- Verify modal title renders `Blocked: <cardIdentifier>`.
- Verify hidden analytics metrics show the EyeOff icon cleanly.
