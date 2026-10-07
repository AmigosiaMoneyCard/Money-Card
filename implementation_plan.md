# Implementation Plan - Distinct Kitchen Staff and Counter Manager Localhost Credentials

## Overview
Kitchen Staff and Counter Manager are distinct roles with different permission sets in Money Card:
- Counter Manager accounts possess the `RECHARGE` permission (and standard POS operations). Logging into the Mobile POS app requires selecting the Counter Manager tab.
- Kitchen Staff accounts possess `PRODUCT_VIEW`, `PRODUCT_MANAGE`, and `SESSION_VIEW`, but strictly do not have `RECHARGE`. Logging into the Mobile POS app requires selecting the Kitchen Staff tab.

Currently in the local database, all existing seeded staff accounts are configured as Counter Managers. A dedicated Kitchen Staff account (`kitchen@localhost.com`) must be added to the seed script and seeded so both roles have distinct credentials on localhost.

## User Roles & Credentials Breakdown

### 1. Counter Manager (Localhost)
- Role: `STAFF`
- Permissions: `STAFF_DEFAULT_PERMISSIONS` (includes `RECHARGE`, `CARD_ISSUE`, `CARD_VIEW`, `PURCHASE`, etc.)
- Primary Email: `staff@localhost.com`
- Phone: `9876543210`
- Password: `password`
- Existing Alternative in DB: `eros@staff.com` (Phone: `9876543212`, Password: `password`)

### 2. Kitchen Staff (Localhost)
- Role: `STAFF`
- Permissions: `PRODUCT_VIEW`, `PRODUCT_MANAGE`, `SESSION_VIEW` (strictly without `RECHARGE`)
- Email: `kitchen@localhost.com`
- Phone: `9876543220`
- Password: `password`
- Branch Assignments: `branch_001` (Main Cafeteria), `branch_002` (Executive Lounge)

## Proposed Changes

### Backend Engine (`Backend Money Card`)

#### `prisma/seed.ts`
- Add `usr_kitchen_localhost` with:
  - id: `usr_kitchen_localhost`
  - email: `kitchen@localhost.com`
  - phone: `9876543220`
  - name: `Localhost Kitchen Staff`
  - role: `Role.STAFF`
  - defaultPassword: `'password'`
  - organizationId: `org.id`
  - permissions: `[PermissionCode.PRODUCT_VIEW, PermissionCode.PRODUCT_MANAGE, PermissionCode.SESSION_VIEW]`
  - branchIds: `[mainBranch.id, branchTwo.id]`
- Run `npm run prisma:seed` to idempotently upsert both `staff@localhost.com` and `kitchen@localhost.com` into PostgreSQL.

## Visual Design Reference
![Staff Roles & Kitchen Sketch](file:///C:/Users/damie/.gemini/antigravity-ide/brain/40124c13-8182-4da5-8dae-66d3097486e9/admin_pwd_kitchen_qr_sketch_1791349470141.jpg)

## ASCII Wireframes

### Mobile POS Role Selection View
```
+---------------------------------------+
|              MONEY CARD               |
|      Select Your Staff Role           |
|                                       |
|  +---------------------------------+  |
|  | [Icon]  Counter Manager         |  | <- Login with: staff@localhost.com
|  |         POS, Recharge, Cards    |  |    or eros@staff.com / password
|  +---------------------------------+  |
|                                       |
|  +---------------------------------+  |
|  | [Icon]  Kitchen Staff           |  | <- Login with: kitchen@localhost.com
|  |         Live Orders, KDS Queue  |  |    password: password
|  +---------------------------------+  |
+---------------------------------------+
```

## Verification Plan
1. Execution: Run `npm run prisma:seed` in `Backend Money Card`.
2. Verification script: Query local database to confirm `kitchen@localhost.com` evaluates to `computeStaffType(...) === 'KITCHEN'` and `staff@localhost.com` evaluates to `computeStaffType(...) === 'MANAGER'`.
3. Test suite: Run backend unit tests `npm test -- test/unit/kitchen_and_staff_roles.test.ts`.
