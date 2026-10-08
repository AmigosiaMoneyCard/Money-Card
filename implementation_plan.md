# Implementation Plan: Nickname Buttons (Manager & Staff) in Staff Creation

Replace the verbose header ('What can this team member do?'), mobile POS badge, and quick preset buttons with two clean selection buttons for Nickname: 'Manager' and 'Staff'.

---

## Visual Design Reference

![Nickname Buttons UI Sketch](C:/Users/damie/.gemini/antigravity-ide/brain/c99edd16-0faf-4782-a7e1-399d96eb8a4b/nickname_manager_staff_buttons_sketch_1791456286018.jpg)

---

## ASCII Layout Wireframe

```
+-----------------------------------------------------------------------+
| Add Team Member to Counter 1                                          |
+-----------------------------------------------------------------------+
| Name                                                                  |
| [ e.g. John Cashier                                                 ] |
|                                                                       |
| Phone                                                                 |
| [ 9876543210                                                        ] |
|                                                                       |
| Password                                                              |
| [ ******                                                            ] |
|                                                                       |
| Nickname                                                              |
| +-----------------------------+   +---------------------------------+ |
| | [●] Manager                 |   | [ ] Staff                       | |
| +-----------------------------+   +---------------------------------+ |
|                                                                       |
| Operational Capabilities:                                             |
| +-----------------------------+   +---------------------------------+ |
| | [x] Billing                 |   | [x] Recharge Cards              | |
| | Take orders & deduct balance|   | Cash and UPI top-up             | |
| +-----------------------------+   +---------------------------------+ |
| | [ ] Refund Transactions     |   | [x] Card Management             | |
| | Process transaction refunds |   | Issue, return, block & unblock  | |
| +-----------------------------+   +---------------------------------+ |
| | [ ] Menu and Products       |   | [ ] View Analytics              | |
| | Manage menu items & prices  |   | Performance reports & metrics   | |
| +-----------------------------+   +---------------------------------+ |
|                                                                       |
| [ Cancel ]                                     [ Add Staff Member ]   |
+-----------------------------------------------------------------------+
```

---

## Technical Design & Behavior

1. **Remove Old Top Elements**:
   - Remove label `What can this team member do?`.
   - Remove badge `Mobile POS Nickname: Manager / Staff`.
   - Remove preset buttons `Quick Presets: Cashier Counter, Billing Counter, Full Access`.

2. **Add Nickname Selector (2 Buttons)**:
   - Section header: `Nickname` (text-xs font-semibold text-slate-700).
   - Two equal-width buttons in a 2-column grid:
     - `Manager`:
       - Active state: Emerald border, emerald light tint background, emerald indicator or text.
       - Click behavior: Sets active nickname to `'Manager'`, ensures `recharge` capability is selected (which signals Manager role in mobile app).
     - `Staff`:
       - Active state: Emerald border, emerald light tint background, emerald indicator or text.
       - Click behavior: Sets active nickname to `'Staff'`, removes `recharge` capability (which signals Staff role in mobile app).
   - Dynamic binding with Capability Cards:
     - Clicking `Recharge Cards` in the capabilities grid toggles between `Manager` (if recharge is enabled) and `Staff` (if recharge is disabled).
     - Alternatively, clicking the `Manager` button activates Manager and toggles recharge on; clicking `Staff` button activates Staff and toggles recharge off.

3. **Affected Files**:
   - `Frontend Money Card/src/features/staff/CounterStaffPage.tsx`:
     - Add Staff Modal (`showAddModal`): replace top header & presets with 2 nickname buttons.
     - Edit Staff Modal (`showStaffDetailsModal`): replace top header & presets with 2 nickname buttons.
   - `Frontend Money Card/src/features/staff/StaffPage.tsx`:
     - Add Staff Modal (`showAddModal`): replace top header & presets with 2 nickname buttons.
     - Edit Staff Modal (`showStaffModal`): replace top header & presets with 2 nickname buttons.

---

## Verification & Validation

1. Type check: Execute `npx tsc --noEmit` in `Frontend Money Card`.
2. Unit tests: Execute `npm test -- --run` in `Frontend Money Card`.
3. Mobile parity: Verify Mobile POS builds and operates seamlessly.
