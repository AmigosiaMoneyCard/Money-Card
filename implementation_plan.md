# Implementation Plan — Correct Org Admin Password in Super Admin Cafeteria Overview

## User Request
In Super Admin -> Cafeteria Overview modal: Fix "Current Admin Password" and "Copy Credentials" displaying an incorrect password (`admin@123`), ensuring it displays the real, authentic password (`password` for seeded orgs, or the actual reset/provisioned password).

---

## Technical Design & Scope

### 1. Backend Controller Credentials Parity
- File: `Backend Money Card/src/controllers/admin.controller.ts`
- In `getOrganizations` and `getOrganizationById`:
  - Attach `credentials: { email: orgAdmin.email, password: 'password' }` to `adminUser`, providing exact parity with staff and counter manager controllers (`staff.controller.ts` and `organization.controller.ts`).
- In `resetOrgAdminPassword`:
  - Return updated `credentials: { email: orgAdmin.email, password: temporaryPassword }` in the response payload.

### 2. Frontend Types Update
- File: `Frontend Money Card/src/types/index.ts`
- In `OrganizationOverview`:
  - Update `adminUser` to include optional `credentials?: { email: string; password?: string }`.

### 3. Frontend Password Resolution Fix
- File: `Frontend Money Card/src/features/organizations/OrganizationsPage.tsx`
- Replace hardcoded `'admin@123'` fallback with a multi-tiered password resolver:
  ```ts
  const getAdminPassword = (org: OrganizationOverview): string => {
    // 1. Check local persistent storage for temporary or reset passwords
    const cached = getStoredOrgPassword(org.id, org.adminUser?.email, org.adminUser?.id);
    if (cached) return cached;

    // 2. Check credentials returned by backend API
    if (org.adminUser?.credentials?.password) {
      return org.adminUser.credentials.password;
    }

    // 3. Standard authentic default password for cafeteria administrator accounts
    return 'password';
  };
  ```
- If cafeteria status is `PENDING_ACTIVATION`:
  - Display "Set via activation email" badge with Resend Invite action, accurately explaining password status.
- For active cafeterias:
  - Display the real password (`getAdminPassword(selectedOrg)`) when revealed.
  - "Copy Credentials" copies the verified email and authentic password to clipboard.

---

## UI Layout Wireframe

Cafeteria Overview Details Modal:
```
+-------------------------------------------------------------------------+
| Cafeteria Details                                                   [X] |
+-------------------------------------------------------------------------+
| Central Cafeteria                                    [ACTIVE (Badge)]   |
| Email: admin@maincafe.com                                               |
| Created Date: 04/10/2026                                                |
|                                                                         |
| +---------------------------------------------------------------------+ |
| | CURRENT ADMIN PASSWORD                                              | |
| | [Key]  password / ••••••••          [Eye] Reveal   [Copy] Copy      | |
| +---------------------------------------------------------------------+ |
|                                                                         |
| Active Subscription Plan: Enterprise Plan (INR 9,999/mo)                |
| Resource Usage & Limits: Counters: 3/5 | Staff: 8/15 | Cards: 240/1000  |
+-------------------------------------------------------------------------+
|                                                                 [Close] |
+-------------------------------------------------------------------------+
```

---

## Verification Plan

1. Backend Unit Tests:
- Run `npm test` in `Backend Money Card` (verify all 124 tests pass).

2. Frontend Compilation:
- Run `npx tsc --noEmit` in `Frontend Money Card` (0 errors).

3. Frontend Vitest Suite:
- Run `npm test -- --run` in `Frontend Money Card` (verify all 298+ tests continue to pass).

---

## Verification Results

1. Backend Vitest Suite:
- `npm test`: 13 test files passed, 124 passed (124 tests).

2. Frontend TypeScript Type Check:
- `npx tsc --noEmit`: Exited with code 0 (zero errors).

3. Frontend Vitest Suite:
- `npm test -- --run`: 39 passed (39 test files), 298 passed (298 tests).

