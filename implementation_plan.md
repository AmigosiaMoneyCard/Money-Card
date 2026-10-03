# Implementation Plan: Minimal Staff Role Boxes & Permission Page Removal

## Executive Summary
This plan details the simplification of Staff Settings in the Web Admin dashboard. The two role selection boxes under "Staff Role & Permissions" will be stripped of all secondary descriptions, subtext, and badges, leaving two clean, separate boxes displaying only the role name: **Counter Manager** and **Kitchen Staff**. Furthermore, the Permissions page/tab and all "Configure Checkboxes" links/text will be completely removed from the Staff Settings modal and Add Staff modal, leaving a clean, two-tab layout (Overview and Counters).

![Staff Settings Clean Role Boxes](file:///C:/Users/damie/.gemini/antigravity-ide/brain/999581c9-5c30-4195-933d-3667425ed95a/staff_settings_clean_role_boxes_1791067355676.jpg)

## User Requirements & Problem Statement
- Requirement 1: In Staff Settings (e.g. `Staff Settings: Staff - iti block`), simplify the two role boxes under "Staff Role & Permissions" to display ONLY the role name:
  - Box 1: "Counter Manager"
  - Box 2: "Kitchen Staff"
  - Remove all descriptive subtitles ("Full POS billing, card top-up, returns, and queue tracking.") and badges ("Full POS Access", "KDS & Menu Control").
- Requirement 2: Completely remove the Permissions tab/page from the Staff Settings modal.
- Requirement 3: Completely remove the "Configure Checkboxes" link, text, and counter beneath the role boxes.
- Requirement 4: In the Add Staff modal, also streamline the role selection to display only the two clean name-only boxes, and remove the expandable custom permissions section.

## ASCII Wireframes

### Streamlined Staff Settings Modal Layout

```text
+-------------------------------------------------------------------------------+
| Staff Settings: Staff - iti block                                         [X] |
+-------------------------------------------------------------------------------+
|  [ Overview ]                                             [ Counters (1) ]    |
+-------------------------------------------------------------------------------+
|                                                                               |
|  Staff Role & Permissions                                                     |
|  +--------------------------------+   +------------------------------------+  |
|  |                                |   |                                    |  |
|  |  Counter Manager          (o)  |   |  Kitchen Staff                 ( ) |  |
|  |                                |   |                                    |  |
|  +--------------------------------+   +------------------------------------+  |
|                                                                               |
|  Full Name                                Phone Number                        |
|  [ Staff - iti block            ]         [ 9876543210                       ] |
|                                                                               |
|  Account Access Status                                                        |
|  +-------------------------------------------------------------------------+  |
|  |  Account Access Status                             Active [ (x) ]       |  |
|  +-------------------------------------------------------------------------+  |
|                                                                               |
|  Current Password                                                             |
|  +-------------------------------------------------------------------------+  |
|  | [Key] •••••••• [Eye]           [Copy Credentials] [WhatsApp] [Change]   |  |
|  +-------------------------------------------------------------------------+  |
|                                                                               |
+-------------------------------------------------------------------------------+
|                                                    [ Cancel ]  [ Save Changes ]|
+-------------------------------------------------------------------------------+
```

## Technical Architecture & File Changes

### 1. `Frontend Money Card/src/features/staff/StaffPage.tsx`
- **Revert `staffTab` State**: Change `staffTab` type back to `'overview' | 'branches'`.
- **Remove Permissions Tab**:
  - In `showStaffModal` tab header, remove the `<button onClick={() => setStaffTab('permissions')}>` tab.
  - Keep only the two tabs: `<User /> Overview` and `<Building2 /> Counters`.
  - Remove the `staffTab === 'permissions'` pane completely.
- **Simplify Role Boxes in `showStaffModal`**:
  - Replace the multi-line card content in `Overview` with a clean, single-line card:
    - Height: compact and comfortable (~48px).
    - Label: `Counter Manager` for left box; `Kitchen Staff` for right box.
    - Radio circle indicator on the right side.
    - Remove all `<p className="text-[11px] text-slate-500 ...">` descriptions.
    - Remove all `<span className="mt-2 inline-flex ...">` badge pills.
  - Remove the `Configure Checkboxes` link and permission count text completely from below the boxes.
- **Simplify Role Boxes in `showAddModal`**:
  - In `showAddModal` (`addTab === 'basic'`), simplify the two role boxes to match the same clean name-only style.
  - Remove the expandable custom permissions section (`showAddPermissionsSection`) and its toggle button.
- **Remove Unused Imports**: Remove `PermissionMatrix` import and unused `ShieldCheck` icon if not used elsewhere in `StaffPage.tsx`.

### 2. `Frontend Money Card/src/__tests__/staffRoleAndBlockedWallets.test.ts`
- Update unit tests to verify:
  - Role selection between Counter Manager and Kitchen Staff correctly sets respective `MANAGER_PERMISSIONS` and `KITCHEN_PERMISSIONS`.
  - Daily Activity Summary button remains strictly visible for Counter Manager and hidden for Kitchen Staff.
  - Clean role switching correctly persists `staffType` and `permissions` in API payloads without needing the permissions tab.

## Verification & Execution Steps (Post-Approval)
1. Apply changes to `StaffPage.tsx`.
2. Run `npx tsc --noEmit` in Frontend Money Card (verify 0 errors).
3. Run `npm test -- --run` in Frontend Money Card (verify all 290+ tests pass).
4. Run `npm test` in Backend Money Card (verify all 121 tests pass).
5. Review local git diff and commit changes to local staging branch.
