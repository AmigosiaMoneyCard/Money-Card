# Implementation Plan: Counter Admin & Org Admin Staff Isolation and Quota Decoupling

## Executive Summary
This plan addresses the recurring issues in Counter Creation, Staff Management, and Staff Quota calculations:
1. Complete isolation of Org Admin Staff Management and Counter Admin Staff Management into dedicated views.
2. Permanent elimination of phantom counter accounts (such as `Staff - Counter 2`) from Staff Management.
3. Decoupling of Counter Login Accounts from Staff Quotas so that creating counters never consumes staff licenses or displays artificial counts (e.g. shows `Staff Usage: 0 / 25` when 0 staff exist).
4. Strict retention of Counter creation Mobile Number and Password fields in Org Admin Counters view (`BranchesPage.tsx`).

---

## Root Cause Analysis: Why This Issue Repeated

1. Dual-Purpose User Records:
   When an Org Admin creates a Counter with a mobile number and password, the system provisions a `User` record in the database with `role: Role.STAFF` so the counter manager can authenticate into the counter dashboard and mobile POS.
2. Unfiltered Quota Queries:
   `getOrganizationProfile` and `createStaffMember` previously ran:
   `prisma.user.count({ where: { organizationId: orgId, role: Role.STAFF, status: { not: UserStatus.DEACTIVATED } } })`
   Because counter login users had `role: Role.STAFF`, every counter created was counted as an employee staff member. Creating 2 counters resulted in `Staff Usage: 2 / 25 staff accounts created` even with zero actual staff members.
3. Fragile String-Matching Exclusions in `getStaffList`:
   Previous attempts to hide counter accounts relied on checking `name: { startsWith: 'Staff - ' }` or comparing against branch names. When counters were created with `name: trimmedName` (e.g. "Counter 2"), they slipped past the filters or reappeared for other counters.
4. Hardcoded String in Frontend `StaffPage.tsx`:
   Line 1137 of `StaffPage.tsx` explicitly rendered:
   `Staff - {group.counterName}`
   This forced any counter named "Counter 2" to display as "Staff - Counter 2" in the UI.
5. Monolithic Shared Page for Two Different Personas:
   Org Admin (who needs multi-counter overviews and plan quotas) and Counter Admin (who needs a simple roster of cashiers and cooks for their counter) shared the exact same 2800-line `StaffPage.tsx`. State leakage and conditional branching caused counter admins to see org quotas and table layouts meant for org admins.

---

## Architecture & Solution

### 1. Database-Level Decoupling (`User.isCounterAccount`)
- Add `isCounterAccount Boolean @default(false)` to the `User` model in `schema.prisma`.
- When `createBranch` or `updateBranch` provisions a login account for a counter, set `isCounterAccount: true`.
- When `createStaffMember` creates an employee, set `isCounterAccount: false`.
- Quota queries in `organization.controller.ts` and `staff.controller.ts` filter by `isCounterAccount: false`.
- `getStaffList` queries strictly filter by `isCounterAccount: false`, plus defense-in-depth checks for legacy rows.

### 2. Complete Frontend Page Isolation
- Create `CounterStaffPage.tsx` exclusively for Counter Admin (`user.role === 'STAFF'`).
  - No org plan usage banner (`Staff Usage: X / Y`).
  - Direct scoped counter team view.
  - When 0 staff members exist, displays a clean empty state with "+ Add Staff" button.
  - Simplified Add/Edit staff modal pre-locked to the counter.
- Maintain `StaffPage.tsx` exclusively for Org Admin (`user.role === 'ORG_ADMIN'`).
  - Fix line 1137 to display clean counter name `{group.counterName}` without "Staff - " prefix.
  - Shows accurate plan resource usage (`0 / 25 staff accounts created`).
- In `AppRoutes.tsx`, dynamically render `<CounterStaffPage />` for `STAFF` role and `<StaffPage />` for `ORG_ADMIN` role.

### 3. Preservation of Counter Credentials
- In `BranchesPage.tsx`, strictly retain:
  - Counter Name input (required, 2-20 characters).
  - Mobile Number input (required, 10 digits).
  - Login Password input (8-30 characters, default 12345678).
  - WhatsApp credentials dispatch modal after creation.

---

## Wireframes

### Counter Admin Staff Management Page (Empty State)
```text
+-----------------------------------------------------------------------------------+
| Staff Management                                                    [ + Add Staff ]|
| Manage cashier and kitchen team members for Counter 2                             |
|                                                                                   |
| [ Search staff by name or phone... ]      [ All Roles v ]             [ Refresh ] |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|                                [ Users Icon ]                                     |
|                                                                                   |
|                             No staff members yet                                  |
|     No staff members added to Counter 2 yet. Add your team members to grant       |
|     POS cashier and kitchen access.                                               |
|                                                                                   |
|                                 [ + Add Staff ]                                   |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

### Org Admin Staff Management Page (Zero Staff Created)
```text
+-----------------------------------------------------------------------------------+
| Staff Management                                                    [ + Add Staff ]|
| Staff Usage: 0 / 25 staff accounts created                                        |
|                                                                                   |
| [ Search counters or staff... ]        [ All Counters v ]             [ Refresh ] |
+-----------------------------------------------------------------------------------+
| Counter Name          | Staff Count | Add Staff      | Actions                    |
+-----------------------+-------------+----------------+----------------------------+
| [Building] Counter 1  | 0 members   | [ + Add ]      | [ View Staff Details ]     |
| [Building] Counter 2  | 0 members   | [ + Add ]      | [ View Staff Details ]     |
+-----------------------+-------------+----------------+----------------------------+
```

### Org Admin Counter Creation Modal (Preserving Required Fields)
```text
+-----------------------------------------------------------------------------------+
| Create New Counter                                                            [X] |
+-----------------------------------------------------------------------------------+
| Counter Name *                                                                    |
| [ Counter 2                                                            ]          |
|                                                                                   |
| Mobile Number *                                                                   |
| [ 9876543210                                                           ]          |
|                                                                                   |
| Login Password                                                                    |
| [ 12345678                                                        (eye)]          |
| Default is 12345678 if left blank. Used for counter portal and mobile POS login.  |
|                                                                                   |
| Counter Location (Optional)                                                       |
| [ First Floor Cafeteria                                                ]          |
+-----------------------------------------------------------------------------------+
|                                                     [ Cancel ]  [ Create Counter ]|
+-----------------------------------------------------------------------------------+
```

---

## Step-by-Step Implementation Worktree Changes

### Backend Sub-Project (`Backend Money Card/`)
1. `prisma/schema.prisma`:
   - Add `isCounterAccount Boolean @default(false)` to `model User`.
   - Run `npx prisma db push` and `npx prisma generate`.
2. `src/controllers/organization.controller.ts`:
   - In `getOrganizationProfile`: update `staffCount` query to include `isCounterAccount: false`.
   - In `createBranch`: set `isCounterAccount: true` when creating or updating the counter login user.
   - In `updateBranch`: preserve `isCounterAccount: true` on counter login accounts.
3. `src/controllers/staff.controller.ts`:
   - In `getStaffList`: add condition `isCounterAccount: false` to the base query, along with defense-in-depth exclusion of any branch counter users.
   - In `createStaffMember`: check staff limit against `isCounterAccount: false` only, and set `isCounterAccount: false` on newly created staff.
4. `test/unit/staff_integration.test.ts`:
   - Add test cases verifying counter login accounts do not appear in `getStaffList` and do not increment `staffCount`.

### Frontend Sub-Project (`Frontend Money Card/`)
1. `src/features/staff/StaffPage.tsx`:
   - Remove `'Staff - '` hardcoded prefix on line 1137. Display clean counter name `{group.counterName}`.
   - Retain Org Admin multi-counter management and plan resource display.
2. `src/features/staff/CounterStaffPage.tsx`:
   - Create dedicated Counter Staff Management page.
   - Features: Counter header, clean search/filter, table for assigned staff, empty state with "+ Add Staff" button when 0 staff exist, counter-scoped Add/Edit modals.
   - No org plan usage banner.
3. `src/app/routes/AppRoutes.tsx`:
   - Route `/staff` conditionally: renders `<CounterStaffPage />` for `STAFF` role and `<StaffPage />` for `ORG_ADMIN` role.
4. `src/features/branches/BranchesPage.tsx`:
   - Ensure Counter Name, Mobile Number, Password, and WhatsApp dispatch modal remain fully intact.
5. Frontend Tests:
   - Add unit tests validating counter staff isolation, empty state rendering, and zero-staff usage quota formatting.

---

## Verification & Validation Plan
1. Backend Tests: Run `npm test` in `Backend Money Card` to ensure all tests pass.
2. Frontend Tests: Run `npm test -- --run` and `npx tsc --noEmit` in `Frontend Money Card` to ensure all tests pass with 0 errors.
3. Functional Verification:
   - Create a new counter with Name: "Counter 2", Mobile: "9876543210", Password: "password123".
   - Confirm in Org Admin Dashboard and Staff Management that `Staff Usage` shows `0 / 25` (not `1 / 25` or `2 / 25`).
   - Confirm Counter table shows "Counter 2" (NOT "Staff - Counter 2").
   - Log into Counter Admin using "9876543210" and navigate to Staff Management.
   - Confirm empty state is displayed with "+ Add Staff" button (no phantom "Staff - Counter 2" row).
   - Click "+ Add Staff", create a staff member, and confirm they appear in the counter table.
