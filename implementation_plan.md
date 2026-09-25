# Implementation Plan — Remove Minimum Active Branch Restriction for Counter Deletion

Remove the `MIN_ACTIVE_BRANCH_REQUIRED` restriction in counter deletion and status updates, allowing users to delete or deactivate any counter without being blocked by an active branch quota check.

![Delete Counter Modal](C:/Users/damie/.gemini/antigravity-ide/brain/999581c9-5c30-4195-933d-3667425ed95a/delete_counter_modal_1790317591219.jpg)

## Layout Wireframes

```
+-------------------------------------------------------------+
|                        Delete Counter                       |
+-------------------------------------------------------------+
|  [!] Are you sure you want to delete this counter?          |
|                                                             |
|  This action will permanently delete the counter and unlink |
|  its inventory and staff assignments.                       |
|                                                             |
|                     [Cancel]  [Delete Counter]              |
+-------------------------------------------------------------+
```

## User Requirements and Scope

- The user reported being unable to delete a counter due to the error: "Cannot delete this branch. An organization must have at least one active branch."
- The user requested removing this restriction completely: "dont need this the counter should get deelted. Udpate olan".
- Counters should be deletable or deactivatable even if it is the only or last remaining counter in the organization.

## Proposed Changes

Backend Changes in [organization.controller.ts](file:///D:/Money%20Card%20Project/Backend%20Money%20Card/src/controllers/organization.controller.ts):
- In `deleteBranch` (hard delete flow): Remove the check `if (branch.status === 'ACTIVE' && remainingActiveCount === 0)` that returns `MIN_ACTIVE_BRANCH_REQUIRED`.
- In `deleteBranch` (archive / force flow for counters with historical records): Remove the check `if (remainingActiveCount === 0 && branch.status === 'ACTIVE')` that returns `MIN_ACTIVE_BRANCH_REQUIRED`.
- In `updateBranch`: Remove the check `if (activeBranchesCount <= 1)` that prevents toggling a counter status away from `ACTIVE`.

Frontend Changes in [branches.ts](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/services/mock/handlers/branches.ts):
- Remove the `activeCount <= 1` block from the mock handler to stay in parity with the backend.

Test Suite Updates in [staff_integration.test.ts](file:///D:/Money%20Card%20Project/Backend%20Money%20Card/test/unit/staff_integration.test.ts):
- Update the branch deactivation unit test to verify that the last remaining active branch can now be deactivated and deleted.

## Worktree Modifications

- File 1: [organization.controller.ts](file:///D:/Money%20Card%20Project/Backend%20Money%20Card/src/controllers/organization.controller.ts)
  - Method: `deleteBranch` and `updateBranch`
  - Action: Remove `MIN_ACTIVE_BRANCH_REQUIRED` blocks.
- File 2: [branches.ts](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/services/mock/handlers/branches.ts)
  - Method: `updateBranch`
  - Action: Remove mock minimum active check.
- File 3: [staff_integration.test.ts](file:///D:/Money%20Card%20Project/Backend%20Money%20Card/test/unit/staff_integration.test.ts)
  - Unit test update reflecting relaxed deletion rules.

## Verification and Test Plan

- Proactively execute Backend test suite: `npm test` in `Backend Money Card` (100 passing).
- Proactively execute Frontend test suite: `npm test -- --run` in `Frontend Money Card` (272 passing).
- Proactively execute Frontend TypeScript check: `npx tsc --noEmit` in `Frontend Money Card` (0 errors).
- Proactively execute Mobile Flutter test suite: `flutter test` in `Flutter Money card` (168 passing).
