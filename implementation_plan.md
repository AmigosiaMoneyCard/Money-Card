# Implementation Plan: Collapsible Dropdown for All Ordered Menu Items Table

Make the 'All Ordered Menu Items' table in the Menu Analytics tab collapsible (dropdown toggle), allowing users to expand or collapse the table with animated chevron indicator while retaining instant search with auto-expand capability.

## User Review Required

- Default State: The table starts expanded by default so users immediately see their ordered dishes, with a toggle button to collapse.
- Auto-Expand: When collapsed, typing in the dish search box will automatically expand the dropdown table.

## Proposed Changes

### Frontend Web Admin Dashboard

#### [MODIFY] [OrgAdminAnalyticsComponents.tsx](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/analytics/OrgAdminAnalyticsComponents.tsx)
- In `OrgAdminMenuAnalyticsSection`:
  - Add state `const [isTableOpen, setIsTableOpen] = useState(true);`.
  - Import `ChevronDown` from `lucide-react`.
  - Update table header to include a dropdown toggle button with `ChevronDown` (animated rotation `transition-transform duration-200 ${isTableOpen ? 'rotate-180' : ''}`).
  - Add search input handler that auto-expands the dropdown when a query is entered (`if (!isTableOpen) setIsTableOpen(true)`).
  - Wrap the table element inside a conditional render or collapse container (`isTableOpen && (...)`).
  - When collapsed, display a subtle helper caption: 'Table collapsed. Tap to expand ordered dishes list.'

#### [NEW] [menuAnalyticsDropdownTable.test.ts](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/__tests__/menuAnalyticsDropdownTable.test.ts)
- Test suite verifying:
  - Table starts expanded by default.
  - Toggling dropdown button closes the table.
  - Toggling dropdown button again expands the table.
  - Typing in the dish search bar automatically expands the table when collapsed.
  - Filtering by search query works correctly within the dropdown table.

---

## Wireframe Layout

### Expanded State (Default)
```
+--------------------------------------------------------------------------------------------------------+
| [Fork/Knife] All Ordered Menu Items  [ 18 Dishes ]        [ Search dishes... ]  [ Hide Table ^ ]       |
+--------------------------------------------------------------------------------------------------------+
| Dish Name                     Price                  Quantity Sold                Total Revenue        |
+--------------------------------------------------------------------------------------------------------+
| Chicken Biryani               Rs 280.00              45 sold                      Rs 12,600.00         |
| Masala Dosa                   Rs 120.00              34 sold                      Rs 4,080.00          |
| Paneer Makhani                Rs 240.00              28 sold                      Rs 6,720.00          |
| Cold Coffee                   Rs 80.00               22 sold                      Rs 1,760.00          |
+--------------------------------------------------------------------------------------------------------+
```

### Collapsed State
```
+--------------------------------------------------------------------------------------------------------+
| [Fork/Knife] All Ordered Menu Items  [ 18 Dishes ]        [ Search dishes... ]  [ Show Table v ]       |
| Table collapsed. Tap to expand ordered dishes list.                                                    |
+--------------------------------------------------------------------------------------------------------+
```

---

## Verification Plan

### Automated Tests
- Run `npm test -- --run` in `Frontend Money Card/` to execute all tests including `menuAnalyticsDropdownTable.test.ts`.
- Run `npx tsc --noEmit` in `Frontend Money Card/` to verify zero TypeScript errors.
- Run `npm test` in `Backend Money Card/` (100 tests).
- Run `flutter test` in `Flutter Money card/` (168 tests).

### Manual Verification
- Navigate to `/analytics?tab=menu` as Org Admin and Super Admin.
- Verify clicking the toggle button collapses the table.
- Verify clicking the toggle button expands the table.
- Verify typing in the search box while collapsed expands the table immediately and filters results.
