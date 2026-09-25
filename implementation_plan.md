# Implementation Plan — Add Staff Button on Top Right in Counter Dashboard

Add an "Add Staff" button on the top right side of the page header in Staff Management for the Counter Dashboard view.

![Top Right Add Staff Button](C:/Users/damie/.gemini/antigravity-ide/brain/999581c9-5c30-4195-933d-3667425ed95a/counter_staff_top_right_add_1790318428808.jpg)

## Layout Wireframes

```
+-----------------------------------------------------------------------------------+
| Staff Management                                                    [+ Add Staff] |
| Manage team members for South Indian Express                                      |
+-----------------------------------------------------------------------------------+
| [Search staff by name or phone...               ]                       [Refresh] |
|                                                                                   |
| +-------------------------------------------------------------------------------+ |
| | Staff Name               Role         Actions                                 | |
| | Ramesh                   Staff        [View Details]  [Edit]  [Performance]   | |
| +-------------------------------------------------------------------------------+ |
+-----------------------------------------------------------------------------------+
```

## User Requirements and Scope

- The user requested: "in counter dahobrd - in Staff Management - need a option on the right top side For add staff . udpate plan".
- In the Counter Dashboard view (`isCounterView && canManage`), add a prominent primary action button "Add Staff" aligned to the top right of the page header next to the title.
- Ensure the header layout is responsive on mobile viewports (`flex-col sm:flex-row sm:items-center sm:justify-between`).

## Proposed Changes

Frontend Changes in [StaffPage.tsx](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/staff/StaffPage.tsx):
- Update the minimal header container from a simple block to a responsive flex container: `flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/80 pb-4`.
- On the left side, render the `Staff Management` title and counter context subtitle when `isCounterView && currentBranch`.
- On the right top side, render the primary button `Add Staff` (`variant="primary"`, `leftIcon={<UserPlus className="h-4 w-4" />}`, `onClick={() => handleOpenAdd()}`) when `isCounterView && canManage`.
- Maintain full compatibility with Org Admin view (which manages counter groups).

## Worktree Modifications

- File: [StaffPage.tsx](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/staff/StaffPage.tsx)
  - Method / Section: Minimal Header JSX (around lines 1238-1242)
  - Action: Convert header to flex layout and insert top right "Add Staff" button for Counter Dashboard.

## Verification and Test Plan

- Proactively execute Frontend test suite: `npm test -- --run` in `Frontend Money Card` (272 passing).
- Proactively execute Frontend TypeScript check: `npx tsc --noEmit` in `Frontend Money Card` (0 errors).
- Proactively execute Backend test suite: `npm test` in `Backend Money Card` (100 passing).
- Proactively execute Mobile Flutter test suite: `flutter test` in `Flutter Money card` (168 passing).
