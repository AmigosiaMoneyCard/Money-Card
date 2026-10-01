# Implementation Plan: CI Pipeline Fix, Counter Credentials Resolution & Wallets Header Layout

## Overview
This cumulative implementation plan retains all pending CI pipeline and counter authentication work, and incorporates the new UI layout instruction for the Counter Dashboard Wallets page (`CounterStaffCardsView.tsx`).

![Counter Wallets Header Layout](file:///C:/Users/damie/.gemini/antigravity-ide/brain/999581c9-5c30-4195-933d-3667425ed95a/counter_wallets_header_layout_1790852173690.jpg)

---

## Part 1: GitHub Actions CI Pipeline Fix (Pending)

### Problem Summary
- In GitHub Actions run 36848485625, Frontend (285 tests) and Mobile POS (171 tests and analysis) succeeded completely.
- Backend Tests and Typecheck failed during step 8 (Run backend tests) because integration tests `activation.test.ts` and `card_deletion.test.ts` require a live PostgreSQL database instance on port 5432.
- Because one job failed, GitHub marked the entire workflow run as failed.

### Proposed Workflow Changes in `.github/workflows/ci.yml`
- Add PostgreSQL 16 service container mapped to port 5432:5432.
- Add `npx prisma db push --skip-generate --accept-data-loss` step before `npm test`.

---

## Part 2: Counter Credentials Login Resolution (Pending)

### Root Cause Analysis
1. In `createBranch` (`organization.controller.ts`), user lookup queries `where: { phone: cleanPhone }`, which misses existing users with international prefixes (`+91` or `91`).
2. In `updateBranch`, if a branch has no staff members assigned, setting a phone and password silently skips user creation because it only updates `existingManager` if one already exists.
3. In `auth.controller.ts` (`login`), default fallback passwords allow `'password'`, `'Staff@123'`, and `'123456'`, but omit `'12345678'`, which is the actual default password assigned when a counter is created without a custom password.
4. In `BranchesPage.tsx`, input placeholders display "min 6 chars", but validation requires 8 characters, and the displayed fallback password shows `'123456'` instead of the backend default `'12345678'`.

### Proposed Solutions
- `Backend Money Card/src/controllers/organization.controller.ts`:
  - `createBranch`: Multi-format phone lookup (`cleanPhone`, `91${cleanPhone}`, `+91${cleanPhone}`).
  - `updateBranch`: Auto-provision manager user when no staff assignment exists.
- `Backend Money Card/src/controllers/auth.controller.ts`:
  - Include `'12345678'` in login fallback list.
- `Frontend Money Card/src/features/branches/BranchesPage.tsx`:
  - Standardize placeholders and copy fallbacks to `'12345678'`.
- `Frontend Money Card/src/services/mock/handlers/branches.ts`:
  - Add phone and password update support to mock `updateBranch`.

---

## Part 3: Counter Dashboard Wallets Page Layout Update (New)

### Requirements
- On Counter Dashboard Wallets page (`CounterStaffCardsView.tsx`):
  - Remove the "Customer History" button from the header.
  - Remove the "Customer History" button from each row in the live active cards table.
  - Position the "Wallet Analytics" button directly horizontal to the "Wallets & Customer History" title and live active badge in the header.
  - Keep the "Refresh" button on the far right.

### Wireframe: Updated Counter Wallets Header & Row Actions

```
=============================================================================================================
Counter Dashboard: Wallets Page Header Layout
=============================================================================================================
+-----------------------------------------------------------------------------------------------------------+
| [CreditCard Icon] Wallets & Customer History  [ 12 Live Active ]  [ Wallet Analytics ]        [ Refresh ] |
+-----------------------------------------------------------------------------------------------------------+

[ Search by wallet ID or customer...                                                                      ]

+-----------------------------------------------------------------------------------------------------------+
| WALLET ID          | CUSTOMER          | COUNTER           | BALANCE    | ACTIONS                         |
+-----------------------------------------------------------------------------------------------------------+
| MC-101             | Rahul Sharma      | South Express     | Rs 450.00  | [ Wallet Analytics ] [ Details ]|
| MC-102             | Priya Patel       | Juice Bar         | Rs 120.00  | [ Wallet Analytics ] [ Details ]|
+-----------------------------------------------------------------------------------------------------------+
```

### Proposed Code Changes in `Frontend Money Card/src/features/cards/CounterStaffCardsView.tsx`
- In header (lines 355-395):
  - Group `[CreditCard]`, `<h1>Wallets & Customer History</h1>`, `[Badge Live Active]`, and `[Wallet Analytics Button]` together inside the left horizontal container.
  - Remove the `[Customer History]` button from the actions group.
  - Retain `[Refresh]` on the right.
- In table rows (lines 503-535):
  - Remove the `[Customer History]` button from the row actions column.
  - Retain `[ Wallet Analytics ]` and `[ Wallet Details ]`.
- Update test suite `counterCardsLiveAndSearch.test.ts` to reflect the updated button layout and presence.

---

## Worktree Changes Summary

1. `.github/workflows/ci.yml`:
   - Attach `services: postgres:16` to `backend` job.
   - Add `npx prisma db push --skip-generate --accept-data-loss`.

2. `Backend Money Card/src/controllers/organization.controller.ts`:
   - Resilient user lookup in `createBranch`.
   - Auto-provisioning manager in `updateBranch` when no staff assignment exists.

3. `Backend Money Card/src/controllers/auth.controller.ts`:
   - Support `'12345678'` in login fallback list.

4. `Frontend Money Card/src/features/branches/BranchesPage.tsx`:
   - Consistent 8-character password labels, placeholders, and `'12345678'` fallback.

5. `Frontend Money Card/src/services/mock/handlers/branches.ts`:
   - Support `phone` and `password` updates in mock `updateBranch`.

6. `Frontend Money Card/src/features/cards/CounterStaffCardsView.tsx`:
   - Move `Wallet Analytics` horizontal to `Wallets & Customer History` title.
   - Remove `Customer History` buttons from header and card rows.

7. `Frontend Money Card/src/__tests__/counterCardsLiveAndSearch.test.ts`:
   - Align test assertions with new layout.

---

## Verification Plan

### Automated Verification
- Run backend tests: `npm test` (all 104 tests pass).
- Run frontend tests: `npm test -- --run` (all 285 tests pass).
- Run mobile tests: `flutter test` (all 171 tests pass).
- Proactively run TypeScript checks: `npx tsc --noEmit` across subprojects.
- Local Git: Commit all changes to `staging`.
- Remote Git: Prompt for confirmation before `git push origin staging`.
- Monitor GitHub Actions CI until all 3 jobs (`frontend`, `backend`, `mobile`) turn green.
