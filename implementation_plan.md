# Implementation Plan — Isolate Counter Dashboard Staff Management

Strictly isolate Counter Dashboard staff management from Org Admin by ensuring the Counter Manager account is excluded from the subordinate staff table, displaying the Add Staff empty state on freshly created counters.

![Counter Staff Empty State View](C:/Users/damie/.gemini/antigravity-ide/brain/999581c9-5c30-4195-933d-3667425ed95a/counter_staff_empty_state_1790316872880.jpg)

## Layout Wireframes

```
+-----------------------------------------------------------------------------------+
| Staff Management                                                                  |
|                                                                                   |
| [Search staff by name or phone...               ]      [+ Add Staff]  [Refresh]   |
|                                                                                   |
| +-------------------------------------------------------------------------------+ |
| |                                                                               | |
| |                                  [Users Icon]                                 | |
| |                                                                               | |
| |                            No staff members yet                               | |
| |          Add your team members to grant POS cashier and counter access.       | |
| |                                                                               | |
| |                                [+ Add Staff]                                  | |
| |                                                                               | |
| +-------------------------------------------------------------------------------+ |
+-----------------------------------------------------------------------------------+
```

## Root Cause and Scope Isolation

- Root Cause: When a counter is provisioned with phone credentials, a user record with role STAFF is created as the Counter Manager. When the Counter Manager logs in to the Counter Dashboard and opens Staff Management, `getStaffList` queries all users with role STAFF assigned to that branch, returning the Counter Manager themselves. Consequently, the manager sees their own account (`Staff - <Counter Name>`) listed as a subordinate staff member instead of seeing an empty state with an "Add Staff" action.
- Isolation Boundary: Changes are strictly scoped to the Counter Manager view (`isCounterView = true` in frontend and `role === Role.STAFF` in backend `getStaffList`). The Org Admin dashboard view, which manages cafeteria-wide counter groupings, remains completely unchanged and isolated.

## Proposed Changes

Backend Changes in [staff.controller.ts](file:///D:/Money%20Card%20Project/Backend%20Money%20Card/src/controllers/staff.controller.ts):
- In `getStaffList`, when the requester has role `STAFF` (Counter Manager), exclude the requesting manager's own account (`where.id = { not: req.user.id }`).
- This ensures the Counter Manager only receives team members created under their counter, never themselves.

Frontend Changes in [StaffPage.tsx](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/staff/StaffPage.tsx):
- In `filteredStaff`, when `isCounterView` is active, filter out the logged-in user (`user?.id`) and any synthetic manager account matching `Staff - <Counter Name>`.
- In the top action bar, render a prominent `Add Staff` button whenever `isCounterView && canManage` so the manager can always add staff directly.
- In the main content area, when `isCounterView` is true and `filteredStaff.length === 0`, render the EmptyState component with title "No staff members yet", description "Add your team members to grant POS cashier and counter access to this counter", and an "Add Staff" action button.
- Preserve Org Admin's counter-grouped table layout completely intact.

## Worktree Modifications

- File 1: [staff.controller.ts](file:///D:/Money%20Card%20Project/Backend%20Money%20Card/src/controllers/staff.controller.ts)
  - Method: `getStaffList`
  - Action: Exclude `req.user.id` when `req.user.role === Role.STAFF`.
- File 2: [StaffPage.tsx](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/staff/StaffPage.tsx)
  - Sections: `filteredStaff` computation, top action bar, and empty state conditional block for `isCounterView`.
  - Action: Filter out counter manager from staff list, add header Add Staff button, and show empty state on empty counter staff.

## Verification and Test Plan

- Proactively execute Backend test suite: `npm test` in `Backend Money Card` (100 passing).
- Proactively execute Frontend test suite: `npm test -- --run` in `Frontend Money Card` (272 passing).
- Proactively execute Frontend TypeScript check: `npx tsc --noEmit` in `Frontend Money Card` (0 errors).
- Proactively execute Mobile Flutter test suite: `flutter test` in `Flutter Money card` (168 passing).
