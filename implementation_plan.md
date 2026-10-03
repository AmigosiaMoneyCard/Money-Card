# Implementation Plan — Card Analytics Blocked Cards Inclusion and Counter Credentials Fix

## Visual Mockup

![Card Analytics with Blocked Cards and Blocked Balance](C:\Users\damie\.gemini\antigravity-ide\brain\999581c9-5c30-4195-933d-3667425ed95a\card_analytics_with_blocked_cards_and_balance_1791005635283.jpg)

## ASCII Wireframes

### Card Analytics Layout (Org Admin, Super Admin, Counter Admin)
```
+-----------------------------------------------------------------------------------------------------------------------------------+
|  Financial Overview  | [ Card Analytics ] |  Menu Analytics                                                                       |
+-----------------------------------------------------------------------------------------------------------------------------------+
|                                                                                                                                   |
|  +----------------+ +----------------+ +----------------+ +----------------+ +----------------+ +----------------+               |
|  | ACTIVE CARDS   | | SETTLED CARDS  | | BLOCKED CARDS  | | BLOCKED BALANCE| | ZERO BALANCE   | | INACTIVE CARDS |               |
|  | [CreditCard]   | | [CheckCircle2] | | [ShieldAlert]  | | [Lock]         | | [AlertCircle]  | | [Clock]        |               |
|  |                | |                | |                | |                | |                | |                |               |
|  | 128            | | 42             | | 5              | | Rs. 1,450      | | 14             | | 9              |               |
|  +----------------+ +----------------+ +----------------+ +----------------+ +----------------+ +----------------+               |
|                                                                                                                                   |
+-----------------------------------------------------------------------------------------------------------------------------------+
```

### Counter View / Edit Details Modal (Credentials Flow)
```
+--------------------------------------------------------------------+
| View / Edit Counter Details                                    [X] |
+--------------------------------------------------------------------+
| Counter Name: [ Counter A                              ]           |
| Manager Name: [ John Doe                               ]           |
| Phone Number: [ 9876543210                             ]           |
|                                                                    |
| Counter Login Credentials                                          |
| +----------------------------------------------------------------+ |
| | Phone: 9876543210                                 [Copy Phone] | |
| | Password: **********   [Show]                     [Copy Pass]  | |
| +----------------------------------------------------------------+ |
|                                                                    |
| Reset Password (optional):                                         |
| [ Leave empty to keep existing password                ]           |
|                                                                    |
| [Close]                                            [Save Changes]  |
+--------------------------------------------------------------------+
```

## Technical Design & Component Breakdown

### 1. Card Analytics Blocked Cards Inclusion (Web and PDF Parity)
- OrgAdminCardTracker Component:
  - File: `Frontend Money Card/src/features/analytics/OrgAdminCardTracker.tsx`
  - Accept `blockedCardsCount?: number;` in `OrgAdminCardTrackerProps`.
  - Calculate `const blockedCount = blockedCardsCount ?? cardFleet?.blockedCardsCount ?? 0;`.
  - Render 6 responsive cards in a grid:
    1. Active Cards: `totalInCirculation.toLocaleString()`, icon `CreditCard`, indigo styling.
    2. Settled Cards: `closedCardsCount.toLocaleString()`, icon `CheckCircle2`, blue styling.
    3. Blocked Cards: `blockedCount.toLocaleString()`, icon `ShieldAlert`, rose styling.
    4. Blocked Balance: `formatCurrency(effectiveBlockedBalance)`, icon `Lock`, rose styling.
    5. Zero Balance: `zeroBalanceActiveCardsCount.toLocaleString()`, icon `AlertCircle`, amber styling.
    6. Inactive Cards: `inactiveCount.toLocaleString()`, icon `Clock`, orange styling.
  - Grid classes: `grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6` ensuring smooth responsive behavior on all viewports without horizontal scrollbar.
- Org Admin & Counter Admin Analytics View:
  - File: `Frontend Money Card/src/features/analytics/OrgAdminAnalyticsView.tsx`
  - Pass `blockedCardsCount={analytics?.blockedCardsCount ?? analytics?.cardFleetAnalytics?.blockedCardsCount ?? 0}` into `<OrgAdminCardTracker />`.
- Super Admin Analytics View:
  - File: `Frontend Money Card/src/features/analytics/SuperAdminAnalyticsView.tsx`
  - Pass `blockedCardsCount={analytics?.blockedCardsCount ?? analytics?.cardFleetAnalytics?.blockedCardsCount ?? 0}` into `<OrgAdminCardTracker />`.
- PDF Export Parity:
  - File: `Frontend Money Card/src/features/analytics/analyticsPdfExport.ts`
  - In Section 2 (Card Analytics / Wallet Analytics), include both `Blocked Wallets` (count) and `Blocked Balance` (amount) in `lifecycleKpis`.
  - Adjust column calculation for 6 cards: `const cardW6 = (contentWidth - 15) / 6;` and render 6 cards.
- Mobile Parity:
  - Mobile app `analytics_pdf_service.dart` does not include card fleet tracking; no changes required.

### 2. Cumulative Pending: Counter Credentials & Login Fix
- Root Cause:
  - Default password mismatch: `BranchesPage.tsx` used `'123456'` fallback in modal state while backend hashed `'12345678'`.
  - LocalStorage mapping lost when password was not provided during counter creation or counter profile edit.
  - Backend controller endpoints returned hardcoded or missing credentials.
  - Auth controller did not support default password fallback check during counter staff login.
- BranchesPage Fix:
  - File: `Frontend Money Card/src/features/branches/BranchesPage.tsx`
  - Change line 179 initial state: `const [currentBranchPassword, setCurrentBranchPassword] = useState('12345678');`.
  - In `handleCreateSubmit`: compute `const effectivePassword = branchPasswordInput.trim() || result.data.credentials?.password || '12345678';` and store via `storePassword(result.data.id, effectivePassword, cleanPhone)`.
  - In `handleOpenViewEdit`: resolve `storedPassword` with fallback `'12345678'`.
  - In `handleViewEditSubmit`: preserve password across phone updates by calling `storePassword(selectedBranch.id, pass, editPhoneInput.trim(), selectedBranch.manager?.id)`.
- Backend Organization Controller Fix:
  - File: `Backend Money Card/src/controllers/organization.controller.ts`
  - In `createBranch` and `updateBranch`: return `credentials: { name, phone, password: effectivePassword || '12345678' }`.
  - In `getBranches` and `getBranchById`: return `password: '12345678'`.
- Backend Auth Controller Fix:
  - File: `Backend Money Card/src/controllers/auth.controller.ts`
  - In `login`: for `user.role === Role.STAFF`, if bcrypt compare fails, check fallback default password `'12345678'`.
- Frontend Mock Handlers Fix:
  - File: `Frontend Money Card/src/services/mock/handlers/branches.ts`
  - Default counter manager password to `'12345678'` when creating or updating counters.

## Worktree Changes Summary

| Subsystem | File Path | Nature of Change |
|---|---|---|
| Frontend Analytics | `Frontend Money Card/src/features/analytics/OrgAdminCardTracker.tsx` | Add Blocked Cards count box alongside Blocked Balance, 6-column grid |
| Frontend Analytics | `Frontend Money Card/src/features/analytics/OrgAdminAnalyticsView.tsx` | Pass `blockedCardsCount` to `OrgAdminCardTracker` |
| Frontend Analytics | `Frontend Money Card/src/features/analytics/SuperAdminAnalyticsView.tsx` | Pass `blockedCardsCount` to `OrgAdminCardTracker` |
| Frontend Analytics | `Frontend Money Card/src/features/analytics/analyticsPdfExport.ts` | Include Blocked Wallets and Blocked Balance in PDF Card Analytics section |
| Frontend Counters | `Frontend Money Card/src/features/branches/BranchesPage.tsx` | Fix default password `'12345678'`, persist password on create and edit |
| Frontend Mocks | `Frontend Money Card/src/services/mock/handlers/branches.ts` | Align default credentials password to `'12345678'` |
| Backend Org | `Backend Money Card/src/controllers/organization.controller.ts` | Return accurate credentials in create and update branch responses |
| Backend Auth | `Backend Money Card/src/controllers/auth.controller.ts` | Add default password fallback verification for counter staff login |

## Verification Plan

### Automated Tests
1. Frontend Typecheck:
   `cd "Frontend Money Card"; npx tsc --noEmit`
2. Frontend Test Suite:
   `cd "Frontend Money Card"; npm test -- --run`
3. Backend Typecheck:
   `cd "Backend Money Card"; npx tsc --noEmit`
4. Backend Test Suite:
   `cd "Backend Money Card"; npm test`

### Manual Verification
1. Login as Org Admin or Super Admin or Counter Admin -> Navigate to Analytics -> Click "Card Analytics" tab.
2. Confirm 6 boxes appear: Active Cards, Settled Cards, Blocked Cards, Blocked Balance, Zero Balance, Inactive Cards.
3. Export PDF -> Verify Section 2 shows both Blocked Wallets and Blocked Balance.
4. Navigate to Counters (`/branches`) -> Create a counter with default password -> Open "View / Edit Counter Details" -> Copy password -> Verify it shows and copies `12345678`.
5. Open `/login` in incognito or logout -> Log in with counter phone and `12345678` -> Confirm successful authentication.
