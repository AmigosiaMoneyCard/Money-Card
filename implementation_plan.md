# Implementation Plan: Admin Password from DB, Staff Password Min 4 Chars, and Kitchen QR Scan Filter

## Overview
This plan implements three specific requested features across the Web Admin dashboard and Flutter Mobile POS:
1. Superadmin Cafeteria Overview: Fetch and reflect the accurate admin password from the database (`users.initialPassword`) instead of any placeholder.
2. Counter Staff Team Member: Ensure the Login Password in the counter team member view enforces a minimum of 4 characters instead of 8.
3. Mobile Kitchen Orders: Add a QR scanner action button directly to the right side of the search bar in `kitchen_orders_screen.dart` to scan customer wallet QR codes and filter orders.

![Feature Design Overview](file:///C:/Users/damie/.gemini/antigravity-ide/brain/40124c13-8182-4da5-8dae-66d3097486e9/admin_pwd_kitchen_qr_sketch_1791349470141.jpg)

---

## Technical Design & Component Breakdown

### 1. Superadmin Cafeteria Overview: Real Password from DB
- Backend Database: The `users` table already has the `initialPassword` column (`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "initialPassword" TEXT;`).
- Backend Admin Controller (`Backend Money Card/src/controllers/admin.controller.ts`):
  - In `getOrganizations`: Add `initialPassword: true` to the Prisma query for `ORG_ADMIN` users. Return `credentials: { email: orgAdmin.email, password: orgAdmin.initialPassword || '' }` instead of hardcoded `'password'`.
  - In `getOrganizationById`: Add `initialPassword: true` to the Prisma query for `ORG_ADMIN` users and return `credentials: { email: orgAdmin.email, password: orgAdmin.initialPassword || '' }`.
  - In `resetOrgAdminPassword`: Update `prisma.user.update` to persist `initialPassword: temporaryPassword` in the database.
- Backend Auth Controller (`Backend Money Card/src/controllers/auth.controller.ts`):
  - In `completeActivation`: When the organization admin activates and supplies their password, persist `initialPassword: password` into `prisma.user.update`.
  - In `changePassword`: When the user changes their password, update `initialPassword: newPassword` in `prisma.user.update`.
- Frontend Cafeteria Overview (`Frontend Money Card/src/features/organizations/OrganizationsPage.tsx`):
  - In `getAdminPassword`: Use the authentic password returned from the DB in `org.adminUser?.credentials?.password`.
  - Remove fallback to `'password'`. If the account has not yet set a password or is pending activation, display 'Set via email activation link' or 'Not Available'.

### 2. Add Team Member to Counter: Password Min 4 Characters
- Frontend Counter Staff View (`Frontend Money Card/src/features/staff/CounterStaffPage.tsx`):
  - In Add Staff modal: Input field accepts min 4 characters (`formPassword.length < 4`).
  - In Change Staff Password section: Change validation from `formNewPassword.length < 8` to `formNewPassword.length < 4`, and update error message to 'Password must be at least 4 characters'.
  - Update placeholder from 'New password (min 8 chars)' to 'New password (min 4 chars)'.
- Frontend Branches View (`Frontend Money Card/src/features/branches/BranchesPage.tsx`):
  - Update `validatePassword` in `BranchesPage.tsx` to require min 4 characters instead of 8: `if (password.length < 4 || password.length > 30) return 'Password must be between 4 and 30 characters'`.
  - Update input placeholder in create counter modal from 'Minimum 8 characters' to 'Minimum 4 characters'.

### 3. Mobile Kitchen Orders: QR Scan Button Right of Search Bar
- Mobile Screen (`Flutter Money card/lib/features/kitchen/kitchen_orders_screen.dart`):
  - Wrap the `TextField` in a horizontal `Row` with the search input in an `Expanded` widget and an emerald QR scanner `IconButton` inside a styled `Container` on the right side.
  - Implement `_openQrScanner()` opening `QrScannerView` in a modal bottom sheet.
  - When a QR is scanned, normalize the token with `cleanDisplayCardNumber(token)`, strip any 'MC-', 'CARD-', or 'WALLET-' prefix, populate `_searchController.text`, set `_searchQuery`, and trigger filter updates across In Queue, In Progress, and Ready tabs.
  - Update `_matchesSearch` to match card number, ticket number, customer name, and item names.

---

## ASCII Wireframes

### Wireframe 1: Superadmin Cafeteria Overview (Real Admin Password)
```
+-----------------------------------------------------------------------------------------+
| Cafeteria Overview: Campus Central Cafeteria                             [ACTIVE BADGE] |
+-----------------------------------------------------------------------------------------+
| [Key Icon]  CURRENT ADMIN PASSWORD                                                      |
|             admin@campuscentral.com                                                     |
|             Password: [ MyRealPass!23      ] [ Eye Toggle ]   [ Copy Credentials Button]|
+-----------------------------------------------------------------------------------------+
| Active Subscription Plan: Pro Enterprise Tier (Rs 2999/mo)                              |
+-----------------------------------------------------------------------------------------+
| Resource Usage: Counters: 4/10  |  Staff: 12/50  |  Cards: 480/2000                     |
+-----------------------------------------------------------------------------------------+
```

### Wireframe 2: Add Team Member to Counter 1 (Min 4 Chars)
```
+-------------------------------------------------------------+
| Add Team Member to Counter 1                            [X] |
+-------------------------------------------------------------+
| Staff Name *                                                |
| [ Ramesh Cashier                                          ] |
|                                                             |
| Mobile Number (Login ID) *                                  |
| [ 9876543210                                              ] |
|                                                             |
| Login Password *                                            |
| [ ****                                     ] [ Eye Toggle ] |
| (Min 4 characters)                                          |
|                                                             |
| Role Type:                                                  |
| [x] Counter Manager               [ ] Kitchen Staff         |
|     Full POS & Recharge access        Menu & Order view only|
|                                                             |
|                                     [ Cancel ] [ Add Member]|
+-------------------------------------------------------------+
```

### Wireframe 3: Mobile App Kitchen Orders (Search Bar with QR Scan Button)
```
+-------------------------------------------------------------+
| Kitchen Orders                                    [Refresh] |
+-------------------------------------------------------------+
| [ In Queue (3) ]     [ In Progress (2) ]     [ Ready (5) ]  |
+-------------------------------------------------------------+
| +--------------------------------------+ +----------------+ |
| | [Search] Search wallet ID, ticket... | | [ QR Icon ]    | |
| +--------------------------------------+ +----------------+ |
|                                                             |
| [ Active Order Card #1042 ]                                 |
| Wallet: KD1IRUG9 | Customer: Aarav Sharma                   |
| Items:                                                      |
|   - 2x Veg Thali (Kitchen Ready)                            |
|   - 1x Masala Chai                                          |
| [ Status: Cooking ]               [ Action: Mark as Ready ] |
+-------------------------------------------------------------+
```

---

## File Change Matrix

| File Path | Sub-project | Proposed Changes |
|---|---|---|
| `Backend Money Card/src/controllers/admin.controller.ts` | Backend | Include `initialPassword: true` in `getOrganizations` and `getOrganizationById`. Save `initialPassword` in `resetOrgAdminPassword`. Return real password in credentials. |
| `Backend Money Card/src/controllers/auth.controller.ts` | Backend | Save `initialPassword` in `completeActivation` and `changePassword`. |
| `Frontend Money Card/src/features/organizations/OrganizationsPage.tsx` | Frontend | Use real DB credentials password in `getAdminPassword()`. Remove hardcoded 'password' fallback. |
| `Frontend Money Card/src/features/staff/CounterStaffPage.tsx` | Frontend | Enforce min 4 characters for new password validation and placeholder in team member view. |
| `Frontend Money Card/src/features/branches/BranchesPage.tsx` | Frontend | Enforce min 4 characters in `validatePassword` and create modal placeholder. |
| `Frontend Money Card/src/__tests__/counterDetailsValidation.test.ts` | Frontend | Update password validation test expectations from 8 chars to 4 chars. |
| `Flutter Money card/lib/features/kitchen/kitchen_orders_screen.dart` | Mobile POS | Wrap search bar in Row, add QR scan IconButton on the right, implement `_openQrScanner()`, filter order lists by scanned wallet ID. |

---

## Verification & Testing Plan
1. Backend:
   - Run `npm test` in `Backend Money Card` to ensure all 124 unit tests pass.
   - Run `npm run build` to ensure clean TypeScript compilation.
2. Frontend:
   - Run `npm test -- --run` in `Frontend Money Card` to ensure all 317 unit tests pass.
   - Run `npx tsc --noEmit` and `npm run build` to ensure zero type errors and clean production bundle compilation.
3. Mobile App:
   - Run `flutter test` in `Flutter Money card` to ensure all 186 unit/widget tests pass.
   - Run `flutter analyze --no-pub` to verify zero static analysis errors.
