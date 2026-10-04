# Implementation Plan: Counter Credentials Flow Alignment & Performance Optimization

## Executive Summary
This updated plan addresses two critical requirements:
1. **Counter Creation & Credentials Restoration with Staff Isolation**:
   - Restore the full counter creation form in Org Admin (`BranchesPage.tsx` and `organization.controller.ts`): asking for **Counter Name**, **Mobile Number**, and **Password**, and presenting the **WhatsApp / Copy Credentials modal** upon creation.
   - Crucially, isolate the Counter account so that when logging into the Counter Dashboard, **no phantom or auto-created staff user (such as `Staff - Counter 1` or the counter login account itself) appears in Counter Dashboard -> Staff Management (`/staff` / Team Members)**. Staff Management must display strictly genuine staff team members added explicitly via "Add Team Member".
2. **Approved Performance & Latency Optimizations**:
   - Eliminate redundant sequential `/auth/me` network round-trip during login.
   - Implement zero-latency in-memory token caching in `SecureTokenStorage` to bypass Android Keystore blocking delays.
   - Throttle aggressive 8-second polling in `KitchenOrdersNotifier`.

---

## Architectural Analysis: Counter Account vs Staff Team Members

### The Problem
Previously, when an Org Admin created a counter named "Counter 1" with a phone number:
1. The backend created a `User` record with `name: 'Staff - ' + trimmedName` (`Staff - Counter 1`) with `role: Role.STAFF`.
2. When the counter manager logged in to the Counter Dashboard and navigated to Staff Management (`/staff` / Team Members), the system ran `getStaffList`.
3. `getStaffList` returned all `Role.STAFF` users assigned to the branch — including the logged-in counter account itself (`Staff - Counter 1`).
4. To the user, it appeared as though a phantom staff member was automatically created in their counter's team list, cluttering Staff Management.

### The Correct Architecture
1. **Counter Creation in Org Admin**:
   - Admin enters **Counter Name** (e.g., "South Indian Express"), **Mobile Number** (e.g., "9876543210"), and **Password** (e.g., "12345678").
   - Backend provisions the Counter login identity with `name: trimmedName` (e.g., "South Indian Express", NOT "Staff - South Indian Express").
   - Frontend displays the WhatsApp / Copy Credentials dispatch modal so the admin can share the counter login credentials.
2. **Staff Isolation in Counter Dashboard**:
   - When the counter manager logs into the Counter Dashboard using those credentials and navigates to Staff Management (`/staff` / Team Members):
     - The counter's own login identity (`req.user.id`) is **strictly excluded** from the staff list (`id: { not: req.user.id }`). A manager never appears as their own employee.
     - Any accounts matching the counter's primary login phone or legacy `'Staff - '` naming are excluded from the team members list.
     - The counter manager sees a clean team roster (0 staff members initially, with a prompt to "Add Team Member" for cashiers/cooks).
3. **Genuine Staff Creation**:
   - The counter manager (or org admin) clicks "Add Team Member" in Staff Management to create actual human employees (e.g., "Akhil - Cashier", "Ramesh - Chef"). Only these explicitly created team members appear in the staff list.

---

## Technical Specifications & File Changes

### 1. Counter Creation UI (`Frontend Money Card/src/features/branches/BranchesPage.tsx`)
- Restore form inputs in `Create New Counter` modal:
  - `Counter Name *` (Input, required, 2-20 characters)
  - `Mobile number *` (Input, 10 digits, with validation)
  - `Login Password` (Input, optional, defaults to `12345678`, with show/hide password toggle)
- Restore WhatsApp & Copy Credentials modal:
  - Title: "Counter Created Successfully!"
  - Displays: Counter Name, Mobile Number (Login ID), Password, Web Portal URL.
  - Buttons: "Copy Credentials" and "Send via WhatsApp".
- Restore credentials handling in `updateBranch` modal.

### 2. Branch & Counter Controller (`Backend Money Card/src/controllers/organization.controller.ts`)
- In `createBranch`:
  - Accept `name`, `location`, `phone`, `password`.
  - Validate 10-digit mobile number and password length.
  - Provision or update the Counter User identity:
    - `name: trimmedName` (the counter's name, e.g. "Juice Bar", NOT "Staff - Juice Bar")
    - `phone: cleanPhone`
    - `passwordHash: await hashPassword(effectivePassword)`
    - `role: Role.STAFF`
    - `organizationId: orgId`
    - `status: UserStatus.ACTIVE`
  - Upsert default counter permissions (`FROZEN_M0_PERMISSIONS`).
  - Link via `UserBranch` to the newly created branch.
  - Return `credentials: { name: result.name, phone: cleanPhone, password: effectivePassword }` in the API response.
- In `updateBranch`:
  - Support updating counter login phone and password, returning updated credentials.

### 3. Staff List Filtering & Isolation (`Backend Money Card/src/controllers/staff.controller.ts`)
- In `getStaffList`:
  - When requested by a counter manager (`req.user?.role === Role.STAFF`):
    - Add `{ id: { not: req.user.id } }` to the `where` clause so the logged-in counter manager is never listed as an employee under their own counter.
    - Exclude accounts where `name` starts with `Staff - ` or matches the counter's own login identity.
  - In Org Admin view (`Role.ORG_ADMIN`):
    - Add a query parameter `includeCounters?: boolean` (defaults to false) so Staff Management displays only genuine staff members, while Counters are managed on the Counters page (`/branches`).

### 4. Eliminate Duplicate `/auth/me` Call in Mobile App (`Flutter Money card/lib/repositories/auth_repository.dart`)
- In `login()`:
  - Save tokens from `authService.login()`.
  - Immediately return `response.user` without firing a second sequential `authService.getMe()`.
  - Reduces mobile login time by 500ms - 1500ms.

### 5. In-Memory Token Caching (`Flutter Money card/lib/core/storage/secure_storage_service.dart`)
- In `SecureTokenStorage`:
  - Add in-memory cache `_cachedAccessToken` and `_cachedRefreshToken`.
  - `getAccessToken()` returns `_cachedAccessToken` in 0ms, avoiding Android Keystore / platform-channel delay on every HTTP call.
  - `saveTokens()` updates memory cache instantly and persists to disk asynchronously.
  - `clearTokens()` clears memory cache and disk.

### 6. Storage & Lifecycle Hygiene (`Flutter Money card/lib/core/storage/server_config_storage.dart` & `login_screen.dart`)
- Cache server URL in memory in `ServerConfigStorage`.
- Remove redundant `ServerConfigStorage().initialize()` call in `login_screen.dart`'s `initState()`.

### 7. Kitchen Orders Background Polling Throttling (`Flutter Money card/lib/providers/kitchen_orders_provider.dart`)
- Adjust background polling from 8s to 30s when idle, avoiding continuous concurrent requests that congest the mobile network and backend.

---

## ASCII Wireframes

### Counter Creation Modal (Restored with Credentials)

```text
+-----------------------------------------------------------------------+
| Create New Counter                                                [X] |
+-----------------------------------------------------------------------+
|                                                                       |
| Counter Name *                                                        |
| [ South Indian Express                                              ] |
|                                                                       |
| Mobile number *                                                       |
| [ 9876543210                                                        ] |
| (This mobile number will be used to log in to the Counter Portal)     |
|                                                                       |
| Login Password                                                        |
| [ ••••••••                                                      [o] ] |
| (Default: 12345678)                                                   |
|                                                                       |
+-----------------------------------------------------------------------+
|                                              [ Cancel ] [ Create Counter ]
+-----------------------------------------------------------------------+
```

### WhatsApp / Copy Credentials Modal (Restored)

```text
+-----------------------------------------------------------------------+
| Counter Created Successfully!                                     [X] |
+-----------------------------------------------------------------------+
| [✓] Counter Login Credentials                                         |
| +----------------------------------+--------------------------------+ |
| | Counter Name                     | Mobile Number (Login ID)       | |
| | South Indian Express             | 9876543210                     | |
| +----------------------------------+--------------------------------+ |
| | Password                         | Web Portal                     | |
| | ••••••••                     [o] | https://app.moneycard.in/login | |
| +----------------------------------+--------------------------------+ |
|                                                                       |
| [ Copy Credentials ]           [ Send via WhatsApp (Green Button) ]   |
+-----------------------------------------------------------------------+
|                                                             [ Close ] |
+-----------------------------------------------------------------------+
```

### Counter Dashboard — Staff Management (Zero Auto-Created Staff)

```text
+-----------------------------------------------------------------------+
| Counter Dashboard > Team Members                 [ + Add Team Member ]|
+-----------------------------------------------------------------------+
| Filter: [ All Status ] [ Search staff... ]                            |
|                                                                       |
| (When no staff has been explicitly created yet):                      |
| +-------------------------------------------------------------------+ |
| |                       No Team Members Found                       | |
| |    No staff members have been added to this counter yet.          | |
| |    Click "+ Add Team Member" to add cashiers or kitchen staff.    | |
| +-------------------------------------------------------------------+ |
|                                                                       |
| Note: The counter login account "South Indian Express" is the         |
| active manager session and is NOT listed as an employee under itself. |
+-----------------------------------------------------------------------+
```

---

## Verification Plan

### Automated Test Suites
1. **Backend Tests**:
   - `npm test` in `Backend Money Card` (verify all 121 tests pass).
   - Test counter creation returns credentials and creates counter user.
   - Test `getStaffList` filters out the counter manager from its own staff list.
2. **Frontend Tests**:
   - `npx tsc --noEmit` in `Frontend Money Card` (0 errors).
   - `npm test -- --run` in `Frontend Money Card` (verify 293+ tests pass).
3. **Mobile Tests**:
   - `flutter test` and `flutter analyze --no-pub` in `Flutter Money card`.

### Empirical Verification
1. Create a counter "Juice Bar" with phone "9876543210" and password "12345678" in Org Admin.
2. Verify WhatsApp credentials modal appears with correct details.
3. Log in to Counter Portal using "9876543210".
4. Navigate to Team Members / Staff Management in Counter Dashboard:
   - Confirm "Juice Bar" or "Staff - Juice Bar" does NOT appear in the staff list.
   - Confirm list is clean (0 staff members until explicitly added).
5. Click "Add Team Member", create "Akhil", and verify only "Akhil" appears in the list.
6. Verify login speed on mobile device `SM G570F` is snappy and responsive.
