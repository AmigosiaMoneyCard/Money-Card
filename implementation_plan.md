# Implementation Plan - Super Admin Dashboard Clean-Up & Real-Time Analytics Synchronization

## Overview
This plan incorporates the latest user requirements:
1. Super Admin Dashboard 4 Metric Boxes:
   - Box 1: 'Cafeterias' (live active cafeterias)
   - Box 2: 'Active Cardholders' (live active cards in active cafeterias, fixing raw 8 Users count)
   - Box 3: 'Active Counters' (replaces Active Subscriptions)
   - Box 4: 'Staff Members' (replaces Plan Requests)
   - Strictly zero sub-headings or subtitles inside all 4 boxes (pure minimalism: icon, label, and bold value only).
2. Super Admin Dashboard Filters:
   - Completely remove the 'Cafeteria Scope' (All Cafeterias) dropdown and 'Time Window' (All Time) filter toolbar.
3. Analytics Sync on Organization Deletion:
   - When an organization is deleted or deactivated, platform analytics must immediately update, purging deleted org data from transactions, cards, active sessions, and cafeteria filter dropdowns.
   - Prevent browser 304 conditional cache hits on admin and analytics routes.
4. Mobile App Login Screen:
   - Remove the 'Server: ...' host indicator pill displayed under the password field and login button on the staff login screen.

![Visual Sketch of Minimal 4 Boxes and Clean Dashboard](file:///C:/Users/damie/.gemini/antigravity-ide/brain/9c70217b-9240-4d11-907e-eaaf4a37b746/superadmin_minimal_4_stat_cards_1790186447422.jpg)

---

## Wireframes

### Mobile Login Screen (Before vs After)

```
BEFORE:
+------------------------------------+
|            MONEY CARD              |
|            Staff Login             |
|                                    |
| Phone Number                       |
| [ 9876543210                     ] |
|                                    |
| Password                           |
| [ ********                     [v] ] |
|                                    |
| [           Login Button         ] |
|                                    |
|    (o) Server: 10.0.2.2:3000 [*]   | <-- Remove this
+------------------------------------+

AFTER:
+------------------------------------+
|            MONEY CARD              |
|            Staff Login             |
|                                    |
| Phone Number                       |
| [ 9876543210                     ] |
|                                    |
| Password                           |
| [ ********                     [v] ] |
|                                    |
| [           Login Button         ] |
|                                    |
+------------------------------------+
```

### Super Admin Dashboard (4 Minimal Boxes, Zero Sub-Headings)

```
+------------------------------------------------------------------------------------+
| Welcome back, Super Admin                                         [ Refresh Data ] |
+------------------------------------------------------------------------------------+
| Action Needed: 1 Plan Request Awaiting Approval                 [ Review Requests ]|
+------------------------------------------------------------------------------------+
| QUICK ACTIONS                                                                      |
| [ Cafeterias ]    [ Subscriptions ]    [ System Settings ]    [ View Analytics ]   |
+------------------------------------------------------------------------------------+
| SAAS PLATFORM METRICS (Strictly minimal: Icon + Label + Value, No Sub-headings)   |
|                                                                                    |
| +------------------+ +------------------+ +------------------+ +------------------+|
| | [Building]       | | [Card/Users]     | | [Store]          | | [UserCheck]      ||
| | Cafeterias       | | Active           | | Active Counters  | | Staff Members    ||
| |                  | | Cardholders      | |                  | |                  ||
| | 1 Active         | | 1 User           | | 2 Counters       | | 4 Members        ||
| +------------------+ +------------------+ +------------------+ +------------------+|
+------------------------------------------------------------------------------------+
```

---

## Technical Design

### 1. Super Admin 4 Metric Cards (Zero Sub-Headings)
The 4 metric boxes are rendered using `StatCard` with only `label`, `value`, and `icon`:
- `description`, `subtitle`, and helper text are completely omitted.
- Box 1: `label="Cafeterias"`, `value={`${activeOrgsCount} Active`}`, `Building2` icon.
- Box 2: `label="Active Cardholders"`, `value={`${activeCardholdersCount} User${activeCardholdersCount !== 1 ? 's' : ''}`}`, `Users` icon.
- Box 3: `label="Active Counters"`, `value={`${activeCountersCount} Counter${activeCountersCount !== 1 ? 's' : ''}`}`, `Store` icon.
- Box 4: `label="Staff Members"`, `value={`${activeStaffCount} Member${activeStaffCount !== 1 ? 's' : ''}`}`, `UserCheck` icon.

### 2. Removal of Dashboard Filters
- The entire filter container with Cafeteria Scope and Time Window is removed from `SuperAdminDashboard.tsx`.
- The `Refresh Data` button is moved into the top welcome header alongside `Welcome back, Super Admin`.

### 3. Analytics Real-Time Sync on Organization Deletion
- Backend `deleteOrganization`: ensures `transaction.deleteMany` targets `{ OR: [{ branch: { organizationId: id } }, { session: { organizationId: id } }] }` before purging sessions and cards.
- Backend `analytics.controller.ts`: overview and peak analytics automatically scope all global queries to `{ organization: { status: OrgStatus.ACTIVE } }`, so any deleted or inactive organization data is never aggregated.
- Frontend `SuperAdminAnalyticsView.tsx`: cafeteria filter list is strictly filtered by `o.status === 'ACTIVE'`. If a selected cafeteria is deleted, `selectedOrgId` resets to `''` and analytics refresh immediately.
- Frontend Axios client & Backend server: set `Cache-Control: no-cache, no-store, must-revalidate` to avoid stale 304 browser cache hits.

### 4. Mobile Login Screen Host Indicator Removal
- In `Flutter Money card/lib/features/auth/login_screen.dart`, lines 266-310 (`Server: ${AppConfig.displayHost}`) are removed from the build tree.

---

## Proposed Changes

### Flutter Mobile App (`Flutter Money card/`)

#### [MODIFY] [login_screen.dart](file:///d:/Money%20Card%20Project/Flutter%20Money%20card/lib/features/auth/login_screen.dart)
- Remove `ServerConfigDialog` quick config pill (`Server: ${AppConfig.displayHost}`) under the login button.

#### [MODIFY] [login_screen_test.dart](file:///d:/Money%20Card%20Project/Flutter%20Money%20card/test/features/auth/login_screen_test.dart)
- Assert that `'Server:'` text does not appear on the login screen.

---

### Backend API (`Backend Money Card/`)

#### [MODIFY] [admin.controller.ts](file:///d:/Money%20Card%20Project/Backend%20Money%20Card/src/controllers/admin.controller.ts)
- In `getOrganizations`:
  - Group active cards (`prisma.card.groupBy` with `status: CardStatus.ACTIVE`).
  - Group active sessions (`prisma.cardSession.groupBy` with `status: SessionStatus.ACTIVE`).
  - Add `activeCardCount` and `activeSessionCount` to `usage` payload.
- In `deleteOrganization`:
  - Delete transactions with `where: { OR: [{ branch: { organizationId: id } }, { session: { organizationId: id } }] }` before deleting sessions and cards.

#### [MODIFY] [analytics.controller.ts](file:///d:/Money%20Card%20Project/Backend%20Money%20Card/src/controllers/analytics.controller.ts)
- In `getOverview` and `getPeakAnalytics`:
  - When `orgId` is omitted, scope transactions, cards, sessions, branches, and staff to active organizations (`organization: { status: OrgStatus.ACTIVE } }`).
  - Compute `activeCardsCount` as `prisma.card.count` for cards with `status: 'ACTIVE'`.

#### [MODIFY] [server.ts](file:///d:/Money%20Card%20Project/Backend%20Money%20Card/src/server.ts)
- Add cache control headers on admin and analytics routes to set `Cache-Control: no-store, no-cache, must-revalidate`.

---

### Frontend Web Admin (`Frontend Money Card/`)

#### [MODIFY] [entities.ts](file:///d:/Money%20Card%20Project/Frontend%20Money%20Card/src/types/entities.ts)
- Extend `OrganizationOverview.usage` with `activeCardCount?: number` and `activeSessionCount?: number`.

#### [MODIFY] [SuperAdminDashboard.tsx](file:///d:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/dashboard/SuperAdminDashboard.tsx)
- Remove Cafeteria Scope and Time Window filter container (lines 310-385).
- Move `Refresh Data` button to the header next to `Welcome back, Super Admin`.
- Compute the 4 minimal boxes with zero sub-headings/subtitles:
  1. Cafeterias: `${activeOrgsCount} Active`
  2. Active Cardholders: `${activeCardholdersCount} User${activeCardholdersCount !== 1 ? 's' : ''}` (from `o.usage?.activeCardCount`)
  3. Active Counters: `${activeCountersCount} Counter${activeCountersCount !== 1 ? 's' : ''}` (from `o.usage?.branchCount`)
  4. Staff Members: `${activeStaffCount} Member${activeStaffCount !== 1 ? 's' : ''}` (from `o.usage?.staffCount`)
- Clean up unused filter state (`selectedOrgId`, `datePreset`, `startDate`, `endDate`).

#### [MODIFY] [SuperAdminAnalyticsView.tsx](file:///d:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/analytics/SuperAdminAnalyticsView.tsx)
- Strictly filter cafeteria selector to `o.status === 'ACTIVE'`.
- Reset `selectedOrgId` to `''` if selected cafeteria is deleted.

#### [MODIFY] [client.ts](file:///d:/Money%20Card%20Project/Frontend%20Money%20Card/src/services/api/client.ts)
- Include default request headers `Cache-Control: no-cache` and `Pragma: no-cache`.

#### [MODIFY] [mock/handlers/organizations.ts](file:///d:/Money%20Card%20Project/Frontend%20Money%20Card/src/services/mock/handlers/organizations.ts)
- Return `activeCardCount` in mock organization usage for test suite compatibility.

---

## Verification Plan

### Automated Tests
1. Backend Tests:
   `npm test` in `Backend Money Card/` (100 tests must pass).
   `npm run build` in `Backend Money Card/` (0 errors).
2. Frontend Web Tests:
   `npm test -- --run` in `Frontend Money Card/` (267 tests must pass).
   `npx tsc --noEmit` in `Frontend Money Card/` (0 errors).
3. Flutter Mobile Tests:
   `flutter test` in `Flutter Money card/` (168 tests must pass).
   `flutter analyze --no-pub` in `Flutter Money card/` (0 errors/warnings).

### Manual Verification
1. Mobile Login Screen: Verify absence of `Server: ...` under password and login button.
2. Super Admin Dashboard: Verify that Cafeteria Scope and Time Window toolbar is removed, and 4 cards read: Cafeterias, Active Cardholders, Active Counters, Staff Members with no subheadings or descriptions.
3. Organization Deletion & Analytics: Delete a cafeteria or view analytics to confirm metrics update immediately and excluded org data is not counted.
