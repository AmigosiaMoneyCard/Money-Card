# Implementation Plan: Counters, Menu, Staff, Analytics & POS Parity

Unified implementation plan covering:
1. Backend Manager Naming: In `organization.controller.ts`, change auto-provisioned staff name from `<name> Counter Manager` to `Staff - <name>` (e.g. `Staff - counter2`).
2. Staff Display Sanitization: In `StaffPage.tsx`, normalize existing staff names ending in "Counter Manager" to display cleanly as `Staff - <CounterName>` (matching Cards - Counter).
3. Bulk Counter Password Persistence: In `handleBulkImport` inside `BranchesPage.tsx`, persist passwords for batch-created counters into local storage (`mc_branch_passwords`).
4. Mobile Analytics Parity: Remove "Cash in Drawer (To Hand Over)" from mobile analytics in `analytics_screen.dart` and mobile PDF export in `analytics_pdf_service.dart`.
5. Product Rename Analytics Unification: Product demand groups strictly by immutable `productId` (UUID) with current catalog display name.

![Updated SaaS Dashboard Layout](file:///C:/Users/damie/.gemini/antigravity-ide/brain/9635058f-8784-4982-b40a-c7e9d921ee9b/updated_saas_features_sketch_1789981547689.jpg)

## User Review Required

> [!IMPORTANT]
> 1. Backend Manager Naming: When single or bulk counters are created/updated in `organization.controller.ts`, the associated staff user's name is auto-provisioned as `Staff - <CounterName>` (e.g. `Staff - counter2`) instead of `<name> Counter Manager`.
> 2. Staff Display Sanitization: Any historical staff records in `StaffPage.tsx` with names ending in "Counter Manager" are sanitized dynamically via `formatStaffDisplayName` to display as `Staff - <CounterName>`.
> 3. Bulk Counter Password Persistence: In `BranchesPage.tsx`, `handleBulkImport` extracts created counter IDs and passwords, persisting them to localStorage (`mc_branch_passwords`) via `storePassword(c.id, c.password)`, ensuring passwords are never lost when viewing/editing the counter later.
> 4. Mobile Analytics Parity: "Cash in Drawer (To Hand Over)" card is removed from `Flutter Money card/lib/features/analytics/analytics_screen.dart` and its row is removed from `analytics_pdf_service.dart`, matching the web app.

---

## Proposed Changes

### 1. Backend Auto-Provisioned Staff Naming

#### [organization.controller.ts](file:///d:/Money%20Card%20Project/Backend%20Money%20Card/src/controllers/organization.controller.ts)
- In `createBranch` (line 279):
  Change `name: \`${name.trim()} Counter Manager\`` to `name: \`Staff - ${name.trim()}\``.
- In `bulkCreateBranches` (line 451):
  Change `name: \`${name} Counter Manager\`` to `name: \`Staff - ${name}\``.
- In `updateBranch` (lines 667, 679):
  Change `name: \`${String(name).trim()} Counter Manager\`` to `name: \`Staff - ${String(name).trim()}\``.
  Change `name: \`${(name ? String(name).trim() : branch.name)} Counter Manager\`` to `name: \`Staff - ${(name ? String(name).trim() : branch.name)}\``.

---

### 2. Frontend Staff Name Sanitization

#### [StaffPage.tsx](file:///d:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/staff/StaffPage.tsx)
- Implement `formatStaffDisplayName(name: string, assignedBranchIds?: string[], fallbackCounterName?: string): string`:
  - If name ends with "Counter Manager" (case-insensitive), strip it and prepend `Staff - <CounterName>`.
  - Check fallback counter name first, then match `assignedBranchIds` with `branches` list, or fallback to the prefix before "Counter Manager".
- Apply `formatStaffDisplayName` to:
  - Modal staff list display (`st.name` and avatar letter)
  - Staff settings / details modal header and title
  - Staff audit modal title and avatar
  - Delete staff modal confirmation text
  - Initial value of `formName` when opening the edit modal

---

### 3. Bulk Counter Password Persistence

#### [BranchesPage.tsx](file:///d:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/branches/BranchesPage.tsx)
- In `handleBulkImport`:
  - Iterate through `result.data.created`.
  - For each created counter, retrieve `c.password || c.credentials?.password` and `c.id || c.branchId`.
  - If valid, call `storePassword(branchId, password)`.
  - Normalize `phone` and `password` on items set to `bulkCreatedCounters` so copy/download/WhatsApp actions work seamlessly.

---

### 4. Mobile Analytics Parity & PDF Export

#### [analytics_screen.dart](file:///d:/Money%20Card%20Project/Flutter%20Money%20card/lib/features/analytics/analytics_screen.dart)
- Remove `Cash in Drawer (To Hand Over)` Card (lines 515-556).
- Remove decorative emojis from `Online UPI Money` and `Cash Money` cards to enforce zero-emoji policy.
- Retain the top `Net Money Collected` card and the balanced side-by-side `Online UPI Money` and `Cash Money` comparison.

#### [analytics_pdf_service.dart](file:///d:/Money%20Card%20Project/Flutter%20Money%20card/lib/services/analytics_pdf_service.dart)
- Remove `pw.TableRow` containing `Cash in Drawer (To Hand Over)` (lines 248-254) from the PDF financial table.

---

## Verification Plan

### Automated Tests
- Backend Unit Tests: `npm test` in `Backend Money Card/`
- Frontend TypeScript Check: `npx tsc --noEmit` in `Frontend Money Card/`
- Frontend Vitest Suite: `npm test -- --run` in `Frontend Money Card/`
- Flutter Analyzer: `flutter analyze --no-pub` in `Flutter Money card/`
- Flutter Widget & Unit Tests: `flutter test` in `Flutter Money card/`

### Manual Verification
- Verify auto-created staff is named `Staff - <counterName>`.
- Verify existing staff ending with `Counter Manager` render as `Staff - <CounterName>`.
- Verify batch importing counters saves passwords into `mc_branch_passwords` in localStorage.
- Verify mobile analytics screen and mobile PDF export do not contain "Cash in Drawer (To Hand Over)".
