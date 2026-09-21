# Implementation Plan: Menu Bulk Upload, Counter Button Merge & Staff Table Centering

Unified implementation plan addressing:
1. Org Admin Menu Bulk Upload: Integrate Bulk Upload (CSV) directly into the `Add Menu` modal ([CounterAddProductModal.tsx](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/products/CounterAddProductModal.tsx)) with tabs for Single Item and Bulk Upload CSV.
2. Counters Button Consolidation: Merge the standalone `Bulk Upload` button into the `Add Counter` button in [BranchesPage.tsx](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/branches/BranchesPage.tsx) via a unified split dropdown and modal switcher.
3. Staff Top Button Removal & Horizontal Centering: In [StaffPage.tsx](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/staff/StaffPage.tsx), remove the top green `Add Staff` button and restructure the table into 3 columns, placing the existing `+ Add` button in the horizontal center of the row.
4. Staff Naming Normalization: In [StaffPage.tsx](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/staff/StaffPage.tsx), change row labels from `Counter - {group.counterName}` to `Staff - {group.counterName}` (e.g. `Staff - counter2`).

![Staff, Menu, and Counters Revamp](file:///C:/Users/damie/.gemini/antigravity-ide/brain/9635058f-8784-4982-b40a-c7e9d921ee9b/org_admin_staff_menu_counters_revamp_1789987621646.jpg)

## User Review Required

> [!IMPORTANT]
> 1. Menu Modal Bulk Upload: Clicking `Add Menu` on any counter row in Menu Management will display a modal with two tabs: `Single Item` and `Bulk Upload (CSV)`. The bulk upload tab supports downloading sample CSV, selecting a file, parsing, and batch creation.
> 2. Counters Button Unification: The standalone `Bulk Upload` button next to `Add Counter` is eliminated. A single `Add Counter` button with an integrated dropdown option for `Bulk Upload Counters (CSV)` will be displayed, and the Create Counter modal will also offer a `Bulk Upload (CSV)` tab.
> 3. Staff Page Top Button Removal: The centered green `Add Staff` button on the top header of Staff Management is removed completely.
> 4. Staff Table 3-Column Layout: The table is restructured into 3 distinct columns:
>    - Column 1 (Left): `Staff - <CounterName>`
>    - Column 2 (Center): `+ Add` (centered horizontally in the middle)
>    - Column 3 (Right): `Staff Details (<count>)`

---

## Proposed Changes

### 1. Org Admin Menu Add Item Modal — CounterAddProductModal.tsx

#### [CounterAddProductModal.tsx](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/products/CounterAddProductModal.tsx)
- Add tab switcher at the top of the modal:
  - `Single Item` (existing form: Item Name, Price, Veg/Non-Veg/Drink).
  - `Bulk Upload (CSV)` (bulk file upload, drag-and-drop, template download, row preview, and batch submission).
- When `Bulk Upload (CSV)` is active:
  - Provide a `Download Template` link (`itemName,price,category`).
  - Accept `.csv` file drop or browse.
  - Parse rows with validation (name required, price > 0, category valid).
  - On submit, iteratively or concurrently invoke `apiService.products.createProduct` for the selected `branch.id`.
  - Trigger `onSuccess()` to refresh the product catalog.

```
+-------------------------------------------------------------+
| Add Menu — Main Cafeteria                               [X] |
|                                                             |
|   [ Single Item ]         [ Bulk Upload (CSV) ]             |
|   ---------------------------------------------             |
|                                                             |
|   +-----------------------------------------------------+   |
|   |         (Upload Icon)                               |   |
|   |   Drag and drop menu CSV file here or browse        |   |
|   |   Supported: .csv (itemName, price, category)       |   |
|   +-----------------------------------------------------+   |
|                                                             |
|   [Download CSV Template]                  [Upload & Add]   |
+-------------------------------------------------------------+
```

---

### 2. Counters Button Consolidation — BranchesPage.tsx

#### [BranchesPage.tsx](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/branches/BranchesPage.tsx)
- Remove standalone `Bulk Upload` button from lines 762-770.
- Replace with a single consolidated `Add Counter` button with integrated dropdown menu:
  - Primary button click opens Create Counter modal.
  - Chevron dropdown menu provides:
    - `Add Single Counter`
    - `Bulk Upload Counters (CSV)`
- Inside the Create Counter modal, provide a top tab or link:
  `[ Single Counter ] [ Bulk Upload (CSV) ]`
  allowing direct toggle between single and batch modes without cluttering the page header.

```
+------------------------------------------------------------------------+
| Counters                                        [ Add Counter | v ]    |
|                                                 | Single Counter  |    |
|                                                 | Bulk Upload CSV |    |
+------------------------------------------------------------------------+
```

---

### 3. Staff Page Header & 3-Column Table Layout — StaffPage.tsx

#### [StaffPage.tsx](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/staff/StaffPage.tsx)
- Remove top green `Add Staff` button container from lines 1132-1144:
  Delete `<div className="flex justify-center"><Button ...>Add Staff</Button></div>`.
- Restructure table columns into 3 columns:
  - Column 1: `w-1/2 min-w-[220px]`
    - Header: `Counter Name`
    - Content: `<Building2 /> Staff - {group.counterName}` (replacing `Counter - {group.counterName}`).
  - Column 2: `w-36 text-center`
    - Header: `Add Staff`
    - Content: Centered button `<Button variant="outline" size="sm" onClick={() => handleOpenAdd(group.id)}>+ Add</Button>`.
  - Column 3: `w-48 text-right`
    - Header: `Staff Details`
    - Content: `<Button variant="outline" size="sm" onClick={() => handleOpenCounterStaff(group)}>Staff Details ({group.staff.length})</Button>`.

```
+----------------------------------------------------------------------------------+
| Counter Name                 Add Staff                         Staff Details     |
+----------------------------------------------------------------------------------+
| [Icon] Staff - counter1      [ + Add ]                 [ Staff Details (2) ]     |
| [Icon] Staff - counter2      [ + Add ]                 [ Staff Details (1) ]     |
| [Icon] Staff - counter3      [ + Add ]                 [ Staff Details (0) ]     |
+----------------------------------------------------------------------------------+
```

---

## Verification Plan

### Automated Tests
- Frontend TypeScript Check: `npx tsc --noEmit` in `Frontend Money Card/`
- Frontend Vitest Suite: `npm test -- --run` in `Frontend Money Card/`
- Backend Tests: `npm test` in `Backend Money Card/`
- Flutter Analyzer: `flutter analyze --no-pub` in `Flutter Money card/`

### Manual Verification
- Menu: Open Menu page as Org Admin, click `Add Menu` on any counter row, verify tabs for `Single Item` and `Bulk Upload (CSV)`. Upload a test CSV to confirm items are created for that counter.
- Counters: Verify header bar has only one clean `Add Counter` button with integrated dropdown for `Bulk Upload CSV`.
- Staff: Verify the green top `Add Staff` button is gone. Verify table has 3 columns: `Staff - counter2` on the left, `+ Add` button in the horizontal center, and `Staff Details` on the right.
