# Implementation Plan: Remove Availability Status from Mobile Edit Menu Bottom Sheet

Remove the "Availability Status" ChoiceChips from the Edit Menu Item bottom sheet in the mobile application. Product availability (Active/Inactive) is already managed directly via the inline adaptive switch (slide bar) on the main menu product card.

---

## User Interface Wireframe

### Mobile Edit Menu Bottom Sheet (Updated)

```
+-----------------------------------------------------------+
|                          ======                           |
| Edit Menu Item                                            |
|                                                           |
| Item Name                                                 |
| [ Sandwich                                              ] |
|                                                           |
| Price (INR)                                               |
| [ 120.00                                                ] |
|                                                           |
| Category                                                  |
| (Veg)   (Non-Veg)   (Drinks)                              |
|                                                           |
| (Availability Status section REMOVED)                     |
|                                                           |
| [=================== Save Changes ======================] |
+-----------------------------------------------------------+
```

---

## Technical Design & Exact Code Changes

### 1. File: `Flutter Money card/lib/features/products/products_screen.dart`
- In `_showEditProductBottomSheet`:
  - Remove `String selectedStatus = product.status.toUpperCase();` local variable.
  - In the modal header row:
    - Keep only `Text('Edit Menu Item', ...)` and remove the status badge pill.
  - Remove the entire "Availability Status" section:
    - Remove `const Text('Availability Status', ...)`
    - Remove the ChoiceChips row for `'ACTIVE (Available)'` and `'INACTIVE (Hidden)'`.
  - In `updateProduct` API call:
    - Retain the current status `status: product.status` (preserving the status chosen via the slide bar toggle).

---

## Verification Plan

1. Automated Tests:
   - Run `flutter analyze --no-pub` to confirm 0 issues.
   - Run `flutter test` across all mobile test suites.
2. Local Git:
   - Auto-approved local git commit on `staging`.
   - Ask user before pushing to remote (`origin staging`) and publishing Shorebird patch.
