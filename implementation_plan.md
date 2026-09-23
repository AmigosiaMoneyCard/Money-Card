# Implementation Plan: Counter Staff Table View, Edit Status Toggle, Menu Headers, Sidebar Settings Removal, and Password Persistence

Comprehensive technical plan to render the Counter Dashboard Staff page as a clean table view where only the staff name appears under the Staff Name column, with dedicated columns for Role and Actions (View Details, Edit, Performance & Audit); remove the Phone column completely; integrate the Status Active/Inactive slide switch button into the Edit modal; remove Settings from the Counter Dashboard sidebar; remove the Counter Scope badge and add structured table headers to the Menu page; remove the green Add Staff button from the Org Admin Staff page; and ensure persistent Current Password tracking across sessions.

## Architecture and Visual Design
![Counter Staff Table and Edit Status](file:///C:/Users/damie/.gemini/antigravity-ide/brain/9c70217b-9240-4d11-907e-eaaf4a37b746/counter_staff_table_and_edit_status_1790155555574.jpg)

---

## ASCII Layout Wireframes

### Counter Dashboard Navigation (Settings Removed)
```
+-------------------------------------------------------------+
| MONEY CARD (Counter Scope)                                  |
+-------------------------------------------------------------+
| [Dashboard]    Counter Dashboard                            |
| [Package]      Menu                                         |
| [Users]        Staff                                        |
| [CreditCard]   Cards & History                              |
| [BarChart3]    Analytics                                    |
| (Settings option completely removed from sidebar)           |
+-------------------------------------------------------------+
```

### Counter Dashboard Staff Page (Table View with Name Only, No Phone, No Table Status)
```
+---------------------------------------------------------------------------------------------------------+
| Staff Management                                                                              [Refresh] |
+---------------------------------------------------------------------------------------------------------+
| [ Search staff by name...                                                                             ] |
+---------------------------------------------------------------------------------------------------------+
| STAFF NAME               ROLE             ACTIONS                                                       |
+---------------------------------------------------------------------------------------------------------+
| Staff 1                  Manager          [View Details]     [Edit]     [Performance & Audit]           |
| Staff 2                  Cashier          [View Details]     [Edit]     [Performance & Audit]           |
+---------------------------------------------------------------------------------------------------------+
```

### Edit Staff Modal (Status Slide Toggle Integrated Inside Edit Option)
```
+-------------------------------------------------------------+
| Edit Staff Member                                       [X] |
+-------------------------------------------------------------+
| Full Name                                                   |
| [ Staff 1                                                 ] |
|                                                             |
| Role                                                        |
| [ Manager                                               v ] |
|                                                             |
| Status                                                      |
| [ Active (o) ]  (Active / Inactive slide toggle switch)     |
|                                                             |
| Current Password                                            |
| 123456789                                          [Reveal] |
|                                                             |
| [Cancel]                                     [Save Changes] |
+-------------------------------------------------------------+
```

### Org Admin Staff Page (Green Add Staff Button Removed)
```
+---------------------------------------------------------------------------------+
| Staff Management                                                     [Refresh]  |
| (Green "Add Staff" button removed from top header)                              |
+---------------------------------------------------------------------------------+
| [ Search counters or staff by name, phone... ]                                  |
+---------------------------------------------------------------------------------+
| COUNTER NAME                          ADD STAFF                   STAFF DETAILS |
| Main Cafeteria                          [+ Add]                 [Staff Details] |
+---------------------------------------------------------------------------------+
```

### Counter Menu Page (Counter Scope Badge Removed & Table Headers Added)
```
+---------------------------------------------------------------------------------+
| Main Cafeteria Menu                                                [+ Add Menu] |
| (Counter Scope badge removed)                                                   |
+---------------------------------------------------------------------------------+
| [ Search items...                                                             ] |
+---------------------------------------------------------------------------------+
| ITEM NAME                   PRICE (₹)            STATUS                 ACTIONS |
| Veg Sandwich                ₹80.00               [ Active (o) ]       [Edit][x] |
| Cold Coffee                 ₹60.00               [ Active (o) ]       [Edit][x] |
| Masala Dosa                 ₹90.00               [ Active (o) ]       [Edit][x] |
+---------------------------------------------------------------------------------+
```

### Current Password Display (Reliable Persistence & Synced Updates)
```
+-------------------------------------------------------------+
| CURRENT PASSWORD                                            |
| 123456789                                          [Reveal] |
| Copying or sharing credentials will use this password.      |
| (Updated password persists reliably; never reverts to 123456)
+-------------------------------------------------------------+
```

---

## User Review Required
- Counter Staff page is rendered in a clean **Table View** format.
- Under the `Staff Name` column, **only the staff name itself** is displayed (e.g. "Staff 1", sanitized without "Counter Counter Manager").
- The `Phone` column is **removed completely** from the table view.
- The `Status` active/inactive slide switch button is **moved inside the Edit option** (Edit Staff modal), removing the status switch column from the main table.
- Main table columns are strictly: `Staff Name`, `Role`, and `Actions` ([View Details], [Edit], [Performance & Audit]).
- Settings is removed from the sidebar navigation for Counter Dashboard (STAFF role) users.
- In Org Admin Staff page, the top-right green "Add Staff" button is removed. Staff creation remains available inside each counter row in the table.
- In Menu page, the "Counter Scope" badge is removed, and the list is structured with appropriate table headers: Item Name, Price, Status, and Actions.
- In both Org Admin and Counter Dashboard, the "Current Password" display and copy credentials feature will persistently track the real updated password (e.g. 123456789) synced across both staff and counter stores without falling back to hardcoded 123456.

---

## Proposed Changes

### Navigation Configuration

#### [MODIFY] [navigation.ts](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/config/navigation.ts)
- Remove `'STAFF'` from the `settings` item `roles` array so that Counter Dashboard users never see Settings in the sidebar.

### Staff Feature

#### [MODIFY] [StaffPage.tsx](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/staff/StaffPage.tsx)
- Top Header: Remove the green "Add Staff" button when in Org Admin view (`!isCounterView`).
- Counter Staff Table View (`isCounterView`):
  - Configure `counterStaffColumns` with 3 columns:
    1. `Staff Name`: Renders the sanitized staff name only (`<span className="font-semibold text-slate-900 text-sm">{formatStaffDisplayName(staff.name)}</span>`), eliminating any "Counter Counter Manager" prefixes or sub-details.
    2. `Role`: Displays role badge (Manager / Staff).
    3. `Actions`: Clean action buttons: `[View Details]` (opens minimal details modal), `[Edit]` (opens edit modal), and `[Performance & Audit]` (opens audit modal).
  - Wrap table in a responsive horizontal scroll container (`overflow-x-auto min-w-[600px]`) to maintain layout bounds.
- Status Toggle Inside Edit Modal:
  - Inside the Edit Staff modal (`isEditing` mode), include an interactive Active / Inactive slide switch button with clear status label (`Active` / `Inactive`).
  - Toggling updates the staff status state and submits to backend upon saving.
- Password Persistence:
  - Update `getStoredStaffPassword` and `storeStaffPassword` to store and query by `phone`, `staffId`, and `branchId`.
  - When changing password (`handleChangeStaffPassword`), immediately update `localStorage` under `staffId`, `branchId`, and `phone`, and update `currentStaffPassword` state.
  - In `handleOpenStaffModal`, initialize `currentStaffPassword` from the stored password (checking `phone`, `staffId`, and `branchId`), ensuring updated passwords (e.g. 123456789) are preserved and never overridden by hardcoded 123456.

### Products Feature

#### [MODIFY] [ProductsPage.tsx](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/products/ProductsPage.tsx)
- Remove the `<Badge ...>Counter Scope</Badge>` badge from `CounterStaffMenuView`.
- Add proper table headers above the menu items:
  - `Item Name`
  - `Price`
  - `Status`
  - `Actions`
- Add `if (isLoading)` check before `isCounterView` check so that `staffBranch` is not evaluated as null while data is fetching.
- Ensure branch resolution correctly handles `currentBranch?.id || user?.assignedBranchIds?.[0]`.

### Branches Feature

#### [MODIFY] [BranchesPage.tsx](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/branches/BranchesPage.tsx)
- Ensure password persistence when updating branch password stores under `branchId`, `phone`, and manager `staffId`.
- Integrate bulk counter upload tab and password persistence from the `Counteradmin` branch.

---

## Verification Plan

### Automated Tests
- `npm test -- --run` in `Frontend Money Card` (255+ tests passing).
- `npx tsc --noEmit` in `Frontend Money Card` (zero TypeScript errors).

### Manual Verification
- Log in as Counter Manager (`STAFF` role) on Frontend.
- Confirm Settings is absent from the left sidebar.
- Open Menu (`/products`) and confirm:
  - "Counter Scope" badge is gone.
  - Table headers `Item Name`, `Price`, `Status`, `Actions` are present and aligned.
- Open Staff (`/staff`) as Counter Manager and confirm:
  - Table displays 3 columns: `Staff Name`, `Role`, `Actions`.
  - Under `Staff Name`, only the clean staff name is shown (e.g. "Staff 1").
  - Phone column is removed completely.
  - Status switch is removed from the table row and placed inside the `[Edit]` option.
  - Clicking `[Edit]` opens the Edit modal with the Active/Inactive slide toggle.
  - Actions `View Details`, `Edit`, and `Performance & Audit` function properly.
- Open Staff (`/staff`) as Org Admin and confirm:
  - Green "Add Staff" button is removed from the top header.
- Test changing password to `123456789` and verify:
  - Current Password reveals `123456789` instead of `123456`.
  - Reopening the modal or copying credentials retains `123456789`.
