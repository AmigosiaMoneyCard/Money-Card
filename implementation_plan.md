# Counter Creation Staff Auto-Provisioning Bug Fix Plan

![Create Counter Clean Modal](C:/Users/damie/.gemini/antigravity-ide/brain/999581c9-5c30-4195-933d-3667425ed95a/create_counter_clean_modal_1790312917147.jpg)

## Layout Wireframe

```
+-------------------------------------------------------------+
|                     Create New Counter                      |
+-------------------------------------------------------------+
|                                                             |
|  Counter Name                                               |
|  +-------------------------------------------------------+  |
|  | e.g. South Indian Express, Bakery, Juice Bar          |  |
|  +-------------------------------------------------------+  |
|                                                             |
|                     [Cancel]  [Create Counter]              |
+-------------------------------------------------------------+
```

## Root Cause Analysis

- Backend Root Cause: In [organization.controller.ts](file:///D:/Money%20Card%20Project/Backend%20Money%20Card/src/controllers/organization.controller.ts) inside `createBranch` and `createBranchesBatch`, when a phone number was passed during branch creation, a transaction block automatically created a new user with `role: Role.STAFF` and name `Staff - <Counter Name>` with 17 permissions and linked them via `UserBranch`.
- Frontend Root Cause: In [BranchesPage.tsx](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/branches/BranchesPage.tsx), the Create Counter modal enforced mandatory mobile number and password inputs, incorrectly coupling counter infrastructure with user account provisioning.

## Technical Design and Proposed Changes

- Backend Changes:
  - In `createBranch` in [organization.controller.ts](file:///D:/Money%20Card%20Project/Backend%20Money%20Card/src/controllers/organization.controller.ts):
    1. Only create the `Branch` record in `tx.branch.create`.
    2. Completely eliminate the automatic staff creation block (`tx.user.create`, `tx.userPermission.upsert`, `tx.userBranch.upsert`).
    3. Return the created branch without generating phantom staff credentials.
  - In `createBranchesBatch` in [organization.controller.ts](file:///D:/Money%20Card%20Project/Backend%20Money%20Card/src/controllers/organization.controller.ts):
    1. Eliminate the automatic staff creation block for batch creations.
  - In `updateBranch` in [organization.controller.ts](file:///D:/Money%20Card%20Project/Backend%20Money%20Card/src/controllers/organization.controller.ts):
    1. When updating a counter, update counter fields (`name`, `location`, `status`). Do not automatically generate new staff users.

- Frontend Changes:
  - In [BranchesPage.tsx](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/branches/BranchesPage.tsx):
    1. Simplify the "Create New Counter" modal to require only Counter Name.
    2. Remove mandatory mobile number and login password inputs from counter creation.
    3. Update `handleCreateSubmit` to call `apiService.branches.createBranch({ name: branchNameInput.trim() })`.
    4. Remove the automated WhatsApp credentials dispatch popup for new counters.
    5. Maintain exported validation functions (`validateCounterName`, `validateMobileNumber`, `validatePassword`) so existing unit tests continue to pass.

## Worktree Modifications

- File 1: [organization.controller.ts](file:///D:/Money%20Card%20Project/Backend%20Money%20Card/src/controllers/organization.controller.ts)
  - Method: `createBranch` (lines 284-365) and `createBranchesBatch` (lines 451-505) and `updateBranch` (lines 699-733).
  - Action: Remove auto-provisioning of `Staff - <Counter Name>` users.

- File 2: [BranchesPage.tsx](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/branches/BranchesPage.tsx)
  - Method: `handleCreateSubmit` and `Create Counter Modal` JSX (lines 881-921).
  - Action: Remove mobile number and password inputs from Create Counter modal.

## Verification and Test Plan

- Proactively execute Backend test suite: `npm test` in `Backend Money Card` (100 passing).
- Proactively execute Frontend test suite: `npm test -- --run` in `Frontend Money Card` (272 passing).
- Proactively execute Frontend TypeScript check: `npx tsc --noEmit` in `Frontend Money Card`.
- Proactively execute Mobile Flutter test suite: `flutter test` in `Flutter Money card` (168 passing).
