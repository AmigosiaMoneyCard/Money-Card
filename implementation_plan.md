# Implementation Plan — Super Admin Cafeteria Controls Update

## User Request
1. In Super Admin -> Organizations: Remove "View as Org Admin".
2. In Super Admin -> Organization Details: Display the current password with show/hide toggle just like the staff view.
3. In Super Admin -> Organizations: Remove "Export Tenant Data".

---

## Technical Design & Scope

### 1. Remove "View as Org Admin"
- File: `Frontend Money Card/src/features/organizations/OrganizationsPage.tsx`
- Remove the inline "View as Org Admin" button from the table Action column (lines 720-734).
- Remove the "View as Org Admin" item from `OrgActionMenu` (lines 176-189).
- Remove unused `onImpersonate` prop from `OrgActionMenuProps` and `OrgActionMenu`.

### 2. Remove "Export Tenant Data" from Super Admin
- File: `Frontend Money Card/src/features/organizations/OrganizationsPage.tsx`
- Remove "Export Tenant Data" menu item from `OrgActionMenu` (lines 236-247).
- Remove `onExportData` prop from `OrgActionMenuProps` and `OrgActionMenu`.
- Remove `exportingOrg` state, `setExportingOrg`, and `<OrgDataExportModal />` render from `OrganizationsPage.tsx`.

### 3. Display Current Password in Org Admin Details Modal
- File: `Frontend Money Card/src/features/organizations/OrganizationsPage.tsx`
- Add persistent storage helper for Org Admin credentials:
  - Cache key: `mc_org_passwords` in `localStorage`.
  - Helpers: `getStoredOrgPassword(orgId?: string, email?: string, adminId?: string): string | null` and `storeOrgPassword(orgId: string, pass: string, email?: string, adminId?: string): void`.
- When Super Admin creates an organization or resets the Org Admin password in `handleResetPasswordSubmit`, store the temporary password in `mc_org_passwords`.
- In the Cafeteria Details modal (`selectedOrg` modal body):
  - Add state `showOrgAdminPassword` (boolean).
  - Render a "Current Password" card matching `StaffPage` / `BranchesPage` design:
    - Lock icon, "CURRENT PASSWORD" label.
    - Masked password text (`••••••••`) or revealed plain password with mono font.
    - Eye toggle button to reveal / hide.
    - "Copy Credentials" utility button to copy email and password to clipboard.

---

## UI Layout Wireframes

Super Admin Cafeterias Table:
```
+-----------------------------------------------------------------------------------------+
| Platform Cafeterias                                            [+ Add Organization]     |
+-----------------------------------------------------------------------------------------+
| [Search Cafeteria...] [Filter Plan] [Filter Status]                          [Refresh]   |
+-----------------------------------------------------------------------------------------+
| CAFETERIA NAME      | PLAN          | COUNTERS | STAFF | STATUS   | CREATED    | ACTIONS|
| Central Cafeteria   | Enterprise    | 3        | 8     | ACTIVE   | 04/10/2026 | [Actions v]|
| North Campus Dining | Standard      | 1        | 3     | ACTIVE   | 02/10/2026 | [Actions v]|
+-----------------------------------------------------------------------------------------+

* Actions dropdown contains: View Details, Reset Admin Password, Deactivate, Delete Cafeteria
* (View as Org Admin and Export Tenant Data removed)
```

Cafeteria Details Modal with Current Password:
```
+-------------------------------------------------------------------------+
| Cafeteria Details                                                   [X] |
+-------------------------------------------------------------------------+
| Central Cafeteria                                    [ACTIVE (Badge)]   |
| Email: admin@centralcafeteria.com                                       |
| Created Date: 04/10/2026                                                |
|                                                                         |
| +---------------------------------------------------------------------+ |
| | CURRENT PASSWORD                                                    | |
| | [Lock]  admin@123 / ••••••••        [Eye] Show/Hide   [Copy] Copy   | |
| +---------------------------------------------------------------------+ |
|                                                                         |
| Active Subscription Plan: Enterprise Plan (INR 9,999/mo)                |
| Usage Quotas: Counters: 3/5 | Staff: 8/15 | Cards: 240/1000             |
+-------------------------------------------------------------------------+
|                                                                 [Close] |
+-------------------------------------------------------------------------+
```

---

## Verification Plan

1. Frontend Compilation:
- Run `npx tsc --noEmit` in `Frontend Money Card` (0 errors).

2. Frontend Test Suite:
- Run `npm test -- --run` in `Frontend Money Card` (verify all 298+ tests continue to pass).

---

## Verification Results

1. TypeScript Type Check:
- `npx tsc --noEmit`: Exited with code 0 (zero errors).

2. Vitest Suite:
- `npm test -- --run`: 39 passed (39 test files), 298 passed (298 tests).

