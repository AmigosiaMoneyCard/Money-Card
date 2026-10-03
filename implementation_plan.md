# Implementation Plan: Checkbox-Based Staff Permissions

## Executive Summary
This plan details the transition of staff permissions in Staff Settings from locked preset cards to an interactive, granular Checkbox-based architecture. Administrators can select role presets (Counter Manager or Kitchen Staff) to populate default permission sets, while retaining full capability to check or uncheck individual permission checkboxes for any staff member.

![Staff Permissions Checkboxes Layout](file:///C:/Users/damie/.gemini/antigravity-ide/brain/999581c9-5c30-4195-933d-3667425ed95a/staff_permissions_checkboxes_modal_1791066054614.jpg)

## User Requirements & Problem Statement
- Requirement: Staff permissions in Staff Settings must be interactive Checkboxes (`[x]`).
- Current State: Role selection was limited to two broad cards with radio circles, lacking granular visibility and individual checkbox controls for specific permissions.
- Desired State: In Staff Settings (Edit Staff modal and Add Staff modal), administrators have a dedicated Permissions tab featuring:
  - Role Quick Presets (Counter Manager / Kitchen Staff) that batch check/uncheck permissions with one click.
  - Interactive square Checkboxes for all M0 permissions grouped into 4 distinct operational categories.
  - Granular toggle ability so administrators can grant or revoke specific permissions (e.g. enabling Menu Edit for a Cashier, or revoking Refund permissions from a Manager).
  - Dependency-aware checking (e.g. unchecking `CARD_VIEW` automatically unchecks dependent card actions; checking a dependent action checks its prerequisite).

## ASCII Wireframes

### Staff Settings Modal with Checkbox Permissions Tab

```text
+-------------------------------------------------------------------------------+
| Staff Settings: Akhil (Counter Manager)                                   [X] |
+-------------------------------------------------------------------------------+
|  [ Overview ]     [ Permissions (16) ]     [ Counters (1) ]                   |
+-------------------------------------------------------------------------------+
|                                                                               |
|  Quick Role Presets                                                           |
|  +--------------------------------+   +------------------------------------+  |
|  | [*] Counter Manager (All POS)  |   | [ ] Kitchen Staff (KDS & Menu)     |  |
|  +--------------------------------+   +------------------------------------+  |
|                                                                               |
|  +--------------------------------+   +------------------------------------+  |
|  | Cards & Wallets                |   | Billing & Recharges                |  |
|  | [x] View Wallets (CARD_VIEW)   |   | [x] Add Money / Top-Up (RECHARGE)  |  |
|  | [x] Issue Wallets (CARD_ISSUE) |   | [x] Food Purchase (PURCHASE)       |  |
|  | [x] Return & Settle (CARD_RET) |   | [x] View Sessions (SESSION_VIEW)   |  |
|  | [x] Block/Unblock (CARD_BLOCK) |   | [x] Refund Orders (REFUND)         |  |
|  +--------------------------------+   +------------------------------------+  |
|                                                                               |
|  +--------------------------------+   +------------------------------------+  |
|  | Menu & Food Catalog            |   | Operations & Analytics             |  |
|  | [x] View Menu (PRODUCT_VIEW)   |   | [x] View Team (STAFF_VIEW)         |  |
|  | [x] Edit Menu (PRODUCT_MANAGE) |   | [x] Manage Team (STAFF_MANAGE)     |  |
|  |                                |   | [x] View Analytics & Reports       |  |
|  +--------------------------------+   +------------------------------------+  |
|                                                                               |
|  [ Select All ]  [ Clear All ]                    16 of 16 Permissions Active|
+-------------------------------------------------------------------------------+
|                                                    [ Cancel ]  [ Save Changes ]|
+-------------------------------------------------------------------------------+
```

## Technical Architecture & File Changes

### 1. `Frontend Money Card/src/features/staff/PermissionMatrix.tsx`
- Replace static check icons with interactive `<input type="checkbox">` elements.
- Accept `selectedPermissions: Permission[]`, `onChange: (perms: Permission[]) => void`, `readOnly?: boolean`, and `rolePreset?: 'MANAGER' | 'KITCHEN'`.
- Implement preset buttons (`Counter Manager` and `Kitchen Staff`) at the top of the matrix.
- Group checkboxes into 4 clear category panels:
  - Cards & Wallets (`CARD_VIEW`, `CARD_ISSUE`, `CARD_RETURN`, `CARD_BLOCK`, `CARD_UNBLOCK`)
  - Billing & Recharges (`RECHARGE`, `PURCHASE`, `SESSION_VIEW`, `REFUND`)
  - Menu & Food Catalog (`PRODUCT_VIEW`, `PRODUCT_MANAGE`)
  - Operations & Analytics (`STAFF_VIEW`, `STAFF_MANAGE`, `BRANCH_VIEW`, `BRANCH_MANAGE`, `VIEW_ANALYTICS`, `VIEW_REPORTS`)
- Implement dependency resolution:
  - When a permission is checked, its prerequisite is automatically checked (e.g. checking `CARD_ISSUE` checks `CARD_VIEW`).
  - When a permission is unchecked, all subordinate permissions requiring it are automatically unchecked.

### 2. `Frontend Money Card/src/features/staff/StaffPage.tsx`
- Expand `staffTab` state from `'overview' | 'branches'` to `'overview' | 'permissions' | 'branches'`.
- Add `Permissions` tab button in the modal header with count badge: `Permissions (${formPermissions.length})`.
- In the `permissions` tab pane, embed `PermissionMatrix` bound directly to `formPermissions` and `setFormPermissions`.
- When role preset buttons are clicked, update `formRoleType` and sync permissions accordingly.
- When individual checkboxes are modified, recalculate `formRoleType` (if permissions match manager, set to `MANAGER`; if match kitchen, set to `KITCHEN`; otherwise maintain active role context).
- Include `permissions: formPermissions` in both `updateStaff` and `createStaff` API payloads.

### 3. `Frontend Money Card/src/__tests__/staffRoleAndBlockedWallets.test.ts`
- Add unit tests verifying:
  - Checking and unchecking individual permission checkboxes updates the permission array accurately.
  - Dependency cascading: unchecking `CARD_VIEW` revokes all card actions.
  - Role preset button clicks toggle all respective checkboxes simultaneously.
  - Custom checkbox selections persist properly to save payload.

## Verification & Execution Protocol
1. Implementation of `PermissionMatrix.tsx` with full checkbox support.
2. Integration into `StaffPage.tsx` modal tabs.
3. Proactive execution of `npx tsc --noEmit` in Frontend Money Card (0 errors).
4. Proactive execution of `npm test -- --run` in Frontend Money Card (all 290+ tests pass).
5. Proactive execution of `npm test` in Backend Money Card (all 121 tests pass).
6. Local git commit on staging branch.
